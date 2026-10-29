/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
/**
 * The in-app booking calendar (day / week), pure parts: date ranges in the
 * calendar's zone, block layout (overlaps side by side), open-hour shading,
 * status styles, and the row -> event mapping for homeowner calls, on-site
 * visits and sales meetings. No I/O; shared by the page, the client views,
 * the server actions and the tests. Every instant is UTC epoch ms; wall
 * clock only ever appears in the calendar's own zone.
 */
import { addDays, localParts, weekdayOfDate, zonedToUtc } from '@/lib/availability/time';

export type CalendarViewMode = 'day' | 'week';

/**
 * appointment        a call on a booking calendar (homeowner)
 * visit              an on-site appointment of the contractor (no calendar), shown on their calendar as busy
 * sales_appointment  a sales meeting with a contractor prospect (HomeQuote sales calendar)
 */
export type EventKind = 'appointment' | 'visit' | 'sales_appointment';

export interface DesignSummary {
  /** The design in plain words, one line per group / step. */
  lines: string[];
  photo: { url: string; alt: string } | null;
  designUrl: string | null;
  /** "$48,000 – $62,000" when the estimator showed a range. */
  range: string | null;
}

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  status: string;
  startMs: number;
  endMs: number;
  /** Who: the homeowner, or the prospect's decision maker / company. */
  title: string;
  /** What: project (vertical · service) or the prospect's company. */
  subtitle: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  leadId: string | null;
  prospectId: string | null;
  source: string | null;
  meetingType: string | null;
  location: string | null;
  notes: string | null;
  contractorName: string | null;
  cancelReason: string | null;
  rescheduleCount: number;
  design: DesignSummary | null;
  /** A sales meeting booked from a call (no booking calendar): its time is changed with Edit on the prospect, not the slot picker. */
  handBooked?: boolean;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A valid ?date= (yyyy-mm-dd), else today in the calendar's zone. */
export function parseViewDate(value: string | undefined | null, timeZone: string, nowMs = Date.now()): string {
  if (value && DATE_RE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d) return value;
  }
  return localParts(nowMs, timeZone).date;
}

export const parseViewMode = (value: string | undefined | null): CalendarViewMode => (value === 'day' ? 'day' : 'week');

/** Monday of the date's week (weeks run Monday to Sunday, like the weekly hours editor). */
export function weekStart(date: string): string {
  return addDays(date, -((weekdayOfDate(date) + 6) % 7));
}

/** The days shown and the UTC window that covers them (local midnight to midnight, DST-safe). */
export function viewRange(mode: CalendarViewMode, date: string, timeZone: string): { days: string[]; fromMs: number; toMs: number } {
  const first = mode === 'week' ? weekStart(date) : date;
  const days = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => addDays(first, i));
  return { days, fromMs: zonedToUtc(days[0], 0, timeZone), toMs: zonedToUtc(addDays(days[days.length - 1], 1), 0, timeZone) };
}

/** Previous / next page of the view. */
export function shiftViewDate(mode: CalendarViewMode, date: string, direction: -1 | 1): string {
  return addDays(date, direction * (mode === 'week' ? 7 : 1));
}

const titleFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts);
  let f = titleFmt.get(key);
  if (!f) {
    // Dates here are zone-free calendar days, rendered at UTC noon.
    f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });
    titleFmt.set(key, f);
  }
  return f;
}
const noon = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

/** "Thu, Oct 29" */
export const dayLabel = (date: string) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(noon(date));
/** "Thursday, October 29" */
export const longDayLabel = (date: string) => fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(noon(date));

