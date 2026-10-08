import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optional isolated output for concurrent local QA; normal deployments use .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // pdf.js / OCR / fonts load assets from node_modules + lib/signing/assets at runtime.
  serverExternalPackages: ['pdfjs-dist', 'tesseract.js', '@napi-rs/canvas', 'fontkit'],
  outputFileTracingIncludes: {
    '/app/documents/**': ['./lib/signing/assets/**', './node_modules/pdfjs-dist/standard_fonts/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/wasm/**', './node_modules/pdfjs-dist/iccs/**', './node_modules/tesseract.js-core/**'],
    // Contracts render PDFs in server actions: the Unicode font and the HomeQuote logo must ship with those routes.
    '/app/contracts/**': ['./lib/signing/assets/DejaVuSans.ttf', './public/assets/brand/hq-logo-horizontal.png'],
    '/app/contractors/**': ['./lib/signing/assets/DejaVuSans.ttf', './public/assets/brand/hq-logo-horizontal.png'],
    '/api/**': ['./lib/signing/assets/**', './node_modules/pdfjs-dist/standard_fonts/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/wasm/**', './node_modules/pdfjs-dist/iccs/**', './node_modules/tesseract.js-core/**'],
  },
  experimental: {
    ppr: true,
    clientSegmentCache: true
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
