'use client';

type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Pixel; loaded?: boolean; version?: string };
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel; hqnPixels?: Set<string> } }
const emitted = new Set<string>();
/** Stable IDs can also be used by a future CAPI integration for deduplication. No PII. */
export function trackFunnel(sessionId: string, slug: string, event: 'ViewContent' | 'Lead' | 'Schedule', pixelId?: string) {
  const eventId = `${sessionId}:${event}`;
  try { if (localStorage.getItem(`hqn-event:${eventId}`)) return; } catch { /* Memory fallback. */ }
  if (emitted.has(eventId)) return;
  if (pixelId) {
    if (!window.fbq) {
      const pixel: Pixel = (...args: unknown[]) => pixel.callMethod ? pixel.callMethod(...args) : pixel.queue!.push(args);
      pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0';
      window.fbq = pixel; window._fbq = pixel;
      const script = document.createElement('script'); script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    window.hqnPixels ??= new Set();
    if (!window.hqnPixels.has(pixelId)) { window.fbq('init', pixelId); window.hqnPixels.add(pixelId); }
    window.fbq('trackSingle', pixelId, event, { content_name: slug }, { eventID: eventId });
  }
  window.dispatchEvent(new CustomEvent('hqn:funnel', { detail: { event, eventId, funnel: slug } }));
  emitted.add(eventId);
  try { localStorage.setItem(`hqn-event:${eventId}`, '1'); } catch { /* Memory fallback. */ }
}
