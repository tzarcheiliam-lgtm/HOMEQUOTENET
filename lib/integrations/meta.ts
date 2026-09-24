import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Connector, NormalizedLead } from './types';

/**
 * Meta (Facebook + Instagram) Lead Ads connector.
 *
 * Real webhook delivery only contains IDs (leadgen_id, form_id, page_id); the
 * field values are fetched from the Graph API with a page access token. To keep
 * testing free of live ad spend, `normalize` also accepts a payload that already
 * carries `field_data` (what the simulator and Graph fetch both produce).
 */

// Map Meta's field_data array into a flat object keyed by field name.
function fieldsFromMeta(value: any): Record<string, string> {
  const out: Record<string, string> = {};
  const fd = value?.field_data ?? value?.fieldData ?? [];
  for (const f of fd) {
    const key = String(f.name ?? '').toLowerCase();
    const val = Array.isArray(f.values) ? f.values[0] : f.value;
    if (key) out[key] = val ?? '';
  }
  return out;
}

const pick = (f: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) {
    if (f[k] != null && f[k] !== '') return f[k];
  }
  return null;
};

export function normalizeMetaValue(
  value: any,
  config?: Record<string, unknown>
): NormalizedLead {
  const f = fieldsFromMeta(value);
  const platform =
    value?.platform ??
    (value?.ad_id || value?.adgroup_id ? 'facebook' : 'facebook');

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
    source: 'meta',
    platform,
    campaign: value?.campaign_name ?? null,
    campaign_id: value?.campaign_id ?? null,
    ad_set: value?.adset_name ?? null,
    ad_set_id: value?.adset_id ?? null,
    ad: value?.ad_name ?? null,
    ad_id: value?.ad_id ?? null,
    form: value?.form_name ?? null,
    form_id: value?.form_id ?? null,
    external_lead_id: value?.leadgen_id ?? value?.lead_id ?? null,
    // Consent: Meta lead forms carry a consent checkbox in some setups. Capture
    // it if present; otherwise leave false for a human to confirm.
    consent_granted: /^(true|yes|1|on|i agree|agree|consent)$/i.test(
      (pick(f, 'consent', 'tcpa_consent', 'consent_to_contact') ?? '').trim()
    ),
    consent_source: 'meta',
    consent_disclosure: value?.form_name
      ? `Meta Lead Ad form: ${value.form_name}`
      : null,
    timestamp: value?.created_time ?? null,
  };
}

export const metaConnector: Connector = {
  provider: 'meta',
  label: 'Meta Lead Ads',
  description: 'Facebook & Instagram Lead Ads via webhook.',
  category: 'ads',
  implemented: true,
  normalize(payload, config) {
    // Accept either a single leadgen value, an array of values, or a full
    // webhook envelope (entry[].changes[].value).
    const values: any[] = [];
    if (Array.isArray(payload?.entry)) {
      for (const entry of payload.entry) {
        for (const change of entry.changes ?? []) {
          if (change.value) values.push(change.value);
        }
      }
    } else if (Array.isArray(payload)) {
      values.push(...payload);
    } else if (payload?.value) {
      values.push(payload.value);
    } else if (payload) {
      values.push(payload);
    }
    return values.map((v) => normalizeMetaValue(v, config));
  },
};

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
  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    return challenge;
  }
  return null;
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
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Fetch a lead's field data from the Graph API (real deliveries).
 * Requires a page access token in the integration config.
 */
export async function fetchMetaLead(
  leadgenId: string,
  pageAccessToken: string
): Promise<any | null> {
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${encodeURIComponent(
    pageAccessToken
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
