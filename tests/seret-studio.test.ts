import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { navItemsForRole } from '@/lib/nav';

describe('Seret studio', () => {
  it('is built from studio/ into public/studio and served at /studio', () => {
    const vite = readFileSync('studio/vite.config.mjs', 'utf8');
    expect(vite).toContain("base: '/studio/'");
    expect(vite).toContain("outDir: '../public/studio'");
    const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:studio'];
    // Never bake a kie.ai key into the public bundle.
    expect(script).toContain('VITE_KIE_KEY= ');
    // Vercel builds with NODE_ENV=production; without this npm ci skips Vite/Tailwind (devDependencies).
    expect(script).toContain('npm ci --include=dev');
  });

  it('is an admin-only menu item that opens /studio in a new tab', () => {
    const item = navItemsForRole('admin').find((i) => i.label === 'Seret');
    expect(item).toMatchObject({ href: '/studio', newTab: true, group: 'Growth' });
    for (const role of ['setter', 'contractor', 'caller'] as const) {
      expect(navItemsForRole(role).some((i) => i.href === '/studio')).toBe(false);
    }
  });

  it('replaces the old Creative Studio page', () => {
    for (const role of ['admin', 'setter', 'contractor', 'caller'] as const) {
      expect(navItemsForRole(role).some((i) => i.href === '/app/creative-studio')).toBe(false);
    }
    expect(existsSync('app/app/creative-studio')).toBe(false);
    expect(readFileSync('next.config.ts', 'utf8')).toContain("source: '/app/creative-studio', destination: '/studio'");
  });
});

describe('Seret redesign data', async () => {
  const { getCatalog } = await import('../studio/src/lib/catalog.js');
  const { PRESETS } = await import('../studio/src/lib/presets.js');
  const MODEL_INFO = (await import('../studio/src/lib/modelInfo.js')).MODEL_INFO as Record<string, { maker: string; price?: { source: string } }>;
  const { specsFor } = await import('../studio/src/lib/specs.js');
  const { href, currentRoute } = await import('../studio/src/lib/router.js');
  const catalog = getCatalog();

  it('presets only use models that run on kie.ai, with aspect ratios those models support', () => {
    for (const p of PRESETS.filter((x) => x.model)) {
      const m = catalog.find((c) => c.id === p.model);
      expect(m?.runsAs, p.id).toBeTruthy();
      expect(m?.kind).toBe(p.page);
      if (p.aspect_ratio) expect(specsFor(m!).aspect, p.id).toContain(p.aspect_ratio);
    }
  });

  it('model details exist only for models kie.ai runs, and every price names its source', () => {
    const runs = new Set(catalog.map((m) => m.runsAs).filter(Boolean));
    for (const [name, info] of Object.entries(MODEL_INFO)) {
      expect(runs.has(name), name).toBe(true);
      expect(info.maker).toBeTruthy();
      if (info.price) expect(info.price.source).toMatch(/^https:\/\/kie\.ai\//);
    }
    for (const name of runs) expect(MODEL_INFO[name as string], String(name)).toBeTruthy();
  });

  it('routes round-trip, including model pages and deep-link params', () => {
    const at = (h: string) => { (globalThis as { location?: { hash: string } }).location = { hash: h }; return currentRoute(); };
    expect(at('')).toMatchObject({ page: 'explore' });
    expect(at('#/nonsense')).toMatchObject({ page: 'explore' });
    expect(at(href('models', {}, 'veo3.1-text-to-video'))).toMatchObject({ page: 'models', id: 'veo3.1-text-to-video' });
    expect(at(href('image', { prompt: 'a kitchen & bath', model: 'nano-banana-2' })).params).toEqual({ prompt: 'a kitchen & bath', model: 'nano-banana-2' });
  });
});
