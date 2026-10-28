import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import poolMasters from '@/content/funnels/clients/pool-masters-la.json';
import { consentText, funnelSchema } from '@/lib/funnels/schema';
import type { Answers } from '@/lib/estimator/types';
import { bytesToBase64, imageMime, inlinableUrl, inlineImageHrefs, rasterSize, type HrefTarget } from '@/lib/estimator/scene/rasterize';
import { FIXTURE_CONTRACTOR, FIXTURE_TEMPLATE } from './fixtures/estimator-template';

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e5f';
const OTHER_LEAD = '1c0f9b63-6b9f-4054-8d2f-7b204d3e5f60';

const m = vi.hoisted(() => ({
  sameOrigin: true, funnel: null as unknown,
  /** Every finished query, with its chain of calls. */
  queries: [] as { table: string; ops: [string, unknown[]][] }[],
  answer: (() => ({ data: null, error: null, count: 0 })) as (q: { table: string; ops: [string, unknown[]][] }) => unknown,
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => {} }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    // A chainable fake: every builder call is recorded; awaiting (or .single()) answers through m.answer.
    from: (table: string) => {
      const q = { table, ops: [] as [string, unknown[]][] };
      const settle = () => { m.queries.push(q); return Promise.resolve(m.answer(q)); };
      const chain: Record<string, unknown> = {
        then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => settle().then(ok, bad),
        single: () => { q.ops.push(['single', []]); return settle(); },
      };
      for (const name of ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'contains']) {
        chain[name] = (...args: unknown[]) => { q.ops.push([name, args]); return chain; };
      }
      return chain;
    },
  }),
}));
vi.mock('@/lib/estimator/registry', () => ({
  ESTIMATOR_SLUGS: [],
  getEstimator: (slug: string) => (slug === 'fixture-pools' ? { template: FIXTURE_TEMPLATE, contractor: FIXTURE_CONTRACTOR } : null),
}));
vi.mock('@/lib/funnels/server', () => ({
  hash: (s: string) => `h:${s}`, newToken: () => 'tok', readBody: async (r: Request) => r.json(), sameOrigin: () => m.sameOrigin,
  getFunnel: async () => m.funnel,
}));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: vi.fn() }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/ai-calling/run.server', () => ({ runAiCallQueue: vi.fn() }));
vi.mock('@/lib/sms/config', () => ({ smsConfigured: () => false }));
vi.mock('@/lib/sms/service', () => ({ startSmsForLead: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: vi.fn() }));
vi.mock('@/lib/meta/audit.server', () => ({ directSendAudit: () => ({ reserve: async () => 'ok', finish: async () => {} }) }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: vi.fn() }));

import {
  MAX_RENDER_IMAGE_BYTES, RENDER_PROMPT, RENDER_TOKEN_TTL_MS, dailyRenderCap, parseRenderImage, rendersEnabled,
  signRenderToken, signTaskRef, verifyRenderToken, verifyTaskRef,
} from '@/lib/estimator/render';
import { POST as renderPost } from '@/app/api/estimator/[slug]/render/route';
import { GET as renderGet } from '@/app/api/estimator/[slug]/render/[taskId]/route';
import { POST as leadPost } from '@/app/api/estimator/[slug]/lead/route';
import { checkRender, startRender } from '@/lib/estimator/render-client';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(120, 7)]);
const pngUrl = `data:image/png;base64,${PNG.toString('base64')}`;
const ORIGIN = 'https://pool.example';

/** kie.ai stand-in: records calls (never the key in assertions) and answers per endpoint. */
const kie = {
  calls: [] as { url: string; init?: RequestInit }[],
  upload: () => Response.json({ code: 200, data: { downloadUrl: 'https://tempfile.kie.example/x.png' } }),
  create: () => Response.json({ code: 200, data: { taskId: 'task_abc123' } }),
  record: () => Response.json({ code: 200, data: { state: 'generating' } }),
};
const realFetch = globalThis.fetch;

