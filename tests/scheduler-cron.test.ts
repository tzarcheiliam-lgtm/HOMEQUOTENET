import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';

/**
 * Migration 0074: Supabase Cron calls the scheduler endpoints with the Bearer secret from Vault.
 * Runs against PGlite with every migration applied (cron / net / vault are stubbed in the helper).
 */
let db: PGlite;
const requests = async () =>
  (await db.query<{ url: string; headers: Record<string, string>; timeout_milliseconds: number }>(
    'select url, headers, timeout_milliseconds from net.http_request_queue order by id',
  )).rows;

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
}, 120_000);

describe('scheduler_tick (Supabase Cron → tick endpoints)', () => {
  it('schedules the four ticks plus history cleanup', async () => {
    const { rows } = await db.query<{ jobname: string; schedule: string }>(`select jobname, schedule from cron.job where jobname like 'hq-%' order by jobname`);
    expect(rows).toEqual([
      { jobname: 'hq-ai-calling-tick', schedule: '2-59/5 * * * *' },
      { jobname: 'hq-cron-history-cleanup', schedule: '43 3 * * *' },
      { jobname: 'hq-meta-studio-tick', schedule: '17 * * * *' },
      { jobname: 'hq-meta-tick', schedule: '1-59/5 * * * *' },
      { jobname: 'hq-workflow-tick', schedule: '*/5 * * * *' },
    ]);
  });

  it('is a no-op until the secret is in Vault', async () => {
    const { rows } = await db.query<{ r: string | null }>(`select public.scheduler_tick('workflow_tick') as r`);
    expect(rows[0].r).toBeNull();
    expect(await requests()).toEqual([]);
  });

  it('POSTs to the production route with the Bearer secret, and logs the request', async () => {
    await db.exec(`insert into vault.secrets values ('scheduler_workflow_tick_secret', 'wf-secret'), ('scheduler_meta_tick_secret', 'meta-secret')`);
    await db.query(`select public.scheduler_tick('workflow_tick')`);
    await db.query(`select public.scheduler_tick('meta_studio_tick')`);
    const sent = await requests();
    expect(sent.map((r) => r.url)).toEqual(['https://homequotenet.com/api/workflows/tick', 'https://homequotenet.com/api/meta/studio-tick']);
    expect(sent[0].headers.Authorization).toBe('Bearer wf-secret');
    expect(sent[1].headers.Authorization).toBe('Bearer meta-secret'); // Studio tick shares META_TICK_SECRET
    expect(sent.map((r) => r.timeout_milliseconds)).toEqual([90000, 150000]);
    const { rows } = await db.query<{ job: string }>('select job from public.scheduler_requests order by id');
    expect(rows.map((r) => r.job)).toEqual(['workflow_tick', 'meta_studio_tick']);
  });

  it('honours a base URL override and rejects unknown jobs', async () => {
    await db.exec(`insert into vault.secrets values ('scheduler_base_url', 'https://staging.example.com/')`);
    await db.query(`select public.scheduler_tick('workflow_tick')`);
    expect((await requests()).at(-1)?.url).toBe('https://staging.example.com/api/workflows/tick');
    await expect(db.query(`select public.scheduler_tick('nope')`)).rejects.toThrow(/unknown scheduler job/);
  });

  it('cannot be called or read through the API roles', async () => {
    const { rows } = await db.query<Record<string, boolean>>(`select
      has_function_privilege('anon', 'public.scheduler_tick(text)', 'execute') as anon_exec,
      has_function_privilege('authenticated', 'public.scheduler_tick(text)', 'execute') as auth_exec,
      has_table_privilege('authenticated', 'public.scheduler_requests', 'select') as auth_read,
      has_table_privilege('anon', 'public.scheduler_status', 'select') as anon_view`);
    expect(rows[0]).toEqual({ anon_exec: false, auth_exec: false, auth_read: false, anon_view: false });
  });
});
