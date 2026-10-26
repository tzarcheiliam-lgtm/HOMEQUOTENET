import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import {
  GMAIL_IDENTITY_SCOPES,
  GMAIL_SEND_SCOPE,
  gmailOAuthConfig,
  type GmailSenderKind,
} from '@/lib/emails/gmail';

const CALL_WORKSPACE_ROLES = ['admin', 'caller', 'setter'];

/**
 * `?kind=user` (default) connects the signed-in member's own Gmail; any call
 * workspace member may do this. `?kind=automation` connects the shared sender
 * used by workflows, signing, lead and billing emails, and is admin-only.
 */
export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active) return NextResponse.redirect(new URL('/sign-in', request.url));
  const kind: GmailSenderKind = request.nextUrl.searchParams.get('kind') === 'automation' ? 'automation' : 'user';
  const allowed = kind === 'automation' ? me.role === 'admin' : CALL_WORKSPACE_ROLES.includes(me.role);
  if (!allowed) return NextResponse.redirect(new URL('/app/calls/emails?gmail=forbidden', request.url));

  try {
    const config = gmailOAuthConfig();
    // The kind rides in the state so the callback knows which slot to fill. It
    // is only trusted because the whole value must equal the httpOnly cookie.
    const state = `${kind}.${randomBytes(32).toString('base64url')}`;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', [GMAIL_SEND_SCOPE, ...GMAIL_IDENTITY_SCOPES].join(' '));
    url.searchParams.set('access_type', 'offline');
    // Always show the account chooser (otherwise Google reuses the browser's
    // default login). Whichever account is approved becomes the sender.
    url.searchParams.set('prompt', 'select_account consent');
    const hint = kind === 'automation' ? config.automationHintEmail : me.email;
    if (hint) url.searchParams.set('login_hint', hint);
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
