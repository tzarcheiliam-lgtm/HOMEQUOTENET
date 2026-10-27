/**
 * Instant estimator engine: turns a trade template (questions + example costs)
 * and a homeowner's answers into a ballpark price RANGE. Pure: no React, no I/O.
 *
 * A template is plain JSON-shaped data on purpose. Today templates live in
 * lib/estimator/templates/*; later each contractor gets their own copy with
 * their own prices, so nothing here may assume a particular trade.
 */

export type CostRange = { low: number; high: number };

export type EstimatorOption = {
  id: string;
  label: string;
  /** Short helper text shown next to the option. */
  note?: string;
  /** Added to the range when this option is picked. */
  cost?: CostRange;
  /** Multiply `cost` by the picked size option's `sizeFactor`. */
  scalesWithSize?: boolean;
  /** Only on options of the question with `role: 'size'`. */
  sizeFactor?: number;
  /** Picking this flags the estimate for a site visit; the text is listed to the homeowner. */
  siteVisit?: string;
};

export type EstimatorQuestion = {
  id: string;
  label: string;
  help?: string;
  kind: 'single' | 'multi';
  /** At most one question per template is the size question. */
  role?: 'size';
  /** Prefix for this question's line items in the summary, e.g. "Surface". */
  summaryLabel?: string;
  options: EstimatorOption[];
  /** Ask only when an earlier question has one of these answers. */
  showWhen?: { questionId: string; anyOf: string[] };
};

export type EstimatorConfig = {
  trade: string;
  title: string;
  /** Used in the consent line, e.g. "pool project". */
  projectNoun: string;
  /** False while the prices are examples nobody has confirmed. The page says so. */
  pricesConfirmed: boolean;
  /** Neither end of the range goes below this. */
  minimumJob: number;
  /** Low end rounds down and high end rounds up to this step. */
  roundTo: number;
  questions: EstimatorQuestion[];
  notIncluded: string[];
  disclaimer: string;
};

/** Picked option ids per question id. A single question uses a one-element array. */
export type Answers = Record<string, string[]>;

export type RangeLineItem = { questionId: string; optionId: string; label: string; low: number; high: number };

/**
 * incomplete: a shown question is unanswered, so the range may still move.
 * site_visit: everything answered, but something needs an on-site look.
 * ready:      everything answered, nothing flagged.
 */
export type RangeStatus = 'incomplete' | 'site_visit' | 'ready';

export type RangeEstimate = {
  items: RangeLineItem[];
  /** null until at least one priced option is picked. */
  low: number | null;
  high: number | null;
  sizeFactor: number;
  siteVisitItems: { questionId: string; label: string }[];
  unanswered: string[];
  status: RangeStatus;
};

function optionOf(q: EstimatorQuestion, id: string) {
  return q.options.find((o) => o.id === id);
}

/** Valid picks for a question: unknown ids dropped, a single question keeps only its first pick. */
export function picksFor(q: EstimatorQuestion, answers: Answers): string[] {
  const valid = (answers[q.id] ?? []).filter((id, i, all) => optionOf(q, id) && all.indexOf(id) === i);
  return q.kind === 'single' ? valid.slice(0, 1) : valid;
}

/**
 * Questions to ask, in template order. A question whose parent is hidden is
 * hidden too, so a stale answer to a hidden question never counts.
 */
export function visibleQuestions(config: EstimatorConfig, answers: Answers): EstimatorQuestion[] {
  const shown = new Set<string>();
  const out: EstimatorQuestion[] = [];
  for (const q of config.questions) {
    if (q.showWhen) {
      const parent = config.questions.find((p) => p.id === q.showWhen!.questionId);
      if (!parent || !shown.has(parent.id)) continue;
      const parentPicks = picksFor(parent, answers);
      if (!q.showWhen.anyOf.some((id) => parentPicks.includes(id))) continue;
    }
    shown.add(q.id);
    out.push(q);
  }
  return out;
}

function roundDown(n: number, step: number) {
  return step > 0 ? Math.floor(n / step) * step : n;
}
function roundUp(n: number, step: number) {
  return step > 0 ? Math.ceil(n / step) * step : n;
}

