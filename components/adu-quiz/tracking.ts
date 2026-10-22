'use client';

/**
 * Browser tracking for /adu-quiz. Follows the site's existing funnel rules
 * (components/contractor-funnel/tracking.tsx, lib/funnels/tracking.ts):
 *  - Events carry a name, a stable event id and a step number (BuildStep also the
 *    design choice, e.g. "modern"). Never a screening answer or any contact detail,
 *    and nothing contact-related goes in a URL.
 *  - The Meta Pixel and Google tag load lazily (after the page is idle, or on
 *    the first event) and only when advertising measurement is allowed.
 *  - Every event also goes to window.dataLayer (picked up by Google Tag Manager
 *    if one is ever added) and as an `hqn:adu-quiz` DOM event.
 *  - The same event id is used server-side (Meta Conversions API) so Meta
 *    deduplicates the browser and server copies.
 */

type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Pixel; loaded?: boolean; version?: string };
declare global {
  interface Window { fbq?: Pixel; _fbq?: Pixel; hqnPixels?: Set<string>; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

/**
 * BuildStart / BuildStep / DesignComplete cover the visual-builder half, QuizStart / QuizStep the
 * screening half. Together they give the funnel drop-off by step.
 */
export type QuizEvent = 'BuildStart' | 'BuildStep' | 'DesignComplete' | 'QuizStart' | 'QuizStep' | 'Lead' | 'QualifiedLead' | 'Schedule';
const META_STANDARD = new Set<QuizEvent>(['Lead', 'Schedule']);
const GOOGLE_NAME: Partial<Record<QuizEvent, string>> = { Lead: 'generate_lead' };

export type TrackingConfig = { metaPixelId: string; googleTagId: string; measurementMode: 'opt_in' | 'opt_out' };

const CHOICE_KEY = 'hqn-adu-quiz-measurement';
const emitted = new Set<string>();

export function readMeasurement(mode: TrackingConfig['measurementMode']): boolean {
  try {
    const stored = localStorage.getItem(CHOICE_KEY);
    if (stored === 'yes') return true;
    if (stored === 'no') return false;
  } catch { /* Optional storage. */ }
  return mode === 'opt_out';
}
export function writeMeasurement(on: boolean) {
  try { localStorage.setItem(CHOICE_KEY, on ? 'yes' : 'no'); } catch { /* Optional storage. */ }
}

function loadMetaPixel(pixelId: string) {
  if (!window.fbq) {
    const pixel: Pixel = (...args: unknown[]) => (pixel.callMethod ? pixel.callMethod(...args) : pixel.queue!.push(args));
    pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0';
    window.fbq = pixel; window._fbq = pixel;
    const script = document.createElement('script');
    script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  window.hqnPixels ??= new Set();
  if (!window.hqnPixels.has(pixelId)) {
    window.fbq('init', pixelId);
    window.hqnPixels.add(pixelId);
    window.fbq('trackSingle', pixelId, 'PageView');
  }
}

function loadGoogleTag(tagId: string) {
  if (window.gtag) return;
  window.dataLayer ??= [];
  window.gtag = function gtag(...args: unknown[]) { window.dataLayer!.push(args); };
  const script = document.createElement('script');
  script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(script);
  window.gtag('js', new Date());
  window.gtag('config', tagId);
}

/** Loads the configured tags once the browser is idle, so they never compete with first paint. */
export function scheduleTagLoad(cfg: TrackingConfig) {
  if (!readMeasurement(cfg.measurementMode) || (!cfg.metaPixelId && !cfg.googleTagId)) return;
  const run = () => {
    if (cfg.metaPixelId) loadMetaPixel(cfg.metaPixelId);
    if (cfg.googleTagId) loadGoogleTag(cfg.googleTagId);
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  const after = () => (idle ? idle(run, { timeout: 4000 }) : setTimeout(run, 2000));
  if (document.readyState === 'complete') after(); else window.addEventListener('load', after, { once: true });
}

export function track(cfg: TrackingConfig, event: QuizEvent, eventId: string, params: { step?: number; choice?: string } = {}) {
  if (emitted.has(eventId)) return;
  emitted.add(eventId);
  if (readMeasurement(cfg.measurementMode)) {
    if (cfg.metaPixelId) {
      loadMetaPixel(cfg.metaPixelId);
      window.fbq!(META_STANDARD.has(event) ? 'trackSingle' : 'trackSingleCustom', cfg.metaPixelId, event, { content_name: 'adu_quiz', ...params }, { eventID: eventId });
    }
    if (cfg.googleTagId) {
      loadGoogleTag(cfg.googleTagId);
      window.gtag!('event', GOOGLE_NAME[event] ?? event, { event_id: eventId, ...params });
    }
    window.dataLayer ??= [];
    if (!cfg.googleTagId) window.dataLayer.push({ event: `adu_quiz_${event}`, event_id: eventId, ...params });
  }
  window.dispatchEvent(new CustomEvent('hqn:adu-quiz', { detail: { event, eventId, ...params } }));
}

/* ---- Campaign attribution ------------------------------------------------ */

const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;
const TRACKING_KEY = 'hqn-adu-quiz-tracking';

function device(): string {
  return /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

/** First touch wins within the session; a later view without campaign params never overwrites it. */
export function captureTracking(): Record<string, string> {
  try {
    const url = new URL(location.href);
    const fresh: Record<string, string> = { landing_page_url: `${url.origin}${url.pathname}`, device_type: device(), timestamp: new Date().toISOString() };
    let hasCampaign = false;
    for (const key of PARAMS) {
      const value = url.searchParams.get(key);
      if (value) { fresh[key] = value.slice(0, 500); hasCampaign = true; }
    }
    try { const ref = new URL(document.referrer); fresh.referrer = `${ref.origin}${ref.pathname}`; } catch { /* Direct visit. */ }
    const previous = JSON.parse(sessionStorage.getItem(TRACKING_KEY) ?? 'null');
    if (!previous || hasCampaign) sessionStorage.setItem(TRACKING_KEY, JSON.stringify(fresh));
    return previous && !hasCampaign ? previous : fresh;
  } catch {
    return {};
  }
}

function cookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]).slice(0, 256) : undefined;
}

/** Stored first-touch attribution plus the Meta browser cookies, read at submit time. */
export function trackingForSubmit(): Record<string, string> {
  const base = captureTracking();
  const out: Record<string, string> = { ...base };
  const fbp = cookie('_fbp'); const fbc = cookie('_fbc');
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;
  return out;
}
