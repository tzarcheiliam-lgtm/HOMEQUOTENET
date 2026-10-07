/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { canManageSigning } from '@/lib/permissions';
import { actorCanAccessDocument, loadVersionForActor, ownerKey } from '@/lib/signing/access';
import { SigningError, messageFor } from '@/lib/signing/errors';
import { unwrap } from '@/lib/signing/rpc';
import { fromTemplateSchema, templateInputSchema } from '@/lib/signing/schemas';
import { copyObject, downloadVerified, removeObject } from '@/lib/signing/storage';
import type { Profile } from '@/lib/types';

/**
 * Reusable templates: a private copy of the PDF + field layout by signer ROLE + default settings.
 * Never stores signer names/emails, signer-entered values, or (unless asked) pre-filled text.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TemplateRow {
  id: string; contractor_id: string | null; name: string; description: string | null; page_count: number; signing_order: string; expiry_days: number;
  auto_remind_days: number | null; auto_remind_max: number; require_access_code: boolean; use_count: number; last_used_at: string | null; created_at: string;
  original_path: string; original_sha256: string; archived_at: string | null;
}
export interface TemplateView extends Omit<TemplateRow, 'original_path' | 'original_sha256' | 'archived_at'> { roles: string[]; fieldCount: number; companyName: string | null }

function requireManager(actor: Profile) {
  if (!canManageSigning(actor)) throw new SigningError('forbidden', messageFor('forbidden'));
}

/** Same answer for "missing" and "someone else's", exactly like documents. */
async function loadTemplate(actor: Profile, id: string): Promise<TemplateRow> {
  requireManager(actor);
  if (!UUID.test(id)) throw new SigningError('template_not_found', messageFor('template_not_found'));
  const { data } = await createAdminClient().from('signing_templates').select('*').eq('id', id).maybeSingle();
  if (!data || data.archived_at || !actorCanAccessDocument(actor, data)) throw new SigningError('template_not_found', messageFor('template_not_found'));
  return data as TemplateRow;
}

export async function saveAsTemplate(actor: Profile, versionId: string, raw: unknown): Promise<{ templateId: string }> {
  const parsed = templateInputSchema.safeParse(raw);
  if (!parsed.success) throw new SigningError('bad_request', parsed.error.issues[0]?.message ?? 'Check the template details.');
  const { version, doc } = await loadVersionForActor(actor, versionId);
  const admin = createAdminClient();
  const { count } = await admin.from('signing_recipients').select('id', { count: 'exact', head: true }).eq('version_id', versionId);
  if (!count) throw new SigningError('no_recipients', messageFor('no_recipients'));
  if (count !== parsed.data.roleLabels.length) throw new SigningError('bad_roles', messageFor('bad_roles'));

  const templateId = randomUUID();
  const path = `${ownerKey(doc.contractor_id)}/templates/${templateId}.pdf`;
  // The template keeps its own copy so deleting the source draft can never remove it.
  await copyObject(version.original_path, path);
  try {
    await downloadVerified(path, version.original_sha256);
    unwrap(await admin.rpc('signing_create_template', {
      p_template: templateId, p_source_version: versionId, p_actor: actor.id, p_name: parsed.data.name, p_description: parsed.data.description,
      p_roles: parsed.data.roleLabels, p_path: path, p_keep_prefill: parsed.data.keepPrefill,
    }));
  } catch (e) {
    await removeObject(path);
    throw e;
  }
  return { templateId };
}

export async function listTemplates(actor: Profile): Promise<TemplateView[]> {
  requireManager(actor);
  const admin = createAdminClient();
  const base = admin.from('signing_templates').select('*').is('archived_at', null).order('created_at', { ascending: false });
  const { data: rows } = await (actor.role === 'admin' ? base : base.eq('contractor_id', actor.contractor_id));
  const templates = (rows ?? []) as TemplateRow[];
  const out: TemplateView[] = [];
  for (const t of templates) out.push(await toView(admin, t));
  return out;
}

async function toView(admin: ReturnType<typeof createAdminClient>, t: TemplateRow): Promise<TemplateView> {
  const [{ data: roles }, { count }] = await Promise.all([
    admin.from('signing_template_roles').select('order_index,label').eq('template_id', t.id).order('order_index'),
    admin.from('signing_template_fields').select('id', { count: 'exact', head: true }).eq('template_id', t.id),
  ]);
  let companyName: string | null = null;
  if (t.contractor_id) companyName = (await admin.from('contractors').select('name').eq('id', t.contractor_id).maybeSingle()).data?.name ?? null;
  const { original_path: _p, original_sha256: _h, archived_at: _a, ...pub } = t;
  void _p; void _h; void _a;
  return { ...pub, roles: (roles ?? []).map((r: any) => r.label), fieldCount: count ?? 0, companyName };
}

export async function getTemplate(actor: Profile, id: string): Promise<TemplateView> {
  const t = await loadTemplate(actor, id);
  return toView(createAdminClient(), t);
}

export async function archiveTemplate(actor: Profile, id: string) {
  const t = await loadTemplate(actor, id);
  await createAdminClient().from('signing_templates').update({ archived_at: new Date().toISOString() }).eq('id', t.id);
}

/** New document + draft from a template. The PDF is copied (integrity-checked) and the draft still needs the placement review. */
export async function createFromTemplate(actor: Profile, templateId: string, raw: unknown): Promise<{ versionId: string; documentId: string }> {
  const parsed = fromTemplateSchema.safeParse(raw);
  if (!parsed.success) throw new SigningError('bad_request', parsed.error.issues[0]?.message ?? 'Check the details.');
  const t = await loadTemplate(actor, templateId);
  const admin = createAdminClient();
  const { count } = await admin.from('signing_template_roles').select('template_id', { count: 'exact', head: true }).eq('template_id', t.id);
  if (count !== parsed.data.recipients.length) throw new SigningError('bad_roles', messageFor('bad_roles'));

  if (parsed.data.leadId) {
    const supabase = await createClient();
    const { data: lead } = await supabase.from('leads').select('id').eq('id', parsed.data.leadId).maybeSingle();
    if (!lead) throw new SigningError('forbidden', 'That lead is not available to you.');
    if (t.contractor_id) {
      const { data: asg } = await admin.from('lead_assignments').select('id').eq('lead_id', parsed.data.leadId).eq('contractor_id', t.contractor_id).maybeSingle();
      if (!asg) throw new SigningError('lead_mismatch', messageFor('lead_mismatch'));
    }
  }

  const docId = randomUUID(), versionId = randomUUID();
  const path = `${ownerKey(t.contractor_id)}/${docId}/${versionId}.pdf`;
  await copyObject(t.original_path, path);
  try {
    await downloadVerified(path, t.original_sha256);
    unwrap(await admin.rpc('signing_create_from_template', {
      p_template: t.id, p_doc: docId, p_version: versionId, p_title: parsed.data.title, p_actor: actor.id, p_lead: parsed.data.leadId,
      p_recipients: parsed.data.recipients, p_path: path,
    }));
  } catch (e) {
    await removeObject(path);
    throw e;
  }
  return { versionId, documentId: docId };
}
