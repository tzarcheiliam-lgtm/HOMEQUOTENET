'use client';

/* eslint-disable @next/next/no-img-element -- the same pre-rendered files as the stage, already in the browser cache */

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ShieldCheck, Sparkles } from 'lucide-react';
import type { GalleryImage } from '@/lib/estimator/types';
import { BreakdownLines } from '../cost';
import type { ConfiguratorBookingProps, ViewPhoto } from '../result-types';
import { selectedRows } from '@/lib/estimator/configurator/engine';
import { moneyRange, notPictured } from '../state';
import { ConfiguratorBooking } from './booking-form';
import { designHighlights } from './booking-state';

export type ConfiguratorResultPageProps = ConfiguratorBookingProps & {
  onBack: () => void;
  /** "Photos show example designs (AI-assisted...)": said once, under the photo. */
  photoNote: string;
  /** Real finished jobs for the strip; falls back to contractor.gallery. */
  projects?: GalleryImage[];
};

const card = 'rounded-2xl border border-[#e4e0d8] bg-white';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]';

/**
 * Step 3, Buildoly-style: "Here's your pool." Their design's photos (every
 * view), what they picked in plain words, the cost breakdown with the total as
 * a range, next steps with the booking form (contact details only here), then
 * financing in words (no payment figures) and real Pool Masters projects.
 */
