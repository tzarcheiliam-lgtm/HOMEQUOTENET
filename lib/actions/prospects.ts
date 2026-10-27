'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isCallAssigneeRole, type CallerOption } from '@/lib/calls/callers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCallWorkspace, requireRole } from '@/lib/auth';
import {
  getSpreadOverview,
  listCallers,
  nextProspectIdFor,
  nextProspectInContext,
  type ProspectFilters,
} from '@/lib/data/prospects';
import { NO_NICHE, planSpread } from '@/lib/calls/spread';
import { QUEUE_DISPOSITIONS } from '@/lib/calls/constants';
import { contextFrom, contextQuery, hasListContext, withContext } from '@/lib/calls/context';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { cadencePatchFor } from '@/lib/calls/cadence';
import {
  prospectPatchFor,
  validateOutcome,
  type OutcomeInput,
  type OutcomeValidation,
} from '@/lib/calls/rules';
import type { ProspectDisposition, SalesAppointmentStatus } from '@/lib/types';

/**
 * Server actions for the calling workspace.
 *
 * Every action re-checks the user and, for callers, that the prospect is
 * assigned to them — even though RLS would refuse the write anyway. Two
 * independent checks mean a bug in one is not a hole. Nothing here trusts a
 * payload field for authorization: assignment changes are admin-only actions
 * that read the target from the form, never from a caller's request.
 */

export type ProspectActionState =
  | {
      ok: true;
      message?: string;
      nextId?: string | null;
      /** Set by "save, then offer the follow-up email": what the email needs to know. */
      followUp?: { outcome: ProspectDisposition; at: string | null; timeZone: string; type: string | null; n: number };
    }
  | { ok: false; error: string; fieldErrors?: OutcomeValidation['errors'] }
  | undefined;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
const opt = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === '' ? null : v;
};

/**
 * Turns the form's separate date + time + zone inputs into an ISO instant.
 * The caller types a wall-clock time in the prospect's zone; we need the
 * absolute moment so callbacks sort correctly across zones.
 */
function toInstant(date: string | null, time: string | null, timeZone: string): string | null {
  if (!date) return null;
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '09:00';
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  // Interpret the wall time in the zone by finding the UTC instant whose
  // representation in that zone matches. Two-pass handles DST edges.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .formatToParts(new Date(ms))
        .map((p) => [p.type, p.value])
    ) as Record<string, string>;
    const hour = parts.hour === '24' ? 0 : Number(parts.hour);
    const wall = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute)
    );
    return wall - ms;
  };
  let instant = guess - offsetAt(guess);
  instant = guess - offsetAt(instant);
  return new Date(instant).toISOString();
}

async function assertCallerOwns(prospectId: string, userId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contractor_prospects')
    .select('id, assigned_to, disposition, company_name, call_attempt_count, no_connect_streak, park_count, next_attempt_at, parked_at')
    .eq('id', prospectId)
    .maybeSingle();
  if (!data) throw new Error('Prospect not found or not accessible');
  if (!isAdmin && data.assigned_to !== userId) {
    throw new Error('This prospect is not assigned to you');
  }
  return data as {
    id: string;
    assigned_to: string | null;
    disposition: ProspectDisposition;
    company_name: string;
    call_attempt_count: number;
    no_connect_streak: number;
    park_count: number;
    next_attempt_at: string | null;
    parked_at: string | null;
  };
}

/* ---- Log a call outcome --------------------------------------------------- */

