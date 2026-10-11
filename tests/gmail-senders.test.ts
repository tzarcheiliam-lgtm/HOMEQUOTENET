import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

type Row = { id: string; kind: 'automation' | 'user'; user_id: string | null; email_address: string; encrypted_refresh_token: string; last_error: string | null };

const h = vi.hoisted(() => ({ rows: [] as Row[], inserted: [] as Record<string, unknown>[], updated: [] as { id: string; values: Record<string, unknown> }[] }));

// Minimal query-builder fake: chained .eq() filters, then maybeSingle() or await.
function builder(rows: Row[]) {
  const filters: [string, unknown][] = [];
  const matches = () => rows.filter((r) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v));
  const api = {
    select: () => api,
    eq: (k: string, v: unknown) => (filters.push([k, v]), api),
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: matches(), error: null }),
  };
  return api;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => builder(h.rows),
      insert: async (values: Record<string, unknown>) => (h.inserted.push(values), { error: null }),
      update: (values: Record<string, unknown>) => ({
        eq: async (_k: string, id: string) => (h.updated.push({ id, values }), { error: null }),
      }),
    }),
  }),
}));

import { fetchAuthorizedEmail, resolveGmailSender, saveGmailConnection, GMAIL_SEND_SCOPE } from '@/lib/emails/gmail';

const row = (over: Partial<Row>): Row => ({
  id: 'c1', kind: 'automation', user_id: null, email_address: 'info@homequotenet.com', encrypted_refresh_token: 'x', last_error: null, ...over,
});

beforeEach(() => {
  h.rows = [];
  h.inserted = [];
  h.updated = [];
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
});

describe('Gmail sender resolution', () => {
  it('uses the member\'s own connection when they have one', async () => {
    h.rows = [row({}), row({ id: 'c2', kind: 'user', user_id: 'u1', email_address: 'liam@homequotenet.com' })];
    await expect(resolveGmailSender('u1')).resolves.toEqual({ kind: 'user', email: 'liam@homequotenet.com' });
  });

  it('falls back to the automation sender when the member has none', async () => {
    h.rows = [row({}), row({ id: 'c2', kind: 'user', user_id: 'u1', email_address: 'liam@homequotenet.com' })];
    await expect(resolveGmailSender('u2')).resolves.toEqual({ kind: 'automation', email: 'info@homequotenet.com' });
  });

  it('uses the automation sender when no member is given', async () => {
    h.rows = [row({}), row({ id: 'c2', kind: 'user', user_id: 'u1', email_address: 'liam@homequotenet.com' })];
    await expect(resolveGmailSender()).resolves.toEqual({ kind: 'automation', email: 'info@homequotenet.com' });
  });

  it('returns null when nothing is connected', async () => {
    await expect(resolveGmailSender('u1')).resolves.toBeNull();
  });
});

describe('saveGmailConnection', () => {
  const base = { refreshToken: 'r', scope: `openid email ${GMAIL_SEND_SCOPE}`, connectedBy: 'admin1', authorizedEmail: 'info@homequotenet.com' };

  it('replaces the automation sender in place so the address can be changed', async () => {
    h.rows = [row({ email_address: 'old@gmail.com' })];
    await saveGmailConnection({ ...base, kind: 'automation' });
    expect(h.inserted).toHaveLength(0);
    expect(h.updated[0]).toMatchObject({ id: 'c1', values: { email_address: 'info@homequotenet.com', last_error: null } });
  });

  it('creates a personal sender for a member who has none', async () => {
    await saveGmailConnection({ ...base, kind: 'user', userId: 'u1', authorizedEmail: 'liam@homequotenet.com' });
    expect(h.inserted[0]).toMatchObject({ kind: 'user', user_id: 'u1', email_address: 'liam@homequotenet.com' });
  });

  it('requires a member for a personal sender', async () => {
    await expect(saveGmailConnection({ ...base, kind: 'user' })).rejects.toThrow('team member');
  });

  it('rejects a grant without the send permission', async () => {
    await expect(saveGmailConnection({ ...base, kind: 'automation', scope: 'openid email' })).rejects.toThrow('send permission');
  });
});

describe('fetchAuthorizedEmail', () => {
  it('reads the granting account from the userinfo endpoint', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ email: 'liam@homequotenet.com' }))) as unknown as typeof fetch;
    await expect(fetchAuthorizedEmail('token', request)).resolves.toBe('liam@homequotenet.com');
  });

  it('returns null when Google refuses the userinfo request', async () => {
    const request = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    await expect(fetchAuthorizedEmail('token', request)).resolves.toBeNull();
  });
});
