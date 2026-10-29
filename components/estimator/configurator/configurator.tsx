'use client';

import './configurator.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { telHref } from '@/components/estimator/shell/facts';
import {
  bundleQuote,
  decodeSelection,
  defaultSelection,
  estimateSelection,
  isLockedByBundle,
  normalizeSelection,
  photoFor,
  rowDelta,
  selectedRows,
  selectionToAnswers,
} from '@/lib/estimator/configurator/engine';
import type { ConfiguratorSelection, ConfiguratorSpec } from '@/lib/estimator/configurator/types';
import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import { CostSummary, TotalBar } from './cost';
import { LuxeCard, ModelPicker, OptionGroupCard, type RowView } from './options';
import { PhotoStage } from './photo-stage';
import { currentPhotos, stagePhoto, type PhotoManifest, type StagePhoto } from './photos';
import { ProjectStrip } from './result';
import { ConfiguratorResultPage } from './result/result-page';
import {
  costBreakdown,
  deltaLabel,
  designUrl,
  hasSavedDesign,
  notPictured,
  reduceSelection,
  stepFromHash,
  toastFor,
  viewAfter,
  type ConfiguratorAction,
  type ConfiguratorStep,
} from './state';

export type ConfiguratorProps = {
  spec: ConfiguratorSpec;
  /** publicTemplate(...): with revealRange 'immediately' it carries the prices. */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  /** Which photo files ship (server page); null: unknown, the <img> falls back on error. */
  manifest?: PhotoManifest | null;
  /** iframe on the contractor's own site: no header of our own. */
  embedded?: boolean;
  /** Tests and previews: start from this design / step instead of the URL. */
  initialSelection?: ConfiguratorSelection;
  initialStep?: ConfiguratorStep;
};

const CAPTION = 'Example design · AI-assisted';

/**
 * The one-page pool configurator (Buildoly-style): a big photo on the left
 * that swaps between pre-rendered variants, the options on the right (size,
 * Go Luxe, finish, edge, deck, features, backyard, equipment), and a sticky
 * bar with the live range. Continue opens the cost summary, then the result
 * and booking step. Contact details are asked only there.
 *
 * The URL is the saved design (?m=medium&o=pebble,spa&lx=1, replaceState on
 * every change); the steps are #summary and #book so browser Back works.
 */
