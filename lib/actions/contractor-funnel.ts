'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_RULES, type QualificationRules } from '@/lib/contractor-funnel/schema';
import { parseCalendarUrl } from '@/lib/contractor-funnel/settings.server';

export type ContractorFunnelSettingsState = { error?: string; success?: string } | undefined;

export async function updateContractorFunnelSettings(
  _prev: ContractorFunnelSettingsState,
  fd: FormData,
): Promise<ContractorFunnelSettingsState> {
  await requireRole(['admin']);

  const calendarRaw = String(fd.get('sales_calendar_url') ?? '').trim();
  if (calendarRaw && !parseCalendarUrl(calendarRaw)) {
    return { error: 'The sales calendar URL must be a full https:// link (for example a Calendly event link).' };
  }
  const pixel = String(fd.get('meta_pixel_id') ?? '').trim();
  if (pixel && !/^\d{8,20}$/.test(pixel)) return { error: 'The Meta Pixel ID should be 8–20 digits.' };

  const rules = Object.fromEntries(
    (Object.keys(DEFAULT_RULES) as (keyof QualificationRules)[]).map((k) => [k, fd.get(k) === 'on']),
  );

  const { error } = await createAdminClient()
    .from('contractor_funnel_settings')
    .upsert({
      id: 'default',
      sales_calendar_url: calendarRaw || null,
      meta_pixel_id: pixel || null,
      rules,
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: 'Could not save settings. Has migration 0045 been applied?' };

  revalidatePath('/app/funnels/contractor-prospects');
  return { success: 'Settings saved.' };
}
