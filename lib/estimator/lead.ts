import { z } from 'zod';
import { contactSchema, inServiceArea, matches, qualify, serviceAreaValid, type FunnelConfig } from '@/lib/funnels/schema';
import { formatRange, picksFor, visibleQuestions } from './engine.ts';
import { LEAD_TIMELINES, type EstimatorLeadRequest } from './lead-client.ts';
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
// not a validation error, so bots learn nothing from the response.
const contact = contactSchema.extend({ website: z.string().max(500).default('') });

export const leadRequestSchema = z.object({
  answers: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,49}$/), z.array(pickId).max(20))
    .refine((a) => Object.keys(a).length <= 40, 'Too many answers'),
  dimensions: z.object({ lengthFt: dimension, widthFt: dimension, avgDepthFt: dimension.optional() }).optional(),
  likedLooks: z.array(z.string().max(300)).max(24).optional(),
  note: z.string().max(1000, 'Please keep this under 1,000 characters.').optional(),
  zip: z.string().regex(/^\d{5}$/, 'Enter a valid five-digit ZIP code.'),
  homeowner: z.enum(['yes', 'no'], { errorMap: () => ({ message: 'Tell us whether you own the home.' }) }),
  timeline: z.enum(LEAD_TIMELINES.map((t) => t.id) as [string, ...string[]], { errorMap: () => ({ message: 'Choose when you want to start.' }) }),
  contact,
  consentText: z.string().max(1000),
  measurement: z.boolean().default(false),
  tracking: z.object({
    fbc: z.string().max(256).optional(),
    fbp: z.string().max(100).optional(),
    eventId: z.string().max(100).optional(),
    pageUrl: z.string().url().max(4000).refine((u) => /^https?:$/.test(new URL(u).protocol), 'Use an http(s) URL').optional(),
  }).optional(),
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
 * per trade (EstimatorTemplate.trade). A bathroom refresh files as a full
 * remodel: the bathroom funnel has no "update the look" service, and its
 * closest small option ("repair") does not qualify.
 */
const PROJECT_ALIASES: Record<string, Record<string, string[]>> = {
  pool: {
    remodel: ['full_remodel', 'pool_remodel', 'remodel'],
    backyard: ['backyard', 'backyard_renovation', 'backyard_remodel'],
  },
  bathroom: {
    full: ['full_remodel'],
    refresh: ['full_remodel'],
  },
};

function projectAliases(trade: string, project: string | undefined): string[] {
  if (!project) return [];
  const byTrade = Object.hasOwn(PROJECT_ALIASES, trade) ? PROJECT_ALIASES[trade]! : {};
  return [project, ...(Object.hasOwn(byTrade, project) ? byTrade[project]! : [])];
}

/**
 * Fills the funnel's own questions from the estimator answers: the ZIP question,
 * the homeowner and timeline questions by id, and any choice question whose
 * option matches the project pick. Optional typed questions are skipped (''),
 * anything else stays unanswered (qualifyLead then decides on what is known).
 */
export function funnelAnswersFor(
  config: FunnelConfig,
  input: { zip: string; homeowner: string; timeline: string; project?: string; trade?: string },
): Record<string, string> {
  const answers: Record<string, string> = {};
  const aliases = projectAliases(input.trade ?? 'pool', input.project);
  for (const q of config.questions) {
    if (!q.showWhen.every((c) => matches(c, answers))) continue;
    const has = (value: string) => q.options.some((o) => o.value === value);
    if (q.type === 'zip') answers[q.id] = input.zip;
    else if (q.type !== 'choice') {
      if (q.required === false) answers[q.id] = '';
    } else if (q.id === 'homeowner' && has(input.homeowner)) answers[q.id] = input.homeowner;
    else if (q.id === 'timeline' && has(input.timeline)) answers[q.id] = input.timeline;
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

export function buildLeadPayload(input: LeadPayloadInput): LeadPayload {
  const { template, contractor, funnel, request, answers, estimate, likedLooks } = input;
  const projectQ = template.questions.find((q) => q.role === 'project');
  const project = projectQ ? picksFor(projectQ, answers)[0] : undefined;

  const base = funnelAnswersFor(funnel.config, { zip: request.zip, homeowner: request.homeowner, timeline: request.timeline, project, trade: template.trade });
  const qualified = qualifyLead(funnel.config, base);
  const areaValid = areaValidFor(funnel.config, base);

  const range = estimate.low !== null && estimate.high !== null ? formatRange(estimate.low, estimate.high) : 'To be confirmed on site';
  const picks = describePicks(template, answers);
  const siteVisit = estimate.siteVisitItems.map((i) => i.label);
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
    [sizeKey]: sizeText,
    ...(picks.length ? { estimator_picks: clip(picks.join('; ')) } : {}),
    ...(siteVisit.length ? { estimator_site_visit: clip(siteVisit.join('; ')) } : {}),
    ...(likedLooks.length ? { estimator_looks: clip(likedLooks.map((l) => l.caption ?? l.alt).join('; ')) } : {}),
    ...(request.note ? { [taken.has('notes') ? 'estimator_note' : 'notes']: request.note } : {}),
  };
  const funnelAnswers = { ...base };
  for (const [key, value] of Object.entries(extras)) if (!taken.has(key)) funnelAnswers[key] = value;

  const visible = funnel.config.questions.filter((q) => q.showWhen.every((c) => matches(c, base)));
  const completed = [...visible].reverse().find((q) => base[q.id] !== undefined)?.id ?? null;

  const lines = [
    `${source}: ballpark ${range} (not a quote${template.pricesConfirmed ? '' : '; example prices'})`,
    ...estimate.lines.map((l) => `- ${l.label}: ${formatRange(l.low, l.high)}`),
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
    nextStep: qualified && funnel.config.calendarUrl ? 'calendar' : 'thanks',
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
          timeline: request.timeline,
          homeowner: request.homeowner,
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Booking link                                                        */
/* ------------------------------------------------------------------ */

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
