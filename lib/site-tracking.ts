/**
 * Pixel / tag IDs for the public marketing pages. Public by design (they ship to the browser).
 * Set NEXT_PUBLIC_META_PIXEL_ID and NEXT_PUBLIC_GOOGLE_TAG_ID (a GA4 "G-" id); when unset, the
 * ADU-quiz IDs are reused so one set of IDs covers the site. Empty = nothing loads.
 */
export function siteTrackingIds() {
  const meta = (process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_ADU_QUIZ_META_PIXEL_ID || '').trim();
  const google = (process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || process.env.NEXT_PUBLIC_ADU_QUIZ_GOOGLE_TAG_ID || '').trim();
  return {
    metaPixelId: /^\d{5,30}$/.test(meta) ? meta : '',
    googleTagId: /^(G|AW|GT)-[A-Za-z0-9]{4,20}$/.test(google) ? google : '',
  };
}
