export interface CallerOption {
  id: string;
  name: string;
  email: string | null;
}

export const CALL_ASSIGNEE_ROLES = ['caller', 'admin'] as const;

export function isCallAssigneeRole(role: string): boolean {
  return CALL_ASSIGNEE_ROLES.some((allowed) => allowed === role);
}

export type NamedCallerSelection = 'liam' | 'nadav' | 'both';

/**
 * Resolves a saved view like "Liam's list" to a caller account. Pure, so it
 * is unit-tested directly.
 *
 * Exact wins over partial at every step: a caller whose full name IS "Liam"
 * beats "Liam (QA)" or "Liam Smith", and an exact first name beats a prefix.
 * Without that, two callers sharing a first name would make the view depend
 * on sort order. Matching is case-insensitive.
 */
export function findCallerByName(callers: CallerOption[], name: string): CallerOption | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const nameOf = (c: CallerOption) => c.name.trim().toLowerCase();
  const firstWord = (s: string) => s.split(/[\s(]+/)[0];
  const local = (c: CallerOption) => (c.email ?? '').toLowerCase().split('@')[0];

  return (
    callers.find((c) => nameOf(c) === n) ??
    callers.find((c) => firstWord(nameOf(c)) === n) ??
    callers.find((c) => local(c) === n) ??
    callers.find((c) => nameOf(c).startsWith(n)) ??
    callers.find((c) => local(c).startsWith(n)) ??
    null
  );
}

/** Converts the refresh dialog's labels to the exact profile ids it selected. */
export function callerIdsForSelection(
  callers: CallerOption[],
  selection: NamedCallerSelection
): string[] {
  const names = selection === 'both' ? ['liam', 'nadav'] : [selection];
  return names.flatMap((name) => {
    const caller = findCallerByName(callers, name);
    return caller ? [caller.id] : [];
  });
}

/** The assigned profile id represented by an account-specific saved view. */
export function assignedProfileIdForView(
  view: 'mine' | 'liam' | 'nadav',
  signedInUserId: string,
  callers: CallerOption[]
): string | null {
  if (view === 'mine') return signedInUserId;
  return findCallerByName(callers, view)?.id ?? null;
}
