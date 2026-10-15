/* eslint-disable @typescript-eslint/no-explicit-any -- loose mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  link: { data: { properties: { hashed_token: 'hash123' } } as unknown, error: null as unknown },
  sent: [] as Record<string, any>[],
  sendFails: false,
  fallback: [] as unknown[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: async () => h.link } } }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { resetPasswordForEmail: async (...a: unknown[]) => void h.fallback.push(a) } }),
}));
vi.mock('@/lib/emails/gmail', () => ({
  sendGmailMessage: async (m: Record<string, any>) => {
    if (h.sendFails) throw new Error('HomeQuote Gmail is not connected');
    h.sent.push(m);
    return { id: '1', fromEmail: 'info@homequotenet.com' };
  },
}));

import { publicSiteUrl } from '@/lib/auth/site-url';
import { buildResetEmail, resetPageUrl, sendPasswordReset } from '@/lib/auth/password-reset';

beforeEach(() => {
  h.link = { data: { properties: { hashed_token: 'hash123' } }, error: null };
  h.sent = [];
  h.fallback = [];
  h.sendFails = false;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.homequotenet.com';
});

describe('publicSiteUrl', () => {
  it('uses the configured URL', () => {
    expect(publicSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://app.homequotenet.com/', NODE_ENV: 'production' })).toBe('https://app.homequotenet.com');
  });
  it('never returns localhost in production when the env var is missing or wrong', () => {
    expect(publicSiteUrl({ NODE_ENV: 'production' })).toBe('https://homequotenet.com');
    expect(publicSiteUrl({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', NODE_ENV: 'production' })).toBe('https://homequotenet.com');
    expect(publicSiteUrl({ NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'app.homequotenet.com' })).toBe('https://app.homequotenet.com');
  });
  it('allows localhost in development', () => {
    expect(publicSiteUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3000');
  });
});

describe('password reset email', () => {
  it('points at HomeQuote’s own reset page with an encoded token', () => {
    expect(resetPageUrl('a/b+c', 'https://x.test')).toBe('https://x.test/reset-password?token_hash=a%2Fb%2Bc');
  });

  it('is branded and carries the link in both html and text', () => {
    const mail = buildResetEmail('https://x.test/reset-password?token_hash=t', 'https://x.test');
    expect(mail.subject).toContain('HomeQuote');
    expect(mail.html).toContain('href="https://x.test/reset-password?token_hash=t"');
    expect(mail.text).toContain('https://x.test/reset-password?token_hash=t');
    expect(mail.html).not.toContain('supabase');
  });

  it('sends through HomeQuote (not Supabase) and never links to localhost', async () => {
    await expect(sendPasswordReset('pat@example.com')).resolves.toBe('sent');
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].toEmail).toBe('pat@example.com');
    expect(h.sent[0].html).toContain('https://app.homequotenet.com/reset-password?token_hash=hash123');
    expect(JSON.stringify(h.sent[0])).not.toContain('localhost');
    expect(h.fallback).toHaveLength(0);
  });

  it('stays silent for unknown emails (no enumeration, nothing sent)', async () => {
    h.link = { data: null, error: { message: 'User not found' } };
    await expect(sendPasswordReset('nobody@example.com')).resolves.toBe('skipped');
    expect(h.sent).toHaveLength(0);
  });

  it('falls back to the Supabase email, with a real redirect URL, if our sender is down', async () => {
    h.sendFails = true;
    await expect(sendPasswordReset('pat@example.com')).resolves.toBe('fallback');
    expect(h.fallback[0]).toEqual(['pat@example.com', { redirectTo: 'https://app.homequotenet.com/auth/callback?next=/set-password' }]);
  });
});
