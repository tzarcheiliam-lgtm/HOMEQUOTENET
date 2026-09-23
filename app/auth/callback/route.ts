import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/calls/redirect';

/**
 * Where invitation and password-reset emails land.
 *
 * Supabase puts either a PKCE `code` or a `token_hash` + `type` in the link.
 * Both are exchanged here for a session cookie, then the visitor continues to
 * `next` — normally /set-password, which is what an invited or resetting user
 * needs to do first. Before this route existed those links pointed at
 * /sign-in, where nothing consumed the token and the flow simply died.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  // /set-password is outside /app, so it needs its own allow-list entry.
  const rawNext = url.searchParams.get('next');
  const next =
    rawNext === '/set-password' ? rawNext : safeNextPath(rawNext, '/app');

  const supabase = await createClient();
  let failed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'invite' | 'recovery' | 'email' | 'magiclink' | 'signup',
    });
    failed = !!error;
  } else {
    failed = true;
  }

  const dest = url.clone();
  dest.search = '';
  if (failed) {
    dest.pathname = '/sign-in';
    dest.searchParams.set('error', 'link_expired');
    return NextResponse.redirect(dest);
  }
  dest.pathname = next.split('?')[0];
  const qs = next.split('?')[1];
  if (qs) dest.search = `?${qs}`;
  return NextResponse.redirect(dest);
}
