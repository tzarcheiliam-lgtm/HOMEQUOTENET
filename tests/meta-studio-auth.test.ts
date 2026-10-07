import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('must not touch the database when unauthorized'); } }));

describe('Studio server actions are admin-only', () => {
  const src = readFileSync(new URL('../lib/actions/meta-studio.ts', import.meta.url), 'utf8');
  // Split into top-level exported async functions.
  const fns = [...src.matchAll(/export async function (\w+)\(([\s\S]*?)\n}\n/g)].map((m) => ({ name: m[1], body: m[0] }));

  it('finds the actions', () => expect(fns.length).toBeGreaterThan(25));

  it.each(fns.map((f) => [f.name, f.body]))('%s calls requireRole([\'admin\']) before doing anything', (_name, body) => {
    const guard = (body as string).indexOf("requireRole(['admin'])");
    expect(guard).toBeGreaterThan(-1);
    // The guard must precede any database or Meta access.
    const firstAccess = (body as string).search(/admin\(\)|createAdminClient|writerOrNull|readOptions/);
    if (firstAccess !== -1) expect(guard).toBeLessThan(firstAccess);
  });

  it('the typed confirmations required by the product brief exist', () => {
    expect(src).toContain('ENABLE META WRITES');
    expect(src).toContain('START AUTOMATION');
    expect(src).toContain('ENABLE AUTO');
  });
});

describe('scheduler endpoint', () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  const call = async (header?: string) => {
    const { POST } = await import('@/app/api/meta/studio-tick/route');
    return POST(new Request('https://x.test/api/meta/studio-tick', { method: 'POST', headers: header ? { authorization: header } : {} }));
  };
  it('rejects when no secret is configured', async () => { vi.stubEnv('META_TICK_SECRET', ''); expect((await call('Bearer anything')).status).toBe(401); });
  it('rejects a missing or wrong bearer token without touching the database', async () => {
    vi.stubEnv('META_TICK_SECRET', 'correct-secret');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
  });
});

describe('credentials never leak into UI-facing modules', () => {
  it('no component or page references a token env var', () => {
    const files = ['components/meta/studio/settings-forms.tsx', 'components/meta/studio/draft-actions.tsx', 'app/app/meta-ads/settings/page.tsx', 'app/app/meta-ads/create/[id]/page.tsx'];
    for (const f of files) {
      const text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
      expect(text, f).not.toMatch(/process\.env\.META_(ADS_WRITE|MARKETING_ACCESS|CONVERSIONS_API)_TOKEN/);
    }
  });
});
