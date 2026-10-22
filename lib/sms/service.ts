import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeUsPhone } from '@/lib/ai-calling/phone';
import { nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { runSmsAgent, type AgentInput, type AgentResult, type SmsTurn } from './agent';
import { callTeamAvailable, DEFAULT_ZONES, MAX_AI_TURNS } from './config';
import { callReply, finalizeOutbound, helpReply, isHelp, isOptOut, isStart, openingMessage, optOutConfirmation, projectLabel, SENDER_HOUSE } from './rules';

type Db = SupabaseClient;
export interface SmsSettings {
  enabled: boolean; contractor_funnels_enabled: boolean; window_start_hour: number; window_end_hour: number; daily_cap: number; stopped_at: string | null;
}
export const DEFAULT_SETTINGS: SmsSettings = { enabled: false, contractor_funnels_enabled: false, window_start_hour: 8, window_end_hour: 21, daily_cap: 200, stopped_at: null };

export async function loadSettings(db: Db): Promise<SmsSettings> {
  const { data } = await db.from('sms_settings').select('enabled,contractor_funnels_enabled,window_start_hour,window_end_hour,daily_cap,stopped_at').eq('id', true).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data as Partial<SmsSettings> | null) };
}
const isLive = (s: SmsSettings) => s.enabled && !s.stopped_at;

