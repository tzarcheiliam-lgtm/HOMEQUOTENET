import 'server-only';
export { DEFAULT_SETTINGS, loadSettings, type SmsSettings } from './core';
import { normalizeUsPhone } from '@/lib/ai-calling/phone';
import { nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { runSmsAgent, type AgentInput, type AgentResult, type OpenTimesForAgent, type SmsTurn } from './agent';
import { AWAIT_BOOKING_STEP, callBookedText, takenText, threeSpread, visitBookedText, type OpenTime } from './scheduling';
import { bookCall, bookVisit, loadBookingOptions, NO_OPTIONS, noteBooked, type BookingOptions } from './scheduling.server';
import type { Alert } from './health';
import { notifyAdmins } from './health-notify';
import { DEFAULT_ZONES, MAX_AI_TURNS } from './config';
import { handleLeadReminderReply, handleProspectReply } from './reminder-replies';
import { isLive, loadSettings, note, phoneInUse, queue, sentToday, type Db } from './core';
import { finalizeOutbound, helpReply, isHelp, isOptOut, isStart, metaProject, openingMessage, optOutConfirmation, projectLabel, SENDER_HOUSE } from './rules';

export interface ContractorTexting { enabled: boolean; senderName: string | null; openingTemplate: string | null; extraInstructions: string | null }
/** A contractor's texting switch and wording. Tolerates migration 0059 not being applied yet. */
export async function loadContractorTexting(db: Db, contractorId: string): Promise<ContractorTexting> {
  const full = await db.from('contractors').select('texting_enabled,texting_sender_name,texting_opening_template,texting_extra_instructions').eq('id', contractorId).maybeSingle();
  if (!full.error) {
    const r = full.data as Record<string, unknown> | null;
    return { enabled: !!r?.texting_enabled, senderName: (r?.texting_sender_name as string) || null, openingTemplate: (r?.texting_opening_template as string) || null, extraInstructions: (r?.texting_extra_instructions as string) || null };
  }
  const { data } = await db.from('contractors').select('texting_enabled').eq('id', contractorId).maybeSingle();
  return { enabled: !!(data as { texting_enabled?: boolean } | null)?.texting_enabled, senderName: null, openingTemplate: null, extraInstructions: null };
}

async function aiRepliesToday(db: Db): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('ai', true).gte('created_at', since);
  return count ?? 0;
}
const normalizeBody = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/** Plain-language reasons a new lead was not texted, written onto the lead so nobody has to ask why. */
const SKIP_NOTES: Record<string, string> = {
  off: 'Not texted: automatic texting is turned off.',
  contractor_funnel_off: 'Not texted: automatic texting is off for this contractor (it needs the contractor-funnels switch on the Texting page and the switch on the contractor’s page).',
  daily_cap: 'Not texted: the daily text limit was reached.',
  bad_phone: 'Not texted: the phone number is not a valid US number.',
  opted_out: 'Not texted: this number opted out of texts.',
  phone_in_use: 'Not texted: this number is already in a text conversation (started in the last 14 days).',
  test_lead: 'Not texted: this is a Meta test lead.',
  error: 'Not texted: something went wrong. Check the Texting page.',
};
async function withSkipNote(db: Db, leadId: string, run: Promise<StartResult>): Promise<StartResult> {
  const r = await run;
  if (!r.started && SKIP_NOTES[r.reason]) { try { await note(db, leadId, SKIP_NOTES[r.reason], { sms_skipped: r.reason }); } catch { /* the note is a courtesy */ } }
  return r;
}

interface Snapshot { clientName?: string; industry?: string; questions?: { id: string; headline?: string; options?: { value?: string; label?: string }[] }[] }
function readAnswers(answers: Record<string, unknown>, snap: Snapshot): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of snap.questions ?? []) {
    const v = answers[q.id];
    if (v === undefined || v === null || v === '') continue;
    const label = q.options?.find((o) => o.value === String(v))?.label;
    out[q.headline ?? q.id] = label ?? String(v);
  }
  return out;
}

export type StartResult = { started: true; conversationId: string } | { started: false; reason: string };