function useEnv(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, undefined as unknown as string);
    else vi.stubEnv(k, v);
  }
}

/** Default db answers: no prior renders, inserts return an id. */
function counts(perLead: number, daily: number) {
  m.answer = (q) => {
    const names = q.ops.map(([n]) => n);
    if (q.table === 'lead_activities' && names[0] === 'select') {
      return { count: names.includes('eq') ? perLead : daily, error: null };
    }
    if (q.table === 'lead_activities' && names[0] === 'insert') return { data: { id: 'act-1' }, error: null };
    return { data: null, error: null };
  };
}

const startReq = (body: unknown, slug = 'fixture-pools', headers: Record<string, string> = {}) =>
  renderPost(new Request(`${ORIGIN}/api/estimator/${slug}/render`, {
    method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
  }), { params: Promise.resolve({ slug }) });
const pollReq = (taskId: string, token: string | null, slug = 'fixture-pools') =>
  renderGet(new Request(`${ORIGIN}/api/estimator/${slug}/render/${taskId}${token === null ? '' : `?token=${encodeURIComponent(token)}`}`), { params: Promise.resolve({ slug, taskId }) });

beforeEach(() => {
  m.sameOrigin = true; m.queries.length = 0; kie.calls.length = 0;
  useEnv({ KIE_API_KEY: 'test-kie-key', ESTIMATOR_RENDER_SECRET: 'test-secret', SUPABASE_SERVICE_ROLE_KEY: 'svc', ESTIMATOR_RENDER_DAILY_CAP: undefined, ESTIMATOR_RENDER_MODEL: undefined });
  counts(0, 0);
  kie.upload = () => Response.json({ code: 200, data: { downloadUrl: 'https://tempfile.kie.example/x.png' } });
  kie.create = () => Response.json({ code: 200, data: { taskId: 'task_abc123' } });
  kie.record = () => Response.json({ code: 200, data: { state: 'generating' } });
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    kie.calls.push({ url, init });
    if (url.endsWith('/api/v1/file-stream-upload')) return kie.upload();
    if (url.endsWith('/api/v1/jobs/createTask')) return kie.create();
    if (url.includes('/api/v1/jobs/recordInfo')) return kie.record();
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
});
afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = realFetch;
});