export function ConfiguratorResultPage(props: ConfiguratorResultPageProps) {
  const { contractor, template, spec, selection, breakdown, photos, designUrl, onBack, photoNote, projects } = props;
  const model = spec.models.find((m) => m.id === selection.model);
  const highlights = useMemo(() => designHighlights(spec, selection), [spec, selection]);
  const gallery = (projects?.length ? projects : contractor.gallery ?? []).filter((g) => g.src);
  const examplePrices = !template.pricesConfirmed;
  const [sent, setSent] = useState(false);
  // Picks no photo shows (priced only), named under the gallery so the photos never seem to drop them.
  const picked = selectedRows(spec, selection);
  const unpictured = spec.groups.flatMap((g) => g.rows).filter((r) => picked.has(r.id) && notPictured(spec, r.id));
  const upgradeCount = breakdown.upgrades.length;

  return (
    <div className="es-cfg-rise mx-auto w-full max-w-[760px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10" data-configurator-result="">
      <button type="button" onClick={onBack} className={`rounded text-[13px] font-medium text-[#4a463f] underline underline-offset-4 hover:text-[#111] ${focusRing}`}>
        &larr; Back to edit
      </button>

      <ResultGallery
        photos={photos}
        note={`${photoNote} Each view shows the picks it can${unpictured.length ? `. Priced, not pictured: ${listOf(unpictured.map((r) => r.label.toLowerCase()))}` : ''}.`}
      />

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f5a52]">Your {contractor.contractorName} design</p>
      <h1 id="cfg-result-title" tabIndex={-1} className="mt-1.5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-[#111] outline-none sm:text-[44px]">
        Here&rsquo;s your pool.
      </h1>
      {model ? (
        <p className="mt-2.5 text-pretty text-[15.5px] leading-[23px] text-[#4a463f]">
          The {model.name} ({model.dimensions})
          {breakdown.luxe ? ` with ${breakdown.luxe.label}` : ''}
          {upgradeCount ? `${breakdown.luxe ? ' and' : ' with'} ${upgradeCount} upgrade${upgradeCount === 1 ? '' : 's'}` : ''}. Ballpark{' '}
          <span className="whitespace-nowrap font-semibold tabular-nums text-[#111]">{moneyRange(breakdown.total)}</span>
          {examplePrices ? ' (example prices)' : ''}, firm price at your free site visit.
        </p>
      ) : null}

      {/* What they picked, in plain words. */}
      <section aria-labelledby="cfg-design" className={`${card} mt-6 p-5 sm:p-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="cfg-design" className="text-[17px] font-semibold text-[#111]">
            Your design
          </h2>
          <button type="button" onClick={onBack} className={`rounded text-[13px] font-medium text-[#111] underline underline-offset-4 ${focusRing}`}>
            Change
          </button>
        </div>
        <dl className="mt-3 divide-y divide-[#efece6] text-[14px]">
          {model ? <DesignRow term="Size" value={`${model.name} · ${model.dimensions}`} /> : null}
          {highlights.map((h) => (
            <DesignRow
              key={h.group}
              term={h.group}
              value={h.items.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  {item.label}
                  {item.luxe ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#111] px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white">
                      <Sparkles aria-hidden="true" className="size-2.5" />
                      Luxe
                    </span>
                  ) : item.included ? (
                    <span className="text-[12px] text-[#5f5a52]">Included</span>
                  ) : null}
                </span>
              ))}
            />
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-[#111] pt-4">
          <p className="text-[17px] font-semibold text-[#111]">Total estimate*</p>
          <p className="whitespace-nowrap text-right text-[22px] font-semibold tabular-nums tracking-[-0.01em] text-[#111] sm:text-[26px]">{moneyRange(breakdown.total)}</p>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f5f3ef] px-2.5 py-0.5 text-[12px] font-medium text-[#111]">Ballpark, not a quote</span>
          {examplePrices ? <span className="rounded-full border border-[#d9d4ca] px-2.5 py-0.5 text-[12px] text-[#5f5a52]">Example prices</span> : null}
        </div>
        <p className="mt-2.5 text-pretty text-[12.5px] leading-[19px] text-[#5f5a52]">
          *{examplePrices ? `Example prices, not yet confirmed by ${contractor.contractorName}. ` : ''}Excludes site-specific work (access, soil, permits) and
          permit fees. Your firm, all-in price is confirmed at your free on-site visit.
        </p>
        <details className="group mt-3 border-t border-[#efece6] pt-3">
          <summary
            className={`inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-medium text-[#111] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden ${focusRing}`}
          >
            See the cost breakdown
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="mt-2">
            <BreakdownLines breakdown={breakdown} siteNote="Confirmed at your free on-site visit" />
          </div>
        </details>
        <SaveDesign url={designUrl} />
      </section>

      {/* Next steps: the booking form, then the calendar. */}
      <section id="cfg-book" aria-labelledby="cfg-next" className={`${card} mt-4 scroll-mt-24 p-5 sm:p-7`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cfg-accent)]">Next step</p>
        <h2 id="cfg-next" className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[#111]">
          Book your free on-site consultation
        </h2>
        <p className="mt-2 text-pretty text-[14.5px] leading-[22px] text-[#4a463f]">
          We&rsquo;ll measure, confirm materials and give you a firm price. No obligation. You pick a time right after sending this.
        </p>
        {contractor.facts?.length || contractor.licenseLabel ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#3d3a34]">
            {[...(contractor.facts ?? []), contractor.licenseLabel].filter(Boolean).map((fact) => (
              <li key={fact} className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" className="size-3.5 text-[var(--cfg-accent)]" />
                {fact}
              </li>
            ))}
          </ul>
        ) : null}
        <ol className="mt-4 grid gap-2 text-[13px] text-[#4a463f] sm:grid-cols-3">
          {['Send your design', 'Pick a time', 'Get your firm price on site'].map((step, i) => {
            const done = sent && i === 0;
            return (
              <li key={step} className="flex items-center gap-2 rounded-xl bg-[#f5f3ef] px-3 py-2.5">
                <span
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums text-white ${done ? 'bg-[var(--cfg-accent)]' : 'bg-[#111]'}`}
                >
                  {done ? <Check aria-hidden="true" className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={done ? 'line-through decoration-[#8f897e]' : undefined}>{step}</span>
                {done ? <span className="sr-only"> (done)</span> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-6">
          <ConfiguratorBooking {...props} onSent={() => setSent(true)} />
        </div>
      </section>

      {contractor.financingDisclosure || contractor.financingNote ? (
        <section aria-labelledby="cfg-finance" className={`${card} mt-4 p-5 sm:p-6`}>
          <h2 id="cfg-finance" className="text-[16px] font-semibold text-[#111]">
            Financing available through third-party lenders
          </h2>
          {contractor.financingNote ? <p className="mt-1.5 text-pretty text-[14px] leading-[21px] text-[#4a463f]">{contractor.financingNote}</p> : null}
          {contractor.financingDisclosure ? <p className="mt-2 text-pretty text-[12px] leading-[18px] text-[#6d675d]">{contractor.financingDisclosure}</p> : null}
        </section>
      ) : null}

      {gallery.length ? <ProjectsStrip gallery={gallery} title={`Recent ${contractor.contractorName} projects`} /> : null}
    </div>
  );
}

/** "a, b and c". */
function listOf(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function DesignRow({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-[13px] text-[#6d675d]">{term}</dt>
      <dd className="flex flex-wrap gap-x-3 gap-y-1 font-medium text-[#111] sm:justify-end sm:text-right">{value}</dd>
    </div>
  );
}

/** The design in every view: one big photo, the views as thumbnails under it. */
function ResultGallery({ photos, note }: { photos: ViewPhoto[]; note: string }) {
  const [shown, setShown] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const photo = photos[shown] ?? photos[0];
  const srcOf = (p: ViewPhoto) => (broken[p.key] ? p.fallback : p.src);
  if (!photo) return null;
  return (
    <figure className="mt-4">
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#e9e6df] shadow-[0_1px_2px_rgba(17,17,17,0.06)]">
        <img
          key={srcOf(photo)}
          src={srcOf(photo)}
          srcSet={broken[photo.key] ? undefined : photo.srcSet}
          sizes={photo.srcSet ? '(min-width: 800px) 760px, 100vw' : undefined}
          alt={photo.alt}
          onError={() => setBroken((b) => ({ ...b, [photo.key]: true }))}
          className="es-cfg-fade absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-[#111] backdrop-blur-sm">{photo.label}</span>
      </div>
      {photos.length > 1 ? (
        <div role="group" aria-label="Views of your design" className="mt-2.5 flex gap-2">
          {photos.map((p, i) => (
            <button
              key={p.view}
              type="button"
              aria-pressed={i === shown}
              aria-label={`${p.label} view`}
              onClick={() => setShown(i)}
              className={`relative h-14 w-20 overflow-hidden rounded-lg border-2 transition-opacity duration-150 motion-reduce:transition-none sm:h-16 sm:w-24 ${focusRing} ${
                i === shown ? 'border-[#111]' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img src={srcOf(p)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <figcaption className="mt-2 text-[12px] text-[#6d675d]">{note}</figcaption>
    </figure>
  );
}

function SaveDesign({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;
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
      className={`mt-4 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-[#111] underline underline-offset-4 ${focusRing}`}
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy a link to this design'}</span>
    </button>
  );
}

/** Real finished jobs (not AI): a quiet horizontal strip. */
export function ProjectsStrip({ gallery, title }: { gallery: GalleryImage[]; title: string }) {
  return (
    <section aria-labelledby="cfg-projects" className="mt-10">
      <h2 id="cfg-projects" className="text-[16px] font-semibold text-[#111]">
        {title}
      </h2>
      <p className="text-[12.5px] text-[#6d675d]">Real photos of finished jobs.</p>
      <ul className="es-cfg-strip -mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2">
        {gallery.map((g) => (
          <li key={g.src} className="w-[168px] shrink-0 snap-start sm:w-[200px]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e6df]">
              <img src={g.thumb ?? g.src} alt={g.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            {g.caption ? <p className="mt-1.5 text-[12px] leading-4 text-[#5f5a52]">{g.caption}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
