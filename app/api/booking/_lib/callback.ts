/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Resolved } from './resolve';

type Db = ReturnType<typeof createAdminClient>;

/**
 * "None of these times work": the homeowner asks to be called instead.
 * Homeowner funnels: a lead_activities entry flagged metadata.callback_requested
 * (scoped to the contractor when it is the contractor's calendar, so another
 * company never sees it). Sales funnel: a dated line in the submission's
 * review notes, and the matching prospect's callback is due now.
 * Once per session / submission.
 */

const NOTE_MAX = 300;

export async function callbackRequested(db: Db, r: Resolved): Promise<boolean> {
  if (r.kind === 'session') {
    if (!r.session.lead_id) return false;
    const { data } = await db.from('lead_activities').select('id').eq('lead_id', r.session.lead_id)
      .contains('metadata', { callback_requested: true, session_id: r.session.id }).limit(1);
    return (data ?? []).length > 0;
  }
  return /Asked for a callback/.test(r.submission.review_notes ?? '');
}

export async function requestCallback(db: Db, r: Resolved, note: string | null): Promise<{ ok: boolean; already: boolean }> {
  if (await callbackRequested(db, r)) return { ok: true, already: true };
  const clean = note?.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) || null;
  if (r.kind === 'session') {
    if (!r.session.lead_id) return { ok: false, already: false };
    const contractorId = r.calendar?.kind === 'contractor' ? r.calendar.contractorId : r.funnel.contractor_id;
    const { error } = await db.from('lead_activities').insert({
      lead_id: r.session.lead_id,
      type: 'contact_attempt',
      body: `Asked for a callback: none of the offered call times worked${clean ? `. Best time: ${clean}` : ''}`,
      metadata: {
        callback_requested: true,
        session_id: r.session.id,
        ...(r.calendar ? { calendar_id: r.calendar.id } : {}),
        ...(contractorId ? { contractor_id: contractorId } : {}),
        ...(clean ? { note: clean } : {}),
      },
    });
    return { ok: !error, already: false };
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const line = `[${stamp} UTC] Asked for a callback: none of the offered call times worked${clean ? `. Best time: ${clean}` : ''}`;
  const notes = [r.submission.review_notes?.trim(), line].filter(Boolean).join('\n');
  const { error } = await db.from('contractor_funnel_submissions').update({ review_notes: notes }).eq('id', r.submission.id);
  if (error) return { ok: false, already: false };
  if (r.submission.phone_e164) {
    // Best effort: surface it in the setters' "callbacks due" list when the prospect already exists.
    await db.from('contractor_prospects').update({ next_callback_at: new Date().toISOString() })
      .eq('phone_e164', r.submission.phone_e164).is('archived_at', null).is('next_callback_at', null);
  }
  return { ok: true, already: false };
}
