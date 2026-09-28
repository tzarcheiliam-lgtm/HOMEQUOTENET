// Pure helpers for the no-code funnel builder. No server-only import: these
// run in the browser (live preview, client-side validation) and on the
// server (create/duplicate actions) from the same code.
//
// Architecture: the builder edits and validates `FunnelConfig` (lib/funnels/schema.ts)
// — the same jsonb every public funnel, save_funnel_session, funnel_report and
// GHL/Calendly delivery already run on. There is no separate funnel_steps /
// funnel_step_options / funnel_logic_rules table: a step IS a `questions[]`
// entry, an option IS `question.options[]`, branching logic IS `showWhen`.
// See docs/funnel-builder-architecture.md.
import { funnelSchema, isAnswered, isTextQuestion, qualify, sanitizeAnswers, validateAnswer, visibleQuestions, type Answers, type FunnelConfig, type Question } from './schema';

/** Question ids and option values share this pattern (lib/funnels/schema.ts `key`/option regex). */
const ID_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const OPTION_PATTERN = /^[a-z0-9_]{1,50}$/;

/** A URL/lead-source-safe slug from a free-typed name. */
export function slugify(input: string): string {
  const base = input.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'funnel';
  return /^[a-z0-9]/.test(base) ? base : `f-${base}`;
}
/** A snake_case identifier from free text, for a question id or option value. */
export function idify(input: string, pattern: RegExp = ID_PATTERN): string {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
  return pattern.test(base) ? base : `q_${base}`.slice(0, 50);
}
/** First id not already in `used`, trying base, base_2, base_3, … */
export function uniqueId(base: string, used: Set<string>, pattern: RegExp = ID_PATTERN): string {
  let id = idify(base, pattern);
  for (let n = 2; used.has(id); n++) id = idify(`${base}_${n}`, pattern);
  return id;
}

/** A minimal but always-valid starting point for "start blank". */
export function blankFunnelConfig(clientName: string, industry: string): FunnelConfig {
  return funnelSchema.parse({
    version: 1, clientName, industry,
    serviceArea: { label: 'Set your service area', zipCodes: [], zipPrefixes: [] },
    questions: [
      { id: 'service', type: 'choice', headline: 'What would you like help with?', options: [
        { value: 'option_1', label: 'Option 1' }, { value: 'option_2', label: 'Option 2' },
      ] },
      { id: 'zip', type: 'zip', headline: 'Where is your project located?', description: 'Enter the ZIP code of the property.' },
    ],
    thankYouPage: { headline: 'You’re all set.', message: 'Your project details are saved. The team will be in touch shortly.' },
  });
}

const NEW_TEXT_HEADLINES = {
  short_text: 'Briefly describe your project', long_text: 'Tell us more about what you’d like done', address: 'What is the property address?',
  number: 'Enter a number', email: 'What is your email address?', phone: 'What is the best phone number to reach you?',
} as const;

/** A new question appended to the end, with a unique id. */
export function addQuestion(config: FunnelConfig, type: Question['type']): FunnelConfig {
  const used = new Set(config.questions.map(q => q.id));
  const id = uniqueId(type === 'choice' ? 'question' : type, used);
  const question: Question = type === 'zip'
    ? { id, type: 'zip', headline: 'Where is your project located?', description: 'Enter the ZIP code of the property.', options: [], showWhen: [] }
    : type === 'choice'
      ? { id, type: 'choice', headline: 'New question', options: [{ value: 'option_1', label: 'Option 1' }, { value: 'option_2', label: 'Option 2' }], showWhen: [] }
      : { id, type, headline: NEW_TEXT_HEADLINES[type], options: [], showWhen: [], required: true };
  return { ...config, questions: [...config.questions, question] };
}
export function removeQuestion(config: FunnelConfig, id: string): FunnelConfig {
  return {
    ...config,
    questions: config.questions.filter(q => q.id !== id)
      // A branch can't point at a question that no longer exists.
      .map(q => ({ ...q, showWhen: q.showWhen.filter(c => c.question !== id) })),
    qualificationRules: config.qualificationRules.filter(c => c.question !== id),
  };
}
export function duplicateQuestion(config: FunnelConfig, id: string): FunnelConfig {
  const index = config.questions.findIndex(q => q.id === id);
  if (index < 0) return config;
  const used = new Set(config.questions.map(q => q.id));
  const copy: Question = { ...config.questions[index], id: uniqueId(`${id}_copy`, used), showWhen: [...config.questions[index].showWhen] };
  const questions = [...config.questions];
  questions.splice(index + 1, 0, copy);
  return { ...config, questions };
}
export function moveQuestion(config: FunnelConfig, id: string, direction: 'up' | 'down'): FunnelConfig {
  const index = config.questions.findIndex(q => q.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= config.questions.length) return config;
  const questions = [...config.questions];
  [questions[index], questions[target]] = [questions[target], questions[index]];
  // A branch that used to be valid (pointed at an earlier question) may no
  // longer be; drop conditions that would now reference a LATER question.
  const order = new Map(questions.map((q, i) => [q.id, i]));
  return {
    ...config,
    questions: questions.map((q, i) => ({ ...q, showWhen: q.showWhen.filter(c => (order.get(c.question) ?? -1) < i) })),
  };
}
export function updateQuestion(config: FunnelConfig, id: string, patch: Partial<Question>): FunnelConfig {
  return { ...config, questions: config.questions.map(q => (q.id === id ? { ...q, ...patch } : q)) };
}

