import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({
  insertResult: { error: null as null | { code: string } },
  inserted: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
  existing: null as null | Record<string, unknown>,
  calendar: { url: 'https://calendly.com/hq/contractor', provider: 'calendly' } as null | { url: string; provider: string },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => { if (!state.insertResult.error) state.inserted.push(row); return state.insertResult; },
      update: (row: Record<string, unknown>) => { state.updated.push(row); return { eq: async () => ({ error: null }) }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existing }) }) }),
    }),
  }),
}));
vi.mock('@/lib/contractor-funnel/settings.server', async () => {
  const { DEFAULT_RULES } = await import('@/lib/contractor-funnel/schema');
  return { loadFunnelSettings: async () => ({ calendar: state.calendar, calendarSource: 'admin', pixelId: null, rules: DEFAULT_RULES }) };
});

import { answersSchema, contactSchema, qualifyContractor, DEFAULT_RULES, type Answers } from '@/lib/contractor-funnel/schema';
import { POST as inquiry } from '@/app/api/contractor-funnel/inquiry/route';
import { POST as booking } from '@/app/api/contractor-funnel/booking/route';

const goodAnswers: Answers = {
  services: ['pools'], serviceArea: 'Encino, 91436', role: 'owner', projectValue: 'varies',
  capacity: '6_15', sources: ['referrals', 'meta_ads'], timeline: 'within_30_days',
};
const goodContact = { name: 'Pat Builder', company: 'Pat Pools', email: 'Pat@Example.com', phone: '(818) 234-5678', website: 'patpools.com', contactConsent: true, marketingConsent: false };
const SUB = '3f9b6f0e-6f0a-4c1a-9a55-0b6e1f7a2c11';
const body = (over: Record<string, unknown> = {}) => ({ submissionId: SUB, answers: goodAnswers, contact: goodContact, attribution: { utm_source: 'facebook', evil: 'x' }, measurement: false, ...over });
const req = (b: unknown) => new Request('http://t/api', { method: 'POST', body: JSON.stringify(b) });

beforeEach(() => {
  state.insertResult = { error: null }; state.inserted = []; state.updated = []; state.existing = null;
  state.calendar = { url: 'https://calendly.com/hq/contractor', provider: 'calendly' };
});

describe('qualifyContractor', () => {
  it('qualifies a clear fit, including "It varies" project value and any revenue', () => {
    expect(qualifyContractor(goodAnswers)).toEqual({ status: 'qualified', reasons: [] });
    expect(qualifyContractor({ ...goodAnswers, projectValue: 'under_5k' }).status).toBe('qualified');
  });
  it('routes uncertain cases to review with reasons', () => {
    expect(qualifyContractor({ ...goodAnswers, capacity: 'none' })).toEqual({ status: 'needs_review', reasons: ['no_capacity'] });
    expect(qualifyContractor({ ...goodAnswers, role: 'other', timeline: 'researching', services: ['other'] }).reasons.sort())
      .toEqual(['only_other_services', 'researching_only', 'role_other']);
  });
  it('rules are individually switchable', () => {
    expect(qualifyContractor({ ...goodAnswers, capacity: 'none' }, { ...DEFAULT_RULES, reviewIfNoCapacity: false }).status).toBe('qualified');
  });
});

describe('validation', () => {
  it('normalizes phone, email and website; requires contact consent', () => {
    const ok = contactSchema.parse(goodContact);
    expect(ok.phone).toBe('+18182345678'); expect(ok.email).toBe('pat@example.com'); expect(ok.website).toBe('https://patpools.com/');
    expect(contactSchema.safeParse({ ...goodContact, contactConsent: false }).success).toBe(false);
    expect(contactSchema.safeParse({ ...goodContact, phone: '123' }).success).toBe(false);
  });
  it('requires at least one service and source', () => {
    expect(answersSchema.safeParse({ ...goodAnswers, services: [] }).success).toBe(false);
    expect(answersSchema.safeParse({ ...goodAnswers, sources: [] }).success).toBe(false);
  });
});

