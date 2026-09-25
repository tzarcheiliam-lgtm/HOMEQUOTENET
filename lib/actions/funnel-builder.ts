'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { funnelSchema, type FunnelConfig } from '@/lib/funnels/schema';
import { blankFunnelConfig, slugify, type FunnelStatus } from '@/lib/funnels/builder';

export type BuilderActionState = { error?: string; success?: boolean } | undefined;

async function uniqueSlug(base: string): Promise<string> {
  const supabase = await createClient();
  const slug = slugify(base);
  for (let n = 0; n < 30; n++) {
    const candidate = n === 0 ? slug : `${slug}-${n + 1}`;
    const { data } = await supabase.from('funnels').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
  }
  throw new Error('Could not generate a unique slug');
}

/** Create Funnel: blank or from a template. Redirects into the builder. */
export async function createFunnelAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  await requireRole(['admin']);
  const clientName = String(formData.get('clientName') ?? '').trim();
  const industry = String(formData.get('industry') ?? '').trim();
  const contractorField = String(formData.get('contractorId') ?? '');
  const templateId = String(formData.get('templateId') ?? '');
  if (!clientName || !industry) return { error: 'Enter a client name and industry' };

  const supabase = await createClient();
  let config: FunnelConfig = blankFunnelConfig(clientName, industry);
  if (templateId) {
    const { data: template } = await supabase.from('funnel_templates').select('config').eq('id', templateId).maybeSingle();
    if (!template) return { error: 'Template not found' };
    const parsed = funnelSchema.safeParse({ ...(template.config as object), clientName, industry });
    if (!parsed.success) return { error: 'Template config is invalid' };
    config = parsed.data;
  }
  const contractorId = contractorField === 'house' || !contractorField ? null : contractorField;
  const slug = await uniqueSlug(clientName);
  const { data: profile } = await supabase.auth.getUser();
  const { data: funnel, error } = await supabase.from('funnels').insert({
    slug, contractor_id: contractorId, is_demo: false, status: 'draft', config,
    created_by: profile.user?.id ?? null,
  }).select('id').single();
  if (error || !funnel) return { error: error?.message ?? 'Could not create funnel' };
  revalidatePath('/app/funnels');
  redirect(`/app/funnels/${funnel.id}/builder`);
}

/** Save the step/branding/routing-independent config for a funnel being edited. */
export async function saveFunnelConfig(id: string, config: FunnelConfig): Promise<{ error?: string }> {
  await requireRole(['admin']);
  const parsed = funnelSchema.safeParse(config);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid configuration' };
  const supabase = await createClient();
  const { error } = await supabase.from('funnels').update({ config: parsed.data }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/app/funnels/${id}/builder`);
  revalidatePath('/app/funnels');
  return {};
}

/** Routing lives in the `funnels` row, not the JSON config: contractor/vertical assignment. */
export async function saveFunnelRouting(id: string, patch: { contractorId: string | null; verticalId: string | null }): Promise<{ error?: string }> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from('funnels').update({ contractor_id: patch.contractorId, vertical_id: patch.verticalId }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/app/funnels/${id}/builder`);
  revalidatePath('/app/funnels');
  return {};
}

/** Publish/unpublish/archive. Re-validates the funnel's CURRENT saved config before publishing. */
export async function setFunnelStatusAction(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as FunnelStatus;
  if (!id || !['draft', 'published', 'archived'].includes(status)) return;
  const supabase = await createClient();
  if (status === 'published') {
    // Refuse to publish an invalid config; the builder's own Save shows the real error.
    // A house funnel (contractor_id null, is_demo false) is a valid, intentional choice.
    const { data: funnel } = await supabase.from('funnels').select('config').eq('id', id).single();
    if (!funnel || !funnelSchema.safeParse(funnel.config).success) return;
  }
  await supabase.from('funnels').update({ status }).eq('id', id);
  revalidatePath('/app/funnels');
  revalidatePath(`/app/funnels/${id}/builder`);
}

/** Duplicate: same config/routing, new id + slug, always starts as a draft. No integration (GHL secrets are per-integration and shouldn't silently transfer). */
export async function duplicateFunnelAction(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  const { data: source } = await supabase.from('funnels').select('slug, contractor_id, vertical_id, config, is_demo').eq('id', id).single();
  if (!source) return;
  const parsed = funnelSchema.safeParse(source.config);
  if (!parsed.success) return;
  const slug = await uniqueSlug(`${source.slug}-copy`);
  const { data: profile } = await supabase.auth.getUser();
  const { data: copy } = await supabase.from('funnels').insert({
    slug, contractor_id: source.contractor_id, vertical_id: source.vertical_id,
    is_demo: false, status: 'draft', config: parsed.data, created_by: profile.user?.id ?? null,
  }).select('id').single();
  revalidatePath('/app/funnels');
  if (copy) redirect(`/app/funnels/${copy.id}/builder`);
}
