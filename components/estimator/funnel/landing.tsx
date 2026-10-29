import './funnel.css';
import Link from 'next/link';
import { preload } from 'react-dom';
import { telHref } from '@/components/estimator/shell/facts';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { FunnelFooter, FunnelLogo } from './chrome';
import { AnnouncementBar, HeaderMenu } from './landing-bits';
import { photoSrcSet } from './state';

/*
 * The funnel's landing page (Buildoly's mobile landing, for a pool remodeler):
 * a dark announcement bar, a floating white header card, a huge two-line
 * headline on a pale sky, one line under it, one full-width blue button, and
 * the hero photo rising out of the sky to the bottom of the screen. Below the
 * fold, only three real finished jobs and the licence. Nothing else.
 */

const SKY = 'linear-gradient(180deg, #b8cfeb 0%, #cddcef 42%, #dfe8f3 100%)';

/** "Backyard pools, remodeled just for you" -> ["Backyard pools,", "remodeled just for you"]: the phone break sits after the comma. */
export function headlineLines(headline: string): [string, string] | [string] {
  const i = headline.indexOf(', ');
  return i > 0 ? [headline.slice(0, i + 1), headline.slice(i + 2)] : [headline];
}

export function FunnelLanding({ spec, contractor, designHref }: { spec: FunnelSpec; contractor: ContractorEstimatorConfig; designHref: string }) {
  const { landing } = spec;
  const tel = telHref(contractor.phone);
  const lines = headlineLines(landing.headline);
  const hero = landing.heroPhoto;
  const heroSrcSet = photoSrcSet(hero);
  // The hero is the largest paint: ask for it with the HTML (the right width from the srcset).
  preload(hero.src, { as: 'image', fetchPriority: 'high', ...(heroSrcSet ? { imageSrcSet: heroSrcSet, imageSizes: '100vw' } : {}) });
  const projects = landing.projects ?? [];

  return (
    <div className="es-fn flex min-h-[100dvh] flex-1 flex-col">
      <AnnouncementBar text={landing.announcement} />
      <main id="main" className="flex-1">
        <section className="relative isolate flex min-h-[calc(100svh-36px)] flex-col overflow-hidden" style={{ background: SKY }}>
          {/* Floating header card */}
          <div className="relative z-20 px-3 pt-[11px] lg:px-3 lg:pt-3">
            <header className="relative mx-auto flex h-[50px] max-w-[1416px] items-center justify-between rounded-[12px] border border-black/[0.06] bg-white pl-6 pr-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_14px_rgb(0_0_0/0.06)] lg:h-[56px] lg:pl-6 lg:pr-3">
              <Link href={`/estimator/${contractor.slug}`} aria-label={`${contractor.contractorName} home`} className="-mx-1 rounded-[4px] px-1 py-1 focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]">
                <FunnelLogo contractor={contractor} height={30} priority />
              </Link>
              <HeaderMenu
                links={[
                  { href: designHref, label: landing.cta },
                  ...(projects.length ? [{ href: '#projects', label: 'Recent projects' }] : []),
                ]}
                tel={tel}
                phone={contractor.phone}
              />
              <div className="hidden items-center gap-6 lg:flex">
                {projects.length ? (
                  <a href="#projects" className="whitespace-nowrap text-[16px] text-[#0a0a0a] underline-offset-4 hover:underline">
                    Recent projects
                  </a>
                ) : null}
                {tel ? (
                  <a href={tel} className="whitespace-nowrap text-[16px] tabular-nums text-[#0a0a0a] underline-offset-4 hover:underline">
                    {contractor.phone}
                  </a>
                ) : null}
                <Link href={designHref} className="fn-btn h-10 whitespace-nowrap rounded-full px-5 text-[15px] shadow-none">
                  {landing.cta}
                </Link>
              </div>
            </header>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1120px] px-5 text-center">
            <h1 className="mx-auto mt-[27px] text-balance text-[clamp(30px,8.6vw,44px)] font-medium leading-[1.08] tracking-[-0.024em] text-[#0a0a0a] sm:mt-10 lg:mt-14 lg:text-[64px] lg:leading-[1.04] lg:tracking-[-0.028em]">
              {lines.length === 2 ? (
                <>
                  <span className="block lg:inline">{lines[0]}</span> <span className="block lg:inline">{lines[1]}</span>
                </>
              ) : (
                lines[0]
              )}
            </h1>
            <p className="mx-auto mt-[13px] max-w-[352px] text-pretty text-[17px] leading-[23px] tracking-[-0.01em] text-[#1c1b19] sm:max-w-[520px] lg:mt-4 lg:max-w-[720px] lg:text-[20px] lg:leading-[28px]">
              {/* Non-breaking hyphens: "on-site" never splits across lines. */}
              {landing.subline.replace(/-/g, '\u2011')}
            </p>
            <Link
              href={designHref}
              className="fn-btn mx-auto mt-[22px] h-[56px] w-full max-w-[353px] text-[19px] sm:max-w-[360px] lg:mt-7 lg:inline-flex lg:h-[52px] lg:w-auto lg:px-6 lg:text-[17px]"
            >
              {landing.cta}
            </Link>
          </div>

          {/* The photo rises out of the sky behind the button and runs to the bottom of the screen. */}
          <div className="relative -mt-[30px] min-h-[300px] flex-1 lg:-mt-[60px] lg:min-h-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP with its own 1200 / 1800 px srcset, preloaded above */}
            <img
              src={hero.src}
              srcSet={heroSrcSet}
              sizes="100vw"
              alt={landing.heroAlt}
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="fn-hero-photo absolute inset-0 h-full w-full select-none object-cover object-[50%_72%]"
            />
            {spec.photoNote ? (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-[4px] bg-white/85 px-1.5 py-0.5 text-[11px] font-medium leading-[14px] text-[#3b3935] backdrop-blur-[2px] lg:bottom-4 lg:left-4">
                Example design · AI-assisted
              </span>
            ) : null}
          </div>
        </section>

        {projects.length ? (
          <section id="projects" aria-labelledby="fn-projects" className="mx-auto w-full max-w-[1120px] scroll-mt-4 px-8 pb-14 pt-12 lg:pb-20 lg:pt-20">
            <h2 id="fn-projects" className="text-balance text-[28px] font-medium leading-[1.1] tracking-[-0.022em] text-[#0a0a0a] lg:text-[40px]">
              Recent {contractor.contractorName} projects
            </h2>
            <p className="mt-2 max-w-[560px] text-pretty text-[16px] leading-[23px] text-[var(--fn-muted)] lg:text-[18px] lg:leading-[26px]">
              Real backyards we remodeled, photographed as built.
            </p>
            <ul className="-mx-8 mt-6 flex snap-x snap-mandatory scroll-px-8 gap-3 overflow-x-auto px-8 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              {projects.map((p) => (
                <li key={p.src} className="w-[78%] shrink-0 snap-start lg:w-auto">
                  <figure>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[#e9e6e0]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- small WebP photos, lazy below the fold */}
                      <img src={p.thumb ?? p.src} alt={p.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]" />
                    </div>
                    {p.caption ? <figcaption className="mt-2.5 text-[15px] leading-[20px] text-[#2b2a27]">{p.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-5 border-t border-[var(--fn-hair)] pt-8 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-pretty text-[15px] leading-[22px] text-[var(--fn-muted)]">
                <span className="font-medium text-[#0a0a0a]">{contractor.contractorName}</span> ·{' '}
                {[...(contractor.facts ?? []), contractor.licenseLabel].join(' · ')}
              </p>
              <Link href={designHref} className="fn-btn h-[52px] w-full text-[17px] lg:w-auto lg:px-6">
                {landing.cta}
              </Link>
            </div>
          </section>
        ) : null}
      </main>
      <FunnelFooter contractor={contractor} note={spec.photoNote} />
    </div>
  );
}
