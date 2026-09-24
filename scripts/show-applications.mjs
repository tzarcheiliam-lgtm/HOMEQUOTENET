/**
 * Prints contractor applications from the database.
 *
 *   SUPABASE_DB_URL=... node scripts/show-applications.mjs [limit]
 *
 * Read-only. Never prints the connection string.
 */
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL not set');
  process.exit(1);
}

const limit = Number(process.argv[2] || 10);
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(
  `select * from public.contractor_applications
    order by submitted_at desc limit $1`,
  [limit]
);

const { rows: countRows } = await client.query(
  `select count(*)::int as n from public.contractor_applications`
);

console.log(`total rows: ${countRows[0].n}\n`);

for (const r of rows) {
  console.log('─'.repeat(64));
  for (const [k, v] of Object.entries(r)) {
    const shown = Array.isArray(v)
      ? `[${v.join(', ')}]`
      : v === null
        ? '(null)'
        : String(v);
    console.log(`  ${k.padEnd(24)} ${shown}`);
  }
}

await client.end();
