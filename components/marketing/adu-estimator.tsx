'use client';

import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  FINISH_LABELS,
  LOAN_DEFAULTS,
  LOAN_LIMITS,
  PRICING_IS_PLACEHOLDER,
  ROOMS,
  ROOM_FINISH_OPTIONS,
  ROOM_LABELS,
  SITE_QUESTIONS,
  UPGRADE_COST,
  type Bedrooms,
  type FinishLevel,
  type Room,
  type SiteAnswer,
  type SiteQuestionId,
} from '@/lib/adu/pricing-config';
import {
  DEFAULT_SELECTION,
  computeEstimate,
  formatUsd,
  monthlyPayment,
  normalizeBathrooms,
  resolveTier,
  returnEstimateFor,
  type AduSelection,
  type BuildKind,
} from '@/lib/adu/pricing';
import { ADU_LEAD_CAPTURE_ENABLED, validateContact } from '@/lib/adu/lead';

const BEDROOM_LABEL: Record<Bedrooms, string> = { studio: 'Studio', '1': '1 bed', '2': '2 bed', '3': '3 bed' };
const SITE_ANSWERS: { value: SiteAnswer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];

const card = 'rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/60 p-5 sm:p-6';
const legend = 'text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]';
const inputClass =
  'h-11 w-full rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-3 text-sm text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
/** Selected state is a border + tint (not colour alone) so it survives forced colours. */
const choice =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]';

function Choice({
  name,
  value,
  checked,
  onChange,
  children,
  note,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <label className={choice}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-[var(--hq-accent)]"
      />
      <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 text-[var(--hq-text)]">
        <span className="font-medium">{children}</span>
        {note ? <span className="text-xs text-[var(--hq-text-muted)]">{note}</span> : null}
      </span>
    </label>
  );
}