describe('render tokens', () => {
  it('signs and verifies a token for a lead and estimator', () => {
    const token = signRenderToken('fixture-pools', LEAD)!;
    expect(token).toMatch(new RegExp(`^${LEAD}\\.\\d+\\.[A-Za-z0-9_-]+$`));
    const grant = verifyRenderToken('fixture-pools', token);
    expect(grant?.leadId).toBe(LEAD);
    expect(grant!.expiresAt - Date.now()).toBeGreaterThan(RENDER_TOKEN_TTL_MS - 2000);
    expect(grant!.expiresAt - Date.now()).toBeLessThanOrEqual(RENDER_TOKEN_TTL_MS);
  });
  it('expires after two hours', () => {
    const now = Date.UTC(2026, 9, 28, 12);
    const token = signRenderToken('fixture-pools', LEAD, now)!;
    expect(verifyRenderToken('fixture-pools', token, now + RENDER_TOKEN_TTL_MS - 1000)).not.toBeNull();
    expect(verifyRenderToken('fixture-pools', token, now + RENDER_TOKEN_TTL_MS + 1000)).toBeNull();
  });
  it('rejects another estimator, an edited lead id, a forged signature or a different secret', () => {
    const token = signRenderToken('fixture-pools', LEAD)!;
    const [, expiry, sig] = token.split('.');
    expect(verifyRenderToken('other-pools', token)).toBeNull();
    expect(verifyRenderToken('fixture-pools', `${OTHER_LEAD}.${expiry}.${sig}`)).toBeNull();
    expect(verifyRenderToken('fixture-pools', `${LEAD}.${Number(expiry) + 3600}.${sig}`)).toBeNull();
    expect(verifyRenderToken('fixture-pools', `${LEAD}.${expiry}.${sig}x`)).toBeNull();
    expect(verifyRenderToken('fixture-pools', `${token}.extra`)).toBeNull();
    expect(verifyRenderToken('fixture-pools', 42)).toBeNull();
    vi.stubEnv('ESTIMATOR_RENDER_SECRET', 'rotated');
    expect(verifyRenderToken('fixture-pools', token)).toBeNull();
  });
  it('falls back to the service-role key, and is off without KIE_API_KEY or a non-uuid lead', () => {
    vi.stubEnv('ESTIMATOR_RENDER_SECRET', '');
    expect(verifyRenderToken('fixture-pools', signRenderToken('fixture-pools', LEAD))?.leadId).toBe(LEAD);
    expect(signRenderToken('fixture-pools', 'lead-9')).toBeNull();
    vi.stubEnv('KIE_API_KEY', '');
    expect(rendersEnabled()).toBe(false);
    expect(signRenderToken('fixture-pools', LEAD)).toBeNull();
  });
  it('ties task refs to their lead', () => {
    const ref = signTaskRef('fixture-pools', LEAD, 'task_abc123')!;
    expect(verifyTaskRef('fixture-pools', LEAD, ref)).toBe('task_abc123');
    expect(verifyTaskRef('fixture-pools', OTHER_LEAD, ref)).toBeNull();
    expect(verifyTaskRef('other-pools', LEAD, ref)).toBeNull();
    expect(verifyTaskRef('fixture-pools', LEAD, 'task_abc123')).toBeNull();
    expect(signTaskRef('fixture-pools', LEAD, 'bad id/../x')).toBeNull();
  });
  it('reads the daily cap from env', () => {
    expect(dailyRenderCap()).toBe(100);
    vi.stubEnv('ESTIMATOR_RENDER_DAILY_CAP', '5');
    expect(dailyRenderCap()).toBe(5);
    vi.stubEnv('ESTIMATOR_RENDER_DAILY_CAP', 'lots');
    expect(dailyRenderCap()).toBe(100);
  });
});

describe('render image parsing', () => {
  it('accepts a real PNG data URL', () => {
    const parsed = parseRenderImage(pngUrl);
    expect('bytes' in parsed && parsed.mime).toBe('image/png');
  });
  it('rejects a mislabelled, non-image or too-large payload', () => {
    expect(parseRenderImage(`data:image/png;base64,${Buffer.alloc(200, 1).toString('base64')}`)).toEqual({ error: 'invalid' });
    expect(parseRenderImage('data:image/svg+xml;base64,PHN2Zz4=')).toEqual({ error: 'invalid' });
    expect(parseRenderImage('https://evil.example/x.png')).toEqual({ error: 'invalid' });
    expect(parseRenderImage(`data:image/png;base64,${'A'.repeat(Math.ceil((MAX_RENDER_IMAGE_BYTES * 4) / 3) + 8)}`)).toEqual({ error: 'too_large' });
  });
});

