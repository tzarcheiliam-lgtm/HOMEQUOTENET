/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractError, contractMessage } from '@/lib/contracts/errors';
import { DEFAULT_SIGNER_ROLES, STARTER_TEMPLATES, librarySection } from '@/lib/contracts/library';
import { loadHomeQuoteLogo } from '@/lib/contracts/logo';
import { renderContractPdf } from '@/lib/contracts/pdf';
import { buildRenderModel } from '@/lib/contracts/render-model';
import { brandingSchema, sectionsSchema, type Branding, type ContractSection } from '@/lib/contracts/types';
import { KNOWN_VARIABLES, VARIABLE_BY_KEY, usedVariables } from '@/lib/contracts/variables';
import { canManageContracts } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

export interface TemplateRow {
  id: string; name: string; description: string | null; category: string; status: 'draft' | 'published' | 'archived'; is_default: boolean;
  starter_key: string | null; requires_review: boolean; sections: ContractSection[]; signer_roles: { key: string; label: string }[];
  default_variables: Record<string, string>; branding: Branding; latest_version_no: number; created_at: string; updated_at: string; archived_at: string | null;
}
export interface TemplateListItem {
  id: string; name: string; description: string | null; category: string; status: TemplateRow['status']; isDefault: boolean; starterKey: string | null;
  requiresReview: boolean; latestVersionNo: number; updatedAt: string; sectionCount: number; usageCount: number; variables: string[];
  /** Working copy differs from the last published version. */
  unpublishedChanges: boolean;
}

