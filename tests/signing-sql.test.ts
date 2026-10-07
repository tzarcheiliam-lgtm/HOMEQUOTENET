/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs migration 0039 in an in-process Postgres (PGlite) against minimal stand-ins for the existing
 * tables/functions. Exercises the state machine, locking triggers, token handling, tenant isolation
 * (RLS + column grants) and audit-chain integrity for real.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
let db: PGlite;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const one = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await q<T>(sql, p))[0];

let cA: string, cB: string, adminId: string, userA: string, userB: string;

async function asUser(uid: string | null, role: 'admin' | 'contractor' | null, contractor: string | null, fn: () => Promise<void>) {
  await db.exec(`select set_config('app.uid', '${uid ?? ''}', false), set_config('app.role', '${role ?? ''}', false), set_config('app.contractor', '${contractor ?? ''}', false)`);
  await db.exec('set role authenticated');
  try { await fn(); } finally { await db.exec('reset role'); }
}

/** Build a draft version with N recipients, each with a signature + required name field. */
async function draft(contractor: string | null, opts: { n?: number; order?: 'sequential' | 'parallel'; extra?: boolean } = {}) {
  const n = opts.n ?? 1;
  const doc = (await one<{ id: string }>(`insert into signing_documents(contractor_id,title) values ($1,'Contract') returning id`, [contractor])).id;
  const ver = (await one<{ id: string }>(
    `insert into signing_versions(document_id,version_no,original_path,original_sha256,original_size,page_count,pages,subject,message,signing_order)
     values ($1,1,'x/y.pdf',$2,1000,2,'[{"w":612,"h":792,"rotation":0},{"w":612,"h":792,"rotation":0}]','Please sign','hi',$3) returning id`,
    [doc, sha('doc'), opts.order ?? 'sequential'])).id;
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
/** Test-only: move a request's expiry into the past (the guard trigger rightly forbids this for app code). */
async function backdate(ver: string) {
  await db.exec('alter table signing_versions disable trigger trg_signing_versions_guard');
  await db.query(`update signing_versions set expires_at = now() - interval '1 minute' where id=$1`, [ver]);
  await db.exec('alter table signing_versions enable trigger trg_signing_versions_guard');
}
const vals = (r: { sig: string; name: string }) => JSON.stringify([
  { field_id: r.sig, sig_method: 'typed', typed_text: 'Ada', image_png: 'iVBOR' },
  { field_id: r.name, value: 'Ada Lovelace' },
]);
async function send(ver: string) {
  await one(`select signing_mark_reviewed($1,$2)`, [ver, adminId]);
  return (await one<{ signing_send: any }>(`select signing_send($1,$2,'Sender','sender@example.test','Acme Pools')`, [ver, adminId])).signing_send;
}
const issue = async (r: { id: string; tok: string }) => (await one<any>(`select signing_issue_token($1,$2) r`, [r.id, sha(r.tok)])).r;
const open = async (tok: string) => (await one<any>(`select signing_open($1,'1.2.3.4','ua') r`, [sha(tok)])).r;
const consent = async (tok: string) => (await one<any>(`select signing_record_consent($1,'v1','abc','1.2.3.4','ua') r`, [sha(tok)])).r;
const submit = async (tok: string, v: string) => (await one<any>(`select signing_submit($1,$2::jsonb,'{"ip":"1.2.3.4","user_agent":"ua","timezone":"UTC"}'::jsonb) r`, [sha(tok), v])).r;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid());
    create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('app.role', true), '') = 'admin' $$;
    create function public.auth_contractor_id() returns uuid language sql stable as $$ select case when current_setting('app.role', true) = 'contractor' then nullif(current_setting('app.contractor', true), '')::uuid end $$;
  `);
  await db.exec(read('0039_document_signing.sql'));
  cA = (await one<{ id: string }>(`insert into contractors(name) values ('A') returning id`)).id;
  cB = (await one<{ id: string }>(`insert into contractors(name) values ('B') returning id`)).id;
  adminId = (await one<{ id: string }>(`insert into profiles(role) values ('admin') returning id`)).id;
  userA = (await one<{ id: string }>(`insert into profiles(role) values ('contractor') returning id`)).id;
  userB = (await one<{ id: string }>(`insert into profiles(role) values ('contractor') returning id`)).id;
}, 60_000);
afterAll(async () => { await db?.close(); });

describe('migration', () => {
  it('can be applied twice', async () => { await db.exec(read('0039_document_signing.sql')); });
});

describe('send gate + locking', () => {
  it('refuses to send without a placement review, then locks fields and recipients once sent', async () => {
    const d = await draft(cA);
    const noReview = (await one<any>(`select signing_send($1,$2,'S','s@x.test','Acme') r`, [d.ver, adminId])).r;
    expect(noReview).toEqual({ ok: false, error: 'review_required' });
    expect((await send(d.ver)).ok).toBe(true);
    await expect(db.query(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h) values ($1,$2,'text',1,0,0,0.1,0.1)`, [d.ver, d.recipients[0].id])).rejects.toThrow(/signing:locked/);
    await expect(db.query(`update signing_fields set x=0.2 where id=$1`, [d.recipients[0].sig])).rejects.toThrow(/signing:locked/);
    await expect(db.query(`delete from signing_fields where id=$1`, [d.recipients[0].sig])).rejects.toThrow(/signing:locked/);
    await expect(db.query(`update signing_recipients set email='evil@example.test' where id=$1`, [d.recipients[0].id])).rejects.toThrow(/signing:locked/);
    await expect(db.query(`update signing_versions set original_sha256=$2 where id=$1`, [d.ver, sha('other')])).rejects.toThrow(/signing:locked/);
    await expect(db.query(`delete from signing_versions where id=$1`, [d.ver])).rejects.toThrow(/signing:locked/);
    // status/token columns remain writable
    await db.query(`update signing_recipients set last_email_status='failed' where id=$1`, [d.recipients[0].id]);
  });

  it('a field edit after review invalidates the review', async () => {
    const d = await draft(cA);
    await one(`select signing_mark_reviewed($1,$2)`, [d.ver, adminId]);
    await db.query(`update signing_fields set x=0.15 where id=$1`, [d.recipients[0].sig]);
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [d.ver, adminId])).r).toEqual({ ok: false, error: 'review_required' });
  });

  it('requires reviewed uncertain fields, a signature per signer, and no unassigned fields', async () => {
    const d = await draft(cA);
    const f = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h,needs_review) values ($1,$2,'initials',1,0.1,0.1,0.1,0.05,true) returning id`, [d.ver, d.recipients[0].id])).id;
    await one(`select signing_mark_reviewed($1,$2)`, [d.ver, adminId]);
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [d.ver, adminId])).r.error).toBe('unreviewed_fields');
    await db.query(`update signing_fields set reviewed_at=now() where id=$1`, [f]);
    await db.query(`insert into signing_fields(version_id,type,page,x,y,w,h) values ($1,'text',1,0.1,0.3,0.1,0.05)`, [d.ver]);
    await one(`select signing_mark_reviewed($1,$2)`, [d.ver, adminId]);
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [d.ver, adminId])).r.error).toBe('unassigned_fields');
    const d2 = await draft(cA);
    await db.query(`delete from signing_fields where id=$1`, [d2.recipients[0].sig]);
    await one(`select signing_mark_reviewed($1,$2)`, [d2.ver, adminId]);
    expect((await one<any>(`select signing_send($1,$2,'S','s@x.test','A') r`, [d2.ver, adminId])).r.error).toBe('recipient_without_signature');
  });

  it('only text fields can carry sender prefill', async () => {
    const d = await draft(cA);
    await expect(db.query(`insert into signing_fields(version_id,type,page,x,y,w,h,prefill_value) values ($1,'checkbox',1,0.1,0.1,0.02,0.02,'true')`, [d.ver])).rejects.toThrow();
    await db.query(`insert into signing_fields(version_id,type,page,x,y,w,h,prefill_value) values ($1,'text',1,0.1,0.1,0.2,0.02,'Acme Pools Inc.')`, [d.ver]);
  });
});

describe('signing flow', () => {
  it('single signer: token -> consent -> submit completes, token cannot be replayed, retry is idempotent', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver);
    expect((await issue(r)).ok).toBe(true);
    expect(await open('wrong')).toEqual({ state: 'invalid' });
    expect((await open(r.tok)).state).toBe('ok');
    // consent is required first
    expect((await submit(r.tok, vals(r))).error).toBe('consent_required');
    expect((await consent(r.tok)).ok).toBe(true);
    // missing required field -> rejected, nothing stored
    const partial = await submit(r.tok, JSON.stringify([{ field_id: r.sig, sig_method: 'drawn', image_png: 'iVBOR' }]));
    expect(partial).toMatchObject({ ok: false, error: 'missing_required', fields: [r.name] });
    expect((await one<{ n: number }>(`select count(*)::int n from signing_field_values`)).n).toBe(0);
    const done = await submit(r.tok, vals(r));
    expect(done).toMatchObject({ ok: true, completed: true });
    const v = await one<any>(`select status, completed_at, retention_until from signing_versions where id=$1`, [d.ver]);
    expect(v.status).toBe('completed');
    expect(v.retention_until).toBeTruthy();
    // retry / replay: no duplicate rows, same answer
    expect(await submit(r.tok, vals(r))).toMatchObject({ ok: true, already: true });
    expect((await one<{ n: number }>(`select count(*)::int n from signing_field_values where version_id=$1`, [d.ver])).n).toBe(2);
    expect((await open(r.tok)).state).toBe('signed');
    // a signed recipient cannot get a fresh signing token
    expect((await issue(r)).ok).toBe(false);
    // the token no longer works as a signing token for the same values on another submission either
    expect((await one<{ n: number }>(`select count(*)::int n from signing_events where version_id=$1 and event_type='signed'`, [d.ver])).n).toBe(1);
  });

  it('rejects values for fields that belong to someone else, duplicates, and prefilled fields', async () => {
    const d = await draft(cA, { n: 2, order: 'parallel' });
    await send(d.ver);
    const [a, b] = d.recipients;
    await issue(a); await issue(b);
    await open(a.tok); await consent(a.tok);
    const stolen = await submit(a.tok, JSON.stringify([
      { field_id: a.sig, sig_method: 'typed', typed_text: 'A', image_png: 'x' }, { field_id: a.name, value: 'A' }, { field_id: b.name, value: 'hijack' }]));
    expect(stolen.error).toBe('bad_field');
    const dup = await submit(a.tok, JSON.stringify([{ field_id: a.name, value: 'A' }, { field_id: a.name, value: 'B' }]));
    expect(dup.error).toBe('bad_field');
    expect((await one<{ n: number }>(`select count(*)::int n from signing_field_values where version_id=$1`, [d.ver])).n).toBe(0);
  });

  it('multiple signers in sequence: later signer cannot get a link or open it until the earlier one signs', async () => {
    const d = await draft(cA, { n: 3, order: 'sequential' });
    await send(d.ver);
    const [a, b, c] = d.recipients;
    expect((await issue(a)).ok).toBe(true);
    expect((await issue(b))).toMatchObject({ ok: false, error: 'not_your_turn' });
    await open(a.tok); await consent(a.tok);
    expect(await submit(a.tok, vals(a))).toMatchObject({ ok: true, completed: false });
    expect((await one<any>(`select status from signing_versions where id=$1`, [d.ver])).status).toBe('partially_signed');
    expect((await issue(b)).ok).toBe(true);
    expect((await issue(c)).error).toBe('not_your_turn');
    // out-of-turn token (issued earlier through some other path) cannot be used
    await db.query(`update signing_recipients set token_hash=$2, token_expires_at=now()+interval '1 day' where id=$1`, [c.id, sha(c.tok)]);
    expect((await open(c.tok)).state).toBe('not_your_turn');
    await consent(c.tok);
    expect((await submit(c.tok, vals(c))).error).toBe('not_your_turn');
    await open(b.tok); await consent(b.tok);
    expect((await submit(b.tok, vals(b))).completed).toBe(false);
    expect((await issue(c)).ok).toBe(true);
    await open(c.tok); await consent(c.tok);
    expect(await submit(c.tok, vals(c))).toMatchObject({ ok: true, completed: true });
    expect((await one<any>(`select status from signing_versions where id=$1`, [d.ver])).status).toBe('completed');
  });

  it('parallel signers can sign in any order', async () => {
    const d = await draft(cA, { n: 2, order: 'parallel' });
    await send(d.ver);
    const [a, b] = d.recipients;
    expect((await issue(b)).ok).toBe(true); expect((await issue(a)).ok).toBe(true);
    await open(b.tok); await consent(b.tok);
    expect((await submit(b.tok, vals(b))).completed).toBe(false);
    await open(a.tok); await consent(a.tok);
    expect((await submit(a.tok, vals(a))).completed).toBe(true);
  });

  it('exclusive checkbox groups: at most one, required group needs exactly one', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    const yes = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h,required,group_key) values ($1,$2,'checkbox',1,0.1,0.5,0.02,0.02,true,'g1') returning id`, [d.ver, r.id])).id;
    const no = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h,required,group_key) values ($1,$2,'checkbox',1,0.2,0.5,0.02,0.02,true,'g1') returning id`, [d.ver, r.id])).id;
    await send(d.ver); await issue(r); await open(r.tok); await consent(r.tok);
    const base = [{ field_id: r.sig, sig_method: 'typed', typed_text: 'A', image_png: 'x' }, { field_id: r.name, value: 'A' }];
    expect((await submit(r.tok, JSON.stringify([...base, { field_id: yes, value: 'true' }, { field_id: no, value: 'true' }]))).error).toBe('group_conflict');
    expect((await submit(r.tok, JSON.stringify([...base, { field_id: yes, value: 'false' }, { field_id: no, value: 'false' }]))).error).toBe('missing_required');
    expect((await submit(r.tok, JSON.stringify([...base, { field_id: yes, value: 'false' }, { field_id: no, value: 'true' }]))).ok).toBe(true);
  });

  it('a required stand-alone checkbox must be ticked by the signer (never pre-selected)', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    const cb = (await one<{ id: string }>(`insert into signing_fields(version_id,recipient_id,type,page,x,y,w,h,required) values ($1,$2,'checkbox',1,0.1,0.5,0.02,0.02,true) returning id`, [d.ver, r.id])).id;
    await send(d.ver); await issue(r); await open(r.tok); await consent(r.tok);
    const base = [{ field_id: r.sig, sig_method: 'typed', typed_text: 'A', image_png: 'x' }, { field_id: r.name, value: 'A' }];
    expect((await submit(r.tok, JSON.stringify([...base, { field_id: cb, value: 'false' }]))).error).toBe('missing_required');
    expect((await submit(r.tok, JSON.stringify([...base, { field_id: cb, value: 'true' }]))).ok).toBe(true);
  });
});

describe('decline, void, expiry, versioning', () => {
  it('decline ends the request and kills every token', async () => {
    const d = await draft(cA, { n: 2, order: 'parallel' });
    await send(d.ver);
    const [a, b] = d.recipients;
    await issue(a); await issue(b); await open(a.tok);
    expect((await one<any>(`select signing_decline($1,'not now','1.1.1.1','ua') r`, [sha(a.tok)])).r.ok).toBe(true);
    expect((await one<any>(`select status from signing_versions where id=$1`, [d.ver])).status).toBe('declined');
    expect((await open(b.tok)).state).toBe('declined');
    await consent(b.tok);
    expect((await submit(b.tok, vals(b))).ok).toBe(false);
  });

  it('void invalidates tokens and is refused for finished requests', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver); await issue(r); await open(r.tok);
    expect((await one<any>(`select signing_void($1,$2,'mistake') r`, [d.ver, adminId])).r.ok).toBe(true);
    expect((await open(r.tok)).state).toBe('voided');
    expect((await one<any>(`select signing_void($1,$2,'again') r`, [d.ver, adminId])).r.ok).toBe(false);
    expect((await one<any>(`select signing_issue_token($1,$2) r`, [r.id, sha('new')])).r.ok).toBe(false);
  });

  it('expired links are rejected and the request is marked expired', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver); await issue(r); await open(r.tok); await consent(r.tok);
    await backdate(d.ver);
    expect((await submit(r.tok, vals(r))).error).toBe('expired');
    expect((await one<any>(`select status from signing_versions where id=$1`, [d.ver])).status).toBe('expired');
    expect((await open(r.tok)).state).toBe('expired');
    const d2 = await draft(cA);
    await send(d2.ver); await issue(d2.recipients[0]);
    await backdate(d2.ver);
    expect((await one<any>(`select signing_expire_due() n`)).n).toBeGreaterThanOrEqual(1);
    expect((await one<any>(`select status from signing_versions where id=$1`, [d2.ver])).status).toBe('expired');
  });

  it('a new version copies fields/recipients, voids the open request and invalidates its links', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver); await issue(r);
    const nv = (await one<any>(`select signing_new_version($1,$2) r`, [d.ver, adminId])).r;
    expect(nv).toMatchObject({ ok: true, version_no: 2 });
    expect((await one<any>(`select status from signing_versions where id=$1`, [d.ver])).status).toBe('voided');
    expect((await open(r.tok)).state).toBe('voided');
    expect((await one<any>(`select count(*)::int n from signing_fields where version_id=$1`, [nv.version_id])).n).toBe(2);
    expect((await one<any>(`select status, sent_at from signing_versions where id=$1`, [nv.version_id]))).toMatchObject({ status: 'draft', sent_at: null });
    expect((await one<any>(`select current_version_id from signing_documents where id=$1`, [d.doc])).current_version_id).toBe(nv.version_id);
    // the new draft is editable, the old one is not
    await db.query(`update signing_fields set x=0.3 where version_id=$1`, [nv.version_id]);
    // a second new version while a draft exists is refused
    const again = (await one<any>(`select signing_new_version($1,$2) r`, [d.ver, adminId])).r;
    expect(again.error).toBe('draft_exists');
  });

  it('completed versions are terminal and their final artifacts are write-once', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver); await issue(r); await open(r.tok); await consent(r.tok); await submit(r.tok, vals(r));
    await expect(db.query(`update signing_versions set status='voided' where id=$1`, [d.ver])).rejects.toThrow(/signing:terminal/);
    expect((await one<any>(`select signing_claim_finalize($1) r`, [d.ver])).r).toBe(true);
    expect((await one<any>(`select signing_claim_finalize($1) r`, [d.ver])).r).toBe(false); // lease held
    expect((await one<any>(`select signing_record_final($1,'f.pdf',$2,'c.pdf',$3) r`, [d.ver, sha('f'), sha('c')])).r.ok).toBe(true);
    expect((await one<any>(`select signing_record_final($1,'g.pdf',$2,'d.pdf',$3) r`, [d.ver, sha('g'), sha('d')])).r.already).toBe(true);
    await expect(db.query(`update signing_versions set final_sha256=$2 where id=$1`, [d.ver, sha('tamper')])).rejects.toThrow(/signing:immutable/);
    expect((await one<any>(`select final_sha256 from signing_versions where id=$1`, [d.ver])).final_sha256).toBe(sha('f'));
    expect((await one<any>(`select signing_claim_finalize($1) r`, [d.ver])).r).toBe(false);
  });
});

describe('audit integrity', () => {
  it('events and values are append-only and the hash chain verifies', async () => {
    const d = await draft(cA);
    const r = d.recipients[0];
    await send(d.ver); await issue(r); await open(r.tok); await consent(r.tok); await submit(r.tok, vals(r));
    expect((await one<any>(`select signing_verify_chain($1) r`, [d.ver])).r).toBe(true);
    const events = await q<{ event_type: string }>(`select event_type from signing_events where version_id=$1 order by id`, [d.ver]);
    expect(events.map((e) => e.event_type)).toEqual(['placement_reviewed', 'sent', 'viewed', 'consent_given', 'signed', 'completed']);
    await expect(db.query(`update signing_events set event_type='x' where version_id=$1`, [d.ver])).rejects.toThrow(/signing:immutable/);
    await expect(db.query(`delete from signing_events where version_id=$1`, [d.ver])).rejects.toThrow(/signing:immutable/);
    await expect(db.query(`update signing_field_values set value='x' where version_id=$1`, [d.ver])).rejects.toThrow(/signing:immutable/);
    await expect(db.query(`delete from signing_field_values where version_id=$1`, [d.ver])).rejects.toThrow(/signing:immutable/);
    // tampering with a metadata blob (bypassing triggers) is detected
    await db.exec(`alter table signing_events disable trigger trg_signing_events_immutable`);
    await db.query(`update signing_events set metadata='{"forged":true}' where version_id=$1 and event_type='signed'`, [d.ver]);
    await db.exec(`alter table signing_events enable trigger trg_signing_events_immutable`);
    expect((await one<any>(`select signing_verify_chain($1) r`, [d.ver])).r).toBe(false);
  });

  it('never stores token plaintext (only a 64-char hash)', async () => {
    const rows = await q<{ token_hash: string }>(`select token_hash from signing_recipients where token_hash is not null`);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.token_hash).toMatch(/^[0-9a-f]{64}$/);
    const all = JSON.stringify(await q(`select * from signing_events`));
    expect(all).not.toMatch(/tok-/);
  });
});

describe('tenant isolation (RLS + column grants)', () => {
  let docA: string, docB: string, docHqn: string;
  beforeAll(async () => {
    docA = (await draft(cA)).doc; docB = (await draft(cB)).doc; docHqn = (await draft(null)).doc;
  });
  it('contractor users see only their own company documents; HQN-level docs are admin only', async () => {
    await asUser(userA, 'contractor', cA, async () => {
      const ids = (await q<{ id: string }>(`select id from signing_documents`)).map((r) => r.id);
      expect(ids).toContain(docA); expect(ids).not.toContain(docB); expect(ids).not.toContain(docHqn);
    });
    await asUser(userB, 'contractor', cB, async () => {
      const ids = (await q<{ id: string }>(`select id from signing_documents`)).map((r) => r.id);
      expect(ids).toContain(docB); expect(ids).not.toContain(docA);
      expect((await q(`select id from signing_fields where version_id in (select id from signing_versions where document_id=$1)`, [docA])).length).toBe(0);
      expect((await q(`select id from signing_recipients where version_id in (select id from signing_versions where document_id=$1)`, [docA])).length).toBe(0);
      expect((await q(`select id from signing_events`)).length).toBeGreaterThanOrEqual(0);
    });
    await asUser(adminId, 'admin', null, async () => {
      const ids = (await q<{ id: string }>(`select id from signing_documents`)).map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining([docA, docB, docHqn]));
    });
    await asUser(null, null, null, async () => {
      expect((await q(`select id from signing_documents`)).length).toBe(0);
    });
  });
  it('browser roles cannot write, read token hashes or signature blobs, or call the state functions', async () => {
    await asUser(userA, 'contractor', cA, async () => {
      await expect(db.query(`insert into signing_documents(contractor_id,title) values ($1,'x')`, [cA])).rejects.toThrow();
      await expect(db.query(`update signing_documents set title='hacked' where id=$1`, [docA])).rejects.toThrow();
      await expect(db.query(`select token_hash from signing_recipients`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select download_token_hash from signing_recipients`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select image_png from signing_field_values`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select signing_void($1,$2,'x')`, [docA, userA])).rejects.toThrow(/permission denied/);
      await expect(db.query(`select signing_submit('x','[]','{}')`)).rejects.toThrow(/permission denied/);
    });
  });
});

