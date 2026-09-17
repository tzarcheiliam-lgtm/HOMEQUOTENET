import Link from 'next/link';
import type { Metadata } from 'next';
import { site } from '@/content/site';
import {
  LegalPage,
  LegalSection,
  ReviewNote,
} from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms governing use of the HomeQuote Network website, homeowner requests, and contractor applications.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

// Standard lead-gen terms template — have counsel review before launch.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={String(new Date().getFullYear())}
      intro={`These terms govern use of the ${site.name} website, homeowner quote requests, and contractor applications.`}
    >
      <ReviewNote>
        This page is a general template and is not legal advice. Have an attorney
        review it for your jurisdiction before relying on it. The terms that
        govern a contractor partnership are set out in that contractor&rsquo;s
        individual partner agreement, not on this page.
      </ReviewNote>

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
            qualification standard, pricing, service areas, exclusivity,
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

        <LegalSection heading="9. Contact">
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
