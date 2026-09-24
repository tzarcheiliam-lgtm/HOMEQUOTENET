import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); });
it('deduplicates pixel events across repeated calls and module reloads with no PII', async () => {
  const values = new Map<string, string>();
  const fbq = vi.fn(); const dispatchEvent = vi.fn();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) });
  vi.stubGlobal('window', { fbq, dispatchEvent, hqnPixels: new Set() });
  let { trackFunnel } = await import('@/lib/funnels/tracking');
  trackFunnel('session-1', 'pool-demo', 'Lead', '123456789');
  trackFunnel('session-1', 'pool-demo', 'Lead', '123456789');
  vi.resetModules(); ({ trackFunnel } = await import('@/lib/funnels/tracking'));
  trackFunnel('session-1', 'pool-demo', 'Lead', '123456789');
  expect(fbq.mock.calls.filter(c => c[0] === 'trackSingle')).toHaveLength(1);
  expect(fbq).toHaveBeenCalledWith('trackSingle', '123456789', 'Lead', { content_name: 'pool-demo' }, { eventID: 'session-1:Lead' });
  expect(dispatchEvent).toHaveBeenCalledTimes(1);
});
