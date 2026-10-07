import { classifyGraphError, GRAPH_VERSION, graphGet, redactSecrets, type FetchLike, type GraphFailure } from '@/lib/meta/marketing-api';

/**
 * The ONLY place in HQN that sends a state-changing request to the Marketing API. It uses a separate
 * credential from the read-only reporting token (META_ADS_WRITE_TOKEN: a System User token with
 * ads_management on the specific ad accounts) so that reporting keeps working - and stays low-privilege -
 * even when no write token exists. Callers must pass the write gate first (lib/meta/studio/gate.ts).
 *
 * POSTs are NOT retried automatically. A timeout or 5xx leaves it unknown whether Meta created the object,
 * so the result is flagged `ambiguous` and the executor looks the object up by its tagged name instead of
 * posting again. That is how a request timeout never produces a duplicate campaign or ad.
 */

export type WriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: GraphFailure; ambiguous: boolean };

export type WriterOptions = { token: string; fetchImpl?: FetchLike; version?: string };

export interface MetaWriter {
  post<T = { id?: string }>(path: string, body: Record<string, unknown>): Promise<WriteResult<T>>;
  get<T = unknown>(path: string, params: Record<string, string>): Promise<{ ok: true; data: T } | { ok: false; failure: GraphFailure }>;
}

export function createMetaWriter(o: WriterOptions): MetaWriter {
  const f = o.fetchImpl ?? fetch;
  const version = o.version ?? GRAPH_VERSION;
  return {
    async post(path, body) {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v === undefined || v === null) continue;
        form.set(k, typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
      try {
        const res = await f(`https://graph.facebook.com/${version}/${path.replace(/^\//, '')}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${o.token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          signal: AbortSignal.timeout(60_000),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && !(json as { error?: unknown } | null)?.error) return { ok: true, data: json };
        const failure = classifyGraphError(res.status, json);
        // A 5xx may or may not have applied the change; a 4xx definitely did not.
        return { ok: false, failure, ambiguous: res.status >= 500 };
      } catch (e) {
        return {
          ok: false, ambiguous: true,
          failure: { kind: 'transient', retryable: true, httpStatus: null, code: null, subcode: null, message: redactSecrets(e instanceof Error ? e.name : 'network error'), fbtraceId: null },
        };
      }
    },
    async get(path, params) {
      try {
        return { ok: true, data: await graphGet(path, params, { token: o.token, fetchImpl: o.fetchImpl, version: o.version, maxRetries: 2 }) };
      } catch (e) {
        const failure = (e as { failure?: GraphFailure }).failure;
        return { ok: false, failure: failure ?? { kind: 'unknown', retryable: false, httpStatus: null, code: null, subcode: null, message: 'read failed', fbtraceId: null } };
      }
    },
  };
}
