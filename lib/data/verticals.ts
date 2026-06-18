import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SubService, Vertical } from '@/lib/types';

export async function listVerticals(activeOnly = true): Promise<Vertical[]> {
  const supabase = await createClient();
  let query = supabase.from('verticals').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data } = await query;
  return (data as Vertical[]) ?? [];
}

export async function listSubServices(
  verticalId?: string
): Promise<SubService[]> {
  const supabase = await createClient();
  let query = supabase
    .from('sub_services')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (verticalId) query = query.eq('vertical_id', verticalId);
  const { data } = await query;
  return (data as SubService[]) ?? [];
}
