'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkContractorSlot } from '@/lib/availability/enforce.server';
import { isValidTimeZone } from '@/lib/availability/time';
import { decryptCalendarSecret, siteUrl } from '@/lib/calendar/config';
import { revokeToken } from '@/lib/calendar/google';
import { flushCalendarSyncSoon, reconcileMirrorCalendars, unmirrorConnection } from '@/lib/calendar/sync.server';
import type { Profile } from '@/lib/types';

export type AvailabilityState = { error?: string; success?: string } | undefined;

/** Which company's availability this user may edit: owners their own, admins any (passed explicitly). */
async function editableContractor(requested: string | null): Promise<{ profile: Profile; contractorId: string }> {
  const profile = await requireProfile();
  if (profile.role === 'admin') {
    if (!requested) throw new Error('Pick a contractor');
    return { profile, contractorId: requested };
  }
  if (profile.role === 'contractor' && profile.contractor_role === 'owner' && profile.contractor_id) {
    return { profile, contractorId: profile.contractor_id };
  }
  throw new Error('Only the contractor owner or a HomeQuote admin can change availability');
}

function fail(e: unknown): { error: string } {
  return { error: e instanceof Error ? e.message : 'Something went wrong' };
}

function refresh() {
  revalidatePath('/app/availability');
  revalidatePath('/app/calendar/settings');
  revalidatePath('/app/contractors/[id]', 'page');
}

const settingsSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, 'Pick a valid time zone'),
  weekly_schedule_enabled: z.boolean(),
  min_notice_hours: z.coerce.number().int().min(0).max(720),
  buffer_minutes: z.coerce.number().int().min(0).max(480),
  max_appointments_per_day: z.coerce.number().int().min(1).max(50).nullable(),
  default_duration_minutes: z.coerce.number().int().min(15).max(480),
});

const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null ? null : String(v).trim();
};

export async function saveAvailabilitySettings(_prev: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  try {
    const { profile, contractorId } = await editableContractor(field(formData, 'contractor_id') || null);
    const parsed = settingsSchema.safeParse({
      timezone: field(formData, 'timezone'),
      weekly_schedule_enabled: formData.get('weekly_schedule_enabled') === 'on',
      min_notice_hours: field(formData, 'min_notice_hours') || 0,
      buffer_minutes: field(formData, 'buffer_minutes') || 0,
      max_appointments_per_day: field(formData, 'max_appointments_per_day') ? field(formData, 'max_appointments_per_day') : null,
      default_duration_minutes: field(formData, 'default_duration_minutes') || 60,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the settings' };
    const supabase = await createClient();
    const { error } = await supabase
      .from('contractor_availability_settings')
      .upsert({ contractor_id: contractorId, ...parsed.data, updated_by: profile.id }, { onConflict: 'contractor_id' });
    if (error) return { error: error.message };
    refresh();
    return { success: 'Settings saved' };
  } catch (e) {
    return fail(e);
  }
}

const ruleSchema = z
  .object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })
  .refine((r) => r.endMinute > r.startMinute, 'End time must be after start time');

/** Replace the whole weekly schedule. Inserts first, then removes the old rows, so a failure never leaves an empty schedule. */
export async function saveWeeklySchedule(_prev: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  try {
    const { contractorId } = await editableContractor(field(formData, 'contractor_id') || null);
    let raw: unknown;
    try {
      raw = JSON.parse(field(formData, 'rules') || '[]');
    } catch {
      return { error: 'Could not read the schedule' };
    }
    const parsed = z.array(ruleSchema).max(70).safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the schedule' };
    // Reject overlapping windows on the same day.
    const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
    for (const r of parsed.data) byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);
    for (const list of byDay.values()) {
      list.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < list.length; i++) if (list[i].startMinute < list[i - 1].endMinute) return { error: 'Time windows on the same day cannot overlap' };
    }
    const supabase = await createClient();
    const { data: old } = await supabase.from('contractor_availability_rules').select('id').eq('contractor_id', contractorId);
    if (parsed.data.length) {
      const { error } = await supabase.from('contractor_availability_rules').insert(
        parsed.data.map((r) => ({ contractor_id: contractorId, weekday: r.weekday, start_minute: r.startMinute, end_minute: r.endMinute }))
      );
      if (error) return { error: error.message };
    }
    const oldIds = (old ?? []).map((r: { id: string }) => r.id);
    if (oldIds.length) {
      const { error } = await supabase.from('contractor_availability_rules').delete().in('id', oldIds);
      if (error) return { error: error.message };
    }
    refresh();
    return { success: 'Weekly schedule saved' };
  } catch (e) {
    return fail(e);
  }
}

