'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { CONTACT, FAQS, ONBOARDING, PAY_PER_APPOINTMENT, PAY_PER_APPOINTMENT_TERMS, TIERS } from '@/lib/pitch/config';
import { cn } from '@/lib/utils';
import { useDeck, usd } from './deck-context';
import { FinePrint, Heading, Lead, Slide, Tick } from './kit';

// ---------------------------------------------------------------------------------------------
// 11. Pay per appointment
// ---------------------------------------------------------------------------------------------

export function PerAppointmentSlide() {
  return (
    <Slide tone="mist">
      <Heading>Prefer to pay per appointment?</Heading>
      <Lead>Buy qualified appointments one at a time instead of a monthly package.</Lead>
      <div className="mt-auto mb-[80px] grid grid-cols-[1fr_440px] gap-16">
        <ul className="divide-y divide-[var(--pd-line)] border-y border-[var(--pd-line)]">
          {PAY_PER_APPOINTMENT.map((p) => (
            <li key={p.service} className="flex items-baseline justify-between py-5">
              <span className="text-[24px] font-medium">{p.service}</span>
              <span className="pd-num font-display text-[30px] font-semibold tracking-tight">
                {p.price}
                <span className="ml-2 font-sans text-[16px] font-normal text-[var(--pd-slate)]">per appointment</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="self-start rounded-3xl bg-white p-8">
          <p className="pd-h3">Agreed in writing before launch</p>
          <ul className="mt-6 space-y-4">
            {PAY_PER_APPOINTMENT_TERMS.map((t) => (
              <li key={t} className="flex items-center gap-3 text-[18px]">
                <Tick />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <FinePrint>An alternative to the monthly packages, not included in them.</FinePrint>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 12. Onboarding
// ---------------------------------------------------------------------------------------------

export function OnboardingSlide() {
  return (
    <Slide tone="light">
      <Heading>From signed agreement to customer acquisition.</Heading>
      <ol className="relative my-auto grid grid-cols-5 gap-8">
        <span className="absolute left-[28px] right-[calc(20%-28px)] top-[27px] h-[3px] bg-[var(--pd-line)]" aria-hidden="true" />
        {ONBOARDING.map((s, i) => (
          <li key={s.title} className="relative">
            <span
              className={cn(
                'pd-num relative grid size-[58px] place-items-center rounded-full font-display text-[22px] font-bold',
                i === ONBOARDING.length - 1 ? 'bg-[var(--pd-navy)] text-white' : 'bg-[var(--pd-blue)] text-white'
              )}
            >
              {i + 1}
            </span>
            <p className="pd-h3 mt-7 text-[24px]">{s.title}</p>
            <p className="pd-small mt-3 text-[17px]">{s.detail}</p>
          </li>
        ))}
      </ol>
      <FinePrint>Launch timing depends on ad account access, approvals, integrations and creative.</FinePrint>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 13. Common questions
// ---------------------------------------------------------------------------------------------

export function FaqSlide() {
  const [open, setOpen] = useState<number | null>(0);
  const half = Math.ceil(FAQS.length / 2);
  const cols = [FAQS.slice(0, half), FAQS.slice(half)];
  return (
    <Slide tone="mist">
      <Heading>Common questions</Heading>
      <div className="mt-10 mb-[64px] grid grid-cols-2 gap-x-12">
        {cols.map((col, c) => (
          <ul key={c} className="divide-y divide-[var(--pd-line)] border-y border-[var(--pd-line)] self-start">
            {col.map((f, j) => {
              const i = c * half + j;
              const isOpen = open === i;
              return (
                <li key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-[18px] text-left text-[21px] font-semibold"
                  >
                    {f.q}
                    <Plus className={cn('size-5 shrink-0 text-[var(--pd-blue)] transition-transform', isOpen && 'rotate-45')} aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden text-[18px] leading-relaxed text-[var(--pd-slate)]"
                      >
                        <span className="block pb-5">{f.a}</span>
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 14. Choose a package
// ---------------------------------------------------------------------------------------------

export function ChooseSlide() {
  const { tier, setTier } = useDeck();
  return (
    <Slide tone="light">
      <Heading>Choose how you want to grow.</Heading>
      <div className="mt-14 grid grid-cols-[1fr_1.25fr_1fr] items-center gap-6">
        {TIERS.map((t) => {
          const featured = !!t.recommended;
          const selected = tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              aria-pressed={selected}
              className={cn(
                'relative rounded-3xl text-left transition-shadow',
                featured ? 'bg-[var(--pd-navy)] px-10 py-12 text-white shadow-[0_40px_80px_-30px_rgba(10,27,61,0.6)]' : 'border border-[var(--pd-line)] bg-white px-8 py-9',
                selected && 'ring-4 ring-[var(--pd-gold)] ring-offset-4'
              )}
            >
              {featured ? (
                <span className="absolute -top-4 left-10 rounded-full bg-[var(--pd-gold)] px-4 py-1.5 text-[14px] font-bold text-[var(--pd-navy)]">Recommended</span>
              ) : null}
              <p className={cn('pd-num font-display font-bold leading-none tracking-tight', featured ? 'text-[72px]' : 'text-[52px]')}>{usd(t.price)}</p>
              <p className={cn('mt-3 font-semibold', featured ? 'text-[26px]' : 'text-[22px]')}>{t.name}</p>
              <p className={cn('mt-2 text-[16px] leading-snug', featured ? 'text-white/75' : 'text-[var(--pd-slate)]')}>{t.positioning}</p>
            </button>
          );
        })}
      </div>
      <p className="pd-h3 my-auto max-w-[1100px] text-[40px] leading-tight text-[var(--pd-blue)]">
        Which level of support makes the most sense for your business right now?
      </p>
      <FinePrint>Monthly HomeQuote fees. Ad spend is paid separately, directly to Meta.</FinePrint>
    </Slide>
  );
}

// ---------------------------------------------------------------------------------------------
// 15. Closing
// ---------------------------------------------------------------------------------------------

export function CloseSlide() {
  return (
    <Slide tone="navy" logo={false} bleed>
      <div className="absolute inset-y-0 left-0 w-[640px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/general-contractors/open-kitchen-marble-island.webp" alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-[var(--pd-navy)] via-[var(--pd-navy)]/30 to-transparent" />
      </div>
      <div className="relative z-10 ml-[700px] flex h-full flex-col py-[88px] pr-[104px]">
        <BrandLogo tone="reversed" className="h-[46px] w-auto self-start" />
        <div className="my-auto">
          <h2 className="pd-display text-[68px] text-white">You focus on closing jobs. We’ll help you build the pipeline.</h2>
          <p className="mt-10 font-display text-[34px] font-semibold text-[var(--pd-gold)]">Let’s build your growth plan.</p>
        </div>
        <p className="text-[22px] text-white/80">{CONTACT.site}</p>
      </div>
    </Slide>
  );
}
