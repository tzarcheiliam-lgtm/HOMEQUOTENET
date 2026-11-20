import 'server-only';
import type { InboundDeps } from './service';
import { confirmBooked, leadContext } from './service';
import { note, type Db } from './core';
import { bookCall, bookVisit, hasLiveAppointment, loadPageOption, type CallOption, type VisitOption } from './scheduling.server';
import { MAX_PROJECT_DESCRIPTION, MIN_PROJECT_DESCRIPTION, summarizeProject, type SummaryComplete } from './project-summary';
import { parseVisitGrant } from './visit-link';

/**
 * The visit booking page (/booking/visit/<link>), texted after the voice note. The homeowner describes the project,
 * picks a time for the free in-home estimate on the contractor's real availability (or a quick call when no
 * contractor is on the lead yet) and books it. The project description is summarised for the owner and the
 * contractor, and the usual texts follow: the confirmation now, the day-before and morning-of reminders later
 * (lib/sms/reminders.ts).
 */

export interface PageSlot { start: string; end: string }

export type VisitPage =
  | { state: 'invalid' }
  | { state: 'closed' }
  | { state: 'booked'; firstName: string | null }
  | { state: 'no_times'; firstName: string | null }
  | {
    state: 'open';
    firstName: string | null;
    project: string | null;
    kind: 'visit' | 'call';
    /** visit: the company coming out. call: who calls. */
    who: string;
    minutes: number;
    timeZone: string;
    slots: PageSlot[];
  };

interface Convo { id: string; lead_id: string; contractor_id: string | null; sender_name: string; status: string }

/** Lead statuses after which the link no longer books anything. */
const MOVED_ON = ['lost', 'cancelled', 'sold', 'appointment_completed', 'estimate_sent'];

async function resolve(db: Db, grant: unknown, now: Date): Promise<{ convo: Convo } | { page: VisitPage }> {
  const id = parseVisitGrant(grant, now.getTime());
  if (!id) return { page: { state: 'invalid' } };
  const { data } = await db.from('sms_conversations').select('id,lead_id,contractor_id,sender_name,status').eq('id', id).maybeSingle();
  const convo = data as Convo | null;
  if (!convo?.lead_id) return { page: { state: 'invalid' } };
  if (convo.status === 'opted_out') return { page: { state: 'closed' } };
  const { data: lead } = await db.from('leads').select('status,archived_at').eq('id', convo.lead_id).maybeSingle();
  const l = lead as { status?: string; archived_at?: string | null } | null;
  if (!l || l.archived_at || MOVED_ON.includes(String(l.status))) return { page: { state: 'closed' } };
  return { convo };
}

const toSlots = (opt: VisitOption | CallOption): PageSlot[] =>
  opt.times.map((t) => ({ start: new Date(t.startMs).toISOString(), end: new Date(t.endMs).toISOString() }));

function openPage(opt: VisitOption | CallOption, ctx: { firstName: string | null; project: string | null }): VisitPage {
  return {
    state: 'open', firstName: ctx.firstName, project: ctx.project, kind: opt.kind, who: opt.who,
    minutes: opt.kind === 'visit' ? 60 : opt.minutes, timeZone: opt.timeZone, slots: toSlots(opt),
  };
}

export async function loadVisitPage(db: Db, grant: unknown, now = new Date()): Promise<VisitPage> {
  const r = await resolve(db, grant, now);
  if ('page' in r) return r.page;
  const ctx = await leadContext(db, r.convo.lead_id);
  if (await hasLiveAppointment(db, r.convo.lead_id, now).catch(() => false)) return { state: 'booked', firstName: ctx.firstName };
  const opt = await loadPageOption(db, r.convo, now);
  return opt ? openPage(opt, ctx) : { state: 'no_times', firstName: ctx.firstName };
}

export type VisitBookResult =
  | { ok: true; kind: 'visit' | 'call'; who: string; startsAt: string; endsAt: string; timeZone: string; minutes: number; firstName: string | null }
  | { ok: false; error: 'invalid' | 'closed' | 'already_booked' | 'description' | 'taken' | 'no_times' | 'error'; page?: VisitPage };

export interface VisitBookDeps { notify?: InboundDeps['notify']; summarize?: SummaryComplete | null }

/** The appointment's notes: who booked it, the brief and their own words (max 2000 characters, as the column). */
export function appointmentNotes(description: string, brief: string | null): string {
  const parts = ['Booked by the homeowner from the text link.'];
  if (brief) parts.push(`Project brief: ${brief}`);
  parts.push(`In their words: “${description}”`);
  return parts.join('\n\n').slice(0, 2000);
}

export async function bookFromVisitPage(
  db: Db,
  input: { grant: unknown; startsAt: string; description: string },
  deps: VisitBookDeps = {},
  now = new Date(),
): Promise<VisitBookResult> {
  const description = input.description.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
  if (description.length < MIN_PROJECT_DESCRIPTION || description.length > MAX_PROJECT_DESCRIPTION) return { ok: false, error: 'description' };
  const r = await resolve(db, input.grant, now);
  if ('page' in r) return { ok: false, error: r.page.state === 'closed' ? 'closed' : 'invalid' };
  const c = r.convo;
  const ctx = await leadContext(db, c.lead_id);
  if (await hasLiveAppointment(db, c.lead_id, now).catch(() => false)) return { ok: false, error: 'already_booked', page: { state: 'booked', firstName: ctx.firstName } };

  // Re-load the open times and only book one that is still on the list (the time and kind come from the server).
  const opt = await loadPageOption(db, c, now);
  if (!opt) return { ok: false, error: 'no_times', page: { state: 'no_times', firstName: ctx.firstName } };
  const startMs = Date.parse(input.startsAt);
  const picked = opt.times.find((t) => t.startMs === startMs);
  if (!picked) return { ok: false, error: 'taken', page: openPage(opt, ctx) };

  const brief = await summarizeProject({ description, project: ctx.project, known: ctx.known }, deps.summarize);
  const notes = appointmentNotes(description, brief);
  const { data: leadRow } = await db.from('leads').select('id,first_name,last_name,phone,email').eq('id', c.lead_id).maybeSingle();
  const l = (leadRow ?? { id: c.lead_id, first_name: null, last_name: null, phone: null, email: null }) as { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null };
  const outcome = opt.kind === 'visit' ? await bookVisit(db, opt, picked, c.lead_id, now, notes) : await bookCall(db, opt, picked, l, notes);
  if (!outcome.ok) {
    if (outcome.reason !== 'taken') return { ok: false, error: 'error' };
    const fresh = await loadPageOption(db, c, now);
    return { ok: false, error: 'taken', page: fresh ? openPage(fresh, ctx) : { state: 'no_times', firstName: ctx.firstName } };
  }

  // Their words and the brief on the lead's timeline (the brief also goes in the owner's alert).
  await note(db, c.lead_id, `Project description from the booking link: “${description}”${brief ? `\n\nAI project brief: ${brief}` : ''}`, { project_description: description, project_brief: brief });
  await confirmBooked(db, c, picked, opt, l, outcome,
    { status: 'handoff', mode: opt.kind === 'visit' ? 'text' : 'call', ...(brief ? { summary: brief.slice(0, 1000) } : {}), updated_at: now.toISOString() },
    deps.notify, now, { via: 'link', brief: brief ?? description });
  return {
    ok: true, kind: opt.kind, who: opt.who, startsAt: new Date(picked.startMs).toISOString(), endsAt: new Date(picked.endMs).toISOString(),
    timeZone: opt.timeZone, minutes: opt.kind === 'visit' ? 60 : opt.minutes, firstName: ctx.firstName,
  };
}