/** Admin: the hours given to any contractor who has not set their own. */
export async function saveDefaultHours(_prev: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  try {
    const profile = await requireProfile();
    if (profile.role !== 'admin') return { error: 'Only a HomeQuote admin can change the default hours' };
    let raw: unknown;
    try {
      raw = JSON.parse(field(formData, 'rules') || '[]');
    } catch {
      return { error: 'Could not read the schedule' };
    }
    const parsed = z.array(ruleSchema).max(70).safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the schedule' };
    const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
    for (const r of parsed.data) byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);
    for (const list of byDay.values()) {
      list.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < list.length; i++) if (list[i].startMinute < list[i - 1].endMinute) return { error: 'Time windows on the same day cannot overlap' };
    }
    const { error } = await createAdminClient()
      .from('availability_defaults')
      .upsert({ id: true, rules: parsed.data, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) return { error: 'Could not save. Has the latest database update been applied?' };
    refresh();
    return { success: 'Default hours saved' };
  } catch (e) {
    return fail(e);
  }
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const exceptionSchema = z
  .object({
    kind: z.enum(['blocked', 'available']),
    date_start: z.string().regex(dateRe, 'Pick a start date'),
    date_end: z.string().regex(dateRe, 'Pick an end date'),
    start_minute: z.number().int().min(0).max(1439).nullable(),
    end_minute: z.number().int().min(1).max(1440).nullable(),
    note: z.string().max(300).nullable(),
    repeat_weekly: z.boolean(),
    repeat_until: z.string().regex(dateRe).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.date_end < v.date_start) ctx.addIssue({ code: 'custom', message: 'End date is before the start date' });
    if ((v.start_minute === null) !== (v.end_minute === null)) ctx.addIssue({ code: 'custom', message: 'Set both a start and end time, or neither for the whole day' });
    if (v.start_minute !== null && v.end_minute !== null && v.end_minute <= v.start_minute) ctx.addIssue({ code: 'custom', message: 'End time must be after start time' });
    if (v.repeat_weekly && v.date_end !== v.date_start) ctx.addIssue({ code: 'custom', message: 'Weekly repeats apply to a single starting day' });
    if (v.repeat_until && (!v.repeat_weekly || v.repeat_until < v.date_start)) ctx.addIssue({ code: 'custom', message: 'Repeat-until must be after the start date' });
  });

