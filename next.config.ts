import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optional isolated output for concurrent local QA; normal deployments use .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    ppr: true,
    clientSegmentCache: true
  }
};

export default nextConfig;
