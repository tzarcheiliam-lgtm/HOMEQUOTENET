/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAccessibleLead, tenantOf, isStaff } from '@/lib/assistant/access';
import { brandingSchema, sectionsSchema, type ContractSection } from '@/lib/contracts/types';
import { getAsset } from '@/lib/contracts/storage';
import { renderContractPdf } from '@/lib/contracts/pdf';
import { buildRenderModel } from '@/lib/contracts/render-model';
import { validateContract } from '@/lib/contracts/validate';
import { resolveVariables, todayIso } from '@/lib/contracts/variables';
import { canManageSigning, isHqnAdministrator } from '@/lib/permissions';
import { inspectPdf } from '@/lib/signing/pdf-validate';
import { log } from '@/lib/signing/rpc';
import * as signing from '@/lib/signing/service';
import { ownerKey } from '@/lib/signing/access';
import { removeObject, uploadObject } from '@/lib/signing/storage';
import type { Profile } from '@/lib/types';
import { previewDocument, prefillFromLead, sanitizeValues, templateAllowedForState, type CustomerDocType, type DocPreview } from './preview';

export interface DocActor {
  profile: Profile;
  /** User-scoped client (RLS). */
  db: SupabaseClient;
  /** Service role, used for document/signing tables only after the checks in this file. */
  admin: SupabaseClient;
}

export const canIssueDocuments = (p: Profile) => canManageSigning(p) && (p.role === 'admin' || (p.role === 'contractor' && !!p.contractor_id));

export interface ApprovedTemplate {
  id: string; name: string; docType: CustomerDocType; jurisdictions: string[]; versionId: string; versionNo: number; sha256: string;
  sections: ContractSection[];
}

const EMPTY_CLIENT = { company: '', name: '', email: '', phone: '', address: '' };

/**
 * Templates an admin has approved for customer use: published, not an HQN agreement, and the approval is for the
 * LATEST published version (re-publishing new wording requires a fresh approval).
 */
export async function listApprovedTemplates(admin: SupabaseClient, filter: { docType?: CustomerDocType; state?: string | null } = {}): Promise<ApprovedTemplate[]> {
  let q = admin.from('contract_templates')
    .select('id, name, doc_type, jurisdictions, latest_version_no, assistant_approved_version, status')
    .eq('status', 'published').neq('doc_type', 'agreement').not('assistant_approved_version', 'is', null).is('archived_at', null).limit(100);
  if (filter.docType) q = q.eq('doc_type', filter.docType);
  const { data } = await q;
  const rows = ((data ?? []) as any[]).filter((t) => t.assistant_approved_version === t.latest_version_no);
  if (!rows.length) return [];
  const { data: versions } = await admin.from('contract_template_versions').select('id, template_id, version_no, snapshot, content_sha256').in('template_id', rows.map((r) => r.id));
  const out: ApprovedTemplate[] = [];
  for (const t of rows) {
    const v = ((versions ?? []) as any[]).find((x) => x.template_id === t.id && x.version_no === t.assistant_approved_version);
    if (!v) continue;
    const sections = sectionsSchema.safeParse(v.snapshot?.sections);
    if (!sections.success) continue;
    const item: ApprovedTemplate = { id: t.id, name: t.name, docType: t.doc_type, jurisdictions: (t.jurisdictions ?? []) as string[], versionId: v.id, versionNo: v.version_no, sha256: v.content_sha256, sections: sections.data };
    if (filter.state !== undefined && !templateAllowedForState(item, filter.state)) continue;
    out.push(item);
  }
  return out;
}

export async function loadApprovedTemplate(admin: SupabaseClient, templateId: string, state: string | null): Promise<ApprovedTemplate | null> {
  const all = await listApprovedTemplates(admin, { state });
  return all.find((t) => t.id === templateId) ?? null;
}

