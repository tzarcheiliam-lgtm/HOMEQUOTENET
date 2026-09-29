/**
 * Migration 0031 against the real database, rolled back at the end.
 *
 * If the migration is not applied yet it is applied INSIDE the transaction
 * (validating every statement, trigger and policy without changing the shared
 * database). lock_timeout makes it fail fast instead of queueing behind live
 * traffic. Users are simulated the way PostgREST does: `set local role
 * authenticated` + request.jwt.claims.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;

const id = () => randomUUID();
const admin = id();
const userA = id();
const userB = id();
const contractor = id();
const lead = id();
const funnelLead = id();
const assignment = id();
const appointment = id();
const prospect = id();
const psa = id();

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-endpoint-aaaaaaaaaaaaaaaa';

async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await q('savepoint u');
  try {
    await q('set local role authenticated');
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const out = await fn();
    await q('reset role');
    await q('release savepoint u');
    return out;
  } catch (e) {
    await q('rollback to savepoint u');
    await q('reset role');
    throw e;
  }
}

async function refused(userId: string, sql: string, values: unknown[] = []): Promise<boolean> {
  try {
    await as(userId, () => q(sql, values));
    return false;
  } catch {
    return true;
  }
}

const events = (type: string, entity: string) =>
  q('select type, dedupe_key, contractor_id, payload from public.notification_events where type=$1 and entity_id=$2', [type, entity]);

beforeAll(async () => {
  if (!url) return;
  await db.connect();
  connected = true;
  await q('begin');
  await q("set local lock_timeout = '5s'");
  const [{ applied }] = await q("select to_regclass('public.notification_events') is not null as applied");
  if (!applied) await q(readFileSync('supabase/migrations/0031_push_notifications.sql', 'utf8'));
  const [{ routing }] = await q("select to_regclass('public.notification_routing_rules') is not null as routing");
  if (!routing) await q(readFileSync('supabase/migrations/0032_notification_routing.sql', 'utf8'));

  for (const [key, uid] of Object.entries({ admin, a: userA, b: userB })) {
    await q(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`,
      [uid, `${key}-${uid.slice(0, 6)}@push.test`]
    );
  }
  await q("update public.profiles set role='admin', is_active=true, account_status='active' where id=$1", [admin]);
  await q("update public.profiles set role='setter', is_active=true, account_status='active' where id=$1", [userA]);
  await q("update public.profiles set role='setter', is_active=true, account_status='active' where id=$1", [userB]);
  await q("insert into public.contractors(id,name) values($1,'Push test contractor')", [contractor]);
}, 60_000);

afterAll(async () => {
  if (connected) {
    await q('rollback');
    await db.end();
  }
});

const suite = url ? describe : describe.skip;

suite('push notifications migration (rolled back)', { timeout: 60_000 }, () => {
  it('queues new_lead for a manual lead and form_submission for a funnel lead', async () => {
    await q("insert into public.leads(id, first_name, city) values($1,'Manual','Encino')", [lead]);
    await q("insert into public.leads(id, first_name, consent_source) values($1,'Funnel','funnel:push-test-funnel')", [funnelLead]);
    expect(await events('new_lead', lead)).toHaveLength(1);
    expect(await events('form_submission', funnelLead)).toHaveLength(1);
    expect(await events('new_lead', funnelLead)).toHaveLength(0);
  });

  it('queues lead_assigned on assignment, appointment_booked on booking', async () => {
    await q('insert into public.lead_assignments(id, lead_id, contractor_id) values($1,$2,$3)', [assignment, lead, contractor]);
    const assigned = await events('lead_assigned', assignment);
    expect(assigned).toHaveLength(1);
    expect(assigned[0].contractor_id).toBe(contractor);

    await q("insert into public.appointments(id, assignment_id, scheduled_at) values($1,$2,'2026-10-01T18:00:00Z')", [appointment, assignment]);
    expect(await events('appointment_booked', appointment)).toHaveLength(1);
  });

  it('queues appointment_changed only when the time moves, and cancelled on cancel', async () => {
    await q("update public.appointments set notes='just a note' where id=$1", [appointment]);
    expect(await events('appointment_changed', appointment)).toHaveLength(0);

    await q("update public.appointments set scheduled_at='2026-10-02T19:00:00Z' where id=$1", [appointment]);
    const changed = await events('appointment_changed', appointment);
    expect(changed).toHaveLength(1);
    expect(changed[0].payload.previousScheduledAt).toBeTruthy();

    await q("update public.appointments set status='cancelled' where id=$1", [appointment]);
    expect(await events('appointment_cancelled', appointment)).toHaveLength(1);
  });

  it('queues prospect sales appointment events', async () => {
    await q("insert into public.contractor_prospects(id, company_name, assigned_to) values($1,'Push Test Pools',$2)", [prospect, userA]);
    await q("insert into public.prospect_sales_appointments(id, prospect_id, partner_id, scheduled_at) values($1,$2,$3,'2026-10-03T17:00:00Z')", [psa, prospect, userA]);
    expect(await events('appointment_booked', psa)).toHaveLength(1);
    await q("update public.prospect_sales_appointments set scheduled_at='2026-10-03T18:00:00Z' where id=$1", [psa]);
    expect(await events('appointment_changed', psa)).toHaveLength(1);
    await q("update public.prospect_sales_appointments set status='cancelled' where id=$1", [psa]);
    expect(await events('appointment_cancelled', psa)).toHaveLength(1);
  });

  it('queues a due callback exactly once and never a stale or do-not-call one', async () => {
    const due = id();
    const stale = id();
    const dnc = id();
    await q(
      `insert into public.contractor_prospects(id, company_name, assigned_to, next_callback_at) values
        ($1,'Due Pools',$4, now() - interval '5 minutes'),
        ($2,'Stale Pools',$4, now() - interval '2 days'),
        ($3,'DNC Pools',$4, now() - interval '5 minutes')`,
      [due, stale, dnc, userA]
    );
    await q("update public.contractor_prospects set disposition='do_not_call' where id=$1", [dnc]);

    const [{ n }] = await q('select public.enqueue_due_callbacks() as n');
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await events('callback_due', due)).toHaveLength(1);
    expect(await events('callback_due', stale)).toHaveLength(0);
    expect(await events('callback_due', dnc)).toHaveLength(0);

    await q('select public.enqueue_due_callbacks()');
    expect(await events('callback_due', due)).toHaveLength(1); // idempotent
  });

  it('claims each event once and stops after 5 attempts', async () => {
    const first = await q('select id from public.claim_notification_events(1000)');
    expect(first.length).toBeGreaterThan(0);
    expect(await q('select id from public.claim_notification_events(1000)')).toHaveLength(0);
    // Lease expiry makes them claimable again; attempts cap at 5.
    for (let i = 0; i < 6; i++) {
      await q("update public.notification_events set available_at = now() - interval '1 second' where processed_at is null");
      await q('select id from public.claim_notification_events(1000)');
    }
    await q("update public.notification_events set available_at = now() - interval '1 second' where processed_at is null");
    expect(await q('select id from public.claim_notification_events(1000)')).toHaveLength(0);
  });

  it('push_subscriptions: users see and manage only their own, endpoint is unique', async () => {
    await as(userA, () =>
      q("insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values($1,$2,'p256dh-key-aaaaaaaaaaaaaaaa','auth-key-aaaa')", [userA, ENDPOINT])
    );
    expect(await as(userA, () => q('select id from public.push_subscriptions'))).toHaveLength(1);
    expect(await as(userB, () => q('select id from public.push_subscriptions'))).toHaveLength(0);
    expect(await as(admin, () => q('select id from public.push_subscriptions where user_id=$1', [userA]))).toHaveLength(1);

    // B cannot subscribe as A, cannot claim A's endpoint, cannot edit or delete A's row.
    expect(await refused(userB, "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values($1,'https://fcm.googleapis.com/fcm/send/other-endpoint-bbbbbbbbbbbb','p256dh-key-bbbbbbbbbbbbbbbb','auth-key-bbbb')", [userA])).toBe(true);
    expect(await refused(userB, "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values($1,$2,'p256dh-key-bbbbbbbbbbbbbbbb','auth-key-bbbb')", [userB, ENDPOINT])).toBe(true);
    await as(userB, () => q("update public.push_subscriptions set enabled=false where user_id=$1", [userA]));
    await as(userB, () => q('delete from public.push_subscriptions where user_id=$1', [userA]));
    expect((await q('select enabled from public.push_subscriptions where user_id=$1', [userA]))[0]).toEqual({ enabled: true });

    // Non-https endpoints are refused by the table itself.
    expect(await refused(userA, "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values($1,'http://insecure.example/x-aaaaaaaaaaaaaaaaaaaaa','p256dh-key-cccccccccccccccc','auth-key-cccc')", [userA])).toBe(true);

    await as(userA, () => q('delete from public.push_subscriptions where user_id=$1', [userA]));
    expect(await q('select id from public.push_subscriptions where user_id=$1', [userA])).toHaveLength(0);
  });

  it('notification_preferences: own row only', async () => {
    await as(userA, () => q('insert into public.notification_preferences(user_id, lead_assigned) values($1,false)', [userA]));
    expect((await as(userA, () => q('select lead_assigned, appointment_booked, enabled from public.notification_preferences')))[0]).toEqual({
      lead_assigned: false,
      appointment_booked: true,
      enabled: true,
    });
    expect(await as(userB, () => q('select user_id from public.notification_preferences'))).toHaveLength(0);
    expect(await refused(userB, 'insert into public.notification_preferences(user_id) values($1)', [userA])).toBe(true);
    await as(userB, () => q('update public.notification_preferences set enabled=false where user_id=$1', [userA]));
    expect((await q('select enabled from public.notification_preferences where user_id=$1', [userA]))[0].enabled).toBe(true);
  });

  it('notifications: readable by the owner only, only read_at is writable, nothing insertable', async () => {
    const n = id();
    await q("insert into public.notifications(id, user_id, type, title, url) values($1,$2,'lead_assigned','Hello','/app/leads/x')", [n, userA]);

    expect(await as(userA, () => q('select id from public.notifications'))).toHaveLength(1);
    expect(await as(userB, () => q('select id from public.notifications'))).toHaveLength(0);
    expect(await as(admin, () => q('select id from public.notifications where user_id=$1', [userA]))).toHaveLength(0);

    await as(userA, () => q('update public.notifications set read_at=now() where id=$1', [n]));
    expect((await q('select read_at from public.notifications where id=$1', [n]))[0].read_at).not.toBeNull();

    expect(await refused(userA, "update public.notifications set title='pwned' where id=$1", [n])).toBe(true);
    expect(await refused(userA, "update public.notifications set url='/app/x' where id=$1", [n])).toBe(true);
    expect(await refused(userA, "insert into public.notifications(user_id, type, title) values($1,'lead_assigned','forged')", [userA])).toBe(true);
    // No delete policy: the statement is a silent no-op under RLS, the row survives.
    await as(userA, () => q('delete from public.notifications where id=$1', [n]));
    expect(await q('select id from public.notifications where id=$1', [n])).toHaveLength(1);

    // The table rejects any URL that is not an internal /app path.
    await q('savepoint bad_url');
    await expect(q("insert into public.notifications(user_id, type, title, url) values($1,'x','y','https://evil.example')", [userA])).rejects.toThrow();
    await q('rollback to savepoint bad_url');
    await q('savepoint bad_url2');
    await expect(q("insert into public.notifications(user_id, type, title, url) values($1,'x','y','//evil.example')", [userA])).rejects.toThrow();
    await q('rollback to savepoint bad_url2');
  });

  it('outbox, logs and claim functions are unreachable for signed-in users', async () => {
    expect(await refused(userA, 'select * from public.notification_events')).toBe(true);
    expect(await refused(admin, 'select * from public.notification_events')).toBe(true);
    expect(await refused(userA, 'select * from public.claim_notification_events(1)')).toBe(true);
    expect(await refused(userA, 'select public.enqueue_due_callbacks()')).toBe(true);
    await q("insert into public.push_notification_logs(user_id, type, status) values($1,'lead_assigned','sent')", [userA]);
    expect(await as(userA, () => q('select id from public.push_notification_logs'))).toHaveLength(0);
    expect((await as(admin, () => q('select id from public.push_notification_logs'))).length).toBeGreaterThan(0);
  });

  it('notification_routing_rules: admins only, type-checked, capped', async () => {
    await as(admin, () => q("insert into public.notification_routing_rules(type, admins, specific_user_ids) values('new_lead', true, $1)", [[userA]]));
    expect(await as(admin, () => q('select type from public.notification_routing_rules'))).toHaveLength(1);
    for (const u of [userA, userB]) {
      expect(await as(u, () => q('select type from public.notification_routing_rules'))).toHaveLength(0);
      expect(await refused(u, "insert into public.notification_routing_rules(type, admins) values('lead_assigned', true)")).toBe(true);
      await as(u, () => q("update public.notification_routing_rules set admins=false where type='new_lead'"));
      await as(u, () => q("delete from public.notification_routing_rules where type='new_lead'"));
    }
    expect((await q("select admins from public.notification_routing_rules where type='new_lead'"))[0].admins).toBe(true);
    expect(await refused(admin, "insert into public.notification_routing_rules(type) values('not_a_type')")).toBe(true);
  });
});
