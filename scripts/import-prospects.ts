/**
 * Prospect list import — report first, write only on --apply.
 *
 *   node scripts/import-prospects.ts <file.csv|file.json>            # report only
 *   node scripts/import-prospects.ts <file> --apply --batch=liam-2026-09
 *
 * Reads SUPABASE_DB_URL from the environment (never printed). Runs on Node 22.6+
 * (type stripping); Node 24 needs no flags.
 *
 * Columns (CSV header or JSON keys), all optional except company_name:
 *   company_name, phone, website, email, city, county, state, service_area,
 *   primary_services (";" or "," separated), category, rating, review_count,
 *   assigned_to (caller first name or email, e.g. "Liam"), notes
 *
 * What it does before writing anything — and prints as a report:
 *   - normalizes phones (E.164) and websites (domain), classifies
 *     cleaning-only businesses, flags missing/invalid phones
 *   - deduplicates within the file on phone, then domain, then name+city
 *   - checks the database for prospects that already exist (by phone) and
 *     skips them, so re-running an import never creates duplicates
 *   - resolves assigned_to against ACTIVE caller accounts and reports any
 *     handle that matches nobody (those rows import unassigned)
 *
 * Output is counts only. No company names, phone numbers or emails are ever
 * printed, so the console log is safe to paste into a ticket.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {
  buildReport,
  type NormalizedProspect,
  type RawProspectRow,
} from '../lib/calls/import.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const batchArg = args.find((a) => a.startsWith('--batch='));
const batch = batchArg ? batchArg.slice('--batch='.length) : `import-${new Date().toISOString().slice(0, 10)}`;

if (!file) {
  console.error('usage: node scripts/import-prospects.ts <file.csv|file.json> [--apply] [--batch=name]');
  process.exit(1);
}

/* ---- Read ------------------------------------------------------------------ */

function parseCsv(text: string): Record<string, string>[] {
  // RFC 4180: quoted fields may contain commas, quotes ("") and newlines.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
const sourceRows: RawProspectRow[] =
  path.extname(file).toLowerCase() === '.json'
    ? (JSON.parse(raw) as RawProspectRow[])
    : (parseCsv(raw) as RawProspectRow[]);

/* ---- Report ------------------------------------------------------------------ */

const { report, kept } = buildReport(sourceRows);

console.log(`=== prospect import report: ${path.basename(file)} ===`);
console.log(`  source rows               ${report.sourceRows}`);
console.log(`  unusable (no company)     ${report.unusable}`);
console.log(`  duplicates in file        ${report.duplicates}  (phone ${report.duplicatesBy.phone}, domain ${report.duplicatesBy.domain}, name+city ${report.duplicatesBy['name+city']})`);
console.log(`  unique prospects          ${report.kept}`);
console.log(`    missing phone           ${report.missingPhone}`);
console.log(`    invalid phone           ${report.invalidPhone}`);
console.log(`    pool-cleaning-only      ${report.poolCleaningOnly}  (imported and flagged on the record; not excluded, so a false positive cannot hide a real prospect)`);
console.log(`  by assignee in file:`);
for (const [k, n] of Object.entries(report.byAssignee).sort()) console.log(`    ${k.padEnd(22)} ${n}`);
console.log(`    ${'(unassigned)'.padEnd(22)} ${report.unassigned}`);

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.log('\nSUPABASE_DB_URL not set: skipping the database checks. Nothing written.');
  process.exit(0);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const q = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;

try {
  const [{ ok }] = await q(`select to_regclass('public.contractor_prospects') is not null as ok`);
  if (!ok) {
    console.log('\nMigration 0007 has not been applied; cannot check or write. Nothing written.');
    process.exit(apply ? 1 : 0);
  }

  // Resolve caller handles → active caller profiles.
  const callers = (await q(
    `select id, coalesce(nullif(full_name,''), email) as name, email
       from public.profiles
      where role::text='caller' and account_status='active' and deleted_at is null`
  )) as { id: string; name: string; email: string | null }[];
  const resolve = (key: string | null): string | null => {
    if (!key) return null;
    const k = key.toLowerCase();
    const hit =
      callers.find((c) => c.name.toLowerCase().startsWith(k)) ??
      callers.find((c) => (c.email ?? '').toLowerCase().startsWith(k)) ??
      callers.find((c) => (c.email ?? '').toLowerCase() === k);
    return hit?.id ?? null;
  };
  const unresolved = new Map<string, number>();
  for (const k of kept) {
    if (k.assigned_key && !resolve(k.assigned_key)) {
      unresolved.set(k.assigned_key, (unresolved.get(k.assigned_key) ?? 0) + 1);
    }
  }
  console.log(`\n  active caller accounts    ${callers.length}`);
  if (unresolved.size > 0) {
    console.log(`  assignee handles with no matching caller account (rows will import unassigned):`);
    for (const [k, n] of unresolved) console.log(`    ${k.padEnd(22)} ${n}`);
  }

  // Already in the database (by phone). These are skipped, never merged.
  const phones = kept.map((k) => k.phone_e164).filter((p): p is string => !!p);
  const existing = new Set<string>(
    phones.length
      ? ((await q(
          `select phone_e164 from public.contractor_prospects where phone_e164 = any($1::text[])`,
          [phones]
        )) as { phone_e164: string }[]).map((r) => r.phone_e164)
      : []
  );
  const toWrite = kept.filter((k) => !k.phone_e164 || !existing.has(k.phone_e164));
  console.log(`  already in database       ${kept.length - toWrite.length}  (skipped)`);
  console.log(`  would be written          ${toWrite.length}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write these rows.');
    process.exit(0);
  }

  await client.query('begin');
  let written = 0;
  let assigned = 0;
  for (const k of toWrite as NormalizedProspect[]) {
    const assignee = resolve(k.assigned_key);
    await q(
      `insert into public.contractor_prospects
         (company_name, phone, website, email, city, county, state, service_area,
          primary_services, category, rating, review_count, is_pool_cleaning_only, flags,
          assigned_to, assigned_at, notes, source, import_batch)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               case when $15::uuid is null then null else now() end, $16, 'import', $17)`,
      [
        k.company_name, k.phone, k.website, k.email, k.city, k.county, k.state, k.service_area,
        k.primary_services, k.category, k.rating, k.review_count, k.is_pool_cleaning_only, k.flags,
        assignee, k.notes, batch,
      ]
    );
    written += 1;
    if (assignee) assigned += 1;
  }
  await client.query('commit');
  console.log(`\nWritten: ${written} prospects (${assigned} assigned) in batch "${batch}".`);
  console.log(`To undo this batch: delete from public.contractor_prospects where import_batch = '${batch}' and call_attempt_count = 0;`);
} catch (e) {
  try {
    await client.query('rollback');
  } catch {
    /* not in a transaction */
  }
  console.error('\nFAILED:', (e as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
