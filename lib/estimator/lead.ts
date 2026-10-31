import { z } from 'zod';
import { consentText, contactSchema, inServiceArea, matches, qualify, serviceAreaValid, usesNativeCalendar, type FunnelConfig } from '@/lib/funnels/schema';
import { encodeSelection, estimateSelection, normalizeSelection, photoFor, photoSrc, selectionToAnswers } from './configurator/engine.ts';
import type { ConfiguratorSelection, ConfiguratorSpec, Range } from './configurator/types.ts';
import { formatRange, picksFor, visibleQuestions } from './engine.ts';
import { activeSteps, encodeFunnelSelection, estimateFunnel, funnelAnswers, funnelPhoto, normalizeFunnelSelection, photoKey, pickedTitles, toConfiguratorSelection } from './funnel/engine.ts';
import type { FunnelSelection, FunnelSpec } from './funnel/types.ts';
import {
  LEAD_TIMELINES, describeConfiguratorDesign, describeFunnelDesign, estimatorConsentText, normalizeZip, usPhoneDigits, type EstimatorLeadRequest,
} from './lead-client.ts';
import type { Answers, ContractorEstimatorConfig, Estimate, EstimatorTemplate, GalleryImage } from './types.ts';

/**
 * Server side of estimator lead capture (used by POST /api/estimator/[slug]/lead).
 * Everything here is pure so it can be unit tested: request validation, answer
 * sanitising, and the mapping of an estimator submission onto the existing
 * homeowner funnel's session/lead path (save_funnel_session).
 */

/* ------------------------------------------------------------------ */
/* Request validation                                                  */
/* ------------------------------------------------------------------ */

const pickId = z.string().min(1).max(50);
const dimension = z.number().finite().positive().max(1000);
// Same shape as funnels' contact rules, but a filled honeypot is a silent drop (see isHoneypot),
// not a validation error, so bots learn nothing from the response. Missing names/consent read
// as the field's own message (not zod's "Required"), so the form can point at the field.
const contact = contactSchema.extend({
  firstName: z.string({ required_error: 'Enter your first name' }).trim().min(1, 'Enter your first name').max(80, 'Use 80 characters or fewer'),
  lastName: z.string({ required_error: 'Enter your last name' }).trim().min(1, 'Enter your last name').max(80, 'Use 80 characters or fewer'),
  email: z.string({ required_error: 'Enter your email address' }).trim().email('Enter a valid email address, e.g. name@example.com').max(254),
  phone: z.string({ required_error: 'Enter your phone number' }).trim().refine((v) => usPhoneDigits(v) !== null, 'Enter a valid US phone number, like (818) 555-0142'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to be contacted about your project' }) }),
  website: z.string().max(500).default(''),
});
function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}
const optionalText = (max: number) => z.string().max(max).optional().catch(undefined);
/**
 * Browser ids and the page URL are nice to have, never a reason to lose a lead:
 * a value the server cannot use is dropped instead of failing the request.
 */
const tracking = z.object({
  fbc: optionalText(256),
  fbp: optionalText(100),
  eventId: optionalText(100),
  // zod runs the refinement even after .url() failed, so it must not throw on a bad URL (it used to: a 500).
  pageUrl: z.string().url().max(4000).refine(isHttpUrl).optional().catch(undefined),
}).optional().catch(undefined);
const selection = z.object({
  model: z.string().min(1).max(50),
  picks: z.record(z.string().max(50), z.array(pickId).max(20)).refine((p) => Object.keys(p).length <= 30, 'Too many groups'),
  luxe: z.boolean().default(false),
});

