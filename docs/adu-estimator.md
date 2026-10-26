# ADU price estimator

Public tool at `/adu-estimator` (`app/(marketing)/adu-estimator/page.tsx`). A visitor picks a new detached ADU or a
garage conversion, bedrooms and bathrooms, a finish level per room and nine site questions, and sees an itemized
**starting price**, a monthly payment calculator and an illustrative return estimate.

## Files

| File | Role |
| --- | --- |
| `lib/adu/pricing-config.ts` | **Every number and label.** Base prices, upgrade costs, square footage, return figures, site questions, loan defaults. |
| `lib/adu/pricing.ts` | Pure functions: `computeEstimate`, `monthlyPayment`, `formatUsd`, tier resolution. No React, no I/O. |
| `lib/adu/lead.ts` | Lead step: `ADU_LEAD_CAPTURE_ENABLED` (false), contact validation, the payload a connected destination would get. |
| `components/marketing/adu-estimator.tsx` | Client component (the whole interactive tool). |
| `tests/adu-estimator.test.ts` | Pricing, site-visit, payment and formatting tests. |

## Prices

All prices and return figures are final and live in `lib/adu/pricing-config.ts`. Edit them there; update the
expected values in `tests/adu-estimator.test.ts` in the same commit.

## Price status

- **firm**: all nine site questions answered No. Shown as "Estimated price".
- **site_visit**: any Yes or Not sure. Shown as "Starting price" with the items listed under "Needs a site visit".
- **pending**: nothing flagged but some questions unanswered. Also "Starting price", with a prompt to finish.

The price excludes site work and permit, plan-check and impact fees (quoted after an on-site assessment). That wording
is in the summary card and should get legal review.

## Connecting lead capture

Lead capture is **off**: the form validates (same rules as the homeowner funnel's `contactSchema`) but sends and stores
nothing. Today the only way a homeowner lead enters the system is the database-configured funnel runtime
(`/estimate/[slug]` → `/api/funnels/[slug]/session`). A real submission there also triggers internal alert emails,
AI-call queueing, a Meta Lead event and distribution, so connecting it needs an explicit decision.

Proposed option: create an `adu-estimator` funnel in the funnel builder (`/app/funnels`) whose questions mirror the
estimator's answers, then have the estimator's submit step post the contact plus the `buildLeadPayload()` summary to
that funnel's session API. This reuses consent text, spam handling, rate limiting and delivery, with no new tables.
Alternatives: a small dedicated route handler writing to a new table, or an email-only notification.
