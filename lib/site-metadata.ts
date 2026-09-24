import type { Metadata } from 'next';
import { site } from '@/content/site';

/**
 * Open Graph fields every route shares. Next.js replaces a parent's
 * `openGraph` object wholesale when a page declares its own, so pages that set
 * a custom title/description spread this in to keep siteName, type and locale.
 * The og:image itself comes from the nearest `opengraph-image.tsx` file.
 */
export const baseOpenGraph = {
  type: 'website',
  siteName: site.name,
  locale: 'en_US',
} satisfies NonNullable<Metadata['openGraph']>;

/**
 * The site-wide card rendered by app/opengraph-image.tsx. A page that sets its
 * own `openGraph` but has no opengraph-image file beside it loses the inherited
 * image, so those pages (funnels, legal pages) reference this explicitly.
 */
export const defaultOgImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'HomeQuote Network — Qualified Contractor Leads',
};

/**
 * Global defaults, applied in app/layout.tsx to every route: marketing pages,
 * funnels (/estimate/*), auth screens and the CRM. metadataBase pins absolute
 * URLs (og:image, canonical) to the production domain instead of whatever
 * *.vercel.app deployment served the request.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.defaultTitle,
  description: site.description,
  applicationName: site.name,
  openGraph: {
    ...baseOpenGraph,
    url: site.url,
    title: site.defaultTitle,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.defaultTitle,
    description: site.description,
  },
};