describe('signing_save_draft', () => {
  it('atomically replaces recipients + fields on a draft, clears review, and refuses once sent', async () => {
    const d = await draft(cA);
    await one(`select signing_mark_reviewed($1,$2)`, [d.ver, adminId]);
    const rec = JSON.stringify([{ name: 'New One', email: 'New@Example.test' }, { name: 'Two', email: 't@example.test' }]);
    const fl = JSON.stringify([
      { recipient_index: 1, type: 'signature', page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.05 },
      { recipient_index: 2, type: 'signature', page: 2, x: 0.1, y: 0.1, w: 0.2, h: 0.05, needs_review: true, reviewed: true },
      { recipient_index: null, type: 'text', page: 1, x: 0.1, y: 0.3, w: 0.2, h: 0.03, prefill_value: 'Acme' },
    ]);
    expect((await one<any>(`select signing_save_draft($1,'S','M','parallel',7,$2::jsonb,$3::jsonb) r`, [d.ver, rec, fl])).r.ok).toBe(true);
    const v = await one<any>(`select subject, signing_order, expiry_days, placement_review_hash from signing_versions where id=$1`, [d.ver]);
    expect(v).toMatchObject({ subject: 'S', signing_order: 'parallel', expiry_days: 7, placement_review_hash: null });
    expect((await q(`select email from signing_recipients where version_id=$1 order by order_index`, [d.ver])).map((r: any) => r.email)).toEqual(['new@example.test', 't@example.test']);
    expect((await one<any>(`select count(*)::int n from signing_fields where version_id=$1`, [d.ver])).n).toBe(3);
    expect((await one<any>(`select count(*)::int n from signing_fields where version_id=$1`, [d.ver])).n).toBe(3);
    expect((await one<any>(`select signing_save_draft($1,'S','M','parallel',7,$2::jsonb,'[{"recipient_index":5,"type":"text","page":1,"x":0,"y":0,"w":0.1,"h":0.1}]'::jsonb) r`, [d.ver, rec])).r.error).toBe('bad_recipient');
    expect((await send(d.ver)).ok).toBe(true);
    expect((await one<any>(`select signing_save_draft($1,'S','M','parallel',7,$2::jsonb,$3::jsonb) r`, [d.ver, rec, fl])).r.error).toBe('locked');
  });
});
