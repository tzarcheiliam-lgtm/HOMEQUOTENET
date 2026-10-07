export class SigningError extends Error {
  constructor(public readonly code: string, message: string, public readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

/** Plain-language messages for the codes returned by the SQL state functions. */
export const ERROR_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have access to this document.',
  not_found: 'That document could not be found.',
  locked: 'This request has been sent and can no longer be edited. Create a new version to make changes.',
  not_draft: 'Only drafts can be sent.',
  subject_required: 'Add an email subject before sending.',
  no_recipients: 'Add at least one signer.',
  recipient_without_signature: 'Every signer needs at least one signature field.',
  unassigned_fields: 'Some fields are not assigned to a signer (and have no sender-provided value).',
  unreviewed_fields: 'Some suggested fields still need your review.',
  review_required: 'Review the field placement on every page before sending.',
  not_voidable: 'Only requests that are awaiting signature can be voided.',
  draft_exists: 'This document already has a draft version. Finish or delete it first.',
  already_draft: 'This version is already a draft.',
  expired: 'This signing link has expired.',
  voided: 'This request was cancelled by the sender.',
  declined: 'This request was declined.',
  invalid: 'This signing link is not valid.',
  not_your_turn: 'It is not your turn to sign yet. You will get an email when it is.',
  consent_required: 'Please agree to sign electronically first.',
  missing_required: 'Please complete all required fields.',
  group_conflict: 'Only one option can be selected in a group.',
  bad_field: 'One of the fields could not be accepted.',
  bad_value: 'One of the values could not be accepted.',
  too_long: 'One of the values is too long.',
  not_open: 'This request is no longer open for signing.',
  code_required: 'Enter your access code to continue.',
  wrong_code: 'That access code is not correct.',
  code_locked: 'Too many incorrect attempts. Ask the sender for a new access code.',
  code_missing: 'No access code has been set up for this request. Ask the sender to send it again.',
  not_required: 'This request does not use an access code.',
  bad_roles: 'The number of signers does not match the template.',
  template_not_found: 'That template could not be found.',
  lead_mismatch: 'That lead is not assigned to this company.',
};
export const messageFor = (code: string) => ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
