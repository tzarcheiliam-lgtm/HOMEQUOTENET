import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The CRM, auth, and API surfaces are not public content.
      disallow: ['/app/', '/api/', '/sign-in', '/sign-up', '/pending'],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
