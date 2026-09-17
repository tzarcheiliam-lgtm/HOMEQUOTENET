import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Open Graph / social sharing image.
 *
 * Generated from code with next/og rather than kept as a binary asset, so the
 * copy and brand colours stay in version control and update with the site.
 * Applies to every route in the (marketing) group — Next.js resolves
 * file-based metadata from the nearest segment — so the homepage,
 * /pool-contractors, /lead-standards, /apply, /privacy and /terms all use it.
 *
 * To change the wording, edit this file. No image editor required.
 *
 * Note: this renders through Satori, which supports a subset of CSS — every
 * container needs an explicit `display: flex`, and CSS custom properties are
 * not available, so the brand colours are repeated here as literals. Satori
 * also has no WebP decoder, hence the PNG copy of the logo.
 */

/** Inlined at render time; Satori cannot fetch a relative URL. */
const logoDataUrl =
  'data:image/png;base64,' +
  readFileSync(
    path.join(process.cwd(), 'public', 'images', 'brand', 'homequote-network-logo.png')
  ).toString('base64');

export const runtime = 'nodejs';
export const alt =
  'HomeQuote Network — Booked Pool Remodeling Appointments. Pay Per Qualified Appointment.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Mirrors the tokens in app/(marketing)/marketing.css.
const BG = '#08090b';
const SURFACE = '#111419';
const LINE = '#2a313c';
const TEXT = '#f4f6f8';
const MUTED = '#9aa3b0';
const DIM = '#767e8c';
const ACCENT = '#196dcc';
const ACCENT_BRIGHT = '#55a0f6';

export default function OpengraphImage() {
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
              'radial-gradient(circle at center, rgba(61,125,255,0.22) 0%, rgba(61,125,255,0.06) 42%, rgba(8,9,11,0) 70%)',
          }}
        />

        {/* Brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} width={72} height={72} alt="" />
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: TEXT }}>HomeQuote</span>
            <span style={{ color: DIM, marginLeft: 10 }}>Network</span>
          </div>
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
            Pool Remodeling Appointments
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontSize: 46,
              fontWeight: 600,
              color: ACCENT_BRIGHT,
              letterSpacing: -1,
            }}
          >
            Booked On Your Calendar
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
              backgroundColor: ACCENT,
              borderRadius: 999,
              padding: '14px 30px',
              fontSize: 24,
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            homequotenet.com
          </div>
        </div>
      </div>
    ),
    size
  );
}
