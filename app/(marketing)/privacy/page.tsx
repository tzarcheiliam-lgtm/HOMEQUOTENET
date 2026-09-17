import Link from 'next/link';
import type { Metadata } from 'next';
import { site } from '@/content/site';
import {
  LegalPage,
  LegalSection,
  ReviewNote,
} from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How HomeQuote Network collects, uses, and shares information from homeowners and contractor applicants.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

// NOTE: This is a standard lead-generation privacy policy template. Have counsel
// review and replace the contact details / company specifics before launch.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={String(new Date().getFullYear())}
      intro={`How ${site.name} collects, uses, and shares information — both from homeowners who request quotes and from contractors who apply to receive leads.`}
    >
      <ReviewNote>
        This page is a general template and is not legal advice. Replace the
        placeholder contact addresses below and have an attorney review it for
        your jurisdiction before relying on it.
      </ReviewNote>

      <div className="mt-10">
        <LegalSection heading="Who we are">
          <p>
            {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a
            lead-generation service that connects homeowners with independent
            contractors for home-improvement projects (including pool remodeling,
            fencing, ADUs, and related services). {site.name} is operated by{' '}
            {site.operator}.
          </p>
        </LegalSection>

        <LegalSection heading="Information we collect from homeowners">
          <p>
            When you submit a request through our forms, advertising (including
            Facebook/Instagram and other platforms), partner sites, or by phone,
            we collect the information you provide — your name, phone number,
            email address, property address, and details about the project you
            are interested in — along with technical and marketing attribution
            data (such as the campaign, ad, and form your request came from).
          </p>
        </LegalSection>

        <LegalSection heading="Information we collect from contractors">
          <p>
            When you submit a contractor application, we collect your name,
            company name, phone number, email address, website, the services you
            offer, your service areas, your average project value and minimum
            project size, your monthly capacity, your typical lead response time,
            whether you use a CRM, and any notes you choose to provide. We also
            record the page the application came from and your browser user
            agent.
          </p>
          <p>
            We use this information to assess whether your business is a fit, to
            confirm lead availability in your market, to contact you about your
            application, and to administer your account if you become a partner.
            Contractor application data is business contact information and is
            not sold.
          </p>
        </LegalSection>

        <LegalSection heading="How we use your information">
          <p>
            We use your information to qualify your request, to match homeowners
            with one or more contractors who can provide quotes, and to operate,
            measure, and improve our services. We retain records of your request
            and our communications for these purposes.
          </p>
        </LegalSection>

        <LegalSection heading="Lead sharing & contractor disclosure">
          <p>
            By submitting a homeowner request, you understand and agree that we
            may share your contact information and project details with{' '}
            <strong>one or more independent contractors</strong> so they can
            contact you with quotes. These contractors are independent
            businesses, not employees or agents of {site.name}; their use of your
            information is governed by their own privacy practices, and we are
            not responsible for the services they provide.
          </p>
        </LegalSection>

        <LegalSection heading="Communication consent">
          <p>
            By submitting your information as a homeowner, you provide your prior
            express written consent to be contacted by {site.name} and the
            matched contractor(s) at the phone number and email you provided —{' '}
            <strong>
              including by autodialed and prerecorded calls and text messages
            </strong>{' '}
            — about your request, even if your number is on a Do-Not-Call list.
            Consent is not a condition of any purchase. Message and data rates
            may apply. You can opt out of calls and texts at any time by telling
            the caller to stop or replying STOP to a text.
          </p>
          <p>
            Contractors who submit an application consent to be contacted by{' '}
            {site.name} by phone, email, or text about that application and about
            lead availability in their market. You can ask us to stop contacting
            you at any time.
          </p>
        </LegalSection>

        <LegalSection heading="Your choices & rights">
          <p>
            Depending on where you live (for example, California residents under
            the CCPA/CPRA), you may have the right to access, correct, or delete
            the personal information we hold about you, and to opt out of certain
            sharing. We honor verifiable requests as required by law.
          </p>
        </LegalSection>

        <LegalSection heading="Deletion requests">
          <p>
            To request access to or deletion of your information, email{' '}
            <strong>{site.contact.email}</strong> with the phone number and email
            you submitted. We will verify and process your request within the
            timeframe required by applicable law.
          </p>
          <ReviewNote>
            Replace <strong>{site.contact.email}</strong> in{' '}
            <code>content/site.ts</code> with a real, monitored privacy inbox.
          </ReviewNote>
        </LegalSection>

        <LegalSection heading="Contact">
          <p>
            Questions about this policy? Email{' '}
            <strong>{site.contact.email}</strong>.
          </p>
        </LegalSection>
      </div>

      <p className="mt-12 text-[15px]">
        <Link
          href="/terms"
          className="inline-block py-2 font-medium text-[var(--hq-accent-bright)] hover:underline"
        >
          Terms of Service →
        </Link>
      </p>
    </LegalPage>
  );
}
