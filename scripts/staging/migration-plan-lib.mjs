/**
 * Read-only migration planner. Decides, per migration file, whether a database already has it, by looking for the
 * objects the file creates (tables, functions, enum types, added columns). There is no migration-history table to trust:
 * migrations have been applied by hand (scripts/apply-migrations.mjs does not record them), so presence of the objects is
 * the evidence. Objects a LATER migration drops are ignored. Pure: the database is injected, so it is unit-tested.
 */
const strip = (sql) => sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const ident = '(?:public\\.)?"?([a-z_][a-z0-9_]*)"?';

export function sentinelsOf(sql) {
  const s = strip(sql);
  const out = { tables: new Set(), functions: new Set(), types: new Set(), columns: [] , dropped: new Set() };
  for (const m of s.matchAll(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${ident}\\s*\\(`, 'gi'))) out.tables.add(m[1]);
  for (const m of s.matchAll(new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+${ident}\\s*\\(`, 'gi'))) out.functions.add(m[1]);
  for (const m of s.matchAll(new RegExp(`create\\s+type\\s+${ident}\\s+as`, 'gi'))) out.types.add(m[1]);
  for (const m of s.matchAll(new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${ident}\\s+([\\s\\S]*?);`, 'gi'))) {
    for (const c of m[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) out.columns.push([m[1], c[1]]);
  }
  for (const m of s.matchAll(new RegExp(`drop\\s+(table|function|type)\\s+(?:if\\s+exists\\s+)?${ident}`, 'gi'))) out.dropped.add(`${m[1].toLowerCase()}:${m[2]}`);
  return out;
}

/** files: [{ name, sql }] in apply order. exists: async ({kind, name, table}) => boolean. */
export async function planMigrations(files, exists) {
  const parsed = files.map((f) => ({ name: f.name, s: sentinelsOf(f.sql) }));
  const dropsLater = (i) => { const d = new Set(); for (const p of parsed.slice(i + 1)) for (const x of p.s.dropped) d.add(x); return d; };
  const rows = [];
  const definedEarlier = new Set(); // a function an EARLIER migration already created is only replaced here: not evidence of this file
  for (let i = 0; i < parsed.length; i++) {
    const { name, s } = parsed[i]; const later = dropsLater(i);
    const newFunctions = [...s.functions].filter((f) => !definedEarlier.has(f));
    for (const f of s.functions) definedEarlier.add(f);
    const checks = [
      ...[...s.tables].filter((t) => !later.has(`table:${t}`)).map((t) => ({ kind: 'table', name: t })),
      ...newFunctions.filter((t) => !later.has(`function:${t}`)).map((t) => ({ kind: 'function', name: t })),
      ...[...s.types].filter((t) => !later.has(`type:${t}`)).map((t) => ({ kind: 'type', name: t })),
      ...s.columns.filter(([t]) => !later.has(`table:${t}`)).map(([t, c]) => ({ kind: 'column', table: t, name: c })),
    ];
    let present = 0; const missing = [];
    for (const c of checks) { if (await exists(c)) present++; else missing.push(c.table ? `${c.table}.${c.name}` : `${c.kind} ${c.name}`); }
    const status = checks.length === 0 ? 'unknown' : present === checks.length ? 'applied' : present === 0 ? 'missing' : 'partial';
    rows.push({ name, status, checked: checks.length, missing: missing.slice(0, 6) });
  }
  return rows;
}

/**
 * What to do next: apply in order, stop at the first problem. `unknown` files (policy/trigger-only migrations that create no
 * table, function, type or column) cannot be detected; they are listed as a note and assumed to follow their neighbours.
 */
export function nextSteps(rows) {
  const unknown = rows.filter((r) => r.status === 'unknown').map((r) => r.name);
  const note = unknown.length ? ` (cannot be auto-detected, assumed to follow their neighbours: ${unknown.join(', ')})` : '';
  const known = rows.filter((r) => r.status !== 'unknown');
  const partial = known.filter((r) => r.status === 'partial');
  if (partial.length) return { ok: false, message: `PARTIALLY applied: ${partial.map((r) => r.name).join(', ')}. Do not apply anything until a person has compared the database with these files.` };
  const firstMissing = known.findIndex((r) => r.status === 'missing');
  if (firstMissing === -1) return { ok: true, pending: [], message: 'Every migration is already present.' + note };
  const afterApplied = known.slice(firstMissing).filter((r) => r.status === 'applied');
  if (afterApplied.length) return { ok: false, message: `GAP: ${known[firstMissing].name} is missing but later migrations (${afterApplied.map((r) => r.name).join(', ')}) are present. Investigate before applying.` };
  // include the undetectable files that sit after the first missing one, so the whole tail is applied in order
  const startName = known[firstMissing].name;
  const pending = rows.filter((r) => r.name >= startName).map((r) => r.name);
  return { ok: true, pending, message: `Apply, in this order: ${pending.join(', ')}` + note };
}
