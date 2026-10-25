import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const lookups: string[] = [];
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: (_c: string, hash: string) => ({ maybeSingle: async () => { lookups.push(hash); return { data: null }; } }) }),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
  }),
}));

const { newApiKey, verifyApiKey } = await import('@/lib/seret/keys');

describe('Seret API keys', () => {
  it('are 256-bit seret_ keys stored only as a SHA-256 hash', () => {
    const { key, hash, prefix } = newApiKey();
    expect(key).toMatch(/^seret_[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key.slice(6));
    expect(key.startsWith(prefix)).toBe(true);
    expect(newApiKey().key).not.toBe(key);
  });

  it('only looks up well-formed Bearer keys, by hash', async () => {
    lookups.length = 0;
    expect(await verifyApiKey(null)).toBeNull();
    expect(await verifyApiKey('Bearer nope')).toBeNull();
    expect(await verifyApiKey('seret_' + 'a'.repeat(43))).toBeNull(); // no "Bearer"
    expect(lookups).toHaveLength(0);
    const { key, hash } = newApiKey();
    expect(await verifyApiKey(`Bearer ${key}`)).toBeNull(); // unknown key
    expect(lookups).toEqual([hash]);
  });
});