describe('POST /api/estimator/[slug]/render', () => {
  const token = () => signRenderToken('fixture-pools', LEAD)!;

  it('starts a render: uploads, creates a layout-keeping edit task and records it on the lead', async () => {
    const res = await startReq({ renderToken: token(), image: pngUrl });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(verifyTaskRef('fixture-pools', LEAD, body.taskId)).toBe('task_abc123');

    const [upload, create] = kie.calls;
    expect(upload!.url).toBe('https://api.kie.ai/api/v1/file-stream-upload');
    expect((upload!.init!.headers as Record<string, string>).Authorization).toBe('Bearer test-kie-key');
    expect(upload!.init!.body).toBeInstanceOf(FormData);
    expect(create!.url).toBe('https://api.kie.ai/api/v1/jobs/createTask');
    const sent = JSON.parse(String(create!.init!.body));
    expect(sent.model).toBe('nano-banana-pro');
    expect(sent.input).toMatchObject({ image_input: ['https://tempfile.kie.example/x.png'], aspect_ratio: '3:2', prompt: RENDER_PROMPT });
    expect(RENDER_PROMPT).toMatch(/Keep exactly the same layout/);

    const insert = m.queries.find((q) => q.ops[0]?.[0] === 'insert')!;
    expect(insert.ops[0]![1][0]).toMatchObject({ lead_id: LEAD, type: 'system', metadata: { kind: 'estimator_render', estimator: 'fixture-pools' } });
    const update = m.queries.find((q) => q.ops[0]?.[0] === 'update')!;
    expect(update.ops[0]![1][0]).toMatchObject({ metadata: { status: 'running', task_id: 'task_abc123' } });
  });
  it('answers disabled without KIE_API_KEY and calls nobody', async () => {
    vi.stubEnv('KIE_API_KEY', '');
    const res = await startReq({ renderToken: token(), image: pngUrl });
    expect(await res.json()).toMatchObject({ ok: false, reason: 'disabled' });
    expect(kie.calls).toEqual([]);
    expect(m.queries).toEqual([]);
  });
  it('403s a foreign origin and 404s an unknown estimator', async () => {
    m.sameOrigin = false;
    expect((await startReq({ renderToken: token(), image: pngUrl })).status).toBe(403);
    m.sameOrigin = true;
    expect((await startReq({ renderToken: token(), image: pngUrl }, 'nope')).status).toBe(404);
  });
  it('401s a bad, expired or other-estimator token', async () => {
    const expired = signRenderToken('fixture-pools', LEAD, Date.now() - RENDER_TOKEN_TTL_MS - 5000)!;
    for (const renderToken of ['nope', expired, signRenderToken('other-pools', LEAD)]) {
      const res = await startReq({ renderToken, image: pngUrl });
      expect(res.status).toBe(401);
      expect((await res.json()).reason).toBe('invalid');
    }
    expect(kie.calls).toEqual([]);
  });
  it('rejects an oversized body (413) and a non-image (422)', async () => {
    const big = await startReq('x', 'fixture-pools', { 'content-length': String(20 * 1024 * 1024) });
    expect(big.status).toBe(413);
    const bad = await startReq({ renderToken: token(), image: 'data:image/png;base64,AAAA' });
    expect(bad.status).toBe(422);
    expect(kie.calls).toEqual([]);
  });
  it('stops at three renders per lead, and at the daily cap', async () => {
    counts(3, 3);
    let res = await startReq({ renderToken: token(), image: pngUrl });
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('limit');
    counts(1, 100);
    res = await startReq({ renderToken: token(), image: pngUrl });
    expect(res.status).toBe(429);
    vi.stubEnv('ESTIMATOR_RENDER_DAILY_CAP', '500');
    expect((await startReq({ renderToken: token(), image: pngUrl })).status).toBe(200);
    expect(kie.calls).toHaveLength(2);
  });
  it('releases the reserved slot when kie.ai refuses, and never leaks its reply', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    kie.create = () => Response.json({ code: 402, msg: 'Credits insufficient for key test-kie-key' }, { status: 200 });
    const res = await startReq({ renderToken: token(), image: pngUrl });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'error' });
    expect(m.queries.some((q) => q.ops[0]?.[0] === 'delete')).toBe(true);
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/test-kie-key|test-secret|base64/);
    spy.mockRestore();
  });
});

