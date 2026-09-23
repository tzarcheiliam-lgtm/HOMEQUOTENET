import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { runRefresh, MAX_PER_CALLER, type ProgressEvent } from '@/lib/prospecting/run';

/**
 * POST /api/calls/refresh — "Find New Prospects".
 *
 * Streams newline-delimited JSON progress events while the run works, then a
 * final `done` / `not_configured` / `error` event. Admin only: the handler
 * checks the profile itself, and every write inside goes through the user's
 * RLS-scoped client, so a non-admin gets 403 here and would be refused by
 * the database anyway.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  nicheSlug: z.string().min(1),
  customNiche: z.string().max(80).optional().nullable(),
  callers: z.enum(['liam', 'nadav', 'both']),
  perCaller: z.number().int().min(1).max(MAX_PER_CALLER),
});

export async function POST(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      };
      try {
        await runRefresh(supabase, me, parsed.data, emit);
      } catch (e) {
        emit({ type: 'error', message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      /* client went away; the run row keeps whatever was written */
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
