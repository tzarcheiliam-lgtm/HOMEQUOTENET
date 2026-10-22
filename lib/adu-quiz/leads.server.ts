import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { screenSubmission } from '@/lib/applications/spam';
import { buildFbc, sendMetaEvent } from '@/lib/meta/capi';
import { parseUsPhone } from '@/lib/leads/normalize';
import { qualificationRules, resolvedPixelId, resolvedWebhookUrl, safeUrl, BRAND_NAME } from './config';
import { consentText, evaluate, type Answers, type Evaluation } from './quiz';
import { buildWebhookPayload, type StoredLead, type Submission } from './submission';

/**
 * Lead pipeline for /adu-quiz.
 *
 *  1. Store the lead durably (adu_quiz_leads).
 *  2. POST it to the lead webhook, retrying a few times inline.
 *  3. A webhook that still fails leaves the row 'pending'; retryPendingAduQuizLeads()
 *     (called by /api/workflows/tick every 5 minutes) keeps retrying with backoff.
 *
 * The visitor is only told "saved" once the lead is in the database OR the
 * webhook accepted it. If both fail, the API returns 503 and the browser keeps
 * the answers so the visitor can retry: nothing is silently dropped.
 *
 * Logs carry submission ids and error codes only, never names, phones or emails.
 */

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const INLINE_ATTEMPTS = 3;
const MAX_BACKOFF_MS = 6 * 3600 * 1000;

export type SubmitResult =
  | { ok: true; qualified: boolean; token: string | null; duplicate?: boolean }
  | { ok: false; status: 503; error: string };

export function webhookUrlOrNull(raw: string = resolvedWebhookUrl()): string | null {
  if (!raw) return null;
  const url = safeUrl(raw);
  if (!url) console.error('[adu-quiz] LEAD_WEBHOOK_URL is set but is not a valid https URL; leads are stored but not forwarded.');
  return url || null;
}

type DeliveryResult = { ok: true } | { ok: false; error: string; retryable: boolean };

async function postOnce(url: string, payload: unknown, submissionId: string): Promise<DeliveryResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submissionId },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `http_${res.status}`, retryable: res.status >= 500 || res.status === 429 || res.status === 408 };
  } catch (error) {
    return { ok: false, error: `network_${error instanceof Error ? error.name : 'error'}`, retryable: true };
  }
}

/** Up to INLINE_ATTEMPTS tries with a short backoff. */
export async function deliverWebhook(url: string, payload: unknown, submissionId: string): Promise<DeliveryResult> {
  let last: DeliveryResult = { ok: false, error: 'not_attempted', retryable: true };
  for (let attempt = 0; attempt < INLINE_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 3 ** (attempt - 1)));
    last = await postOnce(url, payload, submissionId);
    if (last.ok || !last.retryable) return last;
  }
  return last;
}

function nextAttemptAt(attempts: number): string {
  return new Date(Date.now() + Math.min(2 ** attempts * 60_000, MAX_BACKOFF_MS)).toISOString();
}

type Db = ReturnType<typeof createAdminClient>;

async function markDelivery(db: Db, submissionId: string, attemptsBefore: number, result: DeliveryResult) {
  const attempts = attemptsBefore + 1;
  const patch = result.ok
    ? { webhook_status: 'sent', webhook_attempts: attempts, webhook_last_error: null, webhook_sent_at: new Date().toISOString() }
    : { webhook_attempts: attempts, webhook_last_error: result.error, webhook_next_attempt_at: nextAttemptAt(attempts) };
  const { error } = await db.from('adu_quiz_leads').update(patch).eq('submission_id', submissionId);
  if (error) console.error(`[adu-quiz] could not record webhook result for ${submissionId}: ${error.code ?? 'unknown'}`);
}

function stored(row: Record<string, unknown>): StoredLead {
  return {
    submission_id: row.submission_id as string,
    created_at: row.created_at as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    answers: row.answers as Answers,
    evaluation: evaluate(row.answers as Answers, qualificationRules()),
    consent_text: row.consent_text as string,
    consent_at: row.consent_at as string,
    consent_page_url: row.consent_page_url as string,
    tracking: (row.tracking ?? {}) as Record<string, string>,
  };
}

