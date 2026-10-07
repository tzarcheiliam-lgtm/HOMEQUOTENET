import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SigningError } from '@/lib/signing/errors';
import type { RequestContext } from '@/lib/signing/signer';

export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || null;
  return { ip, userAgent: h.get('user-agent')?.slice(0, 400) ?? null };
}

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };

export function errorResponse(e: unknown) {
  if (e instanceof SigningError) {
    const status = e.code === 'invalid' || e.code === 'not_found' ? 404 : e.code === 'server' || e.code === 'storage' ? 500 : e.code === 'integrity' ? 409 : 400;
    return NextResponse.json({ ok: false, error: e.code, message: e.message, ...(e.extra?.fields ? { fields: e.extra.fields } : {}), ...(e.extra?.field_id ? { field_id: e.extra.field_id } : {}), ...(typeof e.extra?.remaining === 'number' ? { remaining: e.extra.remaining } : {}) }, { status, headers: NO_STORE });
  }
  // Never echo internals (or anything that could contain a token) to the client or the log.
  return NextResponse.json({ ok: false, error: 'server', message: 'Something went wrong. Please try again.' }, { status: 500, headers: NO_STORE });
}
