import {
  APPROX_SQFT,
  BASE_PRICE,
  BATHROOM_OPTIONS,
  LOAN_LIMITS,
  RETURN_ESTIMATE,
  ROOMS,
  ROOM_FINISH_OPTIONS,
  ROOM_LABELS,
  FINISH_LABELS,
  SITE_QUESTIONS,
  UPGRADE_COST,
  type Bedrooms,
  type FinishLevel,
  type ReturnKey,
  type Room,
  type SiteAnswer,
  type SiteQuestionId,
  type SizeTier,
} from './pricing-config.ts';

/**
 * Pure pricing logic for the ADU estimator. No React, no I/O. Every number comes
 * from pricing-config.ts.
 */

export type BuildKind = 'garage' | 'new';

export type AduSelection = {
  kind: BuildKind;
  /** Ignored for a garage conversion. */
  bedrooms: Bedrooms;
  /** Ignored for a garage conversion; coerced to a valid count for the bedrooms. */
  bathrooms: number;
  finishes: Record<Room, FinishLevel>;
  site: Partial<Record<SiteQuestionId, SiteAnswer>>;
};

export const DEFAULT_SELECTION: AduSelection = {
  kind: 'new',
  bedrooms: '1',
  bathrooms: 1,
  finishes: { bedroom: 'basic', kitchen: 'basic', bathroom: 'basic', livingRoom: 'basic' },
  site: {},
};

/** Nearest valid bathroom count for these bedrooms (keeps the choice when it is valid). */
export function normalizeBathrooms(bedrooms: Bedrooms, bathrooms: number): number {
  const valid = BATHROOM_OPTIONS[bedrooms];
  return valid.includes(bathrooms) ? bathrooms : valid[0];
}

/** A finish the room does not offer falls back to the highest level it does. */
export function clampFinish(room: Room, finish: FinishLevel): FinishLevel {
  const options = ROOM_FINISH_OPTIONS[room];
  if (options.includes(finish)) return finish;
  return options[options.length - 1];
}

export function resolveTier(kind: BuildKind, bedrooms: Bedrooms, bathrooms: number): SizeTier {
  if (kind === 'garage') return 'garage';
  if (bedrooms === 'studio' || bedrooms === '1') return 'studio1';
  const baths = normalizeBathrooms(bedrooms, bathrooms);
  if (bedrooms === '2') return baths === 1 ? 'b2ba1' : 'b2ba2';
  return baths === 2 ? 'b3ba2' : 'b3ba3';
}

export function resolveReturnKey(kind: BuildKind, bedrooms: Bedrooms, bathrooms: number): ReturnKey {
  if (kind === 'garage') return 'garage';
  if (bedrooms === 'studio') return 'studio';
  if (bedrooms === '1') return 'bed1';
  return resolveTier(kind, bedrooms, bathrooms) as Exclude<SizeTier, 'garage' | 'studio1'>;
}

export type LineItem = { id: string; label: string; amount: number };

export type SiteFlag = { id: SiteQuestionId; label: string; answer: 'yes' | 'unsure' };

/**
 * firm:       all nine site questions answered "No".
 * pending:    nothing flagged, but some site questions are still unanswered.
 * site_visit: at least one "Yes" or "Not sure": a starting price, not an estimate.
 */
export type PriceStatus = 'firm' | 'pending' | 'site_visit';

export type Estimate = {
  tier: SizeTier;
  returnKey: ReturnKey;
  /** null for a garage conversion (fixed footprint, no size option). */
  approxSqft: number | null;
  basePrice: number;
  items: LineItem[];
  total: number;
  status: PriceStatus;
  /** True only when `status` is "firm". Anything else is shown as a starting price. */
  isFirm: boolean;
  siteVisitItems: SiteFlag[];
  unansweredCount: number;
};

export function computeEstimate(selection: AduSelection): Estimate {
  const { kind } = selection;
  const bedrooms = selection.bedrooms;
  const bathrooms = normalizeBathrooms(bedrooms, selection.bathrooms);
  const tier = resolveTier(kind, bedrooms, bathrooms);

  const items: LineItem[] = [];
  let total = BASE_PRICE[tier];
  for (const room of ROOMS) {
    const finish = clampFinish(room, selection.finishes[room] ?? 'basic');
    if (finish === 'basic') continue;
    const amount = UPGRADE_COST[room][finish]?.[tier] ?? 0;
    items.push({ id: `${room}:${finish}`, label: `${ROOM_LABELS[room]}: ${FINISH_LABELS[finish]}`, amount });
    total += amount;
  }

  const siteVisitItems: SiteFlag[] = [];
  let unansweredCount = 0;
  for (const q of SITE_QUESTIONS) {
    const answer = selection.site[q.id];
    if (answer === 'yes' || answer === 'unsure') {
      siteVisitItems.push({ id: q.id, label: q.visitNote, answer });
    } else if (answer !== 'no') {
      unansweredCount += 1;
    }
  }
  const status: PriceStatus =
    siteVisitItems.length > 0 ? 'site_visit' : unansweredCount > 0 ? 'pending' : 'firm';

  return {
    tier,
    returnKey: resolveReturnKey(kind, bedrooms, bathrooms),
    approxSqft: kind === 'garage' ? null : APPROX_SQFT[bedrooms],
    basePrice: BASE_PRICE[tier],
    items,
    total,
    status,
    isFirm: status === 'firm',
    siteVisitItems,
    unansweredCount,
  };
}

export function returnEstimateFor(key: ReturnKey) {
  return RETURN_ESTIMATE[key];
}

/**
 * Standard amortization: payment = P * i / (1 - (1 + i)^-n), i = monthly rate,
 * n = months. A 0% rate is principal / n. Returns null (never NaN) for inputs
 * that are not a usable loan: the UI shows a prompt instead of a number.
 */
export function monthlyPayment(principal: number, annualRatePercent: number, termYears: number): number | null {
  if (![principal, annualRatePercent, termYears].every(Number.isFinite)) return null;
  if (principal <= 0) return null;
  if (annualRatePercent < 0 || annualRatePercent > LOAN_LIMITS.maxRatePercent) return null;
  if (termYears < LOAN_LIMITS.minTermYears || termYears > LOAN_LIMITS.maxTermYears) return null;
  const n = Math.round(termYears * 12);
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Whole US dollars, e.g. $178,000. Non-finite input renders as an em dash, never "NaN". */
export function formatUsd(amount: number): string {
  return Number.isFinite(amount) ? usd.format(Math.round(amount)) : '—';
}
