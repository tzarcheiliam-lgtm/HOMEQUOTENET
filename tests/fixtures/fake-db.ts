/**
 * A tiny in-memory stand-in for the slice of the Supabase query builder that
 * lib/notifications uses (select/insert/update/delete with eq/in/is filters and
 * single/maybeSingle). Embedded selects like `vertical:verticals(name)` read the
 * nested object straight off the stored row.
 */
export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export function fakeDb(tables: Tables) {
  const from = (name: string) => {
    tables[name] ??= [];
    const filters: ((r: Row) => boolean)[] = [];
    let op: 'select' | 'update' | 'delete' = 'select';
    let patch: Row = {};
    let head = false;
    const rows = () => tables[name].filter((r) => filters.every((f) => f(r)));
    const run = () => {
      if (op === 'update') rows().forEach((r) => Object.assign(r, patch));
      if (op === 'delete') tables[name] = tables[name].filter((r) => !filters.every((f) => f(r)));
      return { data: op === 'select' ? rows() : null, count: head ? rows().length : null, error: null };
    };
    const chain: Record<string, unknown> = {
      select: (_cols?: string, opts?: { head?: boolean }) => {
        head = !!opts?.head;
        return chain;
      },
      insert: (v: Row | Row[]) => {
        (Array.isArray(v) ? v : [v]).forEach((r) => tables[name].push({ id: `${name}-${tables[name].length}`, ...r }));
        return Promise.resolve({ data: null, error: null });
      },
      update: (p: Row) => {
        op = 'update';
        patch = p;
        return chain;
      },
      delete: () => {
        op = 'delete';
        return chain;
      },
      in: (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(r[col])), chain),
      eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), chain),
      is: (col: string, val: unknown) => (filters.push((r) => (r[col] ?? null) === val), chain),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve(run()),
    };
    return chain;
  };
  return { from } as never;
}
