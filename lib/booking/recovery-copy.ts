/**
 * Wording for the lead-recovery messages (lib/booking/recovery.server.ts,
 * lib/sms/reminders.ts): the owner's speed-to-lead alert, the "sorry we
 * missed you" after a no-show, the "couldn't reach you" after a missed call,
 * the follow-up to a lead who never booked, and the host's "did the call
 * happen?" prompt. Pure (no I/O) so tests and previews read exactly what is sent.
 *
 * Texts go through the Mac bridge, whose queue strips every link
 * (finalizeOutbound), so a text never carries one: it points to the email,
 * which has the "pick a new time" link and their design. Push text stays
 * lock-screen safe (lib/notifications: never a name, phone, address or money);
 * the email carries the details.
 */
import { finalizeOutbound } from '@/lib/sms/rules';
import { escapeHtmlText, prettyPhone, safeLink, shell, textOf, type BookingEmail, type Button, type EmailDesign } from '@/lib/emails/booking';
import type { LeadDesign } from '@/lib/leads/design.server';

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

/** What the call or visit is called: "free pool design call" / "design call", or "free estimate visit". */
export function callNames(o: { visit: boolean; noun: string | null }): { long: string; short: string } {
  if (o.visit) return { long: 'free estimate visit', short: 'visit' };
  if (o.noun === 'pool' || o.noun === 'bathroom' || o.noun === 'kitchen' || o.noun === 'ADU' || o.noun === 'roof') return { long: `free ${o.noun} design call`, short: 'design call' };
  return { long: 'free call', short: 'call' };
}

/** "Jordan R." (first name + last initial), else the first name, else "A homeowner". */
export function shortName(first: string | null | undefined, last: string | null | undefined): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (!f) return l ? `${l[0].toUpperCase()}.` : 'A homeowner';
  return l ? `${f} ${l[0].toUpperCase()}.` : f;
}

/** "Tue 10:15 AM" in the given zone. */
export function shortWhen(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(ms).replace(',', '');
}

