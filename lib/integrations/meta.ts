import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Connector, NormalizedLead } from './types';

/**
 * Meta (Facebook + Instagram) Lead Ads connector.
 *
 * Real webhook delivery only contains IDs (leadgen_id, form_id, page_id, ad_id);
 * the answers are fetched from the Graph API with a token that can read the Page's
 * leads. `normalize` also accepts a payload that already carries `field_data`
 * (what the admin simulator and a Graph fetch both produce).
 */

// Standard Instant Form field keys that map onto first-class lead columns.
const STANDARD_KEYS = new Set([
  'full_name', 'name', 'first_name', 'last_name', 'email', 'work_email',
  'phone_number', 'phone', 'mobile_number', 'street_address', 'address',
  'city', 'state', 'province', 'zip_code', 'post_code', 'postal_code', 'zip',
  'consent', 'tcpa_consent', 'consent_to_contact',
]);

type MetaFieldDatum = { name?: unknown; values?: unknown; value?: unknown };
/** A leadgen webhook value, optionally merged with the Graph lead (all keys optional). */
export type MetaLeadValue = Record<string, unknown> & {
  field_data?: unknown;
  fieldData?: unknown;
};
type MetaWebhookBody = {
  entry?: { id?: unknown; changes?: { field?: string; value?: Record<string, unknown> }[] }[];
  value?: Record<string, unknown>;
};

const text = (v: unknown): string | null => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);

type Fields = { values: Record<string, string>; labels: Record<string, string> };

// Map Meta's field_data array into a flat object keyed by lower-cased field name.
// Multi-select answers arrive as several values and are joined.
function fieldsFromMeta(value: MetaLeadValue): Fields {
  const values: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const fd = value?.field_data ?? value?.fieldData ?? [];
  for (const f of (Array.isArray(fd) ? fd : []) as MetaFieldDatum[]) {
    const rawName = String(f?.name ?? '').trim();
    const key = rawName.toLowerCase();
    if (!key) continue;
    const raw = Array.isArray(f.values) ? f.values.filter((v) => v != null && v !== '').join(', ') : f.value;
    values[key] = String(raw ?? '').trim();
    labels[key] = rawName;
  }
  return { values, labels };
}

const pick = (f: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) {
    if (f[k] != null && f[k] !== '') return f[k];
  }
  return null;
};

// Custom questions are named by whoever builds the form, so match by keyword.
const TIMELINE_RE = /timeline|timeframe|time_frame|when|how_soon|start/;
const BUDGET_RE = /budget|price|spend/;
const PROJECT_RE = /pool|project|service|type_of|looking_for|interested|describe|details/;

function mapCustomAnswers(f: Fields) {
  const answers: Record<string, string> = {};
  let timeline: string | null = null;
  let budget: string | null = null;
  const project: string[] = [];
  for (const [key, val] of Object.entries(f.values)) {
    if (!val || STANDARD_KEYS.has(key)) continue;
    answers[f.labels[key] ?? key] = val;
    if (!timeline && TIMELINE_RE.test(key)) timeline = val;
    else if (!budget && BUDGET_RE.test(key)) budget = val;
    else if (PROJECT_RE.test(key)) project.push(val);
  }
  return {
    answers: Object.keys(answers).length ? answers : null,
    timeline,
    budget_range: budget,
    project_description: project.length ? project.join(' · ') : null,
  };
}

// Graph returns 'fb' / 'ig' (and sometimes 'an', 'msg'); the CRM stores full names.
function platformName(raw: unknown): string {
  const p = String(raw ?? '').toLowerCase();
  if (p === 'ig' || p === 'instagram') return 'instagram';
  return 'facebook';
}

