/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { FakeStorage, fakeSupabase } from './helpers/pglite-supabase';
import { tenantDb } from './helpers/tenant-db';

const h = vi.hoisted(() => ({ client: null as any, emails: [] as any[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: async (m: any) => { h.emails.push(m); return { id: 'm', fromEmail: 'hq@test' }; } }));
vi.mock('@/lib/actions/leads', () => ({ changeLeadStatus: vi.fn(), updateAssignmentStatus: vi.fn() }));

import { CUSTOMER_STARTER_TEMPLATES } from '@/lib/contracts/library';
import { decideAction } from '@/lib/assistant/execute';
import { runTool } from '@/lib/assistant/registry';
import type { ToolContext } from '@/lib/assistant/tools';
import {
  createDocument, editDocument, listApprovedTemplates, loadDocumentForActor, prepareDocument, requestSignature, signatureBlockers, contentHashOf, type DocActor,
} from '@/lib/documents/service';
import { prefillFromLead, previewDocument, sanitizeValues, templateAllowedForState } from '@/lib/documents/preview';
import type { Profile } from '@/lib/types';

let pg: PGlite; let storage: FakeStorage; let rls: any;
const id = Object.fromEntries(['admin', 'ownerA', 'staffA', 'ownerB', 'setter', 'companyA', 'companyB', 'lead', 'leadTX', 'tplProposal', 'tplContractCA', 'tplContractTX', 'tplDraft', 'tplStale', 'tplReview'].map((k) => [k, randomUUID()])) as Record<string, string>;
const q = async (sql: string, p?: unknown[]) => (await pg.query<any>(sql, p)).rows;
const profile = (o: Partial<Profile>): Profile => ({
  id: randomUUID(), role: 'contractor', contractor_id: id.companyA, contractor_role: 'owner', can_export_company_data: false, full_name: 'Casey Owner', email: 'casey@acme.test',
  phone: null, is_active: true, account_status: 'active', last_login_at: null, deleted_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...o,
});
const owner = () => profile({ id: id.ownerA });
const actor = (p: Profile): DocActor => ({ profile: p, db: rls, admin: h.client });
const proposal = CUSTOMER_STARTER_TEMPLATES.find((t) => t.starterKey === 'customer_proposal')!;

async function addTemplate(tid: string, name: string, docType: string, sections: unknown, o: { approved?: number | null; latest?: number; jurisdictions?: string[] } = {}) {
  const latest = o.latest ?? 1;
  await q(`insert into public.contract_templates(id,name,status,sections,doc_type,latest_version_no,assistant_approved_version,jurisdictions) values ($1,$2,'published',$3,$4,$5,$6,$7)`,
    [tid, name, JSON.stringify(sections), docType, latest, o.approved === undefined ? 1 : o.approved, o.jurisdictions ?? []]);
  const vid = randomUUID();
  await q(`insert into public.contract_template_versions(id,template_id,version_no,snapshot,content_sha256) values ($1,$2,$3,$4,$5)`, [vid, tid, o.approved ?? latest, JSON.stringify({ sections }), 'c'.repeat(64)]);
}

beforeAll(async () => {
  pg = await fullSchema({ supabaseGrants: true });
  storage = new FakeStorage(); h.client = fakeSupabase(pg, storage); rls = tenantDb(pg);
  await q(`insert into public.contractors(id,name) values ($1,'Acme Pools'),($2,'Other Co')`, [id.companyA, id.companyB]);
  for (const [uid, role, company, crole, email] of [
    [id.admin, 'admin', null, null, 'admin@hq.test'], [id.setter, 'setter', null, null, 'setter@hq.test'],
    [id.ownerA, 'contractor', id.companyA, 'owner', 'casey@acme.test'], [id.staffA, 'contractor', id.companyA, 'staff', 'sam@acme.test'], [id.ownerB, 'contractor', id.companyB, 'owner', 'bo@other.test'],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, email]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active', email=$5, full_name=$6 where id=$1`, [uid, role, company, crole, email, email.split('@')[0]]);
  }
  await q(`insert into public.leads(id,first_name,last_name,email,phone,address,city,state,zip,project_description) values ($1,'Sarah','Lee','sarah@example.com','(555) 010-0142','12 Main St','Springfield','CA','90001','Resurface the pool')`, [id.lead]);
  await q(`insert into public.leads(id,first_name,last_name,email,state) values ($1,'Tex','Mex','tex@example.com','TX')`, [id.leadTX]);
  await q(`insert into public.lead_assignments(lead_id,contractor_id) values ($1,$2),($3,$2)`, [id.lead, id.companyA, id.leadTX]);
  await addTemplate(id.tplProposal, 'Customer Proposal', 'proposal', proposal.sections);
  await addTemplate(id.tplContractCA, 'California Contract', 'contract', proposal.sections, { jurisdictions: ['CA'] });
  await addTemplate(id.tplContractTX, 'Texas Contract', 'contract', proposal.sections, { jurisdictions: ['TX'] });
  await addTemplate(id.tplDraft, 'Unapproved Work Order', 'work_order', proposal.sections, { approved: null });
  await addTemplate(id.tplStale, 'Re-published Since Approval', 'work_order', proposal.sections, { approved: 1, latest: 2 });
  await addTemplate(id.tplReview, 'Has Review Passage', 'work_order', [{ ...proposal.sections[0], doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[REVIEW: counsel to confirm] {{customer_name}} {{customer_email}} {{contractor_company}} {{project_address}} {{project_description}} {{contract_date}}' }] }] } }, proposal.sections.at(-1)], {});
}, 240_000);
afterAll(async () => { await pg?.close(); });

const GOOD = { scope_of_work: 'Resurface pool and replace tile', total_price: '24500', payment_schedule: '50% deposit, 50% on completion' };

describe('approved templates only', () => {
  it('offers only templates an admin approved for the CURRENT published version', async () => {
    const names = (await listApprovedTemplates(h.client)).map((t) => t.name).sort();
    expect(names).toEqual(['California Contract', 'Customer Proposal', 'Has Review Passage', 'Texas Contract']);
    expect(names).not.toContain('Unapproved Work Order'); expect(names).not.toContain('Re-published Since Approval');
  });
  it('offers a contract only for a customer in a state its wording is approved for', async () => {
    expect((await listApprovedTemplates(h.client, { docType: 'contract', state: 'CA' })).map((t) => t.name)).toEqual(['California Contract']);
    expect((await listApprovedTemplates(h.client, { docType: 'contract', state: 'TX' })).map((t) => t.name)).toEqual(['Texas Contract']);
    expect(await listApprovedTemplates(h.client, { docType: 'contract', state: 'NY' })).toEqual([]);
    expect(await listApprovedTemplates(h.client, { docType: 'contract', state: null })).toEqual([]);
    expect(templateAllowedForState({ docType: 'proposal', jurisdictions: [] }, null)).toBe(true);
    expect(templateAllowedForState({ docType: 'contract', jurisdictions: [] }, 'CA')).toBe(false); // an untagged contract is never offered
  });
});

describe('preparing a document never invents scope, price or terms', () => {
  it('fills the customer from the lead and asks for everything else', async () => {
    const r = await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplProposal });
    expect(r.status).toBe('needs_info');
    if (r.status !== 'needs_info') return;
    expect(r.preview.missing.map((m) => m.key).sort()).toEqual(['payment_schedule', 'scope_of_work', 'total_price']);
    const filled = Object.fromEntries(r.preview.fields.map((f) => [f.key, f.value]));
    expect(filled).toMatchObject({ customer_name: 'Sarah Lee', customer_email: 'sarah@example.com', contractor_company: 'Acme Pools', project_address: '12 Main St, Springfield, CA 90001' });
    expect(filled.total_price).toBe(''); expect(filled.scope_of_work).toBe('');
  });
  it('becomes ready only when the user supplies the missing terms, and rejects a bad amount', async () => {
    const bad = await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplProposal, values: { ...GOOD, total_price: 'lots' } });
    expect(bad.status).toBe('needs_info'); expect(bad.status === 'needs_info' && bad.preview.invalid.map((i) => i.key)).toEqual(['total_price']);
    const ready = await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplProposal, values: GOOD });
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') return;
    expect(ready.preview.sections.map((s) => s.text).join('\n')).toMatch(/\$24,500\.00/);
  });
  it('drops anything that is not an editable field (the wording and system fields cannot be overridden)', () => {
    const v = sanitizeValues(proposal.sections, { total_price: '1', contract_date: '2000-01-01', homequote_company: 'Evil Co', sections: 'x', __proto__: 'y', scope_of_work: 5 });
    expect(v).toEqual({ total_price: '1' });
  });
  it('refuses a template that is not approved, is the wrong state, or a lead the user cannot see', async () => {
    expect(await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplDraft, values: GOOD })).toMatchObject({ status: 'error', error: 'template_not_available_for_this_customer' });
    expect(await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplContractTX, values: GOOD })).toMatchObject({ status: 'error' });
    expect(await prepareDocument(actor(profile({ id: id.ownerB, contractor_id: id.companyB })), { leadId: id.lead, templateId: id.tplProposal, values: GOOD })).toMatchObject({ status: 'error', error: 'not_found' });
    expect(await prepareDocument(actor(profile({ role: 'setter', contractor_id: null })), { leadId: id.lead, templateId: id.tplProposal, values: GOOD })).toMatchObject({ status: 'error', error: 'not_allowed_for_your_role' });
  });
  it('previews the exact wording and flags [REVIEW] passages', () => {
    const t = proposal.sections;
    const p = previewDocument({ docType: 'proposal', templateName: 'x', templateVersionNo: 1, jurisdiction: null, title: 'T', sections: t, values: { ...prefillFromLead({ first_name: 'A', last_name: 'B' }, 'Co').values, ...GOOD } });
    expect(p.reviewPassages).toBe(0);
  });
});

