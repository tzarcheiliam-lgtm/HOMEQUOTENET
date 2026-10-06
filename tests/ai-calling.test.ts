import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }) }));

import { verifyFishSignature } from '@/lib/ai-calling/signature';
import { dedupeKey } from '@/lib/ai-calling/events';
import { createPhoneCall, setPostCallWebhooks } from '@/lib/ai-calling/fish';
import { placeAiCall } from '@/lib/ai-calling/place';
import { POST as webhook } from '@/app/api/ai-calling/webhook/route';
import { POST as tick } from '@/app/api/ai-calling/tick/route';

// Signing scheme from https://docs.fish.audio/agents/monitor/webhooks#verify-the-signature
// (Fish publishes no fixed test vector, so the MAC is built from the documented formula.)
const SECRET = 'whsec_test';
const now = () => Math.floor(Date.now() / 1000);
const sign = (body: string, t = now(), secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const ended = JSON.stringify({ event: 'call.ended', session: { id: 's1', agent_id: 'a1' }, ended_reason: 'user_hangup' });
const analyzed = (finished_at: string) => JSON.stringify({ event: 'call.analyzed', session: { id: 's1', agent_id: 'a1' }, analysis: { status: 'completed', finished_at } });

beforeEach(() => {
  process.env.FISH_WEBHOOK_SECRET = SECRET;
  process.env.FISH_API_KEY = 'fk_test';
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); delete process.env.AI_CALLING_GLOBAL_ENABLED; delete process.env.AI_CALLING_CRON_SECRET; });

describe('verifyFishSignature', () => {
  it('accepts a correctly signed body', () => expect(verifyFishSignature(ended, sign(ended), SECRET)).toBe(true));
  it('rejects wrong secret, tampered body, missing/garbled header', () => {
    expect(verifyFishSignature(ended, sign(ended, now(), 'other'), SECRET)).toBe(false);
    expect(verifyFishSignature(ended + ' ', sign(ended), SECRET)).toBe(false);
    expect(verifyFishSignature(ended, null, SECRET)).toBe(false);
    expect(verifyFishSignature(ended, 't=abc,v1=zz', SECRET)).toBe(false);
    expect(verifyFishSignature(ended, sign(ended), '')).toBe(false);
  });
  it('enforces the 5 minute tolerance, and the timestamp is inside the MAC', () => {
    expect(verifyFishSignature(ended, sign(ended, now() - 299), SECRET)).toBe(true);
    expect(verifyFishSignature(ended, sign(ended, now() - 301), SECRET)).toBe(false);
    const old = sign(ended, now() - 1000);
    expect(verifyFishSignature(ended, old.replace(/t=\d+/, `t=${now()}`), SECRET)).toBe(false);
  });
  it('ignores unknown elements such as a future v2', () => {
    expect(verifyFishSignature(ended, `${sign(ended)},v2=abc`, SECRET)).toBe(true);
  });
});

describe('dedupeKey', () => {
  it('keys call.analyzed on finished_at so a re-run is not dropped', () => {
    expect(dedupeKey(JSON.parse(ended))).toBe('call.ended:s1');
    expect(dedupeKey(JSON.parse(analyzed('t1')))).not.toBe(dedupeKey(JSON.parse(analyzed('t2'))));
  });
  it('returns null for unknown events', () => expect(dedupeKey({ event: 'x', session: { id: 's' } })).toBeNull());
});

const post = (body: string, sig: string | null) => webhook(new NextRequest('https://crm.test/api/ai-calling/webhook', {
  method: 'POST', body, headers: sig ? { 'x-fish-webhook-signature': sig } : {},
}));

