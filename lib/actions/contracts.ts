'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import * as ct from '@/lib/contracts/contracts';
import { ContractError, contractMessage } from '@/lib/contracts/errors';
import * as tp from '@/lib/contracts/templates';
import { canManageContracts, canViewOwnContracts } from '@/lib/permissions';
import { SigningError } from '@/lib/signing/errors';
import { LIMITS } from '@/lib/contracts/types';
import type { ValidationIssue } from '@/lib/contracts/validate';

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; issues?: ValidationIssue[] };
type Actor = Awaited<ReturnType<typeof requireProfile>>;

async function run<T extends object>(fn: (actor: Actor) => Promise<T>, opts: { allowCompany?: boolean } = {}): Promise<R<T>> {
  const actor = await requireProfile();
  if (!canManageContracts(actor) && !(opts.allowCompany && canViewOwnContracts(actor))) return { ok: false, error: contractMessage('forbidden') };
  try {
    return { ok: true, ...(await fn(actor)) };
  } catch (e) {
    if (e instanceof ContractError) return { ok: false, error: e.message, ...(Array.isArray(e.extra?.issues) ? { issues: e.extra.issues as ValidationIssue[] } : {}) };
    if (e instanceof SigningError) return { ok: false, error: e.message };
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
const touch = (...paths: string[]) => { revalidatePath('/app/contracts'); for (const p of paths) revalidatePath(p); };

// ---- templates -------------------------------------------------------------
export async function createTemplateAction(input: { name: string; description?: string; category?: string }) {
  return run(async (a) => { const r = await tp.createTemplate(a, input); touch('/app/contracts/templates'); return r; });
}
export async function saveTemplateAction(id: string, patch: tp.TemplatePatch) {
  return run(async (a) => tp.saveTemplate(a, id, patch));
}
export async function publishTemplateAction(id: string) {
  return run(async (a) => { const r = await tp.publishTemplate(a, id); touch('/app/contracts/templates'); return r; });
}
export async function duplicateTemplateAction(id: string) {
  return run(async (a) => { const r = await tp.duplicateTemplate(a, id); touch('/app/contracts/templates'); return r; });
}
export async function archiveTemplateAction(id: string, archived: boolean) {
  return run(async (a) => { await tp.setTemplateArchived(a, id, archived); touch('/app/contracts/templates'); return {}; });
}
export async function deleteTemplateAction(id: string) {
  return run(async (a) => { await tp.deleteTemplate(a, id); touch('/app/contracts/templates'); return {}; });
}
export async function setDefaultTemplateAction(id: string) {
  return run(async (a) => { await tp.setDefaultTemplate(a, id); touch('/app/contracts/templates'); return {}; });
}
export async function previewTemplateAction(id: string) {
  return run(async (a) => tp.previewTemplatePdf(a, id));
}

// ---- contracts -------------------------------------------------------------
export async function createContractAction(input: { templateId: string; contractorId?: string | null }) {
  return run(async (a) => { const r = await ct.createContract(a, input); touch(); return r; });
}
export async function saveContractAction(id: string, patch: ct.ContractPatch) {
  return run(async (a) => ct.saveContract(a, id, patch));
}
export async function duplicateContractAction(id: string) {
  return run(async (a) => { const r = await ct.duplicateContract(a, id); touch(); return r; });
}
export async function deleteDraftContractAction(id: string) {
  return run(async (a) => { await ct.deleteDraftContract(a, id); touch(); return {}; });
}
export async function previewContractAction(id: string) {
  return run(async (a) => ct.previewContractPdf(a, id));
}
export async function sendContractAction(id: string, acknowledgePlaceholders: boolean) {
  return run(async (a) => { const r = await ct.sendContract(a, id, { acknowledgePlaceholders }); touch(`/app/contracts/${id}`, '/app/documents'); return { results: r.results, versionId: r.versionId }; });
}
export async function voidContractAction(id: string, reason: string) {
  return run(async (a) => { await ct.voidContract(a, id, reason); touch(`/app/contracts/${id}`, '/app/documents'); return {}; });
}
export async function resendContractAction(id: string, recipientId: string) {
  return run(async (a) => { const result = await ct.resendContract(a, id, recipientId); touch(`/app/contracts/${id}`); return { result }; });
}
export async function remindContractAction(id: string, recipientId: string) {
  return run(async (a) => { const result = await ct.remindContract(a, id, recipientId); touch(`/app/contracts/${id}`); return { result }; });
}
export async function contractFileAction(id: string, kind: 'original' | 'final' | 'certificate') {
  return run(async (a) => ({ url: await ct.contractFileUrl(a, id, kind) }), { allowCompany: true });
}

// ---- logos + exhibits (multipart FormData) -----------------------------------
const MAX_FORM_BYTES = Math.max(LIMITS.maxLogoBytes, LIMITS.maxAttachmentBytes);
async function fileOf(fd: FormData) {
  const f = fd.get('file');
  if (!(f instanceof File) || f.size === 0) throw new ContractError('bad_file', 'Choose a file first.');
  if (f.size > MAX_FORM_BYTES) throw new ContractError('bad_file', 'That file is too large.');
  return { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
}
export async function uploadLogoAction(fd: FormData) {
  return run(async (a) => {
    const f = await fileOf(fd);
    const contractId = String(fd.get('contractId') ?? '') || undefined;
    const contractorId = String(fd.get('contractorId') ?? '') || undefined;
    const r = await ct.uploadClientLogo(a, { contractId, contractorId, bytes: f.bytes, saveToCrm: fd.get('saveToCrm') === 'true' });
    touch(contractorId ? `/app/contractors/${contractorId}` : '');
    return { url: r.url };
  });
}
export async function removeLogoAction(contractId: string) {
  return run(async (a) => { await ct.removeClientLogo(a, contractId); return {}; });
}
export async function removeCrmLogoAction(contractorId: string) {
  return run(async (a) => { await ct.removeCrmLogo(a, contractorId); touch(`/app/contractors/${contractorId}`); return {}; });
}
export async function addExhibitAction(fd: FormData) {
  return run(async (a) => { const f = await fileOf(fd); await ct.addExhibit(a, String(fd.get('contractId') ?? ''), f); return {}; });
}
export async function removeExhibitAction(contractId: string, attachmentId: string) {
  return run(async (a) => { await ct.removeExhibit(a, contractId, attachmentId); return {}; });
}
