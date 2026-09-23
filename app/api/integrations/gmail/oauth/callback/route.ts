import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { gmailOAuthConfig, saveGmailConnection } from '@/lib/emails/gmail';

function sameState(left: string | null, right: string | undefined): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function finish(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`/app/calls/emails?gmail=${status}`, request.url));
  response.cookies.set('hqn_gmail_oauth_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/integrations/gmail/oauth/callback',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active || me.role !== 'admin') return finish(request, 'forbidden');
  if (!sameState(request.nextUrl.searchParams.get('state'), request.cookies.get('hqn_gmail_oauth_state')?.value)) {
    return finish(request, 'invalid_state');
  }
  const code = request.nextUrl.searchParams.get('code');
  if (!code || request.nextUrl.searchParams.get('error')) return finish(request, 'cancelled');

  try {
    const config = gmailOAuthConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const token = (await response.json().catch(() => ({}))) as {
      refresh_token?: string;
      scope?: string;
    };
    if (!response.ok || !token.refresh_token || !token.scope) return finish(request, 'token_error');
    await saveGmailConnection({
      refreshToken: token.refresh_token,
      scope: token.scope,
      connectedBy: me.id,
    });
    return finish(request, 'connected');
  } catch {
    return finish(request, 'token_error');
  }
}
