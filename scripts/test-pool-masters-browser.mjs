// End-to-end QA for the Ethan / Pool Masters LA funnel (mobile + desktop).
// Creates a uniquely named fixture contractor + funnel, fakes calendly.com with a
// page that emits the real embed's `calendly.event_scheduled` message, and
// removes only this run's fixture rows in finally. No real Calendly/CRM calls.
//   node --env-file=.env.local scripts/test-pool-masters-browser.mjs
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdir, readFileSync } from 'node:fs';
import pg from 'pg';
import { chromium } from '@playwright/test';
import { funnelSchema } from '../lib/funnels/schema.ts';

const base = process.env.FUNNEL_TEST_BASE_URL ?? 'http://localhost:3017';
const ids = { contractor: randomUUID(), funnel: randomUUID() };
const slug = `qa-pool-masters-${ids.funnel.slice(0, 8)}`;
const calendly = 'https://calendly.com/qa-fixture/pool-consultation';
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
mkdir('.qa-screenshots', { recursive: true }, () => {});
const browser = await chromium.launch();
const results = [];
try {
  const config = funnelSchema.parse({ ...JSON.parse(readFileSync('content/funnels/clients/pool-masters-la.json', 'utf8')), calendarUrl: calendly });
  await db.query("insert into public.contractors(id,name) values($1,'HomeQuote automated QA fixture (Pool Masters)')", [ids.contractor]);
  await db.query('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [ids.funnel, slug, ids.contractor, config]);

  for (const [device, viewport, book] of [['mobile', { width: 390, height: 844 }, false], ['desktop', { width: 1440, height: 1000 }, true]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.location().url.startsWith('https://calendly.com')) errors.push(m.text()); });
    let calendlySrc = '';
    // Fake Calendly embed: shows the prefill it received and posts the same message the real embed sends.
    await page.route(`${calendly}**`, route => { calendlySrc = route.request().url(); return route.fulfill({ contentType: 'text/html', body: `<html><body style="font-family:sans-serif;padding:24px">
      <h2>Calendly QA fixture</h2><p id="who"></p><button id="book">Confirm 10:00am</button><script>
      const p = new URLSearchParams(location.search); document.getElementById('who').textContent = p.get('name') + ' · ' + p.get('email');
      document.getElementById('book').onclick = () => parent.postMessage({ event: 'calendly.event_scheduled', payload: {
        event: { uri: 'https://api.calendly.com/scheduled_events/qa-${device}-${ids.funnel.slice(0, 8)}' },
        invitee: { uri: 'https://api.calendly.com/scheduled_events/qa-${device}-${ids.funnel.slice(0, 8)}/invitees/inv-1' } } }, '*');
      </script></body></html>` }); });

    await page.goto(`${base}/estimate/${slug}?utm_source=facebook&utm_campaign=ethan-qa&fbclid=qa-${device}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => { const b = document.querySelector('.funnel-answer'); return b && !b.disabled; }, undefined, { timeout: 90000 });
    const labels = await page.locator('.funnel-answer').evaluateAll(els => els.map(e => e.querySelector('span:nth-child(2)').firstChild.textContent));
    assert.deepEqual(labels, ['Full Pool Build', 'Full Pool Remodel', 'Backyard Renovation', 'Pool Resurfacing / Replastering', 'Baja Shelf / Spa Addition', 'Tile & Coping', 'Decking / Pool Deck Renovation', 'Other Pool Project']);
    assert.equal(await page.locator('.funnel-answer-featured').count(), 3);
    assert.equal(await page.getByText('Equipment', { exact: false }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'horizontal overflow');
    await page.screenshot({ path: `.qa-screenshots/pool-masters-${device}-services.png`, fullPage: true });

    await page.getByRole('button', { name: /Full Pool Build/ }).click();
    await page.getByLabel('Project ZIP code').fill('91423');
    await page.getByRole('button', { name: 'Check my project' }).click();
    await page.getByRole('button', { name: /Yes, I own the home/ }).click();
    await page.getByRole('button', { name: /As soon as possible/ }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const email = `${slug}-${device}@example.test`;
    await page.getByLabel('First name', { exact: true }).fill('Qa');
    await page.getByLabel('Last name', { exact: true }).fill(device === 'mobile' ? 'Mobile' : 'Desktop');
    await page.getByLabel('Phone number').fill(device === 'mobile' ? '8185550141' : '8185550142');
    await page.getByLabel('Email address').fill(email);
    await page.locator('[name=consent]').check();
    await page.getByRole('button', { name: /Choose my estimate time/ }).click();
    await page.getByRole('heading', { name: 'Great — your project looks like a fit. Choose a time below for your free pool consultation.' }).waitFor();
    await page.frameLocator('iframe').locator('#book').waitFor();

    // Lead must already exist, assigned to the contractor, before any booking.
    const { rows: [saved] } = await db.query(`select s.id, s.booked_at, s.current_step, s.attribution, l.email, l.consent_source, a.contractor_id, a.status
      from public.funnel_sessions s join public.leads l on l.id=s.lead_id join public.lead_assignments a on a.id=s.assignment_id
      where s.funnel_id=$1 and l.email=$2`, [ids.funnel, email]);
    assert.ok(saved, 'lead saved before Calendly');
    assert.equal(saved.booked_at, null); assert.equal(saved.current_step, 'calendar');
    assert.equal(saved.contractor_id, ids.contractor); assert.equal(saved.consent_source, `funnel:${slug}`);
    // Migration 0016: only the HomeQuote team alert is queued; nobody else is emailed.
    const { rows: emails } = await db.query('select d.kind from public.lead_email_deliveries d join public.funnel_sessions s on s.lead_id=d.lead_id where s.id=$1', [saved.id]);
    assert.deepEqual(emails.map(e => e.kind), ['new_lead_alert']);
    assert.equal(saved.attribution.utm_campaign, 'ethan-qa'); assert.equal(saved.attribution.fbclid, `qa-${device}`);
    const src = new URL(calendlySrc);
    assert.equal(src.searchParams.get('name'), `Qa ${device === 'mobile' ? 'Mobile' : 'Desktop'}`);
    assert.equal(src.searchParams.get('email'), email);
    assert.equal(src.searchParams.get('utm_campaign'), 'ethan-qa');
    await page.screenshot({ path: `.qa-screenshots/pool-masters-${device}-calendly.png`, fullPage: true });

    let outcome;
    if (book) {
      await page.frameLocator('iframe').locator('#book').click();
      await page.getByRole('heading', { name: 'You’re on the calendar.' }).waitFor();
      const { rows: [booked] } = await db.query(`select s.booked_at, a.status, (select count(*) from public.appointments ap where ap.assignment_id=a.id)::int as appointments
        from public.funnel_sessions s join public.lead_assignments a on a.id=s.assignment_id where s.id=$1`, [saved.id]);
      assert.ok(booked.booked_at); assert.equal(booked.status, 'appointment_set'); assert.equal(booked.appointments, 1);
      await page.screenshot({ path: `.qa-screenshots/pool-masters-${device}-booked.png`, fullPage: true });
      outcome = 'booked';
    } else {
      // Abandon Calendly: reload, still on the booking step, lead still saved and not booked.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /Choose a time below/ }).waitFor();
      assert.equal(new URL(calendlySrc).searchParams.get('email'), email, 'prefill survives refresh');
      const { rows: [still] } = await db.query('select booked_at, lead_id from public.funnel_sessions where id=$1', [saved.id]);
      assert.equal(still.booked_at, null); assert.ok(still.lead_id);
      outcome = 'abandoned (saved, not booked)';
    }
    assert.deepEqual(errors, []);
    results.push({ device, serviceOrder: 'pass', leadSavedBeforeCalendly: 'pass', prefill: 'pass', outcome, consoleErrors: 0 });
    await context.close();
  }

  // The general HomeQuote form is unchanged: original options, no featured cards.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/estimate/pool-remodeling`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('button', { name: /Equipment Upgrade/ }).waitFor();
  assert.equal(await page.locator('.funnel-answer-featured').count(), 0);
  assert.equal(await page.getByRole('button', { name: /Full Pool Build/ }).count(), 0);
  results.push({ generalForm: 'unchanged' });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await db.query('begin');
  try {
    const sessions = (await db.query('select id, lead_id from public.funnel_sessions where funnel_id=$1', [ids.funnel])).rows;
    await db.query('delete from public.funnel_bookings where session_id = any($1::uuid[])', [sessions.map(s => s.id)]);
    await db.query('delete from public.lead_intake_events where external_lead_id = any($1::text[])', [sessions.map(s => s.id)]);
    await db.query('delete from public.funnel_sessions where funnel_id=$1', [ids.funnel]);
    await db.query('delete from public.funnels where id=$1', [ids.funnel]);
    await db.query("delete from public.leads where id = any($1::uuid[]) and email like $2", [sessions.map(s => s.lead_id).filter(Boolean), `${slug}-%@example.test`]);
    await db.query('delete from public.contractors where id=$1', [ids.contractor]);
    await db.query('commit'); console.log('QA fixtures removed.');
  } catch (error) { await db.query('rollback'); throw error; }
  finally { await db.end(); }
}
