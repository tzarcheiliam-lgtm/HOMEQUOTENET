export interface CallerOption {
  id: string;
  name: string;
  email: string | null;
}

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
