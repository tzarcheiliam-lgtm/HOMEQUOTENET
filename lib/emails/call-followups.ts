import type { ProspectDisposition } from '@/lib/types';
import { buildMoreInfoAfterCallEmail, MORE_INFO_TEMPLATE_KEY } from '@/lib/emails/template';
import { renderEmailTemplate, type EmailTemplateContext } from '@/lib/emails/variables';

/**
 * Follow-up emails for the call workspace: which email a call outcome calls
 * for, the short templates written for it, and how a draft is filled in.
 * Pure and browser-safe — the quick sheet drafts on the client, the server
 * sends exactly what the caller reviewed.
 *
 * Copy rules (same as the call script): no exclusivity, no guaranteed results,
 * no pricing promises; meetings are with Liam, who closes.
 */

export const MEETING_CONFIRMED_KEY = 'call_meeting_confirmed';
export const VOICEMAIL_KEY = 'call_voicemail_follow_up';
export const GATEKEEPER_KEY = 'call_gatekeeper_intro';
export const CALLBACK_KEY = 'call_callback_scheduled';
export const IF_ANYTHING_CHANGES_KEY = 'call_if_anything_changes';

export const CALL_FOLLOW_UP_CATEGORY = 'Cold Call Follow-Up';

/** The email offered automatically after logging each outcome; absent = no email. */
export const FOLLOW_UP_FOR: Partial<Record<ProspectDisposition, string>> = {
  spoke_with_dm: MORE_INFO_TEMPLATE_KEY,
  interested: MORE_INFO_TEMPLATE_KEY,
  follow_up_required: MORE_INFO_TEMPLATE_KEY,
  appointment_booked: MEETING_CONFIRMED_KEY,
  callback_requested: CALLBACK_KEY,
  left_voicemail: VOICEMAIL_KEY,
  gatekeeper: GATEKEEPER_KEY,
};

/** Library templates never offered as a quick action (copy that needs a human decision). */
export const QUICK_HIDDEN_TEMPLATES = ['contractor_second_follow_up'];

export interface CallFollowUpSeed {
  key: string;
  name: string;
  subject: string;
  description: string;
  paragraphs: string[];
}

export const CALL_FOLLOW_UP_SEEDS: CallFollowUpSeed[] = [
  {
    key: VOICEMAIL_KEY,
    name: 'Sorry I missed you (after a voicemail)',
    subject: 'Sorry I missed you — {{contractor.name}}',
    description: 'Sent right after leaving a voicemail. Works to a general inbox too.',
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "I just left you a voicemail — I'm {{sender.name}} with HomeQuote Network. We talk with homeowners in your area about their pool projects, qualify them, and book the good ones straight onto your calendar.",
      'Worth a quick 15-minute call? Reply with a time that suits you, or call me back at {{sender.phone}}.',
      'You can see how it works at {{homequote.site_url}}.',
    ],
  },
  {
    key: GATEKEEPER_KEY,
    name: 'For the owner (after a gatekeeper)',
    subject: 'For the owner of {{contractor.name}}',
    description: 'Sent after talking to the front desk, to pass along to the decision-maker.',
    paragraphs: [
      'Hi,',
      'Thanks for taking my call earlier. Could you please pass this along to whoever handles new business at {{contractor.name}}?',
      "I'm {{sender.name}} with HomeQuote Network. We speak with homeowners about their pool projects, qualify each one, and book a specific day and time for the contractor to meet them.",
      "If it's worth a 15-minute call, just reply or call me at {{sender.phone}}.",
    ],
  },
  {
    key: CALLBACK_KEY,
    name: 'Talk soon (callback scheduled)',
    subject: 'Talking {{appointment.date}} — {{contractor.name}}',
    description: 'Confirms the callback time the contractor asked for.',
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Thanks for picking up today. As promised, I'll call you back on {{appointment.date}} at {{appointment.time}} {{appointment.time_zone}}.",
      "I'll keep it short: how we qualify homeowners, how the booked appointments land on your calendar, and whether your area is a fit.",
      'If another time works better, just reply.',
    ],
  },
  {
    key: MEETING_CONFIRMED_KEY,
    name: 'Meeting confirmed (sales meeting booked)',
    subject: 'Confirmed: {{appointment.date}} at {{appointment.time}} — HomeQuote Network',
    description: 'Confirms a booked sales meeting with Liam. A calendar invite is attached when sent from the call workspace.',
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "You're confirmed for a {{appointment.how}} with Liam on {{appointment.date}} at {{appointment.time}} {{appointment.time_zone}}. A calendar invite is attached.",
      "Liam will walk you through how we qualify homeowners and book them onto your calendar, and answer any questions. It takes about 15 minutes.",
      'If you need to move it, just reply to this email. Looking forward to it.',
    ],
  },
  {
    key: IF_ANYTHING_CHANGES_KEY,
    name: 'If anything changes (not interested)',
    subject: 'If anything changes — HomeQuote Network',
    description: 'A respectful close after a no. Never offered automatically.',
    paragraphs: [
      'Hi {{contractor.contact_name}},',
      "Thanks for your time today — understood that now isn't the right time.",
      'If you ever want more booked pool appointments, just reply to this email and we can pick it up. No more follow-ups from me until then.',
    ],
  },
];

