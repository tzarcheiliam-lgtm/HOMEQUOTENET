'use client';

import { Check, ChevronDown } from 'lucide-react';
import type { BundleQuote } from '@/lib/estimator/configurator/engine';
import type { ConfiguratorBundle, ConfiguratorGroup, ConfiguratorModel, Range } from '@/lib/estimator/configurator/types';
import { deltaLabel, fromLabel, money } from './state';

/*
 * The option column's cards: size, Go Luxe and the option groups. Native
 * radios and checkboxes inside fieldset/legend (arrow keys move within a
 * radio group, Space toggles a checkbox), styled to look like Buildoly's rows.
 */

const card = 'rounded-2xl border border-[#e4e0d8] bg-white';
const focusRing = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--cfg-accent)]';

/* ------------------------------------------------------------------ */
/* Size                                                                */
/* ------------------------------------------------------------------ */

export function ModelPicker({
  models,
  value,
  totals,
  onChange,
}: {
  models: ConfiguratorModel[];
  value: string;
  /** Total of the current design at each size. */
  totals: Record<string, Range>;
  onChange: (id: string) => void;
}) {
  const current = models.find((m) => m.id === value);
  return (
    <fieldset>
      <legend className="mb-1 text-[15px] font-semibold text-[#111]">Your pool&rsquo;s size</legend>
      <p className="mb-3 text-[12.5px] leading-[18px] text-[#5f5a52]">Pick the closest. We measure it at the free site visit.</p>
      <div className="grid grid-cols-3 gap-2">
        {models.map((m) => {
          const on = m.id === value;
          return (
            <label
              key={m.id}
              className={`relative flex cursor-pointer flex-col rounded-2xl border bg-white px-3 pb-2.5 pt-3 transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none ${focusRing} ${
                on ? 'border-[#111] shadow-[0_0_0_1px_#111]' : 'border-[#e4e0d8] hover:border-[#bdb7ab]'
              }`}
            >
              <input type="radio" name="cfg-model" value={m.id} checked={on} onChange={() => onChange(m.id)} className="sr-only" />
              <PoolGlyph model={m} models={models} on={on} />
              <span className="mt-2 text-[15px] font-semibold leading-5 text-[#111]">{m.name}</span>
              <span className="text-[13px] tabular-nums text-[#5f5a52]">{m.dimensions}</span>
              <span className="mt-1 text-[12px] tabular-nums text-[#5f5a52]">{totals[m.id] ? fromLabel(totals[m.id]) : ''}</span>
            </label>
          );
        })}
      </div>
      {current ? <p className="mt-2.5 hidden text-[13px] text-[#5f5a52] sm:block">{current.tagline}.</p> : null}
    </fieldset>
  );
}

