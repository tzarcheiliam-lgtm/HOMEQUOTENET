/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Postgres client, as elsewhere in tests */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';

/**
 * The assistant, customer-document and Meta-setup tables against the REAL migration chain (0049-0051) with real RLS.
 * Users act through the `authenticated` role (app.uid = their id); the server's service-role writes are simulated by
 * the superuser connection, exactly as the app does with the service-role key.
 */
let db: PGlite;
const id = Object.fromEntries(
  ['admin', 'setter', 'ownerA', 'staffA', 'ownerB', 'companyA', 'companyB', 'leadA', 'leadB', 'funnelA', 'funnelB', 'tpl', 'tplVer'].map((k) => [k, randomUUID()])
) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('app.uid','${userId}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('app.uid','', false)`); }
}
const sha = 'a'.repeat(64);

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'A'),($2,'B')`, [id.companyA, id.companyB]);
  for (const [uid, role, company, crole] of [
    [id.admin, 'admin', null, null], [id.setter, 'setter', null, null],
    [id.ownerA, 'contractor', id.companyA, 'owner'], [id.staffA, 'contractor', id.companyA, 'staff'], [id.ownerB, 'contractor', id.companyB, 'owner'],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active' where id=$1`, [uid, role, company, crole]);
  }
  await q(`insert into public.leads(id, first_name) values ($1,'Pat'),($2,'Quinn')`, [id.leadA, id.leadB]);
  await q(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2),($3,$4)`, [id.leadA, id.companyA, id.leadB, id.companyB]);
  await q(`insert into public.funnels(id, slug, contractor_id, status, config) values ($1,'fa',$2,'published','{}'),($3,'fb',$4,'published','{}')`, [id.funnelA, id.companyA, id.funnelB, id.companyB]);
  await q(`insert into public.contract_templates(id,name,status,sections,doc_type,latest_version_no,assistant_approved_version) values ($1,'Proposal','published','[]','proposal',1,1)`, [id.tpl]);
  await q(`insert into public.contract_template_versions(id,template_id,version_no,snapshot,content_sha256) values ($1,$2,1,'{}',$3)`, [id.tplVer, id.tpl, sha]);
}, 180_000);
afterAll(async () => { await db?.close(); });

describe('migrations 0049-0051', () => {
  it('create every assistant / document / meta table with RLS enabled', async () => {
    const rows = await q<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class where relname = any($1) and relkind='r'`, [[
      'assistant_conversations', 'assistant_messages', 'assistant_actions', 'assistant_usage', 'customer_documents', 'customer_document_versions', 'customer_document_events',
      'meta_connections', 'meta_connection_secrets', 'meta_funnel_tracking', 'meta_setup_log',
    ]]);
    expect(rows).toHaveLength(11);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });
});

describe('assistant conversations, messages and actions are private to their owner', () => {
  const conv = { a: randomUUID(), b: randomUUID() };
  beforeAll(async () => {
    await q(`insert into public.assistant_conversations(id,user_id,title) values ($1,$2,'A chat'),($3,$4,'B chat')`, [conv.a, id.ownerA, conv.b, id.ownerB]);
    await q(`insert into public.assistant_messages(conversation_id,user_id,role,content) values ($1,$2,'user','hello a'),($3,$4,'user','hello b')`, [conv.a, id.ownerA, conv.b, id.ownerB]);
    await q(`insert into public.assistant_actions(conversation_id,user_id,kind,lead_id,payload,idempotency_key) values ($1,$2,'add_note',$3,'{}','k-a')`, [conv.a, id.ownerA, id.leadA]);
  });

  it('shows each user only their own rows, even to an admin', async () => {
    expect((await as(id.ownerA, () => q(`select title from public.assistant_conversations`))).map((r) => r.title)).toEqual(['A chat']);
    expect((await as(id.ownerB, () => q(`select content from public.assistant_messages`))).map((r) => r.content)).toEqual(['hello b']);
    expect(await as(id.ownerB, () => q(`select * from public.assistant_actions`))).toHaveLength(0);
    expect(await as(id.admin, () => q(`select * from public.assistant_conversations`))).toHaveLength(0);
  });

  it('refuses every client-side write (only the server writes)', async () => {
    await expect(as(id.ownerA, () => q(`insert into public.assistant_messages(conversation_id,user_id,role,content) values ($1,$2,'user','forged')`, [conv.a, id.ownerA]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`insert into public.assistant_conversations(user_id,title) values ($1,'x')`, [id.ownerA]))).rejects.toThrow();
    await as(id.ownerA, () => q(`update public.assistant_actions set status='executed' where user_id=$1`, [id.ownerA]));
    expect((await q(`select status from public.assistant_actions where idempotency_key='k-a'`))[0].status).toBe('proposed'); // the update touched 0 rows
    await as(id.ownerA, () => q(`delete from public.assistant_messages`));
    expect((await q(`select 1 from public.assistant_messages where conversation_id=$1`, [conv.a])).length).toBe(1);
  });

  it('allows a given proposal to be live only once, but again after it was cancelled', async () => {
    const dup = () => q(`insert into public.assistant_actions(conversation_id,user_id,kind,lead_id,payload,idempotency_key) values ($1,$2,'add_note',$3,'{}','k-a')`, [conv.a, id.ownerA, id.leadA]);
    await expect(dup()).rejects.toThrow(/duplicate|unique/i);
    await q(`update public.assistant_actions set status='executed' where idempotency_key='k-a'`);
    await expect(dup()).rejects.toThrow(/duplicate|unique/i); // an executed action can never be proposed-and-run again
    await q(`update public.assistant_actions set status='cancelled' where idempotency_key='k-a'`);
    await dup();
  });

  it('only accepts known action kinds', async () => {
    await expect(q(`insert into public.assistant_actions(conversation_id,user_id,kind,payload,idempotency_key) values ($1,$2,'drop_table','{}','k-x')`, [conv.a, id.ownerA])).rejects.toThrow();
    for (const kind of ['create_document', 'update_document', 'request_signature', 'configure_meta_tracking', 'create_meta_dataset']) {
      await q(`insert into public.assistant_actions(conversation_id,user_id,kind,payload,idempotency_key) values ($1,$2,$3,'{}',$4)`, [conv.a, id.ownerA, kind, `k-${kind}`]);
    }
  });
});

