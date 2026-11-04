import { NextResponse, type NextRequest } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { runCslbImport, MAX_PER_CALLER, type ProgressEvent } from '@/lib/prospecting/run';

/**
 * POST /api/calls/import-cslb — add prospects from a CSLB license list.
 *
 * The dialog reads the downloaded .xlsx/.csv in the browser and sends only
 * the license rows (JSON, gzipped when the browser can, flagged by the
 * X-Body-Gzip header) so even a county-wide list stays under the upload
 * limit. Every row is re-judged here; nothing from the browser is trusted.
 * Streams the same newline-delimited JSON progress events as
 * /api/calls/refresh. Admin only, and every write is through the admin's
 * RLS-scoped client.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_LICENSES = 100_000;
const MAX_BODY_BYTES = 60 * 1024 * 1024;

const text = (max: number) => z.string().max(max).nullable();
const licenseSchema = z.object({
  licenseNumber: z.string().min(1).max(20),
  businessName: z.string().min(1).max(300),
  businessType: text(100),
  address: text(300),
  city: text(100),
  zip: text(20),
  county: text(100),
  phone: text(40),
  classes: z.array(z.string().max(20)).max(40),
  status: text(100),
  workersComp: z.enum(['insured', 'exempt', 'unknown']),
});

const bodySchema = z.object({
  nicheSlug: z.string().min(1),
  customNiche: z.string().max(80).optional().nullable(),
  callerIds: z.array(z.string().uuid()).min(1).max(2),
  perCaller: z.number().int().min(1).max(MAX_PER_CALLER),
  fileName: z.string().max(200).optional().nullable(),
  licenses: z.array(licenseSchema).min(1, 'The file has no usable license rows.').max(MAX_LICENSES),
});

export async function POST(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let json: unknown = null;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    const body = request.headers.get('x-body-gzip') === '1' ? gunzipSync(raw, { maxOutputLength: MAX_BODY_BYTES }) : raw;
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Could not read the upload. Try again.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
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
        await runCslbImport(supabase, me, parsed.data, emit);
      } catch (e) {
        emit({ type: 'error', message: (e as Error).message });
      } finally {
        controller.close();
      }
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