describe('saving, versions and access', () => {
  let docId: string; let payload: any;
  it('saves a draft only through the confirmed action, keeping version 1 and who approved it', async () => {
    const ready = await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplProposal, values: GOOD });
    if (ready.status !== 'ready') throw new Error('not ready');
    payload = ready.payload;
    const r = await createDocument(actor(owner()), payload, 'action-1');
    expect(r.ok).toBe(true); if (!r.ok) return;
    docId = r.documentId;
    const row = (await q(`select * from public.customer_documents where id=$1`, [docId]))[0];
    expect(row).toMatchObject({ status: 'draft', lead_id: id.lead, contractor_id: id.companyA, current_version_no: 1, template_version_no: 1 });
    expect(row.customer).toMatchObject({ name: 'Sarah Lee', email: 'sarah@example.com' });
    expect((await q(`select version_no, reason from public.customer_document_versions where document_id=$1`, [docId]))).toEqual([{ version_no: 1, reason: 'created' }]);
    expect((await q(`select event_type, actor_user_id, metadata from public.customer_document_events where document_id=$1`, [docId]))[0]).toMatchObject({ event_type: 'created', actor_user_id: id.ownerA, metadata: { approved_by: id.ownerA, assistant_action_id: 'action-1' } });
  });
  it('stores a new version for every edit and keeps the old one', async () => {
    const r = await editDocument(actor(owner()), docId, { total_price: '26000', contract_date: '1999-01-01' }, 1, 'action-2');
    expect(r).toMatchObject({ ok: true, versionNo: 2 });
    const doc = (await q(`select variables, current_version_no from public.customer_documents where id=$1`, [docId]))[0];
    expect(doc.variables.total_price).toBe('26000'); expect(doc.variables.contract_date).toBeUndefined(); expect(doc.current_version_no).toBe(2);
    expect((await q(`select version_no, variables from public.customer_document_versions where document_id=$1 order by version_no`, [docId])).map((v) => [v.version_no, v.variables.total_price])).toEqual([[1, '24500'], [2, '26000']]);
    expect(await editDocument(actor(owner()), docId, { total_price: '1' }, 1, 'action-3')).toMatchObject({ ok: false }); // stale: someone edited since
  });
  it('shows a document only to its own company and admins', async () => {
    expect(await loadDocumentForActor(actor(owner()), docId)).not.toBeNull();
    expect(await loadDocumentForActor(actor(profile({ id: id.staffA, contractor_role: 'staff' })), docId)).not.toBeNull();
    expect(await loadDocumentForActor(actor(profile({ id: id.ownerB, contractor_id: id.companyB })), docId)).toBeNull();
    expect(await loadDocumentForActor(actor(profile({ role: 'setter', contractor_id: null })), docId)).toBeNull();
    expect(await loadDocumentForActor(actor(profile({ id: id.admin, role: 'admin', contractor_id: null })), docId)).not.toBeNull();
    expect(await editDocument(actor(profile({ id: id.ownerB, contractor_id: id.companyB })), docId, { total_price: '1' }, 2, 'x')).toMatchObject({ ok: false });
  });
  it('blocks sending until the document is complete and free of review passages', async () => {
    const doc = (await loadDocumentForActor(actor(owner()), docId))!;
    expect(signatureBlockers(doc, owner())).toEqual([]);
    expect(signatureBlockers({ ...doc, customer: { ...doc.customer, email: '' } }, owner()).map((b) => b.code)).toContain('bad_signer');
    expect(signatureBlockers({ ...doc, status: 'sent' }, owner()).map((b) => b.code)).toContain('not_draft');
    expect(signatureBlockers(doc, profile({ email: null }))).not.toEqual([]); // the contractor signer needs an email too
    const withReview = { ...doc, sections: (await q(`select sections from public.contract_templates where id=$1`, [id.tplReview]))[0].sections };
    expect(signatureBlockers({ ...withReview, variables: { ...doc.variables } }, owner()).map((b) => b.code)).toContain('review_passages');
  });
});