export async function logCallOutcome(
  _prev: ProspectActionState,
  fd: FormData
): Promise<ProspectActionState> {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const prospectId = str(fd, 'prospect_id');
  if (!prospectId) return { ok: false, error: 'Missing prospect' };

  let owned;
  try {
    owned = await assertCallerOwns(prospectId, me.id, isAdmin);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const timeZone = opt(fd, 'time_zone') ?? 'America/Los_Angeles';
  const input: OutcomeInput = {
    outcome: str(fd, 'outcome'),
    notes: opt(fd, 'notes'),
    callback_at: toInstant(opt(fd, 'callback_date'), opt(fd, 'callback_time'), timeZone),
    decision_maker_name: opt(fd, 'decision_maker_name'),
    best_contact_method: opt(fd, 'best_contact_method'),
    follow_up_at: toInstant(opt(fd, 'follow_up_date'), opt(fd, 'follow_up_time'), timeZone),
    appointment_at: toInstant(opt(fd, 'appointment_date'), opt(fd, 'appointment_time'), timeZone),
    appointment_type: opt(fd, 'appointment_type'),
    time_zone: timeZone,
    contact_info: opt(fd, 'contact_info'),
    decision_maker_email: opt(fd, 'decision_maker_email'),
    confirm_do_not_call: fd.get('confirm_do_not_call') === 'on',
  };

  const v = validateOutcome(input);
  if (!v.ok || !v.outcome) {
    return { ok: false, error: 'Check the highlighted fields', fieldErrors: v.errors };
  }
  const outcome = v.outcome;

  // The interface never offers a call on a DNC prospect; refuse here too so a
  // stale tab cannot log one. (The DB trigger is the third line.)
  if (owned.disposition === 'do_not_call' && outcome !== 'do_not_call') {
    return { ok: false, error: 'This contractor is on the do-not-call list' };
  }

  const supabase = await createClient();

  // 1. The permanent record. Insert first: if this fails nothing else changes.
  const { data: attempt, error: aErr } = await supabase
    .from('prospect_call_attempts')
    .insert({
      prospect_id: prospectId,
      caller_id: me.id,
      caller_name: me.full_name || me.email,
      outcome,
      notes: input.notes,
      attempt_number: 0, // overwritten by the trigger from the prospect's counter
      previous_disposition: owned.disposition,
      new_disposition: outcome,
      callback_at: input.callback_at,
      appointment_at: input.appointment_at,
      created_by: me.id,
      updated_by: me.id,
    })
    .select('id')
    .single();
  if (aErr) return { ok: false, error: aErr.message };

  // 2. The prospect's current state, derived from the same input, plus when
  //    to try again if nobody was reached (lib/calls/cadence.ts).
  const patch = { ...prospectPatchFor(outcome, input), ...cadencePatchFor(outcome, owned) };
  const { error: pErr } = await supabase
    .from('contractor_prospects')
    .update({ ...patch, updated_by: me.id })
    .eq('id', prospectId);
  if (pErr) return { ok: false, error: pErr.message };

  // 3. A booked sales call gets its own record so it can be tracked to completion.
  if (outcome === 'appointment_booked' && input.appointment_at) {
    const { error: sErr } = await supabase.from('prospect_sales_appointments').insert({
      prospect_id: prospectId,
      partner_id: me.id,
      call_attempt_id: attempt.id,
      decision_maker_name: input.decision_maker_name,
      scheduled_at: input.appointment_at,
      time_zone: timeZone,
      appointment_type: input.appointment_type,
      contact_info: input.contact_info,
      status: 'scheduled',
      notes: input.notes,
      created_by: me.id,
      updated_by: me.id,
    });
    if (sErr) return { ok: false, error: sErr.message };
    flushNotificationsSoon();
  }

  revalidatePath('/app/calls');
  revalidatePath(`/app/calls/${prospectId}`);
  revalidatePath('/app/calls/logs');
  revalidatePath('/app/calls/appointments');

  const intent = fd.get('intent');
  // "Save, then email": the follow-up sheet opens over this prospect and moves on after Send or Skip.
  const thenEmail = intent === 'save_then_email';
  const wantsNext = intent === 'save_and_next' || thenEmail;
  // Stay inside the list the caller is working (niche, city, view …), if they opened it from one.
  const rawCtx = new URLSearchParams(String(fd.get('list_context') ?? ''));
  const ctx = contextFrom((k) => (k === 'caller' && me.role !== 'admin' ? undefined : (rawCtx.get(k) ?? undefined)));
  const ctxQs = contextQuery(ctx);
  const nextId = wantsNext
    ? hasListContext(ctx)
      ? await nextProspectInContext(me, prospectId, ctx as unknown as ProspectFilters, await listCallers())
      : await nextProspectIdFor(me, prospectId)
    : null;
  if (thenEmail) {
    return {
      ok: true,
      message: 'Outcome saved',
      nextId,
      followUp: {
        outcome,
        at: outcome === 'appointment_booked' ? input.appointment_at ?? null : outcome === 'callback_requested' ? input.callback_at ?? null : null,
        timeZone,
        type: input.appointment_type ?? null,
        n: Date.now(),
      },
    };
  }
  if (wantsNext) {
    redirect(nextId ? withContext(`/app/calls/${nextId}`, ctxQs) : withContext('/app/calls', `${ctxQs || 'view=mine'}&done=1`));
  }
  return { ok: true, message: 'Outcome saved', nextId };
}

/* ---- Assignment (admin only) ---------------------------------------------- */

const assignSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Select at least one prospect'),
  assignee: z.union([z.string().uuid(), z.literal('unassigned')]),
});

