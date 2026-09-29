import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type GetUser = () => Promise<{ data: { user: unknown }; error: unknown }>;
let getUser: GetUser;
let refreshedCookies: { name: string; value: string; options: object }[] = [];
let capturedOptions: { cookieOptions?: { maxAge?: number; path?: string; sameSite?: string } } = {};

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookieOptions?: object; cookies: { setAll: (c: typeof refreshedCookies) => void } }
  ) => {
    capturedOptions = opts as typeof capturedOptions;
    return {
      auth: {
        getUser: async () => {
          const r = await getUser();
          // Simulate the SDK rotating tokens while validating an expired access token.
          if (refreshedCookies.length) opts.cookies.setAll(refreshedCookies);
          return r;
        },
      },
    };
  },
}));

import { updateSession } from '@/lib/supabase/middleware';
import { safeNextPath } from '@/lib/calls/redirect';

const req = (path: string) => new NextRequest(new URL(path, 'https://app.homequotenet.com'));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  refreshedCookies = [];
  getUser = async () => ({ data: { user: { id: 'u1' } }, error: null });
});

describe('session persistence in middleware', () => {
  it('uses one explicit long-lived cookie policy', async () => {
    await updateSession(req('/app'));
    expect(capturedOptions.cookieOptions).toMatchObject({ path: '/', sameSite: 'lax', maxAge: 400 * 24 * 60 * 60 });
  });

  it('lets a valid session straight through to the requested deep link', async () => {
    const res = await updateSession(req('/app/leads/123'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('a refreshed session keeps its new cookies when the middleware redirects', async () => {
    refreshedCookies = [{ name: 'sb-x-auth-token', value: 'rotated', options: { maxAge: 34560000, path: '/' } }];
    const res = await updateSession(req('/sign-in?returnTo=/app/leads/123'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/app/leads/123');
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('rotated');
  });

  it('a positively signed-out visitor is sent to sign-in with returnTo, cookies intact', async () => {
    getUser = async () => ({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } });
    const res = await updateSession(req('/app/leads/123?tab=notes'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/sign-in');
    expect(loc.searchParams.get('returnTo')).toBe('/app/leads/123?tab=notes');
  });

  it('a network/5xx error is NOT treated as signed out', async () => {
    for (const error of [{ name: 'AuthRetryableFetchError', status: 0 }, { name: 'AuthApiError', status: 503 }]) {
      getUser = async () => ({ data: { user: null }, error });
      const res = await updateSession(req('/app/appointments'));
      expect(res.status).toBe(503);
      expect(res.headers.get('location')).toBeNull();
    }
    // ...and a public page still renders.
    getUser = async () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0 } });
    expect((await updateSession(req('/sign-in'))).status).toBe(200);
  });

  it('never touches auth for the service worker or manifest', async () => {
    getUser = async () => {
      throw new Error('should not be called');
    };
    expect((await updateSession(req('/sw.js'))).status).toBe(200);
    expect((await updateSession(req('/manifest.webmanifest'))).status).toBe(200);
  });

  it('does not follow an unsafe returnTo for an already signed-in user', async () => {
    for (const bad of ['//evil.example', 'https://evil.example', '/apply', '/\\evil.example']) {
      const res = await updateSession(req(`/sign-in?returnTo=${encodeURIComponent(bad)}`));
      expect(new URL(res.headers.get('location')!).pathname).toBe('/app');
    }
  });
});

describe('returnTo safety', () => {
  it('keeps internal app routes', () => {
    expect(safeNextPath('/app/leads/123', '/app')).toBe('/app/leads/123');
    expect(safeNextPath(encodeURIComponent('/app/calls/appointments?x=1'), '/app')).toBe('/app/calls/appointments?x=1');
  });
  it('rejects everything else', () => {
    for (const bad of ['https://evil.example/app', '//evil.example', '/\\evil', '/apply', 'javascript:alert(1)', '/sign-in', '/app/x\r\nSet-Cookie: a=b', '/app/https://evil.example']) {
      expect(safeNextPath(bad, '/app')).toBe('/app');
    }
  });
});
