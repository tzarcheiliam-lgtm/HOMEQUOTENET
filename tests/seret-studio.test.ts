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
