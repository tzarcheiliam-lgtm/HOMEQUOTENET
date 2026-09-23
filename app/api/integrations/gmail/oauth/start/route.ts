import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { GMAIL_SEND_SCOPE, gmailOAuthConfig } from '@/lib/emails/gmail';

export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active) return NextResponse.redirect(new URL('/sign-in', request.url));
  if (me.role !== 'admin') return NextResponse.redirect(new URL('/app/calls/emails?gmail=forbidden', request.url));

  try {
    const config = gmailOAuthConfig();
    const state = randomBytes(32).toString('base64url');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GMAIL_SEND_SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);

    const response = NextResponse.redirect(url);
    response.cookies.set('hqn_gmail_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/integrations/gmail/oauth/callback',
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/app/calls/emails?gmail=not_configured', request.url));
  }
}