/** A tiny to-scale rectangle so the three sizes read at a glance. */
function PoolGlyph({ model, models, on }: { model: ConfiguratorModel; models: ConfiguratorModel[]; on: boolean }) {
  const dims = (m: ConfiguratorModel) => m.dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [1, 1];
  const maxW = Math.max(...models.map((m) => dims(m)[0]));
  const [w, h] = dims(model);
  const scale = 44 / maxW;
  return (
    <span aria-hidden="true" className="flex h-7 items-end">
      <span
        className={`block rounded-[3px] border transition-colors duration-150 motion-reduce:transition-none ${on ? 'border-[var(--cfg-accent)] bg-[#cfe3f3]' : 'border-[#bdb7ab] bg-[#eef3f6]'}`}
        style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Go Luxe                                                             */
/* ------------------------------------------------------------------ */

export function LuxeCard({
  bundle,
  quote,
  on,
  onChange,
  examplePrices,
}: {
  bundle: ConfiguratorBundle;
  quote: BundleQuote;
  on: boolean;
  onChange: (on: boolean) => void;
  /** Prices not yet confirmed by the contractor: the saving is an example too. */
  examplePrices: boolean;
}) {
  const count = bundle.includes.length;
  return (
    <section
      aria-labelledby="cfg-luxe-title"
      className={`rounded-2xl border p-5 transition-colors duration-200 motion-reduce:transition-none ${
        on ? 'border-[#111] bg-[#111] text-white' : 'border-[var(--cfg-accent-line)] bg-[var(--cfg-accent-tint)] text-[#111]'
      }`}
    >
      <div className="flex items-center gap-4">
        <h2 id="cfg-luxe-title" className="min-w-0 flex-1 text-[18px] font-semibold leading-6">
          {bundle.label}
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="cfg-luxe-title"
          onClick={() => onChange(!on)}
          className={`relative inline-flex h-7 w-12 shrink-0 touch-manipulation items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
            on ? 'bg-white focus-visible:outline-white' : 'bg-[#cfcac0] focus-visible:outline-[var(--cfg-accent)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute left-0.5 size-6 rounded-full shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${
              on ? 'translate-x-5 bg-[#111]' : 'translate-x-0 bg-white'
            }`}
          />
        </button>
      </div>
      <p className={`mt-1 text-pretty text-[14px] leading-5 ${on ? 'text-white/80' : 'text-[#4a463f]'}`}>
        Our {count} signature upgrades in one package, for less than adding them one by one.
      </p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums">
        <span className={`text-[12px] ${on ? 'text-white/80' : 'text-[#5f5a52]'}`}>from</span>
        <span className={`text-[22px] font-semibold tracking-[-0.01em] ${on ? 'text-white' : 'text-[var(--cfg-accent)]'}`}>
          <span className="sr-only">Package price: </span>
          {deltaLabel(quote.price)}
        </span>
        <span className={`text-[14px] line-through ${on ? 'text-white/70' : 'text-[#5f5a52]'}`}>
          <span className="sr-only">instead of </span>
          {money(quote.full.low)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${on ? 'bg-white text-[#111]' : 'bg-[#111] text-white'}`}>
          Save {money(quote.saving.low)}+
        </span>
      </p>
      {examplePrices ? (
        <p className={`mt-1.5 text-[12px] ${on ? 'text-white/75' : 'text-[#5f5a52]'}`}>Example prices and saving, confirmed at your site visit.</p>
      ) : null}
      <details className="group mt-3">
        <summary
          className={`inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden ${
            on ? 'text-white/80 focus-visible:outline-white' : 'text-[#4a463f] focus-visible:outline-[var(--cfg-accent)]'
          }`}
        >
          What&rsquo;s included
          <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className={`mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] ${on ? 'text-white/85' : 'text-[#4a463f]'}`}>
          {bundle.includes.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check aria-hidden="true" className={`size-3.5 shrink-0 ${on ? 'text-white' : 'text-[var(--cfg-accent)]'}`} strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Option groups                                                       */
/* ------------------------------------------------------------------ */

export type RowView = {
  id: string;
  label: string;
  note?: string;
  checked: boolean;
  /** Forced by Go Luxe (cannot change while it is on). */
  locked: boolean;
  /** "Included", "+$1,800" (shown with a small "from"), "Luxe selected". */
  price: string;
  included: boolean;
  /** No photo shows this row (it changes the price only). */
  notPictured?: boolean;
};

export function OptionGroupCard({
  group,
  rows,
  onRow,
}: {
  group: ConfiguratorGroup;
  rows: RowView[];
  onRow: (rowId: string, on: boolean) => void;
}) {
  const single = group.kind === 'single';
  const allLocked = rows.every((r) => r.locked);
  return (
    <fieldset className={`${card} px-4 pb-1.5 pt-3.5 sm:px-5 ${single && allLocked ? 'bg-[#faf9f6]' : ''}`}>
      <legend className="float-left w-full">
        <span className="block text-[15px] font-semibold text-[#111]">{group.title}</span>
        {group.note ? <span className="mt-0.5 block text-[13px] text-[#5f5a52]">{group.note}</span> : null}
        {!single ? <span className="sr-only"> (pick any)</span> : null}
      </legend>
      <div className="clear-both pt-1.5">
        {rows.map((r, i) => (
          <label
            key={r.id}
            className={`group/row relative flex min-h-[52px] items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-[#efece6]' : ''} ${
              r.locked ? 'cursor-default' : 'cursor-pointer'
            } ${focusRing} rounded-sm`}
          >
            <input
              type={single ? 'radio' : 'checkbox'}
              name={single ? `cfg-${group.id}` : undefined}
              value={r.id}
              checked={r.checked}
              disabled={r.locked}
              onChange={(e) => onRow(r.id, e.currentTarget.checked)}
              className="sr-only"
            />
            <Mark single={single} checked={r.checked} locked={r.locked} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] leading-5 ${r.checked ? 'font-semibold' : 'font-normal'} ${r.locked && !r.checked ? 'text-[#8f897e]' : 'text-[#111]'}`}>
                {r.label}
              </span>
              {r.note || r.notPictured ? (
                <span className={`block text-[12.5px] leading-[18px] ${r.locked && !r.checked ? 'text-[#8f897e]' : 'text-[#6d675d]'}`}>
                  {r.note}
                  {r.notPictured ? <span className="whitespace-nowrap">{r.note ? ' · ' : ''}Not pictured</span> : null}
                </span>
              ) : null}
            </span>
            <span
              className={`shrink-0 text-right tabular-nums ${
                r.locked && r.checked
                  ? 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5f5a52]'
                  : r.included
                    ? 'text-[13px] text-[#6d675d]'
                    : `text-[14px] ${r.locked ? 'text-[#8f897e]' : 'text-[#111]'}`
              }`}
            >
              {!r.included && !(r.locked && r.checked) && r.price.startsWith('+') ? (
                <span className="mr-1 text-[11.5px] font-normal text-[#6d675d]">from</span>
              ) : null}
              {r.price}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The radio dot / checkbox tick drawn for the visually hidden input. */
function Mark({ single, checked, locked }: { single: boolean; checked: boolean; locked: boolean }) {
  const base = 'flex size-5 shrink-0 items-center justify-center border transition-colors duration-150 motion-reduce:transition-none';
  const tone = checked ? (locked ? 'border-[#6d675d] bg-white' : 'border-[#111] bg-white') : locked ? 'border-[#ddd8cf] bg-[#f6f4f0]' : 'border-[#bdb7ab] bg-white group-hover/row:border-[#7a746a]';
  if (single) {
    return (
      <span aria-hidden="true" className={`${base} ${tone} rounded-full`}>
        <span className={`size-2.5 rounded-full transition-transform duration-150 motion-reduce:transition-none ${checked ? 'scale-100' : 'scale-0'} ${locked ? 'bg-[#6d675d]' : 'bg-[#111]'}`} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${base} rounded-md ${checked ? (locked ? 'border-[#6d675d] bg-[#6d675d]' : 'border-[#111] bg-[#111]') : tone}`}>
      <Check className={`size-3.5 text-white transition-opacity duration-150 motion-reduce:transition-none ${checked ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
    </span>
  );
}
