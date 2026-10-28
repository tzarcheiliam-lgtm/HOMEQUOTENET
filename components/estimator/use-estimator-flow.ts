/**
 * Pure flow logic for the homeowner estimator: which screens exist, in what
 * order, when a screen counts as answered, how a pick changes the state and how
 * the lead request is built. No React and no DOM, so it is unit-tested directly
 * (tests/estimator-screens.test.tsx).
 */

import { picksFor, visibleQuestions, applyPackage } from '@/lib/estimator/engine';
import type { EstimatorLeadRequest, LeadTimeline } from '@/lib/estimator/lead-client';
import { LEAD_TIMELINES } from '@/lib/estimator/lead-client';
import {
  CUSTOM_PACKAGE_ID,
  type Answers,
  type EstimatorQuestion,
  type EstimatorTemplate,
  type PoolDimensions,
  type PriceUnit,
  type Price,
} from '@/lib/estimator/types';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

/** Typed dimensions stay strings so a half-typed number never breaks anything. */
export type DimensionsInput = { length: string; width: string; depth: string };

export type ContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  /** Honeypot. A person never fills it in. */
  website: string;
  note: string;
};

export type FlowState = {
  answers: Answers;
  /** The homeowner asked to see the scope and detail screens behind a package. */
  customize: boolean;
  knowDimensions: boolean;
  dimensions: DimensionsInput;
  likedLooks: string[];
  zip: string;
  homeowner: '' | 'yes' | 'no';
  timeline: '' | LeadTimeline;
  contact: ContactInput;
  /** "Allow optional advertising measurement". */
  measurement: boolean;
};

export const NOTE_MAX_LENGTH = 1000;