/** Assigns or reassigns prospects. Void action for the list's bulk bar. */
export async function assignProspects(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const ids = fd.getAll('ids').map(String).filter(Boolean);
  const parsed = assignSchema.safeParse({ ids, assignee: str(fd, 'assignee') });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const assignee = parsed.data.assignee === 'unassigned' ? null : parsed.data.assignee;
  const supabase = await createClient();

  if (assignee) {
    // Only an active call-capable account may hold prospects; a stale id is refused here
    // rather than silently creating a list nobody can see.
    const { data: target } = await supabase
      .from('profiles')
      .select('id, role, account_status, deleted_at')
      .eq('id', assignee)
      .maybeSingle();
    if (
      !target ||
      !isCallAssigneeRole(target.role) ||
      target.account_status !== 'active' ||
      target.deleted_at
    ) {
      throw new Error('Assignee must be an active admin, caller or setter');
    }
  }

  const { data: before } = await supabase
    .from('contractor_prospects')
    .select('id, assigned_to')
    .in('id', parsed.data.ids);

  const { error } = await supabase
    .from('contractor_prospects')
    .update({
      assigned_to: assignee,
      assigned_at: assignee ? new Date().toISOString() : null,
      assigned_by: assignee ? me.id : null,
      updated_by: me.id,
    })
    .in('id', parsed.data.ids);
  if (error) throw new Error(error.message);

  await supabase.from('audit_logs').insert({
    actor_id: me.id,
    action: 'prospect.assign',
    target_user_id: assignee,
    metadata: {
      prospect_ids: parsed.data.ids,
      from: Object.fromEntries(
        ((before ?? []) as { id: string; assigned_to: string | null }[]).map((b) => [
          b.id,
          b.assigned_to,
        ])
      ),
      to: assignee,
    },
  });

  revalidatePath('/app/calls');
  for (const id of parsed.data.ids) revalidatePath(`/app/calls/${id}`);
}

/* ---- Spread unassigned prospects (admin only) ----------------------------- */

export type SpreadState =
  | { ok: true; assigned: { name: string; count: number }[]; left: number }
  | { ok: false; error: string }
  | undefined;

/**
 * Hands out unassigned prospects across the people the admin picked, filling
 * the shortest open list first (lib/calls/spread.ts). Each write only claims
 * prospects that are still unassigned, so one assigned by hand in the
 * meantime is never taken from its new owner.
 */
