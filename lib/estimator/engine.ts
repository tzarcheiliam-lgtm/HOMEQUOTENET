import type {
  Answers,
  Estimate,
  EstimateInput,
  EstimateLine,
  EstimatorQuestion,
  EstimatorTemplate,
  PriceUnit,
} from './types.ts';
import { CUSTOM_PACKAGE_ID, POOL_SHAPES, POOL_SIZES } from './types.ts';
import { poolGeometry } from './geometry.ts';

/** Valid picks for a question: unknown ids dropped, a single question keeps its first pick. */
export function picksFor(q: EstimatorQuestion, answers: Answers): string[] {
  const raw = answers[q.id];
  const valid = (Array.isArray(raw) ? raw : []).filter((id) => q.options.some((o) => o.id === id));
  const unique = [...new Set(valid)];
  return q.kind === 'single' ? unique.slice(0, 1) : unique;
}

/** Questions to ask, in template order (a hidden parent hides its children). */
export function visibleQuestions(template: EstimatorTemplate, answers: Answers): EstimatorQuestion[] {
  const shown = new Set<string>();
  return template.questions.filter((q) => {
    if (q.showWhen) {
      const parent = template.questions.find((p) => p.id === q.showWhen!.questionId);
      if (!parent || !shown.has(parent.id)) return false;
      if (!q.showWhen.anyOf.some((id) => picksFor(parent, answers).includes(id))) return false;
    }
    shown.add(q.id);
    return true;
  });
}

/**
 * Answers with a package's answers filled in, and the package question set to
 * that package. Existing answers are kept; the package's answers overwrite the
 * questions they name (stale answers to questions the new scope hides are
 * harmless, since the estimate ignores hidden questions).
 *
 * CUSTOM_PACKAGE_ID is deliberately simple: every existing answer is kept and
 * only the package question changes to [custom]. An unknown package id returns
 * a plain copy of the answers. The input is never mutated.
 */
export function applyPackage(template: EstimatorTemplate, answers: Answers, packageId: string): Answers {
  const next: Answers = {};
  for (const [id, picks] of Object.entries(answers)) next[id] = [...picks];

  const packageQ = template.questions.find((q) => q.role === 'package');
  if (packageId === CUSTOM_PACKAGE_ID) {
    if (packageQ) next[packageQ.id] = [CUSTOM_PACKAGE_ID];
    return next;
  }

  const pkg = template.packages.find((p) => p.id === packageId);
  if (!pkg) return next;
  for (const [id, picks] of Object.entries(pkg.answers)) next[id] = [...picks];
  if (packageQ) next[packageQ.id] = [pkg.id];
  return next;
}

/** Cents-level rounding so decimal unit prices cannot push a round-up over a step. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The estimate for a set of answers.
 *
 * - Only visible questions count; stale answers to hidden ones are ignored.
 * - The package and scope questions only steer, they never produce lines.
 * - Quantity per unit: interior_sqft, perimeter_lf and deck_sqft come from the
 *   geometry, linear_ft and each use price.quantity (default 1), flat is 1.
 *   Quantities are rounded to whole units; line low/high = unit price x quantity.
 * - A deck_sqft line with no deck area yet (deck size unanswered) is skipped and
 *   leaves the estimate incomplete, so the range never shows a deck at $0.
 * - Totals add the lines, apply minimumJob, then round the low end down and the
 *   high end up to roundTo (neither end ends below minimumJob). With no lines,
 *   low and high are null.
 * - status: incomplete (a shown question is unanswered) > site_visit > ready.
 */
