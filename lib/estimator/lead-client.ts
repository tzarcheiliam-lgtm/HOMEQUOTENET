import { consentText, type FunnelConfig } from '../funnels/schema.ts';
import { normalizeSelection, selectedRows } from './configurator/engine.ts';
import type { ConfiguratorSelection, ConfiguratorSpec } from './configurator/types.ts';
import { normalizeFunnelSelection, pickedOptions } from './funnel/engine.ts';
import type { FunnelSelection, FunnelSpec } from './funnel/types.ts';
import { addressZip, currentPlace, type AddressPlace } from './address-client.ts';
import type { Answers, Estimate, PoolDimensions } from './types.ts';

/**
 * Browser side of estimator lead capture: the request/response contract
 * between the estimator screen and POST /api/estimator/[slug]/lead.
 * The server recomputes the estimate; the client never sends prices.
 */

/** Same choices as the Pool Masters funnel timeline question. */
export const LEAD_TIMELINES = [
  { id: 'asap', label: 'As soon as possible' },
  { id: '1_3_months', label: 'Within 1–3 months' },
  { id: '3_6_months', label: 'Within 3–6 months' },
  { id: 'researching', label: 'Just researching' },
] as const;
export type LeadTimeline = (typeof LEAD_TIMELINES)[number]['id'];

export type EstimatorLeadRequest = {
  answers: Answers;
  dimensions?: PoolDimensions;
  /** Gallery image srcs the homeowner liked. */
  likedLooks?: string[];
  /** "Anything else we should know?" */
  note?: string;
  zip: string;
  /**
   * The home's full address (the funnel's "Home address" field), with what the
   * picked Google place adds when there is one. The ZIP above is still the one
   * the server validates and the service area uses.
   */
  address?: string;
  addressDetails?: { city?: string; state?: string; lat?: number; lng?: number; verified: boolean };
  /** Always asked (the funnel's qualification rules read it); never assumed. */
  homeowner: 'yes' | 'no';
  /** Optional: the one-page configurator does not ask it (the funnel's timeline question then stays open). */
  timeline?: LeadTimeline;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    consent: boolean;
    /** Honeypot: must be empty. */
    website: string;
  };
  /** The exact consent wording shown next to the checkbox; the server rejects a mismatch. */
  consentText: string;
  /** The visitor's "Allow optional advertising measurement" choice. */
  measurement: boolean;
  /** Browser Meta ids for event deduplication (optional). */
  tracking?: { fbc?: string; fbp?: string; eventId?: string; pageUrl?: string };
  /**
   * The one-page configurator's design (experience 'configurator'). The server
   * re-derives the answers, the price (Go Luxe saving included), the plain-words
   * summary and the photo links from it; `answers` is then ignored.
   */
  configurator?: ConfiguratorSelection;
  /**
   * The simple funnel's picks (experience 'funnel'): option id per step id,
   * e.g. { size: 'classic', finish: 'luxe', extras: 'spa' }. The server
   * re-derives the answers, the price, the plain-words summary and the photo
   * links from it; `answers` and `configurator` are then ignored.
   */
  funnel?: FunnelSelection;
  /**
   * One id per submission, reused by the automatic retry, so a retry after a
   * lost response gets the first reply back instead of saving the lead twice.
   */
  submissionId?: string;
};

export type EstimatorLeadResponse =
  | {
      ok: true;
      /** Server-computed; the screen shows this one. */
      estimate: Estimate;
      /** false for renters / out-of-area ZIPs (lead still saved for review). */
      qualified: boolean;
      /** External booking link (the Calendly / link fallback); absent on the HomeQuote calendar. */
      calendarUrl?: string;
      /**
       * Booking ticket for the HomeQuote calendar (the public booking API's grant, a
       * week long): qualified leads that were saved, on a natively booking estimator.
       */
      bookingTicket?: string;
      /** Short-lived token for the optional photoreal render (absent when renders are off). */
      renderToken?: string;
      /** false when nothing was saved (an unqualified visitor on a funnel set to 'stop'). */
      saved?: boolean;
    }
  | {
      ok: false;
      errors: Record<string, string>;
      /** With a consent error: the wording the server accepts now (show it, ask for the box again). */
      consentText?: string;
    };

/**
 * The consent wording for an estimator whose leads go to `funnelClientName`'s funnel.
 * Same text the funnel shows and stores (consentText only reads clientName), so the
 * stored disclosure always matches what the homeowner saw.
 */
export function estimatorConsentText(funnelClientName: string): string {
  return consentText({ clientName: funnelClientName } as FunnelConfig);
}

/* ------------------------------------------------------------------ */
/* Field checks (the same rules as the server, with clearer words)    */
/* ------------------------------------------------------------------ */

/** "(818) 555-0142", "+1 818-555-0142", "818.555.0142" -> "8185550142"; null when it is not a US number. */
export function usPhoneDigits(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : null;
}

/** "91301", " 91301 ", "91301-1234" -> "91301"; null otherwise. */
export function normalizeZip(value: string): string | null {
  const m = /^\s*(\d{5})(?:[\s-]?\d{4})?\s*$/.exec(value);
  return m ? m[1] : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type LeadContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  homeowner: '' | 'yes' | 'no';
  consent: boolean;
};