export function Configurator({ spec, template, contractor, manifest = null, embedded = false, initialSelection, initialStep = 'design' }: ConfiguratorProps) {
  const [selection, setSelection] = useState<ConfiguratorSelection>(() => normalizeSelection(spec, initialSelection ?? defaultSelection(spec)));
  const [step, setStep] = useState<ConfiguratorStep>(initialStep);
  const [view, setView] = useState(spec.views[0].id);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [barOpen, setBarOpen] = useState(false);
  // Phones: the photo shrinks to a strip once the options are scrolled, and opens again for a pick it shows.
  // `pinned` is the homeowner's own choice from the chevron (wins over the automatic size).
  const [scrolled, setScrolled] = useState(false);
  const [peek, setPeek] = useState(0);
  const [pinned, setPinned] = useState<boolean | null>(null);
  const [href, setHref] = useState('');
  const toastSeq = useRef(0);
  const restored = useRef(Boolean(initialSelection));
  // A saved design is decoded after the first paint: skip the one URL write that would show the default design.
  const skipSync = useRef(false);

  /* ---------------- URL <-> state ---------------- */

  // Load a saved design and step from the address bar once (client only, so the server markup stays the default design).
  useEffect(() => {
    if (!restored.current && hasSavedDesign(window.location.search)) {
      skipSync.current = true;
      setSelection(decodeSelection(spec, window.location.search));
    }
    restored.current = true;
    const fromHash = stepFromHash(window.location.hash);
    if (fromHash !== 'design') setStep(fromHash);
    const onPop = () => setStep(stepFromHash(window.location.hash));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [spec]);

  // Every change rewrites the query string in place: the address bar is "Save your design".
  useEffect(() => {
    if (!restored.current) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const next = designUrl(spec, window.location.href, selection);
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, '', next);
    setHref(new URL(next, window.location.origin).toString());
  }, [spec, selection]);

  const go = useCallback((next: ConfiguratorStep) => {
    setStep(next);
    setBarOpen(false);
    const hash = next === 'design' ? '' : `#${next}`;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (next === 'design') window.history.replaceState(window.history.state, '', url);
    else window.history.pushState(window.history.state, '', url);
    // New content at the top, focus on its heading (keyboard and screen-reader users land where the page changed).
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      const target = next === 'summary' ? 'cfg-summary-title' : next === 'book' ? 'cfg-result-title' : 'cfg-title';
      document.getElementById(target)?.focus({ preventScroll: true });
    });
  }, []);

  /* ---------------- Actions ---------------- */

  // The latest selection, so a click computes its toast from what is on screen (not inside a state updater).
  const current = useRef(selection);
  current.current = selection;
  const currentView = useRef(view);
  currentView.current = view;

  const act = useCallback(
    (action: ConfiguratorAction) => {
      const before = current.current;
      const after = reduceSelection(spec, before, action);
      current.current = after;
      setSelection(after);
      const text = toastFor(spec, before, after, action);
      if (text) setToast({ id: ++toastSeq.current, text });
      const nextView = viewAfter(spec, action, currentView.current) ?? currentView.current;
      if (nextView !== currentView.current) setView(nextView);
      // The photo changed: let it open up for a moment on phones.
      if (photoFor(spec, nextView, after) !== photoFor(spec, currentView.current, before) || action.type === 'model') setPeek((n) => n + 1);
    },
    [spec],
  );

  // Phones: the photo shrinks once the options are scrolled (fixed box: nothing below moves).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [peeking, setPeeking] = useState(false);
  useEffect(() => {
    if (!peek) return;
    setPeeking(true);
    const t = window.setTimeout(() => setPeeking(false), 1800);
    return () => window.clearTimeout(t);
  }, [peek]);
  const collapsed = barOpen ? true : pinned ?? (scrolled && !peeking);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------------- Prices ---------------- */

  const breakdown = useMemo(() => costBreakdown(spec, template, selection), [spec, template, selection]);
  const modelTotals = useMemo(
    () => Object.fromEntries(spec.models.map((m) => [m.id, estimateSelection(spec, template, { ...selection, model: m.id }).total])),
    [spec, template, selection],
  );
  const luxeQuote = useMemo(() => (spec.bundle ? bundleQuote(spec, template, selection.model) : null), [spec, template, selection.model]);

  const groupRows = useMemo(() => {
    const picked = selectedRows(spec, selection);
    return spec.groups.map((g) => ({
      group: g,
      rows: g.rows.map((r): RowView => {
        const locked = isLockedByBundle(spec, selection, r.id);
        const checked = picked.has(r.id);
        let price: string;
        if (locked && checked) price = 'Luxe selected';
        else if (r.included) price = 'Included';
        else {
          const d = rowDelta(spec, template, selection, r.id);
          price = d.low === 0 && d.high === 0 ? 'Included' : deltaLabel(d);
        }
        return { id: r.id, label: r.label, note: r.note, checked, locked, price, included: Boolean(r.included), notPictured: notPictured(spec, r.id) };
      }),
    }));
  }, [spec, template, selection]);

  /* ---------------- Photos ---------------- */

  const photo = useMemo(() => stagePhoto(spec, photoFor(spec, view, selection), manifest), [spec, view, selection, manifest]);
  const photos = useMemo(() => {
    const all = currentPhotos(spec, selection, manifest);
    const i = all.findIndex((p) => p.view === view);
    return i > 0 ? [all[i], ...all.slice(0, i), ...all.slice(i + 1)] : all;
  }, [spec, selection, manifest, view]);
  // Right away: the other views as they are now. When idle: this view one click away (each visual row flipped, Go Luxe).
  const nextPhotos = useMemo(() => currentPhotos(spec, selection, manifest), [spec, selection, manifest]);
  const idlePhotos = useMemo(() => {
    const out: StagePhoto[] = [];
    const visual = new Set(spec.views.find((v) => v.id === view)?.dimensions.flatMap((d) => d.options.flatMap((o) => [...o.rows, ...(o.allOf ?? [])])) ?? []);
    for (const rowId of visual) out.push(stagePhoto(spec, photoFor(spec, view, reduceSelection(spec, selection, { type: 'row', rowId })), manifest));
    if (spec.bundle) out.push(stagePhoto(spec, photoFor(spec, view, { ...selection, luxe: !selection.luxe }), manifest));
    const seen = new Set<string>();
    return out.filter((p) => (seen.has(p.src) ? false : (seen.add(p.src), true)));
  }, [spec, selection, manifest, view]);
  const model = spec.models.find((m) => m.id === selection.model);

  /* ---------------- Render ---------------- */

  const examplePrices = !template.pricesConfirmed;
  // Real finished jobs (never AI): the spec's list, else the contractor's gallery.
  const projects = spec.projects?.length ? spec.projects : (contractor.gallery ?? []);
  const top = embedded ? 'top-0' : 'top-14 lg:top-16';
  // The embed layout already wraps the page in <main id="main">.
  const Main = embedded ? 'div' : 'main';

  if (step === 'book') {
    return (
      <div className="es-cfg flex min-h-[100dvh] flex-1 flex-col" data-estimator-done="">
        {embedded ? null : <ConfiguratorHeader contractor={contractor} />}
        <Main id={embedded ? undefined : 'main'} className="flex-1">
          <ConfiguratorResultPage
            slug={contractor.slug}
            contractor={contractor}
            template={template}
            spec={spec}
            selection={selection}
            answers={selectionToAnswers(spec, selection)}
            breakdown={breakdown}
            photos={photos}
            designUrl={href}
            embedded={embedded}
            photoNote={spec.photoNote}
            projects={projects}
            onBack={() => go('design')}
          />
        </Main>
        <FinePrint contractor={contractor} examplePrices={examplePrices} />
      </div>
    );
  }

  return (
    <div className={`es-cfg flex min-h-[100dvh] flex-1 flex-col ${embedded ? 'es-cfg-embedded' : ''}`}>
      {embedded ? null : <ConfiguratorHeader contractor={contractor} />}
      <Main id={embedded ? undefined : 'main'} className="flex flex-1 flex-col lg:flex-row">
        {/*
          Photo. Phones: fixed under the header (a spacer below keeps its place), so shrinking it while
          scrolling or opening it for a pick never moves the options. Desktop: the sticky left column,
          the photo over a strip of the design's other views.
        */}
        <div
          className={`es-cfg-photo fixed inset-x-0 ${embedded ? 'top-0' : 'top-14'} z-20 transition-[height] duration-300 ease-out motion-reduce:transition-none ${
            collapsed ? 'h-[20vh]' : 'h-[32vh]'
          } lg:sticky lg:inset-x-auto lg:z-auto lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:transition-none ${
            embedded ? 'lg:h-[100dvh]' : 'lg:top-16 lg:h-[calc(100dvh-4rem)]'
          }`}
        >
          <div className="relative h-full lg:min-h-0 lg:flex-1">
            <PhotoStage
              spec={spec}
              view={view}
              onView={setView}
              photo={photo}
              next={nextPhotos}
              idle={idlePhotos}
              toast={toast}
              caption={CAPTION}
              model={model}
              models={spec.models}
              collapsed={collapsed}
              onCollapsed={(c) => setPinned(c)}
            />
          </div>
          <ViewStrip photos={currentPhotos(spec, selection, manifest)} view={view} onView={setView} />
        </div>
        <div aria-hidden="true" className="h-[32vh] shrink-0 lg:hidden" />

        {/* Options */}
        <div className="relative flex w-full flex-col border-[#e4e0d8] bg-[var(--cfg-sand)] lg:w-[440px] lg:shrink-0 lg:border-l xl:w-[480px]">
          {step === 'summary' ? (
            <div className="flex-1">
              <CostSummary breakdown={breakdown} examplePrices={examplePrices} contractorName={contractor.contractorName} onContinue={() => go('book')} onBack={() => go('design')} />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 px-4 pb-8 pt-4 sm:px-6 lg:pt-8">
                <header className="pb-1">
                  <h1 id="cfg-title" tabIndex={-1} className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[#111] outline-none sm:text-[32px]">
                    {spec.title}
                  </h1>
                  {spec.intro ? <p className="mt-1.5 hidden text-pretty text-[15px] leading-[22px] text-[#4a463f] sm:block">{spec.intro}</p> : null}
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-[#5f5a52]">
                    <span className="font-medium text-[#111]">Remodel pricing</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#111]">Ballpark, not a quote</span>
                    {examplePrices ? <span className="rounded-full border border-[#d9d4ca] bg-white px-2.5 py-0.5">Example prices</span> : null}
                  </p>
                </header>

                <div className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
                  <ModelPicker models={spec.models} value={selection.model} totals={modelTotals} onChange={(model) => act({ type: 'model', model })} />
                </div>

                {spec.bundle && luxeQuote ? (
                  <LuxeCard bundle={spec.bundle} quote={luxeQuote} on={selection.luxe} examplePrices={examplePrices} onChange={(on) => act({ type: 'luxe', on })} />
                ) : null}

                {groupRows.map(({ group, rows }) => (
                  <OptionGroupCard key={group.id} group={group} rows={rows} onRow={(rowId, on) => act({ type: 'row', rowId, on })} />
                ))}

                {projects.length ? (
                  <ProjectStrip gallery={projects} title={`Recent ${contractor.contractorName} projects`} className="pt-6" />
                ) : null}
              </div>
              <TotalBar
                breakdown={breakdown}
                open={barOpen}
                onOpen={setBarOpen}
                onContinue={() => go('summary')}
                continueLabel="Review my design"
                examplePrices={examplePrices}
              />
            </>
          )}
        </div>
      </Main>
      <FinePrint contractor={contractor} examplePrices={examplePrices} photoNote={spec.photoNote} />
    </div>
  );
}

/** Desktop: the design in every view, small, under the photo (one click to switch). */
function ViewStrip({ photos, view, onView }: { photos: (StagePhoto & { view: string; label: string })[]; view: string; onView: (view: string) => void }) {
  return (
    <div className="hidden shrink-0 items-center gap-3 border-t border-[#e4e0d8] bg-white px-5 py-3 lg:flex">
      <p className="mr-1 w-[118px] shrink-0 text-[12px] leading-4 text-[#5f5a52]">Your design from every angle</p>
      {photos.map((p) => {
        const active = p.view === view;
        return (
          <button
            key={p.view}
            type="button"
            onClick={() => onView(p.view)}
            aria-label={`${p.label} view`}
            aria-pressed={active}
            className={`group/thumb relative h-[68px] w-[102px] shrink-0 overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none ${
              active ? 'border-[#111]' : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- the same pre-rendered file as the stage */}
            <img src={p.srcSet ? p.src.replace(/\.webp$/, '-sm.webp') : p.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-medium text-[#111]">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

/** Slim white bar: logo, license, phone. No HomeQuote navigation. */
export function ConfiguratorHeader({ contractor }: { contractor: Pick<ContractorEstimatorConfig, 'contractorName' | 'licenseLabel' | 'phone' | 'logoUrl'> }) {
  const tel = telHref(contractor.phone);
  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e0d8] bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:h-16 lg:px-8">
        {contractor.logoUrl ? (
          <span className="relative block h-8 w-[76px] shrink-0 lg:h-10 lg:w-[95px]">
            <Image src={contractor.logoUrl} alt={contractor.contractorName} fill sizes="95px" className="object-contain object-left" priority />
          </span>
        ) : (
          <span className="text-[16px] font-semibold tracking-tight text-[#111]">{contractor.contractorName}</span>
        )}
        <span className="hidden h-6 w-px bg-[#e4e0d8] sm:block" aria-hidden="true" />
        <span className="hidden text-[13px] text-[#5f5a52] sm:block">Pool design studio</span>
        <span className="ml-auto whitespace-nowrap text-[11.5px] tabular-nums text-[#6d675d] sm:text-[12.5px]">{contractor.licenseLabel}</span>
        {tel ? (
          <a
            href={tel}
            aria-label={`Call ${contractor.contractorName} at ${contractor.phone}`}
            className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-full border border-[#d9d4ca] px-3 text-[13px] font-medium text-[#111] transition-colors duration-150 hover:bg-[#f5f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none sm:px-3.5"
          >
            <Phone aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            <span className="hidden tabular-nums sm:inline">{contractor.phone}</span>
            <span className="sm:hidden">Call</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}

function FinePrint({
  contractor,
  examplePrices,
  photoNote,
}: {
  contractor: Pick<ContractorEstimatorConfig, 'contractorName' | 'licenseLabel' | 'serviceAreaLabel'>;
  examplePrices: boolean;
  photoNote?: string;
}) {
  return (
    <footer className="border-t border-[#e4e0d8] bg-white text-[12px] leading-[18px] text-[#6d675d]">
      <div className="flex flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-3xl space-y-1">
          {photoNote ? <p>{photoNote}</p> : null}
          <p>
            Prices are a ballpark, not a quote{examplePrices ? `, and are example prices not yet confirmed by ${contractor.contractorName}` : ''}. Site-specific work
            and your firm price are confirmed at the free on-site visit.
          </p>
          <p>
            <span className="font-medium text-[#4a463f]">{contractor.contractorName}</span> <span className="tabular-nums">({contractor.licenseLabel})</span>
            {contractor.serviceAreaLabel ? ` · Serving ${contractor.serviceAreaLabel}.` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <Link href="/privacy" className="underline-offset-4 hover:text-[#111] hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:text-[#111] hover:underline">
            Terms
          </Link>
          <span>Powered by Rendoly</span>
        </div>
      </div>
    </footer>
  );
}
