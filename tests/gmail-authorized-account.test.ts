import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

import { authorizedAccountMatches, fetchAuthorizedEmail } from '@/lib/emails/gmail';

describe('Gmail authorized account check', () => {
  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(authorizedAccountMatches(' Liam@HomeQuoteNet.com ', 'liam@homequotenet.com')).toBe(true);
  });

  it('rejects a different Google account than the configured sender', () => {
    expect(authorizedAccountMatches('homequotenetwork@gmail.com', 'liam@homequotenet.com')).toBe(false);
  });

  it('reads the granting account from the userinfo endpoint', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ email: 'liam@homequotenet.com' }))) as unknown as typeof fetch;
    await expect(fetchAuthorizedEmail('token', request)).resolves.toBe('liam@homequotenet.com');
  });

  it('returns null when Google refuses the userinfo request', async () => {
    const request = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    await expect(fetchAuthorizedEmail('token', request)).resolves.toBeNull();
  });
});
