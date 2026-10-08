/**
 * READ-ONLY. Tells you which migrations a database is missing, in order, without changing anything.
 *
 *   STAGING_PROJECT_REF=<ref> STAGING_CONFIRM=I-understand-this-is-not-production \
 *   SUPABASE_DB_URL=<direct connection string> node scripts/staging/migration-plan.mjs
 *
 * Add --allow-production only for a deliberate, read-only look at production (it still changes nothing).
 * A fresh project reports every file as `missing`: apply ALL of them (see docs/meta-ads-setup.md, "Database procedure").
 * The connection string is read from the environment and never printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { assertStagingSafe } from './guard.mjs';
import { planMigrations, nextSteps } from './migration-plan-lib.mjs';

const prodLook = process.argv.includes('--allow-production');
if (!prodLook) {
  const problems = assertStagingSafe(process.env);
  if (problems.length) { console.error('Refusing to run:\n - ' + problems.join('\n - ')); process.exit(2); }
} else if (!process.env.SUPABASE_DB_URL) { console.error('SUPABASE_DB_URL not set'); process.exit(2); }

const dir = path.resolve('supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((name) => ({ name, sql: fs.readFileSync(path.join(dir, name), 'utf8') }));
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('set default_transaction_read_only = on');
  const one = async (sql, p) => (await client.query(sql, p)).rows.length > 0;
  const exists = async ({ kind, name, table }) => kind === 'table' ? one(`select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1 and c.relkind in ('r','p')`, [name])
    : kind === 'function' ? one(`select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1`, [name])
    : kind === 'type' ? one(`select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname=$1`, [name])
    : one(`select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2`, [table, name]);
  const rows = await planMigrations(files, exists);
  for (const r of rows) console.log(`${r.status.padEnd(8)} ${r.name}${r.status === 'partial' ? `   missing: ${r.missing.join(', ')}` : ''}`);
  const plan = nextSteps(rows);
  console.log(`\n${plan.message}`);
  if (plan.ok && plan.pending?.length) console.log('\nDry run first:  node scripts/apply-migrations.mjs --dry-run ' + plan.pending.map((n) => `supabase/migrations/${n}`).join(' '));
  process.exitCode = plan.ok ? 0 : 1;
} finally { await client.end(); }
