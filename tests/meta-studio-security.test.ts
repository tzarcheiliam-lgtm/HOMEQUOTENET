// CREDENTIAL SECURITY. Static analysis of the source tree + behavioural tests with fake tokens. SIMULATED: fake tokens, no Meta.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('no database in this test'); } }));

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'tests'].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
};
const src = ['app', 'lib', 'components'].flatMap((d) => walk(join(ROOT, d)));
const rel = (p: string) => relative(ROOT, p).replaceAll('\\', '/');
const read = (p: string) => readFileSync(p, 'utf8');

describe('write credential is isolated', () => {
  it('META_ADS_WRITE_TOKEN is read from process.env in exactly one module', () => {
    const readers = src.filter((p) => /process\.env\.META_ADS_WRITE_TOKEN/.test(read(p))).map(rel).sort();
    // server.ts supplies the token; the action only tests for its PRESENCE (to say "Setup required"); lib/data/meta-studio.ts
    // reports presence through has('NAME') and never touches the value.
    expect(readers).toEqual(['lib/actions/meta-studio.ts', 'lib/meta/studio/server.ts']);
    expect(read(join(ROOT, 'lib/data/meta-studio.ts'))).toMatch(/has\('META_ADS_WRITE_TOKEN'\)/);
    const valueReaders = src.filter((p) => /(?<!!)process\.env\.META_ADS_WRITE_TOKEN\s*(\|\||\?\?|;|\))/.test(read(p)) && /return process\.env\.META_ADS_WRITE_TOKEN|META_ADS_WRITE_TOKEN \|\| null/.test(read(p))).map(rel);
    expect(valueReaders).toEqual(['lib/meta/studio/server.ts']);
  });

  it('the reporting / conversion modules never import or mention the write client or write token', () => {
    const reporting = ['lib/meta/sync.ts', 'lib/meta/marketing-api.ts', 'lib/meta/queue.ts', 'lib/meta/queue.server.ts', 'lib/meta/conversions.ts', 'lib/meta/capi.ts', 'lib/meta/metrics.ts',
      'lib/meta/hqn-metrics.ts', 'lib/data/meta-ads.ts', 'lib/data/meta-ads-admin.ts', 'lib/actions/meta-ads.ts', 'app/api/meta/tick/route.ts'];
    for (const f of reporting) {
      const text = read(join(ROOT, f));
      expect(text, f).not.toMatch(/META_ADS_WRITE_TOKEN|studio\/write-api|from '\.\/studio|createMetaWriter|writerOrNull/);
    }
  });

  it('only the Studio write path imports the write client', () => {
    const importers = src.filter((p) => /from '(\.\/|@\/lib\/meta\/studio\/)write-api'/.test(read(p))).map(rel).sort();
    expect(importers).toEqual(['lib/meta/studio/create-ad.ts', 'lib/meta/studio/proposals.ts', 'lib/meta/studio/server.ts']);
  });

  it('no client component imports server modules or references any token variable', () => {
    for (const p of src) {
      const text = read(p);
      if (!/^['"]use client['"]/m.test(text.slice(0, 200))) continue;
      expect(text, rel(p)).not.toMatch(/studio\/server|studio\/write-api|drafts\.server|rules\.server|audits\.server|supabase\/admin/);
      expect(text, rel(p)).not.toMatch(/process\.env\.(META_|SUPABASE_SERVICE)/);
    }
  });

  it('no token or secret is exposed through a NEXT_PUBLIC variable', () => {
    const example = read(join(ROOT, '.env.example'));
    expect(example).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(META|TOKEN|SECRET)/);
    for (const p of src) expect(read(p), rel(p)).not.toMatch(/NEXT_PUBLIC_META/);
  });
});

describe('tokens are not stored or logged', () => {
  it('no token / secret column exists in the Meta migrations', () => {
    for (const f of ['0042_meta_ads_analytics_outcomes.sql', '0043_meta_ads_studio.sql']) {
      const sql = read(join(ROOT, 'supabase/migrations', f)).replace(/--.*$/gm, '');
      expect(sql, f).not.toMatch(/\b(access_token|refresh_token|token_encrypted|api_key|app_secret|client_secret|password)\b/i);
    }
  });

  it('the Studio code has no console logging (nothing to leak through server logs)', () => {
    const studio = src.filter((p) => /lib\/meta\/studio|lib\/actions\/meta-studio|app\/app\/meta-ads|components\/meta\/studio|app\/api\/meta\/studio-tick/.test(p.replaceAll('\\', '/')));
    expect(studio.length).toBeGreaterThan(20);
    for (const p of studio) expect(read(p), rel(p)).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });

  it('the CAPI logger redacts Meta error text', () => {
    expect(read(join(ROOT, 'lib/meta/capi.ts'))).toMatch(/redactSecrets\(body\.error\?\.message\)/);
  });
});

describe('redaction', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('removes patterns AND the exact values of held credentials, wherever they appear', async () => {
    vi.stubEnv('META_ADS_WRITE_TOKEN', 'WRITE-super-secret-value-123');
    vi.stubEnv('META_MARKETING_ACCESS_TOKEN', 'READ-another-secret-value-456');
    const { redact } = await import('@/lib/meta/studio/redact');
    const out = redact('boom WRITE-super-secret-value-123 and READ-another-secret-value-456, access_token=abc123xyz, Bearer sometoken.value, EAAGm0PX4ZCpsBAxxxxxxxxxxxxxxxxxxxxxxxx');
    expect(out).not.toMatch(/WRITE-super|READ-another|abc123xyz|sometoken|EAAGm0PX/);
    expect(out).toContain('[redacted]');
  });

  it('does not shred ordinary text when a secret is short or empty', async () => {
    vi.stubEnv('META_ADS_WRITE_TOKEN', 'abc');
    vi.stubEnv('META_APP_SECRET', '');
    const { redact } = await import('@/lib/meta/studio/redact');
    expect(redact('the abc campaign is fine')).toBe('the abc campaign is fine');
    expect(redact(undefined)).toBe('');
  });

  it('a Meta error that echoes the token never reaches a stored/returned failure message', async () => {
    const token = 'EAAWriteTokenValue1234567890abcdef';
    vi.stubEnv('META_ADS_WRITE_TOKEN', token);
    const { createMetaWriter } = await import('@/lib/meta/studio/write-api');
    const fetchImpl = (async () => new Response(JSON.stringify({ error: { message: `Invalid token ${token} for request`, code: 190 } }), { status: 400 })) as unknown as typeof fetch;
    const w = createMetaWriter({ token, fetchImpl });
    const r = await w.post('act_1/campaigns', { name: 'x' });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(token);
    const g = await w.get('1', { fields: 'status' });
    expect(JSON.stringify(g)).not.toContain(token);
  });

  it('the token travels only in the Authorization header (never in a URL or body)', async () => {
    const token = 'EAAWriteTokenValue1234567890abcdef';
    const { createMetaWriter } = await import('@/lib/meta/studio/write-api');
    const seen: { url: string; body: string; auth: string | null }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => { seen.push({ url, body: String(init.body ?? ''), auth: new Headers(init.headers).get('authorization') }); return new Response('{"id":"1","data":[]}', { status: 200 }); }) as unknown as typeof fetch;
    const w = createMetaWriter({ token, fetchImpl });
    await w.post('act_1/campaigns', { name: 'x', status: 'PAUSED' });
    await w.get('act_1/campaigns', { fields: 'id' });
    for (const s of seen) { expect(s.url).not.toContain(token); expect(s.body).not.toContain(token); expect(s.auth).toBe(`Bearer ${token}`); }
    expect(seen).toHaveLength(2);
  });
});