export async function submitAduQuizLead(input: Submission): Promise<SubmitResult> {
  // Silent spam handling: look like a normal non-qualified submission, store nothing.
  const screen = screenSubmission({ honeypot: input.honeypot, startedAt: input.startedAt });
  if (screen.spam) {
    console.warn(`[adu-quiz] discarded: ${screen.reason}`);
    return { ok: true, qualified: false, token: null };
  }

  const answers = input.answers as Answers;
  const evaluation: Evaluation = evaluate(answers, qualificationRules());
  if (input.consentText !== consentText(BRAND_NAME)) console.warn('[adu-quiz] consent text differs from the current config text (stale page?). Storing what the visitor saw.');

  const phone = parseUsPhone(input.contact.phone);
  const e164 = phone.ok ? phone.e164 : input.contact.phone;
  const consentAt = new Date().toISOString();
  const token = randomBytes(24).toString('hex');
  const tracking = { ...input.tracking, submitted_at: consentAt };

  const lead: StoredLead = {
    submission_id: input.submissionId,
    created_at: consentAt,
    first_name: input.contact.firstName,
    last_name: input.contact.lastName,
    email: input.contact.email.toLowerCase(),
    phone: e164,
    answers,
    evaluation,
    consent_text: input.consentText,
    consent_at: consentAt,
    consent_page_url: input.pageUrl,
    tracking,
  };

  let db: Db | null = null;
  let stored_ = false;
  try {
    db = createAdminClient();
    const { error } = await db.from('adu_quiz_leads').insert({
      submission_id: lead.submission_id,
      access_token_hash: sha256(token),
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      answers: lead.answers,
      qualified: evaluation.qualified,
      dq_reason: evaluation.dq_reason,
      dq_reasons: evaluation.dq_reasons,
      title_unverified: evaluation.title_unverified,
      credit_unverified: evaluation.credit_unverified,
      bankruptcy_unverified: evaluation.bankruptcy_unverified,
      consent_text: lead.consent_text,
      consent_at: lead.consent_at,
      consent_page_url: lead.consent_page_url,
      measurement_allowed: input.measurement,
      tracking,
    });
    if (error?.code === '23505') {
      // A retry of a submission we already stored: answer from the stored row, never insert twice.
      const { data: existing } = await db.from('adu_quiz_leads').select('qualified, booked_at').eq('submission_id', lead.submission_id).maybeSingle();
      if (existing) {
        if (!existing.booked_at) await db.from('adu_quiz_leads').update({ access_token_hash: sha256(token) }).eq('submission_id', lead.submission_id);
        return { ok: true, qualified: !!existing.qualified, token: existing.booked_at ? null : token, duplicate: true };
      }
    } else if (error) {
      console.error(`[adu-quiz] database insert failed for ${lead.submission_id}: ${error.code ?? 'unknown'}`);
    } else {
      stored_ = true;
    }
  } catch (error) {
    console.error(`[adu-quiz] database unavailable for ${lead.submission_id}: ${error instanceof Error ? error.name : 'unknown'}`);
  }

  const url = webhookUrlOrNull();
  let delivered = false;
  if (url) {
    const result = await deliverWebhook(url, buildWebhookPayload(lead), lead.submission_id);
    delivered = result.ok;
    if (!result.ok) console.error(`[adu-quiz] webhook failed for ${lead.submission_id}: ${result.error}${stored_ ? ' (stored, will retry)' : ''}`);
    if (stored_ && db) await markDelivery(db, lead.submission_id, 0, result);
  } else if (stored_ && db) {
    await db.from('adu_quiz_leads').update({ webhook_last_error: 'webhook_not_configured' }).eq('submission_id', lead.submission_id);
  }

  if (!stored_ && !delivered) {
    return { ok: false, status: 503, error: 'We could not save your answers just now. Nothing was lost on your side. Please try again in a moment.' };
  }
  return { ok: true, qualified: evaluation.qualified, token };
}

/** Meta Conversions API events for this lead. Fire-and-forget; honours the visitor's measurement choice. */
export function aduQuizServerEvents(input: Submission, evaluation: Evaluation, request: { ip?: string; userAgent?: string }) {
  const pixelId = resolvedPixelId();
  if (!pixelId || !input.measurement) return [];
  const t = input.tracking;
  const user = {
    email: input.contact.email, phone: input.contact.phone,
    firstName: input.contact.firstName, lastName: input.contact.lastName,
    zip: (input.answers as Answers).zip,
    clientIpAddress: request.ip, clientUserAgent: request.userAgent,
    fbp: t.fbp, fbc: t.fbc ?? buildFbc(t.fbclid, Date.now()),
  };
  const base = { pixelId, eventSourceUrl: input.pageUrl, user };
  const events = [sendMetaEvent({ ...base, eventName: 'Lead', eventId: `${input.submissionId}:Lead` })];
  if (evaluation.qualified) events.push(sendMetaEvent({ ...base, eventName: 'QualifiedLead', eventId: `${input.submissionId}:QualifiedLead` }));
  return events;
}

/** Called by the 5-minute tick. Retries leads whose webhook has not accepted them yet. */
export async function retryPendingAduQuizLeads(limit = 8): Promise<{ retried: number; sent: number; pending: number; configured: boolean }> {
  const url = webhookUrlOrNull();
  const db = createAdminClient();
  const { data, error } = await db.from('adu_quiz_leads').select('*').eq('webhook_status', 'pending')
    .lte('webhook_next_attempt_at', new Date().toISOString()).order('created_at').limit(limit);
  if (error) {
    // Table not created yet (migration 0054 not applied) is expected before launch; anything else is worth a log line.
    if (error.code !== '42P01') console.error(`[adu-quiz] retry query failed: ${error.code ?? 'unknown'}`);
    return { retried: 0, sent: 0, pending: 0, configured: !!url };
  }
  const rows = data ?? [];
  if (!url) {
    if (rows.length) console.error(`[adu-quiz] ${rows.length} lead(s) are waiting for a webhook but LEAD_WEBHOOK_URL is not configured.`);
    return { retried: 0, sent: 0, pending: rows.length, configured: false };
  }
  let sent = 0;
  for (const row of rows) {
    const result = await postOnce(url, buildWebhookPayload(stored(row)), row.submission_id as string);
    await markDelivery(db, row.submission_id as string, Number(row.webhook_attempts ?? 0), result);
    if (result.ok) sent++; else console.error(`[adu-quiz] retry failed for ${row.submission_id}: ${result.error}`);
  }
  return { retried: rows.length, sent, pending: rows.length - sent, configured: true };
}
