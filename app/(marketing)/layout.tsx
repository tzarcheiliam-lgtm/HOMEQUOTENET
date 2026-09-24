import type { Metadata } from 'next';
import './marketing.css';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { site } from '@/content/site';
import { industries } from '@/content/industries';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Booked Contractor Appointments. Pay Per Qualified Appointment.`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  applicationName: site.name,
  authors: [{ name: site.founder }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    url: site.url,
    title: `${site.name} — Booked Contractor Appointments. Pay Per Qualified Appointment.`,
    description: site.tagline,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — Booked Contractor Appointments`,
    description: site.tagline,
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Marketing shell. The `.hq` wrapper scopes the dark theme in marketing.css so
 * it cannot affect the /app CRM, which keeps the light shadcn tokens.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hq min-h-[100dvh]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--hq-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader
        industries={industries.map((i) => ({ label: i.navLabel, href: `/${i.slug}` }))}
      />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