/** Which contractor company issues the document. Contractors: their own. Admins: the lead's single assignment, else must choose. */
export async function resolveIssuer(actor: DocActor, leadId: string, requested?: string | null):
  Promise<{ ok: true; contractorId: string; name: string } | { ok: false; error: string; options?: { id: string; name: string }[] }> {
  const tenant = tenantOf(actor.profile);
  const { data: rows } = await actor.admin.from('lead_assignments').select('contractor_id').eq('lead_id', leadId);
  const ids = ((rows ?? []) as any[]).map((r) => r.contractor_id as string);
  const { data: names } = ids.length ? await actor.admin.from('contractors').select('id, name').in('id', ids) : { data: [] };
  const nameOf = new Map(((names ?? []) as any[]).map((c) => [c.id as string, (c.name as string) ?? 'Contractor']));
  const assignments = ids.map((id) => ({ id, name: nameOf.get(id) ?? 'Contractor' }));
  if (tenant) {
    const mine = assignments.find((a) => a.id === tenant);
    return mine ? { ok: true, contractorId: mine.id, name: mine.name } : { ok: false, error: 'not_found' };
  }
  if (!isHqnAdministrator(actor.profile)) return { ok: false, error: 'forbidden' };
  if (requested) {
    const pick = assignments.find((a) => a.id === requested);
    return pick ? { ok: true, contractorId: pick.id, name: pick.name } : { ok: false, error: 'contractor_not_assigned_to_lead' };
  }
  if (assignments.length === 1) return { ok: true, contractorId: assignments[0].id, name: assignments[0].name };
  if (assignments.length === 0) return { ok: false, error: 'lead_not_assigned_to_a_contractor' };
  return { ok: false, error: 'choose_contractor', options: assignments };
}

export type Prepared =
  | { status: 'needs_info'; preview: DocPreview }
  | { status: 'ready'; preview: DocPreview; payload: DraftPayload };

/** What is stored on a proposed 'create_document' action (identifiers + the user's values; never the template text). */
export interface DraftPayload {
  template_id: string; lead_id: string; contractor_id: string; title: string; values: Record<string, string>; lead_filled: string[];
}

/** Builds a document from an approved template and the authorized lead. Missing required values are reported, never invented. */
export async function prepareDocument(actor: DocActor, input: { leadId: string; templateId: string; values?: unknown; title?: string; contractorId?: string | null }):
  Promise<Prepared | { status: 'error'; error: string; options?: { id: string; name: string }[] }> {
  if (!canIssueDocuments(actor.profile)) return { status: 'error', error: 'not_allowed_for_your_role' };
  const lead = await loadAccessibleLead(actor.db, actor.profile, input.leadId);
  if (!lead) return { status: 'error', error: 'not_found' };
  const state = typeof lead.state === 'string' ? lead.state : null;
  const tpl = await loadApprovedTemplate(actor.admin, input.templateId, state);
  if (!tpl) return { status: 'error', error: 'template_not_available_for_this_customer' };
  const issuer = await resolveIssuer(actor, input.leadId, input.contractorId);
  if (!issuer.ok) return { status: 'error', error: issuer.error, options: issuer.options };

  const prefill = prefillFromLead(lead, issuer.name);
  const typed = sanitizeValues(tpl.sections, input.values);
  const values = { ...prefill.values, ...typed };
  const title = (input.title?.trim() || `${tpl.name} – ${values.customer_name ?? 'Customer'}`).slice(0, 200);
  const preview = previewDocument({
    docType: tpl.docType, templateName: tpl.name, templateVersionNo: tpl.versionNo, jurisdiction: tpl.docType === 'contract' ? state?.toUpperCase() ?? null : null,
    title, sections: tpl.sections, values, leadFilled: prefill.filled.filter((k) => !(k in typed)),
  });
  if (preview.missing.length || preview.invalid.length) return { status: 'needs_info', preview };
  return {
    status: 'ready', preview,
    payload: { template_id: tpl.id, lead_id: input.leadId, contractor_id: issuer.contractorId, title, values, lead_filled: prefill.filled },
  };
}

export const contentHashOf = (title: string, templateSha256: string, sections: ContractSection[], values: Record<string, string>) => {
  const resolved = resolveVariables(sections, values, EMPTY_CLIENT, { today: '1970-01-01' });
  const sorted = Object.fromEntries(Object.entries(resolved.values).sort(([a], [b]) => (a < b ? -1 : 1)));
  return createHash('sha256').update(JSON.stringify({ t: title, tpl: templateSha256, v: sorted })).digest('hex');
};

