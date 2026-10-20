import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProfile } from '@/lib/auth';
import { canSetUpMeta, connectionOwner } from '@/lib/meta/setup/connections';
import { SCOPES_MANAGE, SCOPES_READ, metaAppConfig, metaConnectReady } from '@/lib/meta/setup/config';
import { STATE_COOKIE, authorizeUrl, safeReturnPath, signState } from '@/lib/meta/setup/oauth';

export const dynamic = 'force-dynamic';

/**
 * Starts Meta authorization. The user logs in on Facebook's own page: HomeQuote never sees a Meta password.
 * Only HomeQuote admins and contractor owners may connect; the connection is bound to that user's company.
 */
export async function GET(request: Request) {
  const profile = await getProfile().catch(() => null);
  const back = (q: string) => NextResponse.redirect(new URL(`/app?meta=${q}`, request.url));
  if (!profile) return NextResponse.redirect(new URL('/sign-in', request.url));
  if (!canSetUpMeta(profile)) return back('forbidden');
  const cfg = metaAppConfig();
  if (!cfg || !metaConnectReady()) return back('not_configured');

  const url = new URL(request.url);
  const level = url.searchParams.get('level') === 'manage' ? 'manage' : 'read';
  const { state, nonce } = signState(cfg.appSecret, { u: profile.id, c: connectionOwner(profile), lvl: level, r: safeReturnPath(url.searchParams.get('return')) });
  const res = NextResponse.redirect(authorizeUrl(cfg, state, level === 'manage' ? SCOPES_MANAGE : SCOPES_READ));
  res.cookies.set(STATE_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/integrations/meta/connect', maxAge: 600 });
  void cookies;
  return res;
}
