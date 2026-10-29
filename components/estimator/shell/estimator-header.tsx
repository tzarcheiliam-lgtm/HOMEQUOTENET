import Image from 'next/image';
import { ArrowDown, Phone } from 'lucide-react';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { telHref } from './facts';

type HeaderContractor = Pick<ContractorEstimatorConfig, 'contractorName' | 'licenseLabel' | 'phone' | 'logoUrl' | 'network'>;

/**
 * The contractor's own bar on the public estimator page (no HomeQuote nav).
 *
 * A light bar, because contractor logos are drawn for white paper (Pool
 * Masters' is black type with a blue wave) and would vanish on the navy page.
 * Heights are h-16 / sm:h-20 on purpose: the live builder pins its picture
 * just below a 64 px / 80 px header (estimator-flow.tsx), and the page exposes
 * the same value as --estimator-header-h.
 *
 * Without a phone number (HomeQuote Network's own builders) the button is a
 * "Start my design" link to the builder (`startHref`) instead, so the bar
 * still has one clear next step.
 */
export function EstimatorHeader({
  contractor,
  facts = [],
  startHref,
}: {
  contractor: HeaderContractor;
  facts?: readonly string[];
  /** In-page link to the builder, shown when there is no phone number to call. */
  startHref?: string;
}) {
  const tel = telHref(contractor.phone);
  // The first fact (licensed & insured) rides with the license; the rest live in the hero.
  const credential = facts[0];
  return (
    <header className="sticky top-0 z-40 bg-[var(--hq-mist)] text-[var(--hq-navy)] shadow-[0_1px_0_rgba(10,27,61,0.08),0_8px_24px_-12px_rgba(6,18,43,0.55)]">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-5 sm:h-20 sm:gap-5 sm:px-8">
        {contractor.logoUrl ? (
          <span className="relative block h-9 w-[86px] shrink-0 sm:h-12 sm:w-[114px]">
            <Image
              src={contractor.logoUrl}
              alt={contractor.contractorName}
              fill
              sizes="(min-width: 640px) 114px, 86px"
              className="object-contain object-left"
              priority
            />
          </span>
        ) : (
          <span className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight sm:text-lg">{contractor.contractorName}</span>
        )}
        <span className="min-w-0 border-l border-[rgba(10,27,61,0.14)] pl-3 text-[11px] leading-4 text-[#3b4a6b] sm:pl-5 sm:text-[13px] sm:leading-5">
          {/* The name is in the logo's alt text; spell it out for screen readers that skip images. */}
          {contractor.logoUrl ? <span className="sr-only">{contractor.contractorName}, </span> : null}
          {/* A network's line is a description (it may wrap on phones), a license number never wraps. */}
          <span className={contractor.network ? 'block text-balance font-medium max-sm:max-w-[11rem]' : 'block whitespace-nowrap font-medium tabular-nums'}>
            {contractor.licenseLabel}
          </span>
          {credential ? <span className="block truncate">{credential}</span> : null}
        </span>
        {tel ? (
          <a
            href={tel}
            aria-label={`Call ${contractor.contractorName} at ${contractor.phone}`}
            className="ml-auto inline-flex h-11 shrink-0 touch-manipulation items-center gap-2 rounded-full bg-[var(--hq-accent)] pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_-6px_rgba(0,56,184,0.7)] [transition:background-color_150ms_ease,scale_120ms_ease-out] hover:bg-[#0a46d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent)] active:scale-[.97] motion-reduce:transition-none"
          >
            <Phone aria-hidden="true" className="size-4" strokeWidth={2.4} />
            <span className="sm:hidden">Call</span>
            <span className="hidden tabular-nums sm:inline">{contractor.phone}</span>
          </a>
        ) : startHref ? (
          // Hidden once the design is finished (the flow marks the page with data-estimator-done).
          <a
            href={startHref}
            className="[[data-estimator-done]_&]:hidden ml-auto inline-flex h-11 shrink-0 touch-manipulation items-center gap-2 rounded-full bg-[var(--hq-accent)] pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_-6px_rgba(0,56,184,0.7)] [transition:background-color_150ms_ease,scale_120ms_ease-out] hover:bg-[#0a46d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent)] active:scale-[.97] motion-reduce:transition-none"
          >
            <ArrowDown aria-hidden="true" className="size-4" strokeWidth={2.4} />
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start my design</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}