export function initialFlowState(answers: Answers = {}, measurement = false): FlowState {
  return {
    answers,
    customize: false,
    knowDimensions: false,
    dimensions: { length: '', width: '', depth: '' },
    likedLooks: [],
    zip: '',
    homeowner: '',
    timeline: '',
    contact: { firstName: '', lastName: '', email: '', phone: '', consent: false, website: '', note: '' },
    measurement,
  };
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

export type ScreenKind = 'questions' | 'looks' | 'zip' | 'contact';
/** package: the starting-point question; scope/detail: hidden on the package path. */
export type ScreenGroup = 'package' | 'scope' | 'detail' | 'other';

export type FlowScreen = {
  id: string;
  kind: ScreenKind;
  group: ScreenGroup;
  title: string;
  questions: EstimatorQuestion[];
};

export const LOOKS_SCREEN_ID = 'looks';
export const ZIP_SCREEN_ID = 'zip';
export const CONTACT_SCREEN_ID = 'contact';

/** The package id the homeowner picked ("custom" counts), or undefined. */
export function pickedPackage(template: EstimatorTemplate, answers: Answers): string | undefined {
  const q = template.questions.find((x) => x.role === 'package');
  return q ? picksFor(q, answers)[0] : undefined;
}

/**
 * True while the scope and detail screens are skipped: a ready-made package is
 * picked (or none yet) and the homeowner has not asked to customize it.
 * A template without a package question always shows them.
 */
export function detailsHidden(template: EstimatorTemplate, answers: Answers, customize: boolean): boolean {
  if (!template.questions.some((q) => q.role === 'package')) return false;
  if (customize) return false;
  return pickedPackage(template, answers) !== CUSTOM_PACKAGE_ID;
}

/** Ids of the scope question's detail questions (anything it shows, directly or through another). */
function detailQuestionIds(template: EstimatorTemplate): Set<string> {
  const scope = template.questions.find((q) => q.role === 'scope');
  const ids = new Set<string>();
  if (!scope) return ids;
  for (const q of template.questions) {
    const parent = q.showWhen?.questionId;
    if (parent && (parent === scope.id || ids.has(parent))) ids.add(q.id);
  }
  return ids;
}

/**
 * Every screen the homeowner will walk through, in template order: the visible
 * questions grouped by `screen`, then the optional looks screen, the ZIP
 * screen and the contact screen. The result is not a screen of its own: it
 * appears once the lead is submitted.
 */
export function flowScreens(
  template: EstimatorTemplate,
  answers: Answers,
  opts: { customize: boolean; hasGallery: boolean },
): FlowScreen[] {
  const details = detailQuestionIds(template);
  const hideDetails = detailsHidden(template, answers, opts.customize);
  const groupOf = (q: EstimatorQuestion): ScreenGroup =>
    q.role === 'package' ? 'package' : q.role === 'scope' ? 'scope' : details.has(q.id) ? 'detail' : 'other';

  const order: string[] = [];
  const byScreen = new Map<string, EstimatorQuestion[]>();
  for (const q of visibleQuestions(template, answers)) {
    const id = q.screen ?? q.id;
    if (!byScreen.has(id)) {
      byScreen.set(id, []);
      order.push(id);
    }
    byScreen.get(id)!.push(q);
  }

  const screens: FlowScreen[] = [];
  for (const id of order) {
    const questions = byScreen.get(id)!;
    const groups = questions.map(groupOf);
    const group: ScreenGroup = groups.includes('package')
      ? 'package'
      : groups.includes('scope')
        ? 'scope'
        : groups.every((g) => g === 'detail')
          ? 'detail'
          : 'other';
    if (hideDetails && (group === 'scope' || group === 'detail')) continue;
    const title = questions.find((q) => q.screenTitle)?.screenTitle ?? questions[0].label;
    screens.push({ id, kind: 'questions', group, title, questions });
  }

  if (opts.hasGallery) {
    screens.push({ id: LOOKS_SCREEN_ID, kind: 'looks', group: 'other', title: 'Which look do you like?', questions: [] });
  }
  screens.push({ id: ZIP_SCREEN_ID, kind: 'zip', group: 'other', title: 'About you and your home', questions: [] });
  screens.push({ id: CONTACT_SCREEN_ID, kind: 'contact', group: 'other', title: 'Where should we send your estimate?', questions: [] });
  return screens;
}

/** The screen the "Customize this package" link opens: scope first, else the first detail screen. */
export function customizeTargetId(template: EstimatorTemplate, answers: Answers, hasGallery: boolean): string | undefined {
  const screens = flowScreens(template, answers, { customize: true, hasGallery });
  return (screens.find((s) => s.group === 'scope') ?? screens.find((s) => s.group === 'detail'))?.id;
}

/** The screen after `currentId`, or undefined at the end (or when the id is unknown). */
export function nextScreenId(screens: FlowScreen[], currentId: string): string | undefined {
  const i = screens.findIndex((s) => s.id === currentId);
  return i === -1 ? undefined : screens[i + 1]?.id;
}

/** The screen before `currentId`, or undefined on the first. */
export function prevScreenId(screens: FlowScreen[], currentId: string): string | undefined {
  const i = screens.findIndex((s) => s.id === currentId);
  return i > 0 ? screens[i - 1].id : undefined;
}

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

/**
 * State after a pick. A package pick pre-fills the scope and details
 * (applyPackage) and closes the customize view; a single question replaces its
 * answer; a multi question toggles the option.
 */
export function pickOption(template: EstimatorTemplate, state: FlowState, q: EstimatorQuestion, optionId: string): FlowState {
  if (q.role === 'package') {
    return { ...state, answers: applyPackage(template, state.answers, optionId), customize: false };
  }
  if (q.kind === 'single') {
    return { ...state, answers: { ...state.answers, [q.id]: [optionId] } };
  }
  const current = picksFor(q, state.answers);
  const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
  return { ...state, answers: { ...state.answers, [q.id]: next } };
}

/** Answers for the questions currently shown only (stale answers to hidden ones are dropped). */
export function visibleAnswers(template: EstimatorTemplate, answers: Answers): Answers {
  const out: Answers = {};
  for (const q of visibleQuestions(template, answers)) {
    const picks = picksFor(q, answers);
    if (picks.length) out[q.id] = picks;
  }
  return out;
}

/** True when every question on a questions screen has a pick (a multi needs at least one, unless optional). */
export function questionsAnswered(screen: FlowScreen, answers: Answers): boolean {
  return screen.questions.length > 0 && screen.questions.every((q) => q.optional || picksFor(q, answers).length > 0);
}

/* ------------------------------------------------------------------ */
/* Dimensions                                                          */
/* ------------------------------------------------------------------ */

function toNumber(raw: string): number {
  const t = raw.trim();
  return t === '' ? Number.NaN : Number(t);
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

/**
 * Typed dimensions for computeEstimate: only when the toggle is on and length
 * and width sit inside the template limits (a bad depth is dropped on its own).
 * `hint` explains what happened so the screen can say we use the preset.
 */
export function parseDimensions(
  template: EstimatorTemplate,
  input: DimensionsInput,
  enabled: boolean,
): { dimensions?: PoolDimensions; hint?: string } {
  if (!enabled) return {};
  const lim = template.geometry.limits;
  const length = toNumber(input.length);
  const width = toNumber(input.width);
  const typedAny = [input.length, input.width, input.depth].some((v) => v.trim() !== '');
  if (!typedAny) return {};
  if (!Number.isFinite(length) || !Number.isFinite(width)) {
    return { hint: 'Enter both a length and a width to use your own dimensions. Until then we use the size you picked.' };
  }
  if (!inRange(length, lim.minFt, lim.maxLengthFt) || !inRange(width, lim.minFt, lim.maxWidthFt)) {
    return {
      hint: `Length should be ${lim.minFt} to ${lim.maxLengthFt} ft and width ${lim.minFt} to ${lim.maxWidthFt} ft. We will use the size you picked instead.`,
    };
  }
  const dimensions: PoolDimensions = { lengthFt: length, widthFt: width };
  if (input.depth.trim() === '') return { dimensions };
  const depth = toNumber(input.depth);
  if (inRange(depth, lim.minDepthFt, lim.maxDepthFt)) {
    dimensions.avgDepthFt = depth;
    return { dimensions };
  }
  return { dimensions, hint: `Average depth should be ${lim.minDepthFt} to ${lim.maxDepthFt} ft. We will use a typical depth.` };
}

/* ------------------------------------------------------------------ */
/* Lead fields                                                         */
/* ------------------------------------------------------------------ */

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** The lead screen before contact: ZIP, owns the home, timeline. */
export function zipScreenComplete(state: Pick<FlowState, 'zip' | 'homeowner' | 'timeline'>): boolean {
  return isValidZip(state.zip) && state.homeowner !== '' && LEAD_TIMELINES.some((t) => t.id === state.timeline);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field errors for the contact screen (empty = fine). Keys match the lead route's error keys. */
export function contactErrors(contact: ContactInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!contact.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!contact.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!EMAIL.test(contact.email.trim())) errors.email = 'Enter a valid email address.';
  if (contact.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit phone number.';
  if (!contact.consent) errors.consent = 'Please agree to be contacted so we can send your estimate.';
  if (contact.note.length > NOTE_MAX_LENGTH) errors.note = `Keep this under ${NOTE_MAX_LENGTH} characters.`;
  return errors;
}

/** Screen that owns a server error key, so a rejected ZIP sends the homeowner back to the ZIP screen. */
export function screenForErrorKey(key: string): string | undefined {
  if (key === 'zip' || key === 'homeowner' || key === 'timeline') return ZIP_SCREEN_ID;
  if (['firstName', 'lastName', 'email', 'phone', 'consent', 'note', 'website', 'form'].includes(key)) return CONTACT_SCREEN_ID;
  return undefined;
}

/** True when the screen's own inputs are complete, so Next can be enabled. */
export function screenComplete(screen: FlowScreen, state: FlowState): boolean {
  switch (screen.kind) {
    case 'questions':
      return questionsAnswered(screen, state.answers);
    case 'zip':
      return zipScreenComplete(state);
    default:
      // Looks are skippable; contact is validated on submit so errors can be explained.
      return true;
  }
}

/** The request the lead route receives. Prices are never sent: the server recomputes them. */
export function buildLeadRequest(
  template: EstimatorTemplate,
  state: FlowState,
  tracking?: EstimatorLeadRequest['tracking'],
  /** The consent wording shown on the contact screen (estimatorConsentText). */
  consentText = '',
): EstimatorLeadRequest {
  const { dimensions } = parseDimensions(template, state.dimensions, state.knowDimensions);
  const note = state.contact.note.trim();
  const request: EstimatorLeadRequest = {
    answers: visibleAnswers(template, state.answers),
    zip: state.zip.trim(),
    homeowner: state.homeowner === 'no' ? 'no' : 'yes',
    timeline: (state.timeline || 'researching') as LeadTimeline,
    contact: {
      firstName: state.contact.firstName.trim(),
      lastName: state.contact.lastName.trim(),
      email: state.contact.email.trim(),
      phone: state.contact.phone.trim(),
      consent: state.contact.consent,
      website: state.contact.website,
    },
    consentText,
    measurement: state.measurement,
  };
  if (dimensions) request.dimensions = dimensions;
  if (state.likedLooks.length) request.likedLooks = [...state.likedLooks];
  if (note) request.note = note.slice(0, NOTE_MAX_LENGTH);
  if (tracking) request.tracking = tracking;
  return request;
}

/* ------------------------------------------------------------------ */
/* Plain-words formatting                                              */
/* ------------------------------------------------------------------ */

/** "124 linear ft", "about 900 sq ft", "2"; empty for a flat price. */
export function describeQuantity(unit: PriceUnit, quantity: number): string {
  const n = quantity.toLocaleString('en-US');
  switch (unit) {
    case 'perimeter_lf':
    case 'linear_ft':
      return `${n} linear ft`;
    case 'interior_sqft':
    case 'deck_sqft':
      return `about ${n} sq ft`;
    case 'each':
      return n;
    default:
      return '';
  }
}

const UNIT_SUFFIX: Record<PriceUnit, string> = {
  interior_sqft: ' per sq ft',
  deck_sqft: ' per sq ft',
  perimeter_lf: ' per linear ft',
  linear_ft: ' per linear ft',
  each: ' each',
  flat: '',
};

/** Small price note for an option tile ("$10 – $14 per sq ft"). Only shown when the range is revealed immediately. */
export function optionPriceHint(price: Price | undefined, formatRange: (low: number, high: number) => string): string | undefined {
  if (!price || !Number.isFinite(price.low) || !Number.isFinite(price.high)) return undefined;
  return `${price.unit === 'flat' ? '+' : ''}${formatRange(price.low, price.high)}${UNIT_SUFFIX[price.unit]}`;
}

/** Only http(s) and site-relative links are followed; anything else (javascript:, data:) is dropped. */
export function safeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