/** The design as the email's "Your design" block shows it. */
export function emailDesign(d: LeadDesign | null | undefined): EmailDesign | null {
  if (!d) return null;
  return {
    heading: `Your ${d.tier ? `${d.tier} ` : ''}${d.noun} design`,
    recap: d.recap, range: d.range, examplePrices: d.examplePrices,
    photoUrl: d.photo?.url ?? null, photoAlt: d.photo?.alt ?? 'Your design', url: d.shareUrl,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Speed-to-lead alert (owner + calendar hosts)                     */
/* ------------------------------------------------------------------ */

export type SpeedEvent = 'submitted' | 'booked';

export interface SpeedAlertInput {
  event: SpeedEvent;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  /** "pool" / "bathroom" from the estimator, else the service ("bathroom remodel"). */
  noun: string;
  /** "Luxe" */
  tier: string | null;
  /** "Classic · Luxe · Zero-edge spa" */
  recap: string | null;
  /** "$85,000 – $110,000" */
  range: string | null;
  examplePrices?: boolean;
  /** The booked call's start, or null when not booked yet. */
  bookedAtMs: number | null;
  timeZone: string;
  /** Who calls ("Liam from Pool Masters"), for the booked line. */
  hostName?: string | null;
  phone: string | null;
  email: string | null;
  /** Absolute link to the lead in the app. */
  leadUrl: string;
  /** Absolute read-only design page. */
  designUrl?: string | null;
  /** The main design photo (absolute). */
  photoUrl?: string | null;
}

/** "🔥 New Luxe pool lead: Jordan R., Calabasas — booked Tue 10:15 AM" (or "— not booked yet"). */
export function speedHeadline(i: SpeedAlertInput): string {
  const what = `${i.tier ? `${i.tier} ` : ''}${i.noun}`;
  const where = i.city?.trim() ? `, ${i.city.trim()}` : '';
  const when = i.bookedAtMs !== null ? `booked ${shortWhen(i.bookedAtMs, i.timeZone)}` : 'not booked yet';
  return `🔥 New ${what} lead: ${shortName(i.firstName, i.lastName)}${where} — ${when}`;
}

/** tel: href from any US phone, or null. */
export function telLink(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null;
  return ten ? `tel:+1${ten}` : null;
}

export interface SpeedAlertCopy {
  /** Lock-screen safe: no name, phone or money. */
  pushTitle: string;
  pushBody: string;
  subject: string;
  html: string;
  text: string;
}

export function speedAlertCopy(i: SpeedAlertInput): SpeedAlertCopy {
  const what = `${i.tier ? `${i.tier} ` : ''}${i.noun}`;
  const when = i.bookedAtMs !== null ? `booked ${shortWhen(i.bookedAtMs, i.timeZone)}` : 'not booked yet';
  const headline = speedHeadline(i);
  const pushBody = [i.city?.trim() || null, i.recap].filter(Boolean).join(' · ') || 'Open HomeQuote for details';
  const tel = telLink(i.phone);
  const phone = prettyPhone(i.phone);
  const first = i.firstName?.trim() || 'them';
  const booked = i.bookedAtMs !== null
    ? `Call booked: ${new Intl.DateTimeFormat('en-US', { timeZone: i.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(i.bookedAtMs)}${i.hostName ? ` with ${i.hostName}` : ''}`
    : 'Not booked yet: call them now while they’re on their phone.';
  const facts = [
    i.recap ? `Their picks: ${i.recap}` : null,
    i.range ? `Ballpark: ${i.range} (not a quote${i.examplePrices ? '; example prices' : ''})` : null,
    booked,
    phone ? `Phone: ${phone}` : null,
    i.email ? `Email: ${i.email}` : null,
  ].filter((x): x is string => !!x);
  const lead = safeLink(i.leadUrl);
  const design = safeLink(i.designUrl);
  const photo = safeLink(i.photoUrl);
  const btn = (href: string, label: string, primary: boolean) =>
    `<a href="${escapeHtmlText(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:8px;background:${primary ? '#0038B8' : '#EEF3FC'};color:${primary ? '#ffffff' : '#0038B8'};font-size:15px;font-weight:700;text-decoration:none;">${escapeHtmlText(label)}</a>`;
  const html = [
    '<div style="margin:0;padding:0;background:#ffffff;color:#0A1B3D;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;"><div style="max-width:600px;padding:4px 0;">',
    `<p style="margin:0 0 14px 0;font-size:18px;font-weight:700;">${escapeHtmlText(headline)}</p>`,
    photo ? `<img src="${escapeHtmlText(photo)}" alt="Their design" width="420" style="display:block;width:100%;max-width:420px;height:auto;border-radius:10px;margin:0 0 14px 0;">` : '',
    `<p style="margin:0 0 16px 0;">${facts.map(escapeHtmlText).join('<br>')}</p>`,
    '<div style="margin:0 0 12px 0;">',
    tel ? btn(tel, `Call ${first}${phone ? ` · ${phone}` : ''}`, true) : '',
    lead ? btn(lead, 'Open the lead', !tel) : '',
    design ? btn(design, 'See their design', false) : '',
    '</div>',
    '<div style="margin-top:12px;border-top:1px solid #DCE4F2;padding-top:10px;font-size:13px;color:#5B6B8C;">HomeQuote Network · speed-to-lead alert. Switch it off under Texting → Reminders &amp; follow-ups.</div>',
    '</div></div>',
  ].join('');
  const text = [
    headline,
    facts.join('\n'),
    tel ? `Call ${first}: ${tel}` : null,
    lead ? `Open the lead: ${lead}` : null,
    design ? `Their design: ${design}` : null,
  ].filter(Boolean).join('\n\n');
  return { pushTitle: `🔥 New ${what} lead — ${when}`, pushBody, subject: headline, html, text };
}

/* ------------------------------------------------------------------ */
/* 2. No-show                                                          */
/* ------------------------------------------------------------------ */

const hiName = (first: string | null | undefined) => (first?.trim() ? `, ${first.trim()}` : '');

/** "Sorry we missed you, Jordan! Want to pick a new time for your free pool design call? Check your email for a link to pick a new time, or reply R." */
export function noShowText(o: { firstName: string | null; call: string; hasEmail: boolean }): string {
  const ask = `Sorry we missed you${hiName(o.firstName)}! Want to pick a new time for your ${o.call}?`;
  return finalizeOutbound(o.hasEmail ? `${ask} Check your email for a link to pick a new time, or reply R.` : `${ask} Just reply R and we’ll find one.`);
}

/* ------------------------------------------------------------------ */
/* 3. Missed call ("Couldn't reach them")                              */
/* ------------------------------------------------------------------ */

/** "Hi Jordan, Liam from Pool Masters here — tried calling you for your design call. Reply here or check your email to pick a new time." */
export function missedCallText(o: { firstName: string | null; host: string; call: string; hasEmail: boolean }): string {
  const hi = o.firstName?.trim() ? `Hi ${o.firstName.trim()}, ` : 'Hi, ';
  return finalizeOutbound(`${hi}${o.host} here — tried calling you for your ${o.call}. ${o.hasEmail ? 'Reply here or check your email to pick a new time.' : 'Reply here to pick a new time.'}`);
}

/* ------------------------------------------------------------------ */
/* 5. Never booked                                                     */
/* ------------------------------------------------------------------ */

/** "your Luxe pool design and ballpark are ready" (an estimator design), else null. */
function designReady(d: Pick<LeadDesign, 'tier' | 'noun' | 'range'> | null): string | null {
  if (!d) return null;
  return `your ${d.tier ? `${d.tier} ` : ''}${d.noun} design ${d.range ? 'and ballpark are' : 'is'} ready`;
}

/** "Hi Jordan, your Luxe pool design and ballpark are ready. Want a quick 10-minute call with Liam from Pool Masters to go over it? Reply with a good time, or check your email for a link to pick one." */
export function unbookedText(o: { firstName: string | null; design: Pick<LeadDesign, 'tier' | 'noun' | 'range'> | null; project: string | null; callLength: string; host: string; hasEmail: boolean }): string {
  const hi = o.firstName?.trim() ? `Hi ${o.firstName.trim()}, ` : 'Hi, ';
  const ready = designReady(o.design);
  const opener = ready ? `${hi}${ready}.` : `${hi}thanks for your ${o.project?.trim() || 'project'} request.`;
  const ask = `Want ${o.callLength} with ${o.host} to go over it?`;
  return finalizeOutbound(`${opener} ${ask} ${o.hasEmail ? 'Reply with a good time, or check your email for a link to pick one.' : 'Reply with a good time.'}`);
}

/* ------------------------------------------------------------------ */
/* Emails (no-show, missed call, never booked)                         */
/* ------------------------------------------------------------------ */

export type RecoveryEmailKind = 'no_show' | 'missed_call' | 'unbooked';

export interface RecoveryEmailInput {
  kind: RecoveryEmailKind;
  firstName: string | null;
  /** "Liam from Pool Masters" (or the company / HomeQuote). */
  host: string;
  /** The calendar's or contractor's name for the footer ("Pool Masters LA"). */
  brand: string;
  /** callNames(..).long: "free pool design call" / "free estimate visit". */
  call: string;
  visit: boolean;
  /** "a quick 10-minute call" */
  callLength: string;
  design: LeadDesign | null;
  project: string | null;
  /** Absolute "pick a (new) time" page; null = reply to this email. */
  pickUrl: string | null;
  /** The host's number to call back, if any. */
  hostPhone: string | null;
}

export function buildRecoveryEmail(i: RecoveryEmailInput): BookingEmail {
  const hi = i.firstName?.trim() ? `Hi ${i.firstName.trim()},` : 'Hi,';
  const pick = safeLink(i.pickUrl);
  const phone = prettyPhone(i.hostPhone);
  const design = emailDesign(i.design);
  let subject: string;
  let lines: string[];
  switch (i.kind) {
    case 'no_show':
      subject = `Sorry we missed you${hiName(i.firstName)}`;
      lines = [
        `Sorry we missed you${hiName(i.firstName)}! Want to pick a new time for your ${i.call}?`,
        i.visit
          ? pick ? 'Pick a time for a quick call below and we’ll set up a new visit with you.' : 'Just reply to this email and we’ll set up a new visit with you.'
          : pick ? 'Pick any open time below and we’ll call you then.' : 'Just reply to this email with a time that works.',
      ];
      break;
    case 'missed_call':
      subject = `${i.host} tried calling you`;
      lines = [hi, `${i.host} here. I tried calling you for your ${i.call} and couldn’t reach you.`, pick ? 'Pick a new time that works for you:' : 'Just reply to this email with a time that works.'];
      break;
    case 'unbooked': {
      const ready = designReady(i.design);
      subject = i.design ? `Your ${i.design.tier ? `${i.design.tier} ` : ''}${i.design.noun} design${i.design.range ? ' and ballpark' : ''}` : `Your ${i.project?.trim() || 'project'} request`;
      lines = [
        hi,
        ready ? `${ready[0].toUpperCase()}${ready.slice(1)}.` : `Thanks for your ${i.project?.trim() || 'project'} request.`,
        `Want ${i.callLength} with ${i.host} to go over it? ${pick ? 'Pick a time that works for you:' : 'Just reply to this email with a good time.'}`,
      ];
      break;
    }
  }
  if (phone) lines.push(`Prefer to call? ${phone}`);
  const buttons: Button[] = pick ? [{ label: i.kind === 'unbooked' ? 'Pick a time' : 'Pick a new time', url: pick }] : [];
  const footer = i.brand.toLowerCase().includes('homequote') ? 'HomeQuote Network · homequotenet.com' : `${i.brand} · through HomeQuote Network`;
  return { subject, html: shell(lines, buttons, footer, null, design), text: textOf(lines, buttons, footer, null, design) };
}

/* ------------------------------------------------------------------ */
/* Host prompt                                                         */
/* ------------------------------------------------------------------ */

/** Push to the host when a call is still "scheduled" 30 minutes after it ended (lock-screen safe). */
export function heldPromptCopy(startMs: number, timeZone: string): { title: string; body: string } {
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(startMs);
  return { title: `Did you reach them? (${time} call)`, body: 'Mark it held or no-show. A no-show gets a friendly “pick a new time” text and email.' };
}

/* ------------------------------------------------------------------ */
/* Staff feedback after "Couldn't reach them"                          */
/* ------------------------------------------------------------------ */

const TEXT_SKIPS: Record<string, string> = {
  texting_off: 'texting is off', bad_phone: 'no valid mobile number', opted_out: 'they opted out of texts', no_consent: 'they did not agree to texts',
  contractor_texting_off: 'texting is off for this contractor', phone_in_use: 'the number is in another conversation', daily_cap: 'the daily text limit was reached',
};

/** "Sent a text and an email with a link to pick a new time." / partial results in plain words. */
export function missedCallNotice(sms: string, email: string): string {
  const texted = sms === 'queued';
  const mailed = email === 'sent';
  if (texted && mailed) return 'Sent a text and an email with a link to pick a new time. Logged on the lead.';
  const parts = [
    texted ? 'Sent a text.' : `No text (${TEXT_SKIPS[sms] ?? 'it could not be sent'}).`,
    mailed ? 'Sent an email with a link to pick a new time.' : email === 'no_email' ? 'No email on file.' : 'The email could not be sent.',
  ];
  return `${parts.join(' ')} Logged on the lead.`;
}