export const leadRequestSchema = z.object({
  answers: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,49}$/), z.array(pickId).max(20))
    .refine((a) => Object.keys(a).length <= 40, 'Too many answers'),
  dimensions: z.object({ lengthFt: dimension, widthFt: dimension, avgDepthFt: dimension.optional() }).optional(),
  likedLooks: z.array(z.string().max(300)).max(24).optional(),
  note: z.string().max(1000, 'Please keep this under 1,000 characters.').optional(),
  // ZIP+4 and stray spaces (autofill) are fine: only the first five digits are used.
  zip: z.preprocess(
    (v) => (typeof v === 'string' ? normalizeZip(v) ?? v : v),
    z.string({ required_error: 'Enter the property’s 5-digit ZIP code.' }).regex(/^\d{5}$/, 'Enter a valid five-digit ZIP code.'),
  ),
  // Always required: the funnel's qualification rules read it (never assumed).
  homeowner: z.enum(['yes', 'no'], { errorMap: () => ({ message: 'Tell us whether you own the home.' }) }),
  // The home's full address (funnel "Home address"); the ZIP above stays the validated one.
  address: z.string().max(300, 'Use 300 characters or fewer for the address.').optional()
    .transform((v) => v?.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim() || undefined),
  // What a picked Google place adds; nice to have, so a bad value is dropped, never a failed lead.
  addressDetails: z.object({
    city: z.string().trim().max(80).optional(),
    state: z.string().regex(/^[A-Z]{2}$/).optional(),
    lat: z.number().finite().min(-90).max(90).optional(),
    lng: z.number().finite().min(-180).max(180).optional(),
    verified: z.boolean().default(false),
  }).optional().catch(undefined),
  // Optional: the configurator does not ask it (the funnel's timeline question then stays open).
  timeline: z.enum(LEAD_TIMELINES.map((t) => t.id) as [string, ...string[]], { errorMap: () => ({ message: 'Choose when you want to start.' }) }).optional(),
  contact,
  consentText: z.string().max(1000).default(''),
  measurement: z.boolean().default(false),
  tracking,
  configurator: selection.optional(),
  // The funnel's picks (step id -> option id); unknown steps and options fall back to the defaults.
  funnel: z.record(z.string().max(50), z.string().max(50)).refine((f) => Object.keys(f).length <= 20, 'Too many steps').optional(),
  submissionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional().catch(undefined),
});
export type ParsedLeadRequest = z.infer<typeof leadRequestSchema>;

// Compile-time check that the server accepts everything the client contract can send.
// (contact is excluded: the client's consent is a boolean that the server narrows to true.)
const clientRequestIsAccepted: Omit<EstimatorLeadRequest, 'contact'> extends Omit<z.input<typeof leadRequestSchema>, 'contact'> ? true : never = true;
void clientRequestIsAccepted;

export type LeadParseResult = { ok: true; data: ParsedLeadRequest } | { ok: false; errors: Record<string, string> };

