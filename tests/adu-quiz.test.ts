import { describe, it, expect } from 'vitest';
import {
  BUDGET_MAX, QUESTIONS, QUESTION_IDS, consentText, evaluate, isComplete, isValidAnswer, type Answers, type Rules,
} from '@/lib/adu-quiz/quiz';
import { buildWebhookPayload, submissionSchema } from '@/lib/adu-quiz/submission';

/** A fully qualified homeowner under the default $150k minimum. */
const rules: Rules = { minBudget: 150000, dqTimelines: ['12_plus', 'researching'] };
const good: Answers = {
  owns_home: 'yes', on_title: 'yes', property_type: 'single_family', zip: '91403', location: 'backyard',
  goal: 'rental_income', budget: '150k_250k', payment: 'financing', timeline: 'within_3',
  credit: '700_plus', bankruptcy: 'no', decision_makers: 'just_me',
};

describe('qualification rules', () => {
  it('qualifies a clean lead with no flags', () => {
    expect(evaluate(good, rules)).toEqual({
      qualified: true, dq_reason: null, dq_reasons: [],
      title_unverified: false, credit_unverified: false, bankruptcy_unverified: false,
    });
  });

  const disqualifiers: [string, Answers, string][] = [
    ['renter', { owns_home: 'no_rent' }, 'not_owner'],
    ['owner "other"', { owns_home: 'other' }, 'not_owner'],
    ['not on title', { on_title: 'no' }, 'not_on_title'],
    ['condo', { property_type: 'townhome_condo' }, 'property_type'],
    ['multi-family', { property_type: 'multi_family' }, 'property_type'],
    ['other property', { property_type: 'other' }, 'property_type'],
    ['budget under $100k', { budget: 'under_100k' }, 'budget'],
    ['budget $100k-$150k', { budget: '100k_150k' }, 'budget'],
    ['timeline 12+ months', { timeline: '12_plus' }, 'timeline'],
    ['just researching', { timeline: 'researching' }, 'timeline'],
    ['credit below 620', { credit: 'below_620' }, 'credit'],
    ['bankruptcy', { bankruptcy: 'yes' }, 'bankruptcy'],
    ['co-decider without confirmation', { decision_makers: 'spouse' }, 'decision_makers'],
    ['co-decider confirmation unchecked', { decision_makers: 'family_not_on_title', decision_confirmed: false }, 'decision_makers'],
  ];
  it.each(disqualifiers)('%s is not qualified (%s)', (_name, override, reason) => {
    const e = evaluate({ ...good, ...override }, rules);
    expect(e.qualified).toBe(false);
    expect(e.dq_reason).toBe(reason);
    expect(e.dq_reasons).toContain(reason);
  });

  it('other answers never disqualify', () => {
    for (const location of ['backyard', 'detached_garage', 'attached_garage', 'side_yard', 'not_sure']) {
      expect(evaluate({ ...good, location }, rules).qualified).toBe(true);
    }
    for (const goal of ['family', 'rental_income', 'home_office', 'home_value']) expect(evaluate({ ...good, goal }, rules).qualified).toBe(true);
    for (const payment of ['financing', 'cash', 'home_equity', 'not_sure']) expect(evaluate({ ...good, payment }, rules).qualified).toBe(true);
    for (const timeline of ['within_3', '3_6', '6_12']) expect(evaluate({ ...good, timeline }, rules).qualified).toBe(true);
    for (const budget of ['150k_250k', '250k_plus']) expect(evaluate({ ...good, budget }, rules).qualified).toBe(true);
  });

  it('"not sure" and "rather discuss" continue but set the unverified flags', () => {
    expect(evaluate({ ...good, on_title: 'not_sure' }, rules)).toMatchObject({ qualified: true, title_unverified: true });
    expect(evaluate({ ...good, credit: 'not_sure' }, rules)).toMatchObject({ qualified: true, credit_unverified: true });
    expect(evaluate({ ...good, bankruptcy: 'discuss' }, rules)).toMatchObject({ qualified: true, bankruptcy_unverified: true });
  });

  it('a confirmed co-decider qualifies, and "just me" needs no confirmation', () => {
    expect(evaluate({ ...good, decision_makers: 'spouse', decision_confirmed: true }, rules).qualified).toBe(true);
    expect(evaluate({ ...good, decision_makers: 'just_me' }, rules).qualified).toBe(true);
  });

  it('reports every disqualifier, first one in question order, so the quiz can run to the end', () => {
    const e = evaluate({ ...good, owns_home: 'no_rent', budget: 'under_100k', credit: 'below_620' }, rules);
    expect(e.dq_reasons).toEqual(['not_owner', 'budget', 'credit']);
    expect(e.dq_reason).toBe('not_owner');
  });

  it('the ZIP code is captured but never qualifies or disqualifies', () => {
    for (const zip of ['10001', '90210', '91403', '00000']) expect(evaluate({ ...good, zip }, rules).qualified).toBe(true);
  });

  it('thresholds come from the rules, not the logic', () => {
    expect(evaluate({ ...good, budget: '100k_150k' }, { ...rules, minBudget: 100000 }).qualified).toBe(true);
    expect(evaluate({ ...good, budget: '150k_250k' }, { ...rules, minBudget: 250000 }).qualified).toBe(false);
    expect(evaluate({ ...good, timeline: '6_12' }, { ...rules, dqTimelines: ['6_12', '12_plus', 'researching'] }).qualified).toBe(false);
    expect(Object.keys(BUDGET_MAX)).toEqual(['under_100k', '100k_150k', '150k_250k', '250k_plus']);
  });
});