describe('POST /api/ai-calling/webhook', () => {
  it('rejects unsigned/forged requests before touching the database', async () => {
    expect((await post(ended, null)).status).toBe(401);
    expect((await post(ended, sign(ended, now(), 'attacker'))).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('fails closed (500) when no secret is configured', async () => {
    delete process.env.FISH_WEBHOOK_SECRET;
    expect((await post(ended, sign(ended))).status).toBe(500);
  });
  it('stores a valid event once and treats a unique violation as a duplicate', async () => {
    expect(await (await post(ended, sign(ended))).json()).toEqual({ received: true });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ dedupe_key: 'call.ended:s1', session_id: 's1', agent_id: 'a1' }));
    mocks.insert.mockResolvedValue({ error: { code: '23505' } });
    expect(await (await post(ended, sign(ended))).json()).toMatchObject({ duplicate: true });
  });
  it('returns 500 on storage failure so Fish retries', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '08006' } });
    expect((await post(ended, sign(ended))).status).toBe(500);
  });
  it('acknowledges but ignores unknown events', async () => {
    const body = JSON.stringify({ event: 'something.else', session: { id: 's9' } });
    expect(await (await post(body, sign(body))).json()).toMatchObject({ ignored: true });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('Fish client (request shape per official docs)', () => {
  it('createPhoneCall POSTs the documented URL, auth, idempotency header and body', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ session_id: 'sess', status: 'queued' }), { status: 201 }));
    vi.stubGlobal('fetch', f);
    const out = await createPhoneCall({ agentId: 'ag', phoneNumberId: 'pn', toNumber: '+14155550123', idempotencyKey: 'k1', metadata: { prospect: 'p1' } });
    expect(out).toEqual({ sessionId: 'sess', status: 'queued' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.fish.audio/v1/agent/phone-calls');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer fk_test', 'Idempotency-Key': 'k1' });
    expect(JSON.parse(init.body)).toEqual({ agent_id: 'ag', phone_number_id: 'pn', to_number: '+14155550123', metadata: { prospect: 'p1' } });
  });
  it('surfaces only the status on errors (no body, no key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"to":"+1415"}', { status: 402 })));
    const err = await createPhoneCall({ agentId: 'a', phoneNumberId: 'p', toNumber: '+14155550123', idempotencyKey: 'k' }).catch((e) => e);
    expect(err.status).toBe(402); expect(err.message).not.toContain('fk_test'); expect(err.message).not.toContain('+1415');
  });
  it('setPostCallWebhooks PATCHes the agent config', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await setPostCallWebhooks('ag 1', [{ url: 'https://x.test/h', secret: 's' }]);
    expect(f.mock.calls[0][0]).toBe('https://api.fish.audio/v1/agent/agents/ag%201/config');
    expect(f.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ webhooks: { post_call: [{ url: 'https://x.test/h', secret: 's' }] } });
  });
});

describe('kill switch', () => {
  const call = { agentId: 'a', phoneNumberId: 'p', toNumber: '+14155550123', idempotencyKey: 'k' };
  it('placeAiCall refuses and never calls Fish unless the flag is exactly true', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    await expect(placeAiCall(call)).rejects.toThrow(/disabled/);
    process.env.AI_CALLING_GLOBAL_ENABLED = 'false';
    await expect(placeAiCall(call)).rejects.toThrow(/disabled/);
    expect(f).not.toHaveBeenCalled();
  });
  it('rejects non-E.164 destinations even when enabled', async () => {
    process.env.AI_CALLING_GLOBAL_ENABLED = 'true';
    await expect(placeAiCall({ ...call, toNumber: '747-966-5030' })).rejects.toThrow(/E\.164/);
  });
  it('tick requires the bearer secret and reports disabled', async () => {
    process.env.AI_CALLING_CRON_SECRET = 'cron';
    const req = (auth?: string) => tick(new Request('https://crm.test/api/ai-calling/tick', { method: 'POST', headers: auth ? { authorization: auth } : {} }));
    expect((await req()).status).toBe(401);
    expect((await req('Bearer nope')).status).toBe(401);
    expect(await (await req('Bearer cron')).json()).toEqual({ status: 'disabled', dialed: 0 });
  });
});