async function addEvent(admin: SupabaseClient, documentId: string, type: string, actorId: string, metadata: Record<string, unknown>) {
  await admin.from('customer_document_events').insert({ document_id: documentId, event_type: type, actor_user_id: actorId, via: 'assistant', metadata });
}

/** Re-validates against the approved template and writes version 1. Used only after the user confirmed the preview. */
export async function createDocument(actor: DocActor, payload: DraftPayload, actionId: string):
  Promise<{ ok: true; documentId: string; title: string; versionNo: number } | { ok: false; error: string }> {
  const re = await prepareDocument(actor, { leadId: payload.lead_id, templateId: payload.template_id, values: payload.values, title: payload.title, contractorId: payload.contractor_id });
  if (re.status !== 'ready') return { ok: false, error: re.status === 'needs_info' ? 'Some required information is still missing.' : 'This document can no longer be created from that template.' };
  // Jurisdiction was enforced by prepareDocument above; here we only need the approved snapshot itself.
  const tpl = (await listApprovedTemplates(actor.admin)).find((t) => t.id === payload.template_id) ?? null;
  if (!tpl) return { ok: false, error: 'The template is no longer approved.' };
  const lead = await loadAccessibleLead(actor.db, actor.profile, payload.lead_id);
  if (!lead) return { ok: false, error: 'You no longer have access to this lead.' };
  const customer = { name: re.payload.values.customer_name ?? '', email: re.payload.values.customer_email ?? '', phone: re.payload.values.customer_phone ?? '' };
  const sha = contentHashOf(re.payload.title, tpl.sha256, tpl.sections, re.payload.values);

  const { data: doc, error } = await actor.admin.from('customer_documents').insert({
    doc_type: tpl.docType, title: re.payload.title, lead_id: payload.lead_id, contractor_id: re.payload.contractor_id, template_id: tpl.id,
    template_version_id: tpl.versionId, template_name: tpl.name, template_version_no: tpl.versionNo, template_sha256: tpl.sha256,
    jurisdiction: re.preview.jurisdiction, sections: tpl.sections, variables: re.payload.values, customer, created_by: actor.profile.id, created_via: 'assistant',
  }).select('id').single();
  if (error || !doc) return { ok: false, error: 'The document could not be saved.' };
  const ver = await actor.admin.from('customer_document_versions').insert({
    document_id: doc.id, version_no: 1, title: re.payload.title, variables: re.payload.values, content_sha256: sha, reason: 'created', created_by: actor.profile.id, created_via: 'assistant',
  });
  if (ver.error) {
    await actor.admin.from('customer_documents').delete().eq('id', doc.id);
    return { ok: false, error: 'The document could not be saved.' };
  }
  await addEvent(actor.admin, doc.id, 'created', actor.profile.id, { version_no: 1, content_sha256: sha, template_version_no: tpl.versionNo, template_sha256: tpl.sha256, assistant_action_id: actionId, approved_by: actor.profile.id });
  return { ok: true, documentId: doc.id, title: re.payload.title, versionNo: 1 };
}

export interface LoadedDocument {
  id: string; doc_type: CustomerDocType; title: string; lead_id: string; contractor_id: string; template_id: string; template_name: string; template_version_no: number;
  template_sha256: string; jurisdiction: string | null; sections: ContractSection[]; variables: Record<string, string>; customer: { name: string; email: string; phone: string };
  status: 'draft' | 'sent' | 'voided'; current_version_no: number; signing_document_id: string | null; signing_version_id: string | null; sent_at: string | null; created_at: string;
}