describe('GET /api/estimator/[slug]/render/[taskId]', () => {
  const token = () => signRenderToken('fixture-pools', LEAD)!;
  const ref = () => signTaskRef('fixture-pools', LEAD, 'task_abc123')!;

  it('reports running, then done with the picture (recorded on the lead)', async () => {
    expect(await (await pollReq(ref(), token())).json()).toEqual({ status: 'running' });
    expect(kie.calls[0]!.url).toBe('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_abc123');
    kie.record = () => Response.json({ code: 200, data: { state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.example/out.jpg'] }) } });
    expect(await (await pollReq(ref(), token())).json()).toEqual({ status: 'done', imageUrl: 'https://cdn.kie.example/out.jpg' });
    const update = m.queries.find((q) => q.ops[0]?.[0] === 'update')!;
    expect(update.ops[0]![1][0]).toMatchObject({ metadata: { status: 'done', image_url: 'https://cdn.kie.example/out.jpg' } });
  });
  it('maps a failed task, and treats a kie.ai outage as still running', async () => {
    kie.record = () => Response.json({ code: 200, data: { state: 'fail', failMsg: 'nsfw' } });
    expect((await (await pollReq(ref(), token())).json()).status).toBe('failed');
    kie.record = () => new Response('down', { status: 503 });
    expect(await (await pollReq(ref(), token())).json()).toEqual({ status: 'running' });
  });
  it('refuses a missing token, another lead’s task, and polls nothing when disabled', async () => {
    expect((await pollReq(ref(), null)).status).toBe(401);
    expect((await pollReq(signTaskRef('fixture-pools', OTHER_LEAD, 'task_abc123')!, token())).status).toBe(404);
    expect((await pollReq('task_abc123', token())).status).toBe(404);
    vi.stubEnv('KIE_API_KEY', '');
    expect((await (await pollReq(ref(), token())).json()).status).toBe('failed');
    expect(kie.calls).toEqual([]);
  });
});

describe('lead route renderToken', () => {
  const answers: Answers = { project: ['remodel'], shape: ['rectangle'], size: ['medium'], package: ['refresh'], scope: ['surface'], surface: ['plaster'], cracks: ['no'] };
  const funnelConfig = funnelSchema.parse(poolMasters);
  const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
  const valid = { answers, zip: '91301', homeowner: 'yes', timeline: 'asap', contact, consentText: consentText(funnelConfig), measurement: false };
  const post = (body: unknown) => leadPost(new Request(`${ORIGIN}/api/estimator/fixture-pools/lead`, {
    method: 'POST', headers: { origin: ORIGIN }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ slug: 'fixture-pools' }) });

  beforeEach(() => {
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelConfig };
    m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: LEAD }, error: null });
    m.answer = (q) => {
      if (q.ops.some(([n]) => n === 'single')) return { data: { id: 'sess-1', token_hash: 'h', version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
      return { data: null, error: null, count: 0 };
    };
  });

  it('adds a token for a saved lead when renders are on', async () => {
    const body = await (await post(valid)).json();
    expect(body.ok).toBe(true);
    expect(verifyRenderToken('fixture-pools', body.renderToken)?.leadId).toBe(LEAD);
  });
  it('leaves it out when renders are off, for a honeypot, and for a stopped unqualified visitor', async () => {
    vi.stubEnv('KIE_API_KEY', '');
    expect((await (await post(valid)).json()).renderToken).toBeUndefined();
    vi.stubEnv('KIE_API_KEY', 'test-kie-key');
    expect((await (await post({ ...valid, contact: { ...contact, website: 'http://spam.example' } })).json()).renderToken).toBeUndefined();
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelSchema.parse({ ...poolMasters, unqualifiedAction: 'stop' }) };
    const stopped = await (await post({ ...valid, homeowner: 'no' })).json();
    expect(stopped.qualified).toBe(false);
    expect(stopped.renderToken).toBeUndefined();
  });
  it('leaves it out when nothing was saved as a lead', async () => {
    m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: null }, error: null });
    expect((await (await post(valid)).json()).renderToken).toBeUndefined();
  });
});

