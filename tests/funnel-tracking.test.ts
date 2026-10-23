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
  expect(fbq).toHaveBeenCalledWith('trackSingle', '123456789', 'Lead', { content_category: 'Pool', niche: 'pool', content_name: 'pool-demo' }, { eventID: 'session-1:Lead' });
  expect(dispatchEvent).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(fbq.mock.calls)).not.toMatch(/@|session-1:Lead.*\d{7,}/);
});

it('tags every event with the niche from the funnel industry, so one pixel can be split by niche', async () => {
  const fbq = vi.fn(); const dispatchEvent = vi.fn();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  vi.stubGlobal('window', { fbq, dispatchEvent, hqnPixels: new Set() });
  vi.resetModules();
  const { trackFunnel } = await import('@/lib/funnels/tracking');
  trackFunnel('s-bath', 'my-quote-funnel', 'Lead', '123456789', 'Bathroom remodeling');
  trackFunnel('s-kitchen', 'my-quote-funnel', 'Lead', '123456789', 'Kitchen remodeling');
  expect(fbq).toHaveBeenCalledWith('trackSingle', '123456789', 'Lead', { content_category: 'Bathroom Remodeling', niche: 'bathroom', content_name: 'my-quote-funnel' }, { eventID: 's-bath:Lead' });
  expect(fbq).toHaveBeenCalledWith('trackSingle', '123456789', 'Lead', { content_category: 'Kitchen Remodeling', niche: 'kitchen', content_name: 'my-quote-funnel' }, { eventID: 's-kitchen:Lead' });
  expect((dispatchEvent.mock.calls[0][0] as CustomEvent).detail.niche).toBe('bathroom');
});
