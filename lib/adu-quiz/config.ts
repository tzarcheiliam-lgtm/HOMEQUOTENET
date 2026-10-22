/**
 * ADU quiz (/adu-quiz): the single source of truth for everything you change
 * per buyer or per campaign. Quiz logic (lib/adu-quiz/quiz.ts) never hard-codes
 * a threshold; it reads the values below.
 *
 * Every line marked TODO is a placeholder you must fill in before ads go live.
 * They are listed again in docs/adu-quiz.md.
 *
 * Server-only values (LEAD_WEBHOOK_URL) are never sent to the browser: client
 * components only receive `publicConfig()`.
 */
import { site } from '@/content/site';

/** Shown in the consent text and footer. Defaults to the site name. */
export const BRAND_NAME: string = site.name;

/** Budget answers whose top of range is at or below this are not qualified. */
export const MIN_BUDGET = 150000;

/** Timeline answers that are not qualified. Values: within_3, 3_6, 6_12, 12_plus, researching. */
export const DQ_TIMELINES: readonly string[] = ['12_plus', 'researching'];

/**
 * TODO: pricing behind the estimated range shown AFTER the contact step. Server-only:
 * these numbers never reach the browser before the visitor submits.
 *
 *   estimate  = sqft x basePerSqft[placement] x styleMultiplier[style] + sum(extraPrice[extra])
 *   range     = estimate x rangeFactor.low  ..  estimate x rangeFactor.high
 *
 * `null` means "not set yet". If ANY number the visitor's design needs is null,
 * no range is shown and the page says the builder will confirm it at the
 * consultation. Fill these in with the buyer's real numbers; nothing here is a
 * real price.
 */
export const PRICING: {
  basePerSqft: Record<'backyard' | 'garage_conversion' | 'attached' | 'above_garage', number | null>;
  styleMultiplier: Record<'modern' | 'craftsman' | 'mediterranean' | 'farmhouse', number | null>;
  extraPrice: Record<'solar' | 'porch' | 'landscaping' | 'large_windows', number | null>;
  rangeFactor: { low: number | null; high: number | null };
} = {
  basePerSqft: { backyard: null, garage_conversion: null, attached: null, above_garage: null },
  styleMultiplier: { modern: null, craftsman: null, mediterranean: null, farmhouse: null },
  extraPrice: { solar: null, porch: null, landscaping: null, large_windows: null },
  rangeFactor: { low: null, high: null },
};

/**
 * TODO: GoHighLevel calendar embed URL (the iframe src, https; ADU_QUIZ_BOOKING_URL overrides it). In GHL, set the
 * calendar's confirmation to redirect to `<your site>/adu-quiz/booked` so the
 * page can fire the Schedule event (see docs/adu-quiz.md). Empty = the result
 * screen says the team will text to schedule.
 */
export const BOOKING_URL = '';

/**
 * TODO: GoHighLevel inbound webhook URL. Server-only. Can also be set with the
 * ADU_QUIZ_LEAD_WEBHOOK_URL environment variable (the env var wins).
 * Empty = leads are stored in the database only.
 */
export const LEAD_WEBHOOK_URL = '';

/** TODO: Meta Pixel / dataset id for this campaign (env wins). Empty = no Meta events. */
export const META_PIXEL_ID = '';

/** TODO: Google tag id, e.g. "G-XXXX" or "AW-XXXX" (env wins). Empty = Google tag not loaded. */
export const GOOGLE_TAG_ID = '';

/**
 * Advertising measurement. 'opt_out' = events fire unless the visitor unticks
 * "Allow optional advertising measurement"; 'opt_in' = nothing fires until they
 * tick it (the homeowner funnel default).
 */
export const MEASUREMENT_MODE: 'opt_in' | 'opt_out' = 'opt_out';

/** https only (plain http allowed for localhost outside production, for testing). */
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return u.protocol === 'https:' || (local && process.env.NODE_ENV !== 'production') ? u.toString() : '';
  } catch {
    return '';
  }
}

export const resolvedBookingUrl = () => safeUrl(process.env.ADU_QUIZ_BOOKING_URL || BOOKING_URL);
export const resolvedWebhookUrl = () => (process.env.ADU_QUIZ_LEAD_WEBHOOK_URL || LEAD_WEBHOOK_URL).trim();
export const resolvedPixelId = () => {
  const id = (process.env.NEXT_PUBLIC_ADU_QUIZ_META_PIXEL_ID || META_PIXEL_ID).trim();
  return /^\d{5,30}$/.test(id) ? id : '';
};
export const resolvedGoogleTagId = () => {
  const id = (process.env.NEXT_PUBLIC_ADU_QUIZ_GOOGLE_TAG_ID || GOOGLE_TAG_ID).trim();
  return /^(G|AW|GT)-[A-Za-z0-9]{4,20}$/.test(id) ? id : '';
};

/** Rules the quiz logic reads. */
export const qualificationRules = () => ({
  minBudget: MIN_BUDGET,
  dqTimelines: DQ_TIMELINES,
});

/** The only values the browser receives. Never includes LEAD_WEBHOOK_URL. */
export function publicConfig() {
  return {
    brandName: BRAND_NAME,
    bookingUrl: resolvedBookingUrl(),
    metaPixelId: resolvedPixelId(),
    googleTagId: resolvedGoogleTagId(),
    measurementMode: MEASUREMENT_MODE,
  };
}
export type PublicConfig = ReturnType<typeof publicConfig>;
