'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ALLOWED_AUDIENCES, AUDIENCES, isNotificationType } from '@/lib/notifications/types';

/** Recipient ids may only ever be HomeQuote staff: never a contractor user. */
const SELECTABLE_STAFF_ROLES = ['admin', 'setter', 'caller'] as const;

/**
 * Save who one notification type is addressed to. Admin only. Audiences that
 * do not apply to the type are ignored, and hand-picked people are re-checked
 * server-side (active HomeQuote staff only), so a forged form cannot add a
 * contractor user or an unknown id.
 */
export async function saveRoutingRule(formData: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const type = String(formData.get('type') ?? '');
  if (!isNotificationType(type)) throw new Error('Unknown notification type');
  const allowed = ALLOWED_AUDIENCES[type];

  const rule: Record<string, unknown> = { type, updated_by: me.id, updated_at: new Date().toISOString() };
  for (const audience of AUDIENCES) {
    rule[audience] = allowed.includes(audience) && formData.get(audience) === 'on';
  }

  const requested = Array.from(new Set(formData.getAll('specific_user_ids').map(String))).filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
  let specific: string[] = [];
  const supabase = await createClient();
  if (requested.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .in('id', requested.slice(0, 50))
      .in('role', [...SELECTABLE_STAFF_ROLES])
      .eq('is_active', true);
    specific = (data ?? []).map((p: { id: string }) => p.id);
  }
  rule.specific_user_ids = specific;

  const { error } = await supabase.from('notification_routing_rules').upsert(rule, { onConflict: 'type' });
  if (error) throw new Error('Could not save the routing rule');
  revalidatePath('/app/settings/notification-routing');
}

/** Back to the built-in default for one type. */
export async function resetRoutingRule(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const type = String(formData.get('type') ?? '');
  if (!isNotificationType(type)) throw new Error('Unknown notification type');
  const supabase = await createClient();
  await supabase.from('notification_routing_rules').delete().eq('type', type);
  revalidatePath('/app/settings/notification-routing');
}
