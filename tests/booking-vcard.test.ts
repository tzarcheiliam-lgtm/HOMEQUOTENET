import { describe, expect, it } from 'vitest';
import { buildHostVCard, foldLine, vcardEscape } from '@/lib/booking/vcard';
import { EMPTY_HOST_FIELDS, HOMEQUOTE_HOST, callLengthPhrase, hostNote, hostVCardFilename, hostVCardPath, resolveHostContact, saveNumberLabel } from '@/lib/booking/host-contact';
import { HOMEOWNER_CALL, DEFAULT_CALENDAR } from '@/lib/booking/types';

/** The host contact ("Liam from Pool Masters") and its vCard 3.0 (pure parts; the route is tested in booking-api). */
const PM = { displayName: 'Liam from Pool Masters', firstName: 'Liam', org: 'Pool Masters LA', phone: '+17472175713', email: null, photoPath: '/images/brand/poolmasters-logo.png', note: 'Your free {minutes}-minute pool design call. Save this so you know it’s us when we call.' };

describe('host contact', () => {
  it('homeowner calls are 10 minutes every 15 with a 5-minute buffer; the column defaults (sales) stay 30 / 30 / 15', () => {
    expect(HOMEOWNER_CALL).toEqual({ durationMinutes: 10, slotStepMinutes: 15, bufferMinutes: 5 });
    expect(DEFAULT_CALENDAR).toMatchObject({ durationMinutes: 30, slotStepMinutes: 30, bufferMinutes: 15 });
  });

  it('team / sales default to Liam at HomeQuote’s number; a contractor calendar has none until set', () => {
    expect(resolveHostContact({ kind: 'team', name: 'HomeQuote team', host: EMPTY_HOST_FIELDS })).toEqual(HOMEQUOTE_HOST);
    expect(HOMEQUOTE_HOST).toMatchObject({ displayName: 'Liam from HomeQuote', phone: '+17472175713', photoPath: '/images/brand/homequote-network-logo.webp' });
    expect(resolveHostContact({ kind: 'contractor', name: 'Other Pools', host: EMPTY_HOST_FIELDS })).toBeNull();
    expect(resolveHostContact({ kind: 'contractor', name: 'Other Pools', host: { ...EMPTY_HOST_FIELDS, firstName: 'Ana', phone: '+13105550100' } }))
      .toMatchObject({ displayName: 'Ana from Other Pools', org: 'Other Pools', phone: '+13105550100' });
  });

  it('labels, filename and path', () => {
    expect(saveNumberLabel(PM)).toBe('Save Liam’s number');
    expect(saveNumberLabel({ firstName: null })).toBe('Save our number');
    expect(hostVCardFilename(PM)).toBe('Liam - Pool Masters.vcf');
    expect(hostVCardFilename({ displayName: 'HomeQuote', firstName: null, org: 'HomeQuote Network' })).toBe('HomeQuote.vcf');
    expect(hostVCardFilename({ displayName: 'A/B: "x"', firstName: null, org: 'x' })).toBe('A B x.vcf');
    expect(hostVCardPath('abc')).toBe('/api/booking/contact/abc.vcf');
    expect(hostNote(PM, 10)).toBe('Your free 10-minute pool design call. Save this so you know it’s us when we call.');
    expect(callLengthPhrase(10)).toBe('A quick 10-minute call');
    expect(callLengthPhrase(30)).toBe('A 30-minute call');
  });
});

describe('vCard 3.0', () => {
  it('escapes text values and folds at 75 octets without splitting a character', () => {
    expect(vcardEscape(String.raw`a,b;c\d` + '\ne')).toBe(String.raw`a\,b\;c\\d\ne`);
    expect(foldLine('short')).toBe('short');
    const long = `NOTE:${'é'.repeat(60)}`; // 2 octets each
    const folded = foldLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const [i, l] of lines.entries()) {
      expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75);
      if (i > 0) expect(l.startsWith(' ')).toBe(true);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('has FN, N, ORG, TEL, NOTE, URL, optional EMAIL and PHOTO, CRLF line ends', () => {
    const v = buildHostVCard({ host: { ...PM, email: 'liam@homequotenet.com' }, minutes: 10, url: 'https://homequotenet.com', photo: { type: 'JPEG', base64: 'A'.repeat(500) } })!;
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
    expect(v.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const u = v.replace(/\r\n /g, '');
    expect(u.split('\r\n').slice(0, 3)).toEqual(['BEGIN:VCARD', 'VERSION:3.0', 'PRODID:-//HomeQuote Network//Booking contact//EN']);
    for (const line of ['FN:Liam from Pool Masters', 'N:;Liam from Pool Masters;;;', 'ORG:Pool Masters LA', 'TEL;TYPE=CELL,VOICE:+17472175713',
      'EMAIL;TYPE=INTERNET:liam@homequotenet.com', 'URL:https://homequotenet.com', 'NOTE:Your free 10-minute pool design call. Save this so you know it’s us when we call.',
      `PHOTO;ENCODING=b;TYPE=JPEG:${'A'.repeat(500)}`]) {
      expect(u.split('\r\n')).toContain(line);
    }
    const plain = buildHostVCard({ host: PM, minutes: 10 })!;
    expect(plain).not.toMatch(/EMAIL|PHOTO|URL/);
  });

  it('no usable number, no card', () => {
    expect(buildHostVCard({ host: { ...PM, phone: null }, minutes: 10 })).toBeNull();
    expect(buildHostVCard({ host: { ...PM, phone: '+1 555' }, minutes: 10 })).toBeNull();
  });
});