export function addOption(question: Question): Question {
  const used = new Set(question.options.map(o => o.value));
  return { ...question, options: [...question.options, { value: uniqueId(`option_${question.options.length + 1}`, used, OPTION_PATTERN), label: 'New option' }] };
}
export function removeOption(question: Question, value: string): Question {
  return { ...question, options: question.options.filter(o => o.value !== value) };
}
export function moveOption(question: Question, value: string, direction: 'up' | 'down'): Question {
  const index = question.options.findIndex(o => o.value === value);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= question.options.length) return question;
  const options = [...question.options];
  [options[index], options[target]] = [options[target], options[index]];
  return { ...question, options };
}

/** Labels for the Question Type picker. `zip` is offered only on the funnel's one ZIP step. */
export const STEP_TYPE_PRESETS: { value: Question['type']; label: string }[] = [
  { value: 'choice', label: 'Multiple Choice' },
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'address', label: 'Address' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'zip', label: 'ZIP code (exactly one per funnel)' },
];

/**
 * Switch a question's input type. Options are kept (just hidden) when moving to a typed question so
 * switching back loses nothing; a typed question moving to choice gets starter options if it has none.
 */
export function changeQuestionType(question: Question, type: Question['type']): Question {
  if (type === question.type) return question;
  const next: Question = { ...question, type };
  if (type === 'choice' && !next.options.length) next.options = [{ value: 'option_1', label: 'Option 1' }, { value: 'option_2', label: 'Option 2' }];
  // A placeholder written for one input kind is wrong for another.
  if (!isTextQuestion(next) || next.type !== question.type) next.placeholder = undefined;
  return next;
}

/**
 * Mirrors the step-navigation half of app/api/funnels/[slug]/session/route.ts
 * PATCH (no persistence, no contact/consent handling — this only drives the
 * builder's local, click-through-as-a-visitor live preview).
 */
export type PreviewState = { answers: Answers; step: string; qualified: boolean | null };
export function previewAdvance(config: FunnelConfig, state: PreviewState,
  body: { answer?: { question: string; value: string } } | { step: string }): PreviewState | { error: string } {
  let answers = sanitizeAnswers(config, state.answers);
  let nextStep = state.step;
  if ('answer' in body && body.answer) {
    const q = visibleQuestions(config, answers).find(item => item.id === body.answer!.question);
    if (!q || q.id !== state.step) return { error: 'That is not the current question.' };
    const checked = validateAnswer(q, body.answer.value);
    if (!checked.ok) return { error: checked.error };
    answers = sanitizeAnswers(config, { ...answers, [q.id]: checked.value });
    const visible = visibleQuestions(config, answers);
    nextStep = visible[visible.findIndex(item => item.id === q.id) + 1]?.id ?? 'qualification';
  } else if ('step' in body) {
    const visible = visibleQuestions(config, answers);
    const firstMissing = visible.findIndex(q => !isAnswered(answers, q.id));
    const index = visible.findIndex(q => q.id === body.step);
    const qualified = qualify(config, answers);
    if (index >= 0 && (firstMissing < 0 || index <= firstMissing)) nextStep = body.step;
    else if (body.step === 'contact' && qualified !== null && !(qualified === false && config.unqualifiedAction === 'stop')) nextStep = 'contact';
    else return { error: 'Complete the earlier questions first.' };
  }
  return { answers, step: nextStep, qualified: qualify(config, answers) };
}

export type FunnelStatus = 'draft' | 'published' | 'archived';
export type FunnelSummary = {
  id: string; slug: string; status: FunnelStatus; isDemo: boolean;
  clientName: string; industry: string; contractorName: string | null;
  createdAt: string; updatedAt: string;
};
