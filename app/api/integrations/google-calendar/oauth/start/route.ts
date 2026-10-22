import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { GOOGLE_CALENDAR_SCOPES, googleCalendarReady } from '@/lib/calendar/config';
import { buildAuthUrl, pkceChallenge } from '@/lib/calendar/google';

const COOKIE_PATH = '/api/integrations/google-calendar/oauth/callback';

/** Contractor users connect their own Google Calendar. (Staff/admins have no contractor calendar to connect.) */
export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active) return NextResponse.redirect(new URL('/sign-in', request.url));
  const back = new URL('/app/availability', request.url);
  if (me.role !== 'contractor' || !me.contractor_id) {
    back.searchParams.set('calendar', 'forbidden');
    return NextResponse.redirect(back);
  }
  if (!googleCalendarReady()) {
    back.searchParams.set('calendar', 'not_configured');
    return NextResponse.redirect(back);
  }

  // The state must equal the httpOnly cookie, and the PKCE verifier never leaves the server/cookie.
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const url = buildAuthUrl({
    state,
    codeChallenge: pkceChallenge(verifier),
    loginHint: me.email,
    scopes: GOOGLE_CALENDAR_SCOPES,
  });
  const response = NextResponse.redirect(url);
  const cookie = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: COOKIE_PATH, maxAge: 600 };
  response.cookies.set('hqn_gcal_oauth_state', `${me.id}.${state}`, cookie);
  response.cookies.set('hqn_gcal_oauth_verifier', verifier, cookie);
  return response;
}
