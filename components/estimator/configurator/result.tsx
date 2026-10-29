'use client';

/* eslint-disable @next/next/no-img-element -- the same pre-rendered files as the stage, already in the browser cache */

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { GalleryImage } from '@/lib/estimator/types';
import { BreakdownLines } from './cost';
import { ConfiguratorBooking } from './booking';
import type { ConfiguratorBookingProps } from './result-types';
import { moneyRange } from './state';

/**
 * Step 3: "Here's your pool." The design's photos, the cost breakdown with the
 * total as a range, next steps (the booking step: contact details, then the
 * free consultation), financing in words only, and real project photos.
 */
export function ConfiguratorResult(props: ConfiguratorBookingProps & { onBack: () => void; photoNote: string }) {
  const { contractor, template, spec, selection, breakdown, photos, designUrl, onBack, photoNote } = props;
  const [shown, setShown] = useState(0);
  const photo = photos[shown] ?? photos[0];
  const model = spec.models.find((m) => m.id === selection.model);
  const gallery = contractor.gallery ?? [];

  return (
    <div className="es-cfg-rise mx-auto w-full max-w-[720px] px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <button
        type="button"
        onClick={onBack}
        className="text-[13px] font-medium text-[#4a463f] underline underline-offset-4 hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]"
      >
        &larr; Back to edit
      </button>

      <figure className="mt-4">
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#e9e6df]">
          {photo ? (
            <img
              key={photo.src}
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={photo.srcSet ? '(min-width: 760px) 720px, 100vw' : undefined}
              alt={photo.alt}
              className="es-cfg-fade absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>
        {photos.length > 1 ? (
          <div role="group" aria-label="Photo view" className="mt-2.5 flex gap-2">
            {photos.map((p, i) => (
              <button
                key={p.view}
                type="button"
                aria-pressed={i === shown}
                onClick={() => setShown(i)}
                className={`relative h-14 w-20 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] sm:h-16 sm:w-24 ${
                  i === shown ? 'border-[#111]' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img src={p.src} srcSet={p.srcSet} sizes={p.srcSet ? '96px' : undefined} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="sr-only">{p.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        <figcaption className="mt-2 text-[12px] text-[#6d675d]">{photoNote}</figcaption>
      </figure>

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d675d]">Your {contractor.contractorName} design</p>
      <h1 id="cfg-result-title" tabIndex={-1} className="mt-1.5 text-[34px] font-semibold leading-tight tracking-[-0.025em] text-[#111] outline-none sm:text-[40px]">
        Here&rsquo;s your pool.
      </h1>
      {model ? (
        <p className="mt-2 text-[15px] text-[#4a463f]">
          {model.name}, {model.dimensions}
          {breakdown.luxe ? ` with ${breakdown.luxe.label}` : ''}
          {breakdown.upgrades.length ? ` and ${breakdown.upgrades.length} more upgrade${breakdown.upgrades.length === 1 ? '' : 's'}` : ''}.
        </p>
      ) : null}

      <section aria-label="Cost breakdown" className="mt-6 rounded-2xl border border-[#e4e0d8] bg-white px-5 pb-5 pt-3">
        <BreakdownLines breakdown={breakdown} siteNote="Confirmed at your free on-site visit" />
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-[#111] pt-4">
          <p className="text-[19px] font-semibold text-[#111]">Total estimate*</p>
          <p className="whitespace-nowrap text-right text-[22px] font-semibold tabular-nums text-[#111] sm:text-[26px]">{moneyRange(breakdown.total)}</p>
        </div>
        <p className="mt-3 text-pretty text-[12.5px] leading-[19px] text-[#5f5a52]">
          *Ballpark, not a quote.{' '}
          {template.pricesConfirmed ? '' : `Example prices, not yet confirmed by ${contractor.contractorName}. `}
          Excludes site-specific work and permit fees. Your firm, all-in price is confirmed at your free on-site visit.
        </p>
        <SaveDesign url={designUrl} />
      </section>

      <section aria-labelledby="cfg-next" className="mt-4 rounded-2xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 id="cfg-next" className="text-[19px] font-semibold text-[#111]">
          Next steps
        </h2>
        <p className="mt-1.5 text-pretty text-[14.5px] leading-[22px] text-[#4a463f]">
          Book a free consultation. We&rsquo;ll walk through your design, look at your yard and confirm a firm price. No obligation.
        </p>
        <div className="mt-5">
          <ConfiguratorBooking {...props} />
        </div>
      </section>

      {contractor.financingDisclosure || contractor.financingNote ? (
        <section aria-labelledby="cfg-finance" className="mt-4 rounded-2xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
          <h2 id="cfg-finance" className="text-[16px] font-semibold text-[#111]">
            Financing available through third-party lenders
          </h2>
          {contractor.financingNote ? <p className="mt-1.5 text-pretty text-[14px] leading-[21px] text-[#4a463f]">{contractor.financingNote}</p> : null}
          {contractor.financingDisclosure ? (
            <p className="mt-2 text-pretty text-[12px] leading-[18px] text-[#6d675d]">{contractor.financingDisclosure}</p>
          ) : null}
        </section>
      ) : null}

      {gallery.length ? <ProjectStrip gallery={gallery} title={`Recent ${contractor.contractorName} projects`} className="mt-8" /> : null}
    </div>
  );
}

function SaveDesign({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          },
          () => undefined,
        );
      }}
      className="mt-4 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-[#111] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]"
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy a link to this design'}</span>
    </button>
  );
}

/** Real job photos, a quiet horizontal strip. */
export function ProjectStrip({ gallery, title, className = '' }: { gallery: GalleryImage[]; title: string; className?: string }) {
  return (
    <section aria-label={title} className={className}>
      <h2 className="text-[15px] font-semibold text-[#111]">{title}</h2>
      <p className="text-[12.5px] text-[#6d675d]">Real photos of finished jobs.</p>
      <ul className="es-cfg-strip -mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2">
        {gallery.map((g) => (
          <li key={g.src} className="w-[150px] shrink-0 snap-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e6df]">
              <img src={g.thumb ?? g.src} alt={g.alt} loading="lazy" decoding="async" sizes="150px" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            {g.caption ? <p className="mt-1.5 text-[12px] leading-4 text-[#5f5a52]">{g.caption}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