/** Validates a request body; errors are keyed by the request field ("email", "zip", ...), first message wins. */
export function parseLeadRequest(input: unknown): LeadParseResult {
  const parsed = leadRequestSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: { ...parsed.data, note: cleanNote(parsed.data.note) } };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const [head, sub] = issue.path;
    const key = String(head === 'contact' && sub !== undefined ? sub : head ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Control characters never belong in a note; line breaks stay. */
function cleanNote(note: string | undefined): string | undefined {
  const value = note?.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return value || undefined;
}

/* ------------------------------------------------------------------ */
/* Origin and consent (the two checks that used to fail real people)   */
/* ------------------------------------------------------------------ */

/** "https://www.example.com" <-> "https://example.com". */
function wwwTwin(origin: string): string | null {
  try {
    const url = new URL(origin);
    url.hostname = url.hostname.startsWith('www.') ? url.hostname.slice(4) : `www.${url.hostname}`;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Is this POST from our own page? The strict check compares the Origin header
 * with request.url, which breaks behind a proxy that rewrites the host and on
 * the www / apex twin of the site. Also accepted: the forwarded host the
 * browser really used, the configured site URL and its www twin, and a browser
 * that sent no Origin but says the request is same-origin (Sec-Fetch-Site).
 * Anything cross-site (another domain, a sandboxed "null" origin) is refused.
 */
export function originAllowed(request: Request, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'same-origin';
  if (origin === 'null') return false;
  const allowed = new Set<string>();
  const add = (o: string | null | undefined) => {
    if (!o) return;
    allowed.add(o);
    const twin = wwwTwin(o);
    if (twin) allowed.add(twin);
  };
  try {
    add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || new URL(request.url).protocol.replace(':', '');
    try {
      add(new URL(`${proto}://${host}`).origin);
    } catch {
      /* ignore */
    }
  }
  if (siteUrl) {
    try {
      add(new URL(siteUrl).origin);
    } catch {
      /* ignore */
    }
  }
  return allowed.has(origin);
}

/** Whitespace, curly quotes and dashes never make two consent wordings different. */
export function normalizeConsent(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The stored wording for what the homeowner agreed to, or null when it is not
 * a wording we show. Accepted: the funnel's own text, and the estimator page's
 * text (built from the contractor's display name, which can differ from the
 * funnel's clientName, e.g. "Pool Masters LA" vs "Pool Masters"). Both name
 * HomeQuote Network and the contractor; the one the page showed is the one stored,
 * so the disclosure on file is always exactly what was next to the checkbox.
 */
export function acceptedConsent(sent: string, funnel: Pick<FunnelConfig, 'clientName'>, contractor: Pick<ContractorEstimatorConfig, 'contractorName'>): string | null {
  const wanted = normalizeConsent(sent);
  if (!wanted) return null;
  for (const text of [consentText(funnel as FunnelConfig), estimatorConsentText(contractor.contractorName)]) {
    if (normalizeConsent(text) === wanted) return text;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Repeat submissions                                                  */
/* ------------------------------------------------------------------ */

const REPLAY_MS = 15 * 60 * 1000;
const REPLAY_MAX = 500;

/**
 * Remembers recent successful replies by submissionId (per server instance),
 * so the client's automatic retry after a lost response gets the first reply
 * back instead of a second lead. Bounded and short-lived; the database's own
 * contact dedupe covers a retry that lands on another instance.
 */
export class ReplayCache<T> {
  private items = new Map<string, { at: number; value: T }>();
  constructor(private ttl = REPLAY_MS, private max = REPLAY_MAX) {}
  get(key: string, now = Date.now()): T | undefined {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (now - hit.at > this.ttl) {
      this.items.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T, now = Date.now()) {
    this.items.delete(key);
    this.items.set(key, { at: now, value });
    while (this.items.size > this.max) this.items.delete(this.items.keys().next().value as string);
  }
}

/** A filled honeypot: respond like a success but save nothing. */
export const isHoneypot = (request: Pick<ParsedLeadRequest, 'contact'>) => request.contact.website.trim() !== '';

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Answers reduced to what the template can use: visible questions only, known
 * option ids only, one pick on a single question. The estimate and the saved
 * lead are both built from this, never from the raw request.
 */
export function sanitizeEstimatorAnswers(template: EstimatorTemplate, answers: Answers): Answers {
  const clean: Answers = {};
  for (const q of visibleQuestions(template, answers)) {
    const picks = picksFor(q, answers);
    if (picks.length) clean[q.id] = picks;
  }
  return clean;
}

/** Gallery images the homeowner liked: only srcs the contractor really has, no repeats. */
export function pickLikedLooks(contractor: Pick<ContractorEstimatorConfig, 'gallery'>, srcs: string[] | undefined): GalleryImage[] {
  const gallery = contractor.gallery ?? [];
  const seen = new Set<string>();
  const liked: GalleryImage[] = [];
  for (const src of srcs ?? []) {
    const image = gallery.find((g) => g.src === src);
    if (image && !seen.has(src)) {
      seen.add(src);
      liked.push(image);
    }
  }
  return liked;
}

/** "Surface: Quartz, Deck: Pavers" style readable summary of what the homeowner picked. */
export function describePicks(template: EstimatorTemplate, answers: Answers): string[] {
  const out: string[] = [];
  for (const q of visibleQuestions(template, answers)) {
    const labels = picksFor(q, answers).map((id) => q.options.find((o) => o.id === id)?.label).filter((l): l is string => !!l);
    if (labels.length) out.push(`${q.summaryLabel ?? q.label}: ${labels.join(', ')}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Mapping onto the funnel                                             */
/* ------------------------------------------------------------------ */

/**
 * Estimator project ids and the funnel option values that mean the same thing,
 * per trade (EstimatorTemplate.trade). A bathroom refresh ("update the look")
 * is filed as "other", truthfully: the bathroom funnel has no cosmetic-update
 * service, so those leads go to the funnel's review instead of being passed off
 * as a full remodel. Add a real service value to the funnel to qualify them.
 */
const PROJECT_ALIASES: Record<string, Record<string, string[]>> = {
  pool: {
    remodel: ['full_remodel', 'pool_remodel', 'remodel'],
    backyard: ['backyard', 'backyard_renovation', 'backyard_remodel'],
  },
  bathroom: {
    full: ['full_remodel'],
    refresh: ['other'],
  },
  // The kitchen-remodel funnel's own services (content/funnels/kitchen-remodel.json); both qualify.
  kitchen: {
    full: ['full_remodel'],
    refresh: ['cabinets_counters'],
  },
  // The adu funnel's services (content/funnels/adu.json) use the same ids as the template's project options.
  adu: {
    detached: ['detached'],
    attached: ['attached'],
    garage: ['garage'],
  },
};

function projectAliases(trade: string, project: string | undefined): string[] {
  if (!project) return [];
  const byTrade = Object.hasOwn(PROJECT_ALIASES, trade) ? PROJECT_ALIASES[trade]! : {};
  return [project, ...(Object.hasOwn(byTrade, project) ? byTrade[project]! : [])];
}

/**
 * Fills the funnel's own questions from the estimator answers: the ZIP question,
 * an address question (with the home address), the homeowner and timeline questions by id, and any choice question whose
 * option matches the project pick. Optional typed questions are skipped (''),
 * anything else stays unanswered (qualifyLead then decides on what is known).
 */
export function funnelAnswersFor(
  config: FunnelConfig,
  input: { zip: string; homeowner: string; timeline?: string; project?: string; trade?: string; address?: string },
): Record<string, string> {
  const answers: Record<string, string> = {};
  const aliases = projectAliases(input.trade ?? 'pool', input.project);
  for (const q of config.questions) {
    if (!q.showWhen.every((c) => matches(c, answers))) continue;
    const has = (value: string) => q.options.some((o) => o.value === value);
    if (q.type === 'zip') answers[q.id] = input.zip;
    // The funnel's own Address question (if any) also fills leads.address (save_funnel_session).
    else if (q.type === 'address' && input.address) answers[q.id] = input.address;
    else if (q.type !== 'choice') {
      if (q.required === false) answers[q.id] = '';
    } else if (q.id === 'homeowner' && has(input.homeowner)) answers[q.id] = input.homeowner;
    else if (q.id === 'timeline' && input.timeline && has(input.timeline)) answers[q.id] = input.timeline;
    else {
      const match = aliases.find(has);
      if (match) answers[q.id] = match;
    }
  }
  return answers;
}

/**
 * The funnel's own verdict when every visible question is answered (qualify());
 * otherwise the same checks on what we do have: service area (radius + state
 * gate) and every rule whose question was answered. A rule about a question
 * the estimator cannot answer fails, so that lead goes to review, never to a booking.
 */
export function qualifyLead(config: FunnelConfig, answers: Record<string, string>): boolean {
  const full = qualify(config, answers);
  if (full !== null) return full;
  const zipId = config.questions.find((q) => q.type === 'zip')?.id;
  const zip = zipId ? answers[zipId] : undefined;
  if (!zip || !inServiceArea(config, zip) || !serviceAreaValid(config, zip)) return false;
  return config.qualificationRules.every((rule) => matches(rule, answers));
}

/** Hard state-level verdict (null when the funnel has no ZIP question). Gates the Meta Lead event. */
export function areaValidFor(config: FunnelConfig, answers: Record<string, string>): boolean | null {
  const zipId = config.questions.find((q) => q.type === 'zip')?.id;
  return zipId && answers[zipId] ? serviceAreaValid(config, answers[zipId]) : null;
}

/* ------------------------------------------------------------------ */
/* Lead payload                                                        */
/* ------------------------------------------------------------------ */

export type LeadPayloadInput = {
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  funnel: { slug: string; contractorId: string | null; config: FunnelConfig };
  request: ParsedLeadRequest;
  /** Already passed through sanitizeEstimatorAnswers. */
  answers: Answers;
  /** Computed on the server from `answers`. */
  estimate: Estimate;
  likedLooks: GalleryImage[];
  /** The configurator's design (experience 'configurator'), from configuratorLeadDesign. */
  design?: ConfiguratorLeadDesign;
};

export type LeadPayload = {
  /** save_funnel_session p_answers: the funnel's answers plus readable estimator keys. */
  funnelAnswers: Record<string, string>;
  /** save_funnel_session p_contact (honeypot removed). */
  contact: { firstName: string; lastName: string; email: string; phone: string; consent: true };
  qualified: boolean;
  areaValid: boolean | null;
  /** Last funnel question answered (p_completed). */
  completed: string | null;
  /** Funnel step after submit (p_step). */
  nextStep: 'calendar' | 'thanks';
  /** Full detail for the lead's activity timeline. */
  activity: { body: string; metadata: Record<string, unknown> };
};

const clip = (value: string, max = 1000) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Source label shown on the lead, e.g. "Pool estimator". */
export const estimatorSourceLabel = (template: Pick<EstimatorTemplate, 'trade'>) => `${capitalize(template.trade)} estimator`;

/**
 * The size line the contractor reads, keyed per trade: a pool's shape and
 * footprint ("estimator_pool"), or a room's floor ("estimator_room") for the
 * room trades, which have no shape question.
 */
export function describeSize(template: Pick<EstimatorTemplate, 'trade'>, geometry: Estimate['geometry']): [key: string, text: string] {
  const how = geometry.source === 'dimensions' ? 'typed dimensions' : `${geometry.size} preset`;
  if (template.trade === 'pool') {
    return ['estimator_pool', `${geometry.shape.replace('_', '-')}, about ${geometry.lengthFt} x ${geometry.widthFt} ft (${how})`];
  }
  const floor = `about ${geometry.lengthFt} x ${geometry.widthFt} ft, ${Math.round(geometry.lengthFt * geometry.widthFt)} sq ft of floor`;
  return ['estimator_room', geometry.source === 'preset' && geometry.size === 'unsure' ? `${floor} assumed (size to be measured)` : `${floor} (${how})`];
}

/* ------------------------------------------------------------------ */
/* Configurator design                                                 */
/* ------------------------------------------------------------------ */

export type ConfiguratorLeadDesign = {
  /** The configurator design (for a funnel lead: the one its picks stand for; absent for a funnel without a configurator). */
  selection?: ConfiguratorSelection;
  /** The simple funnel's picks (experience 'funnel'), with the option titles in step order. */
  funnel?: { selection: FunnelSelection; titles: string[] };
  /** The design in plain words, one line per group (describeConfiguratorDesign) or per funnel step. */
  summary: string[];
  /** The exact pictures the homeowner saw, one per view (funnel: per step), as absolute URLs. */
  photos: { view: string; label: string; key: string; url: string; alt: string }[];
  /** The page that reopens this design. */
  designUrl: string;
  /** The total the page showed (whole design, Go Luxe saving applied). */
  total: Range;
  /** The Go Luxe saving inside `total`, or null. */
  bundleSaving: Range | null;
};

/**
 * Everything the server needs for a configurator lead, derived from the
 * selection only (never from browser-sent prices, labels or URLs): the
 * template answers, the estimate (estimateSelection, so the Go Luxe saving the
 * page showed is honoured), the design in plain words and the photo links.
 */
export function configuratorLeadDesign(
  spec: ConfiguratorSpec,
  template: EstimatorTemplate,
  raw: ConfiguratorSelection,
  where: { origin: string; slug: string },
): { answers: Answers; estimate: Estimate; design: ConfiguratorLeadDesign } {
  const selection = normalizeSelection(spec, raw);
  const answers = sanitizeEstimatorAnswers(template, selectionToAnswers(spec, selection));
  const quote = estimateSelection(spec, template, selection);
  const absolute = (src: string) => {
    try {
      return new URL(src, where.origin).toString();
    } catch {
      return src;
    }
  };
  const photos = spec.views.map((v) => {
    const key = photoFor(spec, v.id, selection);
    const photo = photoSrc(spec, key);
    return { view: v.id, label: v.label, key, url: absolute(photo.src), alt: photo.alt };
  });
  return {
    answers,
    // The figure the homeowner saw is the total (bundle saving included); the lines stay the engine's.
    estimate: { ...quote.estimate, low: quote.total.low, high: quote.total.high },
    design: {
      selection,
      summary: describeConfiguratorDesign(spec, selection),
      photos,
      designUrl: absolute(`/estimator/${encodeURIComponent(where.slug)}?${encodeSelection(spec, selection)}`),
      total: quote.total,
      bundleSaving: quote.bundleSaving,
    },
  };
}

/**
 * Everything the server needs for a funnel lead (experience 'funnel'), derived
 * from the picks only: the template answers (funnelAnswers, sanitised), the
 * estimate (estimateFunnel: the configurator's pricing with the Go Luxe bundle
 * off, so it matches the range the booking screen shows), the design in plain
 * words (one line per step, then what the configurator design includes), the
 * photo shown on each step and the link that reopens the design.
 */
export function funnelLeadDesign(
  spec: FunnelSpec,
  template: EstimatorTemplate,
  raw: unknown,
  where: { origin: string; slug: string },
): { answers: Answers; estimate: Estimate; design: ConfiguratorLeadDesign } {
  const selection = normalizeFunnelSelection(spec, raw);
  const answers = sanitizeEstimatorAnswers(template, funnelAnswers(spec, selection));
  const quote = estimateFunnel(spec, template, selection);
  const absolute = (src: string) => {
    try {
      return new URL(src, where.origin).toString();
    } catch {
      return src;
    }
  };
  const cfgSel = toConfiguratorSelection(spec, selection) ?? undefined;
  // What "Standard" / "Luxe" really include, from the configurator (its size line repeats the first step).
  // Groups the steps already name exactly (spec.summaryReplacesGroups: coping, spa, kitchen, fire, shade) are left out.
  const replaced = new Set((spec.summaryReplacesGroups ?? []).map((id) => spec.configurator?.groups.find((g) => g.id === id)?.title).filter(Boolean));
  const includes =
    spec.configurator && cfgSel
      ? describeConfiguratorDesign(spec.configurator, cfgSel).filter((l) => !l.startsWith('Size:') && !replaced.has(l.slice(0, l.indexOf(':'))))
      : [];
  const photos = activeSteps(spec, selection).map((s) => {
    const photo = funnelPhoto(spec, s.id, selection);
    return { view: s.id, label: s.label.replace(/[.?!]$/, ''), key: photoKey(spec, s.id, selection), url: absolute(photo.src), alt: photo.alt };
  });
  const total = quote.total ?? (quote.estimate.low !== null && quote.estimate.high !== null ? { low: quote.estimate.low, high: quote.estimate.high } : { low: 0, high: 0 });
  return {
    answers,
    estimate: quote.total ? { ...quote.estimate, low: quote.total.low, high: quote.total.high } : quote.estimate,
    design: {
      ...(cfgSel ? { selection: cfgSel } : {}),
      funnel: { selection, titles: pickedTitles(spec, selection) },
      summary: [...describeFunnelDesign(spec, selection), ...includes],
      photos,
      designUrl: absolute(`/estimator/${encodeURIComponent(where.slug)}/design?${encodeFunnelSelection(spec, selection)}`),
      total,
      bundleSaving: null,
    },
  };
}

/**
 * The address as the contractor reads it, always with the ZIP the lead was
 * validated and gated on ("12 Elm St, Calabasas, CA" + 91302 -> "..., CA 91302").
 */
export function addressLine(address: string, zip: string): string {
  const line = address.replace(/,\s*(USA|United States)$/i, '').trim();
  return new RegExp(`\\b${zip}\\b`).test(line) ? line : `${line} ${zip}`;
}

export function buildLeadPayload(input: LeadPayloadInput): LeadPayload {
  const { template, contractor, funnel, request, answers, estimate, likedLooks, design } = input;
  const projectQ = template.questions.find((q) => q.role === 'project');
  const project = projectQ ? picksFor(projectQ, answers)[0] : undefined;

  const address = request.address ? addressLine(request.address, request.zip) : undefined;
  const base = funnelAnswersFor(funnel.config, { zip: request.zip, homeowner: request.homeowner, timeline: request.timeline, project, trade: template.trade, address });
  const qualified = qualifyLead(funnel.config, base);
  const areaValid = areaValidFor(funnel.config, base);

  const range = estimate.low !== null && estimate.high !== null ? formatRange(estimate.low, estimate.high) : 'To be confirmed on site';
  const picks = describePicks(template, answers);
  const siteVisit = estimate.siteVisitItems.map((i) => i.label);
  // Questions the page never asked (the configurator skips the property questions): check them on site.
  const notAsked = [
    ...estimate.unanswered.map((id) => template.questions.find((q) => q.id === id)).filter((q) => q !== undefined).map((q) => q.summaryLabel ?? q.label),
  ];
  const details = request.addressDetails;
  const mapUrl = details?.lat !== undefined && details?.lng !== undefined ? `https://www.google.com/maps/search/?api=1&query=${details.lat.toFixed(6)},${details.lng.toFixed(6)}` : undefined;
  const geometry = estimate.geometry;
  const [sizeKey, sizeText] = describeSize(template, geometry);
  const source = estimatorSourceLabel(template);

  // Readable strings only: these land in the lead's project description and the GHL/webhook
  // delivery. Keys never collide with the funnel's own question ids.
  const taken = new Set(funnel.config.questions.map((q) => q.id));
  const extras: Record<string, string> = {
    estimator_source: source,
    estimator_range: range,
    estimator_status: estimate.status,
    ...(address ? { estimator_address: clip(address, 300) } : {}),
    ...(mapUrl ? { estimator_address_map: mapUrl } : {}),
    [sizeKey]: sizeText,
    ...(picks.length ? { estimator_picks: clip(picks.join('; ')) } : {}),
    ...(siteVisit.length ? { estimator_site_visit: clip(siteVisit.join('; ')) } : {}),
    ...(likedLooks.length ? { estimator_looks: clip(likedLooks.map((l) => l.caption ?? l.alt).join('; ')) } : {}),
    ...(design
      ? {
          estimator_design: clip(design.summary.join('; ')),
          estimator_photos: clip(design.photos.map((p) => `${p.label}: ${p.url}`).join(' ; ')),
          estimator_design_url: clip(design.designUrl),
        }
      : {}),
    ...(notAsked.length ? { estimator_check_on_site: clip(notAsked.join('; ')) } : {}),
    ...(request.note ? { [taken.has('notes') ? 'estimator_note' : 'notes']: request.note } : {}),
  };
  const funnelAnswers = { ...base };
  for (const [key, value] of Object.entries(extras)) if (!taken.has(key)) funnelAnswers[key] = value;

  const visible = funnel.config.questions.filter((q) => q.showWhen.every((c) => matches(c, base)));
  const completed = [...visible].reverse().find((q) => base[q.id] !== undefined)?.id ?? null;

  const lines = [
    `${source}: ballpark ${range} (not a quote${template.pricesConfirmed ? '' : '; example prices'})`,
    ...(address ? [`Home address: ${address}${details?.verified ? ' (picked from Google suggestions)' : ' (typed)'}`] : []),
    ...(mapUrl ? [`Map: ${mapUrl}`] : []),
    `Homeowner: ${request.homeowner === 'yes' ? (template.trade === 'pool' ? 'yes, the pool is at their home' : 'yes, they own the home') : 'no, they rent'}`,
    ...(design ? ['Their design:', ...design.summary.map((d) => `- ${d}`)] : []),
    ...(design ? ['Price lines:'] : []),
    ...estimate.lines.map((l) => `- ${l.label}: ${formatRange(l.low, l.high)}`),
    ...(design?.bundleSaving ? [`- Go Luxe bundle saving: -${formatRange(design.bundleSaving.low, design.bundleSaving.high)}`] : []),
    ...(design ? ['Photos they saw (example designs, AI-assisted):', ...design.photos.map((p) => `- ${p.label}: ${p.url}`), `Reopen their design: ${design.designUrl}`] : []),
    ...(notAsked.length ? ['Not asked online, check on site:', ...notAsked.map((q) => `- ${q}`)] : []),
    ...(siteVisit.length ? ['Needs a site visit:', ...siteVisit.map((s) => `- ${s}`)] : []),
    ...(likedLooks.length ? [`Liked looks: ${likedLooks.map((l) => l.caption ?? l.alt).join('; ')}`] : []),
    ...(request.note ? [`Note: ${request.note}`] : []),
  ];

  return {
    funnelAnswers,
    contact: { firstName: request.contact.firstName, lastName: request.contact.lastName, email: request.contact.email, phone: request.contact.phone, consent: true },
    qualified,
    areaValid,
    completed,
    nextStep: qualified && estimatorBooking(contractor, funnel.config) !== 'none' ? 'calendar' : 'thanks',
    activity: {
      body: lines.join('\n'),
      metadata: {
        ...(funnel.contractorId ? { contractor_id: funnel.contractorId } : {}),
        estimator: {
          slug: contractor.slug,
          funnel: funnel.slug,
          pricesConfirmed: template.pricesConfirmed,
          answers,
          dimensions: request.dimensions ?? null,
          geometry,
          lines: estimate.lines,
          low: estimate.low,
          high: estimate.high,
          status: estimate.status,
          siteVisitItems: estimate.siteVisitItems,
          likedLooks: likedLooks.map((l) => l.src),
          note: request.note ?? null,
          timeline: request.timeline ?? null,
          homeowner: request.homeowner,
          address: address
            ? { line: address, zip: request.zip, city: details?.city ?? null, state: details?.state ?? null, lat: details?.lat ?? null, lng: details?.lng ?? null, verified: details?.verified ?? false }
            : null,
          ...(design
            ? {
                ...(design.funnel ? { funnel: design.funnel } : {}),
                configurator: {
                  selection: design.selection ?? null,
                  summary: design.summary,
                  photos: design.photos,
                  designUrl: design.designUrl,
                  total: design.total,
                  bundleSaving: design.bundleSaving,
                },
              }
            : {}),
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

/**
 * How a qualified estimator lead books: 'homequote' = HomeQuote's own calendar
 * (the route returns a booking ticket, the screen records the booking server-side),
 * 'link' = the external calendarUrl (Calendly fallback), 'none' = no booking step
 * (the screen says we will call). The contractor's own setting wins, then the
 * lead funnel's calendarProvider; a contractor link only counts with a URL.
 */
export function estimatorBooking(
  contractor: Pick<ContractorEstimatorConfig, 'calendarProvider' | 'calendarUrl'>,
  config: Pick<FunnelConfig, 'calendarProvider' | 'calendarUrl'>,
): 'homequote' | 'link' | 'none' {
  if (contractor.calendarProvider === 'homequote') return 'homequote';
  if (contractor.calendarProvider === 'none') return 'none';
  if (contractor.calendarProvider === 'link') return contractor.calendarUrl ?? config.calendarUrl ? 'link' : 'none';
  if (usesNativeCalendar(config)) return 'homequote';
  return contractor.calendarUrl ?? config.calendarUrl ? 'link' : 'none';
}

/** The booking link with the homeowner's name/email (and UTMs) prefilled, for Calendly links only. */
export function bookingUrl(
  base: string | undefined,
  person: { firstName: string; lastName: string; email: string },
  attribution: Record<string, string> = {},
): string | undefined {
  if (!base) return undefined;
  try {
    const url = new URL(base);
    if (url.hostname !== 'calendly.com') return base;
    url.searchParams.set('name', `${person.firstName} ${person.lastName}`.trim());
    url.searchParams.set('email', person.email);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) if (attribution[key]) url.searchParams.set(key, attribution[key]);
    return url.toString();
  } catch {
    return base;
  }
}
