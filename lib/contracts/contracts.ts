/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractError, contractMessage } from '@/lib/contracts/errors';
import { normalizeLogo, LogoRejected, loadHomeQuoteLogo } from '@/lib/contracts/logo';
import { renderContractPdf, ContractRenderError, type PdfSigner } from '@/lib/contracts/pdf';
import { buildRenderModel } from '@/lib/contracts/render-model';
import { deriveStatus, isOpen, type ContractStatus } from '@/lib/contracts/status';
import { assetUrl, getAsset, putAsset, removeAsset } from '@/lib/contracts/storage';
import { isUuid, requireAdmin } from '@/lib/contracts/templates';
import {
  LIMITS, brandingSchema, clientSchema, sectionsSchema, settingsSchema,
  type Branding, type ContractClient, type ContractSection, type ContractSettings, type ContractSigner,
} from '@/lib/contracts/types';
import { estimateContractValue, validateContract, type ValidationIssue } from '@/lib/contracts/validate';
import { KNOWN_VARIABLES, moneyToNumber, todayIso } from '@/lib/contracts/variables';
import { canManageContracts, canViewOwnContracts } from '@/lib/permissions';
import { SigningError } from '@/lib/signing/errors';
import { inspectPdf, PdfRejected } from '@/lib/signing/pdf-validate';
import { log } from '@/lib/signing/rpc';
import * as signing from '@/lib/signing/service';
import { downloadVerified, removeObject, signedUrl, uploadObject } from '@/lib/signing/storage';
import { ownerKey } from '@/lib/signing/access';
import type { Profile } from '@/lib/types';

export interface ContractRow {
  id: string; contract_no: number; title: string; template_id: string | null; template_version_id: string | null; template_name: string | null;
  contractor_id: string | null; client: ContractClient; sections: ContractSection[]; variables: Record<string, string>; branding: Branding;
  signers: ContractSigner[]; settings: ContractSettings; value_amount: number | null; signing_document_id: string | null; signing_version_id: string | null;
  document_sha256: string | null; content_sha256: string | null; sent_at: string | null; sent_by: string | null; created_by: string | null; created_at: string; updated_at: string;
}

const db = () => createAdminClient();
const notFound = () => new ContractError('not_found', contractMessage('not_found'));

// ---------------------------------------------------------------------------
// Loading + authorization
// ---------------------------------------------------------------------------
async function versionOf(row: Pick<ContractRow, 'signing_version_id'>) {
  if (!row.signing_version_id) return null;
  const { data } = await db().from('signing_versions').select('*').eq('id', row.signing_version_id).maybeSingle();
  return data as any | null;
}

/** Admin: any contract. Contractor user: only a SENT contract of their own company. Everything else looks like "not found". */
export async function loadContract(actor: Profile, id: string, mode: 'admin' | 'any' = 'admin'): Promise<ContractRow> {
  if (!isUuid(id)) throw notFound();
  const { data } = await db().from('contracts').select('*').eq('id', id).maybeSingle();
  if (!data) throw notFound();
  const row = data as ContractRow;
  if (canManageContracts(actor)) return row;
  if (mode === 'any' && canViewOwnContracts(actor) && row.contractor_id && row.contractor_id === actor.contractor_id) {
    const v = await versionOf(row);
    if (v && v.status !== 'draft') return row;
  }
  throw notFound();
}

async function isLocked(row: ContractRow) {
  if (row.sent_at) return true;
  const v = await versionOf(row);
  return !!v && v.status !== 'draft';
}

async function assertEditable(row: ContractRow) {
  if (await isLocked(row)) throw new ContractError('locked', contractMessage('locked'));
}

async function crmClient(contractorId: string): Promise<{ client: ContractClient; logoPath: string | null; name: string }> {
  const { data } = await db().from('contractors').select('id,name,contact_name,email,phone,logo_path').eq('id', contractorId).maybeSingle();
  if (!data) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
  return { client: { company: data.name ?? '', name: data.contact_name ?? '', email: data.email ?? '', phone: data.phone ?? '', address: '' }, logoPath: data.logo_path ?? null, name: data.name };
}