export function computeEstimate(template: EstimatorTemplate, input: EstimateInput): Estimate {
  const geometry = poolGeometry(template, input);
  const questions = visibleQuestions(template, input.answers);
  const lines: EstimateLine[] = [];
  const unanswered: string[] = [];
  const siteVisitItems: Estimate['siteVisitItems'] = [];
  const seenSiteVisit = new Set<string>();
  const deferred: string[] = [];

  const quantityFor = (unit: PriceUnit, defaultQuantity: number | undefined): number => {
    switch (unit) {
      case 'interior_sqft':
        return Math.round(geometry.interiorSqft);
      case 'perimeter_lf':
        return Math.round(geometry.perimeterFt);
      case 'deck_sqft':
        return Math.round(geometry.deckSqft);
      case 'flat':
        return 1;
      default:
        return Math.max(0, Math.round(defaultQuantity ?? 1));
    }
  };

  for (const q of questions) {
    const picks = picksFor(q, input.answers);
    if (picks.length === 0) unanswered.push(q.id);
    for (const id of picks) {
      const opt = q.options.find((o) => o.id === id)!;
      if (opt.siteVisit && !seenSiteVisit.has(opt.siteVisit)) {
        seenSiteVisit.add(opt.siteVisit);
        siteVisitItems.push({ questionId: q.id, label: opt.siteVisit });
      }
      if (q.role === 'package' || q.role === 'scope') continue;
      const price = opt.price;
      if (!price || !Number.isFinite(price.low) || !Number.isFinite(price.high)) continue;
      const quantity = quantityFor(price.unit, price.quantity);
      if (quantity <= 0) {
        if (price.unit === 'deck_sqft') deferred.push(q.id);
        continue;
      }
      lines.push({
        questionId: q.id,
        optionId: id,
        label: q.summaryLabel ? `${q.summaryLabel}: ${opt.label}` : opt.label,
        unit: price.unit,
        quantity,
        low: cents(price.low * quantity),
        high: cents(price.high * quantity),
      });
    }
  }

  // A deck line waiting on a deck area is normally covered by the unanswered
  // deck-size question; only flag the deck question itself when nothing else is.
  const deckSizeWaiting = questions.some((q) => q.role === 'deckSize' && unanswered.includes(q.id));
  if (!deckSizeWaiting) {
    for (const id of deferred) if (!unanswered.includes(id)) unanswered.push(id);
  }

  let low: number | null = null;
  let high: number | null = null;
  if (lines.length) {
    const step = Number.isFinite(template.roundTo) && template.roundTo > 0 ? template.roundTo : 0;
    const floor = Number.isFinite(template.minimumJob) ? Math.max(0, template.minimumJob) : 0;
    const sumLow = Math.max(floor, cents(lines.reduce((t, l) => t + l.low, 0)));
    const sumHigh = Math.max(floor, cents(lines.reduce((t, l) => t + l.high, 0)));
    low = Math.max(floor, step ? Math.floor(sumLow / step) * step : sumLow);
    high = Math.max(floor, step ? Math.ceil(sumHigh / step) * step : sumHigh);
  }

  const status = unanswered.length ? 'incomplete' : siteVisitItems.length ? 'site_visit' : 'ready';
  return { geometry, lines, low, high, siteVisitItems, unanswered, status };
}

/* ------------------------------------------------------------------ */
/* Template validation                                                 */
/* ------------------------------------------------------------------ */

const PRICE_UNITS: readonly PriceUnit[] = ['interior_sqft', 'perimeter_lf', 'deck_sqft', 'linear_ft', 'each', 'flat'];
const ROLES = ['project', 'shape', 'size', 'package', 'scope', 'deckSize'] as const;

