import { z } from 'zod';

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
export const questionSchema = z.object({
  id: key,
  type: z.enum(['choice', 'zip']),
  headline: text,
  description: z.string().max(300).optional(),
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
  serviceArea: z.object({ label: text, zipCodes: z.array(z.string().regex(/^\d{5}$/)).max(10000).default([]), zipPrefixes: z.array(z.string().regex(/^\d{3}$/)).max(1000).default([]) }),
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
  trackingPixels: z.object({ metaPixelId: z.string().regex(/^\d{5,30}$/).optional() }).default({}),
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
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().refine(v => /^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(v.replace(/\D/g, '')), 'Enter a valid US phone number'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to be contacted about your project' }) }),
  website: z.string().max(0).default(''),
});
export type Contact = z.infer<typeof contactSchema>;
export type Attribution = Record<string, string>;
export type Session = {
  id: string; answers: Answers; current_step: string; version: number;
  qualified: boolean | null; contact_submitted_at: string | null;
  booked_at: string | null; attribution: Attribution;
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
/** Prune answers to branches that no longer apply, in topological question order. */
export function sanitizeAnswers(config: FunnelConfig, input: Answers): Answers {
  const result: Answers = {};
  for (const q of config.questions) {
    if (!q.showWhen.every(c => matches(c, result))) continue;
    const value = input[q.id];
    if (q.type === 'zip' ? /^\d{5}$/.test(value ?? '') : q.options.some(o => o.value === value)) result[q.id] = value;
  }
  return result;
}
export function qualify(config: FunnelConfig, answers: Answers): boolean | null {
  if (visibleQuestions(config, answers).some(q => !answers[q.id])) return null;
  const zip = answers[config.questions.find(q => q.type === 'zip')!.id];
  return inServiceArea(config, zip) && config.qualificationRules.every(rule => matches(rule, answers));
}
export function inServiceArea(config: FunnelConfig, zip: string) {
  return config.serviceArea.zipCodes.includes(zip) || config.serviceArea.zipPrefixes.some(prefix => zip.startsWith(prefix));
}
export function consentText(config: FunnelConfig) {
  // A HomeQuote-branded (house) funnel can share the request with partner contractors.
  const recipients = config.clientName === 'HomeQuote Network' ? 'HomeQuote Network and the contractor partners it matches me with' : `HomeQuote Network and ${config.clientName}`;
  return `I agree that ${recipients} may call, text, or email me about my project, including using automated technology. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.`;
}
export function captureAttribution(url: string, referrer: string, device: string): Attribution {
  const parsed = new URL(url);
  const result: Attribution = { landing_page_url: `${parsed.origin}${parsed.pathname}`, device_type: device };
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) {
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
