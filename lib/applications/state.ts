import type { FieldErrors } from '@/lib/validation/application';

/**
 * Form state shared by the server action and the client form.
 *
 * This lives outside lib/actions/applications.ts on purpose: a 'use server'
 * module may only export async functions, so a plain object exported from
 * there arrives as `undefined` on the client.
 */
export type ApplicationState = {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  fieldErrors: FieldErrors;
  /** Echoed back so the form can repopulate after a failed submit. */
  values: Record<string, string | string[]>;
};

export const initialApplicationState: ApplicationState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
  values: {},
};
