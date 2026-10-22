import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { GRAPH_VERSION, GraphError, classifyGraphError, redactSecrets } from '@/lib/meta/marketing-api';
import type { MetaAppConfig } from './config';

export const STATE_COOKIE = 'hqn_meta_oauth';
const STATE_TTL_MS = 10 * 60_000;

export interface OAuthState { u: string; c: string | null; n: string; lvl: 'read' | 'manage'; r: string; e: number }

const b64 = (v: Buffer | string) => Buffer.from(v).toString('base64url');

/** `state` = payload + HMAC. A random nonce also lives in an httpOnly cookie, so a forged callback cannot succeed (CSRF). */
export function signState(secret: string, s: Omit<OAuthState, 'n' | 'e'>, now = Date.now()): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString('base64url');
  const payload = b64(JSON.stringify({ ...s, n: nonce, e: now + STATE_TTL_MS } satisfies OAuthState));
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  return { state: `${payload}.${mac}`, nonce };
}

export function verifyState(secret: string, state: string | null, cookieNonce: string | null, userId: string, now = Date.now()): OAuthState | null {
  if (!state || !cookieNonce) return null;
  const [payload, mac] = state.split('.');
  if (!payload || !mac) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let parsed: OAuthState;
  try { parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (parsed.e < now || parsed.u !== userId) return null;
  const a = Buffer.from(parsed.n), b = Buffer.from(cookieNonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return parsed;
}

/** Only same-site /app paths may be used as the post-login return target (no open redirect). */
export function safeReturnPath(raw: string | null | undefined): string {
  if (raw && /^\/app(\/[A-Za-z0-9._~\-/]*)?(\?[A-Za-z0-9._~\-=&%]*)?$/.test(raw) && !raw.includes('//')) return raw;
  return '/app';
}

export function authorizeUrl(cfg: MetaAppConfig, state: string, scopes: readonly string[]): string {
  const q = new URLSearchParams({ client_id: cfg.appId, redirect_uri: cfg.redirectUri, state, response_type: 'code', scope: scopes.join(',') });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${q.toString()}`;
}

async function tokenCall(params: Record<string, string>, fetchImpl: typeof fetch): Promise<{ access_token: string; expires_in?: number }> {
  const res = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${new URLSearchParams(params).toString()}`, { signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => null) as { access_token?: string; expires_in?: number; error?: unknown } | null;
  if (!res.ok || !body?.access_token) throw new GraphError(classifyGraphError(res.status, body));
  return { access_token: body.access_token, expires_in: body.expires_in };
}

/** code -> short-lived token -> long-lived (~60 day) token. Both calls are server-to-server with the app secret. */
export async function exchangeCode(cfg: MetaAppConfig, code: string, fetchImpl: typeof fetch = fetch) {
  const short = await tokenCall({ client_id: cfg.appId, redirect_uri: cfg.redirectUri, client_secret: cfg.appSecret, code }, fetchImpl);
  const long = await tokenCall({ grant_type: 'fb_exchange_token', client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: short.access_token }, fetchImpl);
  return { token: long.access_token, expiresInSec: long.expires_in ?? null };
}

export interface TokenInspection { isValid: boolean; appId: string | null; userId: string | null; scopes: string[]; expiresAt: Date | null }

/** debug_token: confirm the token is valid, was issued to OUR app, and to the user who logged in. */
export async function inspectToken(cfg: MetaAppConfig, token: string, fetchImpl: typeof fetch = fetch): Promise<TokenInspection> {
  const q = new URLSearchParams({ input_token: token, access_token: `${cfg.appId}|${cfg.appSecret}` });
  const res = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/debug_token?${q.toString()}`, { signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => null) as { data?: { is_valid?: boolean; app_id?: string; user_id?: string; scopes?: string[]; expires_at?: number } } | null;
  const d = body?.data;
  if (!res.ok || !d) throw new GraphError(classifyGraphError(res.status, body));
  return { isValid: !!d.is_valid, appId: d.app_id ?? null, userId: d.user_id ?? null, scopes: d.scopes ?? [], expiresAt: d.expires_at ? new Date(d.expires_at * 1000) : null };
}

export const describeOAuthError = (e: unknown) => (e instanceof GraphError ? e.failure.message : redactSecrets(e instanceof Error ? e.message : 'unknown'));
