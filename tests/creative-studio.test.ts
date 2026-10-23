import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGENT_ID, CREATIVE_AGENT, CREATIVE_TOOLS, EMBED_ID, MOTC_STUDIO, agentSrc, embedSrc } from '@/content/creative-studio';
import { navItemsForRole } from '@/lib/nav';

describe('Creative Studio', () => {
  it('every entry has a unique slug, a real embed id and the muapi embed url', () => {
    expect(new Set(CREATIVE_TOOLS.map((t) => t.slug)).size).toBe(CREATIVE_TOOLS.length);
    expect(new Set(CREATIVE_TOOLS.map((t) => t.embedId)).size).toBe(CREATIVE_TOOLS.length);
    for (const t of CREATIVE_TOOLS) {
      expect(t.embedId).toMatch(EMBED_ID);
      expect(embedSrc(t.embedId)).toBe(`https://muapi.ai/embed/${t.embedId}`);
      expect(t.title && t.kind && t.description).toBeTruthy();
    }
  });
  it('starts with the three provided generators', () => {
    expect(CREATIVE_TOOLS.map((t) => t.embedId)).toEqual([
      '404b73cb-7d75-40b9-96e9-3965c768fa70', '69fbd591-9410-47ae-862d-3171e5baacac', '01e6d66b-b009-4f72-8498-d2441010d7ca',
    ]);
  });
  it('has the featured assistant on the muapi agent embed url', () => {
    expect(CREATIVE_AGENT?.agentId).toMatch(AGENT_ID);
    expect(agentSrc(CREATIVE_AGENT!.agentId)).toBe('https://muapi.ai/embed/agent/MYDb5661RPR5SZoUXdL2p3NznT9YnZcQ');
  });
  it('features MOTC, served from the studio build at /studio', () => {
    expect(MOTC_STUDIO.src).toBe('/studio');
    const vite = readFileSync('studio/vite.config.mjs', 'utf8');
    expect(vite).toContain("base: '/studio/'");
    expect(vite).toContain("outDir: '../public/studio'");
    // Never bake a kie.ai key into the public bundle.
    const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:studio'];
    expect(script).toContain('VITE_KIE_KEY= ');
    // Vercel builds with NODE_ENV=production; without this npm ci skips Vite/Tailwind (devDependencies).
    expect(script).toContain('npm ci --include=dev');
  });
  it('is an admin-only nav item', () => {
    expect(navItemsForRole('admin').some((i) => i.href === '/app/creative-studio')).toBe(true);
    for (const role of ['setter', 'contractor', 'caller'] as const) {
      expect(navItemsForRole(role).some((i) => i.href === '/app/creative-studio')).toBe(false);
    }
  });
});
