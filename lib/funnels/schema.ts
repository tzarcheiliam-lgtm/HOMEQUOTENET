import { z } from 'zod';
import { usZipState } from '../location/us-zip.ts';

const key = z.string().regex(/^[a-z][a-z0-9_]{0,49}$/);
const text = z.string().trim().min(1).max(300);
const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === 'https:', 'Use HTTPS');
const readableColor = z.string().regex(/^#[0-9a-fA-F]{6}$/).refine(value => {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return false;
  const c = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 1.05 / (c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 + 0.05) >= 4.8;
}, 'Choose a darker brand color with accessible contrast');
export const conditionSchema = z.object({
  question: key,
  operator: z.enum(['equals', 'in', 'not_equals']),
  values: z.array(z.string().max(100)).min(1).max(100),
});
// 'choice' is the original multiple-choice type (kept as-is so stored configs never change);
// the typed-answer kinds below let the homeowner type a response instead of picking a card.
export const TEXT_QUESTION_TYPES = ['short_text', 'long_text', 'address', 'number', 'email', 'phone'] as const;
export const QUESTION_TYPES = ['choice', 'zip', ...TEXT_QUESTION_TYPES] as const;
export const questionSchema = z.object({
  id: key,
  type: z.enum(QUESTION_TYPES),
  headline: text,
  description: z.string().max(300).optional(),
  // Typed questions only. `required` is unset on every existing question and means "required".
  placeholder: z.string().trim().max(120).optional(),
  required: z.boolean().optional(),
  // featured: visually emphasized card (e.g. high-ticket services). Order is the array order.
  options: z.array(z.object({ value: z.string().regex(/^[a-z0-9_]{1,50}$/), label: text, detail: z.string().max(120).optional(), featured: z.boolean().optional() })).max(20).default([]),
  showWhen: z.array(conditionSchema).max(10).default([]),
});
export const funnelSchema = z.object({
  version: z.literal(1),
  clientName: text,
  clientLogo: z.string().refine(v => /^\/(?!\/)/.test(v) || httpsUrl.safeParse(v).success).optional(),
  primaryColor: readableColor.default('#196dcc'),
  secondaryColor: readableColor.default('#042247'),
  industry: text,
  // zipPrefixes (3 digits) cover whole regions without listing every ZIP.
  // strictStates (optional, default none = unrestricted, unchanged for every existing funnel):
  // a hard state-level gate, independent of and broader than zipPrefixes/zipCodes. When set,
  // a project ZIP outside these states fails qualify() outright (see serviceAreaValid below) —
  // used by Pool Masters to reject out-of-state leads even though its own zipPrefixes (a tighter
  // LA/Ventura radius) only ever matched in-state ZIPs anyway. Two-letter USPS state codes.
  serviceArea: z.object({ label: text, zipCodes: z.array(z.string().regex(/^\d{5}$/)).max(10000).default([]), zipPrefixes: z.array(z.string().regex(/^\d{3}$/)).max(1000).default([]), strictStates: z.array(z.enum(['CA'])).max(10).default([]) }),
  questions: z.array(questionSchema).min(1).max(30),
  qualificationRules: z.array(conditionSchema).max(30).default([]),
  qualifiedMessage: text.default('Great — it looks like we may be able to help.'),
  reviewMessage: text.default('Let’s take a closer look at your project.'),
  unqualifiedAction: z.enum(['review', 'stop']).default('review'),
  calendarUrl: httpsUrl.optional(),
  calendarId: z.string().max(100).optional(),
  // ghl: embedded GHL calendar confirmed by a server callback. calendly: Calendly
  // inline embed, prefilled with name/email, booking reported by the embed.
  calendarProvider: z.enum(['ghl', 'calendly']).default('ghl'),
  calendarHeadline: text.optional(),
  thankYouPage: z.object({ headline: text, message: text }),
  // Optional link-preview / <title> overrides. Unset keeps the HomeQuote defaults.
  seo: z.object({ title: z.string().trim().min(1).max(70).optional(), description: z.string().trim().min(1).max(200).optional() }).optional(),
  // opt_in (default): the pixel stays off until the visitor ticks the footer box.
  // opt_out: it runs on visit and the same box, pre-ticked, turns it off.
  trackingPixels: z.object({ metaPixelId: z.string().regex(/^\d{5,30}$/).optional(), consentMode: z.enum(['opt_in', 'opt_out']).default('opt_in') }).default({ consentMode: 'opt_in' }),
  trust: z.object({
    rating: z.number().min(1).max(5).optional(), reviewCount: z.number().int().positive().optional(),
    license: text.optional(), financing: text.optional(), warranty: text.optional(),
    yearsInBusiness: z.number().int().positive().optional(), testimonial: text.optional(),
    projectPhoto: httpsUrl.optional(),
  }).default({}),
}).superRefine((config, ctx) => {
  const ids = new Set<string>();
  config.questions.forEach((q, index) => {
    if (['qualification', 'contact', 'calendar', 'thanks'].includes(q.id)) ctx.addIssue({ code: 'custom', message: 'Question ID is reserved for a funnel screen' });
    if (ids.has(q.id)) ctx.addIssue({ code: 'custom', message: 'Question IDs must be unique' });
    if (q.type === 'choice' && !q.options.length) ctx.addIssue({ code: 'custom', message: 'Choice questions need options' });
    if (new Set(q.options.map(o => o.value)).size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'Option values must be unique' });
    for (const c of q.showWhen) {
      if (!config.questions.slice(0, index).some(previous => previous.id === c.question)) ctx.addIssue({ code: 'custom', message: 'Branches must refer to earlier questions' });
    }
    ids.add(q.id);
  });
  if (config.questions.filter(q => q.type === 'zip').length !== 1) ctx.addIssue({ code: 'custom', message: 'Include exactly one ZIP question' });
  for (const c of config.qualificationRules) if (!ids.has(c.question)) ctx.addIssue({ code: 'custom', message: 'Qualification question does not exist' });
  if (config.calendarProvider === 'ghl' && !!config.calendarUrl !== !!config.calendarId) ctx.addIssue({ code: 'custom', message: 'Set calendarUrl and calendarId together' });
  if (config.calendarProvider === 'calendly' && config.calendarUrl && new URL(config.calendarUrl).hostname !== 'calendly.com') ctx.addIssue({ code: 'custom', message: 'Calendly URLs must be on calendly.com' });
});
export type FunnelConfig = z.infer<typeof funnelSchema>;
export type Question = FunnelConfig['questions'][number];
export type Answers = Record<string, string>;
const usPhone = (v: string) => /^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(v.replace(/\D/g, ''));
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().refine(usPhone, 'Enter a valid US phone number'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to be contacted about your project' }) }),
  website: z.string().max(0).default(''),
});
export type Contact = z.infer<typeof contactSchema>;
export type Attribution = Record<string, string>;
export type Session = {
  id: string; answers: Answers; current_step: string; version: number;
  qualified: boolean | null; contact_submitted_at: string | null;
  booked_at: string | null; attribution: Attribution;
  // null = this funnel has no serviceArea.strictStates gate (every funnel except
  // Pool Masters today); true/false only meaningful once the ZIP question is answered.
  service_area_valid: boolean | null;
  // Only for the session owner on the Calendly step, to prefill the booking form.
  prefill?: { name: string; email: string };
};