/** Problems with a template as readable strings (empty = valid). */
export function validateTemplate(template: EstimatorTemplate): string[] {
  const problems: string[] = [];
  const qs = template.questions;

  // Duplicate ids.
  const seenQ = new Set<string>();
  for (const q of qs) {
    if (seenQ.has(q.id)) problems.push(`Duplicate question id "${q.id}".`);
    seenQ.add(q.id);
    const seenO = new Set<string>();
    for (const o of q.options) {
      if (seenO.has(o.id)) problems.push(`Question "${q.id}" has duplicate option id "${o.id}".`);
      seenO.add(o.id);
    }
  }

  // showWhen must point at an earlier question and one of its options.
  qs.forEach((q, index) => {
    if (!q.showWhen) return;
    const parentIndex = qs.findIndex((p) => p.id === q.showWhen!.questionId);
    if (parentIndex === -1) {
      problems.push(`Question "${q.id}" is shown by unknown question "${q.showWhen.questionId}".`);
      return;
    }
    if (parentIndex >= index) {
      problems.push(`Question "${q.id}" is shown by "${q.showWhen.questionId}", which does not come before it.`);
    }
    const parent = qs[parentIndex];
    for (const optionId of q.showWhen.anyOf) {
      if (!parent.options.some((o) => o.id === optionId)) {
        problems.push(`Question "${q.id}" is shown by unknown option "${parent.id}.${optionId}".`);
      }
    }
  });

  // Prices.
  for (const q of qs) {
    for (const o of q.options) {
      const p = o.price;
      if (!p) continue;
      const where = `Option "${q.id}.${o.id}"`;
      if (!PRICE_UNITS.includes(p.unit)) problems.push(`${where} has unknown price unit "${String(p.unit)}".`);
      if (!Number.isFinite(p.low) || !Number.isFinite(p.high)) {
        problems.push(`${where} has a price that is not a finite number.`);
      } else {
        if (p.low < 0) problems.push(`${where} has a negative low price.`);
        if (p.high < p.low) problems.push(`${where} has a high price below its low price.`);
      }
      if (p.quantity !== undefined && !(Number.isFinite(p.quantity) && p.quantity > 0)) {
        problems.push(`${where} has a quantity that is not above zero.`);
      }
    }
  }

  // Roles: at most once each.
  for (const role of ROLES) {
    const withRole = qs.filter((q) => q.role === role);
    if (withRole.length > 1) {
      problems.push(`Role "${role}" is used by more than one question (${withRole.map((q) => `"${q.id}"`).join(', ')}).`);
    }
  }

  const byRole = (role: (typeof ROLES)[number]) => qs.find((q) => q.role === role);

  const shapeQ = byRole('shape');
  if (shapeQ) {
    for (const o of shapeQ.options) {
      if (!POOL_SHAPES.includes(o.id as (typeof POOL_SHAPES)[number])) {
        problems.push(`Shape option "${o.id}" is not a valid pool shape.`);
      }
    }
  }
  const sizeQ = byRole('size');
  if (sizeQ) {
    for (const o of sizeQ.options) {
      if (!POOL_SIZES.includes(o.id as (typeof POOL_SIZES)[number])) {
        problems.push(`Size option "${o.id}" is not a valid pool size.`);
      }
    }
  }

  const packageQ = byRole('package');
  if (packageQ) {
    const allowed = new Set([...template.packages.map((p) => p.id), CUSTOM_PACKAGE_ID]);
    for (const o of packageQ.options) {
      if (!allowed.has(o.id)) problems.push(`Package option "${o.id}" does not match any package.`);
    }
  }

  const deckSizeQ = byRole('deckSize');
  if (deckSizeQ) {
    for (const o of deckSizeQ.options) {
      if (!Object.hasOwn(template.geometry.deckSizes, o.id)) {
        problems.push(`Deck size option "${o.id}" has no area in geometry.deckSizes.`);
      }
    }
  }
  if (!deckSizeQ) {
    for (const q of qs) {
      if (q.options.some((o) => o.price?.unit === 'deck_sqft')) {
        problems.push(`Question "${q.id}" prices by deck area but the template has no deckSize question.`);
      }
    }
  }

  // Keep it short.
  const { maxSingleOptions, maxMultiOptions } = template.limits;
  for (const q of qs) {
    const max = q.kind === 'single' ? maxSingleOptions : maxMultiOptions;
    if (q.options.length > max) {
      problems.push(`Question "${q.id}" has ${q.options.length} options; a ${q.kind} question allows at most ${max}.`);
    }
  }

  // Packages.
  const seenP = new Set<string>();
  for (const pkg of template.packages) {
    if (seenP.has(pkg.id)) problems.push(`Duplicate package id "${pkg.id}".`);
    seenP.add(pkg.id);
    for (const [questionId, picks] of Object.entries(pkg.answers)) {
      const q = qs.find((x) => x.id === questionId);
      if (!q) {
        problems.push(`Package "${pkg.id}" answers unknown question "${questionId}".`);
        continue;
      }
      for (const optionId of picks) {
        if (!q.options.some((o) => o.id === optionId)) {
          problems.push(`Package "${pkg.id}" picks unknown option "${questionId}.${optionId}".`);
        }
      }
    }
  }

  for (const key of ['minimumJob', 'roundTo'] as const) {
    const n = template[key];
    if (!Number.isFinite(n) || n < 0) problems.push(`${key} must be a number of at least 0.`);
  }

  return problems;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** Whole US dollars. Non-finite input renders as an em dash, never "NaN". */
export function formatUsd(amount: number): string {
  return Number.isFinite(amount) ? usd.format(Math.round(amount)) : '—';
}

/** "$12,000 – $18,500", or "$12,000" when both ends match. */
export function formatRange(low: number, high: number): string {
  return low === high ? formatUsd(low) : `${formatUsd(low)} – ${formatUsd(high)}`;
}
