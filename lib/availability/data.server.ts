/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getExternalBusy } from '@/lib/calendar/busy.server';
import {
  DEFAULT_SETTINGS,
  DEFAULT_WEEKLY_RULES,
  type AvailabilityContext,
  type AvailabilityException,
  type AvailabilitySettings,
  type BookedAppointment,
  type WeeklyRule,
} from './slots';

type Db = ReturnType<typeof createAdminClient>;

/** Statuses that still occupy the contractor's time. */
const OCCUPYING = ['scheduled', 'held'];

export interface StoredAvailability {
  settings: AvailabilitySettings;
  rules: (WeeklyRule & { id: string })[];
  exceptions: (AvailabilityException & { id: string })[];
  /** True when the contractor has configured anything at all. */
  configured: boolean;
}

export function mapSettings(row: Record<string, any> | null | undefined): AvailabilitySettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    timezone: row.timezone ?? DEFAULT_SETTINGS.timezone,
    weeklyScheduleEnabled: !!row.weekly_schedule_enabled,
    minNoticeHours: row.min_notice_hours ?? 0,
    bufferMinutes: row.buffer_minutes ?? 0,
    maxAppointmentsPerDay: row.max_appointments_per_day ?? null,
    defaultDurationMinutes: row.default_duration_minutes ?? DEFAULT_SETTINGS.defaultDurationMinutes,
  };
}

export function mapException(r: Record<string, any>): AvailabilityException & { id: string } {
  return {
    id: r.id,
    kind: r.kind,
    dateStart: r.date_start,
    dateEnd: r.date_end,
    startMinute: r.start_minute,
    endMinute: r.end_minute,
    note: r.note,
    repeatWeekly: !!r.repeat_weekly,
    repeatUntil: r.repeat_until,
  };
}

/** The admin-editable default hours; falls back to the built-in schedule if the table is missing or empty. */
export async function loadDefaultHours(db: Db | any): Promise<{ timezone: string; rules: WeeklyRule[] }> {
  const fallback = { timezone: DEFAULT_SETTINGS.timezone, rules: DEFAULT_WEEKLY_RULES };
  try {
    const { data } = await db.from('availability_defaults').select('timezone, rules').eq('id', true).maybeSingle();
    if (!data || !Array.isArray(data.rules)) return fallback;
    const rules = (data.rules as any[])
      .filter((r) => Number.isInteger(r?.weekday) && Number.isInteger(r?.startMinute) && Number.isInteger(r?.endMinute) && r.endMinute > r.startMinute)
      .map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute }));
    return { timezone: data.timezone || fallback.timezone, rules };
  } catch {
    return fallback;
  }
}

/** Raw stored availability using a given client (RLS applies to a user client). */
export async function loadStoredAvailability(db: Db | any, contractorId: string): Promise<StoredAvailability> {
  const [s, r, e] = await Promise.all([
    db.from('contractor_availability_settings').select('*').eq('contractor_id', contractorId).maybeSingle(),
    db.from('contractor_availability_rules').select('*').eq('contractor_id', contractorId).order('weekday').order('start_minute'),
    db.from('contractor_availability_exceptions').select('*').eq('contractor_id', contractorId).order('date_start'),
  ]);
  const rules = ((r.data ?? []) as any[]).map((x) => ({ id: x.id, weekday: x.weekday, startMinute: x.start_minute, endMinute: x.end_minute }));
  const exceptions = ((e.data ?? []) as any[]).map(mapException);
  const configured = !!s.data || rules.length > 0 || exceptions.length > 0;
  if (!configured) {
    const d = await loadDefaultHours(db);
    return {
      settings: { ...DEFAULT_SETTINGS, timezone: d.timezone, weeklyScheduleEnabled: true },
      rules: d.rules.map((x, i) => ({ ...x, id: `default-${i}` })),
      exceptions,
      configured,
    };
  }
  return { settings: mapSettings(s.data), rules, exceptions, configured };
}

/** The contractor's existing appointments (in or near the window), as busy intervals. */
export async function loadBookedAppointments(
  db: Db,
  contractorId: string,
  fromMs: number,
  toMs: number,
  durationMinutes: number
): Promise<BookedAppointment[]> {
  const { data } = await db
    .from('appointments')
    .select('id, scheduled_at, status, assignment:lead_assignments!inner(contractor_id)')
    .eq('assignment.contractor_id', contractorId)
    .in('status', OCCUPYING)
    .gte('scheduled_at', new Date(fromMs).toISOString())
    .lt('scheduled_at', new Date(toMs).toISOString());
  return ((data ?? []) as any[])
    .filter((a) => a.scheduled_at)
    .map((a) => {
      const startMs = new Date(a.scheduled_at).getTime();
      return { id: a.id, startMs, endMs: startMs + durationMinutes * 60_000 };
    });
}

/**
 * Everything needed to evaluate a window for one contractor. Uses the service
 * role (callers must have authorized the user first): staff can see all of this
 * anyway, and a contractor's own booking must still see their other bookings.
 */
export async function loadAvailabilityContext(
  contractorId: string,
  fromMs: number,
  toMs: number,
  opts: { db?: Db; includeExternalBusy?: boolean } = {}
): Promise<AvailabilityContext & { configured: boolean }> {
  const db = opts.db ?? createAdminClient();
  const stored = await loadStoredAvailability(db, contractorId);
  // Pad so buffers, the daily cap and multi-day blocks around the window are seen.
  const pad = 36 * 3_600_000;
  const [appointments, externalBusy] = await Promise.all([
    loadBookedAppointments(db, contractorId, fromMs - pad, toMs + pad, stored.settings.defaultDurationMinutes),
    opts.includeExternalBusy === false ? Promise.resolve([]) : getExternalBusy(contractorId, fromMs - pad, toMs + pad, db),
  ]);
  return {
    settings: stored.settings,
    rules: stored.rules,
    exceptions: stored.exceptions,
    appointments,
    externalBusy,
    nowMs: Date.now(),
    configured: stored.configured,
  };
}
