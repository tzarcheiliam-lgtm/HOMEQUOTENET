import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManageSigning, isHqnAdministrator } from '@/lib/permissions';
import { SigningError } from '@/lib/signing/errors';
import type { Profile } from '@/lib/types';

export interface VersionRow {
  id: string; document_id: string; version_no: number; status: string; original_path: string; original_sha256: string; original_size: number;
  page_count: number; pages: { w: number; h: number; rotation: number }[]; detection: Record<string, unknown>;
  subject: string | null; message: string | null; signing_order: 'sequential' | 'parallel'; expiry_days: number; expires_at: string | null;
  sender_user_id: string | null; sender_name: string | null; sender_email: string | null; sender_business_name: string | null;
  placement_reviewed_at: string | null; placement_review_hash: string | null;
  sent_at: string | null; completed_at: string | null; declined_at: string | null; voided_at: string | null; void_reason: string | null;
  retention_until: string | null; finalized_at: string | null; final_path: string | null; final_sha256: string | null;
  certificate_path: string | null; certificate_sha256: string | null; finalize_error: string | null; created_at: string;
}
export interface DocumentRow {
  id: string; contractor_id: string | null; lead_id: string | null; title: string; created_by: string | null;
  current_version_id: string | null; archived_at: string | null; created_at: string;
}

/** Server-side tenant check. Admin: everything. Contractor user: only their company's documents. Nobody else. */
export function actorCanAccessDocument(actor: Profile, doc: Pick<DocumentRow, 'contractor_id'>): boolean {
  if (!canManageSigning(actor)) return false;
  if (isHqnAdministrator(actor)) return true;
  return !!doc.contractor_id && doc.contractor_id === actor.contractor_id;
}

export async function loadVersionForActor(actor: Profile, versionId: string): Promise<{ version: VersionRow; doc: DocumentRow }> {
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) throw new SigningError('not_found', 'not found');
  const admin = createAdminClient();
  const { data: version } = await admin.from('signing_versions').select('*').eq('id', versionId).maybeSingle();
  if (!version) throw new SigningError('not_found', 'not found');
  const { data: doc } = await admin.from('signing_documents').select('*').eq('id', version.document_id).maybeSingle();
  // Same answer for "missing" and "someone else's": do not reveal that another tenant's document exists.
  if (!doc || !actorCanAccessDocument(actor, doc)) throw new SigningError('not_found', 'not found');
  return { version: version as VersionRow, doc: doc as DocumentRow };
}

export function ownerKey(contractorId: string | null) {
  return contractorId ? `c-${contractorId}` : 'hqn';
}
