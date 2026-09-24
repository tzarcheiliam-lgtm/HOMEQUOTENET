import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

/** Web app manifest: home-screen name and icons carry HomeQuote branding. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: 'HomeQuote',
    description: site.description,
    start_url: '/',
    display: 'browser',
    background_color: '#08090b',
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
