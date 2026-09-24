// Node 24: node --env-file=.env.local scripts/funnels.mjs
//   validate config.json                                   (offline; no database)
//   check|migrate [migration.sql]                          (default 0012)
//   demo
//   publish config.json slug contractorId|house [integrationId|none] [verticalId|verticalSlug]
//     'house' = HomeQuote-owned: leads land unassigned in the HomeQuote inbox
//   unpublish slug
//   ghl-check integration.json                             (verify token, pipeline, stage, custom fields; read-only)
//   ghl-connect integration.json slug                      (create/update the GHL integration and attach it to the funnel)
//   update config.json slug                                (replace config only; live sessions keep their snapshot)
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { funnelSchema } from '../lib/funnels/schema.ts';
import { ghlConfigSchema } from '../lib/funnels/ghl-config.ts';

const mode = process.argv[2];
if (!['validate', 'check', 'migrate', 'demo', 'publish', 'update', 'unpublish', 'ghl-check', 'ghl-connect'].includes(mode)) throw new Error('Use validate, check, migrate, demo, publish, update, unpublish, ghl-check or ghl-connect');
function loadConfig(path) {
  const parsed = funnelSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) throw new Error(`Invalid funnel config:\n${parsed.error.issues.map(i => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`);
  const config = parsed.data;
  // Templates ship with placeholders and no ZIPs; publishing one as-is would qualify nobody.
  const placeholders = JSON.stringify(config).match(/REPLACE_WITH_[A-Z_]+/g);
  if (placeholders) throw new Error(`Fill in template placeholders first: ${[...new Set(placeholders)].join(', ')}`);
  if (!config.serviceArea.zipCodes.length && !config.serviceArea.zipPrefixes.length) throw new Error('Service area is empty; add zipCodes or zipPrefixes');
  return config;
}
if (mode === 'validate') {
  const config = loadConfig(process.argv[3]);
  console.log(`Valid: ${config.clientName} · ${config.industry} · ${config.questions.length} questions · ${config.serviceArea.zipCodes.length} ZIPs, ${config.serviceArea.zipPrefixes.length} ZIP prefixes`);
  process.exit(0);
}
if (mode === 'ghl-check') {
  const ghl = ghlConfigSchema.parse(JSON.parse(readFileSync(process.argv[3], 'utf8')));
  const token = process.env[ghl.tokenEnv ?? ''];
  if (!token) throw new Error(`Set ${ghl.tokenEnv} in .env.local (and in Vercel) first`);
  const get = async (path) => {
    const res = await fetch(`https://services.leadconnectorhq.com${path}`, { headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GET ${path.split('?')[0]} returned HTTP ${res.status}${res.status === 401 || res.status === 403 ? ' (check token and scopes)' : ''}`);
    return res.json();
  };
  const { pipelines } = await get(`/opportunities/pipelines?locationId=${ghl.locationId}`);
  const pipeline = pipelines.find(p => p.id === ghl.pipelineId);
  if (!pipeline) throw new Error('Pipeline not found in this location');
  const stage = pipeline.stages.find(st => st.id === ghl.pipelineStageId);
  if (!stage) throw new Error('Stage not found in the pipeline');
  console.log(`Token OK · pipeline "${pipeline.name}" · stage "${stage.name}"`);
  const { customFields } = await get(`/locations/${ghl.locationId}/customFields?model=contact`);
  for (const f of ghl.customFields) {
    const found = customFields.find(c => c.id === f.id);
    if (!found) throw new Error(`Custom field ${f.id} (${f.from}) not found`);
    const bad = Object.values(f.map).filter(v => found.picklistOptions && !found.picklistOptions.includes(v));
    console.log(`  ${f.from} -> "${found.name}" (${found.dataType})${bad.length ? `  UNKNOWN OPTIONS: ${bad.join(', ')}` : ''}`);
  }
  await get(`/opportunities/search?location_id=${ghl.locationId}&pipeline_id=${ghl.pipelineId}&limit=1`);
  console.log('Opportunity search OK. Contacts write scope is verified on the first real submission.');
  process.exit(0);
}
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  if (mode === 'check' || mode === 'migrate') {
    await db.query('begin');
    try {
      const file = process.argv[3] ?? 'supabase/migrations/0012_lead_funnels.sql';
      const [, version, name] = file.match(/(\d{4})_([a-z0-9_]+)\.sql$/) ?? [];
      if (!version) throw new Error('Migration file must be named NNNN_name.sql');
      await db.query(readFileSync(file, 'utf8'));
      if (mode === 'migrate') {
        await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,array[]::text[])', [version, name]);
        await db.query('commit'); console.log(`Migration ${version} applied.`);
      } else { await db.query('rollback'); console.log('Migration validated; all changes rolled back.'); }
    } catch (error) { await db.query('rollback'); throw error; }
  } else if (mode === 'ghl-connect') {
    const ghl = ghlConfigSchema.parse(JSON.parse(readFileSync(process.argv[3], 'utf8')));
    const slug = process.argv[4];
    if (!ghl.tokenEnv) throw new Error('Set tokenEnv so the token stays in server env vars, not the database');
    const name = `GHL API · ${ghl.locationId}`;
    const { rows: [integration] } = await db.query(`insert into public.integrations(provider,name,status,health,is_enabled,config)
      values('ghl',$1,'connected','unknown',true,$2) on conflict(provider,name) do update set config=excluded.config,is_enabled=true,status='connected' returning id`, [name, ghl]);
    const { rowCount } = await db.query('update public.funnels set integration_id=$2 where slug=$1', [slug, integration.id]);
    if (!rowCount) throw new Error(`No funnel with slug ${slug}`);
    console.log(`Connected /estimate/${slug} to ${name} (integration ${integration.id}). New submissions are delivered to GHL.`);
  } else if (mode === 'unpublish') {
    const { rowCount } = await db.query('update public.funnels set published=false where slug=$1', [process.argv[3]]);
    if (!rowCount) throw new Error(`No funnel with slug ${process.argv[3]}`);
    console.log(`Unpublished /estimate/${process.argv[3]}. Its sessions and leads are kept.`);
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
    const contractorArg = demo ? null : process.argv[5];
    if (!slug || (!demo && !contractorArg)) throw new Error("Supply config JSON, slug, and an existing contractor UUID or 'house'");
    const contractor = contractorArg === 'house' ? null : contractorArg;
    const integration = demo || !process.argv[6] || process.argv[6] === 'none' ? null : process.argv[6];
    let vertical = null;
    if (!demo && process.argv[7]) {
      const found = await db.query('select id from public.verticals where id::text=$1 or slug=$1', [process.argv[7]]);
      if (!found.rows.length) throw new Error(`No vertical matches ${process.argv[7]}. Available: ${(await db.query('select slug from public.verticals order by slug')).rows.map(r => r.slug).join(', ')}`);
      vertical = found.rows[0].id;
    }
    const existing = await db.query('select id from public.funnels where slug=$1', [slug]);
    if (existing.rows.length) throw new Error('Slug already exists. Use the update command to change its config; publish never overwrites a funnel.');
    await db.query('insert into public.funnels(slug,contractor_id,integration_id,vertical_id,is_demo,published,config) values($1,$2,$3,$4,$5,true,$6)',
      [slug, contractor, integration, vertical, demo, config]);
    console.log(`Published /estimate/${slug}${demo ? ' (demo; no lead/CRM/booking writes)' : contractor ? '' : ' (HomeQuote inbox; assign leads from the Leads page)'}`);
  }
} finally { await db.end(); }
