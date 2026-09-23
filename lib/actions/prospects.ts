'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireCallerOrAdmin, requireRole } from '@/lib/auth';
import { nextProspectIdFor } from '@/lib/data/prospects';
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
  | { ok: true; message?: string; nextId?: string | null }
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
    .select('id, assigned_to, disposition, company_name, call_attempt_count')
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
  };
}

/* ---- Log a call outcome --------------------------------------------------- */

export async function logCallOutcome(
  _prev: ProspectActionState,
  fd: FormData
): Promise<ProspectActionState> {
  const me = await requireCallerOrAdmin();
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

  // 2. The prospect's current state, derived from the same input.
  const patch = prospectPatchFor(outcome, input);
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
  }

  revalidatePath('/app/calls');
  revalidatePath(`/app/calls/${prospectId}`);
  revalidatePath('/app/calls/logs');
  revalidatePath('/app/calls/appointments');

  const wantsNext = fd.get('intent') === 'save_and_next';
  const nextId = wantsNext ? await nextProspectIdFor(me, prospectId) : null;
  if (wantsNext) {
    redirect(nextId ? `/app/calls/${nextId}` : '/app/calls?view=mine&done=1');
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
    // Only an active caller may hold prospects; a stale id is refused here
    // rather than silently creating a list nobody can see.
    const { data: target } = await supabase
      .from('profiles')
      .select('id, role, account_status, deleted_at')
      .eq('id', assignee)
      .maybeSingle();
    if (
      !target ||
      target.role !== 'caller' ||
      target.account_status !== 'active' ||
      target.deleted_at
    ) {
      throw new Error('Assignee must be an active caller');
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
  const me = await requireCallerOrAdmin();
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
