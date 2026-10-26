'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { REVIEW_STATUSES } from '@/lib/contractor-funnel/labels';

export type ReviewState = { error?: string; success?: string } | undefined;

export async function updateContractorSubmissionReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  await requireRole(['admin']);
  const id = String(fd.get('id') ?? '');
  const status = String(fd.get('review_status') ?? '');
  const notes = String(fd.get('review_notes') ?? '').trim().slice(0, 4000);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'Missing submission.' };
  if (!REVIEW_STATUSES.some((s) => s.value === status)) return { error: 'Choose a valid status.' };

  const { error } = await createAdminClient()
    .from('contractor_funnel_submissions')
    .update({ review_status: status, review_notes: notes || null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: 'Could not save. Please try again.' };
  revalidatePath('/app/contractor-funnel');
  revalidatePath(`/app/contractor-funnel/${id}`);
  return { success: 'Saved.' };
}
