import { NextResponse } from 'next/server';
import { NO_STORE, errorResponse, requestContext } from '@/lib/signing/request';
import { SigningError } from '@/lib/signing/errors';
import { signerConsent, signerDecline, signerOpen, signerSubmit } from '@/lib/signing/signer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const MAX_BODY = 3 * 1024 * 1024;

/**
 * Signer API. The signing token travels in the JSON body (never in a URL), so it does not appear in
 * request logs, Referer headers or browser history.
 */
export async function POST(request: Request) {
  try {
    const len = Number(request.headers.get('content-length') ?? 0);
    if (len > MAX_BODY) throw new SigningError('bad_request', 'That request is too large.');
    const body = (await request.json().catch(() => null)) as { action?: string; token?: unknown; [k: string]: unknown } | null;
    if (!body || typeof body.action !== 'string') throw new SigningError('bad_request', 'Bad request.');
    const ctx = await requestContext();
    switch (body.action) {
      case 'open': return NextResponse.json({ ok: true, ...(await signerOpen(body.token, ctx)) }, { headers: NO_STORE });
      case 'consent': await signerConsent(body.token, ctx); return NextResponse.json({ ok: true }, { headers: NO_STORE });
      case 'submit': return NextResponse.json(await signerSubmit(body.token, { values: body.values, timezone: body.timezone }, ctx), { headers: NO_STORE });
      case 'decline': await signerDecline(body.token, typeof body.reason === 'string' ? body.reason : '', ctx); return NextResponse.json({ ok: true }, { headers: NO_STORE });
      default: throw new SigningError('bad_request', 'Bad request.');
    }
  } catch (e) {
    return errorResponse(e);
  }
}
