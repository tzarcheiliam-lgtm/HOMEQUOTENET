import type { Answers, Estimate, EstimateInput, EstimatorQuestion, EstimatorTemplate } from './types.ts';
import { poolGeometry } from './geometry.ts';

/**
 * STAND-IN implementation of the estimator engine API, so screens and the lead
 * route can be built in parallel. The signatures are the contract; the bodies
 * are replaced by the real engine.
 */

/** Valid picks for a question: unknown ids dropped, a single question keeps its first pick. */
export function picksFor(q: EstimatorQuestion, answers: Answers): string[] {
  const valid = (answers[q.id] ?? []).filter((id) => q.options.some((o) => o.id === id));
  return q.kind === 'single' ? valid.slice(0, 1) : valid;
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

/** Answers with a package's answers filled in (the package pick itself is kept). */
export function applyPackage(template: EstimatorTemplate, answers: Answers, packageId: string): Answers {
  const pkg = template.packages.find((p) => p.id === packageId);
  const packageQ = template.questions.find((q) => q.role === 'package');
  const next: Answers = { ...answers, ...(pkg?.answers ?? {}) };
  if (packageQ) next[packageQ.id] = [packageId];
  return next;
}

export function computeEstimate(template: EstimatorTemplate, input: EstimateInput): Estimate {
  const geometry = poolGeometry(template, input);
  const questions = visibleQuestions(template, input.answers);
  const lines: Estimate['lines'] = [];
  const unanswered: string[] = [];
  const siteVisitItems: Estimate['siteVisitItems'] = [];
  for (const q of questions) {
    const picks = picksFor(q, input.answers);
    if (picks.length === 0) unanswered.push(q.id);
    for (const id of picks) {
      const opt = q.options.find((o) => o.id === id)!;
      if (opt.siteVisit) siteVisitItems.push({ questionId: q.id, label: opt.siteVisit });
      if (!opt.price) continue;
      const quantity = opt.price.quantity ?? 1;
      lines.push({
        questionId: q.id,
        optionId: id,
        label: q.summaryLabel ? `${q.summaryLabel}: ${opt.label}` : opt.label,
        unit: opt.price.unit,
        quantity,
        low: opt.price.low * quantity,
        high: opt.price.high * quantity,
      });
    }
  }
  const low = lines.length ? Math.max(template.minimumJob, lines.reduce((t, l) => t + l.low, 0)) : null;
  const high = lines.length ? Math.max(template.minimumJob, lines.reduce((t, l) => t + l.high, 0)) : null;
  const status = unanswered.length ? 'incomplete' : siteVisitItems.length ? 'site_visit' : 'ready';
  return { geometry, lines, low, high, siteVisitItems, unanswered, status };
}

/** Problems with a template as readable strings (empty = valid). */
export function validateTemplate(_template: EstimatorTemplate): string[] {
  return [];
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