describe('sending is a separate approval, bound to the exact version', () => {
  let docId: string; let sha: string;
  beforeAll(async () => {
    const ready = await prepareDocument(actor(owner()), { leadId: id.lead, templateId: id.tplProposal, values: { ...GOOD, scope_of_work: 'Send test scope' } });
    if (ready.status !== 'ready') throw new Error('not ready');
    const r = await createDocument(actor(owner()), ready.payload, 'a-send');
    if (!r.ok) throw new Error(r.error);
    docId = r.documentId;
    const doc = (await loadDocumentForActor(actor(owner()), docId))!;
    sha = contentHashOf(doc.title, doc.template_sha256, doc.sections, doc.variables);
  });
  const signingRows = async () => (await q(`select count(*)::int as n from public.signing_documents where lead_id=$1`, [id.lead]))[0].n;

  it('refuses when the version or content changed after the user reviewed it, and sends nothing', async () => {
    const before = await signingRows();
    expect(await requestSignature(actor(owner()), docId, { versionNo: 99, contentSha256: sha }, 'x')).toMatchObject({ ok: false });
    expect(await requestSignature(actor(owner()), docId, { versionNo: 1, contentSha256: 'f'.repeat(64) }, 'x')).toMatchObject({ ok: false });
    expect(await requestSignature(actor(profile({ id: id.ownerB, contractor_id: id.companyB })), docId, { versionNo: 1, contentSha256: sha }, 'x')).toMatchObject({ ok: false });
    expect(await signingRows()).toBe(before); expect(h.emails).toHaveLength(0);
    expect((await q(`select status from public.customer_documents where id=$1`, [docId]))[0].status).toBe('draft');
  });

  it('sends for e-signature once approved, links it to the lead and company, and records who approved', async () => {
    const r = await requestSignature(actor(owner()), docId, { versionNo: 1, contentSha256: sha }, 'a-sign');
    expect(r).toMatchObject({ ok: true });
    const doc = (await q(`select status, sent_by, signing_document_id, signing_version_id from public.customer_documents where id=$1`, [docId]))[0];
    expect(doc).toMatchObject({ status: 'sent', sent_by: id.ownerA }); expect(doc.signing_version_id).toBeTruthy();
    expect((await q(`select lead_id, contractor_id from public.signing_documents where id=$1`, [doc.signing_document_id]))[0]).toEqual({ lead_id: id.lead, contractor_id: id.companyA });
    const events = await q(`select event_type, actor_user_id, metadata from public.customer_document_events where document_id=$1 order by id`, [docId]);
    expect(events.map((e) => e.event_type)).toEqual(['created', 'signature_approved', 'signature_requested']);
    expect(events[1]).toMatchObject({ actor_user_id: id.ownerA, metadata: { approved_by: id.ownerA, assistant_action_id: 'a-sign', version_no: 1 } });
    expect(events[2].metadata.recipients).toEqual(['sarah@example.com', 'casey@acme.test']);
    expect(h.emails.length).toBeGreaterThan(0);
  });

  it('cannot be sent twice, and a sent document can no longer be edited', async () => {
    const sentBefore = h.emails.length;
    expect(await requestSignature(actor(owner()), docId, { versionNo: 1, contentSha256: sha }, 'again')).toMatchObject({ ok: false, error: expect.stringMatching(/already sent/i) });
    expect(await editDocument(actor(owner()), docId, { total_price: '1' }, 1, 'late')).toMatchObject({ ok: false });
    expect(h.emails.length).toBe(sentBefore);
  });
});

