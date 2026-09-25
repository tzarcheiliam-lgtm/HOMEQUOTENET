import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;

const contractor = randomUUID();
const lead = randomUUID();
const assignment = randomUUID();
let connected = false;

beforeAll(async () => {
  if (!url) return;
  await db.connect();
  connected = true;
  await q('begin');
  const [foundation] = await q("select to_regclass('public.workflow_runs') as table_name");
  if (!foundation.table_name) {
    await q(readFileSync('supabase/migrations/0020_workflow_automation_foundation.sql', 'utf8'));
  }
  // Applying inside the transaction validates every function, trigger and
  // referenced schema object without leaving the shared database changed.
  await q(readFileSync('supabase/migrations/0024_workflow_runtime.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values($1,'Workflow runtime test')", [contractor]);
}, 60_000);

afterAll(async () => {
  if (connected) {
    await q('rollback');
    await db.end();
  }
});

async function failure(sql: string, values: unknown[] = []) {
  await q('savepoint expected_failure');
  try {
    await q(sql, values);
    await q('release savepoint expected_failure');
    return null;
  } catch (error) {
    await q('rollback to savepoint expected_failure');
    return error as { code?: string; message: string };
  }
}

const suite = url ? describe : describe.skip;

suite('workflow Phase 2 runtime migration (rolled back)', { timeout: 60_000 }, () => {
  it('emits one canonical lead fact and rejects source-specific keys', async () => {
    await q("insert into public.leads(id,first_name,consent_source) values($1,'Runtime','funnel:missing-test-funnel')", [lead]);
    expect(await q("select type,idempotency_key from public.workflow_events where lead_id=$1 and type='lead.created'", [lead]))
      .toEqual([{ type: 'lead.created', idempotency_key: `lead.created|lead:${lead}` }]);

    const duplicate = await q("select public.emit_workflow_event('lead.created',$1,'lead',$2,'test:duplicate',now(),null,$2) as id", [`lead.created|lead:${lead}`, lead]);
    expect(duplicate[0].id).toBeTruthy();
    expect((await q("select count(*)::int as count from public.workflow_events where idempotency_key=$1", [`lead.created|lead:${lead}`]))[0].count).toBe(1);

    const error = await failure("select public.emit_workflow_event('lead.created',$1,'lead',$2,'test:bad')", [`lead.created|funnel:x|${lead}`, lead]);
    expect(error?.code).toBe('22023');
  });

  it('emits assignment and transition facts, then claims each event once', async () => {
    await q('insert into public.lead_assignments(id,lead_id,contractor_id) values($1,$2,$3)', [assignment, lead, contractor]);
    await q("update public.lead_assignments set status='lost' where id=$1", [assignment]);

    const types = (await q('select type from public.workflow_events where lead_id=$1 order by recorded_at', [lead])).map((row) => row.type);
    expect(types).toEqual(expect.arrayContaining(['lead.created', 'lead.assigned', 'assignment.status_changed', 'deal.lost']));

    const first = await q("select id from public.claim_workflow_events('runtime-test-worker',100,120)");
    const second = await q("select id from public.claim_workflow_events('runtime-test-worker-2',100,120)");
    expect(first.length).toBeGreaterThanOrEqual(4);
    expect(second).toHaveLength(0);
    expect(new Set(first.map((row) => row.id)).size).toBe(first.length);
  });

  it('keeps a promoted funnel booking as one appointment fact', async () => {
    const funnel = randomUUID();
    const session = randomUUID();
    const booking = randomUUID();
    const appointment = randomUUID();
    const scheduledAt = '2026-10-01T18:00:00.000Z';
    await q("insert into public.funnels(id,slug,contractor_id,config) values($1,$2,$3,'{}')", [funnel, `runtime-${funnel.slice(0, 8)}`, contractor]);
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step,lead_id) values($1,$2,$3,'test','{}','calendar',$4)", [session, funnel, `runtime-${session}`, lead]);
    await q("insert into public.funnel_bookings(id,integration_id,provider,external_id,session_id,appointment_id,scheduled_at) values($1,null,'calendly',$2,$3,null,$4)", [booking, `invitee-${booking}`, session, scheduledAt]);
    await q('insert into public.appointments(id,assignment_id,scheduled_at) values($1,$2,$3)', [appointment, assignment, scheduledAt]);
    await q('update public.funnel_bookings set appointment_id=$1 where id=$2', [appointment, booking]);

    expect(await q("select idempotency_key from public.workflow_events where lead_id=$1 and type='appointment.booked'", [lead]))
      .toEqual([{ idempotency_key: `appointment.booked|booking:calendly:invitee-${booking}` }]);
  });
});