describe('reporting cannot pick up write credentials (and vice versa)', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('with only the write token set, the reporting options are empty', async () => {
    vi.stubEnv('META_MARKETING_ACCESS_TOKEN', ''); vi.stubEnv('META_ADS_WRITE_TOKEN', 'WRITE-ONLY-token-value');
    const s = await import('@/lib/meta/studio/server');
    expect(s.readOptions()).toBeNull();
    expect(s.writerOrNull()).not.toBeNull();
  });
  it('with only the reporting token set, no writer can be created', async () => {
    vi.stubEnv('META_MARKETING_ACCESS_TOKEN', 'READ-ONLY-token-value'); vi.stubEnv('META_ADS_WRITE_TOKEN', '');
    const s = await import('@/lib/meta/studio/server');
    expect(s.readOptions()).toEqual({ token: 'READ-ONLY-token-value' });
    expect(s.writerOrNull()).toBeNull();
  });
  it('with both set, each side gets only its own', async () => {
    vi.stubEnv('META_MARKETING_ACCESS_TOKEN', 'READ-token-value-1'); vi.stubEnv('META_ADS_WRITE_TOKEN', 'WRITE-token-value-2');
    const s = await import('@/lib/meta/studio/server');
    expect(s.readOptions()).toEqual({ token: 'READ-token-value-1' });
    expect(s.readToken()).toBe('READ-token-value-1');
    expect(s.writeToken()).toBe('WRITE-token-value-2');
  });
});

describe('uploaded content is untrusted', () => {
  it('the finalizer measures the stored object instead of trusting the browser’s size claim', () => {
    const text = read(join(ROOT, 'lib/actions/meta-studio.ts'));
    expect(text).toContain('storedObjectSize');
    expect(text).not.toMatch(/Number\(c\.bytes\)/);
  });
});
