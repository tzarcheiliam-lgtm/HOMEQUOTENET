import { describe, expect, it } from 'vitest';
import {
  CALL_FOLLOW_UP_CATEGORY,
  CALL_FOLLOW_UP_SEEDS,
  CALLBACK_KEY,
  FOLLOW_UP_FOR,
  MEETING_CONFIRMED_KEY,
  VOICEMAIL_KEY,
  bestRecipient,
  draftFollowUp,
  quickTemplates,
  stripSignOff,
  type DraftInput,
} from '@/lib/emails/call-followups';
import { buildProspectEmailHtml, buildProspectEmailText, MORE_INFO_TEMPLATE_KEY, OPT_OUT_LINE } from '@/lib/emails/template';
import { buildRawGmailMessage } from '@/lib/emails/gmail-message';
import { findUnknownVariables } from '@/lib/emails/variables';
import { buildEmailTemplateSeedRows } from '@/lib/emails/template-library';

const base: DraftInput = {
  companyName: 'Blue Lagoon Pools',
  city: 'Pasadena',
  contactName: 'Dana Ruiz',
  services: [],
  sender: { name: 'Sam Setter', phone: '(555) 222-3333' },
  homequote: { siteUrl: 'https://homequotenet.com' },
};
const tpl = (key: string) => quickTemplates([]).find((t) => t.key === key)!;

describe('outcome → follow-up email', () => {
  it('offers an email only where a call reached someone or left a message', () => {
    expect(FOLLOW_UP_FOR.spoke_with_dm).toBe(MORE_INFO_TEMPLATE_KEY);
    expect(FOLLOW_UP_FOR.interested).toBe(MORE_INFO_TEMPLATE_KEY);
    expect(FOLLOW_UP_FOR.appointment_booked).toBe(MEETING_CONFIRMED_KEY);
    expect(FOLLOW_UP_FOR.left_voicemail).toBe(VOICEMAIL_KEY);
    expect(FOLLOW_UP_FOR.callback_requested).toBe(CALLBACK_KEY);
    for (const none of ['no_answer', 'not_interested', 'wrong_number', 'duplicate', 'do_not_call', 'new', 'calling'] as const) {
      expect(FOLLOW_UP_FOR[none]).toBeUndefined();
    }
  });

  it('every call template uses known variables and keeps the call-script promises', () => {
    for (const s of CALL_FOLLOW_UP_SEEDS) {
      const text = [s.subject, ...s.paragraphs].join('\n');
      expect(findUnknownVariables(text)).toEqual([]);
      expect(text).not.toMatch(/exclusiv|guarantee|\$\d|no upfront|hold your area/i);
    }
  });

  it('is in the seeded library under its own category', () => {
    const rows = buildEmailTemplateSeedRows('https://homequotenet.com');
    const keys = rows.filter((r) => r.category === CALL_FOLLOW_UP_CATEGORY).map((r) => r.key);
    expect(keys.sort()).toEqual(CALL_FOLLOW_UP_SEEDS.map((s) => s.key).sort());
    // The library text body round-trips to the quick-sheet body.
    const vm = rows.find((r) => r.key === VOICEMAIL_KEY)!;
    expect(stripSignOff(vm.text_body)).toBe(CALL_FOLLOW_UP_SEEDS.find((s) => s.key === VOICEMAIL_KEY)!.paragraphs.join('\n\n'));
  });
});

