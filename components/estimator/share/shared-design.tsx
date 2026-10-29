import '@/components/estimator/funnel/funnel.css';
import { Phone } from 'lucide-react';
import { FunnelFooter, FunnelLogo } from '@/components/estimator/funnel/chrome';
import { telHref } from '@/components/estimator/shell/facts';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';
import type { SharedDesignView } from '@/lib/estimator/share-view';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';

/**
 * The read-only shared design (app/(estimator)/estimator/[slug]/my-design):
 * the main photo, one card per pick with its photo, the ballpark when the link
 * is signed, and one button to design their own. Server component, the
 * funnel's own look (.es-fn). Nothing personal is shown or needed.
 */
export function SharedDesign({ contractor, spec, view }: { contractor: ContractorEstimatorConfig; spec: FunnelSpec; view: SharedDesignView }) {
  const tel = telHref(contractor.phone);
  const examplePrices = contractor.pricesConfirmed === false;
  return (
    <div className="es-fn flex min-h-[100dvh] flex-1 flex-col" data-shared-design="">
      <header className="mx-auto flex h-[56px] w-full max-w-[1120px] items-center px-5 sm:px-8 lg:h-[68px]">
        <a href={`/estimator/${contractor.slug}`} aria-label={`${contractor.contractorName} home`}>
          <FunnelLogo contractor={contractor} height={28} priority />
        </a>
      </header>
      <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-12 sm:px-8">
        <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[var(--fn-muted)]">A {view.noun} design from {contractor.contractorName}</p>
        <h1 className="fn-h1 mt-2 text-balance">{view.recap}</h1>

        {/* eslint-disable-next-line @next/next/no-img-element -- a pre-rendered example photo; the og:image is the same file */}
        <img
          src={view.main.src}
          srcSet={view.main.srcSm ? `${view.main.srcSm} 1200w, ${view.main.src} 1800w` : undefined}
          sizes="(min-width: 760px) 720px, 100vw"
          alt={view.main.alt}
          className="mt-5 aspect-[3/2] w-full rounded-[16px] bg-[var(--fn-track)] object-cover"
          data-shared-main=""
        />

        {view.range ? (
          <section aria-label="Ballpark price" className="mt-4 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" data-shared-range="">
            <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[var(--fn-muted)]">Ballpark</p>
            <p className="mt-2 text-[clamp(26px,7.6vw,31px)] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums">{view.range}</p>
            <p className="mt-2 text-[14.5px] leading-[21px] text-[var(--fn-text)] [text-wrap:pretty]">
              {spec.bookingStep.priceNote}
              {examplePrices ? <span className="text-[var(--fn-muted)]"> Example prices, not yet confirmed.</span> : null}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="shared-picks" className="mt-6">
          <h2 id="shared-picks" className="text-[19px] font-medium leading-tight">The picks</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {view.picks.map((p) => (
              <li key={p.stepId} className="overflow-hidden rounded-[14px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- example photos at their pre-rendered sizes */}
                <img src={p.photo.srcSm ?? p.photo.src} alt={p.photo.alt} loading="lazy" className="aspect-[3/2] w-full bg-[var(--fn-track)] object-cover" />
                <div className="px-4 py-3">
                  <p className="text-[16px] font-medium leading-6">{p.title}</p>
                  <p className="text-[14.5px] leading-[21px] text-[var(--fn-muted)]">{p.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <a href={`/estimator/${contractor.slug}`} className="fn-btn mt-7 h-12 w-full text-[17px]">
          Design your own {view.noun}
        </a>
        {tel ? (
          <p className="mt-4 text-center text-[15px] leading-[22px] text-[var(--fn-text)]">
            Questions?{' '}
            <a href={tel} className="inline-flex items-center gap-1 font-medium text-[color:var(--fn-blue)] underline-offset-4 [@media(hover:hover)]:hover:underline">
              <Phone aria-hidden="true" className="size-3.5" />
              <span className="tabular-nums">Call {contractor.phone}</span>
            </a>
          </p>
        ) : null}
      </main>
      <FunnelFooter contractor={contractor} note={spec.photoNote} />
    </div>
  );
}