describe('render client', () => {
  it('maps responses and network failures without throwing', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({ ok: true, taskId: 'task_abc123.sig' })) as typeof fetch;
    expect(await startRender('fixture-pools', 't', pngUrl)).toEqual({ ok: true, taskId: 'task_abc123.sig' });
    globalThis.fetch = vi.fn(async () => new Response('<html>', { status: 413 })) as typeof fetch;
    expect(await startRender('fixture-pools', 't', pngUrl)).toMatchObject({ ok: false, reason: 'invalid' });
    globalThis.fetch = vi.fn(async () => { throw new TypeError('offline'); }) as typeof fetch;
    expect(await startRender('fixture-pools', 't', pngUrl)).toMatchObject({ ok: false, reason: 'error' });
    expect(await checkRender('fixture-pools', 't', 'x')).toEqual({ status: 'running' });
    globalThis.fetch = vi.fn(async () => new Response('bad gateway', { status: 502 })) as typeof fetch;
    expect(await checkRender('fixture-pools', 't', 'x')).toEqual({ status: 'running' });
    globalThis.fetch = vi.fn(async () => Response.json({ status: 'done', imageUrl: 'https://cdn/x.jpg' })) as typeof fetch;
    expect(await checkRender('fixture-pools', 't', 'x')).toEqual({ status: 'done', imageUrl: 'https://cdn/x.jpg' });
  });
  it('sends the token and image to the render route', async () => {
    const spy = vi.fn(async () => Response.json({ ok: false, reason: 'disabled', message: 'off' }));
    globalThis.fetch = spy as unknown as typeof fetch;
    await startRender('fixture-pools', 'tok', pngUrl);
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/estimator/fixture-pools/render');
    expect(JSON.parse(String(init.body))).toEqual({ renderToken: 'tok', image: pngUrl });
  });
});

describe('rasterize helpers', () => {
  it('keeps the scene aspect and sane bounds', () => {
    expect(rasterSize(1536)).toEqual({ width: 1536, height: 1024 });
    expect(rasterSize(10)).toEqual({ width: 64, height: 43 });
    expect(rasterSize(Number.NaN).width).toBe(1536);
  });
  it('only inlines same-origin and blob images', () => {
    const base = 'https://pool.example/estimator/pool-masters';
    expect(inlinableUrl('/estimator/scene/textures/deck_pavers.webp', base)).toBe('https://pool.example/estimator/scene/textures/deck_pavers.webp');
    expect(inlinableUrl('https://cdn.example/x.webp', base)).toBeNull();
    expect(inlinableUrl('data:image/png;base64,AA', base)).toBeNull();
    expect(inlinableUrl('#pattern', base)).toBeNull();
    expect(inlinableUrl('blob:https://pool.example/1', base)).toBe('blob:https://pool.example/1');
  });
  it('base64-encodes bytes and picks image types', () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(imageMime('/a/b.webp?v=2', null)).toBe('image/webp');
    expect(imageMime('/a/b', 'image/png; charset=binary')).toBe('image/png');
  });
  it('inlines hrefs and drops images it cannot fetch', async () => {
    const el = (href: string): HrefTarget & { attrs: Record<string, string> } => {
      const attrs: Record<string, string> = { href };
      return { attrs, getAttribute: (n) => attrs[n] ?? null, setAttribute: (n, v) => { attrs[n] = v; }, removeAttribute: (n) => { delete attrs[n]; } };
    };
    const ok = el('/t/deck.webp');
    const missing = el('/t/missing.webp');
    const foreign = el('https://cdn.example/x.webp');
    const inline = el('data:image/png;base64,AA');
    await inlineImageHrefs([ok, missing, foreign, inline], 'https://pool.example/p', async (url) => {
      if (url.endsWith('missing.webp')) throw new Error('404');
      return `data:image/webp;base64,${url.length}`;
    });
    expect(ok.attrs.href).toMatch(/^data:image\/webp;base64,/);
    expect(missing.attrs.href).toBeUndefined();
    expect(foreign.attrs.href).toBeUndefined();
    expect(inline.attrs.href).toBe('data:image/png;base64,AA');
  });
});