export interface QuickTemplate {
  key: string;
  name: string;
  subject: string;
  /** Plain text with {{tokens}}, without a sign-off (the signature is added on send). */
  body: string;
}

/** Strips the library's own "— HomeQuote Network" sign-off; the sender's signature is added on send. */
export function stripSignOff(textBody: string): string {
  return textBody.replace(/\n\n—\n[\s\S]*$/, '').trim();
}

/**
 * The quick-sheet templates: the library's current text (admins edit it on
 * /app/email-templates) for every active prospect template, falling back to
 * the built-in copy for any call follow-up not in the database yet.
 */
export function quickTemplates(
  library: { key: string; name: string; subject: string; textBody: string; isActive?: boolean }[]
): QuickTemplate[] {
  const out = new Map<string, QuickTemplate>();
  out.set(MORE_INFO_TEMPLATE_KEY, { key: MORE_INFO_TEMPLATE_KEY, name: 'More info after our call', subject: '', body: '' });
  for (const s of CALL_FOLLOW_UP_SEEDS) {
    out.set(s.key, { key: s.key, name: s.name, subject: s.subject, body: s.paragraphs.join('\n\n') });
  }
  for (const t of library) {
    if (t.isActive === false || QUICK_HIDDEN_TEMPLATES.includes(t.key)) continue;
    out.set(t.key, { key: t.key, name: t.name, subject: t.subject, body: stripSignOff(t.textBody) });
  }
  return [...out.values()];
}

export interface DraftInput {
  companyName: string;
  city: string | null;
  contactName: string;
  services: string[];
  sender: { name: string; phone: string | null };
  /** Meeting or callback time, with the zone it was booked in. */
  when?: { iso: string; timeZone: string; type?: string | null } | null;
  homequote?: EmailTemplateContext['homequote'];
}

const HOW: Record<string, string> = { phone: 'phone call', video: 'video call', in_person: 'meeting' };

function zoned(iso: string, timeZone: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d);
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return { date, time, zone };
}

export function contextFor(d: DraftInput): EmailTemplateContext {
  const [first, ...rest] = d.contactName.trim().split(/\s+/).filter(Boolean);
  const w = d.when ? zoned(d.when.iso, d.when.timeZone) : null;
  return {
    contractor: { name: d.companyName, contact_name: first ?? '', city: d.city ?? '' },
    // Older contractor templates use lead.* for the person and place being written to.
    lead: { first_name: first ?? '', last_name: rest.join(' '), city: d.city ?? '' },
    appointment: w
      ? { date: w.date, time: w.time, time_zone: w.zone, how: HOW[d.when?.type ?? ''] ?? 'call' }
      : { how: 'call' },
    sender: { name: d.sender.name, phone: d.sender.phone ?? '' },
    homequote: d.homequote,
  };
}

/** Subject and body for a template, filled in. */
export function draftFollowUp(template: QuickTemplate, d: DraftInput): { subject: string; message: string } {
  if (template.key === MORE_INFO_TEMPLATE_KEY) {
    return buildMoreInfoAfterCallEmail({ company_name: d.companyName }, d.contactName, d.services);
  }
  const ctx = contextFor(d);
  return {
    subject: renderEmailTemplate(template.subject, ctx).replace(/\s+—\s*$/, '').trim(),
    message: renderEmailTemplate(template.body, ctx)
      // An empty phone leaves "or call me back at ." — drop the dangling clause.
      .replace(/,? or call me(?: back)? at\s*\./g, '.')
      .replace(/ or call me at\s*\./g, '.'),
  };
}

/** Best address: the decision-maker's, else the company's general inbox. */
export function bestRecipient(p: { decision_maker_email?: string | null; email?: string | null }): string {
  return (p.decision_maker_email || p.email || '').trim();
}

/** A readable name for a logged template key ("Sorry I missed you", "Contractor trial offer"…). */
export function templateLabel(key: string): string {
  if (key === MORE_INFO_TEMPLATE_KEY) return 'More info after our call';
  const seed = CALL_FOLLOW_UP_SEEDS.find((x) => x.key === key);
  if (seed) return seed.name.replace(/\s*\(.*\)$/, '');
  const words = key.replace(/^call_/, '').split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
