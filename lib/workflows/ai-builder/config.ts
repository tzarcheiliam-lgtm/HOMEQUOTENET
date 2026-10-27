/**
 * AI workflow builder settings. Client-safe (no secrets): the examples and limits are shown in the UI.
 * The model itself comes from the assistant's config (`assistantModel()`, ANTHROPIC_MODEL).
 */

/** Builds per admin in any rolling 24 hours (owner decision). Counted from public.workflow_ai_builds. */
export const AI_BUILDS_PER_DAY = 30;
/** Longest description accepted. */
export const AI_MAX_DESCRIPTION_CHARS = 2000;
/** Longest answer to a clarifying question. */
export const AI_MAX_ANSWER_CHARS = 300;
/** Repair rounds after the first attempt when the validator finds problems. */
export const AI_MAX_REPAIRS = 2;
/** Output cap per model call (a 60-step graph fits comfortably). */
export const AI_MAX_OUTPUT_TOKENS = 16000;

/** Roles that get the builder. Contractor owners do not (owner decision). */
export const AI_BUILDER_ROLES = ['admin'] as const;

export const AI_BUILD_EXAMPLES: { label: string; text: string }[] = [
  {
    label: 'Speed to lead',
    text: 'When a new lead comes in from Meta, alert the admins right away, wait 15 minutes, then create a task to call them within the hour. If they book an appointment within a day, add a note; if not, move them to contact attempted.',
  },
  {
    label: 'Appointment reminders',
    text: 'When an appointment is booked, email the homeowner a confirmation, then 24 hours before the appointment email them a reminder with the time and location.',
  },
  {
    label: 'No-show follow-up',
    text: 'When an appointment is a no-show, add a note, alert the contractor team, and create a task to reschedule within 4 hours.',
  },
  {
    label: 'Estimate follow-up',
    text: 'After an estimate is sent, wait 2 days. If it has not been accepted, email the homeowner to ask if they have questions, then wait 3 more days and create a follow-up task.',
  },
  {
    label: 'Signed contract',
    text: 'When a contract is fully signed, alert the admins and create a task to schedule the project kickoff in 2 days.',
  },
];

export type BuildStep = 'understanding' | 'building' | 'checking' | 'repairing' | 'saving';
export const BUILD_STEP_LABELS: Record<BuildStep, string> = {
  understanding: 'Understanding your description…',
  building: 'Building the steps…',
  checking: 'Checking it against the workflow rules…',
  repairing: 'Fixing what the checker found…',
  saving: 'Saving as a draft…',
};
