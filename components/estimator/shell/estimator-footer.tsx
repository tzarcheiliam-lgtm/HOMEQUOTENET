import Link from 'next/link';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';

type FooterContractor = Pick<ContractorEstimatorConfig, 'contractorName' | 'licenseLabel' | 'serviceAreaLabel'>;

const link =
  'inline-flex min-h-11 items-center underline-offset-4 hover:text-[var(--hq-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';

/**
 * Quiet footer for the branded estimator page: who the contractor is, the
 * Privacy and Terms the contact step's consent refers to, and a quiet
 * plain-text "Powered by Rendoly" (the estimator product's name; no logo on
 * the contractor's page, no link until rendoly.com has a site).
 */
export function EstimatorFooter({ contractor }: { contractor: FooterContractor }) {
  return (
    <footer className="border-t border-[var(--hq-line)] bg-[var(--hq-navy-deep)] text-sm text-[var(--hq-text-dim)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-[var(--hq-text-muted)]">
            {contractor.contractorName} <span className="tabular-nums">({contractor.licenseLabel})</span>
          </p>
          {contractor.serviceAreaLabel ? <p className="mt-1 text-pretty">Serving {contractor.serviceAreaLabel}.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className={link}>
              Privacy
            </Link>
            <Link href="/terms" className={link}>
              Terms
            </Link>
          </nav>
          {/* Plain small text, no logo: the page is the contractor's, and the consent line already names a second company. */}
          <p className="text-xs">Powered by Rendoly</p>
        </div>
      </div>
    </footer>
  );
}
