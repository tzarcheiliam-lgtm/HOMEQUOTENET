import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optional isolated output for concurrent local QA; normal deployments use .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // pdf.js / OCR / fonts load assets from node_modules + lib/signing/assets at runtime.
  serverExternalPackages: ['pdfjs-dist', 'tesseract.js', '@napi-rs/canvas', 'fontkit'],
  // The funnel pages only check whether photo files exist (components/estimator/funnel/photo-files.ts)
  // and fall back gracefully when public/ is absent, so the ~60 MB of public/ must not be traced into
  // their functions (it pushed the deployment past Vercel's function limits).
  outputFileTracingExcludes: {
    '/estimator/**': ['./public/**'],
    '/embed/**': ['./public/**'],
  },
  outputFileTracingIncludes: {
    '/app/documents/**': ['./lib/signing/assets/**', './node_modules/pdfjs-dist/standard_fonts/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/wasm/**', './node_modules/pdfjs-dist/iccs/**', './node_modules/tesseract.js-core/**'],
    // Contracts render PDFs in server actions: the Unicode font and the HomeQuote logo must ship with those routes.
    '/app/contracts/**': ['./lib/signing/assets/DejaVuSans.ttf', './public/assets/brand/hq-logo-horizontal.png'],
    '/app/contractors/**': ['./lib/signing/assets/DejaVuSans.ttf', './public/assets/brand/hq-logo-horizontal.png'],
    // The host vCard turns these logos into its PHOTO (lib/booking/host-photo.server.ts).
    '/api/booking/contact/**': ['./public/images/brand/poolmasters-logo.png', './public/images/brand/homequote-network-logo.webp', './public/images/brand/homequote-network-logo.png'],
    '/api/**': ['./lib/signing/assets/**', './node_modules/pdfjs-dist/standard_fonts/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/wasm/**', './node_modules/pdfjs-dist/iccs/**', './node_modules/tesseract.js-core/**'],
  },
  experimental: {
    ppr: true,
    clientSegmentCache: true
  },
  async redirects() {
    // Short, readable links for ads' "display link" field. Query strings (UTMs, fbclid) pass through to the funnel.
    return [
      { source: '/bathroom-remodel', destination: '/estimate/bathroom-remodel', permanent: false },
      { source: '/kitchen-remodel', destination: '/estimate/kitchen-remodel', permanent: false },
      // The old Creative Studio page was replaced by the Seret studio.
      { source: '/app/creative-studio', destination: '/studio', permanent: false },
    ];
  },
  async rewrites() {
    // Seret studio (static Vite build in public/studio/, source in studio/): serve its page at /studio.
    return [{ source: '/studio', destination: '/studio/index.html' }];
  },
  async headers() {
    return [
      {
        // Public signing pages and APIs: never cached, never indexed, no Referer leakage.
        source: '/sign',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
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
