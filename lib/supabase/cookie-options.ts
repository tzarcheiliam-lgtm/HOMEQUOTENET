import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * One explicit, persistent cookie policy for the Supabase session, shared by
 * the browser, server and middleware clients so they can never disagree.
 *
 * The session lives in cookies (not sessionStorage), with a long Max-Age, so a
 * Home Screen app that is closed, killed, backgrounded, locked or the phone
 * restarted still finds it on next launch. The cookie only carries the
 * session; it is still bound by the JWT expiry + refresh-token rotation on
 * Supabase's side, so a revoked or expired session stops working regardless of
 * the cookie's age.
 */
export const SESSION_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days: the browser maximum

export const supabaseCookieOptions: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  maxAge: SESSION_COOKIE_MAX_AGE,
  secure: process.env.NODE_ENV === 'production',
};
