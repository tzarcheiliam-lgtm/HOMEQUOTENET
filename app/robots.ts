import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The CRM and API surfaces are not public content and stay blocked.
      // /sign-in, /sign-up and /pending carry a noindex tag instead of a
      // robots.txt block: blocking crawl here would stop Googlebot from ever
      // seeing that tag, which is what left bare, blocked URLs showing up in
      // search results in the first place.
      disallow: ['/app/', '/api/'],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
