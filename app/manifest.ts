import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

/**
 * Web app manifest. Installing HomeQuote to a Home Screen opens the CRM
 * (/app) as a standalone app, which is what iOS/Android need before Web Push
 * is available there. Scope stays "/" so the sign-in pages (outside /app) keep
 * loading inside the app instead of bouncing out to the browser.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'HomeQuote Network',
    short_name: 'HomeQuote',
    description: site.description,
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The portal is light; the splash matches it. theme_color is the brand dark.
    background_color: '#ffffff',
    theme_color: '#08090b',
    icons: [
      { src: '/icons/homequote-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/homequote-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/homequote-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
