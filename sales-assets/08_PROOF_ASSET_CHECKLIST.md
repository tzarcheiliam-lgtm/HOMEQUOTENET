# Proof-Asset Checklist

The website was built deliberately without fake proof — no invented testimonials, client
logos, awards, counters, revenue figures, or case studies. That is the right call at this
stage: a contractor who spots one fabricated number stops believing everything else.

This checklist is how you replace that gap with real proof, and exactly where each asset
goes on the site.

---

## The two rules

1. **Real or nothing.** If it did not happen, it does not go on the site.
2. **Permission in writing.** Before publishing anything involving a contractor or a
   homeowner — name, logo, photo, quote, or numbers — get written permission. An email
   saying "yes, you can use that" is enough. Save it.

> **`[Needs review]`** Have counsel confirm your testimonial and endorsement wording.
> In the US, published testimonials and results claims are subject to FTC endorsement
> rules, including disclosure of anything atypical.

---

## Where placeholders live in the code

Development-only placeholder slots are already built in. They are visible when you run
`npm run dev` and hidden in production, so prospects never see empty frames.

| Thing | Location |
|---|---|
| Placeholder components | `components/marketing/proof-placeholder.tsx` |
| Homepage proof section | `<ProofPlaceholderSection />` in `app/(marketing)/page.tsx` |
| Testimonial slot | `<TestimonialPlaceholder />` in `app/(marketing)/pool-contractors/page.tsx` |
| Force visibility | set `NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=true` |
| Force hidden | set `NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=false` |

**To publish a real asset:** replace the `<ProofSlot>` with the real content, then delete
the slot. Do not leave a slot next to a real asset.

---

## 1. Real CRM screenshots

- [ ] Captured
- [ ] Homeowner names, phone numbers, emails, and addresses redacted
- [ ] Nothing identifying another contractor visible

**Where it goes:** the "System preview" section on the homepage
(`components/marketing/system-preview.tsx`). Replace one or more of the mock interface
cards with the real screenshot, and remove the "Example" badge from any card that becomes
a real screenshot — but keep the section honest about what it is showing.

**Why it matters:** the system preview is currently an illustration. A real screenshot
turns it into evidence that the operating system exists.

---

## 2. Lead notifications

- [ ] Screenshot of the actual SMS or email a contractor receives
- [ ] Homeowner details redacted
- [ ] Contractor's business name redacted or permission obtained

**Where it goes:** the "New lead delivered" card in the system preview section.

---

## 3. Real homeowner lead examples (redacted)

- [ ] Example lead record captured
- [ ] All personal information removed — name, phone, email, exact address
- [ ] Keep only: project category, general area (city or county), and the project detail

**Where it goes:** the "Lead record" card in the system preview section.

> Never publish a homeowner's personal information. Redaction must be applied to the image
> itself, not just cropped — cropped images can sometimes be recovered.

---

## 4. Ad campaign screenshots

- [ ] Meta Ads Manager screenshot captured
- [ ] Decide whether to show spend — redact if not
- [ ] No other client's data visible in the account view

**Where it goes:** the homepage proof section (`<ProofPlaceholderSection />`), and
optionally a "How we generate demand" expansion of step 2 in the How It Works section.

---

## 5. Landing-page and lead-form screenshots

- [ ] Screenshot of the homeowner-facing landing page
- [ ] Screenshot of the lead form showing the qualifying questions asked

**Where it goes:** the homepage proof section. This is strong material — it shows
contractors exactly what a homeowner is asked before the lead reaches them, which directly
supports the valid-lead standard.

---

## 6. Appointment records / calendar

- [ ] Calendar or appointment view captured
- [ ] Homeowner names redacted

**Where it goes:** the homepage proof section, or alongside the "Appointment set" step in
the system preview timeline.

---

## 7. Contractor feedback

- [ ] Written feedback received from a contractor who has actually received leads
- [ ] Written permission to publish it
- [ ] Permission covers their name and company name, or agree an attribution like
      "Pool remodeling contractor, Orange County"

**Where it goes:** `<TestimonialPlaceholder />` on `/pool-contractors`, and a new
testimonial section on the homepage between "Why HomeQuote Network" and the options
section.

> An anonymous testimonial is weak. A named one with a company is strong. Ask for the
> named version and accept the anonymous one only as a fallback.

---

## 8. Recorded testimonial permission

- [ ] Video or audio testimonial recorded
- [ ] Signed release covering use on the website and in sales material
- [ ] Contractor has seen the final edit and approved it

**Where it goes:** a dedicated section below the hero on `/pool-contractors`, where it
will be seen immediately after a cold call.

---

## 9. Lead-to-appointment numbers

- [ ] Figures come from actual delivered leads, not projections
- [ ] The contractor has confirmed the numbers are accurate
- [ ] Sample size is large enough to be meaningful — state it
- [ ] Time period stated

**Where it goes:** only once verified. Present as a labelled, sourced figure with the
sample size and period visible, never as a bare counter.

> **Do not** publish an average and imply it is typical. If one contractor converted well,
> say it was one contractor. FTC rules and basic credibility both require this.

---

## 10. Estimate numbers

- [ ] Number of estimates generated from delivered leads
- [ ] Verified by the contractor
- [ ] Period and sample size recorded

**Where it goes:** same treatment as item 9.

---

## 11. Sold-job data

- [ ] Closed-job counts or values from a contractor
- [ ] Written permission — this is commercially sensitive
- [ ] Decide whether to publish values or only counts
- [ ] Period and sample size recorded

**Where it goes:** a proper case study page (`/case-studies/[contractor]`), not a counter
on the homepage. One detailed, honest case study outperforms a row of numbers.

> When you build this, add the route under `app/(marketing)/` and link it from the "Why
> HomeQuote Network" section.

---

## 12. Contractor logos

- [ ] Written permission from each contractor to display their logo
- [ ] Logo files in a usable format (SVG or high-resolution PNG)
- [ ] Confirm they are an active partner before publishing

**Where it goes:** a "Working with" strip below the hero on the homepage.

> Only real, current, permissioned partners. Never a generic logo wall. Two real logos beat
> eight invented ones.

---

## 13. Before-and-after project photos

- [ ] Photos supplied by the contractor
- [ ] Written permission to publish
- [ ] Homeowner permission where the property is identifiable
- [ ] High resolution, properly cropped

**Where it goes:** the "Project types" section — replace the icon cards with real project
photography, which will lift the whole page. Also useful on `/pool-contractors`.

> This is the highest-impact visual upgrade available. The site currently uses tasteful
> geometric placeholders rather than stock photography precisely so real project work can
> take that space.

---

## Priority order

If you gather nothing else, gather these three first:

1. **Lead form screenshot** (item 5) — directly supports the valid-lead standard, needs no
   third-party permission.
2. **Redacted lead record and notification** (items 2 and 3) — proves the system is real,
   needs no third-party permission.
3. **One named contractor testimonial** (item 7) — the single biggest trust lift on the
   page.

The first two require permission from nobody but yourself. Do them this week.

---

## Before publishing anything

- [ ] It is real
- [ ] You have written permission where anyone else is involved
- [ ] Personal information is redacted in the image itself
- [ ] Any number is accompanied by its sample size and time period
- [ ] Nothing implies a result is typical unless you can support that
- [ ] The corresponding `<ProofSlot>` placeholder has been deleted
- [ ] `npm run build` still passes
