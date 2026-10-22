/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import { consentText, type Answers } from '@/lib/adu-quiz/quiz';

const h = vi.hoisted(() => ({ client: null as unknown, dbDown: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (h.dbDown) throw new Error('db down');
    return h.client;
  },
}));
vi.mock('@/lib/meta/capi', () => ({ buildFbc: () => null, sendMetaEvent: vi.fn(async () => ({ status: 'skipped' })) }));

const WEBHOOK = 'https://hooks.example.test/adu';
const good: Answers = {
  owns_home: 'yes', on_title: 'yes', property_type: 'single_family', zip: '91403', location: 'backyard',
  goal: 'rental_income', budget: '150k_250k', payment: 'financing', timeline: 'within_3',
  credit: '700_plus', bankruptcy: 'no', decision_makers: 'just_me',
};
let n = 0;
const submission = (answers: Answers = good, extra: Record<string, unknown> = {}) => ({
  submissionId: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  answers,
  contact: { firstName: 'Sam', lastName: 'Rivera', email: 'Sam@Example.com', phone: '(818) 456-7890' },
  consent: true as const,
  consentText: consentText('HomeQuote Network'),
  pageUrl: 'https://homequotenet.com/adu-quiz',
  tracking: { utm_source: 'google', utm_campaign: 'adu', gclid: 'G1', fbclid: 'F1', fbp: 'fb.1.1.2', landing_page_url: 'https://homequotenet.com/adu-quiz', device_type: 'mobile', timestamp: '2026-10-22T12:00:00.000Z' },
  measurement: false,
  ...extra,
});

let db: PGlite;
let calls: { url: string; body: any; headers: Record<string, string> }[];
let respond: () => { ok: boolean; status: number };

beforeAll(async () => {
  db = await fullSchema();
  h.client = fakeSupabase(db);
}, 120000);

beforeEach(async () => {
  calls = [];
  respond = () => ({ ok: true, status: 200 });
  h.dbDown = false;
  vi.stubEnv('ADU_QUIZ_LEAD_WEBHOOK_URL', WEBHOOK);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return respond();
  }));
  await db.exec('delete from adu_quiz_leads');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function submit(input = submission()) {
  const { submissionSchema } = await import('@/lib/adu-quiz/submission');
  const { submitAduQuizLead } = await import('@/lib/adu-quiz/leads.server');
  const parsed = submissionSchema.parse(input);
  return { input, result: await submitAduQuizLead(parsed) };
}
const rows = async () => (await db.query<any>('select * from adu_quiz_leads order by created_at')).rows;