function defaultSigners(client: ContractClient, actor: Profile, roles: { key: string; label: string }[] | undefined): ContractSigner[] {
  const hq: ContractSigner = { role: 'homequote', label: roles?.find((r) => r.key === 'homequote')?.label ?? 'HomeQuote Network', name: actor.full_name ?? '', email: actor.email ?? '' };
  const cl: ContractSigner = { role: 'client', label: roles?.find((r) => r.key === 'client')?.label ?? 'Client', name: client.name, email: client.email };
  const order = (roles ?? []).map((r) => r.key);
  const list = order.length && order.indexOf('homequote') !== -1 && order.indexOf('homequote') < order.indexOf('client') ? [hq, cl] : [cl, hq];
  return list as ContractSigner[];
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------
export async function createContract(actor: Profile, input: { templateId: string; contractorId?: string | null; title?: string }): Promise<{ id: string }> {
  requireAdmin(actor);
  if (!isUuid(input.templateId)) throw new ContractError('template_not_found', contractMessage('template_not_found'));
  let client: ContractClient = clientSchema.parse({});
  const contractorId = input.contractorId && isUuid(input.contractorId) ? input.contractorId : null;
  let crm: Awaited<ReturnType<typeof crmClient>> | null = null;
  if (contractorId) { crm = await crmClient(contractorId); client = crm.client; }
  const res = await db().rpc('contract_create_from_template', {
    p_template: input.templateId, p_actor: actor.id, p_contractor: contractorId, p_title: input.title ?? '', p_client: client,
  });
  if (res.error) throw new ContractError('server', contractMessage('server'));
  if (res.data?.ok === false) throw new ContractError(res.data.error, contractMessage(res.data.error));
  const id = res.data.contract_id as string;
  const row = await loadContract(actor, id);
  const signers = defaultSigners(client, actor, (row.settings as any)?.roles);
  await db().from('contracts').update({ signers }).eq('id', id);
  return { id };
}

export interface ContractPatch {
  title?: string; contractorId?: string | null; client?: unknown; sections?: unknown; variables?: Record<string, string>; branding?: unknown;
  signers?: unknown; settings?: unknown; refreshFromCrm?: boolean;
}

/** Saves a DRAFT. Rejected once the agreement has been sent (the database also refuses). */
export async function saveContract(actor: Profile, id: string, patch: ContractPatch): Promise<{ updatedAt: string; client: ContractClient; signers: ContractSigner[]; valueAmount: number | null }> {
  requireAdmin(actor);
  const row = await loadContract(actor, id);
  await assertEditable(row);
  const update: Record<string, unknown> = {};
  let client = clientSchema.parse(row.client);
  let signers = row.signers;
  if (patch.title !== undefined) { const t = patch.title.trim(); if (!t) throw new ContractError('invalid', 'Give the agreement a title.'); update.title = t.slice(0, LIMITS.maxTitle); }
  if (patch.contractorId !== undefined && patch.contractorId !== row.contractor_id) {
    if (patch.contractorId === null) { update.contractor_id = null; }
    else {
      if (!isUuid(patch.contractorId)) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
      const crm = await crmClient(patch.contractorId);
      update.contractor_id = patch.contractorId;
      client = crm.client;
      // keep the client signer in step with the newly chosen client
      signers = signers.map((s) => (s.role === 'client' ? { ...s, name: client.name || s.name, email: client.email || s.email } : s));
      // a logo uploaded for the previous client no longer applies
      const b = brandingSchema.parse(row.branding);
      if (b.clientLogoPath) { await removeAsset(b.clientLogoPath); update.branding = { ...b, clientLogoPath: null, useCrmLogo: true }; }
    }
  } else if (patch.refreshFromCrm && row.contractor_id) {
    client = (await crmClient(row.contractor_id)).client;
  }
  if (patch.client !== undefined) {
    const p = clientSchema.safeParse(patch.client);
    if (!p.success) throw new ContractError('invalid', p.error.issues[0]?.message ?? 'Check the client details.');
    client = p.data;
  }
  update.client = client;
  if (patch.sections !== undefined) {
    const p = sectionsSchema.safeParse(patch.sections);
    if (!p.success) throw new ContractError('invalid', p.error.issues[0]?.message ?? 'Some sections are invalid.');
    update.sections = p.data;
  }
  let variables = row.variables;
  if (patch.variables !== undefined) {
    variables = {};
    for (const [k, v] of Object.entries(patch.variables)) if (KNOWN_VARIABLES.has(k) && typeof v === 'string' && v.trim()) variables[k] = v.trim().slice(0, LIMITS.maxVariableLength);
    update.variables = variables;
  }
  if (patch.branding !== undefined) {
    const next = brandingSchema.parse(patch.branding);
    const cur = brandingSchema.parse(row.branding);
    // the logo path can only be changed through upload/remove (never trusted from the form)
    update.branding = { ...next, clientLogoPath: cur.clientLogoPath };
  }
  if (patch.signers !== undefined) {
    const arr = z.array(z.object({ role: z.enum(['client', 'homequote', 'other']), label: z.string().trim().max(80), name: z.string().trim().max(200), email: z.string().trim().toLowerCase().max(254) })).max(LIMITS.maxSigners).safeParse(patch.signers);
    if (!arr.success) throw new ContractError('invalid', 'Check the signers.');
    signers = arr.data as ContractSigner[];
  }
  update.signers = signers;
  if (patch.settings !== undefined) {
    const p = settingsSchema.safeParse({ ...(row.settings as object), ...(patch.settings as object) });
    if (!p.success) throw new ContractError('invalid', p.error.issues[0]?.message ?? 'Check the sending options.');
    update.settings = p.data;
  }
  const valueAmount = estimateContractValue(variables);
  update.value_amount = valueAmount;
  const { data, error } = await db().from('contracts').update(update).eq('id', id).select('updated_at').single();
  if (error || !data) throw new ContractError(/contracts:locked/.test(error?.message ?? '') ? 'locked' : 'server', contractMessage(/contracts:locked/.test(error?.message ?? '') ? 'locked' : 'server'));
  return { updatedAt: data.updated_at, client, signers, valueAmount };
}

export async function duplicateContract(actor: Profile, id: string): Promise<{ id: string }> {
  requireAdmin(actor);
  const row = await loadContract(actor, id);
  const nid = randomUUID();
  const settings = { ...(row.settings as object), placeholdersAcknowledged: false };
  const variables = { ...row.variables }; delete variables.contract_date;
  // an agreement-specific logo is copied so deleting one agreement never removes the other's logo
  let branding = brandingSchema.parse(row.branding);
  if (branding.clientLogoPath) {
    const bytes = await getAsset(branding.clientLogoPath);
    if (bytes) { const p = `logos/contract-${nid}/${randomUUID()}.png`; await putAsset(p, bytes, 'image/png'); branding = { ...branding, clientLogoPath: p }; }
    else branding = { ...branding, clientLogoPath: null };
  }
  const ins = await db().from('contracts').insert({
    id: nid, title: `${row.title} (copy)`.slice(0, LIMITS.maxTitle), template_id: row.template_id, template_version_id: row.template_version_id, template_name: row.template_name,
    contractor_id: row.contractor_id, client: row.client, sections: row.sections, variables, branding, signers: row.signers, settings, value_amount: row.value_amount, created_by: actor.id,
  });
  if (ins.error) throw new ContractError('server', contractMessage('server'));
  await db().rpc('contract_log_event', { p_contract: nid, p_type: 'duplicated', p_actor: actor.id, p_meta: { from: id } });
  return { id: nid };
}

export async function deleteDraftContract(actor: Profile, id: string) {
  requireAdmin(actor);
  const row = await loadContract(actor, id);
  await assertEditable(row);
  // an abandoned (never sent) signing draft goes with it
  if (row.signing_version_id) await discardSigningDraft(actor, row);
  const atts = await db().from('contract_attachments').select('path').eq('contract_id', id);
  const del = await db().from('contracts').delete().eq('id', id);
  if (del.error) throw new ContractError(/contracts:locked/.test(del.error.message) ? 'locked' : 'server', contractMessage(/contracts:locked/.test(del.error.message) ? 'locked' : 'server'));
  const b = brandingSchema.parse(row.branding);
  await removeAsset(b.clientLogoPath);
  for (const a of atts.data ?? []) await removeAsset(a.path);
}

// ---------------------------------------------------------------------------
// Logos + exhibits
// ---------------------------------------------------------------------------
export async function uploadClientLogo(actor: Profile, input: { contractId?: string; contractorId?: string; bytes: Uint8Array; saveToCrm: boolean }) {
  requireAdmin(actor);
  let norm;
  try { norm = await normalizeLogo(input.bytes); } catch (e) { if (e instanceof LogoRejected) throw new ContractError('bad_logo', e.message); throw e; }
  const path0 = randomUUID();
  if (input.saveToCrm) {
    const cid = input.contractorId;
    if (!cid || !isUuid(cid)) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
    const { data: c } = await db().from('contractors').select('id,logo_path').eq('id', cid).maybeSingle();
    if (!c) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
    const path = `logos/c-${cid}/${path0}.png`;
    await putAsset(path, norm.png, 'image/png');
    const up = await db().from('contractors').update({ logo_path: path, logo_updated_at: new Date().toISOString() }).eq('id', cid);
    if (up.error) { await removeAsset(path); throw new ContractError('server', contractMessage('server')); }
    await removeAsset(c.logo_path);
    return { path, url: await assetUrl(path), width: norm.width, height: norm.height };
  }
  if (!input.contractId) throw new ContractError('invalid', 'Choose an agreement first.');
  const row = await loadContract(actor, input.contractId);
  await assertEditable(row);
  const path = `logos/contract-${row.id}/${path0}.png`;
  await putAsset(path, norm.png, 'image/png');
  const b = brandingSchema.parse(row.branding);
  const up = await db().from('contracts').update({ branding: { ...b, clientLogoPath: path, useCrmLogo: true } }).eq('id', row.id);
  if (up.error) { await removeAsset(path); throw new ContractError('server', contractMessage('server')); }
  await removeAsset(b.clientLogoPath);
  return { path, url: await assetUrl(path), width: norm.width, height: norm.height };
}

/** Removes the agreement's own logo and hides the CRM logo for this agreement (fallback tile is used). */
export async function removeClientLogo(actor: Profile, contractId: string) {
  requireAdmin(actor);
  const row = await loadContract(actor, contractId);
  await assertEditable(row);
  const b = brandingSchema.parse(row.branding);
  await db().from('contracts').update({ branding: { ...b, clientLogoPath: null, useCrmLogo: false } }).eq('id', row.id);
  await removeAsset(b.clientLogoPath);
}

export async function removeCrmLogo(actor: Profile, contractorId: string) {
  requireAdmin(actor);
  if (!isUuid(contractorId)) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
  const { data: c } = await db().from('contractors').select('logo_path').eq('id', contractorId).maybeSingle();
  if (!c) throw new ContractError('bad_contractor', contractMessage('bad_contractor'));
  await db().from('contractors').update({ logo_path: null, logo_updated_at: null }).eq('id', contractorId);
  await removeAsset(c.logo_path);
}

export async function addExhibit(actor: Profile, contractId: string, file: { name: string; bytes: Uint8Array }) {
  requireAdmin(actor);
  const row = await loadContract(actor, contractId);
  await assertEditable(row);
  if (file.bytes.length > LIMITS.maxAttachmentBytes) throw new ContractError('bad_file', 'Exhibits can be up to 8 MB.');
  const { count } = await db().from('contract_attachments').select('id', { count: 'exact', head: true }).eq('contract_id', contractId);
  if ((count ?? 0) >= LIMITS.maxAttachments) throw new ContractError('bad_file', `At most ${LIMITS.maxAttachments} exhibits per agreement.`);
  let info;
  try { info = await inspectPdf(file.bytes); } catch (e) { throw new ContractError('bad_file', e instanceof PdfRejected ? e.message : 'That PDF could not be read.'); }
  if (info.hasAcroForm) throw new ContractError('bad_file', 'Fillable PDF forms cannot be attached as exhibits.');
  if (info.pageCount > 30) throw new ContractError('bad_file', 'Exhibits can have up to 30 pages.');
  const path = `attachments/${contractId}/${randomUUID()}.pdf`;
  await putAsset(path, file.bytes, 'application/pdf');
  const name = file.name.replace(/[^\w .()-]+/g, '_').slice(0, 120) || 'exhibit.pdf';
  const ins = await db().from('contract_attachments').insert({ contract_id: contractId, path, filename: name, mime: 'application/pdf', size_bytes: file.bytes.length, sha256: info.sha256, page_count: info.pageCount, created_by: actor.id });
  if (ins.error) { await removeAsset(path); throw new ContractError('server', contractMessage('server')); }
}

export async function removeExhibit(actor: Profile, contractId: string, attachmentId: string) {
  requireAdmin(actor);
  const row = await loadContract(actor, contractId);
  await assertEditable(row);
  const { data: a } = await db().from('contract_attachments').select('id,path').eq('id', attachmentId).eq('contract_id', contractId).maybeSingle();
  if (!a) throw notFound();
  await db().from('contract_attachments').delete().eq('id', attachmentId);
  await removeAsset(a.path);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
async function clientLogoBytes(row: ContractRow): Promise<Uint8Array | null> {
  const b = brandingSchema.parse(row.branding);
  let path = b.clientLogoPath;
  if (!path && b.useCrmLogo && row.contractor_id) path = (await db().from('contractors').select('logo_path').eq('id', row.contractor_id).maybeSingle()).data?.logo_path ?? null;
  return path ? getAsset(path) : null;
}
export async function clientLogoUrl(row: ContractRow): Promise<string | null> {
  const b = brandingSchema.parse(row.branding);
  let path = b.clientLogoPath;
  if (!path && b.useCrmLogo && row.contractor_id) path = (await db().from('contractors').select('logo_path').eq('id', row.contractor_id).maybeSingle()).data?.logo_path ?? null;
  return assetUrl(path);
}

function parsed(row: ContractRow) {
  return {
    sections: sectionsSchema.parse(row.sections), client: clientSchema.parse(row.client), branding: brandingSchema.parse(row.branding),
    settings: settingsSchema.parse(row.settings ?? {}), signers: (Array.isArray(row.signers) ? row.signers : []) as ContractSigner[],
  };
}

export function reportFor(row: ContractRow, acknowledged?: boolean) {
  const p = parsed(row);
  return validateContract({ sections: p.sections, variables: row.variables, client: p.client, signers: p.signers, placeholdersAcknowledged: acknowledged ?? p.settings.placeholdersAcknowledged, today: row.variables.contract_date || todayIso() });
}

async function renderRow(row: ContractRow, mode: 'preview' | 'final') {
  const p = parsed(row);
  const today = row.variables.contract_date?.trim() || todayIso();
  const report = validateContract({ sections: p.sections, variables: row.variables, client: p.client, signers: p.signers, placeholdersAcknowledged: true, today });
  const model = buildRenderModel(p.sections, report.resolved.values);
  const signers: PdfSigner[] = p.signers.length ? p.signers.map((s) => ({ role: s.role, label: s.label || 'Signer', name: s.name, email: s.email }))
    : [{ role: 'client', label: 'Client', name: p.client.name || '', email: p.client.email }, { role: 'homequote', label: 'HomeQuote Network', name: '', email: '' }];
  const { data: atts } = await db().from('contract_attachments').select('path,filename').eq('contract_id', row.id).order('created_at', { ascending: true });
  const exhibits: { name: string; bytes: Uint8Array }[] = [];
  for (const a of atts ?? []) { const bytes = await getAsset(a.path); if (bytes) exhibits.push({ name: a.filename, bytes }); }
  const out = await renderContractPdf({
    title: row.title, contractNo: row.contract_no, model, branding: p.branding, clientName: report.resolved.values.client_company || p.client.company, hqName: report.resolved.values.homequote_company || 'HomeQuote Network',
    hqLogo: loadHomeQuoteLogo(), clientLogo: await clientLogoBytes(row), signers, exhibits,
  });
  void mode;
  return { out, report, today, signers };
}

/** Exactly what the client will receive (the same renderer the send step uses), for the in-app PDF preview. */
export async function previewContractPdf(actor: Profile, id: string) {
  requireAdmin(actor);
  const row = await loadContract(actor, id);
  try {
    const { out, report } = await renderRow(row, 'preview');
    return { base64: Buffer.from(out.bytes).toString('base64'), pageCount: out.pageCount, issues: [...report.errors, ...report.warnings] as ValidationIssue[] };
  } catch (e) {
    if (e instanceof ContractRenderError) throw new ContractError('render', e.message);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------
const canonical = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1))) : val));

