import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optional isolated output for concurrent local QA; normal deployments use .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    ppr: true,
    clientSegmentCache: true
  },
  async headers() {
    return [
      {
        // The push service worker must never be served from a stale cache, or a
        // fixed worker would not reach installed Home Screen apps.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
