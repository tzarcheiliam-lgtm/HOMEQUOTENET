import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CallbackResponse } from '@/components/booking/types';
import { fail, limited, originOk, readJson, reply } from '../_lib/http';
import { requestCallback } from '../_lib/callback';
import { resolveGrant } from '../_lib/resolve';

/**
 * POST /api/booking/callback { grant, note? } — "None of these times work":
 * records that the homeowner (or contractor prospect) wants a call instead,
 * with an optional best time. Once per session / submission; a repeat says so.
 * Allowed for any saved submission, qualified or not, as long as it did not book.
 */
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ grant: z.string().min(10).max(400), note: z.string().max(500).optional() });

export async function POST(request: Request) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'callback')) return fail('rate_limited', {}, { 'Retry-After': '600' });
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail('invalid_request');
  try {
    const db = createAdminClient();
    const r = await resolveGrant(db, parsed.data.grant);
    if (!r) return fail('session_invalid');
    if (r.kind === 'session' && (!r.session.contact_submitted_at || !r.session.lead_id)) return fail('session_incomplete');
    const result = await requestCallback(db, r, parsed.data.note ?? null);
    if (!result.ok) return fail('unavailable');
    const body: CallbackResponse = { ok: true, already: result.already };
    return reply(body);
  } catch (error) {
    console.error('[booking-callback] failed', error instanceof Error ? error.name : 'unknown');
    return fail('unavailable');
  }
}
