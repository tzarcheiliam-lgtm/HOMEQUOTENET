import Link from 'next/link';
import type { Metadata } from 'next';
import { site } from '@/content/site';
import { LegalPage, LegalSection } from '@/components/marketing/legal';
import { baseOpenGraph, defaultOgImage } from '@/lib/site-metadata';

/** Bump this whenever the copy below changes materially. */
const LAST_UPDATED = 'September 25, 2026';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms governing use of the HomeQuote Network website, homeowner requests, and contractor applications.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    ...baseOpenGraph,
    title: `Terms of Service · ${site.name}`,
    description:
      'The terms governing use of the HomeQuote Network website, homeowner requests, and contractor applications.',
    url: `${site.url}/terms`,
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    images: [defaultOgImage],
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={LAST_UPDATED}
      intro={`These terms govern use of the ${site.name} website, homeowner quote requests, and contractor applications. The terms that govern a specific contractor partnership are set out in that contractor's individual partner agreement, not on this page.`}
    >
      <div className="mt-10">
        <LegalSection heading="1. The service">
          <p>
            {site.name} is a lead-generation, appointment-setting and referral
            service operated by {site.operator}. We connect homeowners who
            request quotes with independent contractors, and may schedule
            appointments between them. We do not perform home-improvement work
            and are not a party to any agreement between a homeowner and a
            contractor.
          </p>
        </LegalSection>

        <LegalSection heading="2. Lead sharing">
          <p>
            When you submit a homeowner request, you authorize us to share your
            information with one or more independent contractors who may contact
            you. The number of contractors who receive your request may vary.
          </p>
        </LegalSection>

        <LegalSection heading="3. Contractor disclosure">
          <p>
            Contractors are independent third parties. We do not employ, endorse,
            guarantee, or supervise them, and we are not responsible for their
            quotes, work, conduct, licensing, or insurance. You are responsible
            for vetting any contractor before hiring.
          </p>
        </LegalSection>

        <LegalSection heading="4. Communication consent">
          <p>
            By submitting your information you agree to be contacted by us and
            the matched contractor(s) by phone, text, and email — including by
            automated means — as described in our{' '}
            <Link
              href="/privacy"
              className="font-medium text-[var(--hq-accent-bright)] hover:underline"
            >
              Privacy Policy
            </Link>
            . Consent is not a condition of purchase, and you may opt out at any
            time.
          </p>
        </LegalSection>

        <LegalSection heading="5. Contractor applications">
          <p>
            Submitting a contractor application does not create an agreement, a
            partnership, or an obligation on either side, and does not reserve a
            market or service area. We may decline any application. The
            qualification standard, pricing, service areas,
            duplicate handling, cancellation, rescheduling and no-show treatment,
            dispute windows, and replacement or credit terms are set out in an
            individual partner agreement, which must be agreed in writing before
            any appointments are booked.
          </p>
          <p>
            Information shown on this website about appointment programmes is a
            general description. Where this website and a signed partner
            agreement differ, the partner agreement governs.
          </p>
        </LegalSection>

        <LegalSection heading="6. No performance guarantee">
          <p>
            {site.name} guarantees only that an appointment billed to a
            contractor met the agreed qualification and scheduling standard at
            the time it was delivered. {site.name} does not guarantee that a
            homeowner attends a booked appointment, and does not guarantee
            estimates, sales, revenue, return on ad spend, or profitability.
            Contractors are responsible for attending, estimating, selling, and
            closing. Nothing on this website should be read as a promise of a
            particular business outcome.
          </p>
        </LegalSection>

        <LegalSection heading="7. No warranty; limitation of liability">
          <p>
            The service is provided &ldquo;as is&rdquo; without warranties of any
            kind. To the fullest extent permitted by law, {site.name} is not
            liable for any damages arising from your use of the service or from
            any contractor engagement.
          </p>
        </LegalSection>

        <LegalSection heading="8. Data & deletion">
          <p>
            Our handling of your data, and how to request deletion, are described
            in our{' '}
            <Link
              href="/privacy"
              className="font-medium text-[var(--hq-accent-bright)] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection heading="9. Changes to these terms">
          <p>
            We may update these terms from time to time. Changes take effect
            when posted here with a new &ldquo;Last updated&rdquo; date.
            Continued use of the website after an update means you accept the
            revised terms.
          </p>
        </LegalSection>

        <LegalSection heading="10. Governing law">
          <p>
            These terms are governed by the laws of the State of California,
            without regard to its conflict-of-laws rules, and any dispute
            arising from them or from use of the website will be brought in a
            state or federal court located in California.
          </p>
        </LegalSection>

        <LegalSection heading="11. Contact">
          <p>
            Questions about these terms? Email{' '}
            <strong>{site.contact.email}</strong>.
          </p>
        </LegalSection>
      </div>

      <p className="mt-12 text-[15px]">
        <Link
          href="/lead-standards"
          className="inline-block py-2 font-medium text-[var(--hq-accent-bright)] hover:underline"
        >
          Appointment Standards →
        </Link>
      </p>
    </LegalPage>
  );
}
