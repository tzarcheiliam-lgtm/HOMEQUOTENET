import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseCookieOptions } from './cookie-options';
import { safeNextPath } from '@/lib/calls/redirect';

/**
 * A redirect built from scratch has none of the Set-Cookie headers that
 * getUser() just wrote when it refreshed the session. Dropping them strands the
 * browser with a rotated-away refresh token — the classic "random logout". Every
 * redirect therefore carries the refreshed cookies across.
 */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

/** Network/5xx trouble reaching Supabase: says nothing about whether the session is valid. */
function isTransientAuthError(error: { name?: string; status?: number } | null): boolean {
  if (!error) return false;
  return error.name === 'AuthRetryableFetchError' || (typeof error.status === 'number' && error.status >= 500);
}

function retryPage(): NextResponse {
  return new NextResponse(
    '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=3><title>Reconnecting…</title><body style="font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><p>Reconnecting to HomeQuote…</p>',
    {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '3' },
    }
  );
}

/**
 * Refreshes the Supabase auth session on every request and guards protected
 * routes. Returns the response with refreshed auth cookies.
 *
 * Anything under /app/* requires a logged-in user. The marketing/auth pages
 * (/, /sign-in, /sign-up) are public.
 *
 * Persistence: the session is a long-lived cookie (see cookie-options.ts), so
 * closing/killing the Home Screen app never signs anyone out. The redirect to
 * /sign-in happens only when Supabase positively says there is no valid
 * session — never on a transient network error.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Public estimate routes and the Stripe webhook use their own scoped session cookie / webhook secret.
  // Avoid an unrelated Supabase Auth round trip on every quiz step and asset load.
  const publicPath = request.nextUrl.pathname;
  if (publicPath.startsWith('/estimate/') || publicPath.startsWith('/api/funnels/') || publicPath.startsWith('/api/stripe/')) return supabaseResponse;
  // The service worker and manifest are fetched by the browser itself (often in the
  // background): they need no session and must not trigger a token refresh.
  if (publicPath === '/sw.js' || publicPath === '/manifest.webmanifest' || publicPath === '/offline.html') return supabaseResponse;

  // Guard: if the Supabase env vars aren't present in this build, don't throw
  // (which would 500 the entire site via MIDDLEWARE_INVOCATION_FAILED). Skip the
  // auth refresh and let the request through; pages handle auth themselves.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — skipping session refresh.'
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser().
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  // Match the /app segment exactly — a bare `startsWith('/app')` also catches
  // public marketing routes like /apply.
  const isProtected = pathname === '/app' || pathname.startsWith('/app/');
  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

  // Supabase unreachable (offline, wake from sleep, brief outage): that is NOT
  // "signed out". The cookie is left untouched; show a self-retrying page rather
  // than bouncing the user to sign-in.
  if (!user && isTransientAuthError(authError)) {
    return isProtected ? retryPage() : supabaseResponse;
  }

  // Not signed in and trying to reach the app → send to sign-in, remembering
  // where they were going (returnTo) so signing in lands them back there — e.g.
  // a tapped push notification. Only the path is carried, never a host, and the
  // sign-in action re-validates it (safeNextPath).
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = '';
    url.searchParams.set('returnTo', `${pathname}${search}`);
    return redirectWithCookies(url, supabaseResponse);
  }

  // Already signed in and visiting an auth page → into the app. /app itself
  // knows each role's home (a caller is sent on to /app/calls), so a plain
  // /app is enough here; a returnTo the visitor arrived with is kept.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get('returnTo') ?? url.searchParams.get('next');
    url.search = '';
    const dest = safeNextPath(next, '/app');
    url.pathname = dest.split('?')[0];
    const qs = dest.split('?')[1];
    if (qs) url.search = `?${qs}`;
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}