/** Order the form shows its fields in: the first one with a problem gets focus. */
export const LEAD_FIELD_ORDER = ['firstName', 'lastName', 'phone', 'email', 'zip', 'homeowner', 'consent'] as const;

/** Specific, fixable messages per field (empty object = ready to send). */
export function leadFieldErrors(input: LeadContactInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.firstName.trim()) errors.firstName = 'Enter your first name.';
  else if (input.firstName.trim().length > 80) errors.firstName = 'Use 80 characters or fewer.';
  if (!input.lastName.trim()) errors.lastName = 'Enter your last name.';
  else if (input.lastName.trim().length > 80) errors.lastName = 'Use 80 characters or fewer.';
  const phoneDigits = input.phone.replace(/\D/g, '');
  if (!phoneDigits) errors.phone = 'Enter your phone number so we can reach you.';
  else if (phoneDigits.length < 10) errors.phone = `That number has ${phoneDigits.length} digits. Enter all 10, like (818) 555-0142.`;
  else if (!usPhoneDigits(input.phone)) {
    errors.phone = phoneDigits.length > 11 || (phoneDigits.length === 11 && !phoneDigits.startsWith('1'))
      ? 'Enter a US number: 10 digits, like (818) 555-0142.'
      : 'Check the number: US area codes and exchanges never start with 0 or 1.';
  }
  const email = input.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(email) || email.length > 254) errors.email = 'Check your email address, e.g. name@example.com.';
  if (!input.zip.trim()) errors.zip = 'Enter the ZIP code of the property.';
  else if (!normalizeZip(input.zip)) errors.zip = 'Enter a 5-digit ZIP code, like 91302.';
  if (!input.homeowner) errors.homeowner = 'Tell us whether you own the home.';
  if (!input.consent) errors.consent = 'Please tick the box so we can contact you about your design.';
  return errors;
}

/* ------------------------------------------------------------------ */
/* Funnel contact step (one "Name" field)                              */
/* ------------------------------------------------------------------ */

/**
 * "Jane Doe" -> { firstName: "Jane", lastName: "Doe" }; "Mary Ann van der Berg" ->
 * { "Mary", "Ann van der Berg" }. Null without at least two words (the lead
 * needs a first and a last name).
 */
export function splitFullName(value: string): { firstName: string; lastName: string } | null {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  return { firstName: words[0], lastName: words.slice(1).join(' ') };
}

export type FunnelContactInput = {
  name: string;
  email: string;
  phone: string;
  /** "Home address": picked from Google's suggestions or typed. */
  address: string;
  /** The picked Google place (its ZIP wins while the field still shows its address). */
  place?: AddressPlace | null;
  homeowner: '' | 'yes' | 'no';
  consent: boolean;
};

/** On-screen order of the funnel contact form: the first field with a problem gets focus. */
export const FUNNEL_FIELD_ORDER = ['name', 'email', 'phone', 'address', 'homeowner', 'consent'] as const;

export const ADDRESS_NEEDS_ZIP = 'Add your ZIP code to the address';

/**
 * The same rules as leadFieldErrors (and the server), for the funnel's single
 * name field and its address field (the ZIP comes from the picked place or the
 * typed address). Server errors on firstName / lastName belong to "name", on
 * zip to "address" (funnelErrorKey).
 */
export function funnelContactErrors(
  input: FunnelContactInput,
  /**
   * consentOnSubmit: the consent wording sits under the button and tapping it is the
   * agreement (no checkbox), so there is no box to tick.
   */
  opts: { consentOnSubmit?: boolean } = {},
): Record<string, string> {
  const { consentOnSubmit = false } = opts;
  const split = splitFullName(input.name);
  const zip = addressZip(input.address, input.place) ?? '';
  const errors = leadFieldErrors({ ...input, zip, firstName: split?.firstName ?? input.name.trim(), lastName: split?.lastName ?? '' });
  const out: Record<string, string> = {};
  if (!input.name.trim()) out.name = 'Enter your name.';
  else if (!split) out.name = 'Enter your first and last name, like Jane Smith.';
  else if (errors.firstName || errors.lastName) out.name = 'Use 80 characters or fewer for each name.';
  for (const key of ['email', 'phone'] as const) if (errors[key]) out[key] = errors[key];
  const address = input.address.trim();
  if (!address) out.address = 'Enter the address of the home.';
  else if (address.length > 300) out.address = 'Use 300 characters or fewer.';
  else if (!currentPlace(input.address, input.place) && !/[A-Za-z]/.test(address)) out.address = 'Enter the street address, like 12 Elm St, Calabasas, CA 91302.';
  else if (!zip) out.address = ADDRESS_NEEDS_ZIP;
  if (errors.homeowner) out.homeowner = 'Tell us whether this pool is at your home.';
  if (!consentOnSubmit && errors.consent) out.consent = errors.consent;
  return out;
}

/** A server error key as the funnel form shows it (firstName / lastName -> name, zip -> address). */
export const funnelErrorKey = (key: string) =>
  key === 'firstName' || key === 'lastName' ? 'name' : key === 'zip' || key === 'addressDetails' ? 'address' : key;

