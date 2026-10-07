/**
 * Read-only checks for migration 0041, written against a `query(sql) -> rows[]` function so the
 * SAME code runs (a) in the test suite against an in-process Postgres and (b) against the staging
 * database through scripts/staging/verify-0041.mjs. It never writes.
 */
const NEW_TABLES = ['workflow_graph_drafts', 'workflow_versions', 'workflow_waits', 'workflow_tasks', 'workflow_builder_access'];
const SERVICE_ONLY = ['workflow_wake_run', 'workflow_sweep_waits', 'workflow_satisfy_event_waits', 'wfg_publish_internal', 'workflow_assign_lead_user', 'claim_ai_call_jobs'];
const USER_FACING = ['wfg_create', 'wfg_save_draft', 'wfg_set_paused', 'wfg_archive', 'wfg_cancel_run', 'wfg_retry_run', 'wfg_complete_task'];
const list = (a) => a.map((x) => `'${x}'`).join(',');

export const CHECKS = [
  { id: 'schema.tables', kind: 'schema', title: 'new tables exist',
    sql: `select table_name from information_schema.tables where table_schema='public' and table_name in (${list(NEW_TABLES)})`,
    pass: (rows) => rows.length === NEW_TABLES.length, detail: (rows) => `${rows.length}/${NEW_TABLES.length} found` },
  { id: 'schema.columns', kind: 'schema', title: 'workflows has engine, graph_status, published_version, enroll_from, paused_at',
    sql: `select column_name from information_schema.columns where table_schema='public' and table_name='workflows' and column_name in ('engine','graph_status','published_version','enroll_from','paused_at')`,
    pass: (rows) => rows.length === 5, detail: (rows) => `${rows.length}/5 found` },
  { id: 'security.rls', kind: 'security', title: 'row level security is ON for every new table',
    sql: `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relname in (${list(NEW_TABLES)}) and not relrowsecurity`,
    pass: (rows) => rows.length === 0, detail: (rows) => (rows.length ? `RLS off: ${rows.map((r) => r.relname).join(', ')}` : 'all on') },
  { id: 'security.service_only', kind: 'security', title: 'service-only functions are NOT executable by anon/authenticated',
    sql: `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${list(SERVICE_ONLY)}) and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`,
    pass: (rows) => rows.length === 0, detail: (rows) => (rows.length ? `exposed: ${rows.map((r) => r.proname).join(', ')}` : 'none exposed') },
  { id: 'security.anon', kind: 'security', title: 'signed-out users cannot execute any builder function',
    sql: `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${list(USER_FACING)}) and has_function_privilege('anon', p.oid, 'execute')`,
    pass: (rows) => rows.length === 0, detail: (rows) => (rows.length ? `anon can run: ${rows.map((r) => r.proname).join(', ')}` : 'none') },
  { id: 'safety.global_calling_off', kind: 'safety', title: 'admin AI-calling switch is OFF (no call can be placed)',
    sql: `select enabled from public.ai_calling_settings where id`, pass: (rows) => rows.length === 1 && rows[0].enabled === false, detail: (rows) => `enabled=${rows[0]?.enabled}` },
  { id: 'safety.no_live_graph_workflows', kind: 'safety', title: 'no visual workflow is enabled yet',
    sql: `select id from public.workflows where engine='graph' and enabled`, pass: (rows) => rows.length === 0, detail: (rows) => `${rows.length} enabled` },
  { id: 'safety.no_contractor_can_dial', kind: 'safety', title: 'no contractor is in a calling mode with an agent configured',
    sql: `select contractor_id from public.ai_calling_contractor_settings where mode in ('automatic','workflow_only','manual_only') and coalesce(agent_id,'') <> ''`,
    pass: (rows) => rows.length === 0, detail: (rows) => `${rows.length} contractor(s) could be called for` },
  { id: 'compat.classic_untouched', kind: 'compat', title: 'every pre-existing workflow is still classic (engine=linear)',
    sql: `select count(*)::int as n from public.workflows where engine <> 'graph' and graph_status is not null`, pass: (rows) => rows[0].n === 0, detail: (rows) => `${rows[0].n} inconsistent` },
];

/** Runs every check; `skip` ids are reported as skipped (e.g. safety checks on a test database). */
export async function runChecks(query, { skip = [] } = {}) {
  const results = [];
  for (const c of CHECKS) {
    if (skip.includes(c.id)) { results.push({ id: c.id, kind: c.kind, title: c.title, status: 'skipped', detail: '' }); continue; }
    try {
      const rows = await query(c.sql);
      results.push({ id: c.id, kind: c.kind, title: c.title, status: c.pass(rows) ? 'pass' : 'FAIL', detail: c.detail(rows) });
    } catch (e) {
      results.push({ id: c.id, kind: c.kind, title: c.title, status: 'FAIL', detail: `query error: ${e.message}` });
    }
  }
  return results;
}
