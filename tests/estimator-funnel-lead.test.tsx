import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import poolMastersFunnel from '@/content/funnels/clients/pool-masters-la.json';
import { funnelSchema } from '@/lib/funnels/schema';

/**
 * The simple funnel's lead path (experience 'funnel'): the contact step's
 * request, the route re-pricing the picks (never the browser's answers), what
 * the contractor gets, the booking screen's helpers, and the size plan images.
 * The route runs against the real Pool Masters registration with the database
 * faked (no real leads).
 */

const m = vi.hoisted(() => ({
  funnel: null as unknown,
  rpc: vi.fn(),
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  updates: [] as { table: string; row: Record<string, unknown> }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => undefined }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }),
      update: (row: Record<string, unknown>) => {
        m.updates.push({ table, row });
        return { eq: () => ({ is: async () => ({ error: null }) }) };
      },
      insert: (row: Record<string, unknown>) => {
        m.inserts.push({ table, row });
        const saved = { data: { ...row, id: 'sess-1', version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
        return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => saved }) });
      },
    }),
  }),
}));
vi.mock('@/lib/funnels/server', () => ({
  hash: (s: string) => `h:${s}`,
  newToken: () => 'tok',
  readBody: async (r: Request) => r.json(),
  sameOrigin: () => true,
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

import { POST } from '@/app/api/estimator/[slug]/lead/route';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import { priceEyebrow, priceRange, readCalendlyMessage } from '@/components/estimator/funnel/booking/state';
import { FunnelContactScreen } from '@/components/estimator/funnel/contact/funnel-contact';
import {
  emptyFunnelFields,
  firstInvalid,
  formErrors,
  funnelLeadRequest,
  loadContactDraft,
  placeErrors,
  saveContactDraft,
} from '@/components/estimator/funnel/contact/state';
import type { FunnelLeadResult } from '@/components/estimator/funnel/screens';
import { publicTemplate } from '@/lib/estimator/config';
import { allFunnelSelections, encodeFunnelSelection, estimateFunnel, funnelAnswers, funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { funnelLeadDesign, parseLeadRequest, sanitizeEstimatorAnswers } from '@/lib/estimator/lead';
import { ADDRESS_NEEDS_ZIP, describeFunnelDesign, estimatorConsentText, funnelContactErrors, splitFullName } from '@/lib/estimator/lead-client';
import { getEstimator } from '@/lib/estimator/registry';

const { template, contractor } = getEstimator('pool-masters')!;
const spec = funnelSpecFor(contractor)!;
const funnelConfig = funnelSchema.parse(poolMastersFunnel);
const pub = publicTemplate(template, contractor);
const picks = { size: 'classic', finish: 'luxe', extras: 'spa' };
const fields = {
  ...emptyFunnelFields(),
  name: '  Jordan  Rivera ',
  email: ' jordan@example.test ',
  phone: '(818) 555-0142',
  address: '4521 Park Granada, Calabasas, CA 91302-1234',
  homeowner: 'yes' as const,
  consent: true,
};
const request = () =>
  funnelLeadRequest({ spec, selection: picks, fields, consentText: estimatorConsentText(contractor.contractorName), measurement: false, consentOnSubmit: true });

const post = (body: unknown) =>
  POST(
    new Request('https://homequote.example/api/estimator/pool-masters/lead', {
      method: 'POST',
      headers: { origin: 'https://homequote.example' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'pool-masters' }) },
  );
const rpcArgs = () => m.rpc.mock.calls[0][1] as Record<string, unknown>;
const activity = () => m.inserts.find((i) => i.table === 'lead_activities')!.row;

beforeEach(() => {
  vi.clearAllMocks();
  m.inserts.length = 0;
  m.updates.length = 0;
  m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: 'lead-9' }, error: null });
});

describe('contact step request', () => {
  it('splits one Name field into first and last name', () => {
    expect(splitFullName('  Jordan  Rivera ')).toEqual({ firstName: 'Jordan', lastName: 'Rivera' });
    expect(splitFullName('Mary Ann van der Berg')).toEqual({ firstName: 'Mary', lastName: 'Ann van der Berg' });
    expect(splitFullName('Jordan')).toBeNull();
  });
  it('checks the fields with specific, fixable messages in on-screen order', () => {
    const errors = funnelContactErrors({ name: 'Jordan', email: 'nope', phone: '818', address: '', homeowner: '', consent: false });
    expect(Object.keys(errors)).toEqual(['name', 'email', 'phone', 'address', 'homeowner', 'consent']);
    expect(errors.name).toMatch(/first and last name/);
    expect(errors.address).toBe('Enter the address of the home.');
    expect(firstInvalid(errors)).toBe('name');
    expect(funnelContactErrors({ ...fields })).toEqual({});
  });
  it('agree-on-submit: name, email, phone, address and the ownership answer, no box to tick', () => {
    const rules = { consentOnSubmit: true };
    const errors = funnelContactErrors({ name: '', email: '', phone: '', address: '', homeowner: '', consent: false }, rules);
    expect(Object.keys(errors)).toEqual(['name', 'email', 'phone', 'address', 'homeowner']);
    expect(errors.homeowner).toBe('Tell us whether this pool is at your home.');
    expect(funnelContactErrors({ ...fields, consent: false }, rules)).toEqual({});
  });
  it('asks "Is this pool at your home?" with Yes, it’s my home / No, I rent', () => {
    expect(spec.contactStep.homeowner).toEqual({ label: 'Is this pool at your home?', yes: 'Yes, it’s my home', no: 'No, I rent' });
    // The funnel this files into qualifies homeowners only: the answer is always asked, never assumed.
    expect(funnelConfig.qualificationRules).toContainEqual({ question: 'homeowner', operator: 'equals', values: ['yes'] });
    expect('askHomeowner' in spec.contactStep).toBe(false);
  });
  it('a typed address without a ZIP asks for it, with the exact message', () => {
    const errors = funnelContactErrors({ ...fields, address: '4521 Park Granada, Calabasas' }, { consentOnSubmit: true });
    expect(errors).toEqual({ address: ADDRESS_NEEDS_ZIP });
    expect(ADDRESS_NEEDS_ZIP).toBe('Add your ZIP code to the address');
    expect(funnelContactErrors({ ...fields, address: '91302' }, { consentOnSubmit: true }).address).toMatch(/street address/);
  });
  it('a picked place gives its ZIP, until the text is edited', () => {
    const place = { address: '4521 Park Granada, Calabasas, CA', zip: '91302', city: 'Calabasas', state: 'CA', lat: 34.15, lng: -118.64 };
    expect(funnelContactErrors({ ...fields, address: place.address, place }, { consentOnSubmit: true })).toEqual({});
    expect(funnelContactErrors({ ...fields, address: `${place.address} `, place }, { consentOnSubmit: true })).toEqual({});
    expect(funnelContactErrors({ ...fields, address: '4521 Park Granada, Calabasas', place }, { consentOnSubmit: true }).address).toBe(ADDRESS_NEEDS_ZIP);
    const body = funnelLeadRequest({ spec, selection: picks, fields: { ...fields, address: place.address, place }, consentText: 'x', measurement: false, consentOnSubmit: true });
    expect(body.zip).toBe('91302');
    expect(body.address).toBe(place.address);
    expect(body.addressDetails).toEqual({ verified: true, city: 'Calabasas', state: 'CA', lat: 34.15, lng: -118.64 });
    expect(parseLeadRequest(body).ok).toBe(true);
  });
  it('agree-on-submit sends consent with the exact wording and the visitor’s own ownership answer', () => {
    const body = funnelLeadRequest({ spec, selection: picks, fields: { ...fields, homeowner: 'no', consent: false }, consentText: 'x', measurement: false, consentOnSubmit: true });
    expect(body.contact.consent).toBe(true);
    expect(body.consentText).toBe('x');
    expect(body.homeowner).toBe('no');
  });
  it('sends the picks, the contact and the exact consent wording, never a price', () => {
    const body = request();
    expect(body.funnel).toEqual(picks);
    expect(body.contact).toMatchObject({ firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', consent: true });
    expect(body.zip).toBe('91302');
    expect(body.address).toBe('4521 Park Granada, Calabasas, CA 91302-1234');
    expect(body.addressDetails).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/low|high|\$/);
    const parsed = parseLeadRequest(body);
    expect(parsed.ok).toBe(true);
  });
  it('puts server errors next to the field (first / last name -> Name) or over the button', () => {
    const placed = placeErrors({ lastName: 'Enter your last name', form: 'Try again.' });
    expect(placed.name).toBe('Enter your last name');
    expect(formErrors(placed)).toEqual(['Try again.']);
  });
  it('never puts the address in the note', () => {
    expect(request().note).toBeUndefined();
  });
});

describe('funnel lead route', () => {
  it('prices the picks on the server (like estimateFunnel) and ignores browser answers', async () => {
    const res = await post({ ...request(), answers: { surface: ['plaster'], size: ['small'] }, configurator: { model: 'small', picks: {}, luxe: true } });
    const body = await res.json();
    const page = estimateFunnel(spec, template, picks).total!;
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect([body.estimate.low, body.estimate.high]).toEqual([page.low, page.high]);
    const saved = (activity().metadata as { estimator: { answers: unknown } }).estimator.answers;
    expect(saved).toEqual(sanitizeEstimatorAnswers(template, funnelAnswers(spec, picks)));
  });
  it('gives the contractor the picks in plain words, the photos each step showed and a link back', async () => {
    await post(request());
    const answers = rpcArgs().p_answers as Record<string, string>;
    expect(answers.estimator_design).toContain('Select your pool size: Classic (About 30 × 15 ft)');
    expect(answers.estimator_design).toContain('Choose your finish: Luxe');
    expect(answers.estimator_design).toContain('Add the extras: Add a spa');
    expect(answers.estimator_photos).toContain('https://homequote.example/estimator/pool-masters/funnel/size-classic.webp');
    expect(answers.estimator_photos).toMatch(/\/configurator\/aerial-[a-z-]*spa[a-z-]*\.webp/);
    expect(answers.estimator_design_url).toBe('https://homequote.example/estimator/pool-masters/design?size=classic&finish=luxe&extras=spa');
    expect(answers.estimator_check_on_site).toBeTruthy();
    const meta = (activity().metadata as { estimator: { funnel: { selection: unknown; titles: string[] } } }).estimator;
    expect(meta.funnel).toEqual({ selection: picks, titles: ['Classic', 'Luxe', 'Add a spa'] });
    expect(String(activity().body)).toMatch(/Their design:\n- Select your pool size: Classic/);
    expect(String(activity().body)).not.toMatch(/Go Luxe bundle saving/);
    expect(rpcArgs().p_qualified).toBe(true);
  });
  it('returns the Calendly link prefilled for a qualified homeowner', async () => {
    const body = await (await post(request())).json();
    const url = new URL(body.calendarUrl);
    expect(url.hostname).toBe('calendly.com');
    expect(url.searchParams.get('name')).toBe('Jordan Rivera');
    expect(url.searchParams.get('email')).toBe('jordan@example.test');
  });
  it('a request without the ownership answer is refused (it is never assumed)', async () => {
    const { homeowner: _h, ...rest } = request();
    void _h;
    const res = await post(rest);
    expect(res.status).toBe(422);
    expect((await res.json()).errors.homeowner).toBeTruthy();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('stores the homeowner answer and never an "assumed" ownership line', async () => {
    await post(request());
    const meta = (activity().metadata as { estimator: { homeowner: string } }).estimator;
    expect(meta.homeowner).toBe('yes');
    expect(String((rpcArgs().p_answers as Record<string, string>).estimator_check_on_site ?? '')).not.toMatch(/not asked online/);
    expect((rpcArgs().p_answers as Record<string, string>).homeowner).toBe('yes');
  });
  it('gives the contractor the full address (summary, answers, lead columns) and validates the ZIP', async () => {
    const res = await post({ ...request(), address: '4521 Park Granada, Calabasas, CA', zip: '91302', addressDetails: { verified: true, city: 'Calabasas', state: 'CA', lat: 34.1561, lng: -118.6388 } });
    expect(res.status).toBe(200);
    const answers = rpcArgs().p_answers as Record<string, string>;
    expect(answers.estimator_address).toBe('4521 Park Granada, Calabasas, CA 91302');
    expect(answers.estimator_address_map).toBe('https://www.google.com/maps/search/?api=1&query=34.156100,-118.638800');
    expect(String(activity().body)).toContain('Home address: 4521 Park Granada, Calabasas, CA 91302 (picked from Google suggestions)');
    const meta = (activity().metadata as { estimator: { address: Record<string, unknown> } }).estimator;
    expect(meta.address).toMatchObject({ line: '4521 Park Granada, Calabasas, CA 91302', zip: '91302', city: 'Calabasas', state: 'CA', verified: true });
    expect(m.updates).toEqual([{ table: 'leads', row: { address: '4521 Park Granada, Calabasas, CA 91302', city: 'Calabasas', state: 'CA' } }]);
    const bad = await post({ ...request(), zip: '9130' });
    expect(bad.status).toBe(422);
    expect((await bad.json()).errors.zip).toBeTruthy();
  });
  it('a bad address detail is dropped, never a failed lead', async () => {
    const res = await post({ ...request(), addressDetails: { lat: 'x', state: 'California' } });
    expect(res.status).toBe(200);
    expect(String(activity().body)).toContain('(typed)');
  });
  it('a funnel set to stop unqualified visitors says nothing was saved', async () => {
    m.funnel = { ...(m.funnel as object), config: { ...funnelConfig, unqualifiedAction: 'stop' } };
    const body = await (await post({ ...request(), homeowner: 'no' })).json();
    expect(body).toMatchObject({ ok: true, qualified: false, saved: false });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('a renter ("No, I rent") is saved for review without a booking link', async () => {
    const body = await (await post({ ...request(), homeowner: 'no' })).json();
    expect(body.ok).toBe(true);
    expect(body.qualified).toBe(false);
    expect(body.calendarUrl).toBeUndefined();
    expect(body.saved).toBeUndefined();
    expect(rpcArgs().p_qualified).toBe(false);
    expect(String(activity().body)).toContain('Homeowner: no, they rent');
  });
  it('unknown steps and options fall back to the defaults instead of failing', async () => {
    const res = await post({ ...request(), funnel: { size: 'mega', nope: 'x' } });
    expect(res.status).toBe(200);
    expect((rpcArgs().p_answers as Record<string, string>).estimator_design).toContain('Select your pool size: Classic');
  });
  it('every combination gives a priced design with one photo per step', () => {
    for (const sel of allFunnelSelections(spec)) {
      const { estimate, design } = funnelLeadDesign(spec, template, sel, { origin: 'https://x.test', slug: 'pool-masters' });
      expect(estimate.low).toBeGreaterThan(0);
      expect(design.photos).toHaveLength(spec.steps.length);
      expect(design.summary.slice(0, 3)).toEqual(describeFunnelDesign(spec, sel));
      expect(design.designUrl).toContain(encodeFunnelSelection(spec, sel));
    }
  });
});

describe('booking screen helpers', () => {
  it('names the picks over the range', () => {
    expect(priceEyebrow(spec, picks)).toBe('Classic · Luxe · With spa');
    expect(priceEyebrow(spec, { size: 'estate', finish: 'standard', extras: 'backyard' })).toBe('Estate · Standard · Full backyard');
    expect(priceRange({ low: 65000, high: 106500 })).toBe('$65,000 – $106,500');
    expect(priceRange({ low: null, high: null })).toBeNull();
  });
  it('reads only Calendly’s own messages', () => {
    expect(readCalendlyMessage('https://calendly.com', { event: 'calendly.event_scheduled' })).toEqual({ kind: 'scheduled' });
    expect(readCalendlyMessage('https://calendly.com', { event: 'calendly.page_height', payload: { height: '1100px' } })).toEqual({ kind: 'height', height: 1100 });
    expect(readCalendlyMessage('https://evil.test', { event: 'calendly.event_scheduled' })).toBeNull();
  });
});

describe('sessionStorage (a refresh never loses what was typed)', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('window', {
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps what was typed, never the consent tick', () => {
    saveContactDraft('pool-masters', fields);
    const draft = loadContactDraft('pool-masters')!;
    expect(draft.email).toBe(fields.email);
    expect('consent' in draft).toBe(false);
  });
  it('a broken storage never throws', () => {
    vi.stubGlobal('window', { sessionStorage: { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } });
    expect(loadContactDraft('pool-masters')).toBeNull();
    expect(() => saveContactDraft('pool-masters', fields)).not.toThrow();
  });
});

describe('screens render', () => {
  it('the contact step: two-line heading, labelled fields with the right keyboards, consent, trust line', () => {
    const html = renderToStaticMarkup(
      <FunnelContactScreen slug="pool-masters" spec={spec} contractor={contractor} template={pub} selection={picks} embedded={false} headingId="h" onDone={() => undefined} />,
    );
    expect(html).toContain('id="h"');
    expect(html).toContain('Your estimate is ready.');
    expect(html).toContain('Where should we send it?');
    expect(html).toMatch(/autoComplete="name"|autocomplete="name"/);
    expect(html).toMatch(/type="email"[^>]*inputMode="email"|inputMode="email"/i);
    expect(html).toMatch(/type="tel"/);
    expect(html).not.toMatch(/inputMode="numeric"/i);
    expect(html).toContain('Home address');
    expect(html).not.toContain('ZIP code');
    expect(html).toMatch(/role="combobox"[^>]*aria-autocomplete="list"[^>]*aria-expanded="false"/);
    expect(html).toMatch(/autoComplete="street-address"|autocomplete="street-address"/i);
    expect(html).toContain(estimatorConsentText(contractor.contractorName).replace(/'/g, '&#x27;'));
    expect(html).toContain('By tapping');
    expect(html).toContain('CSLB #1112793');
    // Four text fields + the ownership buttons, no consent checkbox, the measurement box never pre-ticked.
    expect(html.match(/data-text=""/g)).toHaveLength(4);
    expect(html).toContain('Is this pool at your home?');
    expect(html).toContain('Yes, it’s my home');
    expect(html).toContain('No, I rent');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).not.toMatch(/type="radio"[^>]*checked/);
    expect(html).not.toContain('Do you own this home?');
    expect(html).not.toMatch(/data-field="consent"/);
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    // Name, email and phone say "Next"; the address too until the ownership question is answered.
    expect(html.match(/enterKeyHint="next"/gi)).toHaveLength(4);
    expect(html).not.toMatch(/★|reviews/i);
  });
  it('the booking step: picks, range, ballpark and example-price wording, financing without payments, call link', () => {
    const estimate = estimateFunnel(spec, template, picks);
    const result: FunnelLeadResult = {
      estimate: { ...estimate.estimate, low: estimate.total!.low, high: estimate.total!.high },
      qualified: true,
      calendarUrl: 'https://calendly.com/homequotenetwork/30min?name=Jordan+Rivera&email=j%40x.test',
      contact: { firstName: 'Jordan', lastName: 'Rivera', email: 'j@x.test' },
    };
    const html = renderToStaticMarkup(
      <FunnelBookingScreen slug="pool-masters" spec={spec} contractor={contractor} template={pub} selection={picks} result={result} embedded={false} headingId="h" />,
    );
    expect(html).toContain('Book your free on-site estimate');
    expect(html.replace(/<[^>]+>/g, '')).toContain('Classic · Luxe · With spa');
    expect(html).toContain(priceRange(result.estimate)!);
    expect(html).toContain('Ballpark price, not a quote');
    expect(html).toContain('Example prices');
    expect(html).toContain('Financing available');
    expect(html).not.toMatch(/\/mo\b|per month/i);
    expect(html).toContain('tel:+18186436888');
    expect(html).toContain('Open the calendar in a new tab');
  });
  it('the booking step without a booking link (outside the area) says we will call', () => {
    const result: FunnelLeadResult = {
      estimate: estimateFunnel(spec, template, picks).estimate,
      qualified: false,
      contact: { firstName: 'Jordan', lastName: 'Rivera', email: 'j@x.test' },
    };
    const html = renderToStaticMarkup(
      <FunnelBookingScreen slug="pool-masters" spec={spec} contractor={contractor} template={pub} selection={picks} result={result} embedded headingId="h" />,
    );
    expect(html).toContain('within one business day');
    expect(html).not.toContain('calendly');
  });
  it('a renter saved for review gets the review wording: no booking and no promised call', () => {
    const result: FunnelLeadResult = {
      estimate: estimateFunnel(spec, template, picks).estimate,
      qualified: false,
      homeowner: 'no',
      contact: { firstName: 'Jordan', lastName: 'Rivera', email: 'j@x.test' },
    };
    const html = renderToStaticMarkup(
      <FunnelBookingScreen slug="pool-masters" spec={spec} contractor={contractor} template={pub} selection={picks} result={result} embedded={false} headingId="h" />,
    );
    expect(html).toContain('Your project needs a personal review.');
    expect(html).toContain('Your ballpark estimate');
    expect(html).not.toContain('Book your free on-site estimate');
    expect(html).not.toContain('within one business day');
    expect(html).not.toContain('calendly');
    const unsaved = renderToStaticMarkup(
      <FunnelBookingScreen slug="pool-masters" spec={spec} contractor={contractor} template={pub} selection={picks} result={{ ...result, saved: false }} embedded={false} headingId="h" />,
    );
    expect(unsaved).toContain('were not saved');
    expect(unsaved).not.toContain('are saved');
  });
});

describe('size plan images', () => {
  const dir = join(process.cwd(), 'public/estimator/pool-masters/funnel');
  it.each(['compact', 'classic', 'estate'])('%s exists as a small 3:2 WebP (plus a phone copy)', (id) => {
    for (const file of [`size-${id}.webp`, `size-${id}-sm.webp`]) {
      const path = join(dir, file);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeLessThan(120 * 1024);
      expect(readFileSync(path).subarray(8, 12).toString()).toBe('WEBP');
    }
  });
});
