import 'server-only';
import { createHmac } from 'node:crypto';
import { MARKETING_API_VERSION, GraphError, classifyGraphError, graphGetAll, graphGet, type GraphOptions } from '@/lib/meta/marketing-api';
import { metaAppConfig } from './config';

export interface AssetAccount { id: string; name: string; status: number | null; currency: string | null; business: { id: string; name: string } | null }
export interface AssetPixel { id: string; name: string; lastFiredAt: string | null; unavailable: boolean; createdAt: string | null }

export const AD_ACCOUNT_ID = /^act_[0-9]{4,25}$/;
export const DATASET_ID = /^[0-9]{5,30}$/;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export interface UserGraph { token: string; fetchImpl?: FetchLike }

/** appsecret_proof ties a token to our server: Meta can require it so a leaked token alone is useless. */
function proof(token: string): Record<string, string> {
  const cfg = metaAppConfig();
  return cfg ? { appsecret_proof: createHmac('sha256', cfg.appSecret).update(token).digest('hex') } : {};
}
const opts = (g: UserGraph): GraphOptions => ({ token: g.token, fetchImpl: g.fetchImpl, version: MARKETING_API_VERSION, maxRetries: 2 });

export async function listAccounts(g: UserGraph): Promise<AssetAccount[]> {
  const rows = await graphGetAll<{ id: string; name?: string; account_status?: number; currency?: string; business?: { id: string; name?: string } }>(
    'me/adaccounts', { fields: 'id,name,account_status,currency,business{id,name}', ...proof(g.token) }, opts(g), 3);
  return rows.filter(r => AD_ACCOUNT_ID.test(r.id)).map(r => ({
    id: r.id, name: r.name ?? r.id, status: r.account_status ?? null, currency: r.currency ?? null,
    business: r.business?.id ? { id: r.business.id, name: r.business.name ?? r.business.id } : null,
  }));
}

export async function listPixels(g: UserGraph, adAccountId: string): Promise<AssetPixel[]> {
  if (!AD_ACCOUNT_ID.test(adAccountId)) throw new Error('invalid ad account id');
  const rows = await graphGetAll<{ id: string; name?: string; last_fired_time?: string; is_unavailable?: boolean; creation_time?: string }>(
    `${adAccountId}/adspixels`, { fields: 'id,name,last_fired_time,is_unavailable,creation_time', ...proof(g.token) }, opts(g), 3);
  return rows.filter(r => DATASET_ID.test(r.id)).map(r => ({ id: r.id, name: r.name ?? r.id, lastFiredAt: r.last_fired_time ?? null, unavailable: !!r.is_unavailable, createdAt: r.creation_time ?? null }));
}

export async function getPixel(g: UserGraph, pixelId: string): Promise<AssetPixel | null> {
  if (!DATASET_ID.test(pixelId)) return null;
  const r = await graphGet<{ id: string; name?: string; last_fired_time?: string; is_unavailable?: boolean; creation_time?: string }>(
    pixelId, { fields: 'id,name,last_fired_time,is_unavailable,creation_time', ...proof(g.token) }, opts(g));
  return { id: r.id, name: r.name ?? r.id, lastFiredAt: r.last_fired_time ?? null, unavailable: !!r.is_unavailable, createdAt: r.creation_time ?? null };
}

/** Event counts Meta recorded for a pixel. The item shape is not documented on the reference page, so parsing is defensive. */
export async function pixelEventCounts(g: UserGraph, pixelId: string, sinceUnix: number, source?: 'WEB_ONLY' | 'SERVER_ONLY'): Promise<Record<string, number> | null> {
  if (!DATASET_ID.test(pixelId)) return null;
  const res = await graphGet<{ data?: unknown[] }>(`${pixelId}/stats`, {
    aggregation: 'event', start_time: String(sinceUnix), ...(source ? { event_source: source } : {}), ...proof(g.token),
  }, opts(g));
  return parseEventCounts(res.data);
}

/** Accepts [{ data: [{ value, count }] }] (documented by Meta elsewhere) and returns null for any other shape instead of guessing. */
export function parseEventCounts(data: unknown): Record<string, number> | null {
  if (!Array.isArray(data)) return null;
  const out: Record<string, number> = {};
  let recognised = false;
  for (const bucket of data) {
    const inner = (bucket as { data?: unknown })?.data;
    if (!Array.isArray(inner)) continue;
    for (const item of inner) {
      const value = (item as { value?: unknown })?.value;
      const count = Number((item as { count?: unknown })?.count);
      if (typeof value === 'string' && Number.isFinite(count)) { out[value] = (out[value] ?? 0) + count; recognised = true; }
    }
  }
  return recognised ? out : data.length === 0 ? {} : null;
}

/** POST /act_{id}/adspixels. Meta allows ONE pixel per ad account (errors 6200/6202), so callers list first. */
export async function createPixel(g: UserGraph, adAccountId: string, name: string): Promise<{ id: string } | { exists: true } | { error: 'permission' | 'failed' }> {
  if (!AD_ACCOUNT_ID.test(adAccountId)) return { error: 'failed' };
  const body = new URLSearchParams({ name, ...proof(g.token) });
  try {
    const res = await (g.fetchImpl ?? fetch)(`https://graph.facebook.com/${MARKETING_API_VERSION}/${adAccountId}/adspixels`, {
      method: 'POST', headers: { Authorization: `Bearer ${g.token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json().catch(() => null) as { id?: string; error?: { code?: number } } | null;
    if (res.ok && json?.id) return { id: json.id };
    const code = json?.error?.code;
    if (code === 6200 || code === 6202) return { exists: true };
    const failure = classifyGraphError(res.status, json);
    return { error: failure.kind === 'permission' ? 'permission' : 'failed' };
  } catch (e) {
    if (e instanceof GraphError) return { error: 'failed' };
    return { error: 'failed' };
  }
}
