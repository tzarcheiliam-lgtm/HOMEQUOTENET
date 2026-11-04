'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Minus, RotateCcw } from 'lucide-react';
import { ADD_ONS, AD_SPEND_NOTE, COMPARISON, ROI_EXAMPLE, TIERS, allIn, type Tier, type TierId } from '@/lib/pitch/config';
import { calculateRoi } from '@/lib/pitch/roi';
import { cn } from '@/lib/utils';
import { useDeck, usd } from './deck-context';
import { FinePrint, Heading, Lead, Slide, Tick } from './kit';

const range = (r: { min: number; max: number }) => `${usd(r.min)}–${usd(r.max)}`;

/** One package card, styled like the owner's pricing sheet: white, blue (recommended) or blue-outlined. */
export function TierCard({ t, selected, onSelect, compact = false }: { t: Tier; selected: boolean; onSelect: () => void; compact?: boolean }) {
  const featured = !!t.recommended;
  const outlined = t.id === 'pipeline';
  const total = allIn(t);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative flex h-full flex-col rounded-3xl px-8 pb-7 pt-7 text-left transition-shadow duration-300',
        featured
          ? 'pd-on-dark bg-[var(--pd-blue)] text-white shadow-[0_40px_80px_-30px_rgba(0,56,184,0.55)]'
          : outlined
            ? 'border-2 border-[var(--pd-blue)] bg-white'
            : 'border border-[var(--pd-line)] bg-white',
        selected && 'ring-4 ring-[var(--pd-gold)] ring-offset-4 ring-offset-[var(--pd-mist)]'
      )}
    >
      <span
        className={cn(
          'self-start rounded-full px-3.5 py-1 text-[14px] font-bold',
          featured ? 'bg-[var(--pd-gold)] text-[var(--pd-navy)]' : outlined ? 'bg-[var(--pd-blue-soft)] text-[var(--pd-blue)]' : 'bg-[var(--pd-mist)] text-[var(--pd-slate)]'
        )}
      >
        {t.tag}
      </span>
      <p className="font-display mt-4 text-[28px] font-semibold tracking-tight">{t.name}</p>
      <p className="pd-num mt-1 flex items-baseline">
        <span className={cn('font-display text-[58px] font-bold leading-none tracking-tight', featured ? 'text-[var(--pd-gold)]' : outlined ? 'text-[var(--pd-blue)]' : 'text-[var(--pd-navy)]')}>
          {usd(t.price)}
        </span>
        <span className={cn('font-display text-[40px] font-bold leading-none', featured ? 'text-white/75' : 'text-[var(--pd-slate)]')}>/mo</span>
      </p>
      <p className={cn('pd-num mt-3 text-[16px] leading-snug', featured ? 'text-white/75' : 'text-[var(--pd-slate)]')}>
        + {usd(t.setup)} setup · {t.term} · ads {range(t.adBudget)}/mo, paid by you
      </p>
      <p className="pd-num mt-1.5 text-[17px] font-bold">All-in: {range(total)}/mo with ads</p>
      {!compact ? (
        <ul className="mt-5 mb-5 space-y-2">
          {[...(t.buildsOn ? [t.buildsOn] : []), ...t.includes].map((x) => (
            <li key={x} className={cn('flex gap-3 text-[17px] leading-snug', x === t.highlight && 'font-bold')}>
              <Check className={cn('mt-1 size-4 shrink-0', featured ? 'text-[var(--pd-gold)]' : 'text-[var(--pd-blue)]')} strokeWidth={3} aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
      ) : null}
      <div
        className={cn(
          'mt-auto rounded-2xl px-5 py-4 text-[17px] leading-snug',
          compact ? 'mt-5' : 'pt-4',
          featured ? 'bg-[var(--pd-navy)] text-white' : 'bg-[var(--pd-mist)] text-[var(--pd-navy)]'
        )}
      >
        <span className={cn('font-bold', featured && 'text-[var(--pd-gold)]')}>{t.callout.lead}</span> {t.callout.text}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// 6. Packages
// ---------------------------------------------------------------------------------------------

export function PricingSlide() {
  const { tier, setTier } = useDeck();
  return (
    <Slide tone="mist">
      <Heading className="max-w-none">Three ways to grow your remodeling work.</Heading>
      <div className="mt-10 grid flex-1 grid-cols-3 gap-6 pb-[52px]">
        {TIERS.map((t) => (
          <TierCard key={t.id} t={t} selected={tier === t.id} onSelect={() => setTier(t.id)} />
        ))}
      </div>
      <FinePrint>{AD_SPEND_NOTE}</FinePrint>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 7. Detailed comparison
// ---------------------------------------------------------------------------------------------

export function CompareSlide() {
  const { tier, setTier } = useDeck();
  const [open, setOpen] = useState<string | null>(null);
  const [focusUpgrade, setFocusUpgrade] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  /** Turning the highlight on scrolls the rows Managed Growth adds into view. */
  const toggleUpgrade = () => {
    const on = !focusUpgrade;
    setFocusUpgrade(on);
    const box = scroller.current;
    const row = box?.querySelector<HTMLElement>('[data-upgrade-group]');
    const head = box?.querySelector<HTMLElement>('thead');
    if (box && row) box.scrollTo({ top: on ? row.offsetTop - (head?.offsetHeight ?? 0) : 0, behavior: 'smooth' });
  };
  return (
    <Slide tone="light">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Heading>Compare the packages</Heading>
          <p className="pd-small mt-3 text-[18px]">Open any row to see what it means for you.</p>
        </div>
        <button
          type="button"
          onClick={toggleUpgrade}
          aria-pressed={focusUpgrade}
          className={cn(
            'mb-2 rounded-full border px-5 py-2.5 text-[16px] font-semibold transition-colors',
            focusUpgrade ? 'border-[var(--pd-blue)] bg-[var(--pd-blue)] text-white' : 'border-[var(--pd-line)] text-[var(--pd-navy)] hover:bg-[var(--pd-mist)]'
          )}
        >
          {focusUpgrade ? 'Showing what Managed Growth adds' : 'Show what Managed Growth adds'}
        </button>
      </div>

      <div ref={scroller} className="mt-7 mb-[44px] min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--pd-line)]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-[var(--pd-line)]">
              <th className="px-6 py-4 text-[15px] font-semibold text-[var(--pd-slate)]">Feature</th>
              {TIERS.map((t) => (
                <th key={t.id} className={cn('w-[250px] px-4 py-3 text-center', t.recommended && 'bg-[var(--pd-blue-soft)]')}>
                  <button type="button" onClick={() => setTier(t.id)} aria-pressed={tier === t.id} className="w-full rounded-lg">
                    <span className={cn('block text-[16px] font-semibold', tier === t.id && 'underline decoration-[var(--pd-gold)] decoration-4 underline-offset-4')}>{t.name}</span>
                    <span className="pd-num block text-[14px] text-[var(--pd-slate)]">{usd(t.price)} / mo</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {COMPARISON.map((g) => (
            <tbody key={g.title}>
              <tr data-upgrade-group={g.rows.some((r) => r.tiers.includes('managed') && !r.tiers.includes('starter')) ? '' : undefined}>
                <th colSpan={4} className="bg-[var(--pd-mist)] px-6 py-2.5 text-[14px] font-semibold text-[var(--pd-slate)]">{g.title}</th>
              </tr>
              {g.rows.map((r) => {
                const key = `${g.title}:${r.feature}`;
                const isOpen = open === key;
                const addedByT2 = r.tiers.includes('managed') && !r.tiers.includes('starter');
                const dim = focusUpgrade && !addedByT2;
                return (
                  <tr key={key} className={cn('border-t border-[var(--pd-line)] align-top transition-opacity', dim && 'opacity-30')}>
                    <td className="px-6 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-2 text-left text-[17px] font-medium"
                      >
                        <ChevronDown className={cn('size-4 shrink-0 text-[var(--pd-slate)] transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                        {r.feature}
                        {addedByT2 && focusUpgrade ? <span className="ml-2 rounded-full bg-[var(--pd-blue)] px-2 py-0.5 text-[12px] font-semibold text-white">Added</span> : null}
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden pl-6 text-[15px] leading-relaxed text-[var(--pd-slate)]"
                          >
                            <span className="block pt-2">{r.detail}</span>
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </td>
                    {TIERS.map((t) => (
                      <td key={t.id} className={cn('px-4 py-2.5 text-center', t.recommended && 'bg-[var(--pd-blue-soft)]/60')}>
                        {r.tiers.includes(t.id) ? (
                          <Tick className="mx-auto" />
                        ) : (
                          <Minus className="mx-auto size-4 text-[var(--pd-line)]" aria-label="Not included" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 8. Why appointment generation wins
// ---------------------------------------------------------------------------------------------

const LEAD_PATH: [string, 'You' | 'HomeQuote'][] = [
  ['A lead lands in your inbox', 'You'],
  ['Call back between jobs', 'You'],
  ['Voicemail, then a text', 'You'],
  ['Try again tomorrow', 'You'],
  ['Work out if they’re a fit', 'You'],
  ['Maybe book an estimate', 'You'],
];
const APPOINTMENT_PATH: [string, 'You' | 'HomeQuote'][] = [
  ['A homeowner fills out the funnel', 'HomeQuote'],
  ['Called and texted right away', 'HomeQuote'],
  ['Project and fit confirmed', 'HomeQuote'],
  ['Booked on your calendar', 'HomeQuote'],
  ['Confirmation and reminders sent', 'HomeQuote'],
  ['You show up and sell', 'You'],
];

function Path({ title, steps, featured }: { title: string; steps: typeof LEAD_PATH; featured?: boolean }) {
  return (
    <div className={cn('rounded-3xl p-9', featured ? 'pd-on-dark bg-[var(--pd-navy)] text-white' : 'border border-[var(--pd-line)] bg-white')}>
      <p className="pd-h3">{title}</p>
      <ol className="mt-7 space-y-3.5">
        {steps.map(([step, who], i) => (
          <li key={step} className="flex items-center gap-4">
            <span className={cn('pd-num w-6 text-[15px]', featured ? 'text-white/40' : 'text-[var(--pd-slate)]')}>{i + 1}</span>
            <span className="flex-1 text-[19px]">{step}</span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[13px] font-semibold',
                who === 'You'
                  ? featured
                    ? 'bg-[var(--pd-gold)] text-[var(--pd-navy)]'
                    : 'bg-[var(--pd-navy)] text-white'
                  : 'bg-white/12 text-white ring-1 ring-white/25'
              )}
            >
              {who}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WhySlide() {
  return (
    <Slide tone="mist">
      <Heading className="max-w-[1300px]">A lead is an opportunity. A booked appointment is a sales conversation.</Heading>
      <div className="my-auto grid grid-cols-2 gap-8">
        <Path title="When you buy leads" steps={LEAD_PATH} />
        <Path title="With Managed Growth" steps={APPOINTMENT_PATH} featured />
      </div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 9. ROI calculator
// ---------------------------------------------------------------------------------------------

type Field = 'avgContract' | 'marginPct' | 'appointments' | 'showRatePct' | 'closeRatePct' | 'adBudget';

const FIELDS: { key: Field; label: string; min: number; max: number; step: number; kind: 'usd' | 'pct' | 'count' }[] = [
  { key: 'avgContract', label: 'Average contract value', min: 2000, max: 200000, step: 1000, kind: 'usd' },
  { key: 'marginPct', label: 'Gross profit margin', min: 0, max: 80, step: 1, kind: 'pct' },
  { key: 'appointments', label: 'Booked appointments a month', min: 0, max: 60, step: 1, kind: 'count' },
  { key: 'showRatePct', label: 'Appointments that are held', min: 0, max: 100, step: 1, kind: 'pct' },
  { key: 'closeRatePct', label: 'Held appointments you close', min: 0, max: 100, step: 1, kind: 'pct' },
  { key: 'adBudget', label: 'Monthly ad budget (paid to Meta)', min: 0, max: 15000, step: 250, kind: 'usd' },
];

const fmt = (n: number, d = 1) => new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(n);

export function RoiSlide() {
  const { tier, setTier } = useDeck();
  const [v, setV] = useState<Record<Field, number>>({ ...ROI_EXAMPLE });
  const pkg = TIERS.find((t) => t.id === tier) ?? TIERS[1];
  const r = useMemo(() => calculateRoi({ ...v, packageCost: pkg.price }), [v, pkg.price]);
  const set = (k: Field, raw: string) => {
    const n = Number(raw.replace(/[^0-9.]/g, ''));
    setV((cur) => ({ ...cur, [k]: Number.isFinite(n) ? n : 0 }));
  };
  const negative = r.contribution < 0;

  return (
    <Slide tone="light">
      <div className="flex items-start justify-between gap-6">
        <Heading>Understanding your return</Heading>
        <p className="mt-3 rounded-full bg-amber-50 px-4 py-2 text-[15px] font-semibold text-amber-900">Hypothetical example. Not a forecast or a guarantee.</p>
      </div>

      <div className="mt-8 mb-[56px] grid min-h-0 flex-1 grid-cols-[620px_1fr] gap-12">
        {/* Inputs */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[15px] font-semibold text-[var(--pd-slate)]">HomeQuote package</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="HomeQuote package">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tier === t.id}
                  onClick={() => setTier(t.id as TierId)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    tier === t.id ? 'border-[var(--pd-blue)] bg-[var(--pd-blue)] text-white' : 'border-[var(--pd-line)] hover:bg-[var(--pd-mist)]'
                  )}
                >
                  <span className="block text-[14px] font-semibold">{t.name}</span>
                  <span className="pd-num block text-[13px] opacity-80">{usd(t.price)} / mo</span>
                </button>
              ))}
            </div>
          </div>
          {FIELDS.map((f) => {
            const value = v[f.key];
            const fill = `${((Math.min(f.max, Math.max(f.min, value)) - f.min) / (f.max - f.min)) * 100}%`;
            const id = `roi-${f.key}`;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={id} className="text-[16px] font-medium">{f.label}</label>
                  <div className="flex items-center rounded-lg border border-[var(--pd-line)] px-2.5 py-1 focus-within:border-[var(--pd-blue)]">
                    {f.kind === 'usd' ? <span className="text-[15px] text-[var(--pd-slate)]">$</span> : null}
                    <input
                      inputMode="numeric"
                      aria-label={`${f.label}, exact value`}
                      className="pd-num w-[92px] bg-transparent text-right text-[16px] font-semibold outline-none"
                      value={fmt(value, 0)}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                    {f.kind === 'pct' ? <span className="text-[15px] text-[var(--pd-slate)]">%</span> : null}
                  </div>
                </div>
                <input
                  id={id}
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={Math.min(f.max, Math.max(f.min, value))}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="pd-range mt-2"
                  style={{ ['--pd-fill' as string]: fill }}
                />
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setV({ ...ROI_EXAMPLE })}
            className="mt-1 inline-flex items-center gap-2 self-start text-[15px] font-semibold text-[var(--pd-blue)] hover:underline"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset to the example
          </button>
        </div>

        {/* Results */}
        <div className="flex flex-col rounded-3xl bg-[var(--pd-mist)] p-9">
          <ol className="grid grid-cols-5 gap-3 text-center">
            {[
              ['Booked', fmt(v.appointments, 0)],
              ['Held', fmt(r.attended)],
              ['Closed jobs', fmt(r.closedJobs)],
              ['Revenue', usd(r.revenue)],
              ['Gross profit', usd(r.grossProfit)],
            ].map(([label, value], i) => (
              <li key={label} className="rounded-2xl bg-white px-2 py-4">
                <p className={cn('pd-num font-display text-[26px] font-bold tracking-tight', i >= 3 && 'pd-money')}>{value}</p>
                <p className="mt-1 text-[14px] text-[var(--pd-slate)]">{label}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-5 border-t border-[var(--pd-line)] pt-8">
            <div>
              <p className="text-[15px] text-[var(--pd-slate)]">Total marketing investment</p>
              <p className="pd-num mt-1 text-[30px] font-bold">{usd(r.investment)}</p>
              <p className="text-[13px] text-[var(--pd-slate)]">{usd(pkg.price)} HomeQuote + {usd(v.adBudget)} ads a month (one-time {usd(pkg.setup)} setup not included)</p>
            </div>
            <div>
              <p className="text-[15px] text-[var(--pd-slate)]">Break-even</p>
              <p className="pd-num mt-1 text-[30px] font-bold">{r.breakEvenJobs === null ? 'n/a' : `${fmt(r.breakEvenJobs)} jobs`}</p>
              <p className="text-[13px] text-[var(--pd-slate)]">Closed jobs whose gross profit covers the spend</p>
            </div>
          </div>

          <div className="mt-auto rounded-2xl bg-[var(--pd-navy)] p-7 text-white">
            <p className="text-[16px] text-white/70">Estimated contribution after marketing spend</p>
            <div className="mt-1 flex items-baseline justify-between gap-6">
              <p className={cn('pd-num font-display text-[56px] font-bold leading-none tracking-tight', negative ? 'text-red-300' : 'text-[var(--pd-money-on-dark)]')}>
                {usd(r.contribution)}
              </p>
              <p className="pd-num text-right text-[17px] text-white/80">
                {r.romi === null ? 'No spend entered' : `${fmt(r.romi * 100, 0)}% return on marketing`}
              </p>
            </div>
            <p className="mt-3 text-[13px] text-white/55">Gross profit minus HomeQuote fee and ad spend. Revenue is not profit; results depend on your market, pricing and sales process.</p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 10. Optional services
// ---------------------------------------------------------------------------------------------

export function AddOnsSlide() {
  return (
    <Slide tone="light">
      <Heading>Optional services</Heading>
      <Lead>Add what you need. Anything already in your package is never charged twice.</Lead>
      <ul className="mt-auto mb-[70px] divide-y divide-[var(--pd-line)] border-y border-[var(--pd-line)]">
        {ADD_ONS.map((a) => (
          <li key={a.name} className="grid grid-cols-[380px_1fr_260px] items-baseline gap-8 py-6">
            <p className="pd-h3">{a.name}</p>
            <div>
              <p className="text-[18px]">{a.detail}</p>
              {a.includedIn ? <p className="mt-1 text-[15px] font-medium text-[var(--pd-blue)]">{a.includedIn}</p> : null}
            </div>
            <p className="pd-num text-right font-display text-[26px] font-semibold tracking-tight">{a.price}</p>
          </li>
        ))}
      </ul>
    </Slide>
  );
}
