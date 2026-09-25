/**
 * Read-only workflow health check (Phase 5 operations prep).
 *
 *   node scripts/workflow-health.mjs            human-readable report
 *   node scripts/workflow-health.mjs --json     machine-readable
 *
 * Reads SUPABASE_DB_URL (never printed). Runs inside a READ ONLY transaction:
 * it cannot change anything. Prints counts, ids, codes and timestamps only —
 * never names, phone numbers, emails or message bodies.
 *
 * Exit code: 0 healthy / tables not applied, 1 critical findings, 2 error.
 * Only uses columns from migration 0020 (Phase 1); checks that need later
 * columns are skipped when those columns do not exist.
 */
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const THRESH = {
  staleLeaseMinutes: 5,      // 'running' with an expired lease this long = crashed worker nobody reclaimed
  overdueWaitMinutes: 10,    // waiting/pending past resume_at = scheduler not running
  eventBacklogMinutes: 15,   // undispatched event this old = dispatcher down or poison event
  eventAttempts: 5,          // dispatch attempts at/over this = poison event
};

export const CHECKS = [
  {
    key: 'poison_events', severity: 'critical',
    title: 'Events retried repeatedly without dispatching (poison or stuck)',
    sql: `select id, type, dispatch_status, dispatch_attempts, recorded_at, left(coalesce(last_error,''),120) as last_error
          from public.workflow_events
          where dispatch_status in ('pending','dispatching','failed') and dispatch_attempts >= ${THRESH.eventAttempts}
          order by recorded_at limit 50`,
  },
  {
    key: 'event_backlog', severity: 'warning',
    title: 'Undispatched events older than the backlog threshold',
    sql: `select type, dispatch_status, count(*)::int as n, min(recorded_at) as oldest
          from public.workflow_events
          where dispatch_status in ('pending','dispatching','failed') and recorded_at < now() - interval '${THRESH.eventBacklogMinutes} minutes'
          group by 1,2 order by 3 desc`,
  },
  {
    key: 'stuck_running', severity: 'critical',
    title: 'Runs stuck in running with an expired lease',
    sql: `select id, workflow_id, contractor_id, current_step_key, locked_by, locked_until
          from public.workflow_runs
          where status = 'running' and (locked_until is null or locked_until < now() - interval '${THRESH.staleLeaseMinutes} minutes')
          order by locked_until nulls first limit 50`,
  },
  {
    key: 'overdue_runs', severity: 'critical',
    title: 'Pending/waiting runs past their resume time (scheduler not running?)',
    sql: `select status, count(*)::int as n, min(coalesce(resume_at, created_at)) as oldest_due
          from public.workflow_runs
          where status in ('pending','waiting') and coalesce(resume_at, created_at) < now() - interval '${THRESH.overdueWaitMinutes} minutes'
          group by 1`,
  },
  {
    key: 'overdue_retries', severity: 'warning',
    title: 'Step retries past next_retry_at',
    sql: `select id, run_id, step_key, action_type, attempt_count, max_attempts, next_retry_at
          from public.workflow_step_runs
          where status = 'retry_scheduled' and next_retry_at < now() - interval '${THRESH.overdueWaitMinutes} minutes'
          order by next_retry_at limit 50`,
  },
  {
    key: 'orphaned_step_runs', severity: 'critical',
    title: 'Non-terminal step runs whose run already finished',
    sql: `select s.id, s.run_id, s.step_key, s.status as step_status, r.status as run_status
          from public.workflow_step_runs s join public.workflow_runs r on r.id = s.run_id
          where s.status in ('pending','running','waiting','retry_scheduled') and r.status in ('completed','failed','cancelled')
          limit 50`,
  },
  {
    key: 'failed_runs_24h', severity: 'info',
    title: 'Failed runs in the last 24h by workflow and error code',
    sql: `select workflow_id, contractor_id, coalesce(last_error->>'code','(none)') as code, count(*)::int as n
          from public.workflow_runs
          where status = 'failed' and failed_at > now() - interval '24 hours'
          group by 1,2,3 order by 4 desc limit 50`,
  },
  {
    key: 'failed_steps_24h', severity: 'info',
    title: 'Failed/exhausted steps in the last 24h by action and error code',
    sql: `select action_type, failure_kind, coalesce(last_error->>'code','(none)') as code,
                 count(*) filter (where last_error->'details'->>'retries_exhausted' = 'true')::int as exhausted,
                 count(*)::int as n
          from public.workflow_step_runs
          where status = 'failed' and updated_at > now() - interval '24 hours'
          group by 1,2,3 order by 5 desc limit 50`,
  },
  {
    key: 'enabled_workflows_without_activity', severity: 'info',
    title: 'Enabled workflows with no run in 7 days',
    sql: `select w.id, w.contractor_id, w.trigger_type, w.updated_at
          from public.workflows w
          where w.enabled and w.archived_at is null
            and not exists (select 1 from public.workflow_runs r where r.workflow_id = w.id and r.created_at > now() - interval '7 days')
          order by w.updated_at limit 50`,
  },
  {
    key: 'summary_24h', severity: 'info',
    title: 'Run status counts, last 24h',
    sql: `select status, count(*)::int as n from public.workflow_runs where created_at > now() - interval '24 hours' group by 1 order by 1`,
  },
  {
    key: 'workflow_email_failures', severity: 'warning', requires: ['lead_email_deliveries', 'workflow_step_run_id'],
    title: 'Workflow emails failed or out of attempts (Gmail outbox)',
    sql: `select status, count(*)::int as n, max(attempts) as max_attempts, min(created_at) as oldest
          from public.lead_email_deliveries
          where workflow_step_run_id is not null and status in ('failed','sending','pending') and created_at < now() - interval '15 minutes'
          group by 1`,
  },
];

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2`, [table, column]);
  return rows.length > 0;
}

/** Runs every check on an open client. Caller owns the transaction. */
export async function runHealthChecks(client) {
  const { rows: [applied] } = await client.query(`select to_regclass('public.workflow_runs') is not null as ok`);
  if (!applied.ok) return { applied: false, results: [] };
  const results = [];
  for (const check of CHECKS) {
    if (check.requires && !(await columnExists(client, check.requires[0], check.requires[1]))) {
      results.push({ key: check.key, severity: check.severity, title: check.title, skipped: 'column not present yet', rows: [] });
      continue;
    }
    const { rows } = await client.query(check.sql);
    results.push({ key: check.key, severity: check.severity, title: check.title, rows });
  }
  return { applied: true, results };
}

export function criticalCount(report) {
  return report.results.filter((r) => r.severity === 'critical' && r.rows.length > 0).length;
}

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) { console.error('SUPABASE_DB_URL not set'); process.exit(2); }
  const json = process.argv.includes('--json');
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin transaction read only');
    const report = await runHealthChecks(client);
    await client.query('rollback');
    if (json) { console.log(JSON.stringify(report, null, 2)); }
    else if (!report.applied) { console.log('Workflow tables are not applied in this database (migration 0020+). Nothing to check.'); }
    else {
      for (const r of report.results) {
        const flag = r.skipped ? 'SKIP' : r.rows.length === 0 ? 'ok  ' : r.severity === 'critical' ? 'CRIT' : r.severity === 'warning' ? 'WARN' : 'info';
        console.log(`[${flag}] ${r.title}${r.skipped ? ` (${r.skipped})` : ` — ${r.rows.length} row(s)`}`);
        if (!r.skipped && r.rows.length) console.table(r.rows.slice(0, 20));
      }
    }
    process.exitCode = report.applied && criticalCount(report) > 0 ? 1 : 0;
  } catch (e) {
    console.error(`workflow health check failed: ${e.message}`);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
