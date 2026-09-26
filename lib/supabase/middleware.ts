import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request and guards protected
 * routes. Returns the response with refreshed auth cookies.
 *
 * Anything under /app/* requires a logged-in user. The marketing/auth pages
 * (/, /sign-in, /sign-up) are public.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Public estimate routes and the Stripe webhook use their own scoped session cookie / webhook secret.
  // Avoid an unrelated Supabase Auth round trip on every quiz step and asset load.
  const publicPath = request.nextUrl.pathname;
  if (publicPath.startsWith('/estimate/') || publicPath.startsWith('/api/funnels/') || publicPath.startsWith('/api/stripe/')) return supabaseResponse;

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
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  // Match the /app segment exactly — a bare `startsWith('/app')` also catches
  // public marketing routes like /apply.
  const isProtected = pathname === '/app' || pathname.startsWith('/app/');
  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

  // Not signed in and trying to reach the app → send to sign-in, remembering
  // where they were going so the sign-in action can return them there. Only
  // the path is carried, never the host, and the action re-validates it.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Already signed in and visiting an auth page → into the app. /app itself
  // knows each role's home (a caller is sent on to /app/calls), so a plain
  // /app is enough here; a `next` the visitor arrived with is kept.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get('next');
    url.search = '';
    url.pathname = '/app';
    if (next && next.startsWith('/app') && !next.startsWith('//')) {
      url.pathname = next.split('?')[0];
      const qs = next.split('?')[1];
      if (qs) url.search = `?${qs}`;
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