async function discardSigningDraft(actor: Profile, row: ContractRow) {
  if (!row.signing_version_id) return;
  const v = await versionOf(row);
  await db().rpc('contract_unlink_signing', { p_contract: row.id });
  if (v && v.status === 'draft') { try { await signing.deleteDraft(actor, v.id); } catch { /* best effort */ } }
}

export async function sendContract(actor: Profile, id: string, opts: { acknowledgePlaceholders?: boolean } = {}) {
  requireAdmin(actor);
  let row = await loadContract(actor, id);
  await assertEditable(row);

  // A previous attempt that died half-way leaves an unsent signing draft: clear it if it is stale, refuse if fresh.
  if (row.signing_version_id) {
    const v = await versionOf(row);
    if (v && Date.now() - new Date(v.created_at).getTime() < 2 * 60_000) throw new ContractError('in_progress', contractMessage('in_progress'));
    await discardSigningDraft(actor, row);
    row = await loadContract(actor, id);
  }

  const acknowledged = opts.acknowledgePlaceholders ?? parsed(row).settings.placeholdersAcknowledged;
  const today = todayIso();
  const variables = { ...row.variables, contract_date: row.variables.contract_date?.trim() || today };
  const p = parsed(row);
  const report = validateContract({ sections: p.sections, variables, client: p.client, signers: p.signers, placeholdersAcknowledged: acknowledged, today: variables.contract_date });
  if (report.errors.length) throw new ContractError('validation', report.errors[0].message, { issues: report.errors });

  const withDate: ContractRow = { ...row, variables };
  let rendered;
  try { rendered = await renderRow(withDate, 'final'); } catch (e) {
    if (e instanceof ContractRenderError) throw new ContractError('render', e.message);
    throw e;
  }
  const { out } = rendered;
  let inspected;
  try { inspected = await inspectPdf(out.bytes); } catch (e) { throw new ContractError('render', e instanceof PdfRejected ? e.message : 'The agreement PDF could not be generated.'); }

  const docId = randomUUID(), versionId = randomUUID();
  const path = `${ownerKey(null)}/${docId}/${versionId}.pdf`;
  await uploadObject(path, out.bytes);
  const admin = db();
  const fail = async (e: unknown): Promise<never> => {
    try { await admin.rpc('contract_unlink_signing', { p_contract: row.id }); } catch { /* ignore */ }
    try { await admin.from('signing_versions').delete().eq('id', versionId); await admin.from('signing_documents').update({ current_version_id: null }).eq('id', docId); await admin.from('signing_documents').delete().eq('id', docId); } catch { /* ignore */ }
    await removeObject(path);
    throw e;
  };
  try {
    const ins = await admin.from('signing_documents').insert({ id: docId, contractor_id: null, lead_id: null, title: row.title, created_by: actor.id });
    if (ins.error) throw new ContractError('server', contractMessage('server'));
    const vIns = await admin.from('signing_versions').insert({
      id: versionId, document_id: docId, version_no: 1, original_path: path, original_sha256: inspected.sha256, original_size: inspected.size, page_count: inspected.pageCount,
      pages: inspected.pages, detection: { methods: ['contract_generator'], notes: [`Generated from contract ${row.id}; fields placed by the contract generator.`], processing: 'local' }, created_by: actor.id,
    });
    if (vIns.error) throw new ContractError('server', contractMessage('server'));
    await admin.from('signing_documents').update({ current_version_id: versionId }).eq('id', docId);
    await log(versionId, 'version_created', actor, { version_no: 1, original_sha256: inspected.sha256, pages: inspected.pageCount, contract_id: row.id });

    const s = p.settings;
    await signing.saveDraft(actor, versionId, {
      subject: s.subject || `Please review and sign: ${row.title}`, message: s.message, signing_order: s.signingOrder, expiry_days: s.expiryDays,
      auto_remind_days: s.autoRemindDays, auto_remind_max: 3, require_access_code: false,
      recipients: p.signers.map((x) => ({ name: x.name, email: x.email })),
      fields: out.fields.map((f) => ({
        recipient_index: f.signerIndex + 1, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: true, label: f.label, group_key: null,
        prefill_value: null, date_format: f.type === 'date' ? 'MMM d, yyyy' : null, source: 'manual', confidence: null, needs_review: false, reviewed: true,
        role_hint: null, detection_note: null, source_ref: null,
      })),
    });
    await signing.markReviewed(actor, versionId);

    const contentSha = createHash('sha256').update(canonical({
      title: row.title, sections: p.sections, values: report.resolved.values, signers: p.signers, client: p.client, branding: { mode: p.branding.mode, swap: p.branding.swap, size: p.branding.size, align: p.branding.align },
    })).digest('hex');
    const link = await admin.rpc('contract_link_signing', { p_contract: row.id, p_doc: docId, p_version: versionId, p_variables: variables, p_document_sha: inspected.sha256, p_content_sha: contentSha });
    if (link.error) throw new ContractError('server', contractMessage('server'));
    if (link.data?.ok === false) throw new ContractError(link.data.error, contractMessage(link.data.error));
  } catch (e) { return fail(e); }

  let sent;
  try { sent = await signing.sendForSignature(actor, versionId); } catch (e) { return fail(e instanceof SigningError ? new ContractError('send_failed', e.message) : e); }
  const mark = await admin.rpc('contract_mark_sent', { p_contract: row.id, p_actor: actor.id });
  if (mark.error || mark.data?.ok === false) {
    // the request IS out; retry once so the dashboard shows the sent date, and say so in the audit trail
    await admin.rpc('contract_mark_sent', { p_contract: row.id, p_actor: actor.id });
  }
  if (report.placeholders > 0) await admin.rpc('contract_log_event', { p_contract: row.id, p_type: 'placeholders_acknowledged', p_actor: actor.id, p_meta: { count: report.placeholders } });
  return { versionId, documentId: docId, results: sent.results, documentSha256: inspected.sha256, pageCount: inspected.pageCount };
}