/** Toolbar title: "Oct 26 – Nov 1, 2026" for a week, "Thursday, October 29, 2026" for a day. */
export function rangeTitle(mode: CalendarViewMode, days: string[]): string {
  if (mode === 'day' || days.length === 1) return fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(noon(days[0]));
  const a = noon(days[0]);
  const b = noon(days[days.length - 1]);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const left = fmt({ month: 'short', day: 'numeric' }).format(a);
  const right = sameMonth ? fmt({ day: 'numeric' }).format(b) : fmt({ month: 'short', day: 'numeric' }).format(b);
  return `${left} – ${right}, ${b.getUTCFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export interface PlacedEvent {
  event: CalendarEvent;
  /** Minutes from local midnight, clipped to the day. */
  startMin: number;
  endMin: number;
  /** Side-by-side position among events that overlap it (0-based) and how many share the row. */
  lane: number;
  lanes: number;
}

/** Minutes from the day's local midnight (handles DST days: midnight-to-midnight may be 23 or 25 h). */
function minutesInto(date: string, ms: number, timeZone: string): number {
  return Math.round((ms - zonedToUtc(date, 0, timeZone)) / 60_000);
}

/**
 * Events that start on `date` (calendar zone), with overlapping ones placed in
 * lanes. Blocks are at least 15 minutes tall so a short one stays tappable.
 */
export function layoutDay(events: CalendarEvent[], date: string, timeZone: string): PlacedEvent[] {
  const dayLen = minutesInto(date, zonedToUtc(addDays(date, 1), 0, timeZone), timeZone);
  const mine = events
    .filter((e) => localParts(e.startMs, timeZone).date === date)
    .map((event) => {
      const startMin = Math.max(0, minutesInto(date, event.startMs, timeZone));
      const endMin = Math.min(dayLen, Math.max(startMin + 15, minutesInto(date, event.endMs, timeZone)));
      return { event, startMin, endMin, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.event.id.localeCompare(b.event.id));

  // Clusters of transitively overlapping events share one lane count.
  let cluster: PlacedEvent[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    for (const p of cluster) p.lanes = lanes;
    cluster = [];
  };
  for (const p of mine) {
    if (cluster.length && p.startMin >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const q of cluster) laneEnds[q.lane] = Math.max(laneEnds[q.lane] ?? -1, q.endMin);
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > p.startMin) lane++;
    p.lane = lane;
    cluster.push(p);
    clusterEnd = Math.max(clusterEnd, p.endMin);
  }
  if (cluster.length) flush();
  return mine;
}

export interface HourRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

/** Open-hour bands for a date from the weekly rules (minutes from local midnight). */
export function openBands(rules: HourRule[], date: string): { startMin: number; endMin: number }[] {
  const wd = weekdayOfDate(date);
  return rules
    .filter((r) => r.weekday === wd)
    .map((r) => ({ startMin: r.startMinute, endMin: r.endMinute }))
    .sort((a, b) => a.startMin - b.startMin);
}

/**
 * Which hours the grid shows: 8 AM–6 PM at least, widened to cover the open
 * hours and every event in view, so nothing is ever cut off.
 */
export function visibleHours(rules: HourRule[], placed: PlacedEvent[]): { startHour: number; endHour: number } {
  let start = 8 * 60;
  let end = 18 * 60;
  for (const r of rules) {
    start = Math.min(start, r.startMinute);
    end = Math.max(end, r.endMinute);
  }
  for (const p of placed) {
    start = Math.min(start, p.startMin);
    end = Math.max(end, p.endMin);
  }
  return { startHour: Math.max(0, Math.floor(start / 60)), endHour: Math.min(24, Math.ceil(end / 60)) };
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/** Statuses that still hold the time. */
export function isLive(kind: EventKind, status: string): boolean {
  return kind === 'sales_appointment' ? ['scheduled', 'confirmed', 'rescheduled'].includes(status) : status === 'scheduled';
}

const STATUS: Record<string, { label: string; block: string; dot: string }> = {
  scheduled: { label: 'Scheduled', block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50', dot: 'bg-blue-600' },
  confirmed: { label: 'Confirmed', block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50', dot: 'bg-blue-600' },
  rescheduled: { label: 'Rescheduled', block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50', dot: 'bg-blue-600' },
  held: { label: 'Held', block: 'border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50', dot: 'bg-emerald-600' },
  completed: { label: 'Held', block: 'border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50', dot: 'bg-emerald-600' },
  no_show: { label: 'No-show', block: 'border-l-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50', dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', block: 'border-l-muted-foreground/50 bg-muted text-muted-foreground line-through decoration-muted-foreground/60', dot: 'bg-muted-foreground/60' },
};
const VISIT = { label: 'On-site visit', block: 'border-l-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100', dot: 'bg-slate-500' };

/** Label + Tailwind classes for a block. A scheduled on-site visit reads as such (it is busy time, not a call). */
export function statusStyle(kind: EventKind, status: string): { label: string; block: string; dot: string } {
  if (kind === 'visit' && status === 'scheduled') return VISIT;
  return STATUS[status] ?? STATUS.scheduled;
}

/** The status actions offered in the details sheet. */
/** "Couldn't reach them" (lead recovery): a homeowner's call on a calendar whose time came and that is still scheduled. */
export function canReportMissedCall(e: Pick<CalendarEvent, 'kind' | 'status' | 'startMs' | 'leadId'>, canWork: boolean, nowMs: number): boolean {
  return canWork && e.kind === 'appointment' && !!e.leadId && e.status === 'scheduled' && e.startMs <= nowMs;
}

export function statusActions(kind: EventKind, status: string, startMs: number, nowMs: number): { value: string; label: string }[] {
  if (status === 'cancelled') return [];
  // Held / no-show only once the call time has come (or to correct an earlier outcome).
  if (startMs > nowMs && isLive(kind, status)) return [];
  const held = kind === 'sales_appointment' ? 'completed' : 'held';
  const out = [
    { value: held, label: 'Held' },
    { value: 'no_show', label: 'No-show' },
  ].filter((a) => a.value !== status);
  return out;
}

export const SOURCE_LABELS: Record<string, string> = {
  funnel: 'Website funnel',
  estimator: 'Instant estimator',
  manual: 'Booked by the team',
  sales_funnel: 'Contractor sales funnel',
  ai: 'AI assistant',
  workflow: 'Automation',
};
export const sourceLabel = (source: string | null) => (source ? SOURCE_LABELS[source] ?? source : null);

/* ------------------------------------------------------------------ */
/* Rows -> events                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_LEN_MS = 30 * 60_000;
const VISIT_LEN_MS = 60 * 60_000;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

function endOf(startMs: number, endsAt: unknown, fallbackMs: number): number {
  const e = typeof endsAt === 'string' ? Date.parse(endsAt) : NaN;
  return Number.isFinite(e) && e > startMs ? e : startMs + fallbackMs;
}

/**
 * An appointments row (with `lead:leads(...)` and `assignment:lead_assignments(...)`
 * embedded) as an event. The lead comes from appointments.lead_id, then the
 * assignment, then the contact the booking stored. Null when it has no time.
 */
export function mapAppointmentRow(r: Record<string, any>, design: DesignSummary | null = null): CalendarEvent | null {
  const startMs = r.scheduled_at ? Date.parse(r.scheduled_at) : NaN;
  if (!Number.isFinite(startMs)) return null;
  const assignment = one(r.assignment);
  const lead = one(r.lead) ?? one(assignment?.lead);
  const name = [str(lead?.first_name), str(lead?.last_name)].filter(Boolean).join(' ') || str(r.contact_name) || str(lead?.phone) || str(r.contact_phone) || 'Homeowner';
  const project = [str(one(lead?.vertical)?.name), str(one(lead?.sub_service)?.name)].filter(Boolean).join(' · ') || null;
  const kind: EventKind = r.calendar_id ? 'appointment' : 'visit';
  return {
    id: r.id,
    kind,
    status: r.status ?? 'scheduled',
    startMs,
    endMs: endOf(startMs, r.ends_at, kind === 'visit' ? VISIT_LEN_MS : DEFAULT_LEN_MS),
    title: name,
    subtitle: project,
    phone: str(r.contact_phone) ?? str(lead?.phone),
    email: str(r.contact_email) ?? str(lead?.email),
    city: str(lead?.city),
    leadId: lead?.id ?? r.lead_id ?? null,
    prospectId: null,
    source: str(r.source),
    meetingType: str(r.meeting_type) ?? (kind === 'visit' ? 'in_person' : null),
    location: str(r.location),
    notes: str(r.notes),
    contractorName: str(one(assignment?.contractor)?.name),
    cancelReason: str(r.cancel_reason),
    rescheduleCount: Number(r.reschedule_count ?? 0) || 0,
    design,
  };
}

/** A prospect_sales_appointments row (with `prospect:contractor_prospects(...)`) as an event. */
export function mapSalesRow(r: Record<string, any>): CalendarEvent | null {
  const startMs = r.scheduled_at ? Date.parse(r.scheduled_at) : NaN;
  if (!Number.isFinite(startMs)) return null;
  const p = one(r.prospect);
  const company = str(p?.company_name);
  return {
    id: r.id,
    kind: 'sales_appointment',
    status: r.status ?? 'scheduled',
    startMs,
    endMs: endOf(startMs, r.ends_at, DEFAULT_LEN_MS),
    title: str(r.decision_maker_name) ?? company ?? 'Contractor prospect',
    subtitle: str(r.decision_maker_name) ? company : null,
    phone: str(p?.phone),
    email: str(p?.email),
    city: str(p?.city),
    leadId: null,
    prospectId: p?.id ?? r.prospect_id ?? null,
    source: str(r.source),
    meetingType: str(r.appointment_type),
    location: str(r.contact_info),
    notes: str(r.notes),
    contractorName: null,
    cancelReason: str(r.cancel_reason),
    rescheduleCount: Number(r.reschedule_count ?? 0) || 0,
    design: null,
    handBooked: !r.calendar_id,
  };
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const isHttps = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

/**
 * The design summary + first photo the homeowner saw, from the estimator's
 * lead_activities entry (metadata.estimator, written by lib/estimator/lead.ts
 * buildLeadPayload). Null when the lead did not come through an estimator.
 */
export function designFromActivity(metadata: unknown): DesignSummary | null {
  const est = (metadata as Record<string, any> | null)?.estimator;
  if (!est || typeof est !== 'object') return null;
  const conf = est.configurator && typeof est.configurator === 'object' ? est.configurator : null;
  const lines: string[] = Array.isArray(conf?.summary) ? conf.summary.filter((l: unknown): l is string => typeof l === 'string' && l.trim() !== '').slice(0, 12) : [];
  const photos: any[] = Array.isArray(conf?.photos) ? conf.photos : [];
  const firstPhoto = photos.find((p) => isHttps(p?.url));
  const low = typeof est.low === 'number' ? est.low : null;
  const high = typeof est.high === 'number' ? est.high : null;
  const range = low !== null && high !== null ? (low === high ? usd.format(low) : `${usd.format(low)} – ${usd.format(high)}`) : null;
  const designUrl = isHttps(conf?.designUrl) ? conf.designUrl : null;
  if (!lines.length && !firstPhoto && !range && !designUrl) return null;
  return {
    lines,
    photo: firstPhoto ? { url: firstPhoto.url, alt: typeof firstPhoto.alt === 'string' ? firstPhoto.alt : 'Design photo' } : null,
    designUrl,
    range,
  };
}

/** The newest estimator design per lead from lead_activities rows (lead_id, metadata, created_at), newest first. */
export function designsByLead(rows: { lead_id: string; metadata: unknown }[]): Map<string, DesignSummary> {
  const out = new Map<string, DesignSummary>();
  for (const r of rows) {
    if (out.has(r.lead_id)) continue;
    const d = designFromActivity(r.metadata);
    if (d) out.set(r.lead_id, d);
  }
  return out;
}
