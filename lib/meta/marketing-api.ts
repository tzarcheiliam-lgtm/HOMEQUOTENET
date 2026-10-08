/**
 * Meta Marketing API (read-only) client for the HQN "Meta Ads" reporting import.
 *
 * Read-only on purpose: this file only ever issues GET requests. Campaign creation, ad edits and budget
 * changes are out of scope for this release.
 *
 * Auth: a long-lived System User access token (Business Settings > Users > System users) with `ads_read`
 * on the ad accounts being reported, kept server-side in META_MARKETING_ACCESS_TOKEN. For ad accounts owned
 * by the same Business as the app, Standard access to `ads_read` is sufficient; reading accounts owned by
 * other businesses needs Advanced access (App Review). See docs/meta-ads-setup.md.
 *
 * The token travels in the Authorization header, never in a URL, so it cannot land in request logs.
 */

/**
 * Versions (checked against Meta's changelog on 2026-10-07): Graph API v26.0 is the newest (introduced 2026-07-29); v25.0
 * (2026-02-18) remains supported until 2028-07-29. The Marketing API changelog lists v25.0 as its current version, so the
 * reporting reads default to v25.0 and are overridable with META_MARKETING_API_VERSION; Conversions API calls
 * (lib/meta/capi.ts, queue.server.ts) keep META_GRAPH_VERSION (default v26.0). Unversioned calls are invalid.
 */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
export const MARKETING_API_VERSION = process.env.META_MARKETING_API_VERSION || 'v25.0';
const GRAPH = 'https://graph.facebook.com';

export type GraphErrorKind =
  | 'auth'         // token expired / revoked / invalid (code 190, 102, 463, 467) - needs a new token
  | 'permission'   // token valid but lacks ads_read / account access (code 10, 200-299, 3)
  | 'rate_limit'   // app / account / business-use-case throttle (4, 17, 32, 613, 80000-80014)
  | 'transient'    // 5xx, network, timeout, Meta "unexpected error" (1, 2)
  | 'invalid'      // bad request we should not retry (100 etc.)
  | 'unknown';

export type GraphFailure = {
  kind: GraphErrorKind;
  retryable: boolean;
  httpStatus: number | null;
  code: number | null;
  subcode: number | null;
  message: string;           // redacted
  fbtraceId: string | null;
};

export class GraphError extends Error {
  failure: GraphFailure; // explicit field (not a parameter property) so Node can run this file directly for the CLI checks
  constructor(failure: GraphFailure) { super(failure.message); this.name = 'GraphError'; this.failure = failure; }
}

