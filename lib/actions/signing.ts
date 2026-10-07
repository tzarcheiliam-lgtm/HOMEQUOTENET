'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import { canManageSigning } from '@/lib/permissions';
import { SigningError, messageFor } from '@/lib/signing/errors';
import * as svc from '@/lib/signing/service';

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T extends object>(fn: (actor: Awaited<ReturnType<typeof requireProfile>>) => Promise<T>): Promise<R<T>> {
  const actor = await requireProfile();
  if (!canManageSigning(actor)) return { ok: false, error: messageFor('forbidden') };
  try {
    return { ok: true, ...(await fn(actor)) };
  } catch (e) {
    if (e instanceof SigningError) return { ok: false, error: e.message };
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
const touch = () => { revalidatePath('/app/documents'); };

export async function prepareUploadAction(contractorId: string | null) {
  return run(async (a) => { const r = await svc.prepareUpload(a, contractorId); return r; });
}
export async function registerUploadAction(input: { docId: string; versionId: string; contractorId: string | null; title: string; leadId: string | null }) {
  return run(async (a) => { const r = await svc.registerUpload(a, input); touch(); return r; });
}
export async function saveDraftAction(versionId: string, draft: unknown) {
  return run(async (a) => { await svc.saveDraft(a, versionId, draft); return {}; });
}
export async function markReviewedAction(versionId: string) {
  return run(async (a) => { await svc.markReviewed(a, versionId); return {}; });
}
export async function sendAction(versionId: string) {
  return run(async (a) => { const results = await svc.sendForSignature(a, versionId); touch(); return { results }; });
}
export async function resendAction(versionId: string, recipientId: string) {
  return run(async (a) => { const result = await svc.resendInvitation(a, versionId, recipientId); touch(); return { result }; });
}
export async function remindAction(versionId: string, recipientId: string) {
  return run(async (a) => { const result = await svc.remindRecipient(a, versionId, recipientId); touch(); return { result }; });
}
export async function voidAction(versionId: string, reason: string) {
  return run(async (a) => { await svc.voidRequest(a, versionId, reason); touch(); return {}; });
}
export async function newVersionAction(versionId: string) {
  return run(async (a) => { const r = await svc.createNewVersion(a, versionId); touch(); return r; });
}
export async function deleteDraftAction(versionId: string) {
  return run(async (a) => { await svc.deleteDraft(a, versionId); touch(); return {}; });
}
export async function fileUrlAction(versionId: string, kind: 'original' | 'final' | 'certificate') {
  return run(async (a) => ({ url: await svc.senderFileUrl(a, versionId, kind) }));
}
export async function previewUrlAction(versionId: string) {
  return run(async (a) => ({ url: await svc.previewUrl(a, versionId) }));
}
export async function retryFinalizeAction(versionId: string) {
  return run(async (a) => { const r = await svc.retryFinalize(a, versionId); touch(); return { status: r.status }; });
}