export function matches(condition: z.infer<typeof conditionSchema>, answers: Answers) {
  const value = answers[condition.question];
  if (!value) return false;
  return condition.operator === 'not_equals' ? !condition.values.includes(value) : condition.values.includes(value);
}
export function visibleQuestions(config: FunnelConfig, answers: Answers) {
  return config.questions.filter(q => q.showWhen.every(c => matches(c, answers)));
}
export type TextQuestionType = (typeof TEXT_QUESTION_TYPES)[number];
export const isTextQuestion = (q: Pick<Question, 'type'>): q is Question & { type: TextQuestionType } => (TEXT_QUESTION_TYPES as readonly string[]).includes(q.type);
/** Existing questions have no `required` flag and were always required. */
export const isRequired = (q: Pick<Question, 'required'>) => q.required !== false;
/** Skipped optional questions are stored as '' so "skipped" is distinguishable from "not reached yet". */
export const isAnswered = (answers: Answers, id: string) => answers[id] !== undefined;
export const DEFAULT_PLACEHOLDERS: Record<TextQuestionType, string> = {
  short_text: 'Type your answer', long_text: 'Tell us a little more…', address: '123 Main St, Los Angeles, CA 90001',
  number: 'e.g. 1500', email: 'name@example.com', phone: '(555) 123-4567',
};
const MAX_LENGTH: Record<TextQuestionType, number> = { short_text: 200, long_text: 2000, address: 300, number: 20, email: 254, phone: 30 };
export const MAX_ANSWER_LENGTH = 2000;
const MISSING: Record<TextQuestionType, string> = {
  short_text: 'Enter your answer to continue.', long_text: 'Enter your answer to continue.', address: 'Enter the property address to continue.',
  number: 'Enter a number to continue.', email: 'Enter your email address to continue.', phone: 'Enter your phone number to continue.',
};

/**
 * The single answer validator: the public funnel form, the PATCH route and the builder preview all
 * call it so they can never disagree. Returns the normalized value to store. Address validation is
 * deliberately permissive (non-empty, sane length) — real addresses come in too many shapes to police.
 */