describe('through the assistant: proposals need confirmation and are not executed by proposing', () => {
  const ctxFor = (p: Profile): ToolContext => ({ db: rls, admin: h.client, profile: p, tz: 'America/Los_Angeles', conversationId: '', now: new Date('2026-10-19T12:00:00Z') });
  it('prepare_document asks for missing terms, then shows an editable preview, saving nothing until Confirm', async () => {
    const conv = randomUUID();
    await q(`insert into public.assistant_conversations(id,user_id,title) values ($1,$2,'t')`, [conv, id.ownerA]);
    const ctx = { ...ctxFor(owner()), conversationId: conv };
    const first = await runTool(ctx, 'prepare_document', { lead_id: id.lead, template_id: id.tplProposal });
    expect((first.result as any).status).toBe('needs_info');
    expect((first.result as any).ask_the_user_for.map((f: any) => f.field).sort()).toEqual(['payment_schedule', 'scope_of_work', 'total_price']);
    const before = (await q(`select count(*)::int as n from public.customer_documents`))[0].n;
    const second = await runTool(ctx, 'prepare_document', { lead_id: id.lead, template_id: id.tplProposal, values: { ...GOOD, scope_of_work: 'Assistant scope' } });
    expect((second.result as any).status).toBe('preview_ready');
    expect((await q(`select count(*)::int as n from public.customer_documents`))[0].n).toBe(before); // proposing wrote no document
    const action = (await q(`select id, kind, status, preview from public.assistant_actions where conversation_id=$1`, [conv]))[0];
    expect(action).toMatchObject({ kind: 'create_document', status: 'proposed' }); expect(action.preview.document.fields.length).toBeGreaterThan(5);

    // The user corrects the price in the preview and confirms: the corrected value is what gets saved.
    const decided = await decideAction({ db: rls, admin: h.client, profile: owner(), tz: 'America/Los_Angeles' }, action.id, 'confirm', { values: { total_price: '31000' } });
    expect(decided).toMatchObject({ ok: true, action: { status: 'executed' } });
    const saved = (await q(`select variables from public.customer_documents where title like '%Sarah Lee%' order by created_at desc limit 1`))[0];
    expect(saved.variables.total_price).toBe('31000');
    expect(await decideAction({ db: rls, admin: h.client, profile: owner(), tz: 'x' }, action.id, 'confirm')).toMatchObject({ ok: true, duplicate: true });
    expect((await q(`select count(*)::int as n from public.customer_documents`))[0].n).toBe(before + 1);
  });
  it('lists no templates (and tells the model not to write its own) when none are approved for the state', async () => {
    const r = await runTool(ctxFor(owner()), 'list_document_templates', { doc_type: 'contract', lead_id: id.leadTX });
    expect((r.result as any).templates.map((t: any) => t.name)).toEqual(['Texas Contract']);
    await q(`update public.leads set state='NY' where id=$1`, [id.leadTX]);
    const none = await runTool(ctxFor(owner()), 'list_document_templates', { doc_type: 'contract', lead_id: id.leadTX });
    expect((none.result as any).count).toBe(0); expect((none.result as any).note).toMatch(/Do not write the document text yourself/);
  });
  it('propose_signature_request is blocked while the draft is incomplete', async () => {
    const r = await runTool(ctxFor(owner()), 'propose_signature_request', { document_id: randomUUID() });
    expect(r.result).toEqual({ error: 'not_found' });
  });
});
