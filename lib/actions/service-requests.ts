'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getService } from '@/lib/growth/catalog';
import { sendServiceRequestAlertSoon } from '@/lib/growth/notify';
import { parseServiceRequest, statusUpdateSchema } from '@/lib/validation/service-request';

export type ServiceRequestState =
  | { ok: true; serviceName: string; contactEmail: string | null }
  | { ok: false; error: string }
  | undefined;

/**
 * A contractor asks HomeQuote for information about a growth service.
 * Collects interest only: nothing is purchased, billed or enrolled.
 *
 * The company and requesting user always come from the signed-in profile,
 * never from the form. RLS rejects any row for another company as well.
 */
export async function requestServiceInfo(
  _prev: ServiceRequestState,
  formData: FormData
): Promise<ServiceRequestState> {
  const profile = await requireRole(['contractor']);
  if (!profile.contractor_id) {
    return { ok: false, error: 'Your login isn’t linked to a company yet. Contact HomeQuote to finish setup.' };
  }
  const parsed = parseServiceRequest(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      contractor_id: profile.contractor_id,
      requested_by: profile.id,
      service: parsed.data.service,
      notes: parsed.data.notes,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Your company already has an open request for this service. We’ll be in touch about it.' };
    }
    return { ok: false, error: 'Your request couldn’t be sent. Please try again.' };
  }

  // Let the HQN team know (internal only; the contractor is never emailed).
  if (data?.id) sendServiceRequestAlertSoon(data.id);

  revalidatePath('/app/growth');
  revalidatePath('/app');
  revalidatePath('/app/service-requests');
  return {
    ok: true,
    serviceName: getService(parsed.data.service)?.name ?? 'this service',
    contactEmail: profile.email,
  };
}

/** Admin: move a request through New → Contacted → Proposal Sent → Accepted / Closed. */
export async function updateServiceRequestStatus(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const parsed = statusUpdateSchema.safeParse({ id: formData.get('id'), status: formData.get('status') });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from('service_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);
  if (error) throw new Error('The status couldn’t be updated. Try again.');
  revalidatePath('/app/service-requests');
}
