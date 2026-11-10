'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function Slider({ id, label, hint, min, max, step, value, onChange, format }: {
  id: string; label: string; hint: string; min: number; max: number; step: number;
  value: number; onChange: (n: number) => void; format: (n: number) => string;
}) {
  return (
    <div className="py-5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-lg font-bold tracking-tight">{label}</label>
        <output htmlFor={id} className="font-[family-name:var(--font-sora)] text-2xl font-bold tracking-[-0.03em]">{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mk-range mt-3 w-full" />
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{hint}</p>
    </div>
  );
}

/**
 * "Run your own math". Pure arithmetic on the visitor's own numbers: how many
 * jobs the marketing has to pay for to break even, and how many booked
 * estimates that takes at their show and close rates. It is not a forecast
 * and says so.
 */
export function MathCalc({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [cost, setCost] = useState(6000);
  const [gp, setGp] = useState(10000);
  const [show, setShow] = useState(80);
  const [close, setClose] = useState(30);

  const jobs = cost / gp;
  const estimates = jobs / ((show / 100) * (close / 100));

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-6">
        <div className="border-t-2 border-[var(--navy)]">
          <Slider id="mk-cost" label="Monthly marketing cost" hint="Ad spend plus the management fee." min={2000} max={20000} step={500} value={cost} onChange={setCost} format={usd} />
        </div>
        <div className="border-t border-[rgb(10_27_61/0.25)]">
          <Slider id="mk-gp" label="Gross profit per job" hint="What a typical job earns after its own costs." min={2000} max={50000} step={500} value={gp} onChange={setGp} format={usd} />
        </div>
        <div className="border-t border-[rgb(10_27_61/0.25)]">
          <Slider id="mk-show" label="Estimates that take place" hint="Of the estimates booked, how many actually happen." min={40} max={100} step={5} value={show} onChange={setShow} format={(n) => `${n}%`} />
        </div>
        <div className="border-y border-[rgb(10_27_61/0.25)]">
          <Slider id="mk-close" label="Estimates you close" hint="Your close rate. Your sales process decides this one." min={5} max={70} step={5} value={close} onChange={setClose} format={(n) => `${n}%`} />
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="bg-[var(--navy)] p-8 text-white sm:p-10" aria-live="polite">
          <p className="text-lg font-semibold text-white/80">To pay for itself, your marketing has to win</p>
          <p className="mt-2 font-[family-name:var(--font-sora)] text-[clamp(3.5rem,8vw,6rem)] font-bold leading-none tracking-[-0.05em] text-[var(--gold)]">
            {jobs < 10 ? jobs.toFixed(1) : Math.round(jobs)} {Math.round(jobs * 10) / 10 === 1 ? 'job' : 'jobs'}
          </p>
          <p className="mt-2 text-lg text-white/80">a month</p>
          <div className="mt-8 border-t border-white/30 pt-6">
            <p className="text-lg font-semibold text-white/80">At your show and close rates, that takes about</p>
            <p className="mt-2 font-[family-name:var(--font-sora)] text-[clamp(2.5rem,5.5vw,4rem)] font-bold leading-none tracking-[-0.05em]">
              {estimates < 10 ? estimates.toFixed(1) : Math.round(estimates)} booked estimates
            </p>
            <p className="mt-2 text-lg text-white/80">a month</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
          Arithmetic on the numbers you set, not a forecast. We do not guarantee volume, jobs or results.
        </p>
        <Link href={ctaHref} className="mk-btn mk-btn-navy mt-6">
          {ctaLabel}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">We will run this with your real numbers on the call.</p>
      </div>
    </div>
  );
}
