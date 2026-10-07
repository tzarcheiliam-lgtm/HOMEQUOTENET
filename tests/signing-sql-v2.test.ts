/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Migration 0040 (access codes, automatic reminders, templates) on top of 0039, in an in-process Postgres.
 * The checks that matter for security are done by the DATABASE here, not the app: a code-required request cannot
 * be signed without a verified code, locked requests stay locked, and browser roles see none of the secrets.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
let db: PGlite;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const one = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await q<T>(sql, p))[0];
let cA: string, cB: string, adminId: string;

async function asUser(role: 'admin' | 'contractor' | null, contractor: string | null, fn: () => Promise<void>) {
  await db.exec(`select set_config('app.role', '${role ?? ''}', false), set_config('app.contractor', '${contractor ?? ''}', false)`);
  await db.exec('set role authenticated');
  try { await fn(); } finally { await db.exec('reset role'); }
}

async function draft(contractor: string | null, opts: { n?: number; order?: 'sequential' | 'parallel' } = {}) {
  const n = opts.n ?? 1;
  const doc = (await one<{ id: string }>(`insert into signing_documents(contractor_id,title) values ($1,'Contract') returning id`, [contractor])).id;
  const ver = (await one<{ id: string }>(
    `insert into signing_versions(document_id,version_no,original_path,original_sha256,original_size,page_count,pages,subject,message,signing_order)
     values ($1,1,'x/y.pdf',$2,1000,2,'[{"w":612,"h":792,"rotation":0},{"w":612,"h":792,"rotation":0}]','Please sign','hi',$3) returning id`, [doc, sha('doc'), opts.order ?? 'sequential'])).id;
  await db.query(`update signing_documents set current_version_id=$1 where id=$2`, [ver, doc]);
  const recipients: { id: string; sig: string; name: string; tok: string }[] = [];
  for (let i = 1; i <= n; i++) {
    const rid = (await one<{ id: string }>(`insert into signing_recipients(version_id,name,email,order_index) values ($1,$2,$3,$4) returning id`, [ver, `Signer ${i}`, `s${i}@example.test`, i])).id;
    const sig = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h) values ($1,$2,'signature',1,0.1,0.8,0.3,0.05) returning id`, [ver, rid])).id;
    const name = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h,required) values ($1,$2,'name',1,0.5,0.8,0.3,0.03,true) returning id`, [ver, rid])).id;
    recipients.push({ id: rid, sig, name, tok: `tok-${ver}-${i}` });
  }
  return { doc, ver, recipients };
}
const vals = (r: { sig: string; name: string }) => JSON.stringify([{ field_id: r.sig, sig_method: 'typed', typed_text: 'Ada', image_png: 'iVBOR' }, { field_id: r.name, value: 'Ada Lovelace' }]);
async function send(ver: string) {
  await one(`select signing_mark_reviewed($1,$2)`, [ver, adminId]);
  return (await one<{ signing_send: any }>(`select signing_send($1,$2,'Sender','sender@example.test','Acme Pools')`, [ver, adminId])).signing_send;
}
const issue = async (r: { id: string; tok: string }, tok = r.tok) => (await one<any>(`select signing_issue_token($1,$2) r`, [r.id, sha(tok)])).r;
const consent = async (tok: string) => (await one<any>(`select signing_record_consent($1,'v1','abc','1.2.3.4','ua') r`, [sha(tok)])).r;
const submit = async (tok: string, v: string) => (await one<any>(`select signing_submit($1,$2::jsonb,'{"ip":"1.2.3.4","user_agent":"ua","timezone":"UTC"}'::jsonb) r`, [sha(tok), v])).r;
const setCode = async (rid: string, code: string, salt = 'saltsaltsaltsalt01') =>
  (await one<any>(`select signing_set_access_code($1,$2,$3,$4) r`, [rid, salt, sha(`${salt}:${code}`), adminId])).r;
const verify = async (tok: string, code: string, session = sha(`session-${Math.random()}`)) =>
  (await one<any>(`select signing_verify_code($1,$2,$3,'1.2.3.4','ua') r`, [sha(tok), code, session])).r;
