/**
 * Who calls the homeowner: the "host contact" of a booking calendar (0068
 * columns booking_calendars.host_*). It drives the homeowner-facing wording
 * ("Liam from Pool Masters will call you at the number ending 0123"), the
 * contact card on the "You're booked" screen and the vCard behind
 * "Save Liam's number" (GET /api/booking/contact/<calendarId>.vcf).
 *
 * Stored on the calendar (not in code) so the owner can change the person,
 * number or logo on /app/calendar/settings without a deploy. Unset fields
 * fall back here: the HomeQuote team / sales calendars default to Liam at
 * HomeQuote's main number; a contractor calendar has no host contact until
 * one is set (the wording then names the company, and no card is shown).
 * Pure: safe in the browser and on the server.
 */
import { site } from '@/content/site';

/** The raw columns (each null = use the default). */
export interface CalendarHostFields {
  displayName: string | null;
  firstName: string | null;
  org: string | null;
  /** E.164, e.g. "+17472175713". */
  phone: string | null;
  email: string | null;
  /** A file under /public/images, e.g. "/images/brand/poolmasters-logo.png". */
  photoPath: string | null;
  /** vCard NOTE; "{minutes}" is replaced with the call length. */
  note: string | null;
}

export const EMPTY_HOST_FIELDS: CalendarHostFields = {
  displayName: null, firstName: null, org: null, phone: null, email: null, photoPath: null, note: null,
};

/** A resolved host contact. */
export interface HostContact {
  /** "Liam from Pool Masters" */
  displayName: string;
  /** "Liam" (button label "Save Liam's number"); null = "Save our number". */
  firstName: string | null;
  /** "Pool Masters LA" */
  org: string;
  phone: string | null;
  email: string | null;
  photoPath: string | null;
  note: string;
}

/** HomeQuote's own calendars (team, sales) when nothing else is set. */
export const HOMEQUOTE_HOST: HostContact = {
  displayName: 'Liam from HomeQuote',
  firstName: 'Liam',
  org: 'HomeQuote Network',
  phone: site.contact.phoneHref,
  email: null,
  photoPath: '/images/brand/homequote-network-logo.webp',
  note: 'Your free {minutes}-minute call with HomeQuote. Save this so you know it’s us when we call.',
};

const DEFAULT_NOTE = 'Your free {minutes}-minute call. Save this so you know it’s us when we call.';

const clean = (v: string | null | undefined): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : null;
};

/**
 * The host contact for a calendar, or null for a contractor calendar nobody
 * has set one up for (then the copy falls back to the company name).
 */
export function resolveHostContact(cal: { kind: 'contractor' | 'team' | 'sales'; name: string; host?: CalendarHostFields | null }): HostContact | null {
  const h = cal.host ?? EMPTY_HOST_FIELDS;
  if (cal.kind !== 'contractor') {
    return {
      displayName: clean(h.displayName) ?? HOMEQUOTE_HOST.displayName,
      firstName: clean(h.firstName) ?? (clean(h.displayName) ? null : HOMEQUOTE_HOST.firstName),
      org: clean(h.org) ?? HOMEQUOTE_HOST.org,
      phone: clean(h.phone) ?? HOMEQUOTE_HOST.phone,
      email: clean(h.email),
      photoPath: clean(h.photoPath) ?? HOMEQUOTE_HOST.photoPath,
      note: clean(h.note) ?? HOMEQUOTE_HOST.note,
    };
  }
  const anything = Object.values(h).some((v) => clean(v));
  if (!anything) return null;
  const org = clean(h.org) ?? cal.name;
  const firstName = clean(h.firstName);
  return {
    displayName: clean(h.displayName) ?? (firstName ? `${firstName} from ${org}` : org),
    firstName,
    org,
    phone: clean(h.phone),
    email: clean(h.email),
    photoPath: clean(h.photoPath),
    note: clean(h.note) ?? DEFAULT_NOTE,
  };
}

/** The vCard NOTE with the call length filled in. */
export const hostNote = (h: Pick<HostContact, 'note'>, minutes: number) => h.note.replaceAll('{minutes}', String(minutes));

/** Public route of a calendar's vCard. */
export const hostVCardPath = (calendarId: string) => `/api/booking/contact/${encodeURIComponent(calendarId)}.vcf`;

/** "Liam - Pool Masters.vcf" (from "Liam from Pool Masters"), else the display name. */
export function hostVCardFilename(h: Pick<HostContact, 'displayName' | 'firstName' | 'org'>): string {
  const m = /^(.+?)\s+from\s+(.+)$/i.exec(h.displayName);
  const base = m ? `${m[1]} - ${m[2]}` : h.firstName ? `${h.firstName} - ${h.org}` : h.displayName;
  const safe = base.replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `${safe || 'Contact'}.vcf`;
}

/** "Save Liam’s number" / "Save our number". */
export const saveNumberLabel = (h: Pick<HostContact, 'firstName'>) => (h.firstName ? `Save ${h.firstName}’s number` : 'Save our number');

/** "+17472175713" -> "(747) 217-5713"; anything else as given. */
export function displayPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : phone;
}

/** "A quick 10-minute call" (15 minutes or less), else "A 30-minute call". */
export const callLengthPhrase = (minutes: number, video = false) =>
  `A ${minutes <= 15 ? 'quick ' : ''}${minutes}-minute ${video ? 'video ' : ''}call`;