// ---------------------------------------------------------------------------
// Post-send actions (all go through the signing engine)
// ---------------------------------------------------------------------------
async function sentVersion(actor: Profile, id: string) {
  requireAdmin(actor);
  const row = await loadContract(actor, id);
  const v = await versionOf(row);
  if (!v || v.status === 'draft') throw new ContractError('not_sent', 'This agreement has not been sent yet.');
  return { row, v };
}

export async function voidContract(actor: Profile, id: string, reason: string) {
  const { row, v } = await sentVersion(actor, id);
  await signing.voidRequest(actor, v.id, reason);
  await db().rpc('contract_log_event', { p_contract: row.id, p_type: 'voided', p_actor: actor.id, p_meta: { reason: reason.slice(0, 500) } });
}
export async function resendContract(actor: Profile, id: string, recipientId: string) {
  const { v } = await sentVersion(actor, id);
  return signing.resendInvitation(actor, v.id, recipientId);
}
export async function remindContract(actor: Profile, id: string, recipientId: string) {
  const { v } = await sentVersion(actor, id);
  return signing.remindRecipient(actor, v.id, recipientId);
}

/** Signed short-lived URL. Admin: any state. Contractor user: their own company's sent agreement only. */
export async function contractFileUrl(actor: Profile, id: string, kind: 'original' | 'final' | 'certificate') {
  const row = await loadContract(actor, id, 'any');
  const v = await versionOf(row);
  if (!v || v.status === 'draft') throw new ContractError('not_sent', 'This agreement has not been sent yet.');
  if (canManageContracts(actor)) return signing.senderFileUrl(actor, v.id, kind);
  // company access: only the integrity-checked files, never the audit trail
  const safe = row.title.replace(/[^\w .()-]+/g, '_').slice(0, 80) || 'agreement';
  if (kind === 'original') { await downloadVerified(v.original_path, v.original_sha256); return signedUrl(v.original_path, 60, `${safe}.pdf`); }
  const pth = kind === 'final' ? v.final_path : v.certificate_path, sha = kind === 'final' ? v.final_sha256 : v.certificate_sha256;
  if (!pth || !sha) throw new ContractError('not_ready', 'The completed file is not ready yet.');
  await downloadVerified(pth, sha);
  return signedUrl(pth, 60, kind === 'final' ? `${safe} - signed.pdf` : `${safe} - certificate.pdf`);
}

