// Node 24: node --env-file=.env.local scripts/funnels.mjs
//   validate config.json                                   (offline; no database)
//   check | migrate | demo
//   publish config.json slug contractorId [integrationId] [verticalId]
//   update config.json slug                                (replace config only; live sessions keep their snapshot)
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { funnelSchema } from '../lib/funnels/schema.ts';

const mode = process.argv[2];
if (!['validate', 'check', 'migrate', 'demo', 'publish', 'update'].includes(mode)) throw new Error('Use validate, check, migrate, demo, publish or update');
function loadConfig(path) {
  const parsed = funnelSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) throw new Error(`Invalid funnel config:\n${parsed.error.issues.map(i => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`);
  const config = parsed.data;
  // Templates ship with placeholders and no ZIPs; publishing one as-is would qualify nobody.
  const placeholders = JSON.stringify(config).match(/REPLACE_WITH_[A-Z_]+/g);
  if (placeholders) throw new Error(`Fill in template placeholders first: ${[...new Set(placeholders)].join(', ')}`);
  if (!config.serviceArea.zipCodes.length) throw new Error('serviceArea.zipCodes is empty; add the ZIPs this client serves');
  return config;
}
if (mode === 'validate') {
  const config = loadConfig(process.argv[3]);
  console.log(`Valid: ${config.clientName} · ${config.industry} · ${config.questions.length} questions · ${config.serviceArea.zipCodes.length} ZIPs`);
  process.exit(0);
}
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  if (mode === 'check' || mode === 'migrate') {
    await db.query('begin');
    try {
      await db.query(readFileSync('supabase/migrations/0012_lead_funnels.sql', 'utf8'));
      if (mode === 'migrate') {
        await db.query("insert into supabase_migrations.schema_migrations(version,name,statements) values('0012','lead_funnels',array[]::text[])");
        await db.query('commit'); console.log('Migration 0012 applied.');
      } else { await db.query('rollback'); console.log('Migration validated; all changes rolled back.'); }
    } catch (error) { await db.query('rollback'); throw error; }
  } else if (mode === 'update') {
    const config = loadConfig(process.argv[3]);
    const slug = process.argv[4];
    if (!slug) throw new Error('Supply config JSON and an existing slug');
    const { rowCount } = await db.query('update public.funnels set config=$2 where slug=$1', [slug, config]);
    if (!rowCount) throw new Error(`No funnel with slug ${slug}; use publish to create it`);
    console.log(`Updated /estimate/${slug}. New visitors get this config; in-progress sessions keep their original questions.`);
  } else {
    const demo = mode === 'demo';
    const config = demo ? funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-demo.json', 'utf8'))) : loadConfig(process.argv[3]);
    const slug = demo ? 'pool-remodeling-demo' : process.argv[4];
    const contractor = demo ? null : process.argv[5];
    if (!slug || (!demo && !contractor)) throw new Error('Supply config JSON, slug, and an existing contractor UUID');
    const existing = await db.query('select id from public.funnels where slug=$1', [slug]);
    if (existing.rows.length) throw new Error('Slug already exists. Use the update command to change its config; publish never overwrites a funnel.');
    await db.query('insert into public.funnels(slug,contractor_id,integration_id,vertical_id,is_demo,published,config) values($1,$2,$3,$4,$5,true,$6)',
      [slug, contractor, demo ? null : process.argv[6] || null, demo ? null : process.argv[7] || null, demo, config]);
    console.log(`Published /estimate/${slug}${demo ? ' (demo; no lead/CRM/booking writes)' : ''}`);
  }
} finally { await db.end(); }