/** A document the signed-in user may act on, or null. Same answer for "missing" and "someone else's". */
export async function loadDocumentForActor(actor: DocActor, documentId: string): Promise<LoadedDocument | null> {
  if (!canIssueDocuments(actor.profile)) return null;
  const { data } = await actor.admin.from('customer_documents').select('*').eq('id', documentId).maybeSingle();
  if (!data) return null;
  const doc = data as any;
  if (!isHqnAdministrator(actor.profile) && doc.contractor_id !== actor.profile.contractor_id) return null;
  if (!(await loadAccessibleLead(actor.db, actor.profile, doc.lead_id))) return null;
  return doc as LoadedDocument;
}

export async function listDocumentsForActor(actor: DocActor, leadId: string | null, limit = 10) {
  if (!canIssueDocuments(actor.profile)) return [];
  let q = actor.admin.from('customer_documents').select('id, doc_type, title, status, current_version_no, lead_id, created_at, sent_at').order('created_at', { ascending: false }).limit(limit);
  const tenant = tenantOf(actor.profile);
  if (tenant) q = q.eq('contractor_id', tenant);
  if (leadId) {
    if (!(await loadAccessibleLead(actor.db, actor.profile, leadId))) return [];
    q = q.eq('lead_id', leadId);
  } else if (isStaff(actor.profile) && !isHqnAdministrator(actor.profile)) return [];
  const { data } = await q;
  return (data ?? []) as any[];
}

export function previewOfDocument(doc: LoadedDocument, valuesOverride?: Record<string, string>): DocPreview {
  const values = valuesOverride ?? doc.variables;
  return previewDocument({
    docType: doc.doc_type, templateName: doc.template_name, templateVersionNo: doc.template_version_no, jurisdiction: doc.jurisdiction, title: doc.title,
    sections: sectionsSchema.parse(doc.sections), values,
  });
}

/** Saves edited merge-field values as a NEW version. The approved wording cannot change. */
export async function editDocument(actor: DocActor, documentId: string, rawValues: unknown, expectedVersionNo: number, actionId: string):
  Promise<{ ok: true; versionNo: number; title: string } | { ok: false; error: string }> {
  const doc = await loadDocumentForActor(actor, documentId);
  if (!doc) return { ok: false, error: 'Document not found or access denied.' };
  if (doc.status !== 'draft') return { ok: false, error: 'This document was already sent and can no longer be edited.' };
  if (doc.current_version_no !== expectedVersionNo) return { ok: false, error: 'This document changed since the edit was proposed. Ask again.' };
  const sections = sectionsSchema.parse(doc.sections);
  const values = { ...doc.variables, ...sanitizeValues(sections, rawValues) };
  const preview = previewOfDocument(doc, values);
  if (preview.missing.length || preview.invalid.length) return { ok: false, error: 'Some required information is missing or invalid.' };
  const next = doc.current_version_no + 1;
  const sha = contentHashOf(doc.title, doc.template_sha256, sections, values);
  const customer = { name: values.customer_name ?? doc.customer.name, email: values.customer_email ?? doc.customer.email, phone: values.customer_phone ?? doc.customer.phone };
  const ver = await actor.admin.from('customer_document_versions').insert({
    document_id: doc.id, version_no: next, title: doc.title, variables: values, content_sha256: sha, reason: 'edited', created_by: actor.profile.id, created_via: 'assistant',
  });
  if (ver.error) return { ok: false, error: 'The change could not be saved.' };
  // Optimistic concurrency: only the request that still sees the old version number wins.
  const { data: upd } = await actor.admin.from('customer_documents').update({ variables: values, customer, current_version_no: next })
    .eq('id', doc.id).eq('current_version_no', expectedVersionNo).eq('status', 'draft').select('id').maybeSingle();
  if (!upd) return { ok: false, error: 'This document changed while saving. Ask again.' };
  await addEvent(actor.admin, doc.id, 'edited', actor.profile.id, { version_no: next, content_sha256: sha, assistant_action_id: actionId, approved_by: actor.profile.id });
  return { ok: true, versionNo: next, title: doc.title };
}

export interface SignatureBlocker { code: string; message: string }