/** Called right after a real funnel lead is saved. Idempotent (one conversation per lead) and never throws. */
export const startSmsForLead = (db: Db, leadId: string, now = new Date()): Promise<StartResult> => withSkipNote(db, leadId, startSmsForLeadInner(db, leadId, now));
async function startSmsForLeadInner(db: Db, leadId: string, now: Date): Promise<StartResult> {
  try {
    const settings = await loadSettings(db);
    if (!isLive(settings)) return { started: false, reason: 'off' };
    const { data: existing } = await db.from('sms_conversations').select('id').eq('lead_id', leadId).maybeSingle();
    if (existing) return { started: false, reason: 'exists' };
    const { data: lead } = await db.from('leads').select('id,first_name,phone,state,zip').eq('id', leadId).maybeSingle();
    if (!lead) return { started: false, reason: 'no_lead' };
    const phone = normalizeUsPhone(lead.phone as string | null);
    if (!phone) return { started: false, reason: 'bad_phone' };
    const { data: optOut } = await db.from('sms_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle();
    if (optOut) return { started: false, reason: 'opted_out' };
    if (await phoneInUse(db, phone, now)) return { started: false, reason: 'phone_in_use' };
    const { data: session } = await db.from('funnel_sessions').select('funnel_id,answers,config_snapshot,qualified').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: funnel } = session?.funnel_id ? await db.from('funnels').select('contractor_id,is_demo').eq('id', session.funnel_id).maybeSingle() : { data: null };
    if (!session || !funnel || funnel.is_demo) return { started: false, reason: 'not_a_funnel_lead' };
    const snap = (session.config_snapshot ?? {}) as Snapshot;
    const house = !funnel.contractor_id || snap.clientName === 'HomeQuote Network';
    if (!house && !settings.contractor_funnels_enabled) return { started: false, reason: 'contractor_funnel_off' };
    const co = house ? null : await loadContractorTexting(db, funnel.contractor_id as string);
    if (co && !co.enabled) return { started: false, reason: 'contractor_funnel_off' };
    if ((await sentToday(db)) >= settings.daily_cap) return { started: false, reason: 'daily_cap' };

    const houseName = settings.house_sender_name?.trim().slice(0, 40) || SENDER_HOUSE;
    const sender = house ? houseName : (co?.senderName?.trim() || snap.clientName || houseName).slice(0, 80);
    const { data: convo, error } = await db.from('sms_conversations').insert({
      lead_id: leadId, contractor_id: funnel.contractor_id ?? null, sender_name: sender, phone_e164: phone,
    }).select('id,lead_id').single();
    if (error || !convo) return { started: false, reason: 'exists' };
    const zones = resolveZones({ state: lead.state as string | null, zip: lead.zip as string | null }) ?? DEFAULT_ZONES;
    // Optional pause before the first text, then wait for the texting window if that lands outside it.
    const ready = new Date(now.getTime() + Math.max(0, settings.first_text_delay_minutes ?? 0) * 60_000);
    const when = nextEligible(ready, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? ready;
    const template = (co?.openingTemplate?.trim() || settings.opening_template?.trim()) || null;
    await queue(db, convo as { id: string; lead_id: string }, openingMessage({ firstName: lead.first_name as string | null, senderName: sender, project: projectLabel(snap.industry), template }), { ai: false, sendAfter: when });
    await note(db, leadId, `Automatic text queued${when > now ? ` for ${when.toISOString()} (outside texting hours)` : ''}.`);
    return { started: true, conversationId: convo.id as string };
  } catch {
    return { started: false, reason: 'error' };
  }
}

export { metaProject } from './rules';

/**
 * Called right after a Meta Instant Form lead is created. Same queue, texting hours, opt-out, daily cap and AI agent as
 * funnel leads. Sent as the house sender, or as the Page's sender name when the Page belongs to a contractor (which then
 * also needs the same switches as a contractor funnel: contractor_funnels_enabled and the contractor's texting_enabled). Idempotent (one conversation per lead) and never throws.
 */
export const startSmsForMetaLead = (db: Db, leadId: string, now = new Date(), source: { contractorId?: string | null; senderName?: string | null } = {}): Promise<StartResult> => withSkipNote(db, leadId, startSmsForMetaLeadInner(db, leadId, now, source));
/**
 * Any other connected lead source (webhooks, other ad platforms): the same opening text, assistant and follow-ups, but
 * only when the lead arrived with text consent (consent_granted), so nothing is sent without it.
 */
export const startSmsForConsentedLead = (db: Db, leadId: string, now = new Date(), source: { contractorId?: string | null; senderName?: string | null } = {}): Promise<StartResult> =>
  withSkipNote(db, leadId, startSmsForMetaLeadInner(db, leadId, now, source, 'consented'));
async function startSmsForMetaLeadInner(db: Db, leadId: string, now: Date, source: { contractorId?: string | null; senderName?: string | null }, kind: 'meta' | 'consented' = 'meta'): Promise<StartResult> {
  try {
    const settings = await loadSettings(db);
    if (!isLive(settings)) return { started: false, reason: 'off' };
    const { data: existing } = await db.from('sms_conversations').select('id').eq('lead_id', leadId).maybeSingle();
    if (existing) return { started: false, reason: 'exists' };
    const { data: lead } = await db.from('leads').select('id,first_name,phone,state,zip,source,answers,consent_granted').eq('id', leadId).maybeSingle();
    if (!lead || (kind === 'meta' ? lead.source !== 'meta' : lead.consent_granted !== true)) return { started: false, reason: kind === 'meta' ? 'no_lead' : 'no_consent' };
    const contractorId = source.contractorId ?? null;
    if (contractorId) {
      if (!settings.contractor_funnels_enabled) return { started: false, reason: 'contractor_funnel_off' };
      const { data: co } = await db.from('contractors').select('texting_enabled').eq('id', contractorId).maybeSingle();
      if (!co?.texting_enabled) return { started: false, reason: 'contractor_funnel_off' };
    }
    const answers = (lead.answers ?? {}) as Record<string, string>;
    // Meta's Lead Ads Testing Tool fills every answer with "<test lead: dummy data ...>": never text those.
    if (Object.values(answers).some((v) => String(v).startsWith('<test lead'))) return { started: false, reason: 'test_lead' };
    const phone = normalizeUsPhone(lead.phone as string | null);
    if (!phone) return { started: false, reason: 'bad_phone' };
    const { data: optOut } = await db.from('sms_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle();
    if (optOut) return { started: false, reason: 'opted_out' };
    if (await phoneInUse(db, phone, now)) return { started: false, reason: 'phone_in_use' };
    if ((await sentToday(db)) >= settings.daily_cap) return { started: false, reason: 'daily_cap' };

    const houseName = settings.house_sender_name?.trim().slice(0, 40) || SENDER_HOUSE;
    const sender = source.senderName?.trim().slice(0, 40) || houseName;
    const { data: convo, error } = await db.from('sms_conversations').insert({
      lead_id: leadId, contractor_id: contractorId, sender_name: sender, phone_e164: phone,
    }).select('id,lead_id').single();
    if (error || !convo) return { started: false, reason: 'exists' };
    const zones = resolveZones({ state: lead.state as string | null, zip: lead.zip as string | null }) ?? DEFAULT_ZONES;
    const when = nextEligible(now, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? now;
    await queue(db, convo as { id: string; lead_id: string }, openingMessage({ firstName: lead.first_name as string | null, senderName: sender, project: metaProject(answers) }), { ai: false, sendAfter: when });
    await note(db, leadId, `Automatic text queued${when > now ? ` for ${when.toISOString()} (outside texting hours)` : ''}.`);
    return { started: true, conversationId: convo.id as string };
  } catch {
    return { started: false, reason: 'error' };
  }
}

export interface InboundInput { phone: string; body: string; guid: string; receivedAt?: string }
export type InboundResult = { handled: boolean; reason?: string; replied?: boolean };
export interface InboundDeps {
  agent?: (input: AgentInput) => Promise<AgentResult>; now?: () => Date; aiConfigured?: boolean; notify?: (alert: Alert) => Promise<void>;
  /** Open times to offer (default: the contractor's visit availability and the lead's booking calendar). */
  booking?: (c: { id: string; lead_id: string; sender_name: string; contractor_id?: string | null }, now: Date) => Promise<BookingOptions>;
}

/**
 * Marks a conversation handed to a person to book a time (not for upset / off-topic handoffs), so the reminder runner
 * can re-offer real times if it is still not booked a day later (lib/sms/reminders.ts, "re-offer times").
 */
async function markAwaitingBooking(db: Db, conversationId: string, now: Date) {
  await db.from('sms_reminders').insert({ kind: 'no_reply', ref_id: conversationId, step: AWAIT_BOOKING_STEP, anchor_at: now.toISOString(), status: 'skipped', detail: 'Handed to a person to book a time.' });
}

/** The open times as the assistant sees them. */
function forAgent(o: BookingOptions): OpenTimesForAgent {
  const brief = (t: OpenTime[]) => t.map(({ id, label }) => ({ id, label }));
  return {
    alreadyBooked: o.alreadyBooked,
    visit: o.visit ? { with: o.visit.who, times: brief(o.visit.times) } : null,
    call: o.call ? { with: o.call.who, minutes: o.call.minutes, times: brief(o.call.times) } : null,
  };
}

/** A text from a lead arrived on the Mac. Stores it, honors STOP, and (while the AI owns the conversation) queues a reply. */
export async function handleInbound(db: Db, input: InboundInput, deps: InboundDeps = {}): Promise<InboundResult> {
  const phone = normalizeUsPhone(input.phone);
  const body = input.body.replace(/\u0000/g, '').trim().slice(0, 1500);
  if (!phone || !body || !input.guid) return { handled: false, reason: 'invalid' };
  const { data: dup } = await db.from('sms_messages').select('id').eq('external_guid', input.guid).maybeSingle();
  if (dup) return { handled: true, reason: 'duplicate' };
  const { data: convo } = await db.from('sms_conversations').select('*').eq('phone_e164', phone).order('created_at', { ascending: false }).limit(1).maybeSingle();
  // Texts from numbers we never contacted are not ours to handle (and are never stored or answered).
  if (!convo) return { handled: false, reason: 'unknown_number' };
  const now = (deps.now ?? (() => new Date()))();
  // Echo guard: a text identical to one we just sent is our own message coming back (texting the Mac's own number, a
  // forwarded copy), not a reply. Answering it would loop. Short messages are exempt so a real "Sounds good" still counts.
  if (body.length >= 20) {
    const { data: recentOut } = await db.from('sms_messages').select('body').eq('conversation_id', (convo as { id: string }).id).eq('direction', 'out')
      .in('status', ['sent', 'sending', 'queued']).gte('created_at', new Date(now.getTime() - 30 * 60_000).toISOString()).order('created_at', { ascending: false }).limit(20);
    if ((recentOut ?? []).some((m: { body: string }) => normalizeBody(m.body) === normalizeBody(body))) return { handled: true, reason: 'echo' };
  }
  const c = convo as { id: string; lead_id: string | null; prospect_id?: string | null; sender_name: string; status: string; ai_turns: number; mode?: string | null; call_time_preference?: string | null; workflow_owned?: boolean; contractor_id?: string | null };
  const { data: inRow } = await db.from('sms_messages').insert({ conversation_id: c.id, lead_id: c.lead_id, ...(c.prospect_id ? { prospect_id: c.prospect_id } : {}), direction: 'in', body, status: 'received', external_guid: input.guid, sent_at: input.receivedAt ?? now.toISOString() }).select('id').single();
  await db.from('sms_conversations').update({ last_inbound_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', c.id);

  if (isOptOut(body)) {
    await db.from('sms_opt_outs').upsert({ phone_e164: phone, source: 'stop_reply' }, { onConflict: 'phone_e164' });
    await db.from('sms_messages').update({ status: 'failed', error: 'Cancelled: recipient opted out' }).eq('conversation_id', c.id).eq('status', 'queued');
    await db.from('sms_conversations').update({ status: 'opted_out', updated_at: now.toISOString() }).eq('id', c.id);
    await queue(db, c, optOutConfirmation(c.sender_name), { ai: false });
    await note(db, c.lead_id, 'Lead replied STOP. No more texts will be sent to this number.');
    return { handled: true, reason: 'opted_out', replied: true };
  }
  if (isStart(body)) {
    await db.from('sms_opt_outs').delete().eq('phone_e164', phone);
    await db.from('sms_conversations').update({ status: 'handoff', updated_at: now.toISOString() }).eq('id', c.id);
    await note(db, c.lead_id, 'Lead replied START and can be texted again. A person should follow up.');
    return { handled: true, reason: 'resubscribed' };
  }
  if (c.status === 'opted_out') return { handled: true, reason: 'opted_out' };
  // A contractor we texted about a sales meeting: never the homeowner assistant or workflows.
  if (c.prospect_id || !c.lead_id) {
    if (isHelp(body)) { await queue(db, c, helpReply(c.sender_name), { ai: false }); return { handled: true, replied: true }; }
    return handleProspectReply(db, c, body, now);
  }
  const lead = { ...c, lead_id: c.lead_id };
  // A real reply: let workflows see it (a "wait for a reply" step, or a workflow that starts on replies). Never throws.
  await emitReplyEvent(db, lead, (inRow as { id: string } | null)?.id ?? null, now);
  if (isHelp(body)) { await queue(db, c, helpReply(c.sender_name), { ai: false }); return { handled: true, replied: true }; }
  // "YES" / "R" to an appointment reminder.
  const reminderReply = await handleLeadReminderReply(db, c, body, now);
  if (reminderReply) return reminderReply;
  // A person owns this conversation now: store the message, flag it, no AI reply.
  // A workflow started this conversation and is handling replies itself (the assistant was not asked to take over).
  if (c.workflow_owned) return { handled: true, reason: 'workflow_owned' };
  // Closed by the no-reply follow-ups: they replied after all, so the assistant picks the conversation back up.
  if (c.status === 'closed' && (await closedByFollowUps(db, c.id))) {
    await db.from('sms_conversations').update({ status: 'active', updated_at: now.toISOString() }).eq('id', c.id);
    c.status = lead.status = 'active';
  }
  if (c.status !== 'active') {
    await note(db, c.lead_id, `New text from the lead: “${body.slice(0, 300)}”`, { needs_attention: true });
    return { handled: true, reason: `status_${c.status}` };
  }
  return replyWithAgent(db, lead, deps, now);
}

async function closedByFollowUps(db: Db, conversationId: string) {
  const { data } = await db.from('sms_reminders').select('id').eq('kind', 'no_reply').eq('ref_id', conversationId).eq('step', 'final').eq('status', 'queued').limit(1);
  return (data ?? []).length > 0;
}

/** Tell the workflow engine a lead replied by text (message.received). Best effort: a failure never affects texting. */
async function emitReplyEvent(db: Db, c: { id: string; lead_id: string; contractor_id?: string | null }, messageId: string | null, now: Date) {
  if (!messageId) return;
  try {
    await db.rpc('emit_workflow_event', {
      p_type: 'message.received', p_idempotency_key: `message.received|sms:${messageId}`, p_entity_type: 'message', p_entity_id: messageId,
      p_source: 'sms:bridge', p_occurred_at: now.toISOString(), p_contractor_id: c.contractor_id ?? null, p_lead_id: c.lead_id,
      p_actor_type: 'contact', p_actor_id: null,
      p_payload: { messageId, channel: 'sms', leadId: c.lead_id, conversationId: c.id, hasBody: true }, p_metadata: {},
    });
  } catch { /* the event is a courtesy to workflows */ }
}

export type WorkflowTextResult = { ok: true; queued: boolean; conversationId: string } | { ok: false; reason: string };
export const WORKFLOW_TEXT_SKIP_REASONS: Record<string, string> = {
  texting_off: 'Automatic texting is turned off.',
  contractor_texting_off: 'Texting is off for this contractor.',
  bad_phone: 'The lead has no valid US phone number.',
  opted_out: 'This number opted out of texts.',
  person_took_over: 'A person has taken over this text conversation.',
  phone_in_use: 'This number is already in a text conversation with another lead.',
  daily_cap: 'The daily text limit was reached.',
  empty: 'The message was empty.',
  already_texting: 'This lead is already in a text conversation (for example the automatic first text), and the step is set to skip in that case.',
  no_lead: 'The lead could not be found.',
};

/**
 * A workflow "send text" step: queues one text for the Mac bridge, through the same rules as the texting assistant
 * (switches, opt-outs, texting hours, daily cap, one conversation per number). Idempotent per step run.
 * `assistant` = let the texting assistant answer replies; otherwise the workflow handles replies itself.
 */
export async function queueWorkflowText(db: Db, input: { leadId: string; body: string; contractorId: string | null; stepRunId: string; assistant: boolean; onlyIfNotTexted?: boolean; now?: Date; label?: string }): Promise<WorkflowTextResult> {
  const now = input.now ?? new Date();
  try {
    const { data: already } = await db.from('sms_messages').select('id,conversation_id').eq('workflow_step_run_id', input.stepRunId).maybeSingle();
    if (already) return { ok: true, queued: false, conversationId: (already as { conversation_id: string }).conversation_id };
    const settings = await loadSettings(db);
    if (!isLive(settings)) return { ok: false, reason: 'texting_off' };
    const { data: lead } = await db.from('leads').select('id,phone,state,zip').eq('id', input.leadId).maybeSingle();
    if (!lead) return { ok: false, reason: 'no_lead' };
    const phone = normalizeUsPhone(lead.phone as string | null);
    if (!phone) return { ok: false, reason: 'bad_phone' };
    const { data: optOut } = await db.from('sms_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle();
    if (optOut) return { ok: false, reason: 'opted_out' };
    const houseName = settings.house_sender_name?.trim().slice(0, 40) || SENDER_HOUSE;
    let sender = houseName;
    if (input.contractorId) {
      const co = await loadContractorTexting(db, input.contractorId);
      if (!settings.contractor_funnels_enabled || !co.enabled) return { ok: false, reason: 'contractor_texting_off' };
      const { data: row } = await db.from('contractors').select('name').eq('id', input.contractorId).maybeSingle();
      sender = (co.senderName?.trim() || (row as { name?: string } | null)?.name || houseName).slice(0, 80);
    }
    const body = finalizeOutbound(input.body);
    if (!body) return { ok: false, reason: 'empty' };

    const { data: existing } = await db.from('sms_conversations').select('id,lead_id,status,workflow_owned').eq('lead_id', input.leadId).maybeSingle();
    let convo = existing as { id: string; lead_id: string; status: string; workflow_owned?: boolean } | null;
    if (convo) {
      if (convo.status === 'opted_out') return { ok: false, reason: 'opted_out' };
      if (input.onlyIfNotTexted) return { ok: false, reason: 'already_texting' };
      if (convo.status !== 'active') return { ok: false, reason: 'person_took_over' };
      if (input.assistant && convo.workflow_owned) await db.from('sms_conversations').update({ workflow_owned: false }).eq('id', convo.id);
    } else {
      if (await phoneInUse(db, phone, now)) return { ok: false, reason: 'phone_in_use' };
      const { data: created, error } = await db.from('sms_conversations').insert({
        lead_id: input.leadId, contractor_id: input.contractorId, sender_name: sender, phone_e164: phone, workflow_owned: !input.assistant,
      }).select('id,lead_id,status').single();
      if (error || !created) return { ok: false, reason: 'phone_in_use' };
      convo = created as { id: string; lead_id: string; status: string };
    }
    if ((await sentToday(db)) >= settings.daily_cap) return { ok: false, reason: 'daily_cap' };
    const zones = resolveZones({ state: lead.state as string | null, zip: lead.zip as string | null }) ?? DEFAULT_ZONES;
    const when = nextEligible(now, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? now;
    await queue(db, convo, body, { ai: false, sendAfter: when, workflowStepRunId: input.stepRunId });
    await note(db, input.leadId, `${input.label ?? 'Workflow text'} queued${when > now ? ` for ${when.toISOString()} (outside texting hours)` : ''}.`, { workflow: true });
    return { ok: true, queued: true, conversationId: convo.id };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Books the time the lead picked and sends the confirmation (the assistant's own line is not sent). The confirmation is
 * filed as the appointment's "booked" reminder text, so the reminder runner doesn't send a second one and YES / R replies
 * work right away; the conversation then belongs to a person, which also keeps the booking system's own confirmation
 * text from going out twice. A time taken in the meantime gets three fresh ones; any other failure goes to a person.
 */
async function bookPicked(
  db: Db,
  c: { id: string; lead_id: string; sender_name: string; ai_turns: number; contractor_id?: string | null },
  picked: OpenTime,
  options: BookingOptions,
  result: AgentResult,
  deps: InboundDeps,
  now: Date,
): Promise<InboundResult> {
  const pause = () => new Date(now.getTime() + 3000 + Math.floor(Math.random() * 4000));
  const { data: lead } = await db.from('leads').select('id,first_name,last_name,phone,email').eq('id', c.lead_id).maybeSingle();
  const l = (lead ?? { id: c.lead_id, first_name: null, last_name: null, phone: null, email: null }) as { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null };
  const visit = picked.kind === 'visit' ? options.visit : null;
  const call = picked.kind === 'call' ? options.call : null;
  const outcome = visit ? await bookVisit(db, visit, picked, c.lead_id, now) : call ? await bookCall(db, call, picked, l) : { ok: false as const, reason: 'error' as const };
  const base = { ai_turns: c.ai_turns + 1, qualification: result.qualification, summary: result.summary, updated_at: now.toISOString() };

  if (!outcome.ok && outcome.reason === 'taken') {
    const fresh = await (deps.booking ?? ((x, n) => loadBookingOptions(db, x, n)))(c, now).catch(() => NO_OPTIONS);
    const pool = picked.kind === 'visit' ? fresh.visit : fresh.call;
    const times = pool ? threeSpread(pool.times.filter((t) => t.startMs !== picked.startMs), pool.timeZone) : [];
    await queue(db, c, finalizeOutbound(takenText(times)), { ai: true, sendAfter: pause() });
    await db.from('sms_conversations').update({ ...base, status: times.length ? 'active' : 'handoff', mode: picked.kind === 'call' ? 'call' : 'text' }).eq('id', c.id);
    if (!times.length) {
      await note(db, c.lead_id, `Text conversation needs a person: the time they picked (${picked.label}) was taken and no other open times were found.`, { needs_attention: true });
      await markAwaitingBooking(db, c.id, now);
    }
    return { handled: true, replied: true, reason: 'slot_taken' };
  }
  if (!outcome.ok) {
    await queue(db, c, "Got it! Someone from the team will text you shortly to lock that in.", { ai: true, sendAfter: pause() });
    await db.from('sms_conversations').update({ ...base, status: 'handoff' }).eq('id', c.id);
    await note(db, c.lead_id, `Text conversation needs a person: they picked ${picked.label} but it could not be booked automatically. Please book it by hand.`, { needs_attention: true });
    await markAwaitingBooking(db, c.id, now);
    return { handled: true, replied: true, reason: 'booking_failed' };
  }

  const body = finalizeOutbound(visit
    ? visitBookedText({ firstName: l.first_name, label: picked.label, who: visit.who })
    : callBookedText({ firstName: l.first_name, label: picked.label, who: call!.who, minutes: call!.minutes, fromPhone: call!.fromPhone, callerFirstName: call!.callerFirstName }));
  const msgId = await queue(db, c, body, { ai: true, sendAfter: pause(), reminder: { kind: 'home_appointment', ref: outcome.appointmentId, step: 'booked' } });
  await db.from('sms_reminders').insert({ kind: 'home_appointment', ref_id: outcome.appointmentId, step: 'booked', anchor_at: outcome.startsAt, status: 'queued', message_id: msgId ?? null, detail: 'Confirmation sent by the texting assistant.' });
  await db.from('sms_conversations').update({ ...base, status: 'handoff', mode: visit ? 'text' : 'call' }).eq('id', c.id);
  await noteBooked(db, c.lead_id, picked.kind, picked.label, visit ? visit.who : call!.who);
  await (deps.notify ?? notifyAdmins)({
    title: visit ? 'A lead booked a visit' : 'A lead booked a call',
    body: `Booked by text: ${visit ? 'free estimate visit' : `${call!.minutes}-minute call`} ${picked.label}.`,
    url: `/app/leads/${c.lead_id}`,
    linkLabel: 'Open the lead',
  }).catch(() => undefined);
  return { handled: true, replied: true, reason: visit ? 'booked_visit' : 'booked_call' };
}

async function replyWithAgent(db: Db, c: { id: string; lead_id: string; sender_name: string; ai_turns: number; mode?: string | null; call_time_preference?: string | null }, deps: InboundDeps, now: Date): Promise<InboundResult> {
  const settings = await loadSettings(db);
  const handoff = async (reason: string) => {
    await db.from('sms_conversations').update({ status: 'handoff', updated_at: now.toISOString() }).eq('id', c.id);
    await note(db, c.lead_id, `Text conversation needs a person: ${reason}`, { needs_attention: true });
    return { handled: true, reason } as InboundResult;
  };
  if (!isLive(settings)) return handoff('automatic texting is turned off');
  if (c.ai_turns >= (settings.max_ai_turns ?? MAX_AI_TURNS)) return handoff('the assistant reached its message limit');
  if ((await sentToday(db)) >= settings.daily_cap) return handoff('the daily text limit was reached');
  if ((await aiRepliesToday(db)) >= (settings.max_ai_replies_per_day ?? 150)) return handoff('the daily assistant reply limit was reached');
  const aiOn = deps.aiConfigured ?? !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!aiOn && !deps.agent) return handoff('the AI assistant is not configured');

  const [{ data: msgs }, { data: lead }, { data: session }] = await Promise.all([
    db.from('sms_messages').select('direction,body,status,created_at').eq('conversation_id', c.id).order('created_at', { ascending: true }).limit(60),
    db.from('leads').select('first_name,source,answers').eq('id', c.lead_id).maybeSingle(),
    db.from('funnel_sessions').select('answers,config_snapshot,qualified').eq('lead_id', c.lead_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const snap = (session?.config_snapshot ?? {}) as Snapshot;
  const metaAnswers = !session && lead?.source === 'meta' ? ((lead.answers ?? {}) as Record<string, string>) : null;
  const history: SmsTurn[] = ((msgs ?? []) as { direction: string; body: string; status: string }[])
    .filter((m) => m.direction === 'in' || m.status === 'sent' || m.status === 'queued' || m.status === 'sending')
    .map((m) => ({ role: m.direction === 'in' ? 'lead' : 'us', text: m.body }));
  // Instructions for the whole assistant, plus any specific to the contractor this conversation is for.
  const { data: convoRow } = await db.from('sms_conversations').select('contractor_id').eq('id', c.id).maybeSingle();
  const coExtra = (convoRow as { contractor_id?: string | null } | null)?.contractor_id
    ? (await loadContractorTexting(db, (convoRow as { contractor_id: string }).contractor_id)).extraInstructions
    : null;
  const extraInstructions = [settings.bot_extra_instructions?.trim(), coExtra?.trim() ? `For ${c.sender_name} specifically: ${coExtra.trim()}` : null].filter(Boolean).join('\n\n') || null;
  // Real open times, so the assistant can offer a few and book one (never fails the reply).
  const target = { ...c, contractor_id: (convoRow as { contractor_id?: string | null } | null)?.contractor_id ?? null };
  const options = await (deps.booking ?? ((x, n) => loadBookingOptions(db, x, n)))(target, now).catch(() => NO_OPTIONS);
  let result: AgentResult;
  try {
    result = await (deps.agent ?? runSmsAgent)({
      senderName: c.sender_name, firstName: (lead?.first_name as string | null) ?? null, project: metaAnswers ? metaProject(metaAnswers) : projectLabel(snap.industry),
      extraInstructions, openTimes: forAgent(options),
      known: metaAnswers ?? readAnswers((session?.answers ?? {}) as Record<string, unknown>, snap), formQualified: (session?.qualified as boolean | null) ?? null, history,
    });
  } catch {
    return handoff('the assistant could not reply');
  }
  // They accepted one of the offered times: book it and confirm with the exact time.
  const picked = result.book_slot && !result.close ? [...(options.visit?.times ?? []), ...(options.call?.times ?? [])].find((t) => t.id === result.book_slot) : undefined;
  if (picked) return bookPicked(db, target, picked, options, result, deps, now);
  // They picked a day for the visit: that is the goal, so the conversation goes to a person to confirm the time.
  const visitRequest = result.appointment_time && !result.close ? result.appointment_time : null;
  if (visitRequest) result = { ...result, handoff: true };
  const message = finalizeOutbound(result.message);
  // Small natural pause so a reply never lands the instant the lead's text does.
  await queue(db, c, message, { ai: true, sendAfter: new Date(now.getTime() + 4000 + Math.floor(Math.random() * 8000)) });
  const done = result.handoff || result.close;
  await db.from('sms_conversations').update({
    ai_turns: c.ai_turns + 1, mode: result.mode ?? undefined, qualification: result.qualification, call_time_preference: result.call_time ?? undefined,
    summary: result.summary, status: result.close ? 'closed' : result.handoff ? 'handoff' : 'active', updated_at: now.toISOString(),
  }).eq('id', c.id);
  // The lead asked for a visit time: tell the owner so they can confirm it (this replaces the generic call alert).
  if (visitRequest) {
    await (deps.notify ?? notifyAdmins)({
      title: 'A lead wants a visit',
      body: `A lead asked for a free estimate visit: ${visitRequest.slice(0, 80)}. Tap to confirm the time.`,
      url: `/app/leads/${c.lead_id}`,
      linkLabel: 'Confirm the visit',
    }).catch(() => undefined);
  }
  // The lead wants a call: tell the owner right away (push in the HomeQuote app + email), and again if they then give a
  // time, so they know who to call and when. The bot's own behaviour is unchanged.
  if (result.mode === 'call' && !result.close && !visitRequest) {
    const first = c.mode !== 'call';
    const learnedTime = !!result.call_time && !c.call_time_preference;
    if (first || learnedTime) {
      const when = result.call_time ? ` Best time: ${result.call_time.slice(0, 80)}.` : '';
      await (deps.notify ?? notifyAdmins)({
        title: first ? 'A lead wants a call' : 'Lead gave a call time',
        body: `A lead asked for a call.${when} Tap to see their details.`,
        url: `/app/leads/${c.lead_id}`,
        linkLabel: 'Open the lead',
      }).catch(() => undefined);
    }
  }
  // Handed off to get a time booked (not because they're upset or off-topic): re-offer times later if nobody books it.
  if (result.handoff && !result.close && result.qualification !== 'unqualified' && (visitRequest || result.mode === 'call')) await markAwaitingBooking(db, c.id, now);
  if (done) {
    const label = result.close ? 'closed' : visitRequest ? 'wants a visit' : result.mode === 'call' ? 'wants a call' : 'ready for a person';
    await note(db, c.lead_id, `Text conversation ${label} (${result.qualification}). ${result.summary}${visitRequest ? ` Requested visit time: ${visitRequest} (not confirmed yet).` : ''}${result.call_time ? ` Best time: ${result.call_time}.` : ''}${result.handoff_reason ? ` Reason: ${result.handoff_reason}` : ''}`, { needs_attention: !result.close });
  }
  return { handled: true, replied: true };
}

export interface ClaimedMessage { id: string; phone_e164: string; body: string }
export async function claimOutbound(db: Db, limit = 5): Promise<ClaimedMessage[]> {
  const settings = await loadSettings(db);
  await db.from('sms_settings').update({ bridge_last_seen_at: new Date().toISOString() }).eq('id', true);
  if (settings.stopped_at) return [];
  const { data, error } = await db.rpc('claim_sms_outbound', { p_limit: limit });
  if (error) throw new Error('claim failed');
  return (data ?? []) as ClaimedMessage[];
}

export async function ackOutbound(db: Db, id: string, ok: boolean, error?: string) {
  const now = new Date().toISOString();
  await db.from('sms_messages').update(ok ? { status: 'sent', sent_at: now, error: null } : { status: 'failed', error: (error ?? 'Send failed').slice(0, 300) }).eq('id', id).eq('status', 'sending');
}