describe('drafts', () => {
  it('voicemail: first name, company, the sender and their number', () => {
    const d = draftFollowUp(tpl(VOICEMAIL_KEY), base);
    expect(d.subject).toBe('Sorry I missed you — Blue Lagoon Pools');
    expect(d.message).toContain('Hi Dana,');
    expect(d.message).toContain("I'm Sam Setter with HomeQuote Network");
    expect(d.message).toContain('call me back at (555) 222-3333.');
    expect(d.message).toContain('https://homequotenet.com');
    expect(d.message).not.toMatch(/\{\{|undefined|null/);
  });

  it('drops the call-me clause cleanly when the sender has no phone, and greets without a name', () => {
    const d = draftFollowUp(tpl(VOICEMAIL_KEY), { ...base, contactName: '', sender: { name: 'Sam', phone: null } });
    expect(d.message).toContain('Hi,');
    expect(d.message).toContain('Reply with a time that suits you.');
    expect(d.message).not.toMatch(/call me back at/);
  });

  it('meeting confirmed: day, time and zone where it was booked', () => {
    const d = draftFollowUp(tpl(MEETING_CONFIRMED_KEY), {
      ...base,
      when: { iso: '2026-10-29T17:00:00Z', timeZone: 'America/Los_Angeles', type: 'video' },
    });
    expect(d.subject).toBe('Confirmed: Thursday, Oct 29 at 10:00 AM — HomeQuote Network');
    expect(d.message).toContain('a video call with Liam on Thursday, Oct 29 at 10:00 AM PDT');
  });

  it('callback: the time they asked for', () => {
    const d = draftFollowUp(tpl(CALLBACK_KEY), { ...base, when: { iso: '2026-10-30T21:30:00Z', timeZone: 'America/New_York' } });
    expect(d.message).toContain("I'll call you back on Friday, Oct 30 at 5:30 PM EDT.");
  });

  it('"more info" keeps its own builder', () => {
    const d = draftFollowUp(tpl(MORE_INFO_TEMPLATE_KEY), { ...base, services: ['pool remodeling'] });
    expect(d.message).toContain('pool remodeling');
    expect(d.subject).toContain('Blue Lagoon Pools');
  });

  it('library edits win, hidden and inactive templates never show', () => {
    const list = quickTemplates([
      { key: VOICEMAIL_KEY, name: 'VM (edited)', subject: 'Edited', textBody: 'Edited body\n\n—\nHomeQuote Network\nhomequotenet.com', isActive: true },
      { key: 'contractor_second_follow_up', name: 'Hold your area', subject: 'x', textBody: 'x' },
      { key: 'contractor_trial_offer', name: 'Trial', subject: 'Trial', textBody: 'Trial', isActive: false },
    ]);
    expect(list.find((t) => t.key === VOICEMAIL_KEY)).toMatchObject({ name: 'VM (edited)', body: 'Edited body' });
    expect(list.some((t) => t.key === 'contractor_second_follow_up')).toBe(false);
    expect(list.some((t) => t.key === 'contractor_trial_offer')).toBe(false);
  });

  it('prefers the decision-maker, then the company inbox', () => {
    expect(bestRecipient({ decision_maker_email: 'dana@blue.com', email: 'info@blue.com' })).toBe('dana@blue.com');
    expect(bestRecipient({ decision_maker_email: null, email: 'info@blue.com' })).toBe('info@blue.com');
    expect(bestRecipient({})).toBe('');
  });
});

describe('signature and compliance footer', () => {
  it('signs as the sender, with their phone, and always carries the opt-out line', () => {
    const html = buildProspectEmailHtml('Hi Dana,\n\nThanks.', 'https://x.test/logo.png', { name: 'Sam Setter', phone: '(555) 222-3333' }, '123 Main St, Los Angeles, CA 90001');
    expect(html).toContain('>Sam Setter</div>');
    expect(html).not.toContain('>Liam</div>');
    expect(html).toContain('(555) 222-3333');
    expect(html).toContain('Reply &quot;stop&quot;');
    expect(html).toContain('123 Main St, Los Angeles, CA 90001');

    const text = buildProspectEmailText('Hi Dana,\n\nThanks.', { name: 'Sam Setter' }, null);
    expect(text).toContain('Best,\nSam Setter\nHomeQuote Network');
    expect(text).toContain(OPT_OUT_LINE);
  });

  it('still signs as Liam by default', () => {
    expect(buildProspectEmailHtml('Hi', 'https://x.test/logo.png')).toContain('>Liam</div>');
    expect(buildProspectEmailText('Hi')).toContain('Best,\nLiam\nHomeQuote Network');
  });
});

describe('Gmail message', () => {
  it("names the sender and attaches the meeting invite", () => {
    const raw = buildRawGmailMessage({
      fromEmail: 'sam@homequotenet.com',
      fromName: 'Sam Setter · HomeQuote Network',
      toEmail: 'dana@blue.com',
      subject: 'Confirmed',
      message: 'Hi',
      html: '<p>Hi</p>',
      attachments: [{ filename: 'homequote-meeting.ics', contentType: 'text/calendar; method=PUBLISH', content: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n' }],
    });
    const mime = Buffer.from(raw, 'base64url').toString('utf8');
    expect(mime).toMatch(/^From: =\?UTF-8\?B\?[^?]+\?= <sam@homequotenet\.com>/m);
    expect(Buffer.from(/From: =\?UTF-8\?B\?([^?]+)\?=/.exec(mime)![1], 'base64').toString('utf8')).toBe('Sam Setter · HomeQuote Network');
    expect(mime).toContain('Content-Type: multipart/mixed; boundary="hqn-prospect-email-mixed"');
    expect(mime).toContain('Content-Disposition: attachment; filename="homequote-meeting.ics"');
    expect(mime).toContain(Buffer.from('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n').toString('base64'));
  });

  it('drops a header-injection display name and unsafe attachment names', () => {
    const raw = buildRawGmailMessage({
      fromEmail: 'sam@homequotenet.com',
      fromName: 'Evil\r\nBcc: x@y.z',
      toEmail: 'dana@blue.com',
      subject: 'Hi',
      message: 'Hi',
      html: '<p>Hi</p>',
      attachments: [{ filename: '../../etc', contentType: 'text/plain', content: 'x' }],
    });
    const mime = Buffer.from(raw, 'base64url').toString('utf8');
    expect(mime).not.toMatch(/^Bcc:/m);
    expect(mime).not.toContain('multipart/mixed');
  });
});