export async function spreadUnassignedProspects(_prev: SpreadState, fd: FormData): Promise<SpreadState> {
  const me = await requireRole(['admin']);
  const picked = [...new Set(fd.getAll('assignee').map(String).filter(Boolean))];
  if (picked.length === 0) return { ok: false, error: 'Pick at least one person' };
  const niche = str(fd, 'niche');
  const maxRaw = str(fd, 'max_each');
  const maxEach = maxRaw === '' ? null : Number(maxRaw);
  if (maxEach !== null && (!Number.isInteger(maxEach) || maxEach < 1 || maxEach > 5000)) {
    return { ok: false, error: 'Max per person must be a whole number from 1 to 5000' };
  }

  // Only active admins, callers and setters can hold a list; a stale id is refused.
  const callers = await listCallers();
  const people = picked.map((id) => callers.find((c) => c.id === id));
  if (people.some((p) => !p)) return { ok: false, error: 'Someone you picked is no longer active. Refresh and try again.' };

  const overview = await getSpreadOverview(people as CallerOption[]);
  const supabase = await createClient();
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from('contractor_prospects')
      .select('id')
      .is('assigned_to', null)
      .is('archived_at', null)
      .in('disposition', QUEUE_DISPOSITIONS);
    if (niche) q = niche === NO_NICHE ? q.is('niche', null) : q.eq('niche', niche);
    const { data, error } = await q
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) return { ok: false, error: error.message };
    ids.push(...((data ?? []) as { id: string }[]).map((r) => r.id));
    if ((data ?? []).length < 1000) break;
  }
  if (ids.length === 0) return { ok: false, error: 'There are no unassigned prospects to spread' };

  const plan = planSpread(ids, overview.loads, maxEach);
  const now = new Date().toISOString();
  const assigned: { id: string; name: string; count: number }[] = [];
  for (const p of overview.loads) {
    const mine = plan.get(p.id) ?? [];
    let count = 0;
    for (let i = 0; i < mine.length; i += 100) {
      const { data, error } = await supabase
        .from('contractor_prospects')
        .update({ assigned_to: p.id, assigned_at: now, assigned_by: me.id, updated_by: me.id })
        .in('id', mine.slice(i, i + 100))
        .is('assigned_to', null)
        .select('id');
      if (error) return { ok: false, error: error.message };
      count += (data ?? []).length;
    }
    assigned.push({ id: p.id, name: p.name, count });
  }
  const total = assigned.reduce((n, a) => n + a.count, 0);

  await supabase.from('audit_logs').insert({
    actor_id: me.id,
    action: 'prospect.spread',
    target_user_id: null,
    metadata: {
      niche: niche || null,
      max_each: maxEach,
      total,
      counts: Object.fromEntries(assigned.map((a) => [a.id, a.count])),
    },
  });

  revalidatePath('/app/calls');
  return { ok: true, assigned: assigned.map(({ name, count }) => ({ name, count })), left: ids.length - total };
}

/* ---- Sales appointment status --------------------------------------------- */

const STATUSES: SalesAppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'rescheduled',
  'completed',
  'no_show',
  'cancelled',
];

