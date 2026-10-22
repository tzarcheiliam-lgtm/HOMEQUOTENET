import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { readBody, sameOrigin } from '@/lib/funnels/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildFbc, sendMetaEvent } from '@/lib/meta/capi';
import { resolvedPixelId } from '@/lib/adu-quiz/config';

export const dynamic = 'force-dynamic';

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const bodySchema = z.object({ submissionId: z.string().uuid(), token: z.string().regex(/^[a-f0-9]{48}$/) });

/**
 * Records that a qualified lead finished booking (the calendar redirected to
 * /adu-quiz/booked). Authorised by the secret returned from the lead call, then
 * sends the server-side Meta Schedule event, deduplicated by event id.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  const parsed = bodySchema.safeParse(await readBody(request).catch(() => null));
  if (!parsed.success) return reply({ error: 'Invalid request.' }, 400);
  const { submissionId, token } = parsed.data;
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('adu_quiz_leads')
      .select('first_name, last_name, email, phone, answers, tracking, consent_page_url, measurement_allowed, qualified, access_token_hash, booked_at')
      .eq('submission_id', submissionId).maybeSingle();
    if (error) throw error;
    if (!data || !data.qualified || data.access_token_hash !== createHash('sha256').update(token).digest('hex')) return reply({ error: 'Not found.' }, 404);
    if (!data.booked_at) {
      await db.from('adu_quiz_leads').update({ booked_at: new Date().toISOString() }).eq('submission_id', submissionId);
      const pixelId = resolvedPixelId();
      if (pixelId && data.measurement_allowed) {
        const t = (data.tracking ?? {}) as Record<string, string>;
        const header = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
        after(async () => {
          await sendMetaEvent({
            pixelId, eventName: 'Schedule', eventId: `${submissionId}:Schedule`, eventSourceUrl: data.consent_page_url,
            user: {
              email: data.email, phone: data.phone, firstName: data.first_name, lastName: data.last_name,
              zip: (data.answers as { zip?: string })?.zip,
              clientIpAddress: header?.split(',')[0]?.trim() || undefined, clientUserAgent: request.headers.get('user-agent') ?? undefined,
              fbp: t.fbp, fbc: t.fbc ?? buildFbc(t.fbclid, Date.now()),
            },
          });
        });
      }
    }
    return reply({ ok: true });
  } catch {
    console.error(`[adu-quiz] could not record booking for ${submissionId}`);
    return reply({ error: 'Could not record the booking.' }, 503);
  }
}
