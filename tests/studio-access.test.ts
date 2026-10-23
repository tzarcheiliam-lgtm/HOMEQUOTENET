import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Seret studio (/studio, static files in public/studio/) is admins only, enforced in the middleware.
let user: { id: string } | null;
let authError: { name: string; status: number } | null;
let profile: { role: string; is_active: boolean } | null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) }),
  }),
}));

import { updateSession } from '@/lib/supabase/middleware';

const req = (path: string) => new NextRequest(new URL(path, 'https://app.homequotenet.com'));
const location = (res: Response) => (res.headers.get('location') ? new URL(res.headers.get('location')!).pathname : null);

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  user = { id: 'u1' };
  authError = null;
  profile = { role: 'admin', is_active: true };
});

describe('Seret studio access', () => {
  it('lets an active admin load the page and its assets', async () => {
    for (const path of ['/studio', '/studio/index.html', '/studio/assets/index-abc.js']) {
      const res = await updateSession(req(path));
      expect(res.status).toBe(200);
      expect(location(res)).toBeNull();
    }
  });

  it('sends a signed-out visitor to sign-in', async () => {
    user = null;
    authError = { name: 'AuthSessionMissingError', status: 400 };
    const res = await updateSession(req('/studio'));
    expect(location(res)).toBe('/sign-in');
  });

  it('sends every non-admin, an inactive admin, and a user with no profile back to /app', async () => {
    const cases = [
      ...(['setter', 'contractor', 'caller'] as const).map((role) => ({ role, is_active: true })),
      { role: 'admin', is_active: false },
      null,
    ];
    for (const p of cases) {
      profile = p;
      for (const path of ['/studio', '/studio/assets/index-abc.js']) {
        expect(location(await updateSession(req(path)))).toBe('/app');
      }
    }
  });

  it('stays closed when Supabase is unreachable or not configured', async () => {
    user = null;
    authError = { name: 'AuthRetryableFetchError', status: 0 };
    expect((await updateSession(req('/studio'))).status).toBe(503);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect((await updateSession(req('/studio'))).status).toBe(503);
  });
});
