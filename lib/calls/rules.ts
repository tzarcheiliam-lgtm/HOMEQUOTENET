import type { ProspectDisposition } from '@/lib/types';
import { LOGGABLE_OUTCOMES, QUEUE_DISPOSITIONS } from './constants';

/**
 * Pure rules for logging a call outcome. No I/O: the server action validates
 * with these before it touches the database, and the form uses the same rules
 * to decide which fields to reveal, so the two can never disagree.
 */

export interface OutcomeInput {
  outcome: string;
  notes?: string | null;
  callback_at?: string | null; // ISO datetime
  decision_maker_name?: string | null;
  best_contact_method?: string | null;
  follow_up_at?: string | null; // ISO datetime
  appointment_at?: string | null; // ISO datetime
  appointment_type?: string | null;
  time_zone?: string | null;
  contact_info?: string | null;
  /** Explicit confirmation is required to mark a prospect do-not-call. */
  confirm_do_not_call?: boolean;
}

export type OutcomeField =
  | 'notes'
  | 'callback_at'
  | 'decision_maker_name'
  | 'best_contact_method'
  | 'follow_up_at'
  | 'appointment_at'
  | 'appointment_type'
  | 'time_zone'
  | 'contact_info'
  | 'confirm_do_not_call';

/** Fields that must be present for a given outcome. */
export function requiredFieldsFor(outcome: ProspectDisposition): OutcomeField[] {
  switch (outcome) {
    case 'callback_requested':
      return ['callback_at'];
    case 'interested':
      return ['decision_maker_name', 'best_contact_method', 'follow_up_at'];
    case 'follow_up_required':
      return ['follow_up_at'];
    case 'appointment_booked':
      return [
        'appointment_at',
        'appointment_type',
        'time_zone',
        'decision_maker_name',
        'contact_info',
      ];
    case 'do_not_call':
      return ['confirm_do_not_call'];
    default:
      return [];
  }
}

/** Fields the form should show (required + optional) for an outcome. */
export function visibleFieldsFor(outcome: ProspectDisposition): OutcomeField[] {
  const required = requiredFieldsFor(outcome);
  const optional: OutcomeField[] = ['notes'];
  if (outcome === 'spoke_with_dm' || outcome === 'gatekeeper') {
    optional.push('decision_maker_name');
  }
  if (outcome === 'callback_requested' || outcome === 'interested') {
    optional.push('decision_maker_name', 'best_contact_method');
  }
  return Array.from(new Set([...required, ...optional]));
}

const FIELD_LABELS: Record<OutcomeField, string> = {
  notes: 'Notes',
  callback_at: 'Callback date and time',
  decision_maker_name: 'Decision-maker name',
  best_contact_method: 'Best contact method',
  follow_up_at: 'Follow-up date',
  appointment_at: 'Appointment date and time',
  appointment_type: 'Appointment type',
  time_zone: 'Time zone',
  contact_info: 'Confirmation phone or email',
  confirm_do_not_call: 'Do-not-call confirmation',
};

export function outcomeFieldLabel(f: OutcomeField): string {
  return FIELD_LABELS[f];
}

function present(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  return String(v).trim() !== '';
}

function isValidDate(v: string | null | undefined): boolean {
  if (!v) return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}

export interface OutcomeValidation {
  ok: boolean;
  outcome: ProspectDisposition | null;
  errors: Partial<Record<OutcomeField | 'outcome', string>>;
}

/**
 * Validates a logged outcome. Returns every problem at once so the caller can
 * fix the form in one pass rather than being told about them one by one.
 */
export function validateOutcome(input: OutcomeInput): OutcomeValidation {
  const errors: OutcomeValidation['errors'] = {};

  if (!LOGGABLE_OUTCOMES.includes(input.outcome as ProspectDisposition)) {
    return { ok: false, outcome: null, errors: { outcome: 'Choose a call outcome' } };
  }
  const outcome = input.outcome as ProspectDisposition;

  for (const field of requiredFieldsFor(outcome)) {
    const value = (input as unknown as Record<string, unknown>)[field];
    if (!present(value)) {
      errors[field] =
        field === 'confirm_do_not_call'
          ? 'Confirm that this contractor asked not to be called again'
          : `${FIELD_LABELS[field]} is required`;
    }
  }

  // Dates must parse, and scheduling in the past is almost always a typo.
  const now = Date.now();
  for (const field of ['callback_at', 'follow_up_at', 'appointment_at'] as const) {
    const value = input[field];
    if (!present(value)) continue;
    if (!isValidDate(value)) {
      errors[field] = `${FIELD_LABELS[field]} is not a valid date`;
    } else if (Date.parse(value as string) < now - 5 * 60 * 1000) {
      errors[field] = `${FIELD_LABELS[field]} is in the past`;
    }
  }

  return { ok: Object.keys(errors).length === 0, outcome, errors };
}

/** Whether a prospect with this disposition still belongs in a calling queue. */
export function isInQueue(d: ProspectDisposition): boolean {
  return QUEUE_DISPOSITIONS.includes(d);
}

/**
 * Whether the click-to-call control may be shown at all. A do-not-call
 * prospect is never dialable from the interface, whatever else its record says.
 */
export function isDialable(p: {
  disposition: ProspectDisposition;
  do_not_call_at?: string | null;
  phone?: string | null;
}): boolean {
  if (p.disposition === 'do_not_call') return false;
  if (p.do_not_call_at) return false;
  return !!p.phone && p.phone.trim() !== '';
}

/**
 * The prospect-level fields to write after an outcome is logged. Kept pure so
 * the action is a thin wrapper and the mapping is unit-testable.
 */
export function prospectPatchFor(
  outcome: ProspectDisposition,
  input: OutcomeInput
): {
  disposition: ProspectDisposition;
  next_callback_at: string | null;
  follow_up_at: string | null;
  appointment_at: string | null;
  decision_maker_name?: string;
  best_contact_method?: string;
} {
  const patch: ReturnType<typeof prospectPatchFor> = {
    disposition: outcome,
    // Any new outcome supersedes a pending callback unless it sets a new one.
    next_callback_at: outcome === 'callback_requested' ? input.callback_at ?? null : null,
    follow_up_at:
      outcome === 'interested' || outcome === 'follow_up_required'
        ? input.follow_up_at ?? null
        : null,
    appointment_at: outcome === 'appointment_booked' ? input.appointment_at ?? null : null,
  };
  if (present(input.decision_maker_name)) {
    patch.decision_maker_name = String(input.decision_maker_name).trim();
  }
  if (present(input.best_contact_method)) {
    patch.best_contact_method = String(input.best_contact_method).trim();
  }
  return patch;
}