/** A sent request that requires access codes, with the first signer's link issued and code set. */
async function codeRequest(code = '123456') {
  const d = await draft(cA);
  await one(`select signing_set_draft_options($1, null, 3, true)`, [d.ver]);
  expect((await send(d.ver)).ok).toBe(true);
  expect((await issue(d.recipients[0])).ok).toBe(true);
  expect((await setCode(d.recipients[0].id, code)).ok).toBe(true);
  return d;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid());
    create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('app.role', true), '') = 'admin' $$;
    create function public.auth_contractor_id() returns uuid language sql stable as $$ select case when current_setting('app.role', true) = 'contractor' then nullif(current_setting('app.contractor', true), '')::uuid end $$;
  `);
  await db.exec(read('0039_document_signing.sql'));
  await db.exec(read('0040_signing_templates_reminders_codes.sql'));
  cA = (await one<{ id: string }>(`insert into contractors(name) values ('A') returning id`)).id;
  cB = (await one<{ id: string }>(`insert into contractors(name) values ('B') returning id`)).id;
  adminId = (await one<{ id: string }>(`insert into profiles(role) values ('admin') returning id`)).id;
}, 60_000);
afterAll(async () => { await db?.close(); });

describe('migration 0040', () => {
  it('can be applied twice and keeps safe defaults', async () => {
    await db.exec(read('0040_signing_templates_reminders_codes.sql'));
    const d = await draft(cA);
    expect(await one(`select auto_remind_days, auto_remind_max, require_access_code from signing_versions where id=$1`, [d.ver])).toEqual({ auto_remind_days: null, auto_remind_max: 3, require_access_code: false });
  });
});

describe('draft options and locking', () => {
  it('options can be set on a draft; the access-code requirement is locked once sent; reminders stay adjustable', async () => {
    const d = await draft(cA);
    expect((await one<any>(`select signing_set_draft_options($1, 2, 5, true) r`, [d.ver])).r.ok).toBe(true);
    expect(await one(`select auto_remind_days, auto_remind_max, require_access_code from signing_versions where id=$1`, [d.ver])).toEqual({ auto_remind_days: 2, auto_remind_max: 5, require_access_code: true });
    expect((await send(d.ver)).ok).toBe(true);
    await expect(db.query(`update signing_versions set require_access_code=false where id=$1`, [d.ver])).rejects.toThrow(/signing:locked/);
    expect((await one<any>(`select signing_set_draft_options($1, 1, 1, false) r`, [d.ver])).r).toEqual({ ok: false, error: 'locked' });
    expect((await one<any>(`select signing_set_reminders($1, 7, 2, $2) r`, [d.ver, adminId])).r.ok).toBe(true);
    expect(await one(`select auto_remind_days, auto_remind_max from signing_versions where id=$1`, [d.ver])).toEqual({ auto_remind_days: 7, auto_remind_max: 2 });
    expect((await one<any>(`select signing_set_reminders($1, null, 2, $2) r`, [d.ver, adminId])).r.ok).toBe(true);
  });
  it('a new version keeps the reminder and access-code settings', async () => {
    const d = await draft(cA);
    await one(`select signing_set_draft_options($1, 3, 4, true)`, [d.ver]);
    await send(d.ver);
    const nv = (await one<any>(`select signing_new_version($1,$2) r`, [d.ver, adminId])).r;
    expect(nv.ok).toBe(true);
    expect(await one(`select auto_remind_days, auto_remind_max, require_access_code from signing_versions where id=$1`, [nv.version_id])).toEqual({ auto_remind_days: 3, auto_remind_max: 4, require_access_code: true });
  });
});

describe('access codes', () => {
  it('cannot set a code on a request that does not require one', async () => {
    const d = await draft(cA);
    await send(d.ver); await issue(d.recipients[0]);
    expect(await setCode(d.recipients[0].id, '111111')).toEqual({ ok: false, error: 'not_required' });
  });
  it('stores only a salted hash; a correct code lets the signer sign; the sign step is blocked without it', async () => {
    const d = await codeRequest('482913');
    const r = d.recipients[0];
    const row = await one<any>(`select access_code_salt, access_code_hash, auth_method from signing_recipients where id=$1`, [r.id]);
    expect(row.access_code_hash).toBe(sha(`${row.access_code_salt}:482913`));
    expect(JSON.stringify(row)).not.toContain('482913');
    expect(row.auth_method).toBe('email_link_code');
    expect((await consent(r.tok)).ok).toBe(true);
    // The database itself refuses: nobody becomes "signed" without a verified code.
    await expect(submit(r.tok, vals(r))).rejects.toThrow(/signing:code_required/);
    expect((await one<any>(`select status from signing_recipients where id=$1`, [r.id])).status).not.toBe('signed');
    expect((await verify(r.tok, '482913')).ok).toBe(true);
    expect((await submit(r.tok, vals(r))).ok).toBe(true);
  });
  it('wrong codes count down and lock the signer; even the right code is then refused until a new code is issued', async () => {
    const d = await codeRequest('222222');
    const r = d.recipients[0];
    expect(await verify(r.tok, '000001')).toEqual({ ok: false, error: 'wrong_code', remaining: 4 });
    expect(await verify(r.tok, '000002')).toEqual({ ok: false, error: 'wrong_code', remaining: 3 });
    await verify(r.tok, '000003'); await verify(r.tok, '000004');
    expect(await verify(r.tok, '000005')).toEqual({ ok: false, error: 'code_locked' });
    expect(await verify(r.tok, '222222')).toEqual({ ok: false, error: 'code_locked' });
    expect((await consent(r.tok)).ok).toBe(true);
    await expect(submit(r.tok, vals(r))).rejects.toThrow(/signing:code_required/);
    // the sender issues a new code: attempts reset, old code dead
    expect((await setCode(r.id, '333333', 'saltsaltsaltsalt02')).ok).toBe(true);
    expect(await verify(r.tok, '222222')).toMatchObject({ ok: false, error: 'wrong_code' });
    expect((await verify(r.tok, '333333')).ok).toBe(true);
    const events = (await q<{ event_type: string }>(`select event_type from signing_events where version_id=$1 order by id`, [d.ver])).map((e) => e.event_type);
    expect(events).toEqual(expect.arrayContaining(['access_code_issued', 'access_code_failed', 'access_code_locked', 'access_code_verified']));
    expect((await one<any>(`select signing_verify_chain($1) r`, [d.ver])).r).toBe(true);
    expect(JSON.stringify(await q(`select metadata from signing_events where version_id=$1`, [d.ver]))).not.toMatch(/222222|333333/);
  });
  it('a new signing link (resend) clears the earlier verification, so the new link needs the code again', async () => {
    const d = await codeRequest('444444');
    const r = d.recipients[0];
    expect((await verify(r.tok, '444444')).ok).toBe(true);
    expect((await issue(r, 'second-link-token')).ok).toBe(true);
    expect((await one<any>(`select access_verified_at, access_session_hash from signing_recipients where id=$1`, [r.id]))).toEqual({ access_verified_at: null, access_session_hash: null });
    await consent('second-link-token');
    await expect(submit('second-link-token', vals(r))).rejects.toThrow(/signing:code_required/);
    expect((await verify('second-link-token', '444444')).ok).toBe(true);
    expect((await submit('second-link-token', vals(r))).ok).toBe(true);
  });
  it('rejects malformed hashes and behaves for requests without codes', async () => {
    const d = await draft(cA);
    await send(d.ver); await issue(d.recipients[0]);
    expect((await one<any>(`select signing_set_access_code($1,'short','nothex',$2) r`, [d.recipients[0].id, adminId])).r.error).toBe('bad_request');
    expect(await verify(d.recipients[0].tok, '123456')).toEqual({ ok: true, not_required: true });
    await consent(d.recipients[0].tok);
    expect((await submit(d.recipients[0].tok, vals(d.recipients[0]))).ok).toBe(true); // no code needed, no code asked
  });
  it('browser roles cannot read the code columns or run the code functions', async () => {
    await codeRequest('555555');
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.query(`select access_code_hash from signing_recipients`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select access_session_hash from signing_recipients`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select signing_verify_code('a','b','c','d','e')`)).rejects.toThrow();
      await expect(db.query(`select * from signing_claim_auto_reminders(5)`)).rejects.toThrow();
      await db.exec('reset role');
    }
  });
});

describe('automatic reminders (claim)', () => {
  const ago = (rid: string, days: number) => db.query(`update signing_recipients set last_sent_at = now() - make_interval(days => $2), invited_at = now() - make_interval(days => $2) where id=$1`, [rid, days]);
  const claim = async () => (await q<{ recipient_id: string }>(`select * from signing_claim_auto_reminders(20)`)).map((r) => r.recipient_id);

  it('claims only signers whose interval has passed, exactly once, and not before they are due', async () => {
    const d = await draft(cA, { n: 2, order: 'parallel' });
    await one(`select signing_set_draft_options($1, 2, 3, false)`, [d.ver]);
    await send(d.ver);
    for (const r of d.recipients) await issue(r);
    expect(await claim()).toEqual([]);                               // just invited
    await ago(d.recipients[0].id, 3);
    expect(await claim()).toEqual([d.recipients[0].id]);             // only the overdue one
    expect(await claim()).toEqual([]);                               // single-flight: the clock moved, nothing else is due
    expect((await one<any>(`select auto_reminders_sent from signing_recipients where id=$1`, [d.recipients[0].id])).auto_reminders_sent).toBe(1);
  });
  it('respects the maximum, the off switch, signed signers, expiry and recently opened links', async () => {
    const d = await draft(cA, { n: 3, order: 'parallel' });
    await one(`select signing_set_draft_options($1, 1, 1, false)`, [d.ver]);
    await send(d.ver);
    for (const r of d.recipients) { await issue(r); await ago(r.id, 2); }
    await db.query(`update signing_recipients set last_viewed_at = now() - interval '10 minutes' where id=$1`, [d.recipients[1].id]);   // has the page open
    await consent(d.recipients[2].tok); await submit(d.recipients[2].tok, vals(d.recipients[2]));                                          // already signed
    expect(await claim()).toEqual([d.recipients[0].id]);                                    // viewed + signed are skipped
    await ago(d.recipients[0].id, 2);
    expect(await claim()).toEqual([]);                                                       // max (1) reached
    await one(`select signing_set_reminders($1, null, 3, $2)`, [d.ver, adminId]);
    await ago(d.recipients[1].id, 2); await db.query(`update signing_recipients set last_viewed_at = null where id=$1`, [d.recipients[1].id]);
    expect(await claim()).toEqual([]);                                                       // reminders switched off
  });
  it('sequential requests only remind the signer whose turn it is', async () => {
    const d = await draft(cA, { n: 2, order: 'sequential' });
    await one(`select signing_set_draft_options($1, 1, 3, false)`, [d.ver]);
    await send(d.ver);
    await issue(d.recipients[0]);
    await ago(d.recipients[0].id, 2);
    expect(await claim()).toEqual([d.recipients[0].id]);
    await consent(d.recipients[0].tok); await submit(d.recipients[0].tok, vals(d.recipients[0]));
    await issue(d.recipients[1]); await ago(d.recipients[1].id, 2);
    expect(await claim()).toEqual([d.recipients[1].id]);
  });
});

describe('templates', () => {
  async function savedTemplate(opts: { keepPrefill?: boolean } = {}) {
    const d = await draft(cA, { n: 2 });
    await db.query(`insert into signing_fields(version_id,type,page,x,y,w,h,prefill_value) values ($1,'text',1,0.1,0.3,0.4,0.03,'Smith residence, 12 Oak St')`, [d.ver]);
    await one(`select signing_set_draft_options($1, 2, 4, true)`, [d.ver]);
    const id = (await one<{ id: string }>(`select gen_random_uuid() id`)).id;
    const r = (await one<any>(`select signing_create_template($1,$2,$3,'Home improvement','Standard contract','["Homeowner","Contractor"]'::jsonb,'c-x/templates/t.pdf',$4) r`, [id, d.ver, adminId, !!opts.keepPrefill])).r;
    expect(r.ok).toBe(true);
    return { id, d };
  }
  it('saves layout by role, drops customer-specific prefill by default, and stores no people', async () => {
    const { id } = await savedTemplate();
    expect(await q(`select order_index, label from signing_template_roles where template_id=$1 order by order_index`, [id])).toEqual([{ order_index: 1, label: 'Homeowner' }, { order_index: 2, label: 'Contractor' }]);
    const fields = await q<any>(`select type, role_index, prefill_value from signing_template_fields where template_id=$1 order by sort_order, type`, [id]);
    expect(fields.filter((f) => f.type === 'signature').map((f) => f.role_index).sort()).toEqual([1, 2]);
    expect(fields.some((f) => f.prefill_value)).toBe(false);
    const t = await one<any>(`select * from signing_templates where id=$1`, [id]);
    expect(t).toMatchObject({ contractor_id: cA, signing_order: 'sequential', auto_remind_days: 2, auto_remind_max: 4, require_access_code: true });
    expect(JSON.stringify(t)).not.toMatch(/example\.test|Signer 1/);
    const kept = await savedTemplate({ keepPrefill: true });
    expect((await q<any>(`select prefill_value from signing_template_fields where template_id=$1 and prefill_value is not null`, [kept.id])).map((f) => f.prefill_value)).toEqual(['Smith residence, 12 Oak St']);
  });
  it('rejects a role list that does not match the signers', async () => {
    const d = await draft(cA, { n: 2 });
    const r = (await one<any>(`select signing_create_template(gen_random_uuid(),$1,$2,'T','','["Only one"]'::jsonb,'p',false) r`, [d.ver, adminId])).r;
    expect(r).toEqual({ ok: false, error: 'bad_roles' });
  });
  it('creates a draft document from a template: fields mapped to the right signer, settings copied, review still required', async () => {
    const { id } = await savedTemplate();
    const doc = (await one<{ id: string }>(`select gen_random_uuid() id`)).id, ver = (await one<{ id: string }>(`select gen_random_uuid() id`)).id;
    const people = JSON.stringify([{ name: 'Pat Homeowner', email: 'PAT@example.test' }, { name: 'Casey Contractor', email: 'casey@example.test' }]);
    expect((await one<any>(`select signing_create_from_template($1,$2,$3,'Smith contract',$4,null,$5::jsonb,'c-x/new/v.pdf') r`, [id, doc, ver, adminId, people])).r.ok).toBe(true);
    const v = await one<any>(`select status, version_no, subject, require_access_code, auto_remind_days, placement_reviewed_at from signing_versions where id=$1`, [ver]);
    expect(v).toMatchObject({ status: 'draft', version_no: 1, subject: 'Please sign', require_access_code: true, auto_remind_days: 2, placement_reviewed_at: null });
    expect((await one<any>(`select contractor_id, current_version_id from signing_documents where id=$1`, [doc]))).toEqual({ contractor_id: cA, current_version_id: ver });
    const recs = await q<any>(`select id, name, email, order_index from signing_recipients where version_id=$1 order by order_index`, [ver]);
    expect(recs.map((r) => [r.name, r.email])).toEqual([['Pat Homeowner', 'pat@example.test'], ['Casey Contractor', 'casey@example.test']]);
    const sigs = await q<any>(`select recipient_id from signing_fields where version_id=$1 and type='signature' order by recipient_id`, [ver]);
    expect(sigs.map((s) => s.recipient_id).sort()).toEqual(recs.map((r) => r.id).sort());
    expect((await one<any>(`select use_count from signing_templates where id=$1`, [id])).use_count).toBe(1);
    // the dropped customer-specific text leaves an unassigned field the sender must fill in (or assign) first
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [ver, adminId])).r.error).toBe('unassigned_fields');
    await db.query(`update signing_fields set prefill_value='Jones residence' where version_id=$1 and recipient_id is null`, [ver]);
    // and even then a person must review the placement before anything is sent
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [ver, adminId])).r.error).toBe('review_required');
    expect((await send(ver)).ok).toBe(true);
  });
  it('rejects wrong signer counts and archived templates', async () => {
    const { id } = await savedTemplate();
    const call = async (people: unknown) => (await one<any>(`select signing_create_from_template($1,gen_random_uuid(),gen_random_uuid(),'T',$2,null,$3::jsonb,'p') r`, [id, adminId, JSON.stringify(people)])).r;
    expect(await call([{ name: 'Only', email: 'o@example.test' }])).toEqual({ ok: false, error: 'bad_roles' });
    await db.query(`update signing_templates set archived_at = now() where id=$1`, [id]);
    expect(await call([{ name: 'A', email: 'a@example.test' }, { name: 'B', email: 'b@example.test' }])).toEqual({ ok: false, error: 'not_found' });
  });
  it('browser roles: a company sees only its own templates, others see none, nobody can write', async () => {
    await savedTemplate();                                              // company A
    await db.query(`insert into signing_templates(contractor_id,name,original_path,original_sha256,original_size,page_count,pages) values ($1,'B only','p',$2,1,1,'[]')`, [cB, sha('b')]);
    await asUser('contractor', cA, async () => {
      const names = (await q<{ name: string }>(`select name from signing_templates`)).map((t) => t.name);
      expect(names).toContain('Home improvement'); expect(names).not.toContain('B only');
      await expect(db.query(`insert into signing_templates(name,original_path,original_sha256,original_size,page_count,pages) values ('x','p',$1,1,1,'[]')`, [sha('x')])).rejects.toThrow();
      await expect(db.query(`select signing_create_template(gen_random_uuid(), gen_random_uuid(), null, 'n', '', '[]'::jsonb, 'p', false)`)).rejects.toThrow();
    });
    await asUser(null, null, async () => { expect(await q(`select name from signing_templates`)).toHaveLength(0); });
    await asUser('admin', null, async () => { expect((await q(`select name from signing_templates`)).length).toBeGreaterThanOrEqual(2); });
  });
});
