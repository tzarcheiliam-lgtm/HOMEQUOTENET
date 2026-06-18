'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { ingestLead } from '@/lib/integrations/intake';
import { normalizeMetaValue } from '@/lib/integrations/meta';

export type IntegrationState = { error?: string; success?: string } | undefined;

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? null : s;
}

// Save Meta connection settings (verify token, page id, page access token).
export async function updateMetaIntegration(
  _prev: IntegrationState,
  fd: FormData
): Promise<IntegrationState> {
  await requireRole(['admin']);
  const id = str(fd, 'id');
  if (!id) return { error: 'Missing integration' };

  const verifyToken = str(fd, 'verify_token');
  const pageId = str(fd, 'page_id');
  const pageAccessToken = str(fd, 'page_access_token');
  const enabled = fd.get('is_enabled') === 'on';

  const supabase = await createClient();

  // Read existing config so we don't clobber other keys.
  const { data: current } = await supabase
    .from('integrations')
    .select('config')
    .eq('id', id)
    .single();
  const config = {
    ...((current?.config as Record<string, unknown>) ?? {}),
    page_id: pageId,
    // Keep an existing token if the field is left blank.
    page_access_token:
      pageAccessToken ??
      ((current?.config as any)?.page_access_token ?? null),
    category: 'ads',
    platforms: ['facebook', 'instagram'],
  };

  const { error } = await supabase
    .from('integrations')
    .update({
      secret: verifyToken,
      config,
      is_enabled: enabled,
      status: enabled ? 'connected' : 'disconnected',
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/app/integrations/meta');
  revalidatePath('/app/integrations');
  return { success: 'Meta settings saved.' };
}

export async function toggleIntegration(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = str(fd, 'id');
  const enable = fd.get('enable') === 'true';
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from('integrations')
    .update({
      is_enabled: enable,
      status: enable ? 'connected' : 'disabled',
    })
    .eq('id', id);
  revalidatePath('/app/integrations');
}

// Run a simulated Meta lead through the real intake pipeline (no ad spend).
export async function simulateMetaLead(
  _prev: IntegrationState,
  fd: FormData
): Promise<IntegrationState> {
  await requireRole(['admin']);
  const integrationId = str(fd, 'integration_id');

  const value = {
    leadgen_id: `test_${Date.now()}`,
    created_time: new Date().toISOString(),
    platform: str(fd, 'platform') ?? 'facebook',
    campaign_name: str(fd, 'campaign'),
    campaign_id: str(fd, 'campaign_id'),
    adset_name: str(fd, 'ad_set'),
    ad_name: str(fd, 'ad'),
    form_name: str(fd, 'form') ?? 'Test Form',
    form_id: str(fd, 'form_id') ?? 'test_form',
    field_data: [
      { name: 'full_name', values: [str(fd, 'full_name') ?? 'Test Lead'] },
      { name: 'email', values: [str(fd, 'email') ?? ''] },
      { name: 'phone_number', values: [str(fd, 'phone') ?? ''] },
      { name: 'city', values: [str(fd, 'city') ?? ''] },
      { name: 'state', values: [str(fd, 'state') ?? ''] },
      { name: 'zip_code', values: [str(fd, 'zip') ?? ''] },
    ],
  };

  const result = await ingestLead(normalizeMetaValue(value), {
    integrationId,
    provider: 'meta',
    platform: value.platform,
    rawPayload: { simulated: true, value },
  });

  revalidatePath('/app/integrations/meta');
  revalidatePath('/app/lead-intake');

  if (result.status === 'created')
    return { success: 'Test lead created and pushed through the pipeline.' };
  if (result.status === 'duplicate')
    return { success: 'Detected as a duplicate — no new lead created (logged).' };
  return { error: result.error ?? 'Simulation failed.' };
}
