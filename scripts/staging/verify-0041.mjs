/**
 * STAGING ONLY. Read-only verification of migration 0041 against the staging database.
 *
 *   STAGING_PROJECT_REF=<ref> STAGING_CONFIRM=I-understand-this-is-not-production \
 *   SUPABASE_DB_URL=<staging direct connection> node scripts/staging/verify-0041.mjs
 *
 * It refuses to run if the environment could be production or external calling is enabled
 * (see guard.mjs), never writes, never prints the connection string, and makes no provider calls.
 */
import pg from 'pg';
import { assertStagingSafe } from './guard.mjs';
import { runChecks } from './checks.mjs';

const guard = assertStagingSafe(process.env);
if (!guard.ok) {
  console.error('REFUSING TO RUN:\n - ' + guard.problems.join('\n - '));
  process.exit(2);
}
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('set default_transaction_read_only = on');
  const results = await runChecks(async (sql) => (await client.query(sql)).rows);
  for (const r of results) console.log(`${r.status.padEnd(7)} [${r.kind}] ${r.title}${r.detail ? ` - ${r.detail}` : ''}`);
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
} finally {
  await client.end();
}
