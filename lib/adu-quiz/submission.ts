import { z } from 'zod';
import { QUESTION_IDS, isComplete, type Answers, type Evaluation } from './quiz.ts';
import { parseUsPhone } from '../leads/normalize.ts';

/**
 * Request body of POST /api/adu-quiz/lead and the JSON sent to the lead webhook.
 * Pure: no I/O, so both shapes are unit-testable.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const submissionSchema = z
  .object({
    submissionId: z.string().uuid(),
    answers: z
      .object({
        ...Object.fromEntries(QUESTION_IDS.map((id) => [id, z.string().max(40)])),
        decision_confirmed: z.boolean().optional(),
      } as Record<(typeof QUESTION_IDS)[number], z.ZodString> & { decision_confirmed: z.ZodOptional<z.ZodBoolean> })
      .strict(),
    contact: z.object({
      firstName: text(80),
      lastName: text(80),
      email: z.string().trim().email().max(254),
      phone: z.string().trim().max(40),
    }),
    consent: z.literal(true),
    /** The exact consent text the visitor saw. */
    consentText: z.string().min(40).max(2000),
    pageUrl: z.string().url().max(2000),
    /** utm_*, gclid, fbclid, landing page, referrer, device, timestamp, fbp, fbc. Strings only. */
    tracking: z.record(z.string().max(500)).refine((o) => Object.keys(o).length <= 40, 'Too many tracking fields'),
    /** Visitor's advertising-measurement choice at submit time. */
    measurement: z.boolean(),
    /** Bot trap: must stay empty. */
    honeypot: z.string().max(2000).optional(),
    startedAt: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (!isComplete(value.answers as Answers)) ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Please answer every question.' });
    if (!parseUsPhone(value.contact.phone).ok) ctx.addIssue({ code: 'custom', path: ['contact', 'phone'], message: 'Enter a valid US mobile number.' });
  });

export type Submission = z.infer<typeof submissionSchema>;

/** The stored row, as the webhook payload builder needs it. */
export type StoredLead = {
  submission_id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  answers: Answers;
  evaluation: Evaluation;
  consent_text: string;
  consent_at: string;
  consent_page_url: string;
  tracking: Record<string, string>;
};

/** Everything the buyer's CRM needs. Flat contact fields first so GoHighLevel can map them. */
export function buildWebhookPayload(lead: StoredLead) {
  const { evaluation: e } = lead;
  return {
    source: 'adu-quiz',
    submission_id: lead.submission_id,
    submitted_at: lead.created_at,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    answers: lead.answers,
    qualified: e.qualified,
    dq_reason: e.dq_reason,
    dq_reasons: e.dq_reasons,
    title_unverified: e.title_unverified,
    credit_unverified: e.credit_unverified,
    bankruptcy_unverified: e.bankruptcy_unverified,
    consent: { text: lead.consent_text, timestamp: lead.consent_at, page_url: lead.consent_page_url },
    tracking: lead.tracking,
  };
}