export function requireAdmin(actor: Profile) {
  if (!canManageContracts(actor)) throw new ContractError('forbidden', contractMessage('forbidden'));
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

export async function loadTemplateRow(id: string): Promise<TemplateRow> {
  if (!isUuid(id)) throw new ContractError('template_not_found', contractMessage('template_not_found'));
  const { data } = await createAdminClient().from('contract_templates').select('*').eq('id', id).maybeSingle();
  if (!data) throw new ContractError('template_not_found', contractMessage('template_not_found'));
  return data as TemplateRow;
}

const toItem = (t: TemplateRow, usage: number, unpublished: boolean): TemplateListItem => ({
  id: t.id, name: t.name, description: t.description, category: t.category, status: t.status, isDefault: t.is_default, starterKey: t.starter_key,
  requiresReview: t.requires_review, latestVersionNo: t.latest_version_no, updatedAt: t.updated_at, sectionCount: t.sections.length, usageCount: usage,
  variables: usedVariables(t.sections).known.filter((k) => VARIABLE_BY_KEY.get(k)?.source === 'input' || VARIABLE_BY_KEY.get(k)?.source === 'crm'),
  unpublishedChanges: t.status === 'published' && unpublished,
});

/** Seeds the starter templates once each. A starter that an admin later deletes is not brought back. */
export async function ensureStarterTemplates(actor: Profile): Promise<number> {
  requireAdmin(actor);
  const db = createAdminClient();
  const { data: seeded } = await db.from('contract_seed_log').select('key');
  const done = new Set((seeded ?? []).map((r: any) => r.key));
  let created = 0;
  for (const st of STARTER_TEMPLATES) {
    if (done.has(st.starterKey)) continue;
    const id = randomUUID();
    const ins = await db.from('contract_templates').insert({
      id, name: st.name, description: st.description, category: st.category, status: 'draft', starter_key: st.starterKey, requires_review: true,
      sections: st.sections, signer_roles: DEFAULT_SIGNER_ROLES, default_variables: st.defaultVariables, branding: brandingSchema.parse({}), created_by: actor.id, updated_by: actor.id,
    });
    if (ins.error) { if (/duplicate|unique/i.test(ins.error.message)) { await db.from('contract_seed_log').insert({ key: st.starterKey }); } continue; }
    const pub = await db.rpc('contract_publish_template', { p_template: id, p_actor: actor.id });
    if (pub.error || pub.data?.ok === false) continue;
    await db.from('contract_seed_log').insert({ key: st.starterKey });
    created++;
  }
  return created;
}

export async function listTemplates(actor: Profile, filters: { q?: string; category?: string; status?: string } = {}): Promise<TemplateListItem[]> {
  requireAdmin(actor);
  const db = createAdminClient();
  const { data } = await db.from('contract_templates').select('*').order('updated_at', { ascending: false }).limit(300);
  let rows = (data ?? []) as TemplateRow[];
  const q = filters.q?.trim().toLowerCase();
  if (q) rows = rows.filter((t) => `${t.name} ${t.description ?? ''} ${t.category}`.toLowerCase().includes(q));
  if (filters.category) rows = rows.filter((t) => t.category === filters.category);
  if (filters.status) rows = rows.filter((t) => t.status === filters.status);
  else rows = rows.filter((t) => t.status !== 'archived');
  const ids = rows.map((r) => r.id);
  const [{ data: used }, { data: versions }] = await Promise.all([
    ids.length ? db.from('contracts').select('template_id').in('template_id', ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from('contract_template_versions').select('template_id,version_no,snapshot').in('template_id', ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const usage = new Map<string, number>();
  for (const u of used ?? []) usage.set(u.template_id, (usage.get(u.template_id) ?? 0) + 1);
  const latest = new Map<string, any>();
  for (const v of versions ?? []) { const cur = latest.get(v.template_id); if (!cur || v.version_no > cur.version_no) latest.set(v.template_id, v); }
  return rows.map((t) => {
    const snap = latest.get(t.id)?.snapshot;
    // compare working copy to the published snapshot cheaply (same fields, same JSON text)
    const same = snap ? JSON.stringify({ n: snap.name, d: snap.description, c: snap.category, s: snap.sections, r: snap.signer_roles, v: snap.default_variables, b: snap.branding })
      === JSON.stringify({ n: t.name, d: t.description, c: t.category, s: t.sections, r: t.signer_roles, v: t.default_variables, b: t.branding }) : true;
    return toItem(t, usage.get(t.id) ?? 0, !same);
  });
}

export async function listCategories(actor: Profile): Promise<string[]> {
  requireAdmin(actor);
  const { data } = await createAdminClient().from('contract_templates').select('category').limit(500);
  return Array.from(new Set([...(data ?? []).map((r: any) => r.category as string), 'General', 'Lead generation', 'Managed services', 'Software', 'Websites', 'Automation'])).sort();
}

export async function getTemplate(actor: Profile, id: string) {
  requireAdmin(actor);
  const row = await loadTemplateRow(id);
  const { count } = await createAdminClient().from('contracts').select('id', { count: 'exact', head: true }).eq('template_id', id);
  return { template: row, usageCount: count ?? 0 };
}

export async function createTemplate(actor: Profile, input: { name: string; description?: string; category?: string }): Promise<{ id: string }> {
  requireAdmin(actor);
  const name = input.name.trim();
  if (!name) throw new ContractError('invalid', 'Give the template a name.');
  const id = randomUUID();
  const sections = ['parties', 'scope_of_services', 'payment_terms', 'cancellation_termination', 'additional_terms', 'signatures'].map((k) => librarySection(k)!);
  const ins = await createAdminClient().from('contract_templates').insert({
    id, name: name.slice(0, 120), description: input.description?.trim().slice(0, 600) || null, category: (input.category?.trim() || 'General').slice(0, 60), status: 'draft',
    sections, signer_roles: DEFAULT_SIGNER_ROLES, default_variables: {}, branding: brandingSchema.parse({}), created_by: actor.id, updated_by: actor.id,
  });
  if (ins.error) throw new ContractError('server', contractMessage('server'));
  return { id };
}

export interface TemplatePatch {
  name?: string; description?: string | null; category?: string; sections?: unknown; signerRoles?: { key: string; label: string }[];
  defaultVariables?: Record<string, string>; branding?: unknown; requiresReview?: boolean;
}

/** Saves the editable working copy (autosave target). Published versions are untouched until the next publish. */
export async function saveTemplate(actor: Profile, id: string, patch: TemplatePatch): Promise<{ updatedAt: string }> {
  requireAdmin(actor);
  const t = await loadTemplateRow(id);
  if (t.status === 'archived') throw new ContractError('archived', contractMessage('archived'));
  const update: Record<string, unknown> = { updated_by: actor.id };
  if (patch.name !== undefined) { const n = patch.name.trim(); if (!n) throw new ContractError('invalid', 'The template needs a name.'); update.name = n.slice(0, 120); }
  if (patch.description !== undefined) update.description = patch.description?.trim().slice(0, 600) || null;
  if (patch.category !== undefined) update.category = (patch.category.trim() || 'General').slice(0, 60);
  if (patch.sections !== undefined) {
    const p = sectionsSchema.safeParse(patch.sections);
    if (!p.success) throw new ContractError('invalid', p.error.issues[0]?.message ?? 'Some sections are invalid.');
    update.sections = p.data;
  }
  if (patch.signerRoles !== undefined) update.signer_roles = patch.signerRoles.slice(0, 6).map((r) => ({ key: String(r.key).slice(0, 30), label: String(r.label).trim().slice(0, 80) })).filter((r) => r.label);
  if (patch.defaultVariables !== undefined) {
    const dv: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch.defaultVariables)) if (KNOWN_VARIABLES.has(k) && typeof v === 'string' && v.trim()) dv[k] = v.trim().slice(0, 6000);
    update.default_variables = dv;
  }
  if (patch.branding !== undefined) update.branding = brandingSchema.parse(patch.branding);
  if (patch.requiresReview !== undefined) update.requires_review = !!patch.requiresReview;
  const { data, error } = await createAdminClient().from('contract_templates').update(update).eq('id', id).select('updated_at').single();
  if (error || !data) throw new ContractError('server', contractMessage('server'));
  return { updatedAt: data.updated_at };
}

export async function publishTemplate(actor: Profile, id: string): Promise<{ versionNo: number; unchanged: boolean }> {
  requireAdmin(actor);
  const t = await loadTemplateRow(id);
  const used = usedVariables(t.sections);
  if (used.unknown.length) throw new ContractError('invalid', `The text uses unknown merge fields: ${used.unknown.map((k) => `{{${k}}}`).join(', ')}.`);
  if (!t.sections.some((s) => s.kind === 'signatures')) throw new ContractError('invalid', 'Add a Signatures section before publishing.');
  const res = await createAdminClient().rpc('contract_publish_template', { p_template: id, p_actor: actor.id });
  if (res.error) throw new ContractError('server', contractMessage('server'));
  if (res.data?.ok === false) throw new ContractError(res.data.error, contractMessage(res.data.error));
  return { versionNo: res.data.version_no, unchanged: !!res.data.unchanged };
}

export async function duplicateTemplate(actor: Profile, id: string): Promise<{ id: string }> {
  requireAdmin(actor);
  const t = await loadTemplateRow(id);
  const nid = randomUUID();
  const ins = await createAdminClient().from('contract_templates').insert({
    id: nid, name: `${t.name} (copy)`.slice(0, 120), description: t.description, category: t.category, status: 'draft', requires_review: t.requires_review,
    sections: t.sections, signer_roles: t.signer_roles, default_variables: t.default_variables, branding: t.branding, created_by: actor.id, updated_by: actor.id,
  });
  if (ins.error) throw new ContractError('server', contractMessage('server'));
  return { id: nid };
}

export async function setTemplateArchived(actor: Profile, id: string, archived: boolean) {
  requireAdmin(actor);
  const t = await loadTemplateRow(id);
  const db = createAdminClient();
  if (archived) {
    // an archived template can no longer be the default or start new agreements
    await db.from('contract_templates').update({ status: 'archived', archived_at: new Date().toISOString(), is_default: false, updated_by: actor.id }).eq('id', id);
  } else {
    await db.from('contract_templates').update({ status: t.latest_version_no > 0 ? 'published' : 'draft', archived_at: null, updated_by: actor.id }).eq('id', id);
  }
}

export async function deleteTemplate(actor: Profile, id: string) {
  requireAdmin(actor);
  await loadTemplateRow(id);
  const db = createAdminClient();
  const { count } = await db.from('contracts').select('id', { count: 'exact', head: true }).eq('template_id', id);
  if (count) throw new ContractError('in_use', contractMessage('in_use'), { count });
  const del = await db.from('contract_templates').delete().eq('id', id);
  // the database refuses too (restrict FK from contracts); report it the same way
  if (del.error) throw new ContractError(/foreign key|violates/i.test(del.error.message) ? 'in_use' : 'server', contractMessage(/foreign key|violates/i.test(del.error.message) ? 'in_use' : 'server'));
}

export async function setDefaultTemplate(actor: Profile, id: string) {
  requireAdmin(actor);
  await loadTemplateRow(id);
  const res = await createAdminClient().rpc('contract_set_default_template', { p_template: id, p_actor: actor.id });
  if (res.error) throw new ContractError('server', contractMessage('server'));
  if (res.data?.ok === false) throw new ContractError(res.data.error, contractMessage(res.data.error));
}

/** Sample PDF of a template (example values, fallback client tile) so admins can check layout before sending. */
export async function previewTemplatePdf(actor: Profile, id: string): Promise<{ base64: string; pageCount: number }> {
  requireAdmin(actor);
  const t = await loadTemplateRow(id);
  const used = usedVariables(t.sections).known;
  const values: Record<string, string> = {};
  for (const k of used) { const d = VARIABLE_BY_KEY.get(k); values[k] = t.default_variables[k]?.trim() || (d?.source === 'branding' ? '' : d?.example ?? ''); }
  const out = await renderContractPdf({
    title: t.name, contractNo: null, model: buildRenderModel(t.sections, values), branding: t.branding, clientName: 'Sample Client Co.', hqName: 'HomeQuote Network',
    hqLogo: loadHomeQuoteLogo(), clientLogo: null,
    signers: [{ role: 'client', label: 'Client', name: 'Sample Signer', email: 'signer@example.com' }, { role: 'homequote', label: 'HomeQuote Network', name: 'HomeQuote Representative', email: 'team@example.com' }],
  });
  return { base64: Buffer.from(out.bytes).toString('base64'), pageCount: out.pageCount };
}
