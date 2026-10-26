'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/funnels/schema';

/**
 * Campaign attribution (UTMs, Meta URL-parameter macros, fbclid, referrer) is
 * captured on whichever page the visitor lands on and kept in sessionStorage,
 * so it survives the hop from the landing page into the funnel. It never holds
 * contact data.
 */
const KEY = 'hqn-contractor-attribution';

function device() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

export function storeAttribution() {
  try {
    const fresh = captureAttribution(location.href, document.referrer, device());
    const hasCampaign = Object.keys(fresh).some((k) => k.startsWith('utm_') || k.endsWith('_id') || k === 'fbclid');
    const previous = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    // First touch wins; a later internal page view (no campaign params) never overwrites it.
    if (!previous || hasCampaign) sessionStorage.setItem(KEY, JSON.stringify(fresh));
  } catch { /* Storage blocked: attribution is simply unavailable. */ }
}

export function loadAttribution(): Record<string, string> {
  storeAttribution();
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    return stored && typeof stored === 'object' ? stored : {};
  } catch { return {}; }
}

export function AttributionCapture() {
  useEffect(() => { storeAttribution(); }, []);
  return null;
}
