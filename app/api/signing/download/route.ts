import { NextResponse } from 'next/server';
import { NO_STORE, errorResponse } from '@/lib/signing/request';
import { SigningError } from '@/lib/signing/errors';
import { downloadSession, downloadWithToken } from '@/lib/signing/signer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { action?: string; token?: unknown; kind?: string } | null;
    if (!body) throw new SigningError('bad_request', 'Bad request.');
    if (body.action === 'session') return NextResponse.json({ ok: true, ...(await downloadSession(body.token)) }, { headers: NO_STORE });
    if (body.action === 'url' && (body.kind === 'final' || body.kind === 'certificate')) {
      return NextResponse.json({ ok: true, url: await downloadWithToken(body.token, body.kind) }, { headers: NO_STORE });
    }
    throw new SigningError('bad_request', 'Bad request.');
  } catch (e) {
    return errorResponse(e);
  }
}
