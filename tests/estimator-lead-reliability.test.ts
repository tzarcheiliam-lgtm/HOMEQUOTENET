import { beforeEach, describe, expect, it, vi } from 'vitest';
import poolMastersFunnel from '@/content/funnels/clients/pool-masters-la.json';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * Every way a real person's first submit used to fail, and the lead the
 * contractor gets from the one-page configurator. The route runs against the
 * real Pool Masters registration with the database faked (no real leads).
 */

const m = vi.hoisted(() => ({
  funnel: null as unknown, count: 0, sameOrigin: true,
  rpc: vi.fn(), inserts: [] as { table: string; row: Record<string, unknown> }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => undefined }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: m.count, error: null }) }) }),
      insert: (row: Record<string, unknown>) => {
        m.inserts.push({ table, row });
        const saved = { data: { ...row, id: 'sess-1', version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
        return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => saved }) });
      },
    }),
  }),
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
// Pool Masters now runs the simple funnel (revealRange 'after_contact'); this file covers the
// configurator lead path, which stays supported, so the route sees Pool Masters as a configurator contractor.
vi.mock('@/lib/estimator/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/estimator/registry')>();
  return {
    ...real,
    getEstimator: (slug: string) => {
      const found = real.getEstimator(slug);
      if (!found || slug !== 'pool-masters') return found;
      return { ...found, contractor: { ...found.contractor, experience: 'configurator' as const, revealRange: 'immediately' as const } };
    },
  };
});

import { POST } from '@/app/api/estimator/[slug]/lead/route';
import { estimateSelection, defaultSelection, selectionToAnswers } from '@/lib/estimator/configurator/engine';
import { ReplayCache, acceptedConsent, normalizeConsent, originAllowed, parseLeadRequest, sanitizeEstimatorAnswers } from '@/lib/estimator/lead';
import {
  describeConfiguratorDesign, estimatorConsentText, leadFieldErrors, normalizeZip, submitEstimatorLead, usPhoneDigits, type EstimatorLeadRequest,
} from '@/lib/estimator/lead-client';
import { getEstimator } from '@/lib/estimator/registry';

const { template, contractor } = getEstimator('pool-masters')!;
const spec = contractor.configurator!;
const funnelConfig = funnelSchema.parse(poolMastersFunnel);
const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '(818) 555-0142', consent: true, website: '' };
const luxe = { ...defaultSelection(spec), model: 'large', luxe: true, picks: { ...defaultSelection(spec).picks, backyard: ['outdoor_kitchen'], equipment: ['heater'] } };
const valid = {
  answers: {}, zip: '91302', homeowner: 'yes', contact, consentText: estimatorConsentText(contractor.contractorName), measurement: false,
  configurator: luxe,
};

const post = (body: unknown, headers: Record<string, string> = { origin: 'https://homequote.example' }, url = 'https://homequote.example/api/estimator/pool-masters/lead') =>
  POST(new Request(url, { method: 'POST', headers, body: JSON.stringify(body) }), { params: Promise.resolve({ slug: 'pool-masters' }) });
const rpcArgs = () => m.rpc.mock.calls[0][1] as Record<string, unknown>;
const activity = () => m.inserts.find((i) => i.table === 'lead_activities')!.row;

beforeEach(() => {
  vi.clearAllMocks();
  m.inserts.length = 0; m.count = 0; m.sameOrigin = true;
  m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: 'lead-9' }, error: null });
});

/* ------------------------------------------------------------------ */