describe('usage log and budget function', () => {
  it('records spend, lets users read only their own usage and admins all, and hides the spend function from clients', async () => {
    await q(`insert into public.assistant_usage(user_id,contractor_id,feature,model,cost_micros) values ($1,$2,'chat','m',1500),($3,$4,'chat','m',2500)`, [id.ownerA, id.companyA, id.ownerB, id.companyB]);
    expect(await as(id.ownerA, () => q(`select cost_micros from public.assistant_usage`))).toHaveLength(1);
    expect((await as(id.admin, () => q(`select * from public.assistant_usage`))).length).toBe(2);
    expect(Number((await q(`select public.assistant_spend_micros(now() - interval '1 day') as n`))[0].n)).toBe(4000);
    expect(Number((await q(`select public.assistant_spend_micros(now() - interval '1 day', $1::uuid) as n`, [id.ownerA]))[0].n)).toBe(1500);
    expect(Number((await q(`select public.assistant_spend_micros(now() - interval '1 day', null, $1::uuid) as n`, [id.companyB]))[0].n)).toBe(2500);
  });
  it('rejects negative usage', async () => {
    await expect(q(`insert into public.assistant_usage(feature,model,cost_micros) values ('chat','m',-1)`)).rejects.toThrow();
  });
});

describe('Meta connections: tenant isolation and token secrecy', () => {
  const conn = { a: randomUUID(), b: randomUUID(), hq: randomUUID() };
  beforeAll(async () => {
    await q(`insert into public.meta_connections(id,contractor_id,meta_user_id) values ($1,$2,'u-a'),($3,$4,'u-b'),($5,null,'u-hq')`, [conn.a, id.companyA, conn.b, id.companyB, conn.hq]);
    await q(`insert into public.meta_connection_secrets(connection_id,token_enc) values ($1,'v1.secret'),($2,'v1.secret2'),($3,'v1.secret3')`, [conn.a, conn.b, conn.hq]);
    await q(`insert into public.meta_funnel_tracking(funnel_id,contractor_id,connection_id,ad_account_id,dataset_id) values ($1,$2,$3,'act_1111','111111111111'),($4,$5,$6,'act_2222','222222222222')`, [id.funnelA, id.companyA, conn.a, id.funnelB, id.companyB, conn.b]);
  });

  it('shows an owner only their own company’s connection and funnel tracking; HomeQuote’s own connection only to admins', async () => {
    expect((await as(id.ownerA, () => q(`select id from public.meta_connections`))).map((r) => r.id)).toEqual([conn.a]);
    expect((await as(id.ownerB, () => q(`select dataset_id from public.meta_funnel_tracking`))).map((r) => r.dataset_id)).toEqual(['222222222222']);
    expect((await as(id.admin, () => q(`select id from public.meta_connections`))).length).toBe(3);
  });
  it('hides Meta setup from non-owner staff and internal setters', async () => {
    expect(await as(id.staffA, () => q(`select * from public.meta_connections`))).toHaveLength(0);
    expect(await as(id.staffA, () => q(`select * from public.meta_funnel_tracking`))).toHaveLength(0);
    expect(await as(id.setter, () => q(`select * from public.meta_connections`))).toHaveLength(0);
  });
  it('never exposes a stored token to any client role, including admins and the owner', async () => {
    for (const u of [id.ownerA, id.admin, id.ownerB]) expect(await as(u, () => q(`select * from public.meta_connection_secrets`))).toHaveLength(0);
  });
  it('refuses client writes and keeps the setup log append-only', async () => {
    await expect(as(id.ownerA, () => q(`insert into public.meta_funnel_tracking(funnel_id,contractor_id,ad_account_id,dataset_id) values ($1,$2,'act_9999','999999999')`, [id.funnelA, id.companyA]))).rejects.toThrow();
    await q(`insert into public.meta_setup_log(actor_user_id,contractor_id,action) values ($1,$2,'meta_connected')`, [id.ownerA, id.companyA]);
    await expect(q(`update public.meta_setup_log set action='x'`)).rejects.toThrow(/immutable/);
    await expect(q(`delete from public.meta_setup_log`)).rejects.toThrow(/immutable/);
  });
  it('validates ids stored for Meta assets', async () => {
    await expect(q(`insert into public.meta_funnel_tracking(funnel_id,ad_account_id,dataset_id) values ($1,'not-an-account','1')`, [randomUUID()])).rejects.toThrow();
  });
});