/** Strip anything token-shaped from a message before it is stored or shown. */
export function redactSecrets(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/access_token=[^&\s"']+/gi, 'access_token=[redacted]')
    .replace(/\bEAA[A-Za-z0-9]{20,}\b/g, '[redacted-token]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80009, 80014]);
const AUTH_CODES = new Set([102, 190, 463, 467]);
const PERMISSION_CODES = new Set([3, 10, 200, 278, 294]);

export function classifyGraphError(httpStatus: number | null, body: unknown): GraphFailure {
  const err = (body as { error?: { code?: number; error_subcode?: number; message?: string; fbtrace_id?: string; is_transient?: boolean } } | null)?.error;
  const code = typeof err?.code === 'number' ? err.code : null;
  const subcode = typeof err?.error_subcode === 'number' ? err.error_subcode : null;
  let kind: GraphErrorKind = 'unknown';
  if (code !== null && AUTH_CODES.has(code)) kind = 'auth';
  else if (code !== null && (PERMISSION_CODES.has(code) || (code >= 200 && code < 300))) kind = 'permission';
  else if ((code !== null && RATE_LIMIT_CODES.has(code)) || httpStatus === 429) kind = 'rate_limit';
  else if (code === 1 || code === 2 || err?.is_transient || (httpStatus !== null && httpStatus >= 500)) kind = 'transient';
  else if (code === 100 || httpStatus === 400) kind = 'invalid';
  else if (httpStatus === 401) kind = 'auth';
  else if (httpStatus === 403) kind = 'permission';
  return {
    kind,
    retryable: kind === 'rate_limit' || kind === 'transient',
    httpStatus, code, subcode,
    message: redactSecrets(err?.message ?? (httpStatus ? `HTTP ${httpStatus}` : 'network error')),
    fbtraceId: err?.fbtrace_id ?? null,
  };
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type GraphOptions = { token: string; fetchImpl?: FetchLike; version?: string; maxRetries?: number; sleep?: (ms: number) => Promise<void> };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** One GET with bounded retries (rate limits and transient errors only, exponential backoff + jitter). */
export async function graphGet<T = unknown>(path: string, params: Record<string, string>, opts: GraphOptions): Promise<T> {
  const f = opts.fetchImpl ?? fetch;
  const url = path.startsWith('http') ? path
    : `${GRAPH}/${opts.version ?? MARKETING_API_VERSION}/${path.replace(/^\//, '')}?${new URLSearchParams(params).toString()}`;
  const max = opts.maxRetries ?? 3;
  let last: GraphFailure | null = null;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      const res = await f(url, { headers: { Authorization: `Bearer ${opts.token}` }, signal: AbortSignal.timeout(30_000) });
      const body = await res.json().catch(() => null);
      if (res.ok && !(body as { error?: unknown } | null)?.error) return body as T;
      last = classifyGraphError(res.status, body);
    } catch (e) {
      last = { kind: 'transient', retryable: true, httpStatus: null, code: null, subcode: null, message: redactSecrets(e instanceof Error ? e.name : 'network error'), fbtraceId: null };
    }
    if (!last.retryable || attempt === max) break;
    await (opts.sleep ?? wait)(Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250));
  }
  throw new GraphError(last!);
}

type Paged<T> = { data?: T[]; paging?: { next?: string } };

/** Follows cursor paging. `limit` is a safety cap on pages (not rows). */
export async function graphGetAll<T>(path: string, params: Record<string, string>, opts: GraphOptions, maxPages = 50): Promise<T[]> {
  const out: T[] = [];
  let page = await graphGet<Paged<T>>(path, { limit: '200', ...params }, opts);
  for (let i = 0; ; i++) {
    out.push(...(page.data ?? []));
    const next = page.paging?.next;
    if (!next || i + 1 >= maxPages) break;
    // `next` is a full URL that already carries paging cursors (and, defensively, may echo query params).
    page = await graphGet<Paged<T>>(next.replace(/([?&])access_token=[^&]*&?/, '$1'), {}, opts);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Typed reads
// ---------------------------------------------------------------------------------------------------
export type MetaAdAccount = { id: string; name?: string; currency?: string; timezone_name?: string; account_status?: number };
export type MetaCampaign = { id: string; name?: string; objective?: string; status?: string; effective_status?: string };
export type MetaAdSet = { id: string; name?: string; campaign_id: string; status?: string; effective_status?: string; optimization_goal?: string; attribution_spec?: unknown; promoted_object?: unknown };
export type MetaAd = { id: string; name?: string; campaign_id: string; adset_id: string; status?: string; effective_status?: string; tracking_specs?: unknown };
export type MetaInsightRow = {
  ad_id: string; campaign_id: string; adset_id: string; date_start: string;
  spend?: string; impressions?: string; reach?: string; inline_link_clicks?: string;
  actions?: { action_type: string; value: string }[];
};

export const listAdAccounts = (o: GraphOptions) =>
  graphGetAll<MetaAdAccount>('me/adaccounts', { fields: 'id,name,currency,timezone_name,account_status' }, o);
export const listCampaigns = (acct: string, o: GraphOptions) =>
  graphGetAll<MetaCampaign>(`${acct}/campaigns`, { fields: 'id,name,objective,status,effective_status' }, o);
export const listAdSets = (acct: string, o: GraphOptions) =>
  graphGetAll<MetaAdSet>(`${acct}/adsets`, { fields: 'id,name,campaign_id,status,effective_status,optimization_goal,attribution_spec,promoted_object' }, o);
export const listAds = (acct: string, o: GraphOptions) =>
  graphGetAll<MetaAd>(`${acct}/ads`, { fields: 'id,name,campaign_id,adset_id,status,effective_status,tracking_specs' }, o);

/**
 * Daily ad-level insights in the ad account's reporting timezone. `use_unified_attribution_setting`
 * makes the numbers follow each ad set's own attribution setting (what Ads Manager shows) instead of an
 * API default. Ad level is the finest grain; everything above it is summed locally (reach excepted).
 */
export const listDailyInsights = (acct: string, since: string, until: string, o: GraphOptions) =>
  graphGetAll<MetaInsightRow>(`${acct}/insights`, {
    level: 'ad', time_increment: '1',
    fields: 'ad_id,campaign_id,adset_id,spend,impressions,reach,inline_link_clicks,actions',
    time_range: JSON.stringify({ since, until }),
    use_unified_attribution_setting: 'true',
  }, o);

/** Permissions the token actually holds (for the settings health panel). */
export async function listGrantedPermissions(o: GraphOptions): Promise<{ permission: string; status: string }[]> {
  return graphGetAll('me/permissions', {}, o);
}

/** Token expiry / validity via /debug_token (needs app id + secret). Returns null when not configurable. */
export async function debugToken(o: GraphOptions, appId: string | undefined, appSecret: string | undefined) {
  if (!appId || !appSecret) return null;
  const res = await graphGet<{ data?: { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number; scopes?: string[]; type?: string } }>(
    'debug_token', { input_token: o.token, access_token: `${appId}|${appSecret}` }, { ...o, token: `${appId}|${appSecret}` });
  return res.data ?? null;
}