async function sentToday(db: Db): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').gte('created_at', since);
  return count ?? 0;
}
async function queue(db: Db, c: { id: string; lead_id: string }, body: string, opts: { ai: boolean; sendAfter?: Date }) {
  const { data } = await db.from('sms_messages').insert({
    conversation_id: c.id, lead_id: c.lead_id, direction: 'out', body, status: 'queued', ai: opts.ai, send_after: (opts.sendAfter ?? new Date()).toISOString(),
  }).select('id').single();
  await db.from('sms_conversations').update({ last_outbound_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', c.id);
  return data?.id as string | undefined;
}
async function note(db: Db, leadId: string, body: string, metadata: Record<string, unknown> = {}) {
  await db.from('lead_activities').insert({ lead_id: leadId, type: 'system', body, metadata: { sms: true, ...metadata } });
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
export async function startSmsForLead(db: Db, leadId: string, now = new Date()): Promise<StartResult> {
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
    const { data: session } = await db.from('funnel_sessions').select('funnel_id,answers,config_snapshot,qualified').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: funnel } = session?.funnel_id ? await db.from('funnels').select('contractor_id,is_demo').eq('id', session.funnel_id).maybeSingle() : { data: null };
    if (!session || !funnel || funnel.is_demo) return { started: false, reason: 'not_a_funnel_lead' };
    const snap = (session.config_snapshot ?? {}) as Snapshot;
    const house = !funnel.contractor_id || snap.clientName === 'HomeQuote Network';
    if (!house && !settings.contractor_funnels_enabled) return { started: false, reason: 'contractor_funnel_off' };
    if ((await sentToday(db)) >= settings.daily_cap) return { started: false, reason: 'daily_cap' };

    const sender = house ? SENDER_HOUSE : (snap.clientName ?? SENDER_HOUSE).slice(0, 80);
    const { data: convo, error } = await db.from('sms_conversations').insert({
      lead_id: leadId, contractor_id: funnel.contractor_id ?? null, sender_name: sender, phone_e164: phone,
    }).select('id,lead_id').single();
    if (error || !convo) return { started: false, reason: 'exists' };
    const zones = resolveZones({ state: lead.state as string | null, zip: lead.zip as string | null }) ?? DEFAULT_ZONES;
    const when = nextEligible(now, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? now;
    await queue(db, convo as { id: string; lead_id: string }, openingMessage({ firstName: lead.first_name as string | null, senderName: sender, project: projectLabel(snap.industry) }), { ai: false, sendAfter: when });
    await note(db, leadId, `Automatic text queued${when > now ? ` for ${when.toISOString()} (outside texting hours)` : ''}.`);
    return { started: true, conversationId: convo.id as string };
  } catch {
    return { started: false, reason: 'error' };
  }
}

export interface InboundInput { phone: string; body: string; guid: string; receivedAt?: string }
export type InboundResult = { handled: boolean; reason?: string; replied?: boolean };
export interface InboundDeps { agent?: (input: AgentInput) => Promise<AgentResult>; now?: () => Date; aiConfigured?: boolean }

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
  const c = convo as { id: string; lead_id: string; sender_name: string; status: string; ai_turns: number };
  await db.from('sms_messages').insert({ conversation_id: c.id, lead_id: c.lead_id, direction: 'in', body, status: 'received', external_guid: input.guid, sent_at: input.receivedAt ?? now.toISOString() });
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
  if (isHelp(body)) { await queue(db, c, helpReply(c.sender_name), { ai: false }); return { handled: true, replied: true }; }
  // A person owns this conversation now: store the message, flag it, no AI reply.
  if (c.status !== 'active') {
    await note(db, c.lead_id, `New text from the lead: “${body.slice(0, 300)}”`, { needs_attention: true });
    return { handled: true, reason: `status_${c.status}` };
  }
  return replyWithAgent(db, c, deps, now);
}

async function replyWithAgent(db: Db, c: { id: string; lead_id: string; sender_name: string; ai_turns: number }, deps: InboundDeps, now: Date): Promise<InboundResult> {
  const settings = await loadSettings(db);
  const handoff = async (reason: string) => {
    await db.from('sms_conversations').update({ status: 'handoff', updated_at: now.toISOString() }).eq('id', c.id);
    await note(db, c.lead_id, `Text conversation needs a person: ${reason}`, { needs_attention: true });
    return { handled: true, reason } as InboundResult;
  };
  if (!isLive(settings)) return handoff('automatic texting is turned off');
  if (c.ai_turns >= MAX_AI_TURNS) return handoff('the assistant reached its message limit');
  if ((await sentToday(db)) >= settings.daily_cap) return handoff('the daily text limit was reached');
  const aiOn = deps.aiConfigured ?? !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!aiOn && !deps.agent) return handoff('the AI assistant is not configured');

  const [{ data: msgs }, { data: lead }, { data: session }] = await Promise.all([
    db.from('sms_messages').select('direction,body,status,created_at').eq('conversation_id', c.id).order('created_at', { ascending: true }).limit(60),
    db.from('leads').select('first_name').eq('id', c.lead_id).maybeSingle(),
    db.from('funnel_sessions').select('answers,config_snapshot,qualified').eq('lead_id', c.lead_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const snap = (session?.config_snapshot ?? {}) as Snapshot;
  const history: SmsTurn[] = ((msgs ?? []) as { direction: string; body: string; status: string }[])
    .filter((m) => m.direction === 'in' || m.status === 'sent' || m.status === 'queued' || m.status === 'sending')
    .map((m) => ({ role: m.direction === 'in' ? 'lead' : 'us', text: m.body }));
  let result: AgentResult;
  try {
    result = await (deps.agent ?? runSmsAgent)({
      senderName: c.sender_name, firstName: (lead?.first_name as string | null) ?? null, project: projectLabel(snap.industry),
      known: readAnswers((session?.answers ?? {}) as Record<string, unknown>, snap), formQualified: (session?.qualified as boolean | null) ?? null, history,
    });
  } catch {
    return handoff('the assistant could not reply');
  }
  // They chose a call: send the fixed confirmation and hand the lead to a person. No call time to ask for. If the
  // lead named their own time, keep the assistant's one-line confirmation of it instead.
  if (result.mode === 'call') {
    result = {
      ...result,
      message: result.call_time ? result.message : callReply(callTeamAvailable()),
      handoff: true,
      close: false,
      handoff_reason: result.handoff_reason ?? 'asked for a call',
    };
  }
  const message = finalizeOutbound(result.message);
  // Small natural pause so a reply never lands the instant the lead's text does.
  await queue(db, c, message, { ai: true, sendAfter: new Date(now.getTime() + 4000 + Math.floor(Math.random() * 8000)) });
  const done = result.handoff || result.close;
  await db.from('sms_conversations').update({
    ai_turns: c.ai_turns + 1, mode: result.mode ?? undefined, qualification: result.qualification, call_time_preference: result.call_time ?? undefined,
    summary: result.summary, status: result.close ? 'closed' : result.handoff ? 'handoff' : 'active', updated_at: now.toISOString(),
  }).eq('id', c.id);
  if (done) {
    const label = result.close ? 'closed' : result.mode === 'call' ? 'wants a call' : 'ready for a person';
    await note(db, c.lead_id, `Text conversation ${label} (${result.qualification}). ${result.summary}${result.call_time ? ` Best time: ${result.call_time}.` : ''}${result.handoff_reason ? ` Reason: ${result.handoff_reason}` : ''}`, { needs_attention: !result.close });
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