export function validateAnswer(q: Question, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const input = typeof raw === 'string' ? raw : '';
  if (q.type === 'choice') return q.options.some(o => o.value === input) ? { ok: true, value: input } : { ok: false, error: 'Choose one of the options.' };
  if (q.type === 'zip') return /^\d{5}$/.test(input) ? { ok: true, value: input } : { ok: false, error: 'Enter a valid five-digit ZIP code.' };
  const type = q.type as TextQuestionType;
  // Control characters never belong in an answer; only long text keeps line breaks.
  const value = (type === 'long_text' ? input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : input.replace(/[\u0000-\u001F\u007F]+/g, ' ')).trim();
  if (!value) return isRequired(q) ? { ok: false, error: MISSING[type] } : { ok: true, value: '' };
  if (value.length > MAX_LENGTH[type]) return { ok: false, error: `Please keep this under ${MAX_LENGTH[type]} characters.` };
  if (type === 'email') return z.string().email().safeParse(value).success ? { ok: true, value: value.toLowerCase() } : { ok: false, error: 'Enter a valid email address.' };
  if (type === 'phone') return usPhone(value) ? { ok: true, value } : { ok: false, error: 'Enter a valid US phone number.' };
  if (type === 'number') {
    const numeric = value.replace(/[,\s]/g, '');
    return /^-?\d+(\.\d+)?$/.test(numeric) ? { ok: true, value: numeric } : { ok: false, error: 'Enter a valid number.' };
  }
  return { ok: true, value };
}
/** Prune answers to branches that no longer apply, in topological question order. */
export function sanitizeAnswers(config: FunnelConfig, input: Answers): Answers {
  const result: Answers = {};
  for (const q of config.questions) {
    if (!q.showWhen.every(c => matches(c, result))) continue;
    if (input[q.id] === undefined) continue;
    const checked = validateAnswer(q, input[q.id]);
    if (checked.ok) result[q.id] = checked.value;
  }
  return result;
}
export function qualify(config: FunnelConfig, answers: Answers): boolean | null {
  if (visibleQuestions(config, answers).some(q => !isAnswered(answers, q.id))) return null;
  const zip = answers[config.questions.find(q => q.type === 'zip')!.id];
  return inServiceArea(config, zip) && serviceAreaValid(config, zip) && config.qualificationRules.every(rule => matches(rule, answers));
}
export function inServiceArea(config: FunnelConfig, zip: string) {
  return config.serviceArea.zipCodes.includes(zip) || config.serviceArea.zipPrefixes.some(prefix => zip.startsWith(prefix));
}
/**
 * The hard state-level gate (see `serviceArea.strictStates`). Unset (every funnel except
 * Pool Masters today) always passes, so this is a no-op for the rest of the app. When set,
 * an out-of-state or unresolvable ZIP fails regardless of the radius-based `inServiceArea`
 * check above. Pure/exported so both the server (route.ts, the real enforcement) and the
 * client (funnel-experience.tsx, for the polished "outside our service area" copy) agree.
 */
export function serviceAreaValid(config: FunnelConfig, zip: string): boolean {
  if (!config.serviceArea.strictStates.length) return true;
  const state = usZipState(zip);
  return !!state && (config.serviceArea.strictStates as string[]).includes(state);
}
export function consentText(config: FunnelConfig) {
  // A HomeQuote-branded (house) funnel can share the request with partner contractors.
  const recipients = config.clientName === 'HomeQuote Network' ? 'HomeQuote Network and the contractor partners it matches me with' : `HomeQuote Network and ${config.clientName}`;
  return `I agree that ${recipients} may call, text, or email me about my project, including using automated technology. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.`;
}
// Meta's dynamic URL parameter macros (verified current as of this writing: {{campaign.id}},
// {{campaign.name}}, {{adset.id}}, {{adset.name}}, {{ad.id}}, {{ad.name}}, {{placement}},
// {{site_source_name}}) are configured in Ads Manager to append these plain query params —
// captured here alongside the existing utm_*/fbclid/gclid set, never invented client-side.
const ATTRIBUTION_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid',
  'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name', 'placement', 'site_source_name'] as const;
export function captureAttribution(url: string, referrer: string, device: string): Attribution {
  const parsed = new URL(url);
  const result: Attribution = { landing_page_url: `${parsed.origin}${parsed.pathname}`, device_type: device };
  for (const k of ATTRIBUTION_PARAMS) {
    const value = parsed.searchParams.get(k);
    if (value) result[k] = value.slice(0, 500);
  }
  try { const r = new URL(referrer); result.referrer = `${r.origin}${r.pathname}`; } catch { /* Direct visit. */ }
  return result;
}

/** Calendly inline-embed URL with prefilled invitee details and UTM passthrough. */
export function calendlyEmbedUrl(base: string, host: string, prefill?: { name: string; email: string }, attribution: Attribution = {}) {
  const url = new URL(base);
  url.searchParams.set('embed_domain', host);
  url.searchParams.set('embed_type', 'Inline');
  url.searchParams.set('hide_gdpr_banner', '1');
  if (prefill?.name) url.searchParams.set('name', prefill.name);
  if (prefill?.email) url.searchParams.set('email', prefill.email);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) if (attribution[key]) url.searchParams.set(key, attribution[key]);
  return url.toString();
}
export const calendlyUri = z.string().max(300).regex(/^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]+(\/invitees\/[A-Za-z0-9-]+)?$/);