export function normalizeMetaValue(value: MetaLeadValue): NormalizedLead {
  const fields = fieldsFromMeta(value);
  const f = fields.values;

  const fullName =
    pick(f, 'full_name', 'name') ??
    ([pick(f, 'first_name'), pick(f, 'last_name')].filter(Boolean).join(' ') ||
      null);

  return {
    full_name: fullName,
    phone: pick(f, 'phone_number', 'phone', 'mobile_number'),
    email: pick(f, 'email', 'work_email'),
    address: pick(f, 'street_address', 'address'),
    city: pick(f, 'city'),
    state: pick(f, 'state', 'province'),
    zip: pick(f, 'zip_code', 'post_code', 'postal_code', 'zip'),
    ...mapCustomAnswers(fields),
    source: 'meta',
    platform: platformName(value?.platform),
    campaign: text(value?.campaign_name),
    campaign_id: text(value?.campaign_id),
    ad_set: text(value?.adset_name),
    ad_set_id: text(value?.adset_id),
    ad: text(value?.ad_name),
    ad_id: text(value?.ad_id),
    form: text(value?.form_name),
    form_id: text(value?.form_id),
    page_id: text(value?.page_id),
    external_lead_id: text(value?.leadgen_id) ?? text(value?.lead_id) ?? text(value?.id),
    // Consent: Meta lead forms carry a consent checkbox in some setups. Capture
    // it if present; otherwise leave false for a human to confirm.
    consent_granted: /^(true|yes|1|on|i agree|agree|consent)$/i.test(
      (pick(f, 'consent', 'tcpa_consent', 'consent_to_contact') ?? '').trim()
    ),
    consent_source: 'meta',
    consent_disclosure: text(value?.form_name)
      ? `Meta Lead Ad form: ${text(value?.form_name)}`
      : null,
    timestamp: text(value?.created_time),
  };
}

/** The leadgen events inside a webhook envelope, tagged with their Page ID. */
export function extractLeadgenValues(body: MetaWebhookBody | null | undefined): MetaLeadValue[] {
  const out: MetaLeadValue[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (!change?.value) continue;
      // Ignore other Page webhook fields; a missing `field` is the simulator shape.
      if (change.field && change.field !== 'leadgen') continue;
      out.push({ page_id: entry.id, ...change.value });
    }
  }
  if (out.length === 0 && body?.value) out.push(body.value);
  return out;
}

export const metaConnector: Connector = {
  provider: 'meta',
  label: 'Meta Lead Ads',
  description: 'Facebook & Instagram Lead Ads via webhook.',
  category: 'ads',
  implemented: true,
  normalize(payload) {
    // Accept either a single leadgen value, an array of values, or a full
    // webhook envelope (entry[].changes[].value).
    const values: MetaLeadValue[] = Array.isArray(payload?.entry)
      ? extractLeadgenValues(payload)
      : Array.isArray(payload)
        ? payload
        : payload?.value
          ? [payload.value]
          : payload
            ? [payload]
            : [];
    return values.map((v) => normalizeMetaValue(v));
  },
};

/** Secrets resolve from the environment first, then the admin-only integration row. */
export function resolveMetaSecrets(integration: {
  secret?: string | null;
  config?: Record<string, unknown> | null;
} | null) {
  return {
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || integration?.secret || null,
    appSecret: process.env.META_APP_SECRET || text(integration?.config?.app_secret) || null,
    accessToken: process.env.META_PAGE_ACCESS_TOKEN || text(integration?.config?.page_access_token) || null,
  };
}

/**
 * Verify a Meta webhook subscription handshake (GET).
 * Returns the challenge string to echo back, or null if the token mismatches.
 */
export function verifyMetaChallenge(
  params: URLSearchParams,
  verifyToken: string | null | undefined
): string | null {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (mode === 'subscribe' && token && verifyToken && safeEqual(token, verifyToken)) {
    return challenge;
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verify Meta's `X-Hub-Signature-256` header against the raw request body using
 * the app secret. Constant-time comparison. Returns false on any mismatch or if
 * the secret/header is missing — callers should reject with 401.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected =
    'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  return safeEqual(expected, signatureHeader);
}

export type MetaFetchResult =
  | { ok: true; lead: MetaLeadValue }
  | { ok: false; reason: 'missing_token' | 'auth' | 'not_found' | 'rate_limited' | 'http' | 'network'; status?: number };

const LEAD_FIELDS =
  'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform,field_data';

/**
 * Fetch a lead's answers from the Graph API. The token travels in the
 * Authorization header (never the URL, so it can't land in request logs) and the
 * failure reason is returned instead of swallowed, so callers can fail the
 * webhook and let Meta redeliver rather than lose the lead.
 */
export async function fetchMetaLead(
  leadgenId: string,
  accessToken: string | null | undefined
): Promise<MetaFetchResult> {
  if (!accessToken) return { ok: false, reason: 'missing_token' };
  const version = process.env.META_GRAPH_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(leadgenId)}?fields=${LEAD_FIELDS}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, lead: await res.json() };
    // Graph signals an expired/invalid token with HTTP 400/401/403 (error code 190, 10, 200).
    if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, reason: 'auth', status: res.status };
    if (res.status === 404) return { ok: false, reason: 'not_found', status: 404 };
    if (res.status === 429) return { ok: false, reason: 'rate_limited', status: 429 };
    return { ok: false, reason: 'http', status: res.status };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