function minuteFrom(time: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export async function addAvailabilityException(_prev: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  try {
    const { profile, contractorId } = await editableContractor(field(formData, 'contractor_id') || null);
    const allDay = formData.get('all_day') === 'on';
    const start = allDay ? null : minuteFrom(field(formData, 'start_time'));
    // "24:00" is not a valid <input type=time> value; an end of 00:00 means midnight.
    let end = allDay ? null : minuteFrom(field(formData, 'end_time'));
    if (!allDay && end === 0) end = 1440;
    const dateStart = field(formData, 'date_start') ?? '';
    const repeat = formData.get('repeat_weekly') === 'on';
    const parsed = exceptionSchema.safeParse({
      kind: field(formData, 'kind') === 'available' ? 'available' : 'blocked',
      date_start: dateStart,
      date_end: repeat ? dateStart : field(formData, 'date_end') || dateStart,
      start_minute: start,
      end_minute: end,
      note: field(formData, 'note') || null,
      repeat_weekly: repeat,
      repeat_until: repeat ? field(formData, 'repeat_until') || null : null,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the dates' };
    const supabase = await createClient();
    const { error } = await supabase.from('contractor_availability_exceptions').insert({ contractor_id: contractorId, created_by: profile.id, ...parsed.data });
    if (error) return { error: error.message };
    refresh();
    return { success: parsed.data.kind === 'blocked' ? 'Time blocked off' : 'Extra availability added' };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAvailabilityException(formData: FormData): Promise<void> {
  try {
    const { contractorId } = await editableContractor(field(formData, 'contractor_id') || null);
    const id = field(formData, 'id');
    if (!id) return;
    const supabase = await createClient();
    await supabase.from('contractor_availability_exceptions').delete().eq('id', id).eq('contractor_id', contractorId);
    refresh();
  } catch {
    /* not permitted: nothing changes */
  }
}

/** Staff scheduling UI: does this time work for the contractor behind an assignment? */
export async function checkAppointmentSlot(assignmentId: string, dateTime: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireProfile();
    if (!assignmentId || !dateTime) return { ok: true };
    const supabase = await createClient();
    // RLS: this only resolves for an assignment the caller can see.
    const { data } = await supabase.from('lead_assignments').select('contractor_id').eq('id', assignmentId).maybeSingle();
    if (!data?.contractor_id) return { ok: true };
    const check = await checkContractorSlot(data.contractor_id, dateTime);
    return { ok: check.ok, message: check.message };
  } catch {
    return { ok: true };
  }
}

// --- calendar connections -----------------------------------------------------------------

async function ownConnection(connectionId: string) {
  const profile = await requireProfile();
  const db = createAdminClient();
  const { data } = await db.from('calendar_connections').select('id, user_id, contractor_id, encrypted_credentials, provider').eq('id', connectionId).maybeSingle();
  if (!data || data.user_id !== profile.id) throw new Error('Connection not found');
  return { db, connection: data };
}

export async function disconnectCalendar(formData: FormData): Promise<void> {
  try {
    const id = field(formData, 'connection_id');
    if (!id) return;
    const { db, connection } = await ownConnection(id);
    try {
      await revokeToken(decryptCalendarSecret(connection.encrypted_credentials));
    } catch {
      /* key missing or token unreadable: still delete our copy */
    }
    await db.from('calendar_connections').delete().eq('id', id);
    refresh();
  } catch {
    /* ignore */
  }
}

export async function updateCalendarPreferences(formData: FormData): Promise<void> {
  try {
    const id = field(formData, 'connection_id');
    if (!id) return;
    const { db, connection } = await ownConnection(id);
    const patch: Record<string, boolean> = { push_appointments: formData.get('push_appointments') === 'on', import_busy: formData.get('import_busy') === 'on' };
    // "Put every appointment on my calendar" (0073): admins only, on their own (non-contractor) connection.
    const profile = await requireProfile();
    const mirror = formData.has('mirror_field') && profile.role === 'admin' && !connection.contractor_id;
    if (mirror) patch.mirror_all_appointments = formData.get('mirror_all_appointments') === 'on';
    await db.from('calendar_connections').update(patch).eq('id', id);
    if (mirror) {
      // On: queue every upcoming appointment and sales meeting. Off: the next tick removes nothing by itself,
      // so queue this calendar's mirrored events to come off now.
      if (patch.mirror_all_appointments) await reconcileMirrorCalendars(db, { connectionIds: [id] });
      else await unmirrorConnection(db, id);
      flushCalendarSyncSoon();
    }
    refresh();
  } catch {
    /* ignore */
  }
}

/** Create the user's private feed link, or return the existing one (never silently rotates a live subscription). */
export async function getOrCreateFeedUrl(rotate = false): Promise<{ url?: string; error?: string }> {
  try {
    const profile = await requireProfile();
    if (profile.role !== 'contractor' || !profile.contractor_id) return { error: 'Only contractor users have a calendar feed' };
    const db = createAdminClient();
    const { data: existing } = await db.from('calendar_feed_tokens').select('id, token').eq('user_id', profile.id).maybeSingle();
    if (existing && !rotate) return { url: `${siteUrl()}/api/calendar/feed/${existing.token}.ics` };
    const token = randomBytes(32).toString('base64url');
    const { error } = existing
      ? await db.from('calendar_feed_tokens').update({ token, created_at: new Date().toISOString(), last_used_at: null }).eq('id', existing.id)
      : await db.from('calendar_feed_tokens').insert({ user_id: profile.id, contractor_id: profile.contractor_id, token });
    if (error) return { error: 'Could not create the link' };
    revalidatePath('/app/availability');
    return { url: `${siteUrl()}/api/calendar/feed/${token}.ics` };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeFeedUrl(): Promise<void> {
  try {
    const profile = await requireProfile();
    await createAdminClient().from('calendar_feed_tokens').delete().eq('user_id', profile.id);
    revalidatePath('/app/availability');
  } catch {
    /* ignore */
  }
}
