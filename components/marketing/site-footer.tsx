import Link from 'next/link';
import { site, disclaimers } from '@/content/site';
import { Container, Rule } from './primitives';
import { Wordmark } from './wordmark';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--hq-line)] bg-[var(--hq-bg)]">
      <Container>
        <div className="grid gap-12 py-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--hq-text-muted)]">
              Qualified homeowner leads for home-service contractors. We agree on
              what a valid lead looks like, send matching opportunities, and you
              handle the estimate and the close.
            </p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="text-[var(--hq-text-dim)]">Email</dt>
                <dd>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="inline-block py-1.5 text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
                  >
                    {site.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-[var(--hq-text-dim)]">Phone</dt>
                <dd>
                  <a
                    href={`tel:${site.contact.phoneHref}`}
                    className="inline-block py-1.5 text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
                  >
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
            </dl>

            <a
              href={site.url}
              className="mt-4 inline-block py-1.5 text-sm font-medium text-[var(--hq-accent-bright)] hover:underline"
            >
              {site.domain}
            </a>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
              Contractors
            </h3>
            <ul className="mt-3 space-y-1">
              {site.footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1.5 text-sm text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
              Legal
            </h3>
            <ul className="mt-3 space-y-1">
              {site.footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1.5 text-sm text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
              Company
            </h3>
            <ul className="mt-3 space-y-1 text-sm text-[var(--hq-text-muted)]">
              <li>
                Founder:{' '}
                <span className="text-[var(--hq-text)]">{site.founder}</span>
              </li>
              <li>Operated by {site.operator}</li>
              <li>
                <Link
                  href="/sign-in"
                  className="inline-block py-1.5 transition-colors hover:text-[var(--hq-text)]"
                >
                  Partner login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Rule />

        <div className="space-y-4 py-8">
          <p className="text-xs leading-6 text-[var(--hq-text-dim)]">
            {disclaimers.noGuarantee}
          </p>
          <p className="text-xs leading-6 text-[var(--hq-text-dim)]">
            {disclaimers.agreementGoverns}
          </p>
          <p className="text-xs text-[var(--hq-text-dim)]">
            &copy; {year} {site.name}. Operated by {site.operator}. All rights
            reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
