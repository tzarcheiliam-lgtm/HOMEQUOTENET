import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { eventFromRow, type WorkflowEventRow } from '@/lib/workflows/events';

/**
 * Phase 5 emitter conformance + dispatch hardening, against the real database
 * inside one transaction that always rolls back (applies 0020 and 0024 there
 * if production doesn't have them yet).
 *
 * Every row the Phase 2 triggers emit must parse through the Phase 1
 * envelope (eventFromRow). This is the check that catches payload drift such
 * as stripped nullable keys (H1).
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;

const ids = { contractor: randomUUID(), lead: randomUUID(), assignment: randomUUID(), appointment: randomUUID(), estimate: randomUUID(), sale: randomUUID() };
let connected = false;

beforeAll(async () => {
  if (!url) return;
  await db.connect();
  connected = true;
  await q('begin');
  const [foundation] = await q("select to_regclass('public.workflow_runs') as t");
  if (!foundation.t) await q(readFileSync('supabase/migrations/0020_workflow_automation_foundation.sql', 'utf8'));
  // Install inside the rolled-back transaction only when the database doesn't
  // have it yet; re-applying to live tables from parallel test files deadlocks.
  const [{ applied: runtimeApplied }] = await q("select to_regproc('public.claim_workflow_events') is not null as applied");
  if (!runtimeApplied) await q(readFileSync('supabase/migrations/0024_workflow_runtime.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values($1,'Phase 5 conformance')", [ids.contractor]);
}, 60_000);

afterAll(async () => {
  if (connected) { await q('rollback'); await db.end(); }
});

const suite = url ? describe : describe.skip;

suite('Phase 5: emitter conformance and dispatch hardening (rolled back)', { timeout: 60_000 }, () => {
  it('every emitted event parses as a canonical Phase 1 envelope (incl. a funnel lead with no city/vertical)', async () => {
    // A funnel-shaped lead: no city, vertical or sub-service (H1 regression).
    await q("insert into public.leads(id,first_name,zip,source,consent_source) values($1,'Conformance','91436','website','funnel:phase5-test')", [ids.lead]);
    await q("update public.leads set status='contact_attempted' where id=$1", [ids.lead]);
    await q("update public.leads set qualification_status='qualified' where id=$1", [ids.lead]);
    await q('insert into public.lead_assignments(id,lead_id,contractor_id) values($1,$2,$3)', [ids.assignment, ids.lead, ids.contractor]);
    await q("update public.lead_assignments set status='contacted' where id=$1", [ids.assignment]);
    await q("insert into public.appointments(id,assignment_id,scheduled_at) values($1,$2,now()+interval '2 days')", [ids.appointment, ids.assignment]);
    await q("update public.appointments set status='no_show' where id=$1", [ids.appointment]);
    await q("insert into public.estimates(id,assignment_id,amount,status) values($1,$2,42000,'sent')", [ids.estimate, ids.assignment]);
    await q("insert into public.sales(id,assignment_id,amount,sale_status) values($1,$2,42000,'won')", [ids.sale, ids.assignment]);
    await q("update public.lead_assignments set status='lost' where id=$1", [ids.assignment]);

    const rows = await q('select * from public.workflow_events where lead_id=$1 order by recorded_at, type', [ids.lead]) as WorkflowEventRow[];
    const parsed = rows.map((row) => {
      try { return { type: row.type, ok: true as const, event: eventFromRow(row) }; }
      catch (e) { return { type: row.type, ok: false as const, error: (e as Error).message.slice(0, 300) }; }
    });
    expect(parsed.filter((p) => !p.ok)).toEqual([]);
    expect(rows.map((r) => r.type).sort()).toEqual([
      'appointment.booked', 'appointment.no_show', 'assignment.status_changed', 'assignment.status_changed',
      'deal.lost', 'deal.won', 'estimate.sent', 'lead.assigned', 'lead.created', 'lead.qualification_changed', 'lead.status_changed',
    ]);
    const created = parsed.find((p) => p.type === 'lead.created');
    expect(created?.ok && created.event.payload).toMatchObject({ city: null, verticalId: null, subServiceId: null, funnelSlug: 'phase5-test' });
    // Contractor-side facts carry the contractor tenant; lead-level ones stay HomeQuote-level here.
    for (const p of parsed) {
      if (!p.ok) continue;
      if (['lead.assigned', 'assignment.status_changed', 'appointment.booked', 'appointment.no_show', 'estimate.sent', 'deal.won', 'deal.lost'].includes(p.type)) {
        expect(p.event.contractorId).toBe(ids.contractor);
      }
    }
  });

  it('dead-letters events after 10 dispatch attempts instead of reclaiming them forever', async () => {
    const make = async (attempts: number) => {
      const lead = randomUUID();
      const [{ id }] = await q(
        "select public.emit_workflow_event('lead.created','lead.created|lead:'||$1,'lead',$1::uuid,'test:phase5',now(),null,null) as id", [lead]);
      await q("update public.workflow_events set dispatch_status='failed', dispatch_attempts=$2, available_at=now()-interval '1 minute' where id=$1", [id, attempts]);
      return id as string;
    };
    const dead = await make(10);
    const retry = await make(9);
    const claimed = (await q("select id from public.claim_workflow_events('test:phase5', 100, 60)")).map((r) => r.id);
    expect(claimed).toContain(retry);
    expect(claimed).not.toContain(dead);
    const [row] = await q('select dispatch_status, dispatch_attempts from public.workflow_events where id=$1', [dead]);
    expect(row).toEqual({ dispatch_status: 'failed', dispatch_attempts: 10 });
  });
});
