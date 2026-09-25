// Seeds funnel_templates from the JSON configs already in the repo, so the
// funnel builder's "Create funnel -> Start from" list has real starting
// points on day one. Idempotent: upserts by `key`, safe to re-run after
// editing a source file.
//   node --env-file=.env.local scripts/seed-funnel-templates.mjs
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';
import { funnelSchema } from '../lib/funnels/schema.ts';

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

function load(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  // Client-specific placeholders read oddly as a template starting point;
  // the builder's Routing/Service-area panels are exactly where an admin fills these in.
  if (raw.clientName?.startsWith('REPLACE_WITH_')) raw.clientName = 'New client';
  if (raw.serviceArea?.label?.startsWith('REPLACE_WITH_')) raw.serviceArea.label = 'Set your service area';
  return funnelSchema.parse(raw);
}

const templates = [
  { key: 'pool_remodeling', name: 'Pool Remodeling', category: 'Pool', path: 'content/funnels/pool-remodeling.json', description: 'The published HomeQuote house pool funnel: Full Remodel/Resurfacing branches, LA & Ventura County.' },
  ...readdirSync('content/funnels/templates').filter(f => f.endsWith('.json')).map(f => ({
    key: f.replace('.json', '').replace(/-/g, '_'),
    name: f.replace('.json', '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    category: 'Home improvement',
    path: `content/funnels/templates/${f}`,
    description: null,
  })),
];

try {
  for (const t of templates) {
    const config = load(t.path);
    await db.query(`insert into public.funnel_templates(key,name,category,description,config) values($1,$2,$3,$4,$5)
      on conflict(key) do update set name=excluded.name, category=excluded.category, description=excluded.description, config=excluded.config`,
      [t.key, t.name, t.category, t.description, config]);
    console.log(`Seeded template: ${t.name}`);
  }
} finally { await db.end(); }
