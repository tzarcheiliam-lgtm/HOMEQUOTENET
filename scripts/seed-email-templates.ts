/**
 * One-time seed of the default email template library. Idempotent: only
 * inserts templates whose key isn't already present, so it's safe to re-run
 * (e.g. after adding new templates to lib/emails/template-library.ts) and
 * never overwrites an admin's edits to an existing row.
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL. Run by a
 * person, not automation: node --import tsx scripts/seed-email-templates.mjs.ts
 */
import { createClient } from '@supabase/supabase-js';
import { buildEmailTemplateSeedRows } from '../lib/emails/template-library';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: existing, error: existingError } = await admin.from('email_templates').select('key');
  if (existingError) {
    console.error('load failed:', existingError.message);
    process.exit(1);
  }
  const existingKeys = new Set((existing ?? []).map((r) => r.key));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com';
  const missing = buildEmailTemplateSeedRows(siteUrl).filter((row) => !existingKeys.has(row.key));

  if (!missing.length) {
    console.log('All default templates are already present. Nothing to do.');
    return;
  }

  const { error } = await admin.from('email_templates').insert(missing);
  if (error) {
    console.error('insert failed:', error.message);
    process.exit(1);
  }
  console.log(`Inserted ${missing.length} template(s):`);
  for (const row of missing) console.log(`  - [${row.category}] ${row.name} (${row.key})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