describe('adu quiz lead pipeline (real migration 0047 in PGlite)', () => {
  it('stores a qualified lead, forwards the exact payload once, and marks it sent', async () => {
    const { input, result } = await submit();
    expect(result).toMatchObject({ ok: true, qualified: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(WEBHOOK);
    expect(calls[0].headers['Idempotency-Key']).toBe(input.submissionId);
    expect(calls[0].body).toMatchObject({
      source: 'adu-quiz', submission_id: input.submissionId,
      first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', phone: '+18184567890',
      answers: good, qualified: true, dq_reason: null, dq_reasons: [],
      title_unverified: false, credit_unverified: false, bankruptcy_unverified: false,
      consent: { text: consentText('HomeQuote Network'), page_url: 'https://homequotenet.com/adu-quiz' },
      tracking: { utm_source: 'google', utm_campaign: 'adu', gclid: 'G1', fbclid: 'F1', fbp: 'fb.1.1.2', device_type: 'mobile' },
    });
    expect(typeof calls[0].body.consent.timestamp).toBe('string');
    const [row] = await rows();
    expect(row).toMatchObject({ webhook_status: 'sent', webhook_attempts: 1, qualified: true, phone_e164: '+18184567890', email_normalized: 'sam@example.com' });
    expect(row.consent_text).toBe(consentText('HomeQuote Network'));
  });

  it('still stores and forwards a not-qualified lead, with the reason and flags', async () => {
    const { result } = await submit(submission({ ...good, owns_home: 'no_rent', on_title: 'not_sure', credit: 'below_620' }));
    expect(result).toMatchObject({ ok: true, qualified: false });
    expect(calls[0].body).toMatchObject({ qualified: false, dq_reason: 'not_owner', dq_reasons: ['not_owner', 'credit'], title_unverified: true });
    const [row] = await rows();
    expect(row).toMatchObject({ qualified: false, dq_reason: 'not_owner', webhook_status: 'sent' });
  });

  it('keeps the lead and retries later when the webhook is down', async () => {
    respond = () => ({ ok: false, status: 503 });
    const { input, result } = await submit();
    expect(result).toMatchObject({ ok: true, qualified: true });
    expect(calls).toHaveLength(3); // three inline attempts
    let [row] = await rows();
    expect(row).toMatchObject({ webhook_status: 'pending', webhook_attempts: 1, webhook_last_error: 'http_503' });

    // The scheduled retry, once the webhook is back.
    respond = () => ({ ok: true, status: 200 });
    await db.exec(`update adu_quiz_leads set webhook_next_attempt_at = now() - interval '1 minute'`);
    const { retryPendingAduQuizLeads } = await import('@/lib/adu-quiz/leads.server');
    const out = await retryPendingAduQuizLeads();
    expect(out).toMatchObject({ retried: 1, sent: 1, configured: true });
    expect(calls[calls.length - 1].body.submission_id).toBe(input.submissionId);
    expect(calls[calls.length - 1].body.qualified).toBe(true);
    [row] = await rows();
    expect(row).toMatchObject({ webhook_status: 'sent', webhook_attempts: 2, webhook_last_error: null });
  });

  it('does not retry a 4xx inline and keeps the lead pending', async () => {
    respond = () => ({ ok: false, status: 400 });
    const { result } = await submit();
    expect(result).toMatchObject({ ok: true });
    expect(calls).toHaveLength(1);
    expect((await rows())[0]).toMatchObject({ webhook_status: 'pending', webhook_last_error: 'http_400' });
  });

  it('is idempotent on submissionId: a retry never inserts or posts twice', async () => {
    const first = submission();
    await submit(first);
    const again = await submit(first);
    expect(again.result).toMatchObject({ ok: true, qualified: true, duplicate: true });
    expect(await rows()).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it('forwards straight to the webhook when the database is unavailable', async () => {
    h.dbDown = true;
    const { result } = await submit();
    expect(result).toMatchObject({ ok: true, qualified: true });
    expect(calls).toHaveLength(1);
  });

  it('refuses (503) rather than silently dropping a lead when the database AND webhook both fail', async () => {
    h.dbDown = true;
    respond = () => ({ ok: false, status: 500 });
    const { result } = await submit();
    expect(result).toMatchObject({ ok: false, status: 503 });
  });

  it('stores only, and keeps the lead pending, when no webhook is configured', async () => {
    vi.stubEnv('ADU_QUIZ_LEAD_WEBHOOK_URL', '');
    const { result } = await submit();
    expect(result).toMatchObject({ ok: true, qualified: true });
    expect(calls).toHaveLength(0);
    expect((await rows())[0]).toMatchObject({ webhook_status: 'pending', webhook_last_error: 'webhook_not_configured' });
  });

  it('silently discards a honeypot submission', async () => {
    const { result } = await submit(submission(good, { honeypot: 'http://spam.example' }));
    expect(result).toMatchObject({ ok: true, qualified: false, token: null });
    expect(await rows()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });
});

describe('POST /api/adu-quiz/booked', () => {
  const call = async (body: unknown, origin = 'http://localhost') => {
    const { POST } = await import('@/app/api/adu-quiz/booked/route');
    const res = await POST(new Request('http://localhost/api/adu-quiz/booked', {
      method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: await res.json() };
  };

  it('marks a qualified lead booked with the right token, and refuses a wrong token, a stranger and a bad origin', async () => {
    const { input, result } = await submit();
    if (!result.ok || !result.token) throw new Error('expected a token');
    expect((await call({ submissionId: input.submissionId, token: 'f'.repeat(48) })).status).toBe(404);
    expect((await call({ submissionId: input.submissionId, token: result.token }, 'https://evil.example')).status).toBe(403);
    expect((await call({ submissionId: '00000000-0000-4000-8000-ffffffffffff', token: result.token })).status).toBe(404);
    expect((await rows())[0].booked_at).toBeNull();

    expect(await call({ submissionId: input.submissionId, token: result.token })).toEqual({ status: 200, json: { ok: true } });
    const booked = (await rows())[0].booked_at;
    expect(booked).not.toBeNull();
    // Calling again keeps the first booking time.
    expect((await call({ submissionId: input.submissionId, token: result.token })).status).toBe(200);
    expect((await rows())[0].booked_at).toEqual(booked);
  });

  it('never books a not-qualified lead', async () => {
    const { input, result } = await submit(submission({ ...good, owns_home: 'no_rent' }));
    if (!result.ok || !result.token) throw new Error('expected a token');
    expect((await call({ submissionId: input.submissionId, token: result.token })).status).toBe(404);
    expect((await rows())[0].booked_at).toBeNull();
  });
});
