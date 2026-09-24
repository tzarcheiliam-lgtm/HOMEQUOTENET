// Controlled full-stack test. Creates uniquely named fixtures and removes only
// those exact UUIDs in finally. Never sends to an external CRM/calendar.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { funnelSchema } from '../lib/funnels/schema.ts';

const base = process.env.FUNNEL_TEST_BASE_URL ?? 'http://localhost:3017';
const ids = { contractor: randomUUID(), funnel: randomUUID(), integration: randomUUID() };
const slug = `qa-${ids.funnel}`;
const secret = randomUUID();
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const browser = await chromium.launch();
let leadId;
try {
  const config = funnelSchema.parse({ ...JSON.parse(readFileSync('content/funnels/pool-demo.json', 'utf8')),
    clientName: 'HomeQuote QA fixture', calendarId: 'qa-calendar', calendarUrl: 'https://calendar.example.test/booking',
  });
  await db.query("insert into public.contractors(id,name) values($1,'HomeQuote automated QA fixture')", [ids.contractor]);
  await db.query("insert into public.integrations(id,name,provider,is_enabled,secret) values($1,$2,'ghl',true,$3)", [ids.integration, slug, secret]);
  // Integration is attached only after submission so this fixture never drains
  // the live outbound queue or sends to any external service.
  await db.query('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [ids.funnel, slug, ids.contractor, config]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.route('https://calendar.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="font-family:sans-serif;padding:24px"><h2>Test calendar</h2><p>Controlled embed fixture. No appointment is booked here.</p></body></html>' }));
  await page.goto(`${base}/estimate/${slug}?utm_source=facebook&fbclid=qa-booking`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /Full Pool Remodel/ }).click();
  await page.getByRole('button', { name: /Pool and spa/ }).click();
  await page.getByRole('button', { name: /As soon as possible/ }).click();
  await page.getByRole('button', { name: /\$25,000–\$50,000/ }).click();
  await page.getByRole('button', { name: /Yes, I own the home/ }).click();
  await page.getByLabel('Project ZIP code').fill('91301');
  await page.getByRole('button', { name: 'Check my project' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('First name', { exact: true }).fill('Synthetic');
  await page.getByLabel('Last name', { exact: true }).fill('Test');
  await page.getByLabel('Phone number').fill('8185550199');
  await page.getByLabel('Email address').fill(`${slug}@example.test`);
  await page.locator('[name=consent]').check();
  await page.getByRole('button', { name: 'Choose my estimate time' }).click();
  await page.getByRole('heading', { name: 'Choose a time for your free estimate' }).waitFor();
  await page.frameLocator('iframe').getByRole('heading', { name: 'Test calendar' }).waitFor();
  const endpoint = `${base}/api/funnels/${slug}/session`;
  const { session } = await (await context.request.get(endpoint)).json();
  assert.equal(session.booked_at, null);
  assert.ok((await page.locator('iframe').getAttribute('src')).includes(`hqn_session_id=${session.id}`));
  const [stored] = (await db.query('select lead_id,assignment_id from public.funnel_sessions where id=$1', [session.id])).rows;
  leadId = stored.lead_id; assert.ok(leadId); assert.ok(stored.assignment_id);
  const [assignment] = (await db.query('select contractor_id from public.lead_assignments where id=$1', [stored.assignment_id])).rows;
  assert.equal(assignment.contractor_id, ids.contractor);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Choose a time for your free estimate' }).waitFor();
  const anonymous = await browser.newContext();
  assert.equal((await anonymous.request.get(endpoint)).status(), 401);
  const forged = await context.request.patch(endpoint, { headers: { Origin: 'https://attacker.example' }, data: { version: session.version, step: 'service' } });
  assert.equal(forged.status(), 403);
  await db.query('update public.funnels set integration_id=$1 where id=$2', [ids.integration, ids.funnel]);
  const bookingUrl = `${base}/api/funnels/${slug}/booking`;
  const payload = { sessionId: session.id, appointmentId: `qa-${randomUUID()}`, calendarId: 'qa-calendar', scheduledAt: '2026-10-01T14:00:00-07:00' };
  assert.equal((await context.request.post(bookingUrl, { data: payload })).status(), 401);
  const booked = await context.request.post(bookingUrl, { headers: { Authorization: `Bearer ${secret}` }, data: payload });
  assert.equal(booked.status(), 200);
  assert.equal((await context.request.post(bookingUrl, { headers: { Authorization: `Bearer ${secret}` }, data: payload })).status(), 200);
  await page.getByRole('heading', { name: 'You’re on the calendar.' }).waitFor({ timeout: 20000 });
  assert.equal((await db.query('select id from public.funnel_bookings where session_id=$1', [session.id])).rows.length, 1);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '.qa-screenshots/funnel-booking-confirmed.png', fullPage: true });
  // Admin analytics authorization and rendering, using an existing admin account.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: users } = await admin.from('profiles').select('email').eq('role', 'admin').eq('is_active', true).limit(1);
  if (!users?.[0]) throw new Error('No active administrator available for analytics QA');
  const { data: link, error: authError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: users[0].email });
  if (authError) throw authError;
  const callback = new URL('/auth/callback', base);
  callback.searchParams.set('token_hash', link.properties.hashed_token); callback.searchParams.set('type', 'magiclink'); callback.searchParams.set('next', '/app/funnels');
  await page.goto(callback.toString(), { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Lead funnels', exact: true }).waitFor();
  await page.screenshot({ path: '.qa-screenshots/funnel-admin-report.png', fullPage: true });
  console.log(JSON.stringify({ realContactRoute: 'pass', leadAndClientAssignment: 'pass', embeddedCalendar: 'pass (controlled fixture)', refresh: 'pass', unauthorizedAccess: 'blocked', forgedBooking: 'blocked', verifiedBookingAndReplay: 'pass', adminAnalytics: 'pass', funnelConsoleErrors: errors.length }));
} finally {
  await browser.close();
  // Restrict cleanup to this script's generated IDs, including partially failed runs.
  const sessions = (await db.query('select lead_id from public.funnel_sessions where funnel_id=$1', [ids.funnel])).rows;
  leadId ??= sessions.find(s => s.lead_id)?.lead_id;
  await db.query('begin');
  try {
    await db.query('delete from public.funnel_bookings where integration_id=$1', [ids.integration]);
    await db.query('delete from public.lead_intake_events where external_lead_id in (select id::text from public.funnel_sessions where funnel_id=$1)', [ids.funnel]);
    await db.query('delete from public.funnel_sessions where funnel_id=$1', [ids.funnel]);
    await db.query('delete from public.funnels where id=$1', [ids.funnel]);
    if (leadId) await db.query('delete from public.leads where id=$1 and email=$2', [leadId, `${slug}@example.test`]);
    await db.query('delete from public.contractors where id=$1', [ids.contractor]);
    await db.query('delete from public.integrations where id=$1', [ids.integration]);
    await db.query('commit'); console.log('Synthetic integration fixtures removed.');
  } catch (error) { await db.query('rollback'); throw error; }
  finally { await db.end(); }
}
