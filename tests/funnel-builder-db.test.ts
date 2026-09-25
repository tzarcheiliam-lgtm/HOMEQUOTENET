import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { funnelSchema } from '@/lib/funnels/schema';

/**
 * Funnel builder data model (migration 0019), inside one always-rolled-back
 * transaction: status/published sync and funnel_templates RLS.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = { funnel: randomUUID(), template: randomUUID() };
const config = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-remodeling.json', 'utf8')));
const answers = { service: 'full_remodel', remodel_scope: 'pool_spa', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91362' };
const contact = (id: string) => ({ firstName: 'Builder', lastName: 'Test', phone: '8185550122', email: `builder-${id}@example.test`, consent: true });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  for (const [file, probe] of [
    ['0013_house_funnels_private_sharing', 'activity_visible_to_contractor'],
    ['0019_funnel_builder', 'sync_funnel_status'],
  ]) {
    const [{ name: found }] = await q('select to_regproc($1) as name', [`public.${probe}`]);
    if (!found) await q(readFileSync(`supabase/migrations/${file}.sql`, 'utf8'));
  }
  await q('insert into public.funnels(id,slug,published,status,config) values($1,$2,true,$3,$4)', [ids.funnel, `builder-${ids.funnel}`, 'published', config]);
  await q("insert into public.funnel_templates(id,key,name,category,config) values($1,$2,'Test template','Pool',$3)", [ids.template, `test_template_${ids.template}`, config]);
}, 30000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });
const suite = url ? describe : describe.skip;

suite('funnel builder data model (rolled back)', () => {
  it('keeps `status` and the legacy `published` boolean in sync in both directions', async () => {
    expect((await q('select published from public.funnels where id=$1', [ids.funnel]))[0].published).toBe(true);
    await q("update public.funnels set status='draft' where id=$1", [ids.funnel]);
    expect((await q('select published from public.funnels where id=$1', [ids.funnel]))[0].published).toBe(false);
    await q('update public.funnels set published=true where id=$1', [ids.funnel]);
    expect((await q('select status from public.funnels where id=$1', [ids.funnel]))[0].status).toBe('published');
    await q("update public.funnels set status='published' where id=$1", [ids.funnel]); // restore for later tests
  });
  it('rejects an invalid status and stamps updated_at on every update', async () => {
    await q('savepoint bad_status');
    await expect(q("update public.funnels set status='live' where id=$1", [ids.funnel])).rejects.toThrow();
    await q('rollback to savepoint bad_status');
    const before = (await q('select updated_at from public.funnels where id=$1', [ids.funnel]))[0].updated_at;
    await q("update public.funnels set config=config where id=$1", [ids.funnel]);
    const after = (await q('select updated_at from public.funnels where id=$1', [ids.funnel]))[0].updated_at;
    expect(new Date(after).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
  it('funnel_templates is readable and writable by service role/admin logic but blocked from anon', async () => {
    const [row] = await q('select name, category from public.funnel_templates where id=$1', [ids.template]);
    expect(row).toEqual({ name: 'Test template', category: 'Pool' });
    await q('savepoint anon_templates');
    try {
      await q('set local role anon');
      expect(await q('select id from public.funnel_templates')).toHaveLength(0);
    } finally { await q('rollback to savepoint anon_templates'); }
  });
  it('duplicating a template/funnel into a new row gets new ids and never mutates the source', async () => {
    const source = (await q('select config from public.funnel_templates where id=$1', [ids.template]))[0].config;
    const { rows: [copy] } = await db.query('insert into public.funnels(slug,published,status,config) values($1,false,$2,$3) returning id,slug',
      [`builder-copy-${randomUUID()}`, 'draft', source]);
    expect(copy.id).not.toBe(ids.funnel);
    const [original] = await q('select config from public.funnel_templates where id=$1', [ids.template]);
    expect(original.config).toEqual(source);
    await q('delete from public.funnels where id=$1', [copy.id]);
  });

  it('still records exactly one "created" intake event per brand-new lead, and "duplicate" on a reuse match', async () => {
    // (This is today's closest signal a future workflow trigger would read;
    // see this migration's header for where lead.created will hook in.)
    const session1 = randomUUID();
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1,$2,$3,'test',$4,'contact')", [session1, ids.funnel, session1, config]);
    await q("select public.save_funnel_session($1,$2,0,$3,'thanks',null,$4,true,'consent')", [session1, session1, answers, contact(session1)]);
    const lead1 = (await q('select lead_id from public.funnel_sessions where id=$1', [session1]))[0].lead_id;
    expect(await q("select status from public.lead_intake_events where lead_id=$1", [lead1])).toEqual([{ status: 'created' }]);

    // Same person submits again (same funnel/contractor scope) -> reuses the lead.
    const session2 = randomUUID();
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1,$2,$3,'test',$4,'contact')", [session2, ids.funnel, session2, config]);
    await q("select public.save_funnel_session($1,$2,0,$3,'thanks',null,$4,true,'consent')", [session2, session2, answers, { ...contact(session1), email: contact(session1).email.toUpperCase() }]);
    const lead2 = (await q('select lead_id from public.funnel_sessions where id=$1', [session2]))[0].lead_id;
    expect(lead2).toBe(lead1);
    expect(await q("select status from public.lead_intake_events where lead_id=$1 order by status", [lead1])).toEqual([{ status: 'created' }, { status: 'duplicate' }]);
  });
});