export function AduEstimator() {
  const uid = useId();
  const [sel, setSel] = useState<AduSelection>(DEFAULT_SELECTION);
  const est = useMemo(() => computeEstimate(sel), [sel]);
  const ret = returnEstimateFor(est.returnKey);

  const bathOptions = BATHROOM_OPTIONS[sel.bedrooms];
  const setKind = (kind: BuildKind) => setSel((s) => ({ ...s, kind }));
  const setBedrooms = (bedrooms: Bedrooms) =>
    setSel((s) => ({ ...s, bedrooms, bathrooms: normalizeBathrooms(bedrooms, s.bathrooms) }));
  const setFinish = (room: Room, level: FinishLevel) =>
    setSel((s) => ({ ...s, finishes: { ...s.finishes, [room]: level } }));
  const setSite = (id: SiteQuestionId, answer: SiteAnswer) =>
    setSel((s) => ({ ...s, site: { ...s.site, [id]: answer } }));

  const buildLabel =
    sel.kind === 'garage'
      ? 'Garage conversion'
      : `New detached ADU · ${BEDROOM_LABEL[sel.bedrooms]}${sel.bedrooms === '2' || sel.bedrooms === '3' ? ` / ${normalizeBathrooms(sel.bedrooms, sel.bathrooms)} bath` : ''}`;
  const tier = resolveTier(sel.kind, sel.bedrooms, sel.bathrooms);

  /* ---- Payment calculator: strings in state so a cleared field never breaks the maths. ---- */
  const [rate, setRate] = useState(String(LOAN_DEFAULTS.annualRatePercent));
  const [years, setYears] = useState(String(LOAN_DEFAULTS.termYears));
  const rateNum = rate.trim() === '' ? Number.NaN : Number(rate);
  const yearsNum = years.trim() === '' ? Number.NaN : Number(years);
  const payment = monthlyPayment(est.total, rateNum, yearsNum);

  /* ---- Lead capture ---- */
  const [lead, setLead] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false, website: '' });
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [leadNotice, setLeadNotice] = useState<string | null>(null);
  const onLeadSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateContact(lead);
    setLeadErrors(result.ok ? {} : result.errors);
    if (!result.ok) {
      setLeadNotice(null);
      return;
    }
    // Nothing is sent or stored until a destination is approved (lib/adu/lead.ts).
    if (!ADU_LEAD_CAPTURE_ENABLED) {
      setLeadNotice('Quote requests are not switched on yet. Your details were not sent or saved.');
    }
  };

  return (
    <div>
      {PRICING_IS_PLACEHOLDER ? (
        <div
          role="note"
          className="mb-8 flex gap-3 rounded-xl border border-[var(--hq-warn)]/60 bg-[var(--hq-warn)]/10 p-4 text-sm leading-6 text-[var(--hq-text)]"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--hq-warn)]" aria-hidden="true" />
          <p>
            <strong>Preview only.</strong> The prices on this page are placeholders, not HomeQuote prices. Do not show
            this page to customers until the real costs are in <code>lib/adu/pricing-config.ts</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* ---------------------------- Questions ---------------------------- */}
        <div className="space-y-6 lg:col-span-7">
          <fieldset className={card}>
            <legend className={cn(legend, 'px-1')}>1 · What are you building?</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Choice name={`${uid}-kind`} value="new" checked={sel.kind === 'new'} onChange={() => setKind('new')}>
                New detached ADU
              </Choice>
              <Choice name={`${uid}-kind`} value="garage" checked={sel.kind === 'garage'} onChange={() => setKind('garage')}>
                Garage conversion
              </Choice>
            </div>
          </fieldset>

          {sel.kind === 'new' ? (
            <fieldset className={card}>
              <legend className={cn(legend, 'px-1')}>2 · Size</legend>
              <div role="radiogroup" aria-label="Bedrooms" className="mt-4">
                <p className="mb-2 text-sm font-medium text-[var(--hq-text)]" id={`${uid}-beds`}>
                  Bedrooms
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {BEDROOM_OPTIONS.map((b) => (
                    <Choice
                      key={b}
                      name={`${uid}-beds`}
                      value={b}
                      checked={sel.bedrooms === b}
                      onChange={() => setBedrooms(b)}
                    >
                      {BEDROOM_LABEL[b]}
                    </Choice>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                {bathOptions.length > 1 ? (
                  <div role="radiogroup" aria-label="Bathrooms">
                    <p className="mb-2 text-sm font-medium text-[var(--hq-text)]">Bathrooms</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {bathOptions.map((n) => (
                        <Choice
                          key={n}
                          name={`${uid}-baths`}
                          value={String(n)}
                          checked={normalizeBathrooms(sel.bedrooms, sel.bathrooms) === n}
                          onChange={() => setSel((s) => ({ ...s, bathrooms: n }))}
                        >
                          {n} bath
                        </Choice>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--hq-text-muted)]">
                    Bathrooms: 1. For a studio or 1 bed the bathroom count does not change the price.
                  </p>
                )}
              </div>
            </fieldset>
          ) : (
            <div className={card}>
              <p className={legend}>2 · Size</p>
              <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
                A garage conversion has one fixed size, set by your existing garage. There is nothing to choose here.
              </p>
            </div>
          )}

          <fieldset className={card}>
            <legend className={cn(legend, 'px-1')}>3 · Finish level</legend>
            <div className="mt-4 space-y-6">
              {ROOMS.map((room) => (
                <div key={room} role="radiogroup" aria-label={`${ROOM_LABELS[room]} finish`}>
                  <p className="mb-2 text-sm font-medium text-[var(--hq-text)]">{ROOM_LABELS[room]}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {ROOM_FINISH_OPTIONS[room].map((level) => {
                      const cost = level === 'basic' ? 0 : (UPGRADE_COST[room][level]?.[tier] ?? 0);
                      return (
                        <Choice
                          key={level}
                          name={`${uid}-${room}`}
                          value={level}
                          checked={sel.finishes[room] === level}
                          onChange={() => setFinish(room, level)}
                          note={cost === 0 ? 'Included' : `+${formatUsd(cost)}`}
                        >
                          {FINISH_LABELS[level]}
                        </Choice>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className={card}>
            <legend className={cn(legend, 'px-1')}>4 · About your property</legend>
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              These change what a build costs. Any Yes or Not sure turns your number into a starting price that needs a
              site visit.
            </p>
            <div className="mt-4 divide-y divide-[var(--hq-line)]">
              {SITE_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  role="radiogroup"
                  aria-label={q.label}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-[var(--hq-text)]">{q.label}</p>
                  <div className="flex gap-2">
                    {SITE_ANSWERS.map((a) => (
                      <label
                        key={a.value}
                        className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--hq-line)] bg-[var(--hq-bg)] px-3 text-sm transition-colors hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)] sm:flex-none"
                      >
                        <input
                          type="radio"
                          name={`${uid}-site-${q.id}`}
                          value={a.value}
                          checked={sel.site[q.id] === a.value}
                          onChange={() => setSite(q.id, a.value)}
                          className="size-4 shrink-0 accent-[var(--hq-accent)]"
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

        <section className={card} aria-labelledby={`${uid}-pay`}>
          <h2 id={`${uid}-pay`} className={legend}>
            Monthly payment
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-rate`} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">
                Interest rate (%)
              </label>
              <input
                id={`${uid}-rate`}
                type="number"
                inputMode="decimal"
                min={0}
                max={LOAN_LIMITS.maxRatePercent}
                step="0.125"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-years`} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">
                Term (years)
              </label>
              <input
                id={`${uid}-years`}
                type="number"
                inputMode="numeric"
                min={LOAN_LIMITS.minTermYears}
                max={LOAN_LIMITS.maxTermYears}
                step="1"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--hq-text)]" aria-live="polite">
            {payment === null ? '—' : `${formatUsd(payment)}/mo`}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--hq-text-muted)]">
            {payment === null
              ? `Enter a rate from 0 to ${LOAN_LIMITS.maxRatePercent}% and a term from ${LOAN_LIMITS.minTermYears} to ${LOAN_LIMITS.maxTermYears} years.`
              : `Principal and interest on ${formatUsd(est.total)}, with nothing down. Taxes, insurance and lender fees are not included. Not a loan offer.`}
          </p>
        </section>

        <details className={cn(card, 'group')}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--hq-accent-bright)] [&::-webkit-details-marker]:hidden">
            <span className={legend}>Return estimate</span>
            <ChevronDown className="size-5 shrink-0 text-[var(--hq-text-muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
            Illustrative figures for a {sel.kind === 'garage' ? 'garage conversion' : BEDROOM_LABEL[sel.bedrooms].toLowerCase()} ADU. These are
            examples, not a guarantee of rent, value or return.
          </p>
          <dl className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] text-sm">
            {(
              [
                ['Rent per month', formatUsd(ret.rentPerMonth)],
                ['Value after build', formatUsd(ret.valueAfterBuild)],
                ['Profit', formatUsd(ret.profit)],
                ['ROI', `${ret.roiPercent}%`],
                ['Payback period', `${ret.paybackYears} years`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[var(--hq-text-muted)]">{label}</dt>
                <dd className="font-medium text-[var(--hq-text)]">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
        </div>

        {/* ----------------------------- Summary ----------------------------- */}
        <aside id="summary" aria-label="Your estimate" className="scroll-mt-24 lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <section className={card}>
              <p className={legend}>Your estimate</p>
              <p className="mt-2 text-sm text-[var(--hq-text-muted)]">
                {buildLabel}
                {est.approxSqft ? ` · about ${est.approxSqft.toLocaleString('en-US')} sq ft` : ' · existing garage footprint'}
              </p>

              <p className="mt-5 text-sm font-semibold text-[var(--hq-text)]">
                {est.isFirm ? 'Estimated price' : 'Starting price'}
              </p>
              <p
                className="mt-1 text-4xl font-semibold tracking-tight text-[var(--hq-text)] sm:text-5xl"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatUsd(est.total)}
              </p>

              <dl className="mt-5 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] text-sm">
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[var(--hq-text-muted)]">Base price</dt>
                  <dd className="font-medium text-[var(--hq-text)]">{formatUsd(est.basePrice)}</dd>
                </div>
                {est.items.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-[var(--hq-text-muted)]">{item.label}</dt>
                    <dd className="font-medium text-[var(--hq-text)]">+{formatUsd(item.amount)}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="font-semibold text-[var(--hq-text)]">{est.isFirm ? 'Estimated total' : 'Starting total'}</dt>
                  <dd className="font-semibold text-[var(--hq-text)]">{formatUsd(est.total)}</dd>
                </div>
              </dl>

              {est.status === 'site_visit' ? (
                <div role="status" className="mt-4 rounded-xl border border-[var(--hq-warn)]/60 bg-[var(--hq-warn)]/10 p-4 text-sm leading-6">
                  <p className="font-semibold text-[var(--hq-text)]">This is a starting price, not a firm estimate.</p>
                  <p className="mt-1 text-[var(--hq-text-muted)]">These items need a site visit before we can price them:</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[var(--hq-text)]">
                    {est.siteVisitItems.map((i) => (
                      <li key={i.id}>
                        {i.label} <span className="text-[var(--hq-text-muted)]">({i.answer === 'yes' ? 'Yes' : 'Not sure'})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : est.status === 'pending' ? (
                <p role="status" className="mt-4 rounded-xl border border-[var(--hq-line-strong)] p-4 text-sm leading-6 text-[var(--hq-text-muted)]">
                  Answer the {est.unansweredCount} remaining property question{est.unansweredCount === 1 ? '' : 's'} to see
                  whether a site visit is needed. Until then this is a starting price.
                </p>
              ) : (
                <p role="status" className="mt-4 text-sm leading-6 text-[var(--hq-text-muted)]">
                  You answered No to every property question, so no site-visit items were flagged.
                </p>
              )}

              <p className="mt-4 text-sm leading-6 text-[var(--hq-text-muted)]">
                <strong className="font-semibold text-[var(--hq-text)]">Not included:</strong> site work, and permit,
                plan-check and impact fees. These are quoted after an on-site assessment.
              </p>

              <a
                href="#quote"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--hq-cta)] px-6 text-sm font-semibold text-[var(--hq-cta-ink)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]"
              >
                Get my full quote
              </a>
            </section>
          </div>
        </aside>
      </div>

      {/* ------------------------------ Lead capture ------------------------------ */}
      <section id="quote" aria-labelledby={`${uid}-quote`} className={cn(card, 'mt-10 scroll-mt-24 lg:mt-12')}>
        <h2 id={`${uid}-quote`} className="text-2xl font-semibold tracking-tight text-[var(--hq-text)]">
          Get your full quote
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--hq-text-muted)]">
          Tell us how to reach you and we will follow up with a full quote, including site work and fees, after an on-site
          assessment.
        </p>
        <form onSubmit={onLeadSubmit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['firstName', 'First name', 'text', 'given-name'],
              ['lastName', 'Last name', 'text', 'family-name'],
              ['email', 'Email', 'email', 'email'],
              ['phone', 'Phone', 'tel', 'tel'],
            ] as const
          ).map(([key, label, type, auto]) => (
            <div key={key}>
              <label htmlFor={`${uid}-${key}`} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">
                {label}
              </label>
              <input
                id={`${uid}-${key}`}
                type={type}
                autoComplete={auto}
                value={lead[key]}
                onChange={(e) => setLead((l) => ({ ...l, [key]: e.target.value }))}
                aria-invalid={leadErrors[key] ? true : undefined}
                aria-describedby={leadErrors[key] ? `${uid}-${key}-err` : undefined}
                className={inputClass}
              />
              {leadErrors[key] ? (
                <p id={`${uid}-${key}-err`} className="mt-1.5 text-sm text-[var(--hq-bad)]">
                  {leadErrors[key]}
                </p>
              ) : null}
            </div>
          ))}
          {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor={`${uid}-website`}>Website</label>
            <input
              id={`${uid}-website`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={lead.website}
              onChange={(e) => setLead((l) => ({ ...l, website: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              <input
                type="checkbox"
                checked={lead.consent}
                onChange={(e) => setLead((l) => ({ ...l, consent: e.target.checked }))}
                aria-invalid={leadErrors.consent ? true : undefined}
                aria-describedby={leadErrors.consent ? `${uid}-consent-err` : undefined}
                className="mt-1.5 size-4 shrink-0 accent-[var(--hq-accent)]"
              />
              <span>
                I agree to be contacted by call, text or email about my ADU project. Consent is not a condition of
                purchase.
              </span>
            </label>
            {leadErrors.consent ? (
              <p id={`${uid}-consent-err`} className="mt-1.5 text-sm text-[var(--hq-bad)]">
                {leadErrors.consent}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--hq-cta)] px-7 text-sm font-semibold text-[var(--hq-cta-ink)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]"
            >
              Request my full quote
            </button>
            {leadNotice ? (
              <p role="status" className="mt-3 text-sm leading-6 text-[var(--hq-warn)]">
                {leadNotice}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      {/* Compact price bar for phones: the summary sits below the questions on small screens. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hq-line-strong)] bg-[var(--hq-bg)]/95 px-5 py-3 backdrop-blur lg:hidden">
        <a
          href="#summary"
          className="flex min-h-11 items-center justify-between gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]"
        >
          <span>
            <span className="block text-xs text-[var(--hq-text-muted)]">{est.isFirm ? 'Estimated price' : 'Starting price'}</span>
            <span className="block text-lg font-semibold text-[var(--hq-text)]">{formatUsd(est.total)}</span>
          </span>
          <span className="text-sm font-semibold text-[var(--hq-accent-bright)]">See breakdown ↓</span>
        </a>
      </div>
    </div>
  );
}
