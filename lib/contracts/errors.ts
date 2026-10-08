export class ContractError extends Error {
  constructor(public readonly code: string, message: string, public readonly extra?: Record<string, unknown>) { super(message); }
}
export const CONTRACT_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have access to contracts.',
  not_found: 'That contract could not be found.',
  template_not_found: 'That template could not be found.',
  locked: 'This agreement has been sent and can no longer be edited. Duplicate it to make a new draft.',
  in_use: 'This template has been used for agreements, so it cannot be deleted. Archive it instead.',
  not_published: 'Publish the template before creating agreements from it.',
  archived: 'This template is archived. Restore it first.',
  empty: 'Add at least one section before publishing.',
  in_progress: 'This agreement is already being sent. Refresh in a moment.',
  bad_contractor: 'That client could not be found.',
  invalid: 'Some values are invalid.',
};
export const contractMessage = (code: string) => CONTRACT_MESSAGES[code] ?? 'Something went wrong. Please try again.';
