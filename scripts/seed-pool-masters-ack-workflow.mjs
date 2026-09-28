// Node 24: node --env-file=.env.local scripts/seed-pool-masters-ack-workflow.mjs
//
// One-time setup for the Pool Masters LA homeowner acknowledgment email
// (see HOMEQUOTE_CONTEXT.md §9/§10). Creates a workflow that:
//   trigger:    lead.created
//   conditions: event.payload.funnelSlug equals 'pool-masters-la' (belt and
//               suspenders alongside the contractor scope below, so this
//               workflow can never fire for any other funnel)
//   steps:      send_email to the lead, using the
//               'pool_masters_homeowner_request_received' template
//
// Reuses the existing workflow engine end-to-end: idempotency (three layers,
// see docs/workflow-automation-architecture.md), the Gmail outbox
// (lead_email_deliveries), and admin visibility (/app/workflows/[id]/runs).
// No new email system, no new migration.
//
// Idempotent: running this twice does not create a second workflow or a
// second template row.
//
// Prerequisite: run scripts/seed-email-templates.ts first so the
// 'pool_masters_homeowner_request_received' template exists.
//
// This writes directly to production tables (same pattern as
// `scripts/funnels.mjs publish`) because create_workflow_definition() is a
// SECURITY DEFINER RPC gated on an authenticated admin session
// (`is_admin()` via `auth.uid()`), which a service-role script never has.
// Run by a person with SUPABASE_DB_URL, not automation.

import pg from 'pg';

const TEMPLATE_KEY = 'pool_masters_homeowner_request_received';
const WORKFLOW_NAME = 'Pool Masters — Homeowner Request Received';

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  // Looked up by clientName, not a hardcoded slug: production's live funnel
  // is slug 'pool-masters' / clientName 'Pool Masters' (not '-la' /
  // 'Pool Masters LA' — that's only the local config filename).
  const { rows: funnels } = await db.query(`select id, slug, contractor_id from public.funnels where config->>'clientName' ilike 'Pool Masters%'`);
  if (funnels.length === 0) throw new Error(`No funnel with a clientName starting 'Pool Masters'. Publish it first (scripts/funnels.mjs publish).`);
  if (funnels.length > 1) throw new Error(`Multiple funnels match 'Pool Masters%' (${funnels.map(f => f.slug).join(', ')}); resolve which one manually before re-running.`);
  const [funnel] = funnels;
  const FUNNEL_SLUG = funnel.slug;

  const { rows: [template] } = await db.query('select id, is_active from public.email_templates where key = $1', [TEMPLATE_KEY]);
  if (!template) throw new Error(`Email template '${TEMPLATE_KEY}' not found. Run: node --import tsx scripts/seed-email-templates.ts`);
  if (!template.is_active) throw new Error(`Email template '${TEMPLATE_KEY}' exists but is inactive. Activate it in /app/email-templates first.`);

  const { rows: [existing] } = await db.query(
    'select id, enabled from public.workflows where name = $1 and contractor_id is not distinct from $2 and archived_at is null',
    [WORKFLOW_NAME, funnel.contractor_id]
  );
  if (existing) {
    console.log(`Workflow already exists (id ${existing.id}, enabled=${existing.enabled}). Nothing to do.`);
    if (!existing.enabled) console.log('It is currently disabled — enable it from /app/workflows if that was not intentional.');
    process.exit(0);
  }

  const conditions = {
    match: 'all',
    conditions: [{ field: 'event.payload.funnelSlug', operator: 'equals', value: FUNNEL_SLUG }],
  };
  const stepConfig = { to: { kind: 'lead' }, templateId: template.id };

  await db.query('begin');
  try {
    const { rows: [workflow] } = await db.query(
      `insert into public.workflows(contractor_id, name, description, is_template, template_key, source_template_id,
         trigger_type, trigger_config, conditions, exit_events, reentry_policy, enabled, version, created_by, updated_by)
       values($1, $2, $3, false, null, null, 'lead.created', '{}'::jsonb, $4::jsonb, '{}', 'once_per_event', true, 1, null, null)
       returning id`,
      [
        funnel.contractor_id,
        WORKFLOW_NAME,
        'Sends the homeowner a "request received" acknowledgment right after they submit the Pool Masters LA funnel. Not an appointment confirmation — only says an appointment is confirmed when the CRM actually has one.',
        JSON.stringify(conditions),
      ]
    );
    await db.query(
      `insert into public.workflow_steps(id, workflow_id, key, position, parent_step_id, branch, step_type, action_type, name, config, conditions)
       values(gen_random_uuid(), $1, 'send_ack_email', 0, null, null, 'action', 'send_email', 'Send homeowner acknowledgment', $2::jsonb, null)`,
      [workflow.id, JSON.stringify(stepConfig)]
    );
    await db.query('commit');
    console.log(`Created and enabled workflow '${WORKFLOW_NAME}' (id ${workflow.id}).`);
    console.log(`Scope: contractor_id=${funnel.contractor_id ?? '(house — none)'} AND event.payload.funnelSlug='${FUNNEL_SLUG}'.`);
    console.log(`Verify at /app/workflows, then submit a real test lead through /estimate/${FUNNEL_SLUG} and check /app/workflows/[id]/runs.`);
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
} finally {
  await db.end();
}