describe('questions', () => {
  it('has the 12 questions in the specified order', () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual([...QUESTION_IDS]);
    expect(QUESTION_IDS).toEqual(['owns_home', 'on_title', 'property_type', 'zip', 'location', 'goal', 'budget', 'payment', 'timeline', 'credit', 'bankruptcy', 'decision_makers']);
  });

  it('never asks for SSN, date of birth, exact credit score or income', () => {
    // Titles and hints only: "Rental income" is a goal option, not a request for the visitor's income.
    const text = QUESTIONS.map((q) => `${q.title} ${q.hint ?? ''}`).join(' ').toLowerCase();
    for (const banned of ['ssn', 'social security', 'birth', 'income', 'exact credit']) expect(text).not.toContain(banned);
  });

  it('validates answers', () => {
    expect(isValidAnswer('zip', '91403')).toBe(true);
    expect(isValidAnswer('zip', '9140')).toBe(false);
    expect(isValidAnswer('zip', '91403-1')).toBe(false);
    expect(isValidAnswer('budget', '250k_plus')).toBe(true);
    expect(isValidAnswer('budget', 'a million')).toBe(false);
    expect(isComplete(good)).toBe(true);
    expect(isComplete({ ...good, goal: undefined })).toBe(false);
  });

  it('uses the exact consent wording with the brand name', () => {
    expect(consentText('HomeQuote Network')).toBe(
      'By checking this box, I agree to be contacted by call, text message, and email, including by automated technology, by HomeQuote Network and by a licensed local ADU builder about my project at the number provided. Consent is not a condition of any purchase. Message and data rates may apply. Reply STOP to opt out. See our Privacy Policy and Terms.',
    );
  });
});

const submission = {
  submissionId: '3f1c2a4e-7b1d-4e0a-9d5c-0a7d3c1b2f10',
  answers: good,
  contact: { firstName: 'Sam', lastName: 'Rivera', email: 'sam@example.com', phone: '(818) 456-7890' },
  consent: true,
  consentText: consentText('HomeQuote Network'),
  pageUrl: 'https://homequotenet.com/adu-quiz',
  tracking: { utm_source: 'google', gclid: 'abc', device_type: 'mobile' },
  measurement: true,
};

describe('submission schema', () => {
  it('accepts a complete submission', () => {
    expect(submissionSchema.safeParse(submission).success).toBe(true);
  });
  it('rejects missing consent, bad phone, unknown answers and incomplete quizzes', () => {
    expect(submissionSchema.safeParse({ ...submission, consent: false }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...submission, contact: { ...submission.contact, phone: '555' } }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...submission, answers: { ...good, budget: 'x' } }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...submission, answers: { ...good, goal: undefined } }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...submission, answers: { ...good, qualified: 'true' } }).success).toBe(false);
  });
});

describe('webhook payload', () => {
  it('carries contact, answers, qualification, flags, consent proof and tracking', () => {
    const evaluation = evaluate({ ...good, on_title: 'not_sure', budget: 'under_100k' }, rules);
    const payload = buildWebhookPayload({
      submission_id: submission.submissionId, created_at: '2026-10-22T12:00:00.000Z',
      first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', phone: '+18184567890',
      answers: { ...good, on_title: 'not_sure', budget: 'under_100k' }, evaluation,
      consent_text: submission.consentText, consent_at: '2026-10-22T12:00:00.000Z', consent_page_url: submission.pageUrl,
      tracking: { utm_source: 'google', gclid: 'abc', fbp: 'fb.1.1.2', device_type: 'mobile' },
    });
    expect(payload).toMatchObject({
      source: 'adu-quiz', first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', phone: '+18184567890',
      qualified: false, dq_reason: 'budget', dq_reasons: ['budget'],
      title_unverified: true, credit_unverified: false, bankruptcy_unverified: false,
      consent: { text: submission.consentText, timestamp: '2026-10-22T12:00:00.000Z', page_url: submission.pageUrl },
      tracking: { utm_source: 'google', gclid: 'abc', fbp: 'fb.1.1.2' },
    });
    expect(payload.answers.on_title).toBe('not_sure');
  });
});
