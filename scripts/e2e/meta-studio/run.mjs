// End-to-end walkthrough of the Meta Ads Studio in a REAL browser against the REAL Next.js app, in an isolated environment:
//   - Supabase stand-in over an in-process Postgres with every real migration + real RLS     (supabase-shim.mjs)
//   - fake Meta Graph server that is strict about documented fields and injects failures     (fake-graph.mjs)
//   - all outbound traffic other than localhost is blocked inside the app                      (preload-fetch.cjs)
// Nothing here contacts Meta, your Supabase project, or any other service. It proves HQN behaviour end to end; it does NOT
// prove real Meta accepts the same requests.
//
// Usage: node scripts/e2e/meta-studio/run.mjs            (env E2E_OUT=dir for screenshots/report, E2E_ONLY=phaseA|phaseB)
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';
import { startShim, ANON_KEY, SERVICE_KEY, TEST_PASSWORD } from './supabase-shim.mjs';
import { startFakeGraph, READ_TOKEN, WRITE_TOKEN } from './fake-graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)).replace(/^\/([A-Za-z]:)/, '$1');
const root = path.resolve(here, '../../..');
const OUT = process.env.E2E_OUT ?? path.join(root, '.e2e-out');
mkdirSync(OUT, { recursive: true });
const APP_PORT = 3100, SHIM_PORT = 54321, GRAPH_PORT = 54400;
const APP = `http://localhost:${APP_PORT}`;
const TICK_SECRET = 'tick-secret-e2e-0123456789';

// ---------------------------------------------------------------------------------------------------------------------
const results = [];
let currentPhase = '';
async function step(name, fn, page) {
  const t0 = Date.now();
  try { await fn(); results.push({ phase: currentPhase, name, ok: true, ms: Date.now() - t0 }); console.log(`  ok   ${name}`); }
  catch (e) {
    const shot = page ? path.join(OUT, `FAIL-${results.length}-${name.replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.png`) : null;
    if (page) await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({ phase: currentPhase, name, ok: false, error: String(e.message ?? e).split('\n').slice(0, 6).join(' | '), shot });
    console.log(`  FAIL ${name}\n       ${String(e.message ?? e).split('\n').slice(0, 4).join('\n       ')}`);
  }
}
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg ?? 'not equal'}: expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const truthy = (v, msg) => { if (!v) throw new Error(msg ?? 'expected truthy'); };

// ---- media fixtures -----------------------------------------------------------------------------------------------------
const table = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const chunk = (type, data) => Buffer.concat([u32(data.length), Buffer.from(type, 'latin1'), data, u32(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])))]);
function png(w, h, seed = 0) {
  const row = Buffer.alloc(w + 1); const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { row.fill(0); row[1] = (y + seed) & 255; row[2] = seed & 255; row.copy(raw, y * (w + 1)); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.concat([u32(w), u32(h), Buffer.from([8, 0, 0, 0, 0])])), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const box = (type, ...p) => { const body = Buffer.concat(p); return Buffer.concat([u32(8 + body.length), Buffer.from(type, 'latin1'), body]); };
function mp4(seconds, w, h) {
  const mvhd = box('mvhd', Buffer.concat([u32(0), u32(0), u32(0), u32(1000), u32(seconds * 1000), Buffer.alloc(80)]));
  const tkhd = Buffer.concat([u32(0), u32(0), u32(0), u32(1), u32(0), u32(seconds * 1000), Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(36), u32(w * 65536), u32(h * 65536)]);
  return Buffer.concat([box('ftyp', Buffer.from('isom', 'latin1'), u32(0)), box('mdat', Buffer.alloc(2000)), box('moov', mvhd, box('trak', box('tkhd', tkhd)))]);
}

// ---- app server -------------------------------------------------------------------------------------------------------------
const serverLog = [];
async function startApp(extraEnv = {}) {
  const env = {
    ...process.env, PORT: String(APP_PORT), NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${SHIM_PORT}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    NEXT_PUBLIC_SITE_URL: APP, META_MARKETING_ACCESS_TOKEN: READ_TOKEN, META_TICK_SECRET: TICK_SECRET, HQN_REPORTING_TIMEZONE: 'America/Los_Angeles',
    E2E_FAKE_GRAPH_URL: `http://127.0.0.1:${GRAPH_PORT}`, NODE_OPTIONS: `--require ${path.join(here, 'preload-fetch.cjs').replace(/\\/g, '/')}`,
    META_ADS_WRITE_TOKEN: '', META_CONVERSIONS_API_TOKEN: '', META_APP_ID: '', META_APP_SECRET: '', ...extraEnv,
  };
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '-p', String(APP_PORT)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const redactLog = (t) => t.split(READ_TOKEN).join('[redacted]').split(WRITE_TOKEN).join('[redacted]').split(SERVICE_KEY).join('[redacted]');
  const sink = (d) => { const t = d.toString(); serverLog.push(t); try { appendFileSync(path.join(OUT, 'server.stream.log'), redactLog(t)); } catch { /* ignore */ } };
  child.stdout.on('data', sink); child.stderr.on('data', sink);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try { const res = await fetch(`${APP}/sign-in`, { redirect: 'manual' }); if (res.status < 500) break; } catch { /* not up yet */ }
    if (child.exitCode !== null) throw new Error('next dev exited early:\n' + serverLog.join('').slice(-1500));
  }
  return { child, stop: () => new Promise((r) => { child.once('exit', r); child.kill('SIGTERM'); setTimeout(() => { child.kill('SIGKILL'); r(); }, 8000); }) };
}