/** Everything that must be true before a signature request is even offered for approval. */
export function signatureBlockers(doc: LoadedDocument, actor: Profile): SignatureBlocker[] {
  const out: SignatureBlocker[] = [];
  const sections = sectionsSchema.parse(doc.sections);
  if (doc.status !== 'draft') out.push({ code: 'not_draft', message: 'This document was already sent.' });
  const customer = { role: 'client' as const, label: 'Customer', name: doc.customer.name, email: doc.customer.email };
  const issuer = { role: 'homequote' as const, label: 'Contractor', name: actor.full_name ?? actor.email ?? '', email: actor.email ?? '' };
  const report = validateContract({ sections, variables: doc.variables, client: EMPTY_CLIENT, signers: [customer, issuer], placeholdersAcknowledged: false, today: todayIso() });
  for (const e of report.errors) {
    if (e.code === 'placeholders_unacknowledged') out.push({ code: 'review_passages', message: 'The approved template still contains [REVIEW: …] passages. An admin must replace them with approved wording and re-approve the template.' });
    else out.push({ code: e.code, message: e.message });
  }
  return out;
}

/** Renders the exact PDF the customer would sign (also used to check it can be produced). */
async function renderDocPdf(actorAdmin: SupabaseClient, doc: LoadedDocument, actor: Profile, contractorName: string) {
  const sections = sectionsSchema.parse(doc.sections);
  const today = todayIso();
  const values = { ...doc.variables, contract_date: today };
  const customerSigner = { role: 'client' as const, label: 'Customer', name: doc.customer.name, email: doc.customer.email };
  const issuerSigner = { role: 'homequote' as const, label: 'Contractor', name: actor.full_name ?? actor.email ?? '', email: actor.email ?? '' };
  const report = validateContract({ sections, variables: values, client: EMPTY_CLIENT, signers: [customerSigner, issuerSigner], placeholdersAcknowledged: false, today });
  if (report.errors.length) throw new Error(report.errors[0].message);
  const model = buildRenderModel(sections, report.resolved.values);
  const { data: c } = await actorAdmin.from('contractors').select('logo_path').eq('id', doc.contractor_id).maybeSingle();
  const logo = c?.logo_path ? await getAsset(c.logo_path) : null;
  const out = await renderContractPdf({
    title: doc.title, contractNo: null, model, branding: brandingSchema.parse({ mode: logo ? 'client_only' : 'none', useCrmLogo: false }),
    clientName: doc.customer.name, hqName: contractorName, hqLogo: null, clientLogo: logo, signers: [customerSigner, issuerSigner], exhibits: [],
  });
  return { out, signers: [customerSigner, issuerSigner] };
}

/**
 * Sends the document to the customer for e-signature using the existing signing engine (secure link by email).
 * Only called after the user approved THIS exact version. Records the approval, and fails closed.
 */
