import { ImageResponse } from 'next/og';

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
 * not available, so the brand colours are repeated here as literals.
 */

export const runtime = 'nodejs';
export const alt =
  'HomeQuote Network — Qualified Pool Remodeling Leads. Pay Per Valid Opportunity.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Mirrors the tokens in app/(marketing)/marketing.css.
const BG = '#08090b';
const SURFACE = '#111419';
const LINE = '#2a313c';
const TEXT = '#f4f6f8';
const MUTED = '#9aa3b0';
const DIM = '#767e8c';
const ACCENT = '#2d6ce8';
const ACCENT_BRIGHT = '#5b93ff';

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${ACCENT_BRIGHT} 0%, #1e3a6b 100%)`,
            }}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11.5 12 5l8 6.5" />
              <path d="M7 13v5.5h10V13" />
            </svg>
          </div>
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
            Qualified Pool Remodeling Leads
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
            Pay Per Valid Opportunity
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
            www.homequotenetwork.com
          </div>
        </div>
      </div>
    ),
    size
  );
}