export async function setSalesAppointmentStatus(fd: FormData): Promise<void> {
  const me = await requireCallWorkspace();
  const id = str(fd, 'id');
  const status = str(fd, 'status') as SalesAppointmentStatus;
  if (!id || !STATUSES.includes(status)) throw new Error('Invalid appointment update');

  const supabase = await createClient();
  const { data: appt } = await supabase
    .from('prospect_sales_appointments')
    .select('id, prospect_id, partner_id')
    .eq('id', id)
    .maybeSingle();
  if (!appt) throw new Error('Appointment not found or not accessible');
  if (me.role !== 'admin' && appt.partner_id !== me.id) {
    throw new Error('Only the partner who booked this appointment can update it');
  }

  const { error } = await supabase
    .from('prospect_sales_appointments')
    .update({
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : undefined,
      updated_by: me.id,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  flushNotificationsSoon();
  revalidatePath('/app/calls/appointments');
  revalidatePath(`/app/calls/${appt.prospect_id}`);
}

/* ---- Manual add (admin only) ---------------------------------------------- */

const prospectSchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  phone: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  city: z.string().optional(),
  county: z.string().optional(),
  service_area: z.string().optional(),
  primary_services: z.string().optional(),
  category: z.string().optional(),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function createProspect(
  _prev: ProspectActionState,
  fd: FormData
): Promise<ProspectActionState> {
  const me = await requireRole(['admin']);
  const parsed = prospectSchema.safeParse({
    company_name: str(fd, 'company_name'),
    phone: str(fd, 'phone'),
    website: str(fd, 'website'),
    email: str(fd, 'email'),
    city: str(fd, 'city'),
    county: str(fd, 'county'),
    service_area: str(fd, 'service_area'),
    primary_services: str(fd, 'primary_services'),
    category: str(fd, 'category'),
    assigned_to: str(fd, 'assigned_to'),
    notes: str(fd, 'notes'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractor_prospects')
    .insert({
      company_name: d.company_name,
      phone: d.phone || null,
      website: d.website || null,
      email: d.email || null,
      city: d.city || null,
      county: d.county || null,
      service_area: d.service_area || null,
      primary_services: (d.primary_services ?? '')
        .split(/[;,|]/)
        .map((s) => s.trim())
        .filter(Boolean),
      category: d.category || null,
      assigned_to: d.assigned_to || null,
      assigned_at: d.assigned_to ? new Date().toISOString() : null,
      assigned_by: d.assigned_to ? me.id : null,
      source: 'manual',
      notes: d.notes || null,
      created_by: me.id,
      updated_by: me.id,
    })
    .select('id')
    .single();
  if (error) {
    return {
      ok: false,
      error: /uq_prospects_phone_e164/.test(error.message)
        ? 'A prospect with this phone number already exists'
        : error.message,
    };
  }
  revalidatePath('/app/calls');
  redirect(`/app/calls/${data.id}`);
}

/* ---- Return a resting or parked prospect to the queue now ------------------ */

/**
 * Puts a prospect the cadence is resting (or has parked) back in the call
 * list immediately with a fresh run of tries. The person who holds it or an
 * admin can do this; it never touches do-not-call.
 */
export async function returnProspectToQueue(fd: FormData): Promise<void> {
  const me = await requireCallWorkspace();
  const id = str(fd, 'prospect_id');
  if (!id) throw new Error('Missing prospect');
  await assertCallerOwns(id, me.id, me.role === 'admin');
  const supabase = await createClient();
  const { error } = await supabase
    .from('contractor_prospects')
    .update({ next_attempt_at: null, parked_at: null, no_connect_streak: 0, updated_by: me.id })
    .eq('id', id);
  if (error) throw new Error(error.message);
  // Service role: audit_logs is insert-restricted to admins by RLS, but callers may do this too.
  await createAdminClient().from('audit_logs').insert({
    actor_id: me.id,
    action: 'prospect.return_to_queue',
    target_user_id: null,
    metadata: { prospect_id: id },
  });
  revalidatePath(`/app/calls/${id}`);
  revalidatePath('/app/calls');
}

/* ---- Lift do-not-call (admin only, audited) -------------------------------- */

export async function clearDoNotCall(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const id = str(fd, 'prospect_id');
  if (!id) throw new Error('Missing prospect');
  const supabase = await createClient();
  const { error } = await supabase
    .from('contractor_prospects')
    .update({ disposition: 'new', do_not_call_at: null, updated_by: me.id })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.from('audit_logs').insert({
    actor_id: me.id,
    action: 'prospect.clear_do_not_call',
    target_user_id: null,
    metadata: { prospect_id: id },
  });
  revalidatePath(`/app/calls/${id}`);
  revalidatePath('/app/calls');
}

/* ---- Email opt-out (migration 0063) ---------------------------------------- */

/**
 * "Asked to stop emails": whoever holds the prospect records it; only an
 * administrator lifts it (the 0063 trigger enforces that too). While set,
 * every prospect email path refuses.
 */
export async function setEmailOptOut(fd: FormData): Promise<void> {
  const me = await requireCallWorkspace();
  const id = str(fd, 'prospect_id');
  const lift = str(fd, 'lift') === '1';
  if (!id) throw new Error('Missing prospect');
  if (lift && me.role !== 'admin') throw new Error('Only an administrator can lift an email opt-out');
  await assertCallerOwns(id, me.id, me.role === 'admin');
  const supabase = await createClient();
  const { error } = await supabase
    .from('contractor_prospects')
    .update({ email_opt_out_at: lift ? null : new Date().toISOString(), updated_by: me.id })
    .eq('id', id);
  if (error) {
    throw new Error(/email_opt_out_at/.test(error.message) ? 'Email opt-outs need database migration 0063 — apply it, then try again.' : error.message);
  }
  await supabase.from('audit_logs').insert({
    actor_id: me.id,
    action: lift ? 'prospect.email_opt_out_lifted' : 'prospect.email_opt_out',
    target_user_id: null,
    metadata: { prospect_id: id },
  });
  revalidatePath(`/app/calls/${id}`);
  revalidatePath('/app/calls/emails');
}
