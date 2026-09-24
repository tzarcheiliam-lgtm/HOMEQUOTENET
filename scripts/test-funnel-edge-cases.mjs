import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { chromium } from '@playwright/test';
import { funnelSchema } from '../lib/funnels/schema.ts';

const base = process.env.FUNNEL_TEST_BASE_URL ?? 'http://localhost:3017';
const id = randomUUID(); const slug = `qa-edge-${id}`;
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect(); const browser = await chromium.launch();
try {
  const config = funnelSchema.parse({ ...JSON.parse(readFileSync('content/funnels/pool-demo.json', 'utf8')), unqualifiedAction: 'stop' });
  await db.query('insert into public.funnels(id,slug,is_demo,published,config) values($1,$2,true,true,$3)', [id, slug, config]);
  const context = await browser.newContext(); const endpoint = `${base}/api/funnels/${slug}/session`;
  const headers = { Origin: base };
  const start = await context.request.post(endpoint, { headers, data: { url: `${base}/estimate/${slug}?utm_source=instagram`, referrer: '', device: 'mobile' } });
  assert.equal(start.status(), 200); let { session } = await start.json();
  const patch = data => context.request.patch(endpoint, { headers, data: { version: session.version, ...data } });
  assert.equal((await patch({ step: 'contact' })).status(), 422);
  assert.equal((await patch({ answer: { question: 'service', value: 'forged' } })).status(), 422);
  const first = await patch({ answer: { question: 'service', value: 'full_remodel' } }); session = (await first.json()).session;
  assert.equal((await context.request.patch(endpoint, { headers, data: { version: 0, answer: { question: 'remodel_scope', value: 'pool_spa' } } })).status(), 409);
  // A mid-session config edit must not alter the existing session's rules.
  await db.query('update public.funnels set config=$1 where id=$2', [{ ...config, unqualifiedAction: 'review' }, id]);
  assert.equal((await (await context.request.get(endpoint)).json()).config.unqualifiedAction, 'stop');
  for (const [question, value] of [['remodel_scope', 'pool_spa'], ['timeline', 'researching'], ['budget', 'budget_under_10k'], ['homeowner', 'no'], ['zip', '10001']]) {
    const result = await patch({ answer: { question, value } }); assert.equal(result.status(), 200); session = (await result.json()).session;
  }
  assert.equal(session.qualified, false); assert.equal((await patch({ step: 'contact' })).status(), 422);
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/estimate/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('We’re unable to offer an estimate for these details right now.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.getByLabel('Project ZIP code').waitFor();
  assert.equal(await page.getByLabel('Project ZIP code').inputValue(), '10001'); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ skipAndInvalidAnswers: 'blocked', staleTab: 'blocked', configSnapshot: 'preserved', unqualifiedStop: 'pass', correctionNavigation: 'pass', consoleErrors: errors.length }));
} finally {
  await browser.close();
  await db.query('delete from public.funnel_sessions where funnel_id=$1', [id]);
  await db.query('delete from public.funnels where id=$1', [id]); await db.end();
  console.log('Synthetic edge-case fixture removed.');
}
