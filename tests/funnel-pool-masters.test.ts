import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { calendlyEmbedUrl, calendlyUri, consentText, funnelSchema, hasCalendarStep, qualify, usesNativeCalendar, visibleQuestions } from '@/lib/funnels/schema';
import { verifyCalendlyBooking } from '@/lib/funnels/calendly';

const read = (path: string) => funnelSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
const ethan = read('content/funnels/clients/pool-masters-la.json');
const general = read('content/funnels/pool-remodeling.json');

describe('Ethan / Pool Masters LA funnel', () => {
  it('lists high-ticket services first, in the requested order, without Equipment Upgrade', () => {
    const service = ethan.questions[0];
    expect(service.options.map(o => o.label)).toEqual(['Full Pool Build', 'Full Pool Remodel', 'Backyard Renovation',
      'Pool Resurfacing / Replastering', 'Baja Shelf / Spa Addition', 'Tile & Coping', 'Decking / Pool Deck Renovation', 'Other Pool Project']);
    expect(service.options.filter(o => o.featured).map(o => o.value)).toEqual(['full_build', 'full_remodel', 'backyard']);
    expect(JSON.stringify(ethan)).not.toMatch(/equipment/i);
  });
  it('asks only project, ZIP, homeowner and timeline, and books on the HomeQuote calendar (no Calendly)', () => {
    expect(ethan.questions.map(q => q.id)).toEqual(['service', 'zip', 'homeowner', 'timeline']);
    expect(ethan.calendarProvider).toBe('homequote');
    expect(ethan.calendarUrl).toBeUndefined();
    expect(hasCalendarStep(ethan)).toBe(true);
    expect(JSON.stringify(ethan)).not.toMatch(/calendly/i);
    expect(ethan.calendarHeadline).toBe('Great — your project looks like a fit. Book a free call about your pool.');
    expect(consentText(ethan)).toContain('HomeQuote Network and Pool Masters LA');
    const answers = { service: 'full_build', zip: '91423', homeowner: 'yes', timeline: 'researching' };
    expect(qualify(ethan, answers)).toBe(true);
    expect(qualify(ethan, { ...answers, homeowner: 'no' })).toBe(false);
    expect(qualify(ethan, { ...answers, zip: '10001' })).toBe(false);
  });
  it('serves all five brochure counties: LA, Orange, Ventura, Riverside and San Bernardino', () => {
    const answers = { service: 'full_remodel', homeowner: 'yes', timeline: 'asap' };
    // Sherman Oaks (LA), Irvine / Anaheim / Huntington Beach (Orange), Ventura, Riverside,
    // Palm Desert (Riverside), San Bernardino, Rancho Cucamonga (San Bernardino).
    for (const zip of ['91423', '92618', '92801', '92648', '93003', '92507', '92260', '92401', '91730']) {
      expect(qualify(ethan, { ...answers, zip }), zip).toBe(true);
    }
    // San Diego and Bakersfield stay out.
    for (const zip of ['92101', '93301']) expect(qualify(ethan, { ...answers, zip }), zip).toBe(false);
  });
  it('leaves the general form unchanged, booking the HomeQuote team calendar', () => {
    expect(general.clientName).toBe('HomeQuote Network');
    expect(general.calendarProvider).toBe('homequote');
    expect(general.calendarUrl).toBeUndefined();
    expect(general.calendarHeadline).toBeUndefined();
    expect(general.questions[0].options.map(o => o.value)).toEqual(['full_remodel', 'resurfacing', 'tile', 'equipment', 'spa', 'backyard', 'other']);
    expect(general.questions[0].options.some(o => o.featured)).toBe(false);
    expect(visibleQuestions(general, { service: 'full_remodel' }).map(q => q.id)).toContain('remodel_scope');
  });
});

describe('calendar step', () => {
  it('is always on for the HomeQuote calendar, only with a URL for GHL / Calendly, and stored configs keep their meaning', () => {
    const { calendarProvider: _p, calendarUrl: _u, ...bare } = ethan;
    void _p; void _u;
    const stored = funnelSchema.parse(bare);
    expect(stored.calendarProvider).toBe('ghl');
    expect(hasCalendarStep(stored)).toBe(false);
    expect(hasCalendarStep(funnelSchema.parse({ ...bare, calendarUrl: 'https://ghl.example/widget', calendarId: 'c1' }))).toBe(true);
    expect(hasCalendarStep(funnelSchema.parse({ ...bare, calendarProvider: 'calendly' }))).toBe(false);
    expect(usesNativeCalendar(funnelSchema.parse({ ...bare, calendarProvider: 'homequote' }))).toBe(true);
  });
});

describe('Calendly embed (fallback)', () => {
  it('prefills name/email, passes UTMs and enables embed events', () => {
    const url = new URL(calendlyEmbedUrl('https://calendly.com/example/consult', 'homequotenet.com', { name: 'Ana Diaz', email: 'ana@example.test' }, { utm_campaign: 'pool-fall', fbclid: 'x' }));
    expect(Object.fromEntries(url.searchParams)).toEqual({ embed_domain: 'homequotenet.com', embed_type: 'Inline', hide_gdpr_banner: '1', name: 'Ana Diaz', email: 'ana@example.test', utm_campaign: 'pool-fall' });
  });
  it('only accepts calendly.com booking pages and Calendly API URIs', () => {
    expect(funnelSchema.safeParse({ ...ethan, calendarProvider: 'calendly', calendarUrl: 'https://evil.example/consult' }).success).toBe(false);
    expect(funnelSchema.safeParse({ ...ethan, calendarProvider: 'calendly', calendarUrl: 'https://calendly.com/pool/consult' }).success).toBe(true);
    expect(calendlyUri.safeParse('https://api.calendly.com/scheduled_events/abc-1/invitees/def-2').success).toBe(true);
    expect(calendlyUri.safeParse('https://evil.example/scheduled_events/abc').success).toBe(false);
  });
  it('verifies bookings with the Calendly API only when a token is configured', async () => {
    const event = 'https://api.calendly.com/scheduled_events/ev1'; const invitee = `${event}/invitees/in1`;
    expect(await verifyCalendlyBooking(event, invitee)).toEqual({ verified: false, startTime: null });
    vi.stubEnv('CALENDLY_API_TOKEN', 'token');
    const fetcher = vi.fn(async (uri: string) => Response.json({ resource: uri === invitee
      ? { event, status: 'active' } : { status: 'active', start_time: '2026-10-01T17:00:00.000000Z' } })) as unknown as typeof fetch;
    expect(await verifyCalendlyBooking(event, invitee, fetcher)).toEqual({ verified: true, startTime: '2026-10-01T17:00:00.000000Z' });
    expect(await verifyCalendlyBooking(event, 'https://api.calendly.com/scheduled_events/other/invitees/in1', fetcher)).toEqual({ verified: false, startTime: null });
    const failing = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await verifyCalendlyBooking(event, invitee, failing)).toEqual({ verified: false, startTime: null });
    vi.unstubAllEnvs();
  });
});