describe('customer documents', () => {
  const doc = { a: randomUUID(), b: randomUUID() };
  const insertDoc = (docId: string, lead: string, company: string) => q(
    `insert into public.customer_documents(id,doc_type,title,lead_id,contractor_id,template_id,template_version_id,template_name,template_version_no,template_sha256,sections,variables)
     values ($1,'proposal','P',$2,$3,$4,$5,'Proposal',1,$6,'[]','{"total_price":"100"}')`, [docId, lead, company, id.tpl, id.tplVer, sha]);
  beforeAll(async () => { await insertDoc(doc.a, id.leadA, id.companyA); await insertDoc(doc.b, id.leadB, id.companyB); });

  it('isolates documents by contractor company', async () => {
    expect((await as(id.ownerA, () => q(`select id from public.customer_documents`))).map((r) => r.id)).toEqual([doc.a]);
    expect((await as(id.ownerB, () => q(`select id from public.customer_documents`))).map((r) => r.id)).toEqual([doc.b]);
    expect((await as(id.admin, () => q(`select id from public.customer_documents`))).length).toBe(2);
    expect(await as(id.setter, () => q(`select id from public.customer_documents`))).toHaveLength(0);
  });
  it('refuses direct client writes', async () => {
    await expect(as(id.ownerA, () => insertDoc(randomUUID(), id.leadA, id.companyA))).rejects.toThrow();
    await as(id.ownerA, () => q(`update public.customer_documents set title='hacked'`));
    expect((await q(`select title from public.customer_documents where id=$1`, [doc.a]))[0].title).toBe('P');
  });
  it('keeps every version and event, immutable once written', async () => {
    await q(`insert into public.customer_document_versions(document_id,version_no,title,variables,content_sha256,reason) values ($1,1,'P','{}',$2,'created')`, [doc.a, sha]);
    await q(`insert into public.customer_document_versions(document_id,version_no,title,variables,content_sha256,reason) values ($1,2,'P','{}',$2,'edited')`, [doc.a, 'b'.repeat(64)]);
    await expect(q(`insert into public.customer_document_versions(document_id,version_no,title,variables,content_sha256,reason) values ($1,2,'P','{}',$2,'edited')`, [doc.a, sha])).rejects.toThrow(); // version numbers never repeat
    await expect(q(`update public.customer_document_versions set title='x'`)).rejects.toThrow(/immutable/);
    await q(`insert into public.customer_document_events(document_id,event_type,actor_user_id,metadata) values ($1,'signature_approved',$2,'{"approved_by":"x"}')`, [doc.a, id.ownerA]);
    await expect(q(`delete from public.customer_document_events`)).rejects.toThrow(/immutable/);
    expect(await as(id.ownerB, () => q(`select * from public.customer_document_versions`))).toHaveLength(0); // other tenant sees no versions
    expect((await as(id.ownerA, () => q(`select * from public.customer_document_versions`))).length).toBe(2);
  });
  it('freezes the content once sent', async () => {
    await q(`update public.customer_documents set status='sent', sent_at=now() where id=$1`, [doc.a]);
    await expect(q(`update public.customer_documents set variables='{"total_price":"1"}' where id=$1`, [doc.a])).rejects.toThrow(/locked/);
    await expect(q(`update public.customer_documents set title='new' where id=$1`, [doc.a])).rejects.toThrow(/locked/);
    await expect(q(`delete from public.customer_documents where id=$1`, [doc.a])).rejects.toThrow(/locked/);
  });
  it('only lets contractor-facing document types in', async () => {
    await expect(q(`insert into public.customer_documents(doc_type,title,lead_id,contractor_id,template_id,template_version_id,template_name,template_version_no,template_sha256,sections) values ('agreement','x',$1,$2,$3,$4,'x',1,$5,'[]')`, [id.leadA, id.companyA, id.tpl, id.tplVer, sha])).rejects.toThrow();
  });
});

describe('template approval columns', () => {
  it('default existing templates to HomeQuote agreements with no assistant approval', async () => {
    const t = randomUUID();
    await q(`insert into public.contract_templates(id,name,sections) values ($1,'Legacy','[]')`, [t]);
    const r = (await q(`select doc_type, assistant_approved_version, jurisdictions from public.contract_templates where id=$1`, [t]))[0];
    expect(r.doc_type).toBe('agreement'); expect(r.assistant_approved_version).toBeNull(); expect(r.jurisdictions).toEqual([]);
  });
});