describe('POST /api/contractor-funnel/inquiry', () => {
  it('saves first, then returns the calendar for a qualified prospect; drops unknown attribution keys', async () => {
    const res = await inquiry(req(body()));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({ qualification_status: 'qualified', phone: '+18182345678', contact_consent: true });
    expect(state.inserted[0].attribution).toEqual({ utm_source: 'facebook' });
    expect(json).toMatchObject({ status: 'qualified', calendar: state.calendar });
    expect(json.token).toMatch(/^[0-9a-f]{48}$/);
    expect(state.inserted[0].access_token_hash).not.toBe(json.token);
  });
  it('never shows a calendar when the save fails', async () => {
    state.insertResult = { error: { code: '500' } };
    const res = await inquiry(req(body()));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('calendly');
  });
  it('needs_review gets no calendar', async () => {
    const json = await (await inquiry(req(body({ answers: { ...goodAnswers, capacity: 'none' } })))).json();
    expect(json).toMatchObject({ status: 'needs_review', calendar: null });
  });
  it('qualified with no calendar configured is saved, with no fake calendar', async () => {
    state.calendar = null;
    const json = await (await inquiry(req(body()))).json();
    expect(json).toMatchObject({ status: 'qualified', calendar: null, calendarConfigured: false });
  });
  it('is idempotent on submissionId', async () => {
    state.insertResult = { error: { code: '23505' } };
    state.existing = { qualification_status: 'qualified', booking_status: 'none' };
    const res = await inquiry(req(body()));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(state.inserted).toHaveLength(0);
    expect(json).toMatchObject({ status: 'qualified', duplicate: true });
  });
  it('silently discards honeypot submissions', async () => {
    const json = await (await inquiry(req(body({ honeypot: 'http://spam' })))).json();
    expect(state.inserted).toHaveLength(0);
    expect(json.calendar).toBeNull();
  });
  it('rejects invalid input with field errors', async () => {
    const res = await inquiry(req(body({ contact: { ...goodContact, email: 'nope' } })));
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors['contact.email']).toBeTruthy();
  });
});

describe('POST /api/contractor-funnel/booking', () => {
  const ev = 'https://api.calendly.com/scheduled_events/AAAA-1111';
  const bk = (token: string) => req({ submissionId: SUB, token, eventUri: ev, inviteeUri: `${ev}/invitees/BBBB-2222` });
  it('rejects a wrong token', async () => {
    const { createHash } = await import('node:crypto');
    state.existing = { id: 'r1', access_token_hash: createHash('sha256').update('right'.padEnd(24, 'x')).digest('hex'), qualification_status: 'qualified', booking_status: 'none' };
    expect((await booking(bk('wrong'.padEnd(24, 'x')))).status).toBe(403);
    expect(state.updated).toHaveLength(0);
  });
  it('records an unverified embed report as "reported" (no Calendly API token in tests)', async () => {
    const { createHash } = await import('node:crypto');
    const token = 'right'.padEnd(24, 'x');
    state.existing = { id: 'r1', access_token_hash: createHash('sha256').update(token).digest('hex'), qualification_status: 'qualified', booking_status: 'none' };
    delete process.env.CALENDLY_API_TOKEN;
    const res = await booking(bk(token));
    expect(await res.json()).toEqual({ status: 'reported' });
    expect(state.updated[0]).toMatchObject({ booking_status: 'reported', review_status: 'booked' });
  });
  it('refuses bookings for needs_review prospects', async () => {
    const { createHash } = await import('node:crypto');
    const token = 'right'.padEnd(24, 'x');
    state.existing = { id: 'r1', access_token_hash: createHash('sha256').update(token).digest('hex'), qualification_status: 'needs_review', booking_status: 'none' };
    expect((await booking(bk(token))).status).toBe(409);
  });
});