/**
 * The funnel design in plain words, one line per step, e.g.
 * "Select your pool size: Classic (About 30 × 15 ft)".
 */
export function describeFunnelDesign(spec: FunnelSpec, selection: FunnelSelection): string[] {
  const sel = normalizeFunnelSelection(spec, selection);
  const picked = pickedOptions(spec, sel);
  return spec.steps.map((s, i) => `${s.label.replace(/[.?!]$/, '')}: ${picked[i].title} (${picked[i].subtitle})`);
}

/* ------------------------------------------------------------------ */
/* Configurator design in plain words                                  */
/* ------------------------------------------------------------------ */

/**
 * The design as the contractor reads it, one line per group:
 * "Size: Classic, 30 × 15 ft", "Go Luxe: Pebble, Glass tile, travertine coping, ...",
 * "Pool finish: Pebble (Go Luxe)", "Pool features: Spa (Go Luxe), Baja shelf".
 * Groups with nothing picked say "None" only for add-on groups the homeowner skipped.
 */
export function describeConfiguratorDesign(spec: ConfiguratorSpec, selection: ConfiguratorSelection): string[] {
  const sel = normalizeSelection(spec, selection);
  const model = spec.models.find((m) => m.id === sel.model)!;
  const rows = selectedRows(spec, sel);
  const bundle = sel.luxe && spec.bundle ? new Set(spec.bundle.rows) : null;
  const lines = [`Size: ${model.name}, ${model.dimensions}`];
  if (bundle && spec.bundle) lines.push(`${spec.bundle.label}: yes (bundle of ${spec.bundle.includes.length || spec.bundle.rows.length} upgrades)`);
  for (const g of spec.groups) {
    const picked = g.rows.filter((r) => rows.has(r.id));
    const words = picked.map((r) => `${r.label}${r.included ? ' (included)' : ''}${bundle?.has(r.id) ? ` (${spec.bundle!.label})` : ''}`);
    lines.push(`${g.title}: ${words.length ? words.join(', ') : 'None'}`);
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

export type SubmitOptions = {
  /** Injected in tests. */
  fetch?: typeof fetch;
  /** Give up on one attempt after this long (default 65 s, past the route's 60 s maxDuration). */
  timeoutMs?: number;
  /** Wait before the single automatic retry (default 900 ms). */
  retryDelayMs?: number;
};

/** A random id for one submission (the retry reuses it). */
export function newSubmissionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Message for a reply that carried no JSON (a proxy page, a crash, a cut connection). */
function statusMessage(status: number): string {
  if (status === 413) return 'That request was too large to send. Shorten your note and try again.';
  if (status === 429) return 'Too many requests from this connection in the last hour. Please try again later, or call us.';
  if (status === 403) return 'Your browser blocked this request. Reload the page and try again.';
  if (status >= 500) return 'Our server had a problem saving that. Your details are still here: please try again.';
  return 'Something went wrong sending your request. Your details are still here: please try again.';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Attempt = { kind: 'reply'; data: EstimatorLeadResponse } | { kind: 'network' } | { kind: 'timeout' };

async function attempt(url: string, body: string, fetcher: typeof fetch, timeoutMs: number): Promise<Attempt> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      signal: controller?.signal,
    });
    const data = (await res.json().catch(() => null)) as EstimatorLeadResponse | null;
    if (data && typeof data === 'object' && 'ok' in data) return { kind: 'reply', data };
    // A gateway error without our JSON is as good as no answer: worth the one retry.
    if (res.status === 502 || res.status === 504) return { kind: 'network' };
    return { kind: 'reply', data: { ok: false, errors: { form: statusMessage(res.status) } } };
  } catch (error) {
    return { kind: controller?.signal.aborted || (error as { name?: string })?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Posts the lead. A network error or a timeout is retried once automatically
 * with the same submissionId (the server answers a repeat with its first
 * reply), then reported with a message that says what to do. Never throws.
 */
export async function submitEstimatorLead(slug: string, request: EstimatorLeadRequest, options: SubmitOptions = {}): Promise<EstimatorLeadResponse> {
  const fetcher = options.fetch ?? fetch;
  const url = `/api/estimator/${encodeURIComponent(slug)}/lead`;
  const body = JSON.stringify({ ...request, submissionId: request.submissionId ?? newSubmissionId() });
  // Longer than the route's maxDuration (60 s): a slow first save is answered, not raced by the retry.
  const timeoutMs = options.timeoutMs ?? 65_000;
  let result = await attempt(url, body, fetcher, timeoutMs);
  if (result.kind !== 'reply') {
    await sleep(options.retryDelayMs ?? 900);
    result = await attempt(url, body, fetcher, timeoutMs);
  }
  if (result.kind === 'reply') return result.data;
  return {
    ok: false,
    errors: {
      form:
        result.kind === 'timeout'
          ? 'This is taking too long, probably a slow connection. Your details are still here: please try again.'
          : 'We couldn’t reach our server. Check your connection, then try again. Your details are still here.',
    },
  };
}
