import 'server-only';
import type { Attribution, FunnelConfig } from './schema';
import type { GhlConfig } from './ghl-config';

export { ghlConfigSchema, type GhlConfig } from './ghl-config';

/**
 * Direct GoHighLevel (LeadConnector API v2) delivery for funnel submissions.
 * Credentials never leave the server: the Private Integration token comes from
 * a server-only env var named in the integration config (or the admin-only
 * integrations.secret column). Every step is idempotent so the durable
 * delivery queue can safely retry a partially completed delivery.
 */
const API = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';


export type GhlSubmission = {
  sessionId: string;
  leadId: string | null;
  contact: { firstName: string; lastName: string; email: string; phone: string };
  answers: Record<string, string>;
  attribution: Attribution;
  qualified: boolean | null;
  config: FunnelConfig;
};
export type GhlResult = { status: 'sent'; contactId: string; opportunityId: string } | { status: 'skipped' };

/** Failure with only a step name and HTTP status: never provider bodies or PII. */
export class GhlError extends Error {
  constructor(readonly step: string, readonly httpStatus?: number) {
    super(`GHL ${step} failed${httpStatus ? ` (HTTP ${httpStatus})` : ''}${httpStatus === 401 || httpStatus === 403 ? '. Check the Private Integration token and its scopes' : ''}`);
  }
}

export function ghlToken(config: GhlConfig, secret: string | null): string {
  const token = config.tokenEnv ? process.env[config.tokenEnv] : secret;
  if (!token) throw new GhlError(config.tokenEnv ? `token (${config.tokenEnv} is not set)` : 'token (missing)');
  return token;
}

export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function label(config: FunnelConfig, question: string, value: string) {
  return config.questions.find(q => q.id === question)?.options.find(o => o.value === value)?.label ?? value;
}

export function customFieldValues(ghl: GhlConfig, s: GhlSubmission) {
  return ghl.customFields.flatMap(field => {
    const [source, key] = field.from.split('.');
    const raw = source === 'qualified' ? (s.qualified ? 'yes' : 'no') : source === 'answers' ? s.answers[key] : s.attribution[key];
    if (!raw) return [];
    const value = field.map[raw] ?? (source === 'answers' ? label(s.config, key, raw) : raw);
    return [{ id: field.id, field_value: field.multi ? [value] : value }];
  });
}

/** Readable summary for a contact note: every answer and attribution value. */
export function submissionNote(s: GhlSubmission) {
  const lines = [`Website estimate request (${s.config.industry})`, `Qualified: ${s.qualified ? 'yes' : 'needs review'}`, ''];
  for (const q of s.config.questions) if (s.answers[q.id]) lines.push(`${q.headline} ${label(s.config, q.id, s.answers[q.id])}`);
  const attribution = Object.entries(s.attribution).filter(([k]) => k !== 'landing_page_url' && k !== 'referrer');
  if (attribution.length) lines.push('', ...attribution.map(([k, v]) => `${k}: ${v}`));
  if (s.attribution.landing_page_url) lines.push(`landing page: ${s.attribution.landing_page_url}`);
  lines.push('', `HomeQuote lead ID: ${s.leadId ?? 'n/a'} · session ${s.sessionId}`);
  return lines.join('\n');
}

export async function deliverToGhl(ghl: GhlConfig, token: string, s: GhlSubmission, fetcher: typeof fetch = fetch): Promise<GhlResult> {
  if (ghl.onlyQualified && s.qualified !== true) return { status: 'skipped' };
  async function call(step: string, method: string, path: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetcher(`${API}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${token}`, Version: VERSION, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined });
    } catch { throw new GhlError(step); }
    if (!res.ok) throw new GhlError(step, res.status);
    return res.json().catch(() => ({}));
  }

  // 1. Upsert: GHL matches on the location's unique identifiers (email/phone),
  //    so a repeat submitter updates their existing contact instead of duplicating.
  const zipQuestion = s.config.questions.find(q => q.type === 'zip')?.id;
  const upsert = await call('contact upsert', 'POST', '/contacts/upsert', {
    locationId: ghl.locationId, firstName: s.contact.firstName, lastName: s.contact.lastName,
    email: s.contact.email.toLowerCase(), phone: toE164(s.contact.phone),
    postalCode: zipQuestion ? s.answers[zipQuestion] : undefined, source: ghl.source,
    customFields: customFieldValues(ghl, s),
  });
  const contactId: string | undefined = upsert?.contact?.id;
  if (!contactId) throw new GhlError('contact upsert (no contact ID returned)');

  // 2. Tags are added (not replaced) so existing tags survive; this is what
  //    fires tag-triggered GHL workflows.
  if (ghl.tags.length) await call('add tags', 'POST', `/contacts/${contactId}/tags`, { tags: ghl.tags });

  // 3. One opportunity per contact in this pipeline: keep an open/won one where it
  //    is, reopen a lost/abandoned one into the configured stage, else create.
  const query = new URLSearchParams({ location_id: ghl.locationId, pipeline_id: ghl.pipelineId, contact_id: contactId });
  const found = await call('opportunity search', 'GET', `/opportunities/search?${query}`);
  const existing = ((found?.opportunities ?? []) as { id: string; status: string; pipelineId?: string; contactId?: string; contact?: { id?: string } }[])
    .find(o => (o.pipelineId ?? ghl.pipelineId) === ghl.pipelineId && (o.contactId ?? o.contact?.id ?? contactId) === contactId);
  let opportunityId = existing?.id;
  if (existing && (existing.status === 'lost' || existing.status === 'abandoned')) {
    await call('opportunity reopen', 'PUT', `/opportunities/${existing.id}`, { status: 'open', pipelineStageId: ghl.pipelineStageId });
  } else if (!existing) {
    const created = await call('opportunity create', 'POST', '/opportunities/', {
      locationId: ghl.locationId, pipelineId: ghl.pipelineId, pipelineStageId: ghl.pipelineStageId, contactId, status: 'open',
      name: `${s.contact.firstName} ${s.contact.lastName} – ${s.config.industry}`.slice(0, 200), source: ghl.source,
    });
    opportunityId = created?.opportunity?.id ?? created?.id;
    if (!opportunityId) throw new GhlError('opportunity create (no opportunity ID returned)');
  }

  // 4. Full answers + attribution as a note, including values with no custom field.
  await call('add note', 'POST', `/contacts/${contactId}/notes`, { body: submissionNote(s) });
  return { status: 'sent', contactId, opportunityId: opportunityId! };
}