// ---- page helpers --------------------------------------------------------------------------------------------------------------
async function newPage(browser, { mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile });
  ctx.setDefaultTimeout(60000); ctx.setDefaultNavigationTimeout(120000);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR|hydrat/i.test(m.text())) page.errors.push(`console: ${m.text().slice(0, 200)}`); });
  return page;
}
// Server-action forms fall back to a native GET submit if clicked before React hydrates (cold dev compile): wait for it.
const hydrated = (page) => page.waitForFunction(() => [...document.querySelectorAll('button, form, input, select, a')].some((e) => Object.keys(e).some((k) => k.startsWith('__reactProps') || k.startsWith('__reactFiber'))), null, { timeout: 120000 }).catch(() => {});
async function login(page, email) {
  await page.goto(`${APP}/sign-in`, { waitUntil: 'domcontentloaded' });
  await hydrated(page);
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((u) => u.pathname.startsWith('/app'), { timeout: 120000 });
}
// A select changed before its component hydrates is reset to React's initial value; confirm the choice stuck.
async function selectStable(loc, label) {
  const handle = await loc.elementHandle();
  await handle.evaluate(() => {}); // ensure attached
  await loc.page().waitForFunction((el) => Object.keys(el).some((k) => k.startsWith('__reactProps')), handle, { timeout: 120000 }); // THIS control hydrated
  for (let i = 0; i < 8; i++) {
    await loc.selectOption({ label });
    await new Promise((r) => setTimeout(r, 500));
    if ((await loc.evaluate((e) => e.options[e.selectedIndex]?.text)) === label) return;
  }
  throw new Error(`select did not keep "${label}"`);
}
const go = async (page, p) => { await page.goto(`${APP}${p}`, { waitUntil: 'domcontentloaded' }); await hydrated(page); };
const seen = async (page, re, timeout = 60000) => { await page.getByText(re).first().waitFor({ state: 'visible', timeout }); };
const hasNoOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const future = (days, hour = 9) => { const d = new Date(Date.now() + days * 86400000); d.setHours(hour, 0, 0, 0); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`; };

async function fillWizard(page, o) {
  await go(page, '/app/meta-ads/create/new');
  await page.locator('#w-name').fill(o.name);
  await page.selectOption('#w-con', { label: o.contractor });
  await page.selectOption('#w-acct', { label: 'E2E Pool Masters' });
  await page.selectOption('#w-page', { label: 'E2E Pool Masters Page' });
  if (o.instagram) await page.selectOption('#w-ig', { label: 'e2e_pools' });
  if (o.mode && o.mode !== 'new') { await page.selectOption('#w-mode', o.mode); await page.selectOption('#w-camp', { label: 'Existing Spring Campaign' }); if (o.mode === 'existing_adset') await page.selectOption('#w-set', { label: 'Existing Ad Set' }); }
  await page.selectOption('#w-form', { label: 'Free quote form' });
  await page.locator('#w-ba').fill(String(o.budget));
  if (o.probe) await page.getByRole('checkbox', { name: /budget-unit probe/i }).check();
  await page.locator('#w-s').fill(future(2)); await page.locator('#w-e').fill(future(32));
  await page.selectOption('#w-cr', { label: o.creative });
  await page.locator('#w-pt').fill(o.text ?? 'Free pool resurfacing quote this week');
  await page.locator('#w-h').fill(o.headline ?? 'Get your free quote');
  await page.locator('#w-d').fill('Local pool experts');
  await page.getByRole('button', { name: /save draft and review/i }).click();
  await page.waitForURL(/\/app\/meta-ads\/create\/[0-9a-f-]{36}$/, { timeout: 120000 });
  return page.url().split('/').pop();
}
const draftRow = async (s, id) => (await s.sql(`select status, confirmed_at, created_objects, last_error_message, meta_effective_status, idempotency_key from meta_ad_drafts where id=$1`, [id]))[0];
async function confirmDraft(page) { await page.locator('#confirm-draft').fill('CONFIRM'); await page.getByRole('button', { name: /^confirm$/i }).click(); await seen(page, /Creating in Meta is switched off|Create PAUSED objects in Meta|Retry: resume/i); }

// ---------------------------------------------------------------------------------------------------------------------
async function main() {
  const only = process.env.E2E_ONLY ?? '';
  const migrations = path.join(root, 'supabase/migrations');
  console.log('Starting isolated environment (real migrations on an in-process Postgres)...');
  const s = await startShim({ port: SHIM_PORT, migrationsDir: migrations });
  const fg = await startFakeGraph({ port: GRAPH_PORT });
  const adminId = await s.createUser({ email: 'admin@e2e.test', fullName: 'E2E Admin', role: 'admin' });
  const [pool] = await s.sql(`insert into contractors (name) values ('Pool Masters LA') returning id`);
  const [other] = await s.sql(`insert into contractors (name) values ('Other Roofing Co') returning id`);
  await s.createUser({ email: 'owner@e2e.test', fullName: 'Pool Owner', role: 'contractor', contractorId: pool.id, contractorRole: 'owner' });
  await s.createUser({ email: 'other@e2e.test', fullName: 'Other Owner', role: 'contractor', contractorId: other.id, contractorRole: 'owner' });
  const browser = await chromium.launch({ headless: true });
  let app = null;
  const ids = {};
  try {
    // =============================== PHASE A - no write token ===============================
    if (!only || only === 'phaseA') {
      currentPhase = 'A (reporting token only; writes cannot be configured)';
      console.log(`\n${currentPhase}`);
      app = await startApp();
      const page = await newPage(browser);
      await step('admin signs in through the real sign-in page', async () => { await login(page, 'admin@e2e.test'); }, page);

      await step('Meta Ads shows the section tabs for an admin', async () => {
        await go(page, '/app/meta-ads');
        for (const t of ['Overview & Campaigns', 'Creative Library', 'Create Ad', 'Audits & Recommendations', 'Optimization Rules', 'Activity & Settings']) await page.getByRole('link', { name: t }).first().waitFor();
      }, page);

      await step('Sync now imports the account via the READ token only', async () => {
        await go(page, '/app/meta-ads');
        await page.getByRole('button', { name: /sync now/i }).click();
        await seen(page, /Synced 1 account/i, 120000);
        const snap = await fg.snapshot();
        truthy(snap.requests.length > 3, 'no Graph requests recorded');
        eq([...new Set(snap.requests.map((r) => r.token))], ['read'], 'reporting sync must use only the read token');
        eq(snap.requests.some((r) => r.tokenInUrlOrBody), false, 'token must never travel in a URL or body');
        eq(snap.requests.some((r) => r.method === 'POST'), false, 'a reporting sync must never POST');
        eq((await s.sql(`select id from meta_ad_accounts`)).map((r) => r.id), ['act_100000000000001']);
      }, page);

      await step('Settings: write token shows as not set; nothing can be written', async () => {
        await go(page, '/app/meta-ads/settings');
        await seen(page, /Write token/);
        const li = page.locator('li', { hasText: 'Write token' });
        await li.locator('[aria-label="not set"]').waitFor();
        await seen(page, /META_ADS_WRITE_TOKEN/);
      }, page);

      await step('writes cannot be switched ON without the token (typed phrase is not enough)', async () => {
        await page.locator('#confirm-writes').fill('ENABLE META WRITES');
        await page.getByRole('button', { name: /turn live writes on/i }).click();
        await seen(page, /META_ADS_WRITE_TOKEN is not set on the server/i);
        eq((await s.sql(`select live_writes_enabled from meta_studio_settings`))[0].live_writes_enabled, false);
      }, page);

      await step('Discover imports Pages, Instagram, datasets, lead forms and live state (read token only)', async () => {
        await page.getByRole('button', { name: /discover pages/i }).click();
        await seen(page, /Found 1 Page\(s\), 1 Instagram account\(s\), 1 dataset\(s\), 1 Instant Form\(s\)/i, 120000);
        const kinds = (await s.sql(`select kind from meta_assets order by kind`)).map((r) => r.kind);
        eq(kinds, ['dataset', 'instagram', 'lead_form', 'page']);
        truthy((await s.sql(`select count(*)::int n from meta_object_state`))[0].n >= 4, 'live state not imported');
        const snap = await fg.snapshot(); eq([...new Set(snap.requests.map((r) => r.token))], ['read']);
      }, page);

      await step('mapping a Page and a dataset to a contractor is explicit and saved', async () => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        for (const label of ['E2E Pool Masters Page', 'E2E Pixel']) {
          const row = page.locator('form', { hasText: label }).first();
          await row.locator('select[name=contractor_id]').selectOption({ label: 'Pool Masters LA' });
          await row.getByRole('button', { name: 'Save' }).click();
          await row.getByText('Saved.').waitFor();
        }
        const rows = await s.sql(`select kind, contractor_id from meta_assets where kind in ('page','dataset')`);
        eq(rows.every((r) => r.contractor_id === pool.id), true, 'assets should be mapped to Pool Masters LA');
      }, page);

      await step('mapping the ad account on the existing Setup page', async () => {
        await go(page, '/app/meta-ads/setup');
        const f = page.locator('form', { hasText: 'E2E Pool Masters' }).filter({ has: page.locator('select[name=contractor_id]') }).first();
        await f.locator('select[name=contractor_id]').selectOption({ label: 'Pool Masters LA' });
        await f.getByRole('button', { name: 'Save' }).click(); await f.getByText('Saved.').waitFor();
        eq((await s.sql(`select contractor_id from meta_ad_accounts where id='act_100000000000001'`))[0].contractor_id, pool.id);
      }, page);

      // ---- creative library: uploads + validation
      const upload = async (name, mimeType, buffer, { label, tags = '' } = {}) => {
        await go(page, '/app/meta-ads/creatives');
        await page.setInputFiles('#cu-file', { name, mimeType, buffer });
        await page.locator('#cu-name').fill(label ?? name);
        await page.selectOption('#cu-contractor', { label: 'Pool Masters LA' });
        if (tags) await page.locator('#cu-tags').fill(tags);
        await page.getByRole('button', { name: /^upload$/i }).click();
      };
      await step('upload a valid image: validated from its real bytes, appears Ready', async () => {
        await upload('spring.png', 'image/png', png(1080, 1080, 1), { label: 'Spring pool PNG', tags: 'Spring, Pool' });
        await page.getByText('Spring pool PNG').first().waitFor({ timeout: 120000 });
        const r = (await s.sql(`select status, width, height, kind, tags, thumbnail_path from meta_creatives where name='Spring pool PNG'`))[0];
        eq([r.status, r.width, r.height, r.kind], ['ready', 1080, 1080, 'image']); eq(r.tags, ['spring', 'pool']); eq(r.thumbnail_path, null, 'images need no thumbnail slot');
        await page.getByText('Ready').first().waitFor();
        ids.creative = (await s.sql(`select id from meta_creatives where name='Spring pool PNG'`))[0].id;
      }, page);
      await step('a file that lies about its type is rejected, not trusted', async () => {
        await upload('fake.png', 'image/png', Buffer.from('<html><script>alert(1)</script></html>'.repeat(5)), { label: 'Disguised html' });
        await seen(page, /not a recognizable|contents are|could not read/i, 120000);
        eq((await s.sql(`select status from meta_creatives where name='Disguised html'`))[0].status, 'rejected');
      }, page);
      await step('an unsupported type is stopped with a clear message', async () => {
        await upload('anim.gif', 'image/gif', Buffer.from('GIF89a' + 'x'.repeat(100)), { label: 'A gif' });
        await seen(page, /Images must be JPG or PNG/i, 60000);
        eq((await s.sql(`select count(*)::int n from meta_creatives where name='A gif'`))[0].n, 0, 'nothing should be stored');
      }, page);
      await step('a low-resolution image is accepted WITH a visible warning', async () => {
        await upload('small.png', 'image/png', png(400, 300, 3), { label: 'Small pic' });
        await page.getByText('Small pic').first().waitFor({ timeout: 120000 });
        await seen(page, /Shortest side is 300px/i);
        eq((await s.sql(`select status from meta_creatives where name='Small pic'`))[0].status, 'ready');
      }, page);
      await step('the same file twice is flagged as a duplicate', async () => {
        await upload('spring-again.png', 'image/png', png(1080, 1080, 1), { label: 'Spring duplicate' });
        await seen(page, /already in the library/i, 120000);
      }, page);
      await step('a video is read from its container header; with no capturable cover frame it is flagged', async () => {
        await upload('clip.mp4', 'video/mp4', mp4(12, 1080, 1920), { label: 'Pool clip' });
        await page.getByText('Pool clip').first().waitFor({ timeout: 120000 });
        const r = (await s.sql(`select status, duration_seconds, width, height, thumbnail_path from meta_creatives where name='Pool clip'`))[0];
        eq([r.status, Number(r.duration_seconds), r.width, r.height], ['ready', 12, 1080, 1920]);
        eq(r.thumbnail_path, null, 'a missing cover frame must not be recorded as present');
      }, page);

      // ---- drafts while writes are impossible
      await step('wizard: build a budget-unit probe draft; review shows exact integers', async () => {
        ids.probe = await fillWizard(page, { name: 'Budget unit probe', contractor: 'Pool Masters LA', budget: 5, probe: true, creative: 'Spring pool PNG (image)', instagram: true });
        await seen(page, /What will be created/);
        await seen(page, /5\.00 USD daily/);
        const sent = page.locator('dd', { hasText: /^500$/ }); await sent.first().waitFor();
        await seen(page, /budget-unit probe/i);
        await seen(page, /Exact Meta requests/);
      }, page);
      await step('confirming records exactly what was shown; creating is blocked with every reason listed', async () => {
        await confirmDraft(page);
        await seen(page, /Setup required: META_ADS_WRITE_TOKEN is not set/);
        await seen(page, /Live writes are switched off/); await seen(page, /Writes are not enabled for this ad account/);
        await page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).isDisabled().then((d) => truthy(d, 'create must be disabled'));
        const d = await draftRow(s, ids.probe); truthy(d.confirmed_at, 'confirmation not recorded'); eq(d.status, 'ready');
        const snap = await fg.snapshot(); eq(snap.requests.filter((r) => r.method === 'POST').length, 0, 'nothing may be sent to Meta');
      }, page);
      await step('a normal (non-probe) budget is blocked until the unit check passes', async () => {
        const id = await fillWizard(page, { name: 'Real ad before unit check', contractor: 'Pool Masters LA', budget: 25, creative: 'Spring pool PNG (image)' });
        await seen(page, /Budget units are not verified for this ad account/i);
        eq(await page.locator('#confirm-draft').count() > 0, true);
        await page.getByRole('button', { name: /^confirm$/i }).isDisabled().then((d) => truthy(d, 'confirm must be disabled while errors exist'));
        ids.blocked = id;
      }, page);
      await step('video without a cover frame is blocked at review', async () => {
        const id = await fillWizard(page, { name: 'Video ad', contractor: 'Pool Masters LA', budget: 5, probe: true, creative: 'Pool clip (video)' });
        await seen(page, /has no thumbnail/i);
        ids.video = id;
      }, page);
      await step('a draft pointing at a Page the contractor does not own is refused (server-side check)', async () => {
        await s.sql(`insert into meta_ad_drafts (id, contractor_id, account_id, creative_id, name, config, idempotency_key) select gen_random_uuid(), contractor_id, account_id, creative_id, 'Forged page', jsonb_set(config, '{page_id}', '"5555555"'), 'forged-key-1' from meta_ad_drafts where id=$1`, [ids.probe]);
        const forged = (await s.sql(`select id from meta_ad_drafts where idempotency_key='forged-key-1'`))[0].id;
        await go(page, `/app/meta-ads/create/${forged}`);
        await seen(page, /not mapped to the selected contractor/i);
      }, page);
      await step('browser had no script errors on the Meta pages visited', async () => { eq(page.errors, [], 'browser errors'); }, page);

      // ---- tenant isolation
      await step('contractor owner (mobile): sees only their mapped data and no Studio pages', async () => {
        const mp = await newPage(browser, { mobile: true });
        await login(mp, 'owner@e2e.test');
        await go(mp, '/app/meta-ads'); await seen(mp, /Existing Spring Campaign/, 120000);
        eq(await mp.getByText('Budget unit probe').count(), 0);
        eq(await mp.getByRole('link', { name: 'Creative Library' }).count(), 0, 'Studio tabs must be hidden');
        for (const p of ['/app/meta-ads/settings', '/app/meta-ads/creatives', '/app/meta-ads/create', '/app/meta-ads/rules', '/app/meta-ads/audits']) {
          await go(mp, p); await mp.waitForURL((u) => !u.pathname.startsWith('/app/meta-ads/'), { timeout: 60000 }).catch(() => {});
          truthy(!new URL(mp.url()).pathname.startsWith(p), `contractor reached ${p}`);
        }
        eq(await hasNoOverflow(mp), true, 'no horizontal overflow on mobile');
        const direct = await s.sql(`select 1 from meta_studio_settings`); truthy(direct.length === 1);
        await mp.context().close();
      }, page);
      await step('a contractor with nothing mapped sees no campaigns', async () => {
        const op = await newPage(browser);
        await login(op, 'other@e2e.test');
        await go(op, '/app/meta-ads'); await op.waitForLoadState('networkidle').catch(() => {});
        eq(await op.getByText('Existing Spring Campaign').count(), 0); eq(await op.getByText('Costly Campaign').count(), 0);
        await op.context().close();
      }, page);
      await page.context().close();
      await app.stop(); app = null;
    }

    // =============================== PHASE B - write token present ===============================
    if (!only || only === 'phaseB') {
      currentPhase = 'B (write token present; all switches start OFF)';
      console.log(`\n${currentPhase}`);
      if (only === 'phaseB') { /* standalone: data must exist */ }
      app = await startApp({ META_ADS_WRITE_TOKEN: WRITE_TOKEN });
      const page = await newPage(browser);
      await step('admin signs in', async () => { await login(page, 'admin@e2e.test'); }, page);
      const gFrom = async () => (await fg.snapshot());

      await step('wrong phrase keeps live writes OFF; right phrase turns them ON; account switch is separate', async () => {
        await go(page, '/app/meta-ads/settings');
        await page.locator('#confirm-writes').fill('yes please');
        await page.getByRole('button', { name: /turn live writes on/i }).click();
        await seen(page, /Type ENABLE META WRITES to confirm/i);
        eq((await s.sql(`select live_writes_enabled from meta_studio_settings`))[0].live_writes_enabled, false);
        await page.locator('#confirm-writes').fill('ENABLE META WRITES');
        await page.getByRole('button', { name: /turn live writes on/i }).click();
        await seen(page, /Live writes are ON/i);
        const f = page.locator('form', { hasText: 'E2E Pool Masters' }).filter({ has: page.locator('input[name=writes_enabled]') }).first();
        await f.locator('input[name=writes_enabled]').check(); await f.getByRole('button', { name: 'Save' }).click(); await f.getByText('Saved.').waitFor();
        eq((await s.sql(`select writes_enabled from meta_account_controls where account_id='act_100000000000001'`))[0].writes_enabled, true);
      }, page);

      await step('creating the probe: PAUSED objects, write token only, documented fields only', async () => {
        await fg.control({ clearRequests: true });
        await go(page, `/app/meta-ads/create/${ids.probe}`);
        await page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click();
        await seen(page, /Created in Meta as PAUSED/i, 120000);
        const snap = await gFrom();
        const posts = snap.requests.filter((r) => r.method === 'POST');
        eq(posts.map((p) => p.path.split('/').pop()), ['adimages', 'campaigns', 'adsets', 'adcreatives', 'ads'], 'creation order');
        eq([...new Set(posts.map((p) => p.token))], ['write']); eq(snap.requests.some((r) => r.tokenInUrlOrBody), false);
        const mine = snap.objects.filter((o) => /HQN-/.test(o.name)); eq(mine.length, 4);
        eq(mine.every((o) => o.type === 'adcreatives' || o.body.status === 'PAUSED'), true, 'everything created PAUSED');
        const d = await draftRow(s, ids.probe); eq(d.status, 'created_paused'); eq(d.meta_effective_status, 'PAUSED');
        await seen(page, /Meta says this ad is PAUSED/i);
      }, page);

      await step('opening the same completed draft in two tabs cannot create twice', async () => {
        const id = await fillWizard(page, { name: 'Probe two', contractor: 'Pool Masters LA', budget: 4, probe: true, creative: 'Small pic (image)' });
        await confirmDraft(page);
        const second = await page.context().newPage(); await second.goto(`${APP}/app/meta-ads/create/${id}`, { waitUntil: 'domcontentloaded' });
        await second.getByRole('button', { name: /Create PAUSED objects in Meta/ }).waitFor();
        const before = (await gFrom()).objects.filter((o) => o.type === 'campaigns' && /HQN-/.test(o.name)).length;
        await Promise.all([page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click(), second.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click()]);
        await page.waitForTimeout(6000);
        const after = (await gFrom()).objects.filter((o) => o.type === 'campaigns' && /HQN-/.test(o.name)).length;
        eq(after - before, 1, 'exactly one campaign despite two simultaneous clicks');
        await second.close();
        eq((await draftRow(s, id)).status, 'created_paused');
        ids.probe2 = id;
      }, page);

      await step('budget-unit check: a mismatch keeps budgets blocked, an exact match unlocks them', async () => {
        await go(page, '/app/meta-ads/settings');
        const f = page.locator('form', { hasText: 'Budget unit check' }).first();
        await selectStable(f.locator('select[name=draft]'), 'Budget unit probe');
        await f.locator('input[name=observed]').fill('500.00'); await f.getByRole('button', { name: 'Record result' }).click();
        await seen(page, /MISMATCH/i);
        eq((await s.sql(`select budget_unit_verified_at from meta_account_controls where account_id='act_100000000000001'`))[0].budget_unit_verified_at, null);
        await f.locator('input[name=observed]').fill('5.00'); await f.getByRole('button', { name: 'Record result' }).click();
        await seen(page, /Confirmed: HQN sent 500/i);
        eq((await s.sql(`select budget_unit_currency from meta_account_controls where account_id='act_100000000000001'`))[0].budget_unit_currency, 'USD');
      }, page);

      await step('a real ad (25 USD) is now allowed; failure at the ad set leaves a partial result, retry resumes with no duplicates', async () => {
        const id = await fillWizard(page, { name: 'Spring pool leads', contractor: 'Pool Masters LA', budget: 25, creative: 'Spring pool PNG (image)', instagram: true });
        await seen(page, /25\.00 USD daily/); await seen(page, /Budget as sent to Meta/);
        eq(await page.getByText(/Budget units are not verified/i).count(), 0);
        await confirmDraft(page);
        await fg.control({ fail: { type: 'adsets', mode: 'reject' } });
        await page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click();
        await seen(page, /Stopped at "adset"/i, 120000);
        let d = await draftRow(s, id); eq(d.status, 'partial'); truthy(d.created_objects.campaign_id, 'campaign id should be remembered');
        await seen(page, /Already created in Meta \(paused\)/i);
        await page.getByRole('button', { name: /Retry: resume creating PAUSED objects/ }).click();
        await seen(page, /Created in Meta as PAUSED/i, 120000);
        d = await draftRow(s, id); eq(d.status, 'created_paused');
        const tag = 'HQN-' + d.idempotency_key.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
        const snap = await gFrom();
        eq(snap.objects.filter((o) => o.type === 'campaigns' && o.name.includes(tag)).length, 1, 'exactly one campaign');
        eq(snap.objects.filter((o) => o.type === 'adsets' && o.name.includes(tag)).length, 1);
        ids.real = id;
      }, page);

      await step('a timeout AFTER Meta created the campaign does not create a second one', async () => {
        const id = await fillWizard(page, { name: 'Timeout case', contractor: 'Pool Masters LA', budget: 10, creative: 'Spring pool PNG (image)' });
        await confirmDraft(page);
        await fg.control({ fail: { type: 'campaigns', mode: 'timeout_created' } });
        await page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click();
        await seen(page, /Created in Meta as PAUSED/i, 120000);
        const d = await draftRow(s, id); const tag = 'HQN-' + d.idempotency_key.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
        eq((await gFrom()).objects.filter((o) => o.type === 'campaigns' && o.name.includes(tag)).length, 1);
      }, page);

      await step('a request that was lost entirely is reported, then recovers on retry', async () => {
        const id = await fillWizard(page, { name: 'Lost request', contractor: 'Pool Masters LA', budget: 10, creative: 'Spring pool PNG (image)' });
        await confirmDraft(page);
        await fg.control({ fail: { type: 'campaigns', mode: 'timeout_lost' } });
        await page.getByRole('button', { name: /Create PAUSED objects in Meta/ }).click();
        await seen(page, /Stopped at "campaign"/i, 120000);
        await page.getByRole('button', { name: /Retry: resume creating PAUSED objects/ }).click();
        await seen(page, /Created in Meta as PAUSED/i, 120000);
        eq((await draftRow(s, id)).status, 'created_paused');
      }, page);

      await step('editing a confirmed draft clears the confirmation', async () => {
        const id = await fillWizard(page, { name: 'Edit me', contractor: 'Pool Masters LA', budget: 12, creative: 'Spring pool PNG (image)' });
        await confirmDraft(page);
        truthy((await draftRow(s, id)).confirmed_at);
        await page.getByRole('link', { name: 'Edit' }).click();
        await page.waitForURL(/create\/new\?draft=/);
        await page.locator('#w-h').waitFor();
        await page.locator('#w-h').fill('A new headline');
        await page.locator('#w-s').fill(future(3)); await page.locator('#w-e').fill(future(33));
        await page.getByRole('button', { name: /save draft and review/i }).click();
        await page.waitForURL(/create\/[0-9a-f-]{36}$/);
        const d = await draftRow(s, id); eq([d.status, d.confirmed_at], ['draft', null]);
        await seen(page, /A new headline/i).catch(() => {});
      }, page);

      // ---- audit -> proposal -> approve -> apply, with execution-time controls
      await step('thresholds are the owner’s; the audit then grades against them', async () => {
        await go(page, '/app/meta-ads/settings');
        await page.locator('#t-target_cost_per_lead').fill('10'); await page.locator('#t-min_spend_for_judgement').fill('100');
        await page.getByRole('button', { name: 'Save thresholds' }).click(); await seen(page, /Saved\. Blank fields mean/i);
        await go(page, '/app/meta-ads/audits');
        await page.selectOption('#a-acct', 'act_100000000000001');
        await page.getByRole('button', { name: 'Run audit' }).click();
        await page.waitForURL(/audits\/[0-9a-f-]{36}$/, { timeout: 120000 });
        await seen(page, /Findings needing attention/i);
        await seen(page, /Not assessed/);
        await seen(page, /Campaign over target: Costly Campaign/i);
        await seen(page, /Observation\./); await seen(page, /Why it matters\./); await seen(page, /Proposed action\./); await seen(page, /How to evaluate it\./); await seen(page, /Limitations\./);
        ids.audit = page.url().split('/').pop();
      }, page);

      await step('propose from a finding, approve it, and apply: re-read, then exactly one PAUSED write with the write token', async () => {
        await page.locator('div.rounded-lg.border', { hasText: 'Campaign over target: Costly Campaign' }).getByRole('button', { name: /create a proposal for review/i }).click();
        await seen(page, /Proposal created/i);
        await go(page, '/app/meta-ads/audits');
        const card = page.locator('div.rounded-lg.border', { hasText: 'Costly Campaign' }).first();
        await card.getByText(/status: ACTIVE/).first().waitFor(); await card.getByText(/status: PAUSED/).first().waitFor();
        await card.getByRole('button', { name: 'Approve' }).click(); await seen(page, /Approved\. It has not been applied yet/i);
        eq((await fg.snapshot()).objects.find((o) => o.id === '910000000000001').body.status, 'ACTIVE', 'approval alone must not change Meta');
        await fg.control({ clearRequests: true });
        await page.locator('div.rounded-lg.border', { hasText: 'Costly Campaign' }).first().getByRole('button', { name: 'Apply in Meta now' }).click();
        await seen(page, /Applied in Meta/i, 120000);
        const snap = await gFrom();
        const w = snap.requests.filter((r) => r.method === 'POST'); eq(w.map((r) => [r.path, r.token]), [['910000000000001', 'write']]);
        const read = snap.requests.find((r) => r.method === 'GET' && r.path === '910000000000001'); truthy(read && /account_id/.test(read.fields), 'live state + ownership must be re-read first');
        eq(snap.objects.find((o) => o.id === '910000000000001').body.status, 'PAUSED');
        const row = (await s.sql(`select status, previous_state, provider_result from meta_change_proposals where target_id='910000000000001'`))[0];
        eq(row.status, 'applied'); eq(row.previous_state.status, 'ACTIVE'); eq(row.provider_result.success, true);
        truthy((await s.sql(`select 1 from meta_activity_log where action='proposal.applied'`)).length >= 1, 'activity log entry');
      }, page);

      await step('execution-time gate: with live writes turned OFF after approval, Apply is refused and the proposal stays queued', async () => {
        await go(page, `/app/meta-ads/audits/${ids.audit}`);
        await page.locator('div.rounded-lg.border', { hasText: 'Campaign over target: Existing Spring Campaign' }).getByRole('button', { name: /create a proposal for review/i }).click();
        await seen(page, /Proposal created/i);
        await go(page, '/app/meta-ads/audits');
        const card = () => page.locator('div.rounded-lg.border', { hasText: 'Existing Spring Campaign' }).first();
        await card().getByRole('button', { name: 'Approve' }).click(); await seen(page, /Approved\. It has not been applied yet/i);
        await go(page, '/app/meta-ads/settings'); await page.getByRole('button', { name: /turn live writes off/i }).click(); await seen(page, /Live writes are OFF/i);
        await go(page, '/app/meta-ads/audits');
        await seen(page, /Applying is switched off/i);
        await card().getByRole('button', { name: 'Apply in Meta now' }).isDisabled().then((d) => truthy(d, 'apply must be disabled while writes are off'));
        eq((await s.sql(`select status from meta_change_proposals where target_id='900000000000001'`))[0].status, 'approved');
        // turn back ON for the next check
        await go(page, '/app/meta-ads/settings'); await page.locator('#confirm-writes').fill('ENABLE META WRITES'); await page.getByRole('button', { name: /turn live writes on/i }).click(); await seen(page, /Live writes are ON/i);
      }, page);

      await step('an Ads Manager edit after approval makes the proposal stale; nothing is written', async () => {
        await fg.control({ externalEdit: { id: '900000000000001', fields: { status: 'PAUSED' } }, clearRequests: true });
        await go(page, '/app/meta-ads/audits');
        await page.locator('div.rounded-lg.border', { hasText: 'Existing Spring Campaign' }).first().getByRole('button', { name: 'Apply in Meta now' }).click();
        await seen(page, /changed in Meta since this proposal was made/i, 120000);
        eq((await gFrom()).requests.filter((r) => r.method === 'POST').length, 0, 'no write may happen');
        eq((await s.sql(`select status from meta_change_proposals where target_id='900000000000001'`))[0].status, 'stale');
      }, page);

      // ---- rules
      await step('rules: created OFF; approval-mode rule is suspended until tracking is verified, then proposes', async () => {
        await fg.control({ reset: true }); await s.sql(`update meta_change_proposals set applied_at = now() - interval '30 days', created_at = now() - interval '30 days' where status = 'applied'`); await go(page, '/app/meta-ads/settings'); await page.getByRole('button', { name: /discover pages/i }).click(); await seen(page, /Found 1 Page/i, 120000);
        await go(page, '/app/meta-ads/rules');
        await page.locator('#r-name').fill('Pause costly leads'); await page.selectOption('#r-acct', 'act_100000000000001');
        await page.selectOption('#r-st', 'campaign'); await page.selectOption('#r-si', { label: 'Costly Campaign' });
        await page.selectOption('#r-mode', 'approval'); await page.selectOption('#r-act', 'pause'); await page.selectOption('#r-m', 'cost_per_meta_lead');
        await page.locator('#r-th').fill('10'); await page.locator('#r-ms').fill('100'); await page.locator('#r-mi').fill('1000');
        await page.getByRole('button', { name: /save rule/i }).click(); await seen(page, /Rule saved\. It is OFF/i);
        eq((await s.sql(`select enabled from meta_rules`))[0].enabled, false);
        await page.getByRole('button', { name: 'Enable' }).first().click(); await seen(page, /Enabled\./);
        await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /Evaluated 1 rule/i, 120000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await seen(page, /Conversion tracking has not been verified recently/i);
        eq((await s.sql(`select outcome from meta_rule_evaluations order by evaluated_at desc limit 1`))[0].outcome, 'suspended');
        await go(page, '/app/meta-ads/settings'); await page.getByRole('button', { name: /I checked conversion tracking/i }).click(); await seen(page, /Recorded\./);
        await go(page, '/app/meta-ads/rules'); await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /1 proposal/i, 120000);
        eq((await s.sql(`select status, change_type from meta_change_proposals where source_kind='rule'`))[0], { status: 'proposed', change_type: 'pause' });
        eq((await gFrom()).objects.find((o) => o.id === '910000000000001').body.status, 'ACTIVE', 'an approval-mode rule must not change Meta');
      }, page);

      await step('auto rule: needs a typed phrase, is suspended while HQN automation is stopped, and writes nothing', async () => {
        await s.sql(`delete from meta_change_proposals`); await s.sql(`update meta_rules set enabled=false`);
        await go(page, '/app/meta-ads/rules');
        await page.locator('#r-name').fill('Auto pause'); await page.selectOption('#r-acct', 'act_100000000000001'); await page.selectOption('#r-st', 'campaign'); await page.selectOption('#r-si', { label: 'Costly Campaign' });
        await page.selectOption('#r-mode', 'auto'); await page.selectOption('#r-act', 'pause'); await page.selectOption('#r-m', 'cost_per_meta_lead');
        await page.locator('#r-th').fill('10'); await page.locator('#r-ms').fill('100'); await page.locator('#r-mi').fill('1000');
        eq(await page.locator('#r-ex').evaluate((e) => e.required), true, 'an automatic rule must require an expiry date in the form itself');
        await page.locator('#r-ex').fill(future(30).slice(0, 10)); await page.getByRole('button', { name: /save rule/i }).click(); await seen(page, /Rule saved\. It is OFF/i);
        await page.reload({ waitUntil: 'domcontentloaded' });
        const card = page.locator('div', { hasText: 'Auto pause' }).filter({ has: page.getByRole('button', { name: 'Enable' }) }).last();
        await card.getByRole('button', { name: 'Enable' }).click(); await seen(page, /Type ENABLE AUTO/i);
        await card.locator('input[id^="auto-"]').fill('ENABLE AUTO'); await card.getByRole('button', { name: 'Enable' }).click(); await seen(page, /Enabled\. It can act only while/i);
        await fg.control({ clearRequests: true });
        await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /Evaluated/i, 120000);
        await page.reload({ waitUntil: 'domcontentloaded' }); await seen(page, /HQN automation is stopped globally/i);
        eq((await gFrom()).requests.filter((r) => r.method === 'POST').length, 0, 'a stopped automation must not write');
      }, page);

      await step('auto rule acts only after the global stop, account switch and writes are all ON - and then only pauses its own target', async () => {
        await go(page, '/app/meta-ads/settings');
        await page.locator('#confirm-automation').fill('START AUTOMATION'); await page.getByRole('button', { name: /release automation stop/i }).click(); await seen(page, /Global automation stop released/i);
        const f = page.locator('form', { hasText: 'E2E Pool Masters' }).filter({ has: page.locator('input[name=automation_enabled]') }).first();
        await f.locator('input[name=automation_enabled]').check(); await f.getByRole('button', { name: 'Save' }).click(); await f.getByText('Saved.').waitFor();
        await fg.control({ clearRequests: true });
        await go(page, '/app/meta-ads/rules'); await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /1 applied/i, 120000);
        const snap = await gFrom();
        const w = snap.requests.filter((r) => r.method === 'POST'); eq(w.map((r) => [r.path, r.token]), [['910000000000001', 'write']], 'exactly one write, on the rule’s own target');
        eq(snap.objects.find((o) => o.id === '900000000000001').body.status, 'ACTIVE', 'other campaigns untouched');
        const p = (await s.sql(`select status, change_type, approved_by, auto_approved_by_rule from meta_change_proposals where source_kind='rule' and status='applied'`))[0];
        eq([p.status, p.change_type, p.approved_by], ['applied', 'pause', null]); truthy(p.auto_approved_by_rule);
        truthy((await s.sql(`select 1 from meta_activity_log where actor_kind='rule' and action='proposal.applied'`)).length === 1, 'actor recorded as rule');
      }, page);

      await step('cooldown: a second evaluation makes no second change; pressing the global stop halts further action', async () => {
        await fg.control({ externalEdit: { id: '910000000000001', fields: { status: 'ACTIVE' } }, clearRequests: true });
        await go(page, '/app/meta-ads/rules'); await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /Evaluated/i, 120000);
        eq((await gFrom()).requests.filter((r) => r.method === 'POST').length, 0, 'cooldown/limit must prevent a second write');
        await go(page, '/app/meta-ads/settings'); await page.getByRole('button', { name: /stop hqn automation/i }).click(); await seen(page, /HQN automation is STOPPED/i);
        await s.sql(`update meta_change_proposals set applied_at = now() - interval '30 days'`);
        await go(page, '/app/meta-ads/rules'); await page.getByRole('button', { name: /evaluate rules now/i }).click(); await seen(page, /Evaluated/i, 120000);
        eq((await gFrom()).requests.filter((r) => r.method === 'POST').length, 0, 'stopped automation must not write even after the cooldown');
        eq((await gFrom()).objects.find((o) => o.id === '910000000000001').body.status, 'ACTIVE', 'stopping HQN automation never touches running ads');
      }, page);

      await step('scheduler endpoint: rejects without the secret, runs with it', async () => {
        eq((await fetch(`${APP}/api/meta/studio-tick`, { method: 'POST' })).status, 401);
        eq((await fetch(`${APP}/api/meta/studio-tick`, { method: 'POST', headers: { authorization: 'Bearer nope' } })).status, 401);
        const ok = await fetch(`${APP}/api/meta/studio-tick`, { method: 'POST', headers: { authorization: `Bearer ${TICK_SECRET}` } });
        eq(ok.status, 200); const body = await ok.json(); truthy('state' in body && 'rules' in body, 'tick should report state and rules');
      }, page);

      // ---- mobile + desktop pass over every Studio screen
      for (const mobile of [false, true]) {
        await step(`every Meta Ads screen renders without overflow or script errors (${mobile ? 'mobile 390px' : 'desktop 1280px'})`, async () => {
          const p = await newPage(browser, { mobile });
          await login(p, 'admin@e2e.test');
          const small = [];
          for (const route of ['/app/meta-ads', '/app/meta-ads/setup', '/app/meta-ads/creatives', '/app/meta-ads/create', '/app/meta-ads/create/new', `/app/meta-ads/create/${ids.real}`, '/app/meta-ads/audits', `/app/meta-ads/audits/${ids.audit}`, '/app/meta-ads/rules', '/app/meta-ads/settings']) {
            await go(p, route); await p.waitForLoadState('networkidle').catch(() => {});
            await p.screenshot({ path: path.join(OUT, `${mobile ? 'm' : 'd'}${route.replace(/[^a-z0-9]+/gi, '_')}.png`), fullPage: true });
            truthy(await hasNoOverflow(p), `horizontal overflow on ${route}`);
            if (mobile) {
              const tiny = await p.evaluate(() => [...document.querySelectorAll('main button, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), main select, main textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 36; }).map((e) => `${e.tagName.toLowerCase()}#${e.id || e.name || e.textContent?.trim().slice(0, 20)}`));
              if (tiny.length) small.push(`${route}: ${tiny.slice(0, 4).join(', ')}`);
            }
          }
          eq(p.errors, [], 'browser errors'); if (small.length) results.push({ phase: currentPhase, name: 'note: controls under 36px tall on mobile', ok: true, note: small.slice(0, 6) });
          await p.context().close();
        }, page);
      }

      await step('no credential appears in the application log', async () => {
        const log = serverLog.join('');
        for (const [n, t] of [['read token', READ_TOKEN], ['write token', WRITE_TOKEN], ['service key', SERVICE_KEY], ['tick secret', TICK_SECRET]]) eq(log.includes(t), false, `${n} leaked into the server log`);
      }, page);
      await step('no credential appears in any page the browser received', async () => {
        const p = await newPage(browser); await login(p, 'admin@e2e.test');
        for (const route of ['/app/meta-ads/settings', '/app/meta-ads/setup', `/app/meta-ads/create/${ids.real}`]) { await go(p, route); const html = await p.content(); for (const t of [READ_TOKEN, WRITE_TOKEN, SERVICE_KEY, TICK_SECRET]) eq(html.includes(t), false, `token in ${route}`); }
        await p.context().close();
      }, page);
      await page.context().close();
      await app.stop(); app = null;
    }
  } finally {
    if (app) await app.stop().catch(() => {});
    await browser.close().catch(() => {});
    await fg.close().catch(() => {}); await s.close().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  writeFileSync(path.join(OUT, 'server.log'), serverLog.join('').replace(new RegExp(`${READ_TOKEN}|${WRITE_TOKEN}|${SERVICE_KEY}`, 'g'), '[redacted]'));
  console.log(`\n${results.filter((r) => r.ok && !r.note).length} passed, ${failed.length} failed. Report: ${path.join(OUT, 'report.json')}`);
  for (const r of results.filter((x) => x.note)) console.log(`NOTE ${r.name}: ${JSON.stringify(r.note)}`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error('harness crashed:', e); process.exit(2); });
