import { calendlyEmbedUrl } from '@/lib/funnels/schema';
import { normalizeSelection, selectedRows } from '@/lib/estimator/configurator/engine';
import type { ConfiguratorSelection, ConfiguratorSpec } from '@/lib/estimator/configurator/types';
import {
  LEAD_FIELD_ORDER,
  normalizeZip,
  type EstimatorLeadRequest,
  type LeadContactInput,
} from '@/lib/estimator/lead-client';
import type { Answers } from '@/lib/estimator/types';

/*
 * Pure state for the configurator's booking step (no React): the request the
 * lead route receives, which field an error belongs to, the homeowner-facing
 * design summary and the inline calendar URL. Unit-tested in
 * tests/estimator-configurator-result.test.tsx.
 */

export type BookingFields = LeadContactInput & {
  /** Honeypot: stays empty for people. */
  website: string;
};

export const emptyBookingFields = (): BookingFields => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  zip: '',
  homeowner: '',
  consent: false,
  website: '',
});

/** Error keys the form shows next to a field; anything else is a message over the button. */
export const BOOKING_FIELDS: ReadonlySet<string> = new Set(LEAD_FIELD_ORDER);

/** The first field (in on-screen order) with an error, to focus. */
export function firstInvalidField(errors: Record<string, string>): string | null {
  return LEAD_FIELD_ORDER.find((key) => errors[key]) ?? null;
}

/** Server errors that are not about a field, joined for the alert over the button. */
export function generalErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors)
    .filter(([key]) => !BOOKING_FIELDS.has(key))
    .map(([, message]) => message);
}

/**
 * The lead request. The server re-prices from `configurator` (the selection);
 * `answers` (selectionToAnswers) goes along for older servers and logs. No prices.
 */
export function bookingRequest(input: {
  answers: Answers;
  selection: ConfiguratorSelection;
  fields: BookingFields;
  consentText: string;
  measurement: boolean;
  tracking?: EstimatorLeadRequest['tracking'];
  submissionId?: string;
}): EstimatorLeadRequest {
  const { fields } = input;
  return {
    answers: input.answers,
    configurator: { model: input.selection.model, picks: input.selection.picks, luxe: input.selection.luxe },
    zip: normalizeZip(fields.zip) ?? fields.zip.trim(),
    homeowner: fields.homeowner === 'no' ? 'no' : 'yes',
    contact: {
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      consent: fields.consent,
      website: fields.website,
    },
    consentText: input.consentText,
    measurement: input.measurement,
    ...(input.tracking ? { tracking: input.tracking } : {}),
    ...(input.submissionId ? { submissionId: input.submissionId } : {}),
  };
}

export type DesignHighlight = { group: string; items: { label: string; luxe: boolean; included: boolean }[] };

/**
 * "Your design" for the homeowner: each group with what is picked (add-on
 * groups with nothing picked are left out), Go Luxe rows marked.
 */
export function designHighlights(spec: ConfiguratorSpec, selection: ConfiguratorSelection): DesignHighlight[] {
  const sel = normalizeSelection(spec, selection);
  const rows = selectedRows(spec, sel);
  const luxe = sel.luxe && spec.bundle ? new Set(spec.bundle.rows) : new Set<string>();
  return spec.groups
    .map((g) => ({
      group: g.title,
      items: g.rows.filter((r) => rows.has(r.id)).map((r) => ({ label: r.label, luxe: luxe.has(r.id), included: Boolean(r.included) })),
    }))
    .filter((h) => h.items.length > 0);
}

/**
 * The calendar inline: Calendly links get the embed parameters (and keep the
 * name/email the server prefilled). Anything else is opened as a link only (null).
 */
export function calendarFrameUrl(url: string | undefined, host: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'calendly.com') return null;
    return calendlyEmbedUrl(url, host, {
      name: parsed.searchParams.get('name') ?? '',
      email: parsed.searchParams.get('email') ?? '',
    });
  } catch {
    return null;
  }
}

/** Phone input: keep what they typed, but tidy a bare 10-digit number to "(818) 555-0142" on blur. */
export function tidyPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length !== 10 || /[^\d\s().+-]/.test(value)) return value;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