export async function requestSignature(actor: DocActor, documentId: string, approved: { versionNo: number; contentSha256: string }, actionId: string):
  Promise<{ ok: true; recipients: string[] } | { ok: false; error: string }> {
  const doc = await loadDocumentForActor(actor, documentId);
  if (!doc) return { ok: false, error: 'Document not found or access denied.' };
  if (doc.status !== 'draft' || doc.signing_version_id) return { ok: false, error: 'This document was already sent.' };
  if (doc.current_version_no !== approved.versionNo) return { ok: false, error: 'The document changed after you reviewed it. Ask the assistant to prepare the signature request again.' };
  const sections = sectionsSchema.parse(doc.sections);
  if (contentHashOf(doc.title, doc.template_sha256, sections, doc.variables) !== approved.contentSha256) {
    return { ok: false, error: 'The document content no longer matches what you approved. Ask again.' };
  }
  const blockers = signatureBlockers(doc, actor.profile);
  if (blockers.length) return { ok: false, error: blockers[0].message };

  await addEvent(actor.admin, doc.id, 'signature_approved', actor.profile.id, { version_no: approved.versionNo, content_sha256: approved.contentSha256, assistant_action_id: actionId, approved_by: actor.profile.id });

  const { data: contractor } = await actor.admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle();
  const contractorName = (contractor?.name as string | undefined) ?? 'Contractor';
  const sigDocId = randomUUID(), versionId = randomUUID();
  const path = `${ownerKey(doc.contractor_id)}/${sigDocId}/${versionId}.pdf`;
  const cleanup = async () => {
    try { await actor.admin.from('signing_versions').delete().eq('id', versionId); } catch { /* ignore */ }
    try { await actor.admin.from('signing_documents').update({ current_version_id: null }).eq('id', sigDocId); await actor.admin.from('signing_documents').delete().eq('id', sigDocId); } catch { /* ignore */ }
    await removeObject(path).catch(() => undefined);
  };
  let sentOut = false;
  try {
    const { out, signers } = await renderDocPdf(actor.admin, doc, actor.profile, contractorName);
    const inspected = await inspectPdf(out.bytes);
    await uploadObject(path, out.bytes);
    const ins = await actor.admin.from('signing_documents').insert({ id: sigDocId, contractor_id: doc.contractor_id, lead_id: doc.lead_id, title: doc.title, created_by: actor.profile.id });
    if (ins.error) throw new Error('signing document');
    const vIns = await actor.admin.from('signing_versions').insert({
      id: versionId, document_id: sigDocId, version_no: 1, original_path: path, original_sha256: inspected.sha256, original_size: inspected.size, page_count: inspected.pageCount,
      pages: inspected.pages, detection: { methods: ['customer_document'], notes: [`Generated from customer document ${doc.id} v${approved.versionNo}.`], processing: 'local' }, created_by: actor.profile.id,
    });
    if (vIns.error) throw new Error('signing version');
    await actor.admin.from('signing_documents').update({ current_version_id: versionId }).eq('id', sigDocId);
    await log(versionId, 'version_created', actor.profile, { version_no: 1, original_sha256: inspected.sha256, pages: inspected.pageCount, customer_document_id: doc.id });

    await signing.saveDraft(actor.profile, versionId, {
      subject: `Please review and sign: ${doc.title}`, message: '', signing_order: 'parallel', expiry_days: 14, auto_remind_days: 3, auto_remind_max: 3, require_access_code: false,
      recipients: signers.map((x) => ({ name: x.name, email: x.email })),
      fields: out.fields.map((f) => ({
        recipient_index: f.signerIndex + 1, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: true, label: f.label, group_key: null,
        prefill_value: null, date_format: f.type === 'date' ? 'MMM d, yyyy' : null, source: 'manual', confidence: null, needs_review: false, reviewed: true,
        role_hint: null, detection_note: null, source_ref: null,
      })),
    });
    await signing.markReviewed(actor.profile, versionId);

    // Single winner: only one request can attach a signing version to this document.
    const { data: claimed } = await actor.admin.from('customer_documents').update({ signing_document_id: sigDocId, signing_version_id: versionId })
      .eq('id', doc.id).eq('status', 'draft').is('signing_version_id', null).select('id').maybeSingle();
    if (!claimed) throw new Error('already sent');

    await signing.sendForSignature(actor.profile, versionId);
    // From here the request may be out: never roll back signing rows, only record what happened.
    sentOut = true;
    await actor.admin.from('customer_documents').update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: actor.profile.id }).eq('id', doc.id);
    await addEvent(actor.admin, doc.id, 'signature_requested', actor.profile.id, {
      version_no: approved.versionNo, content_sha256: approved.contentSha256, signing_version_id: versionId, document_sha256: inspected.sha256,
      recipients: signers.map((s) => s.email), assistant_action_id: actionId, approved_by: actor.profile.id,
    }).catch(() => undefined);
    return { ok: true, recipients: signers.map((s) => s.email) };
  } catch (e) {
    if (sentOut) return { ok: true, recipients: [doc.customer.email] };
    await cleanup();
    await actor.admin.from('customer_documents').update({ signing_document_id: null, signing_version_id: null }).eq('id', doc.id).eq('status', 'draft');
    await addEvent(actor.admin, doc.id, 'signature_failed', actor.profile.id, { assistant_action_id: actionId, version_no: approved.versionNo });
    return { ok: false, error: e instanceof Error && /already sent/.test(e.message) ? 'This document was already sent.' : 'The signature request could not be sent. Nothing was sent to the customer.' };
  }
}
