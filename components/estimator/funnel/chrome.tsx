import Image from 'next/image';
import Link from 'next/link';
import { telHref } from '@/components/estimator/shell/facts';
import type { FunnelLanding } from '@/lib/estimator/funnel/types';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';

/*
 * Funnel chrome shared by the landing and the steps: the contractor's logo
 * and the quiet one-line footer (© · phone · Privacy · Terms) with the
 * licence and photo note under it. Server-safe (no hooks).
 */

type Brand = Pick<ContractorEstimatorConfig, 'contractorName' | 'logoUrl'>;

/**
 * The logo (falls back to the name). `height` in px; the Pool Masters mark is 2.38:1 (the default
 * `logo.aspect`). A round badge (logo.wordmark) is drawn a little larger, with the name set beside it.
 */
export function FunnelLogo({
  contractor,
  height,
  priority = false,
  logo,
}: {
  contractor: Brand;
  height: number;
  priority?: boolean;
  /** FunnelSpec.landing.logo */
  logo?: FunnelLanding['logo'];
}) {
  if (!contractor.logoUrl) {
    return <span className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fn-ink)]">{contractor.contractorName}</span>;
  }
  if (logo?.wordmark) {
    const size = Math.round(height * 1.25);
    const w = Math.round(size * (logo.aspect ?? 1));
    return (
      <span className="flex items-center gap-2">
        <Image
          src={contractor.logoUrl}
          alt=""
          width={w}
          height={size}
          priority={priority}
          sizes={`${w}px`}
          className="-my-1 block object-contain"
          style={{ width: w, height: size }}
        />
        <span className="whitespace-nowrap text-[17px] font-semibold leading-none tracking-[-0.02em] text-[var(--fn-ink)] lg:text-[19px]">{logo.wordmark}</span>
      </span>
    );
  }
  const width = Math.round(height * (logo?.aspect ?? 2.38));
  return (
    <Image
      src={contractor.logoUrl}
      alt={contractor.contractorName}
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      className="block object-contain object-left"
      style={{ width, height }}
    />
  );
}

export function FunnelFooter({
  contractor,
  note,
}: {
  contractor: Pick<ContractorEstimatorConfig, 'contractorName' | 'phone' | 'licenseLabel'>;
  /** e.g. the photo note; one small line under the links. */
  note?: string;
}) {
  const tel = telHref(contractor.phone);
  return (
    <footer className="border-t border-[var(--fn-hair)] text-[var(--fn-muted)]">
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-8 pt-6 sm:px-8">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] leading-[20px]">
          <span>
            © {new Date().getFullYear()} {contractor.contractorName}
          </span>
          {tel ? (
            <a href={tel} className="tabular-nums underline-offset-4 hover:text-[var(--fn-ink)] hover:underline">
              {contractor.phone}
            </a>
          ) : null}
          <Link href="/privacy" className="underline-offset-4 hover:text-[var(--fn-ink)] hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:text-[var(--fn-ink)] hover:underline">
            Terms
          </Link>
        </p>
        <p className="mt-3 max-w-[640px] text-pretty text-[12px] leading-[17px]">
          <span className="tabular-nums">{contractor.licenseLabel}</span>
          {note ? ` · ${note}` : ''}
        </p>
      </div>
    </footer>
  );
}
