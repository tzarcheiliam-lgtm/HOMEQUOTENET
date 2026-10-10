import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Open Graph card renderer, shared by every marketing route's
 * `opengraph-image.tsx` so each page can carry its own headline in the same
 * design.
 *
 * Renders through Satori, which supports a subset of CSS: every container needs
 * an explicit `display: flex`, and CSS custom properties are not available, so
 * the brand colours are repeated here as literals. Satori also has no WebP
 * decoder, hence the PNG copy of the logo.
 */

/** Inlined at render time; Satori cannot fetch a relative URL. */
const logoDataUrl =
  'data:image/png;base64,' +
  readFileSync(
    path.join(process.cwd(), 'public', 'brand', 'homequote-logo-reversed-horizontal-transparent.png')
  ).toString('base64');

export const ogSize = { width: 1200, height: 630 };

// Mirrors the tokens in app/(marketing)/marketing.css.
const BG = '#0a1b3d';
const SURFACE = '#0f2754';
const LINE = '#2f4c85';
const TEXT = '#f4f7fc';
const MUTED = '#b6c3de';
const GOLD = '#f5b700';
const NAVY = '#0a1b3d';

export function renderOgCard({
  headline,
  subline,
}: {
  headline: string;
  subline: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BG,
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* Ambient blue bloom, matching the site hero. */}
        <div
          style={{
            position: 'absolute',
            top: -320,
            left: 180,
            width: 900,
            height: 700,
            display: 'flex',
            background:
              'radial-gradient(circle at center, rgba(0,56,184,0.45) 0%, rgba(0,56,184,0.12) 42%, rgba(10,27,61,0) 70%)',
          }}
        />

        {/* Brand lockup: reversed logo (clear space is built into the file) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} width={300} height={87} alt="" />
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: -2.5,
              lineHeight: 1.05,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontSize: 46,
              fontWeight: 600,
              color: GOLD,
              letterSpacing: -1,
            }}
          >
            {subline}
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${LINE}`,
            paddingTop: 30,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {['Southern California', 'No monthly retainer to start'].map((chip) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: SURFACE,
                  border: `1px solid ${LINE}`,
                  borderRadius: 999,
                  padding: '10px 22px',
                  fontSize: 22,
                  color: MUTED,
                }}
              >
                {chip}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: GOLD,
              borderRadius: 999,
              padding: '14px 30px',
              fontSize: 24,
              fontWeight: 700,
              color: NAVY,
            }}
          >
            homequotenet.com
          </div>
        </div>
      </div>
    ),
    ogSize
  );
}
