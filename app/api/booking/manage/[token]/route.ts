import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelByManageToken, rescheduleByManageToken } from '@/lib/booking/book.server';
import { isManageTokenShape } from '@/lib/booking/tokens';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import type { ManageResponse } from '@/components/booking/types';
import { fail, limited, originOk, readJson, reply } from '../../_lib/http';
import { loadManaged } from '../../_lib/manage';

/**
 * The homeowner's self-service link (no login): /booking/manage/<token>.
 *   GET  -> the booking (time, who with, phone / video, can it still change)
 *   POST { action: 'reschedule', startsAt } -> moves it (same re-check + lock as booking)
 *   POST { action: 'cancel', reason? }      -> cancels it (idempotent)
 * A call in the past, already held or cancelled is read-only (the RPCs refuse
 * too: not_active / too_soon).
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reschedule'), startsAt: z.string().datetime({ offset: true }) }),
  z.object({ action: z.literal('cancel'), reason: z.string().max(500).optional() }),
]);

export async function GET(request: Request, context: Context) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'manageRead')) return fail('rate_limited', {}, { 'Retry-After': '60' });
  const { token } = await context.params;
  if (!isManageTokenShape(token)) return fail('not_found');
  try {
    const m = await loadManaged(createAdminClient(), token);
    if (!m) return fail('not_found');
    const body: ManageResponse = { ok: true, booking: m.booking };
    return reply(body);
  } catch {
    return fail('unavailable');
  }
}

export async function POST(request: Request, context: Context) {
  if (!originOk(request)) return fail('forbidden');
  const { token } = await context.params;
  if (!isManageTokenShape(token)) return fail('not_found');
  if (limited(request, 'manageWrite', token.slice(0, 16))) return fail('rate_limited', {}, { 'Retry-After': '60' });
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail('invalid_request');
  try {
    const db = createAdminClient();
    const m = await loadManaged(db, token);
    if (!m) return fail('not_found');
    if (parsed.data.action === 'cancel') {
      if (m.booking.status === 'cancelled') return reply({ ok: true, booking: m.booking } satisfies ManageResponse);
      if (!m.booking.canChange) return fail('not_active');
      const result = await cancelByManageToken(token, parsed.data.reason?.trim() || null, db);
      if (!result.ok) return fail(result.error);
    } else {
      if (!m.booking.canChange) return fail('not_active');
      const result = await rescheduleByManageToken(token, parsed.data.startsAt, db);
      if (!result.ok) return fail(result.error);
    }
    flushNotificationsSoon();
    const after = await loadManaged(db, token);
    if (!after) return fail('not_found');
    return reply({ ok: true, booking: after.booking } satisfies ManageResponse);
  } catch (error) {
    console.error('[booking-manage] change failed', error instanceof Error ? error.name : 'unknown');
    return fail('unavailable');
  }
}
