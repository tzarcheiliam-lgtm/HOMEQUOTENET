'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireCallWorkspace } from '@/lib/auth';

/**
 * Records that the signed-in person used "Add to Google / Apple Calendar" on a
 * sales appointment, for its current time (migration 0066). The button reads
 * this back so the same meeting is not added twice. Never blocks the add: a
 * failure here only means the button keeps offering it.
 */
const input = z.object({ id: z.string().uuid(), provider: z.enum(['google', 'apple']) });

export async function markSalesAppointmentAdded(id: string, provider: 'google' | 'apple'): Promise<{ ok: boolean }> {
  const me = await requireCallWorkspace();
  const parsed = input.safeParse({ id, provider });
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  // RLS: only an appointment this person can see.
  const { data: appt } = await supabase.from('prospect_sales_appointments').select('scheduled_at').eq('id', id).maybeSingle();
  if (!appt) return { ok: false };

  const { error } = await supabase
    .from('sales_appointment_calendar_adds')
    .upsert(
      { appointment_id: id, user_id: me.id, provider, scheduled_at: appt.scheduled_at, added_at: new Date().toISOString() },
      { onConflict: 'appointment_id,user_id,provider' }
    );
  if (error) return { ok: false };
  revalidatePath('/app/calls/appointments');
  return { ok: true };
}
