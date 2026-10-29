import { funnelAnswers, normalizeFunnelSelection } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import {
  FUNNEL_FIELD_ORDER,
  funnelErrorKey,
  normalizeZip,
  splitFullName,
  type EstimatorLeadRequest,
  type FunnelContactInput,
} from '@/lib/estimator/lead-client';

/*
 * Pure state for the funnel's contact step (no React): the fields, the lead
 * request, error placement, and the sessionStorage draft / result so a refresh
 * never loses what was typed (the shell keeps the lead result). Unit-tested in
 * tests/estimator-funnel-lead.test.ts.
 */

export type FunnelContactFields = FunnelContactInput & {
  /** Optional street address (FunnelContactStep.askAddress); sent in the note. */
  address: string;
  /** Honeypot: stays empty for people. */
  website: string;
};

export const emptyFunnelFields = (): FunnelContactFields => ({
  name: '',
  email: '',
  phone: '',
  zip: '',
  address: '',
  homeowner: '',
  consent: false,
  website: '',
});

const FIELD_KEYS: ReadonlySet<string> = new Set(FUNNEL_FIELD_ORDER);

/** Server or local errors keyed the way the form shows them (firstName / lastName -> name). */
export function placeErrors(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const k = funnelErrorKey(key);
    if (!out[k]) out[k] = message;
  }
  return out;
}

/** The first field (on-screen order) with an error, to focus. */
export function firstInvalid(errors: Record<string, string>): string | null {
  return FUNNEL_FIELD_ORDER.find((k) => errors[k]) ?? null;
}

/** Messages that belong to no field (shown over the button). */
export function formErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors).filter(([k]) => !FIELD_KEYS.has(k)).map(([, m]) => m);
}

/**
 * The lead request: the funnel picks (the server re-prices from these alone),
 * the template answers for older servers and logs, the contact. No prices.
 */
export function funnelLeadRequest(input: {
  spec: FunnelSpec;
  selection: FunnelSelection;
  fields: FunnelContactFields;
  consentText: string;
  measurement: boolean;
  /** The consent wording is shown under the button ("By tapping …"), no checkbox. */
  consentOnSubmit?: boolean;
}): EstimatorLeadRequest {
  const { spec, fields } = input;
  const selection = normalizeFunnelSelection(spec, input.selection);
  const name = splitFullName(fields.name) ?? { firstName: fields.name.trim(), lastName: '' };
  const address = fields.address.trim();
  return {
    answers: funnelAnswers(spec, selection),
    funnel: selection,
    zip: normalizeZip(fields.zip) ?? fields.zip.trim(),
    // Only when the form asks it (FunnelContactStep.askHomeowner); the server marks it "not asked" otherwise.
    ...(spec.contactStep.askHomeowner ? { homeowner: fields.homeowner === 'no' ? ('no' as const) : ('yes' as const) } : {}),
    ...(address ? { note: `Address: ${address.slice(0, 300)}` } : {}),
    contact: {
      firstName: name.firstName,
      lastName: name.lastName,
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      // Agree-on-submit: the wording sits under the button, so sending is the agreement.
      consent: input.consentOnSubmit ? true : fields.consent,
      website: fields.website,
    },
    consentText: input.consentText,
    measurement: input.measurement,
  };
}

/* ------------------------------------------------------------------ */
/* sessionStorage (per tab; every access guarded)                      */
/* ------------------------------------------------------------------ */

const draftKey = (slug: string) => `hq-funnel-contact:${slug}`;

function read(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full: the page still works */
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** What was typed (never the consent tick: that is asked again after a reload). */
export function loadContactDraft(slug: string): Partial<FunnelContactFields> | null {
  const d = read(draftKey(slug));
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  return {
    name: str(o.name, 200),
    email: str(o.email, 254),
    phone: str(o.phone, 30),
    zip: str(o.zip, 10),
    address: str(o.address, 300),
    homeowner: o.homeowner === 'yes' || o.homeowner === 'no' ? o.homeowner : '',
  };
}

export function saveContactDraft(slug: string, fields: FunnelContactFields) {
  const { name, email, phone, zip, address, homeowner } = fields;
  write(draftKey(slug), { name, email, phone, zip, address, homeowner });
}

export const clearContactDraft = (slug: string) => write(draftKey(slug), null);
