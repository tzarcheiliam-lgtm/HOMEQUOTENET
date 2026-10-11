import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import {
  fetchAuthorizedEmail,
  gmailOAuthConfig,
  saveGmailConnection,
  type GmailSenderKind,
} from '@/lib/emails/gmail';

const CALL_WORKSPACE_ROLES = ['admin', 'caller', 'setter'];

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
  if (!me || !me.is_active) return finish(request, 'forbidden');
  const state = request.nextUrl.searchParams.get('state');
  if (!sameState(state, request.cookies.get('hqn_gmail_oauth_state')?.value)) {
    return finish(request, 'invalid_state');
  }
  const kind: GmailSenderKind = state!.startsWith('automation.') ? 'automation' : 'user';
  const allowed = kind === 'automation' ? me.role === 'admin' : CALL_WORKSPACE_ROLES.includes(me.role);
  if (!allowed) return finish(request, 'forbidden');
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
      access_token?: string;
      refresh_token?: string;
      scope?: string;
    };
    if (!response.ok || !token.access_token || !token.refresh_token || !token.scope) {
      return finish(request, 'token_error');
    }
    const authorizedEmail = await fetchAuthorizedEmail(token.access_token);
    if (!authorizedEmail) return finish(request, 'token_error');
    await saveGmailConnection({
      kind,
      userId: kind === 'user' ? me.id : undefined,
      refreshToken: token.refresh_token,
      scope: token.scope,
      connectedBy: me.id,
      authorizedEmail,
    });
    return finish(request, kind === 'automation' ? 'connected_automation' : 'connected');
  } catch {
    return finish(request, 'token_error');
  }
}
