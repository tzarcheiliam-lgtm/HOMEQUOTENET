import { PRICING } from './config';
import { SIZES, isDesignComplete, type Design } from './design';

/**
 * Estimated price range for a finished design, from PRICING in config.ts.
 * Server-only (it reads the pricing numbers): the browser only ever receives the
 * result, and only after the contact step is submitted.
 *
 * Returns null, never a guess, when any number the design needs is not set.
 */
export type EstimateRange = { low: number; high: number };

export function estimateRange(design: Design, pricing: typeof PRICING = PRICING): EstimateRange | null {
  if (!isDesignComplete(design)) return null;
  const sqft = SIZES.find((s) => s.value === design.size)?.sqft;
  const base = pricing.basePerSqft[design.placement as keyof typeof pricing.basePerSqft];
  const mult = pricing.styleMultiplier[design.style as keyof typeof pricing.styleMultiplier];
  const { low, high } = pricing.rangeFactor;
  if (!sqft || !isPositive(base) || !isPositive(mult) || !isPositive(low) || !isPositive(high) || high < low) return null;
  let total = sqft * base * mult;
  for (const extra of design.extras ?? []) {
    const price = pricing.extraPrice[extra as keyof typeof pricing.extraPrice];
    if (price === null || price === undefined || !Number.isFinite(price) || price < 0) return null;
    total += price;
  }
  return { low: roundTo(total * low), high: roundTo(total * high) };
}

const isPositive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
/** Whole hundreds read like an estimate, not a quote. */
const roundTo = (n: number) => Math.round(n / 100) * 100;