describe('origin check (www vs apex, proxies, embeds)', () => {
  const req = (origin: string | null, extra: Record<string, string> = {}, url = 'https://homequote.example/api/estimator/pool-masters/lead') =>
    new Request(url, { method: 'POST', headers: { ...(origin ? { origin } : {}), ...extra } });
  it('accepts the same origin and its www / apex twin', () => {
    expect(originAllowed(req('https://homequote.example'), undefined)).toBe(true);
    expect(originAllowed(req('https://www.homequote.example'), undefined)).toBe(true);
    expect(originAllowed(req('https://homequote.example', {}, 'https://www.homequote.example/api/x'), undefined)).toBe(true);
  });
  it('accepts the host the browser used behind a proxy, and the configured site URL', () => {
    expect(originAllowed(req('https://homequote.example', { 'x-forwarded-host': 'homequote.example', 'x-forwarded-proto': 'https' }, 'http://localhost:3000/api/x'), undefined)).toBe(true);
    expect(originAllowed(req('https://www.homequote.example', {}, 'http://10.0.0.4/api/x'), 'https://homequote.example')).toBe(true);
  });
  it('accepts a missing Origin only when the browser says same-origin', () => {
    expect(originAllowed(req(null, { 'sec-fetch-site': 'same-origin' }), undefined)).toBe(true);
    expect(originAllowed(req(null), undefined)).toBe(false);
    expect(originAllowed(req(null, { 'sec-fetch-site': 'cross-site' }), undefined)).toBe(false);
  });
  it('refuses other sites and sandboxed frames', () => {
    expect(originAllowed(req('https://evil.example'), 'https://homequote.example')).toBe(false);
    expect(originAllowed(req('https://homequote.example.evil.example'), undefined)).toBe(false);
    expect(originAllowed(req('null'), undefined)).toBe(false);
  });
  it('the route saves a lead posted from the www twin even when the strict check fails', async () => {
    m.sameOrigin = false;
    const res = await post(valid, { origin: 'https://www.homequote.example' });
    expect(res.status).toBe(200);
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });
  it('the route refuses a foreign origin with a message that says what to do', async () => {
    m.sameOrigin = false;
    const res = await post(valid, { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect((await res.json()).errors.form).toMatch(/Reload the page/);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe('consent wording', () => {
  it('accepts the page wording when the funnel’s clientName differs from the contractor’s name, and stores what the page showed', async () => {
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: { ...funnelConfig, clientName: 'Pool Masters' } };
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(rpcArgs().p_consent).toBe(estimatorConsentText('Pool Masters LA'));
  });
  it('accepts the funnel’s own wording too, and ignores whitespace, quote and dash differences', () => {
    const funnelText = consentText({ ...funnelConfig, clientName: 'Pool Masters' });
    expect(acceptedConsent(funnelText, { clientName: 'Pool Masters' }, contractor)).toBe(funnelText);
    const curly = `  ${estimatorConsentText('Pool Masters LA').replace(/'/g, '’').replace(/ /g, '  ')}\n`;
    expect(acceptedConsent(curly, funnelConfig, contractor)).toBe(estimatorConsentText('Pool Masters LA'));
    expect(normalizeConsent('a – b ’c’')).toBe("a - b 'c'");
  });
  it('a wording we never show is a 409 that hands back the current wording, saving nothing', async () => {
    const res = await post({ ...valid, consentText: 'I agree to anything.' });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.errors.consent).toMatch(/tick the box/);
    expect(body.consentText).toBe(estimatorConsentText('Pool Masters LA'));
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe('fields real people type', () => {
  const parse = (patch: Record<string, unknown>) => parseLeadRequest({ ...valid, ...patch });
  it('takes ZIP+4 and padded ZIPs (autofill) as the five-digit ZIP', () => {
    for (const zip of ['91302-1234', ' 91302 ', '91302 1234']) {
      const r = parse({ zip });
      expect(r.ok && r.data.zip).toBe('91302');
    }
    expect(parse({ zip: '9130' }).ok).toBe(false);
  });
  it('takes the usual US phone formats', () => {
    for (const phone of ['(818) 555-0142', '+1 818 555 0142', '818.555.0142', '18185550142']) {
      expect(parse({ contact: { ...contact, phone } }).ok).toBe(true);
    }
    const bad = parse({ contact: { ...contact, phone: '818-123-4567' } });
    expect(bad.ok ? null : bad.errors.phone).toMatch(/US phone number, like/);
  });
  it('a missing field reads as that field’s message, never "Required"', () => {
    const r = parseLeadRequest({ ...valid, contact: { email: 'a@b.co', consent: true, website: '' }, zip: undefined });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.firstName).toBe('Enter your first name');
    expect(r.errors.phone).toBe('Enter your phone number');
    expect(r.errors.zip).toMatch(/ZIP/);
    expect(Object.values(r.errors).join(' ')).not.toMatch(/Required/);
  });
  it('the timeline is optional (the configurator does not ask it)', () => {
    expect(parse({}).ok).toBe(true);
  });
  it('unusable tracking values are dropped instead of failing the lead', () => {
    const r = parse({ tracking: { pageUrl: 'not a url', fbp: 'x'.repeat(500), eventId: 'e1' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.tracking).toEqual({ eventId: 'e1', pageUrl: undefined, fbp: undefined, fbc: undefined });
    expect(parse({ tracking: 'nonsense' }).ok).toBe(true);
  });
  it('the honeypot stays a silent drop (and an empty one is not a bot)', async () => {
    const res = await post({ ...valid, contact: { ...contact, website: 'http://spam' } });
    expect((await res.json()).ok).toBe(true);
    expect(m.rpc).not.toHaveBeenCalled();
    await post(valid);
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('repeat submissions and server trouble', () => {
  it('the same submissionId gets the first reply back and saves once', async () => {
    const body = { ...valid, submissionId: 'retry-test-0001' };
    const first = await (await post(body)).json();
    const second = await (await post(body)).json();
    expect(second).toEqual(first);
    expect(m.rpc).toHaveBeenCalledTimes(1);
    await post({ ...valid, submissionId: 'retry-test-0002' });
    expect(m.rpc).toHaveBeenCalledTimes(2);
  });
  it('a failed save is not remembered, so trying again really tries again', async () => {
    m.rpc.mockResolvedValueOnce({ data: null, error: { code: 'XX000' } });
    const body = { ...valid, submissionId: 'retry-test-0003' };
    const res = await post(body);
    expect(res.status).toBe(503);
    expect((await res.json()).errors.form).toMatch(/still on the page.*call \(818\) 643-6888/);
    expect((await post(body)).status).toBe(200);
  });
  it('the hourly cap says what to do instead', async () => {
    m.count = 30;
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect((await res.json()).errors.form).toMatch(/call \(818\) 643-6888/);
  });
  it('ReplayCache expires and stays bounded', () => {
    const cache = new ReplayCache<number>(1000, 2);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.set('c', 3, 0);
    expect(cache.get('a', 1)).toBeUndefined();
    expect(cache.get('c', 1)).toBe(3);
    expect(cache.get('c', 5000)).toBeUndefined();
  });
});

describe('configurator lead', () => {
  it('prices the design like the page (Go Luxe saving included) and ignores browser answers', async () => {
    const res = await post({ ...valid, answers: { surface: ['plaster'], size: ['small'] } });
    const body = await res.json();
    const page = estimateSelection(spec, template, luxe).total;
    expect(body.ok).toBe(true);
    expect([body.estimate.low, body.estimate.high]).toEqual([page.low, page.high]);
    const saved = (activity().metadata as { estimator: { answers: unknown } }).estimator.answers;
    expect(saved).toEqual(sanitizeEstimatorAnswers(template, selectionToAnswers(spec, luxe)));
  });
  it('gives the contractor the design in plain words, the exact photos and a link back', async () => {
    await post(valid);
    const answers = rpcArgs().p_answers as Record<string, string>;
    expect(answers.estimator_design).toContain('Size: Estate, 36 × 18 ft');
    expect(answers.estimator_design).toContain('Go Luxe: yes');
    expect(answers.estimator_design).toContain('Outdoor kitchen');
    expect(answers.estimator_design).toContain('Heater');
    expect(answers.estimator_photos).toMatch(/Aerial: https:\/\/homequote\.example\/estimator\/pool-masters\/configurator\/aerial-porcelain-pebble-spa-kitchen\.webp/);
    expect(answers.estimator_design_url).toBe('https://homequote.example/estimator/pool-masters?m=large&o=outdoor_kitchen,heater&lx=1');
    expect(answers.estimator_check_on_site).toBeTruthy();
    expect(answers.service).toBe('backyard');
    const body = String(activity().body);
    expect(body).toMatch(/Their design:\n- Size: Estate/);
    expect(body).toMatch(/Go Luxe bundle saving: -\$/);
    expect(body).toMatch(/Photos they saw \(example designs, AI-assisted\):/);
    expect(body).toMatch(/Not asked online, check on site:/);
    expect(rpcArgs().p_qualified).toBe(true);
  });
  it('returns the Calendly link prefilled with the homeowner’s name and email', async () => {
    const body = await (await post(valid)).json();
    const url = new URL(body.calendarUrl);
    expect(url.hostname).toBe('calendly.com');
    expect(url.searchParams.get('name')).toBe('Jordan Rivera');
    expect(url.searchParams.get('email')).toBe('jordan@example.test');
  });
  it('drops unknown ids in the selection instead of failing', async () => {
    const res = await post({ ...valid, configurator: { model: 'huge', picks: { finish: ['gold'], nope: ['x'] }, luxe: false } });
    expect(res.status).toBe(200);
  });
  it('describeConfiguratorDesign lists every group', () => {
    const lines = describeConfiguratorDesign(spec, defaultSelection(spec));
    expect(lines[0]).toBe('Size: Classic, 30 × 15 ft');
    expect(lines).toContain('Pool finish: White plaster (included)');
    expect(lines).toContain('Equipment: None');
  });
});

/* ------------------------------------------------------------------ */
/* Browser side                                                        */
/* ------------------------------------------------------------------ */

describe('client checks', () => {
  const ok = { firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '818 555 0142', zip: '91302', homeowner: 'yes' as const, consent: true };
  it('passes a good form', () => expect(leadFieldErrors(ok)).toEqual({}));
  it('explains each phone problem', () => {
    expect(leadFieldErrors({ ...ok, phone: '' }).phone).toMatch(/Enter your phone/);
    expect(leadFieldErrors({ ...ok, phone: '555 0142' }).phone).toMatch(/has 7 digits/);
    expect(leadFieldErrors({ ...ok, phone: '818 155 0142' }).phone).toMatch(/never start with 0 or 1/);
    expect(leadFieldErrors({ ...ok, phone: '+44 20 7946 0958' }).phone).toMatch(/Enter a US number/);
  });
  it('ZIP, email, homeowner and consent', () => {
    expect(leadFieldErrors({ ...ok, zip: '913' }).zip).toMatch(/5-digit/);
    expect(leadFieldErrors({ ...ok, zip: '91302-1234' }).zip).toBeUndefined();
    expect(leadFieldErrors({ ...ok, email: 'a@b' }).email).toMatch(/Check your email/);
    expect(leadFieldErrors({ ...ok, homeowner: '' }).homeowner).toBeTruthy();
    expect(leadFieldErrors({ ...ok, consent: false }).consent).toBeTruthy();
  });
  it('normalizers', () => {
    expect(usPhoneDigits('+1 (818) 555-0142')).toBe('8185550142');
    expect(usPhoneDigits('818 055 0142')).toBeNull();
    expect(normalizeZip('91302-1234')).toBe('91302');
    expect(normalizeZip('abcde')).toBeNull();
  });
});

describe('submitEstimatorLead', () => {
  const request = valid as unknown as EstimatorLeadRequest;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  it('retries a network error once with the same submissionId', async () => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body));
      if (bodies.length === 1) throw new TypeError('Failed to fetch');
      return json({ ok: true, qualified: true, estimate: {} });
    });
    const res = await submitEstimatorLead('pool-masters', request, { fetch: fetcher as typeof fetch, retryDelayMs: 0 });
    expect(res.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(bodies[0]).submissionId).toBeTruthy();
    expect(JSON.parse(bodies[0]).submissionId).toBe(JSON.parse(bodies[1]).submissionId);
  });
  it('retries a gateway error without JSON once', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 })).mockResolvedValueOnce(json({ ok: true, qualified: false, estimate: {} }));
    expect((await submitEstimatorLead('pool-masters', request, { fetch: fetcher, retryDelayMs: 0 })).ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not retry an answer from the server (a validation error is for the person to fix)', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ ok: false, errors: { phone: 'Enter a valid US phone number' } }, 422));
    const res = await submitEstimatorLead('pool-masters', request, { fetch: fetcher, retryDelayMs: 0 });
    expect(res).toEqual({ ok: false, errors: { phone: 'Enter a valid US phone number' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('after two network failures says so, and that the details are kept', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await submitEstimatorLead('pool-masters', request, { fetch: fetcher, retryDelayMs: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.form).toMatch(/couldn’t reach our server.*still here/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('gives up on a hung request and says it is slow', async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const res = await submitEstimatorLead('pool-masters', request, { fetch: fetcher as typeof fetch, timeoutMs: 10, retryDelayMs: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.form).toMatch(/taking too long/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('a non-JSON server error becomes a plain, recoverable message', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('oops', { status: 500 }));
    const res = await submitEstimatorLead('pool-masters', request, { fetch: fetcher, retryDelayMs: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.form).toMatch(/still here/);
  });
});
