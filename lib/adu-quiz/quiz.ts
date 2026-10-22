/**
 * ADU quiz: questions, answer validation and the qualification rules.
 * Pure (no React, no I/O). Thresholds come from lib/adu-quiz/config.ts via the
 * `rules` argument, so changing a buyer's criteria never touches this file.
 *
 * The same rules apply to every visitor. Nothing but the answers below is used
 * to qualify: no name, no ZIP demographics, no device or ad data.
 */

export type Option = { value: string; label: string };
export type Question = {
  id: QuestionId;
  title: string;
  /** Extra line under the title. */
  hint?: string;
  /** Note shown on the screen. */
  note?: string;
  type: 'choice' | 'zip';
  options?: Option[];
};

export const QUESTION_IDS = [
  'owns_home', 'on_title', 'property_type', 'zip', 'location', 'goal',
  'budget', 'payment', 'timeline', 'credit', 'bankruptcy', 'decision_makers',
] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const QUESTIONS: Question[] = [
  { id: 'owns_home', type: 'choice', title: 'Do you own the home?', options: [
    { value: 'yes', label: 'Yes' }, { value: 'no_rent', label: 'No, I rent' }, { value: 'other', label: 'Other' } ] },
  { id: 'on_title', type: 'choice', title: 'Are you on the title (deed) of the property?', options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' } ] },
  { id: 'property_type', type: 'choice', title: 'What type of home is it?', options: [
    { value: 'single_family', label: 'Single-family house' }, { value: 'townhome_condo', label: 'Townhome or condo' },
    { value: 'multi_family', label: 'Multi-family' }, { value: 'other', label: 'Other' } ] },
  { id: 'zip', type: 'zip', title: 'What’s your ZIP code?' },
  { id: 'location', type: 'choice', title: 'Where would the ADU go?', options: [
    { value: 'backyard', label: 'Backyard' }, { value: 'detached_garage', label: 'Detached garage' },
    { value: 'attached_garage', label: 'Attached garage' }, { value: 'side_yard', label: 'Side yard' },
    { value: 'not_sure', label: 'Not sure' } ] },
  { id: 'goal', type: 'choice', title: 'What’s your main goal?', options: [
    { value: 'family', label: 'Family or multigenerational living' }, { value: 'rental_income', label: 'Rental income' },
    { value: 'home_office', label: 'Home office or guest space' }, { value: 'home_value', label: 'Increase home value' } ] },
  { id: 'budget', type: 'choice', title: 'What’s your approximate budget?', options: [
    { value: 'under_100k', label: 'Under $100k' }, { value: '100k_150k', label: '$100k-$150k' },
    { value: '150k_250k', label: '$150k-$250k' }, { value: '250k_plus', label: '$250k+' } ] },
  { id: 'payment', type: 'choice', title: 'How would you plan to pay for it?',
    note: 'Financing programs are available for qualified homeowners.', options: [
    { value: 'financing', label: 'Financing program' }, { value: 'cash', label: 'Cash' },
    { value: 'home_equity', label: 'Home equity (HELOC or cash-out refinance)' },
    { value: 'not_sure', label: 'Not sure, I’d like to learn' } ] },
  { id: 'timeline', type: 'choice', title: 'When would you like to start?', options: [
    { value: 'within_3', label: 'Within 3 months' }, { value: '3_6', label: '3-6 months' },
    { value: '6_12', label: '6-12 months' }, { value: '12_plus', label: '12+ months' },
    { value: 'researching', label: 'Just researching' } ] },
  { id: 'credit', type: 'choice', title: 'What’s your estimated credit score range?',
    hint: 'Self-reported. We never check your credit here.', options: [
    { value: '700_plus', label: '700+' }, { value: '620_699', label: '620-699' },
    { value: 'below_620', label: 'Below 620' }, { value: 'not_sure', label: 'Not sure' } ] },
  { id: 'bankruptcy', type: 'choice', title: 'Any bankruptcies in the last 7 years?', options: [
    { value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }, { value: 'discuss', label: 'I’d rather discuss' } ] },
  { id: 'decision_makers', type: 'choice', title: 'Who else is involved in the decision?', options: [
    { value: 'just_me', label: 'Just me' }, { value: 'spouse', label: 'My spouse or partner' },
    { value: 'co_owner', label: 'Another co-owner' }, { value: 'family_not_on_title', label: 'Family member who isn’t on title' } ] },
];

export const DECISION_NOTE = 'Everyone involved in the decision will need to be at the consultation.';
export const DECISION_CONFIRM_LABEL = 'I confirm everyone on the title and all decision-makers can attend.';

/** Top of each budget range (Infinity = open ended). A range at or below MIN_BUDGET is not qualified. */
export const BUDGET_MAX: Record<string, number> = {
  under_100k: 100000, '100k_150k': 150000, '150k_250k': 250000, '250k_plus': Number.POSITIVE_INFINITY,
};

export type Answers = Partial<Record<QuestionId, string>> & { decision_confirmed?: boolean };

export type Rules = {
  minBudget: number;
  dqTimelines: readonly string[];
};

export type DqReason =
  | 'not_owner' | 'not_on_title' | 'property_type'
  | 'budget' | 'timeline' | 'credit' | 'bankruptcy' | 'decision_makers';

export type Evaluation = {
  qualified: boolean;
  /** First disqualifier in question order, or null. */
  dq_reason: DqReason | null;
  /** Every disqualifier that applies, in question order. */
  dq_reasons: DqReason[];
  title_unverified: boolean;
  credit_unverified: boolean;
  bankruptcy_unverified: boolean;
};

export const isValidZip = (value: string) => /^\d{5}$/.test(value);

/** Whether `value` is an allowed answer for the question (ZIP: five digits). */
export function isValidAnswer(id: QuestionId, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (id === 'zip') return isValidZip(value);
  return QUESTIONS.find((q) => q.id === id)?.options?.some((o) => o.value === value) ?? false;
}

/** True when every question has a valid answer and any required confirmation is present. */
export function isComplete(answers: Answers): boolean {
  return QUESTION_IDS.every((id) => isValidAnswer(id, answers[id]));
}

export function evaluate(answers: Answers, rules: Rules): Evaluation {
  const reasons: DqReason[] = [];
  if (answers.owns_home === 'no_rent' || answers.owns_home === 'other') reasons.push('not_owner');
  if (answers.on_title === 'no') reasons.push('not_on_title');
  if (answers.property_type && answers.property_type !== 'single_family') reasons.push('property_type');
  if (answers.budget && (BUDGET_MAX[answers.budget] ?? Number.POSITIVE_INFINITY) <= rules.minBudget) reasons.push('budget');
  if (answers.timeline && rules.dqTimelines.includes(answers.timeline)) reasons.push('timeline');
  if (answers.credit === 'below_620') reasons.push('credit');
  if (answers.bankruptcy === 'yes') reasons.push('bankruptcy');
  if (answers.decision_makers && answers.decision_makers !== 'just_me' && !answers.decision_confirmed) reasons.push('decision_makers');
  return {
    qualified: reasons.length === 0,
    dq_reason: reasons[0] ?? null,
    dq_reasons: reasons,
    title_unverified: answers.on_title === 'not_sure',
    credit_unverified: answers.credit === 'not_sure',
    bankruptcy_unverified: answers.bankruptcy === 'discuss',
  };
}

/** Consent text, word for word. `brand` comes from config. */
export function consentText(brand: string): string {
  return `By checking this box, I agree to be contacted by call, text message, and email, including by automated technology, by ${brand} and by a licensed local ADU builder about my project at the number provided. Consent is not a condition of any purchase. Message and data rates may apply. Reply STOP to opt out. See our Privacy Policy and Terms.`;
}

export const FOOTER_DISCLAIMER =
  'Financing subject to credit approval and program terms. Not all applicants qualify. Rental income is not guaranteed. Estimates are ranges, not quotes.';
