/**
 * Lead recovery wording (lib/booking/recovery-copy.ts), the shared design link (lib/estimator/share*.ts,
 * lib/estimator/share-view.ts), the "pick a new time" grant and the confirmation text's design line. Pure.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
process.env.BOOKING_TICKET_SECRET = 'test-booking-secret';
process.env.ESTIMATOR_RENDER_SECRET = 'test-share-secret';

import {
  buildRecoveryEmail, callNames, heldPromptCopy, missedCallNotice, missedCallText, noShowText, shortName, speedAlertCopy, speedHeadline, telLink, unbookedText,
  type SpeedAlertInput,
} from '@/lib/booking/recovery-copy';
import { bookingSms } from '@/lib/booking/sms-copy';
import { parseGrant, signRebookGrant } from '@/app/api/booking/_lib/grant';
import { shareDesignPath, shareMessage } from '@/lib/estimator/share';
import { signShare, signedSharePath, verifyShare } from '@/lib/estimator/share.server';
import { sharedDesignView } from '@/lib/estimator/share-view';
import { designFromEstimator } from '@/lib/leads/design.server';
import { funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { getEstimator } from '@/lib/estimator/registry';

const LA = 'America/Los_Angeles';
const TUE_1015 = Date.parse('2026-11-03T18:15:00Z'); // Tue Nov 3, 10:15 AM PST
const URL_RE = /https?:\/\/|www\./i;

const base: SpeedAlertInput = {
  event: 'booked', firstName: 'Jordan', lastName: 'Rivera', city: 'Calabasas', noun: 'pool', tier: 'Luxe', recap: 'Classic · Luxe · Zero-edge spa',
  range: '$85,000 – $110,000', examplePrices: true, bookedAtMs: TUE_1015, timeZone: LA, hostName: 'Liam from Pool Masters',
  phone: '(818) 555-0100', email: 'jordan@example.test', leadUrl: 'https://hq.test/app/leads/abc', designUrl: 'https://hq.test/estimator/pool-masters/my-design?size=classic', photoUrl: 'https://hq.test/p.webp',
};

describe('speed-to-lead alert', () => {
  it('headline: tier + noun, short name, city, booked time or "not booked yet"', () => {
    expect(speedHeadline(base)).toBe('🔥 New Luxe pool lead: Jordan R., Calabasas — booked Tue 10:15 AM');
    expect(speedHeadline({ ...base, event: 'submitted', bookedAtMs: null })).toBe('🔥 New Luxe pool lead: Jordan R., Calabasas — not booked yet');
    expect(speedHeadline({ ...base, tier: null, noun: 'bathroom remodel', city: null, lastName: null, bookedAtMs: null })).toBe('🔥 New bathroom remodel lead: Jordan — not booked yet');
    expect(shortName(null, null)).toBe('A homeowner');
  });

  it('push is lock-screen safe (no name, phone or money); the email has picks, ballpark, tap-to-call and the lead link', () => {
    const c = speedAlertCopy(base);
    expect(c.pushTitle).toBe('🔥 New Luxe pool lead — booked Tue 10:15 AM');
    expect(c.pushBody).toBe('Calabasas · Classic · Luxe · Zero-edge spa');
    for (const s of [c.pushTitle, c.pushBody]) {
      expect(s).not.toMatch(/Jordan|Rivera|555|\$/);
    }
    expect(c.subject).toBe('🔥 New Luxe pool lead: Jordan R., Calabasas — booked Tue 10:15 AM');
    expect(c.text).toContain('Their picks: Classic · Luxe · Zero-edge spa');
    expect(c.text).toContain('Ballpark: $85,000 – $110,000 (not a quote; example prices)');
    expect(c.text).toContain('Call booked: Tue, Nov 3, 10:15 AM PST with Liam from Pool Masters');
    expect(c.text).toContain('Call Jordan: tel:+18185550100');
    expect(c.text).toContain('Open the lead: https://hq.test/app/leads/abc');
    expect(c.html).toContain('href="tel:+18185550100"');
    expect(c.html).toContain('href="https://hq.test/app/leads/abc"');
    expect(c.html).toContain('src="https://hq.test/p.webp"');
    const notBooked = speedAlertCopy({ ...base, event: 'submitted', bookedAtMs: null });
    expect(notBooked.pushTitle).toBe('🔥 New Luxe pool lead — not booked yet');
    expect(notBooked.text).toContain('Not booked yet: call them now');
    expect(telLink('nope')).toBeNull();
  });

  it('escapes what the homeowner typed', () => {
    const c = speedAlertCopy({ ...base, firstName: '<b>x</b>', city: '"><script>' });
    expect(c.html).not.toContain('<script>');
    expect(c.html).not.toContain('<b>x</b>');
  });
});

describe('homeowner texts never carry a link and read as the owner asked', () => {
  it('no-show', () => {
    const call = callNames({ visit: false, noun: 'pool' }).long;
    expect(noShowText({ firstName: 'Jordan', call, hasEmail: true })).toBe('Sorry we missed you, Jordan! Want to pick a new time for your free pool design call? Check your email for a link to pick a new time, or reply R.');
    expect(noShowText({ firstName: null, call: callNames({ visit: true, noun: 'pool' }).long, hasEmail: false })).toBe('Sorry we missed you! Want to pick a new time for your free estimate visit? Just reply R and we’ll find one.');
  });
  it('missed call names the calendar host', () => {
    expect(missedCallText({ firstName: 'Jordan', host: 'Liam from Pool Masters', call: 'design call', hasEmail: true }))
      .toBe('Hi Jordan, Liam from Pool Masters here — tried calling you for your design call. Reply here or check your email to pick a new time.');
    expect(missedCallText({ firstName: 'Jordan', host: 'Liam from HomeQuote', call: 'call', hasEmail: false })).toBe('Hi Jordan, Liam from HomeQuote here — tried calling you for your call. Reply here to pick a new time.');
  });
  it('never booked', () => {
    expect(unbookedText({ firstName: 'Jordan', design: { tier: 'Luxe', noun: 'pool', range: '$1 – $2' }, project: null, callLength: 'a quick 10-minute call', host: 'Liam from Pool Masters', hasEmail: true }))
      .toBe('Hi Jordan, your Luxe pool design and ballpark are ready. Want a quick 10-minute call with Liam from Pool Masters to go over it? Reply with a good time, or check your email for a link to pick one.');
    expect(unbookedText({ firstName: 'Sam', design: null, project: 'bathroom remodel', callLength: 'a quick 10-minute call', host: 'Liam from HomeQuote', hasEmail: false }))
      .toBe('Hi Sam, thanks for your bathroom remodel request. Want a quick 10-minute call with Liam from HomeQuote to go over it? Reply with a good time.');
  });
  it('none of them contains a URL even if a name does', () => {
    for (const t of [
      noShowText({ firstName: 'www.spam.com', call: 'free call', hasEmail: true }),
      missedCallText({ firstName: 'Jo', host: 'https://evil.test', call: 'call', hasEmail: true }),
      unbookedText({ firstName: 'Jo', design: null, project: 'http://x.test', callLength: 'a call', host: 'Liam', hasEmail: true }),
    ]) expect(t).not.toMatch(URL_RE);
  });
  it('booking confirmation text says the design was emailed (only with an email)', () => {
    const ctx = { firstName: 'Pat', hostName: 'Pool Masters LA', startMs: TUE_1015, endMs: TUE_1015 + 600_000, timeZone: LA, meetingType: 'phone' as const, phone: '+13105550100', videoLink: null, manageUrl: null, icsUrl: null, host: { displayName: 'Liam from Pool Masters', firstName: 'Liam', phone: '+17472175713', vcardUrl: null } };
    expect(bookingSms('confirmed', ctx, { hasEmail: true, design: true })).toContain('We emailed you your design.');
    expect(bookingSms('confirmed', ctx, { hasEmail: false, design: true })).not.toContain('emailed you your design');
    expect(bookingSms('confirmed', ctx, { hasEmail: true })).not.toContain('emailed you your design');
  });
});

describe('recovery emails carry the link and the design', () => {
  const design = { slug: 'pool-masters', noun: 'pool', tier: 'Luxe', recap: 'Classic · Luxe · Zero-edge spa', range: '$85,000 – $110,000', examplePrices: true,
    photo: { url: 'https://hq.test/p.webp', alt: 'Pool' }, shareUrl: 'https://hq.test/estimator/pool-masters/my-design?size=classic&v=x' };
  const common = { firstName: 'Jordan', host: 'Liam from Pool Masters', brand: 'Pool Masters LA', visit: false, callLength: 'a quick 10-minute call', design, project: null, pickUrl: 'https://hq.test/booking/pick/hqr1.abc', hostPhone: '+17472175713' };
  it('no-show', () => {
    const m = buildRecoveryEmail({ ...common, kind: 'no_show', call: 'free pool design call' });
    expect(m.subject).toBe('Sorry we missed you, Jordan');
    expect(m.text).toContain('Sorry we missed you, Jordan! Want to pick a new time for your free pool design call?');
    expect(m.text).toContain('Pick a new time: https://hq.test/booking/pick/hqr1.abc');
    expect(m.text).toContain('Your Luxe pool design:');
    expect(m.text).toContain('See your design: https://hq.test/estimator/pool-masters/my-design?size=classic&v=x');
    expect(m.html).toContain('src="https://hq.test/p.webp"');
  });
  it('missed call and never booked', () => {
    const missed = buildRecoveryEmail({ ...common, kind: 'missed_call', call: 'design call' });
    expect(missed.subject).toBe('Liam from Pool Masters tried calling you');
    expect(missed.text).toContain('Liam from Pool Masters here. I tried calling you for your design call');
    const unbooked = buildRecoveryEmail({ ...common, kind: 'unbooked', call: 'call' });
    expect(unbooked.subject).toBe('Your Luxe pool design and ballpark');
    expect(unbooked.text).toContain('Your Luxe pool design and ballpark are ready.');
    expect(unbooked.text).toContain('Pick a time: https://hq.test/booking/pick/hqr1.abc');
    expect(unbooked.text).toContain('Prefer to call? (747) 217-5713');
  });
  it('host prompt and staff notice', () => {
    expect(heldPromptCopy(TUE_1015, LA)).toEqual({ title: 'Did you reach them? (10:15 AM call)', body: 'Mark it held or no-show. A no-show gets a friendly “pick a new time” text and email.' });
    expect(missedCallNotice('queued', 'sent')).toBe('Sent a text and an email with a link to pick a new time. Logged on the lead.');
    expect(missedCallNotice('texting_off', 'no_email')).toBe('No text (texting is off). No email on file. Logged on the lead.');
  });
});

describe('"pick a new time" grant', () => {
  it('signs, verifies and expires; forged ones fail', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const g = signRebookGrant(id)!;
    expect(parseGrant(g)).toEqual({ kind: 'rebook', appointmentId: id });
    expect(parseGrant(g.slice(0, -3) + 'AAA')).toBeNull();
    expect(parseGrant(signRebookGrant(id, Date.now() - 15 * 86_400_000))).toBeNull();
    expect(parseGrant(g.replace(id, '11111111-2222-4333-8444-555555555556'))).toBeNull();
  });
});

describe('shared design link', () => {
  const found = getEstimator('pool-masters')!;
  const spec = funnelSpecFor(found.contractor)!;
  const sel = { size: 'classic', finish: 'luxe', extras: 'spa', spa: 'zero_edge' };

  it('holds only the picks and a signature; the signature is checked against the picks', () => {
    const path = signedSharePath('pool-masters', spec, sel);
    expect(path).toMatch(/^\/estimator\/pool-masters\/my-design\?/);
    const params = new URL(path, 'https://x.test').searchParams;
    expect([...params.keys()].every((k) => [...spec.steps.map((s) => s.id), 'v'].includes(k))).toBe(true);
    expect(path).not.toMatch(/lead|email|phone|name/i);
    const sig = params.get('v');
    expect(verifyShare('pool-masters', spec, sel, sig)).toBe(true);
    expect(verifyShare('pool-masters', spec, { ...sel, finish: 'standard' }, sig)).toBe(false);
    expect(verifyShare('other-slug', spec, sel, sig)).toBe(false);
    expect(verifyShare('pool-masters', spec, sel, 'x')).toBe(false);
    expect(shareDesignPath('pool-masters', spec, sel, signShare('pool-masters', spec, sel))).toBe(path);
    expect(shareMessage('Pool Masters LA', 'pool')).toEqual({ title: 'My pool design · Pool Masters LA', text: 'Here’s the pool I designed with Pool Masters LA. Take a look:' });
  });

  it('the page shows picks + photos, and the ballpark only for a signed link', () => {
    const signed = sharedDesignView(spec, found.template, sel, true);
    expect(signed.picks.map((p) => p.stepId)).toEqual(['size', 'finish', 'extras', 'spa']);
    expect(signed.range).toMatch(/^\$[\d,]+ – \$[\d,]+$/);
    expect(signed.main.src).toMatch(/\.(webp|jpg|png)$/);
    expect(signed.main).toEqual(signed.picks.find((p) => p.stepId === 'extras')!.photo);
    expect(sharedDesignView(spec, found.template, sel, false).range).toBeNull();
  });

  it('the lead design read back from the estimator timeline entry has the signed share link and main photo', () => {
    const d = designFromEstimator({ estimator: { slug: 'pool-masters', low: 85_000, high: 110_000, pricesConfirmed: false, funnel: { selection: sel },
      configurator: { photos: [{ view: 'size', url: 'https://hq.test/a.webp', alt: 'a' }, { view: 'extras', url: 'https://hq.test/b.webp', alt: 'b' }] } } }, 'https://hq.test/');
    expect(d).toMatchObject({ noun: 'pool', tier: 'Luxe', range: '$85,000 – $110,000', examplePrices: true, photo: { url: 'https://hq.test/b.webp' } });
    expect(d!.recap).toContain('Luxe');
    expect(d!.shareUrl).toBe(`https://hq.test${signedSharePath('pool-masters', spec, sel)}`);
    expect(designFromEstimator({}, 'https://hq.test')).toBeNull();
  });
});
