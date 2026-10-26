import type { SupabaseClient } from '@supabase/supabase-js';
import bathroom from '../../content/funnels/bathroom-remodel.json';
import kitchen from '../../content/funnels/kitchen-remodel.json';
import { funnelSchema, type FunnelConfig } from './schema';

/** Ready-made, strictly qualifying house funnels. Both use the same Meta dataset, set in each config's trackingPixels. */
export const FUNNEL_PRESETS: { slug: string; label: string; config: unknown }[] = [
  { slug: 'bathroom-remodel', label: 'Bathroom remodel', config: bathroom },
  { slug: 'kitchen-remodel', label: 'Kitchen remodel', config: kitchen },
];

export const presetConfig = (slug: string): FunnelConfig => funnelSchema.parse(FUNNEL_PRESETS.find((p) => p.slug === slug)!.config);

export interface InstallResult { created: { slug: string; id: string; label: string }[]; existing: string[]; error?: string }

/**
 * Creates any preset funnel that does not exist yet, as a DRAFT house funnel (leads land unassigned in the HomeQuote inbox).
 * Idempotent by slug: running it again never duplicates or overwrites a funnel. Publishing stays a separate, deliberate step.
 */
export async function installPresetFunnels(db: SupabaseClient, createdBy: string | null): Promise<InstallResult> {
  const result: InstallResult = { created: [], existing: [] };
  for (const preset of FUNNEL_PRESETS) {
    const config = funnelSchema.safeParse(preset.config);
    if (!config.success) return { ...result, error: `${preset.label} has an invalid configuration.` };
    const { data: found } = await db.from('funnels').select('id').eq('slug', preset.slug).maybeSingle();
    if (found) { result.existing.push(preset.label); continue; }
    const { data, error } = await db.from('funnels').insert({
      slug: preset.slug, contractor_id: null, is_demo: false, status: 'draft', config: config.data, created_by: createdBy,
    }).select('id').single();
    if (error || !data) return { ...result, error: `Could not create the ${preset.label.toLowerCase()} funnel.` };
    result.created.push({ slug: preset.slug, id: (data as { id: string }).id, label: preset.label });
  }
  return result;
}
