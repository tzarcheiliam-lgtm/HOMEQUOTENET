# HomeQuote rebrand (Brand Guidelines v1.0)

## System
- Palette: Blue #0038B8 (interactive), Navy #0A1B3D (text, dark surfaces), Gold #F5B700 (primary CTA on Navy only), Mist #F4F7FC (app canvas), Slate #5B6B8C (muted text on light; never text on Navy, ~2.9:1).
- Type: Sora (headings, via base `h1-h3`) + DM Sans (body), loaded with `next/font` in `app/layout.tsx`.
- Tokens: `app/globals.css` (CRM, auth, funnels), `app/(marketing)/marketing.css` (`--hq-*`, marketing + contractor-ad pages, Navy surfaces).
- Logos: `components/brand-logo.tsx` (`tone="primary"` on light, `"reversed"` on Navy/Blue). Files in `public/brand/` carry the guideline clear space; do not crop.
- Icons: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, `public/icons/*`, manifest colours, OG card (`components/marketing/og-card.tsx`), email logo + email colours.

## Copy to review (not changed)
- "No monthly retainer to start" / "Pay per qualified booked appointment": home, pool, application form, OG card, site tagline. Confirm it is the current offer; no dollar prices appear on public pages.
- Campaign snapshot (450 inquiries, $17,558.54 ad spend, Aug 17 - Sep 15 2026) is real data from one pool campaign; confirm it is still the one you want shown.
- Application form says "Fourteen questions" / "About two minutes"; the Meta ad funnel says 8 steps / 2 minutes. Verify counts.
- Site name is "HomeQuote Network"; the new logo reads "HomeQuote". Text still says Network.
- "Southern California" coverage list vs. any newer service areas.

## Known gaps
- /app (CRM) and /app/pay need a login; they inherit the new tokens but were not screenshotted.
- Homeowner funnels with custom saved colours keep them; funnels on the old default blue/navy render in brand colours.
- OG images render with Satori's default font, not Sora.
- Pre-existing lint errors (8) in untouched CRM files; tests: 758 pass.