// ---------------------------------------------------------------------------
// Reading: list + detail
// ---------------------------------------------------------------------------
export interface ContractListItem {
  id: string; contractNo: number; title: string; templateName: string | null; contractorId: string | null; clientName: string; clientLogoUrl: string | null;
  status: ContractStatus; valueAmount: number | null; valueLabel: string; createdAt: string; sentAt: string | null; lastActivityAt: string; versionId: string | null;
  signers: { name: string; role: string; status: string }[]; hasFinal: boolean; open: boolean;
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export function valueLabel(row: Pick<ContractRow, 'value_amount' | 'variables'>): string {
  if (row.value_amount != null) return money(row.value_amount);
  const per = moneyToNumber(row.variables.appointment_price), mo = moneyToNumber(row.variables.monthly_retainer);
  if (per != null) return `${money(per)} / appt`;
  if (mo != null) return `${money(mo)} / mo`;
  return '—';
}

export interface ListFilters { q?: string; status?: string; templateId?: string; contractorId?: string; sort?: string; limit?: number }

export async function listContracts(actor: Profile, f: ListFilters = {}): Promise<ContractListItem[]> {
  const admin = canManageContracts(actor);
  if (!admin && !canViewOwnContracts(actor)) throw new ContractError('forbidden', contractMessage('forbidden'));
  let rows: ContractRow[];
  {
    let q = db().from('contracts').select('*').order('created_at', { ascending: false }).limit(Math.min(f.limit ?? 300, 500));
    if (!admin) q = q.eq('contractor_id', actor.contractor_id);
    else if (f.contractorId) { if (!isUuid(f.contractorId)) return []; q = q.eq('contractor_id', f.contractorId); }
    if (f.templateId && isUuid(f.templateId)) q = q.eq('template_id', f.templateId);
    rows = ((await q).data ?? []) as ContractRow[];
  }
  if (!rows.length) return [];
  const versionIds = rows.map((r) => r.signing_version_id).filter(Boolean) as string[];
  const [{ data: versions }, { data: recs }, { data: events }, { data: crm }] = await Promise.all([
    versionIds.length ? db().from('signing_versions').select('id,status,expires_at,sent_at,final_sha256').in('id', versionIds) : Promise.resolve({ data: [] as any[] }),
    versionIds.length ? db().from('signing_recipients').select('version_id,name,email,status,first_viewed_at,order_index').in('version_id', versionIds).order('order_index') : Promise.resolve({ data: [] as any[] }),
    versionIds.length ? db().from('signing_events').select('version_id,created_at').in('version_id', versionIds).order('id', { ascending: false }).limit(4000) : Promise.resolve({ data: [] as any[] }),
    db().from('contractors').select('id,logo_path').in('id', Array.from(new Set(rows.map((r) => r.contractor_id).filter(Boolean) as string[]))),
  ]);
  const vById = new Map((versions ?? []).map((v: any) => [v.id, v]));
  const lastEvent = new Map<string, string>();
  for (const e of events ?? []) if (!lastEvent.has(e.version_id)) lastEvent.set(e.version_id, e.created_at);
  const logoOf = new Map((crm ?? []).map((c: any) => [c.id, c.logo_path as string | null]));

  let items: ContractListItem[] = [];
  for (const r of rows) {
    const v: any = r.signing_version_id ? vById.get(r.signing_version_id) : null;
    const rs = (recs ?? []).filter((x: any) => x.version_id === r.signing_version_id);
    const status = deriveStatus({ signingStatus: v?.status ?? null, expiresAt: v?.expires_at ?? null, anyViewed: rs.some((x: any) => !!x.first_viewed_at || ['viewed', 'signed'].includes(x.status)) });
    if (!admin && status === 'draft') continue;
    const b = brandingSchema.safeParse(r.branding).data ?? brandingSchema.parse({});
    const logoPath = b.clientLogoPath ?? (b.useCrmLogo && r.contractor_id ? logoOf.get(r.contractor_id) ?? null : null);
    const client = clientSchema.safeParse(r.client).data ?? clientSchema.parse({});
    items.push({
      id: r.id, contractNo: r.contract_no, title: r.title, templateName: r.template_name, contractorId: r.contractor_id, clientName: client.company || '—',
      clientLogoUrl: logoPath ? await assetUrl(logoPath, 3600) : null, status, valueAmount: r.value_amount, valueLabel: valueLabel(r), createdAt: r.created_at,
      sentAt: v?.sent_at ?? r.sent_at, lastActivityAt: lastEvent.get(r.signing_version_id ?? '') ?? r.updated_at, versionId: r.signing_version_id,
      signers: (Array.isArray(r.signers) ? r.signers : []).map((s: any) => ({ name: s.name, role: s.role, status: rs.find((x: any) => x.email === s.email)?.status ?? 'pending' })),
      hasFinal: !!v?.final_sha256, open: isOpen(status),
    });
  }
  const q = f.q?.trim().toLowerCase();
  if (q) items = items.filter((i) => `${i.title} ${i.clientName} ${i.templateName ?? ''} ${i.signers.map((s) => s.name).join(' ')} ${i.contractNo}`.toLowerCase().includes(q));
  if (f.status) items = items.filter((i) => i.status === f.status);
  const sorters: Record<string, (a: ContractListItem, b: ContractListItem) => number> = {
    created_desc: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    created_asc: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
    activity_desc: (a, b) => +new Date(b.lastActivityAt) - +new Date(a.lastActivityAt),
    value_desc: (a, b) => (b.valueAmount ?? -1) - (a.valueAmount ?? -1),
    client_asc: (a, b) => a.clientName.localeCompare(b.clientName),
  };
  return items.sort(sorters[f.sort ?? 'activity_desc'] ?? sorters.activity_desc);
}

export interface ContractTimelineItem { at: string; label: string; who: string | null; source: 'contract' | 'signing' }
const CONTRACT_EVENT_LABELS: Record<string, string> = {
  created: 'Agreement created from template', duplicated: 'Duplicated from another agreement', sent: 'Sent for signature',
  placeholders_acknowledged: 'Sender confirmed remaining [REVIEW] passages', voided: 'Voided by an administrator',
};

export async function getContractDetail(actor: Profile, id: string) {
  const row = await loadContract(actor, id, 'any');
  const admin = canManageContracts(actor);
  const v = await versionOf(row);
  let recipients: any[] = [], timeline: ContractTimelineItem[] = [], attachments: any[] = [];
  if (v) {
    recipients = (await db().from('signing_recipients').select('id,name,email,order_index,status,invited_at,last_sent_at,send_count,last_email_status,last_email_error,first_viewed_at,signed_at,declined_at,decline_reason').eq('version_id', v.id).order('order_index')).data ?? [];
  }
  const finalStatus = deriveStatus({ signingStatus: v?.status ?? null, expiresAt: v?.expires_at ?? null, anyViewed: recipients.some((r) => !!r.first_viewed_at || ['viewed', 'signed'].includes(r.status)) });
  if (admin) {
    const [{ data: ce }, { data: se }, { data: at }] = await Promise.all([
      db().from('contract_events').select('event_type,created_at,actor_user_id,metadata').eq('contract_id', id).order('id'),
      v ? db().from('signing_events').select('event_type,created_at,recipient_id,metadata').eq('version_id', v.id).order('id') : Promise.resolve({ data: [] as any[] }),
      db().from('contract_attachments').select('id,filename,size_bytes,page_count,created_at').eq('contract_id', id).order('created_at'),
    ]);
    const { SIGNING_EVENT_LABELS } = await import('@/lib/signing/constants');
    const name = (rid: string | null) => recipients.find((r) => r.id === rid)?.name ?? null;
    timeline = [
      ...(ce ?? []).filter((e: any) => e.event_type !== 'sent').map((e: any) => ({ at: e.created_at, label: CONTRACT_EVENT_LABELS[e.event_type] ?? e.event_type, who: null, source: 'contract' as const })),
      ...(se ?? []).map((e: any) => ({ at: e.created_at, label: SIGNING_EVENT_LABELS[e.event_type] ?? e.event_type, who: name(e.recipient_id), source: 'signing' as const })),
    ].sort((a, b) => +new Date(a.at) - +new Date(b.at));
    attachments = at ?? [];
  }
  return {
    contract: row, status: finalStatus, version: v ? { id: v.id, status: v.status, sentAt: v.sent_at, expiresAt: v.expires_at, completedAt: v.completed_at, finalReady: !!v.final_sha256, signingOrder: v.signing_order, finalizeError: v.finalize_error } : null,
    recipients, timeline, attachments, clientLogoUrl: await clientLogoUrl(row), valueLabel: valueLabel(row), admin,
  };
}

/** The agreement currently in force for a client: its most recent completed one (not voided/expired). */
export async function activeAgreementFor(actor: Profile, contractorId: string): Promise<ContractListItem | null> {
  const all = await listContracts(actor, { contractorId, sort: 'created_desc' });
  return all.find((c) => c.status === 'completed') ?? null;
}
