/**
 * Applies migration files to the database in order, each in its own
 * transaction, stopping at the first failure. Run a rolled-back dry run first:
 *
 *   node scripts/verify-migration-rollback.mjs <file>        (one file)
 *   node scripts/apply-migrations.mjs --dry-run <file> ...   (all files, one rolled-back txn)
 *   node scripts/apply-migrations.mjs <file> ...              (apply for real)
 *
 * Reads SUPABASE_DB_URL (never printed). Intended to be run by a person, not
 * by automation: applying to production is a deliberate step.
 */
import fs from 'node:fs';
import pg from 'pg';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const files = args.filter((a) => a !== '--dry-run');
if (!files.length) { console.error('usage: apply-migrations.mjs [--dry-run] <migration.sql> ...'); process.exit(2); }
const url = process.env.SUPABASE_DB_URL;
if (!url) { console.error('SUPABASE_DB_URL not set'); process.exit(2); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  if (dryRun) {
    await client.query('begin');
    try {
      for (const f of files) { await client.query(fs.readFileSync(f, 'utf8')); console.log(`ok (dry run)  ${f}`); }
    } finally { await client.query('rollback'); console.log('rolled back — database unchanged'); }
  } else {
    for (const f of files) {
      await client.query('begin');
      try { await client.query(fs.readFileSync(f, 'utf8')); await client.query('commit'); console.log(`APPLIED  ${f}`); }
      catch (e) { await client.query('rollback'); console.error(`FAILED   ${f}: ${e.message}`); process.exitCode = 1; break; }
    }
  }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
