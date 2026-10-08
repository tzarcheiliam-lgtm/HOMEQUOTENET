import { describe, expect, it, vi } from 'vitest';
import { classifyGraphError, graphGet, graphGetAll, GraphError, redactSecrets, listDailyInsights } from '@/lib/meta/marketing-api';
import { toInsightDbRow } from '@/lib/meta/sync';

vi.mock('server-only', () => ({}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const noSleep = async () => undefined;

describe('Graph error classification', () => {
  it.each([
    [400, { error: { code: 190, message: 'expired' } }, 'auth', false],
    [403, { error: { code: 200, message: 'perm' } }, 'permission', false],
    [400, { error: { code: 17, message: 'limit' } }, 'rate_limit', true],
    [400, { error: { code: 80004, message: 'bUC' } }, 'rate_limit', true],
    [500, { error: { code: 2, message: 'oops' } }, 'transient', true],
    [400, { error: { code: 100, message: 'bad param' } }, 'invalid', false],
    [429, null, 'rate_limit', true],
  ])('%s %j -> %s (retryable %s)', (status, body, kind, retryable) => {
    expect(classifyGraphError(status as number, body)).toMatchObject({ kind, retryable });
  });
  it('redacts tokens from messages', () => {
    expect(redactSecrets('bad access_token=EAABsbCS1iHgBAxxxxxxxxxxxxxxxxxxxxxxxxxxx&x=1')).not.toMatch(/EAAB/);
    expect(redactSecrets('Authorization: Bearer abc.def-123')).toBe('Authorization: Bearer [redacted]');
  });
});

describe('graphGet', () => {
  it('sends the token only in the Authorization header', async () => {
    const f = vi.fn(async () => json(200, { ok: 1 }));
    await graphGet('me', { fields: 'id' }, { token: 'TOK', fetchImpl: f as never });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('TOK'); expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOK');
  });
  it('retries rate limits with backoff, then succeeds', async () => {
    const f = vi.fn().mockResolvedValueOnce(json(400, { error: { code: 17, message: 'x' } })).mockResolvedValueOnce(json(200, { data: [] }));
    await expect(graphGet('x', {}, { token: 't', fetchImpl: f as never, sleep: noSleep })).resolves.toEqual({ data: [] });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('does not retry an expired token', async () => {
    const f = vi.fn(async () => json(400, { error: { code: 190, message: 'expired' } }));
    await expect(graphGet('x', {}, { token: 't', fetchImpl: f as never, sleep: noSleep })).rejects.toBeInstanceOf(GraphError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('gives up after bounded retries', async () => {
    const f = vi.fn(async () => json(500, { error: { code: 2, message: 'x' } }));
    await expect(graphGet('x', {}, { token: 't', fetchImpl: f as never, sleep: noSleep, maxRetries: 2 })).rejects.toMatchObject({ failure: { kind: 'transient' } });
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('follows paging', async () => {
    const f = vi.fn().mockResolvedValueOnce(json(200, { data: [1], paging: { next: 'https://graph.facebook.com/v1/n?after=1' } })).mockResolvedValueOnce(json(200, { data: [2] }));
    expect(await graphGetAll('x', {}, { token: 't', fetchImpl: f as never })).toEqual([1, 2]);
  });
  it('requests ad-level daily insights using the unified attribution setting', async () => {
    const f = vi.fn(async () => json(200, { data: [] }));
    await listDailyInsights('act_1', '2026-10-01', '2026-10-07', { token: 't', fetchImpl: f as never });
    const url = new URL((f.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get('level')).toBe('ad'); expect(url.searchParams.get('time_increment')).toBe('1');
    expect(url.searchParams.get('use_unified_attribution_setting')).toBe('true');
    expect(JSON.parse(url.searchParams.get('time_range')!)).toEqual({ since: '2026-10-01', until: '2026-10-07' });
  });
});

describe('insight row mapping', () => {
  it('maps strings to numbers and actions to a map; missing fields become zero, reach stays null', () => {
    const r = toInsightDbRow({ ad_id: 'a', campaign_id: 'c', adset_id: 's', date_start: '2026-10-01', spend: '12.34', impressions: '100', inline_link_clicks: '5', actions: [{ action_type: 'lead', value: '2' }] }, 'act_1');
    expect(r).toMatchObject({ spend: 12.34, impressions: 100, reach: null, inline_link_clicks: 5, actions: { lead: 2 }, account_id: 'act_1' });
    expect(toInsightDbRow({ ad_id: 'a', campaign_id: 'c', adset_id: 's', date_start: '2026-10-01' }, 'act_1')).toMatchObject({ spend: 0, impressions: 0, inline_link_clicks: 0 });
  });
});