export function computeRange(config: EstimatorConfig, answers: Answers): RangeEstimate {
  const questions = visibleQuestions(config, answers);

  let sizeFactor = 1;
  for (const q of questions) {
    if (q.role !== 'size') continue;
    const picked = picksFor(q, answers)[0];
    const factor = picked ? optionOf(q, picked)?.sizeFactor : undefined;
    if (factor !== undefined && Number.isFinite(factor) && factor > 0) sizeFactor = factor;
  }

  const items: RangeLineItem[] = [];
  const siteVisitItems: RangeEstimate['siteVisitItems'] = [];
  const unanswered: string[] = [];
  for (const q of questions) {
    const picks = picksFor(q, answers);
    if (picks.length === 0) unanswered.push(q.id);
    for (const id of picks) {
      const opt = optionOf(q, id)!;
      if (opt.siteVisit && !siteVisitItems.some((s) => s.label === opt.siteVisit)) {
        siteVisitItems.push({ questionId: q.id, label: opt.siteVisit });
      }
      if (!opt.cost) continue;
      const factor = opt.scalesWithSize ? sizeFactor : 1;
      items.push({
        questionId: q.id,
        optionId: opt.id,
        label: q.summaryLabel ? `${q.summaryLabel}: ${opt.label}` : opt.label,
        low: opt.cost.low * factor,
        high: opt.cost.high * factor,
      });
    }
  }

  let low: number | null = null;
  let high: number | null = null;
  if (items.length > 0) {
    const sumLow = items.reduce((t, i) => t + i.low, 0);
    const sumHigh = items.reduce((t, i) => t + i.high, 0);
    low = roundDown(Math.max(sumLow, config.minimumJob), config.roundTo);
    high = roundUp(Math.max(sumHigh, config.minimumJob), config.roundTo);
  }

  const status: RangeStatus =
    unanswered.length > 0 ? 'incomplete' : siteVisitItems.length > 0 ? 'site_visit' : 'ready';
  return { items, low, high, sizeFactor, siteVisitItems, unanswered, status };
}

/**
 * Problems with a template, as readable strings (empty = valid). Run on every
 * template in tests, and later on every contractor's saved copy before publish.
 */
export function validateConfig(config: EstimatorConfig): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let sizeQuestions = 0;
  if (!(config.minimumJob >= 0)) problems.push('minimumJob must be 0 or more');
  if (!(config.roundTo >= 0)) problems.push('roundTo must be 0 or more');
  for (const q of config.questions) {
    if (seen.has(q.id)) problems.push(`duplicate question id "${q.id}"`);
    if (q.options.length === 0) problems.push(`question "${q.id}" has no options`);
    const optionIds = new Set<string>();
    for (const o of q.options) {
      if (optionIds.has(o.id)) problems.push(`duplicate option "${o.id}" in "${q.id}"`);
      optionIds.add(o.id);
      if (o.cost) {
        const { low, high } = o.cost;
        if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) {
          problems.push(`option "${q.id}.${o.id}" needs 0 <= low <= high`);
        }
      }
      if (o.sizeFactor !== undefined && q.role !== 'size') {
        problems.push(`option "${q.id}.${o.id}" has a sizeFactor but "${q.id}" is not the size question`);
      }
    }
    if (q.role === 'size') {
      sizeQuestions += 1;
      if (q.kind !== 'single') problems.push(`size question "${q.id}" must be single choice`);
      for (const o of q.options) {
        if (!(typeof o.sizeFactor === 'number' && o.sizeFactor > 0)) {
          problems.push(`size option "${q.id}.${o.id}" needs a sizeFactor above 0`);
        }
      }
    }
    if (q.showWhen) {
      const parent = config.questions.find((p) => p.id === q.showWhen!.questionId);
      if (!parent || !seen.has(parent.id)) {
        problems.push(`question "${q.id}" depends on "${q.showWhen.questionId}", which must come earlier`);
      } else {
        for (const id of q.showWhen.anyOf) {
          if (!optionOf(parent, id)) problems.push(`question "${q.id}" depends on unknown option "${parent.id}.${id}"`);
        }
      }
    }
    seen.add(q.id);
  }
  if (sizeQuestions > 1) problems.push('only one question can be the size question');
  return problems;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Whole US dollars. Non-finite input renders as an em dash, never "NaN". */
export function formatUsd(amount: number): string {
  return Number.isFinite(amount) ? usd.format(Math.round(amount)) : '—';
}

/** "$12,000 – $18,500", or "$12,000" when both ends match. */
export function formatRange(low: number, high: number): string {
  return low === high ? formatUsd(low) : `${formatUsd(low)} – ${formatUsd(high)}`;
}
