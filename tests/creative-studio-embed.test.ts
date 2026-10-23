import { describe, expect, it } from 'vitest';
import { parseEmbedCode } from '@/lib/creative-studio/embed';

const ok = (s: string) => { const r = parseEmbedCode(s); if (!r.ok) throw new Error(r.error); return r.embed; };

describe('parseEmbedCode', () => {
  it('pulls the src out of the full div + iframe snippet', () => {
    const e = ok(`<div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden;">
      <iframe
        src="https://muapi.ai/embed/404b73cb-7d75-40b9-96e9-3965c768fa70"
        frameborder="0" allowfullscreen style="position: absolute;"></iframe></div>`);
    expect(e).toEqual({ src: 'https://muapi.ai/embed/404b73cb-7d75-40b9-96e9-3965c768fa70', isAgent: false, suggestedTitle: '404b73cb-7d75-40b9-96e9-3965c768fa70' });
  });
  it('detects an assistant (agent) embed and handles single quotes / attribute order', () => {
    const e = ok(`<iframe style="width:100%" src='https://muapi.ai/embed/agent/MYDb5661RPR5SZoUXdL2p3NznT9YnZcQ' allow="clipboard-write"></iframe>`);
    expect(e.isAgent).toBe(true); expect(e.src).toBe('https://muapi.ai/embed/agent/MYDb5661RPR5SZoUXdL2p3NznT9YnZcQ');
  });
  it('accepts a bare https link and decodes &amp;', () => {
    expect(ok('https://example.com/embed/x?a=1&amp;b=2').src).toBe('https://example.com/embed/x?a=1&b=2');
  });
  it('rejects empty input, non-embed text, http, logins, javascript: and iframes without a src', () => {
    for (const bad of ['', '   ', 'hello', 'http://muapi.ai/embed/x', 'https://user:pw@muapi.ai/embed/x', '<iframe src="javascript:alert(1)"></iframe>', '<iframe srcdoc="<b>x</b>"></iframe>', '<iframe src="data:text/html,hi"></iframe>']) {
      expect(parseEmbedCode(bad).ok).toBe(false);
    }
  });
});
