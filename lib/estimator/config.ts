import type {
  Answers,
  ContractorEstimatorConfig,
  EstimatorCatalog,
  EstimatorOption,
  EstimatorPackage,
  EstimatorQuestion,
  EstimatorTemplate,
  OptionOverride,
  Price,
} from './types.ts';
import { CUSTOM_PACKAGE_ID } from './types.ts';

/** Price with the override's defined fields laid over it; undefined when the result would be incomplete. */
function mergePrice(base: Price | undefined, patch: Partial<Price>): Price | undefined {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const merged = { ...base, ...defined } as Partial<Price>;
  if (merged.unit === undefined || merged.low === undefined || merged.high === undefined) return base;
  return merged as Price;
}

function patchOption(option: EstimatorOption, override: OptionOverride) {
  if (override.label !== undefined) option.label = override.label;
  if (override.note !== undefined) option.note = override.note;
  if (override.image !== undefined) option.image = override.image;
  if (override.price) {
    const price = mergePrice(option.price, override.price);
    if (price) option.price = price;
  }
}

/** Put a catalog option back where the catalog lists it, relative to the options already shown. */
function insertInCatalogOrder(q: EstimatorQuestion, option: EstimatorOption, catalogOptions: EstimatorOption[]) {
  const start = catalogOptions.findIndex((o) => o.id === option.id);
  for (let i = start + 1; i < catalogOptions.length; i++) {
    const at = q.options.findIndex((o) => o.id === catalogOptions[i].id);
    if (at !== -1) {
      q.options.splice(at, 0, option);
      return;
    }
  }
  q.options.push(option);
}

/** Option ids the package question should offer: one per package, then the custom option. */
function syncPackageOptions(q: EstimatorQuestion, packages: EstimatorPackage[]) {
  const existing = new Map(q.options.map((o) => [o.id, o]));
  const options: EstimatorOption[] = packages.map((p) => ({
    ...existing.get(p.id),
    id: p.id,
    label: p.label,
    note: existing.get(p.id)?.note ?? p.description,
  }));
  options.push(existing.get(CUSTOM_PACKAGE_ID) ?? { id: CUSTOM_PACKAGE_ID, label: 'Build my own' });
  q.options = options;
}

/**
 * After options were removed: drop their ids from other questions' showWhen, and
 * remove a question left with nothing that could ever show it (and, in turn,
 * the questions that hang off it). Returns the removed question ids.
 */
function dropUnreachable(questions: EstimatorQuestion[]): Set<string> {
  const removed = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const q of [...questions]) {
      if (!q.showWhen) continue;
      const parent = questions.find((p) => p.id === q.showWhen!.questionId);
      if (parent) q.showWhen.anyOf = q.showWhen.anyOf.filter((id) => parent.options.some((o) => o.id === id));
      if (!parent || q.showWhen.anyOf.length === 0) {
        questions.splice(questions.indexOf(q), 1);
        removed.add(q.id);
        changed = true;
      }
    }
  }
  return removed;
}

/** A package's answers without picks for options or questions that no longer exist. */
function pruneAnswers(answers: Answers, questions: EstimatorQuestion[], removed: Set<string>): Answers {
  const out: Answers = {};
  for (const [questionId, picks] of Object.entries(answers)) {
    if (removed.has(questionId)) continue;
    const q = questions.find((x) => x.id === questionId);
    if (!q) {
      out[questionId] = [...picks];
      continue;
    }
    const kept = picks.filter((id) => q.options.some((o) => o.id === id));
    if (kept.length) out[questionId] = kept;
  }
  return out;
}

/**
 * Merge a contractor's settings into a template. Returns a new template; the
 * inputs (template, config, catalog) are never mutated or shared.
 *
 * 1. pricesConfirmed and minimumJob come from the config (minimumJob stays the
 *    template's when the config leaves it out).
 * 2. config.options, keyed "questionId.optionId":
 *    - enabled:false removes the option;
 *    - enabled:true adds it from the catalog when the template lacks it (in the
 *      catalog's order; ignored when the catalog does not have it);
 *    - label / note / image replace, and price merges over the existing price
 *      (a price with no unit/low/high to build on is ignored).
 *    Overrides for unknown questions are ignored.
 * 3. config.customOptions are appended to their question.
 * 4. config.packages, when set, replace the template's packages and the package
 *    question's options are rebuilt to match (plus the custom option).
 * 5. Options removed in step 2 are dropped from other questions' showWhen; a
 *    question left with no way to show (e.g. its only trigger was removed) is
 *    removed too, along with questions that depended on it.
 * 6. Every package then loses picks for options and questions that were removed.
 *
 * When the inputs are sane, the result passes validateTemplate.
 */
export function applyContractorConfig(
  template: EstimatorTemplate,
  config: ContractorEstimatorConfig,
  catalog?: EstimatorCatalog,
): EstimatorTemplate {
  const next = structuredClone(template);
  next.pricesConfirmed = config.pricesConfirmed;
  next.minimumJob = config.minimumJob ?? template.minimumJob;

  for (const [key, override] of Object.entries(config.options ?? {})) {
    const dot = key.indexOf('.');
    if (dot === -1) continue;
    const q = next.questions.find((x) => x.id === key.slice(0, dot));
    if (!q) continue;
    const optionId = key.slice(dot + 1);

    if (override.enabled === false) {
      q.options = q.options.filter((o) => o.id !== optionId);
      continue;
    }
    let option = q.options.find((o) => o.id === optionId);
    if (!option && override.enabled === true) {
      const catalogOptions = catalog?.[q.id] ?? [];
      const fromCatalog = catalogOptions.find((o) => o.id === optionId);
      if (fromCatalog) {
        option = structuredClone(fromCatalog);
        insertInCatalogOrder(q, option, catalogOptions);
      }
    }
    if (option) patchOption(option, override);
  }

  for (const [questionId, extra] of Object.entries(config.customOptions ?? {})) {
    const q = next.questions.find((x) => x.id === questionId);
    if (q) q.options.push(...structuredClone(extra));
  }

  if (config.packages) {
    next.packages = structuredClone(config.packages);
    const packageQ = next.questions.find((q) => q.role === 'package');
    if (packageQ) syncPackageOptions(packageQ, next.packages);
  }
  const removed = dropUnreachable(next.questions);
  next.packages = next.packages.map((p) => ({ ...p, answers: pruneAnswers(p.answers, next.questions, removed) }));

  return next;
}

/**
 * The template as sent to the browser. With revealRange 'after_contact' every
 * price (and the minimum job / rounding) is removed, so the range cannot be read
 * from the page source before the contact step; the lead route computes it from
 * the full server-side template.
 */
export function publicTemplate(template: EstimatorTemplate, config: Pick<ContractorEstimatorConfig, 'revealRange'>): EstimatorTemplate {
  if (config.revealRange === 'immediately') return template;
  return {
    ...template,
    minimumJob: 0,
    roundTo: 0,
    questions: template.questions.map((q) => ({
      ...q,
      options: q.options.map((option) => {
        const copy = { ...option };
        delete copy.price;
        return copy;
      }),
    })),
  };
}
