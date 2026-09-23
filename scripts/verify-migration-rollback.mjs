/**
 * Dry-runs a migration file against the database inside a transaction that is
 * always rolled back. Every statement executes for real — syntax, dependencies,
 * triggers, policies — and then nothing persists. Use before applying anything.
 *
 *   node scripts/verify-migration-rollback.mjs supabase/migrations/0007_contractor_prospecting.sql
 *
 * Reads SUPABASE_DB_URL from the environment. Never prints it.
 *
 * Caveat: a value added with `alter type ... add value` cannot be *used* in the
 * same transaction, so checks that need the new enum value are skipped here and
 * belong in the post-apply test run.
 */
import fs from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('usage: verify-migration-rollback.mjs <migration.sql>');
  process.exit(1);
}
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL not set');
  process.exit(1);
}

const sql = fs.readFileSync(file, 'utf8');
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
const q = async (text, params = []) => (await client.query(text, params)).rows;

await client.connect();
let failed = false;
try {
  await client.query('begin');
  console.log(`=== applying ${file} inside a transaction ===`);
  await client.query(sql);
  console.log('  ok: every statement executed');

  const tables = await q(
    `select c.relname, c.relrowsecurity as rls,
            (select count(*) from pg_policies p
              where p.schemaname='public' and p.tablename=c.relname) as policies,
            (select count(*) from pg_trigger t
              where t.tgrelid=c.oid and not t.tgisinternal) as triggers
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
        and c.relname in ('contractor_prospects','prospect_call_attempts','prospect_sales_appointments')
      order by 1`
  );
  console.log('\n=== new tables ===');
  for (const t of tables) {
    console.log(
      `  ${t.relname.padEnd(30)} RLS=${t.rls ? 'on ' : 'OFF'}  policies=${t.policies}  triggers=${t.triggers}`
    );
    if (!t.rls) failed = true;
  }
  if (tables.length !== 3) failed = true;

  const fns = await q(
    `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and proname in
        ('is_caller','to_website_domain','normalize_prospect_contact',
         'guard_prospect_caller_update','prepare_call_attempt','apply_call_attempt',
         'prospect_assigned_to_me')
      order by 1`
  );
  console.log('\n=== functions ===');
  for (const f of fns) console.log(`  ${f.proname}`);
  if (fns.length !== 7) failed = true;

  const enums = await q(
    `select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
       from pg_type t join pg_enum e on e.enumtypid=t.oid
      where t.typname in ('user_role','prospect_disposition','sales_appointment_status')
      group by 1 order by 1`
  );
  console.log('\n=== enums ===');
  for (const e of enums) console.log(`  ${e.typname}: ${e.labels.join(', ')}`);
  const roles = enums.find((e) => e.typname === 'user_role')?.labels ?? [];
  if (!roles.includes('caller')) failed = true;

  const policies = await q(
    `select tablename, policyname, cmd from pg_policies
      where schemaname='public'
        and tablename in ('contractor_prospects','prospect_call_attempts','prospect_sales_appointments')
      order by 1,2`
  );
  console.log('\n=== policies ===');
  for (const p of policies) console.log(`  ${p.tablename.padEnd(30)} ${p.cmd.padEnd(7)} ${p.policyname}`);
  const attemptPolicies = policies.filter((p) => p.tablename === 'prospect_call_attempts');
  if (attemptPolicies.some((p) => p.cmd === 'UPDATE' || p.cmd === 'DELETE')) {
    console.log('  FAIL: call attempts must have no update/delete policy');
    failed = true;
  }

  // Behavioural checks that do not need the new enum value (superuser path,
  // auth.uid() is null so the caller guards are bypassed as for service role).
  console.log('\n=== behaviour (as service role) ===');
  const [p] = await q(
    `insert into public.contractor_prospects (company_name, phone, website)
     values ('Verify Co (rollback)', '(818) 555-0100', 'https://www.Example-Verify.com/contact?x=1')
     returning phone_e164, website_domain, disposition, call_attempt_count`
  );
  console.log(`  normalize: phone_e164=${p.phone_e164} domain=${p.website_domain}`);
  if (p.phone_e164 !== '+18185550100' || p.website_domain !== 'example-verify.com') failed = true;

  const [pid] = await q(`select id from public.contractor_prospects where company_name='Verify Co (rollback)'`);
  await q(
    `insert into public.prospect_call_attempts (prospect_id, outcome, new_disposition, notes)
     values ($1, 'no_answer', 'no_answer', 'verify')`,
    [pid.id]
  );
  // Mirror the app: the disposition is written after each attempt is logged.
  await q(`update public.contractor_prospects set disposition='no_answer' where id=$1`, [pid.id]);
  await q(
    `insert into public.prospect_call_attempts (prospect_id, outcome, new_disposition, notes)
     values ($1, 'do_not_call', 'do_not_call', 'verify dnc')`,
    [pid.id]
  );
  await q(`update public.contractor_prospects set disposition='do_not_call' where id=$1`, [pid.id]);
  const [after] = await q(
    `select call_attempt_count, last_contacted_at is not null as stamped, do_not_call_at is not null as dnc_stamped
       from public.contractor_prospects where id=$1`,
    [pid.id]
  );
  console.log(`  counter after 2 attempts: ${after.call_attempt_count}; last_contacted stamped=${after.stamped}; dnc_at stamped=${after.dnc_stamped}`);
  if (after.call_attempt_count !== 2 || !after.stamped || !after.dnc_stamped) failed = true;

  let blocked = false;
  try {
    await client.query('savepoint dnc');
    await q(
      `insert into public.prospect_call_attempts (prospect_id, outcome, new_disposition)
       values ($1, 'no_answer', 'no_answer')`,
      [pid.id]
    );
  } catch (e) {
    blocked = /do-not-call/i.test(e.message);
    await client.query('rollback to savepoint dnc');
  }
  console.log(`  new attempt on a do-not-call prospect blocked by trigger: ${blocked}`);
  if (!blocked) failed = true;

  const [attempt] = await q(
    `select attempt_number, previous_disposition from public.prospect_call_attempts
      where prospect_id=$1 order by attempt_number desc limit 1`,
    [pid.id]
  );
  console.log(`  last attempt_number=${attempt.attempt_number} previous_disposition=${attempt.previous_disposition}`);
  if (attempt.attempt_number !== 2 || attempt.previous_disposition !== 'no_answer') failed = true;
} catch (e) {
  failed = true;
  console.error('\nFAILED:', e.message);
} finally {
  await client.query('rollback');
  console.log('\n=== rolled back; database unchanged ===');
  await client.end();
}
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
