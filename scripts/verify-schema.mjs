/**
 * Read-only schema verification against the migrated database.
 * Reads SUPABASE_DB_URL from the environment. Never prints it.
 */
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const q = async (sql, params = []) => (await client.query(sql, params)).rows;

await client.connect();

console.log('=== migration history ===');
for (const r of await q(
  `select version, name from supabase_migrations.schema_migrations order by version`
)) {
  console.log(`  ${r.version}  ${r.name ?? ''}`);
}

console.log('\n=== public tables ===');
const tables = await q(
  `select c.relname,
          c.relrowsecurity as rls,
          (select count(*) from pg_policies p
             where p.schemaname='public' and p.tablename=c.relname) as policies
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
    order by c.relname`
);
for (const t of tables) {
  console.log(
    `  ${t.relname.padEnd(28)} RLS=${t.rls ? 'on ' : 'OFF'}  policies=${t.policies}`
  );
}

console.log('\n=== contractor_applications columns ===');
const cols = await q(
  `select column_name, data_type, is_nullable
     from information_schema.columns
    where table_schema='public' and table_name='contractor_applications'
    order by ordinal_position`
);
console.log(`  ${cols.length} columns`);
for (const c of cols) {
  console.log(
    `    ${c.column_name.padEnd(24)} ${c.data_type.padEnd(28)} ${
      c.is_nullable === 'NO' ? 'NOT NULL' : ''
    }`
  );
}

console.log('\n=== contractor_applications indexes ===');
for (const r of await q(
  `select indexname from pg_indexes
    where schemaname='public' and tablename='contractor_applications'
    order by indexname`
)) {
  console.log('  ', r.indexname);
}

console.log('\n=== triggers on contractor_applications ===');
for (const r of await q(
  `select tgname from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
    where c.relname='contractor_applications' and not t.tgisinternal`
)) {
  console.log('  ', r.tgname);
}

console.log('\n=== key functions ===');
for (const name of [
  'to_e164',
  'normalize_lead_contact',
  'normalize_application_contact',
]) {
  const r = await q(
    `select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=$1`,
    [name]
  );
  console.log(`  ${name.padEnd(32)} ${r.length ? 'present' : 'MISSING'}`);
}

console.log('\n=== check constraints on contractor_applications ===');
for (const r of await q(
  `select con.conname, pg_get_constraintdef(con.oid) as def
     from pg_constraint con
     join pg_class c on c.oid=con.conrelid
    where c.relname='contractor_applications' and con.contype='c'
    order by con.conname`
)) {
  console.log(`  ${r.conname}: ${r.def}`);
}

console.log('\n=== row counts ===');
for (const t of ['contractor_applications', 'leads', 'contractors', 'profiles']) {
  try {
    const r = await q(`select count(*)::int as n from public.${t}`);
    console.log(`  ${t.padEnd(28)} ${r[0].n}`);
  } catch {
    console.log(`  ${t.padEnd(28)} (not present)`);
  }
}

await client.end();
console.log('\nverification complete');
