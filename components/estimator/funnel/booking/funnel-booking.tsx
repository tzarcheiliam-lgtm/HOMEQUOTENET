'use client';

import { useEffect, useId, useState } from 'react';
import { CalendarCheck, Check, ExternalLink, Phone } from 'lucide-react';
import { telHref } from '@/components/estimator/shell/facts';
import type { FunnelBookingScreenProps } from '../screens';
import { bookingFrameUrl, priceEyebrow, priceRange, readCalendlyMessage } from './state';

/**
 * The funnel's last screen: "Book your free on-site estimate".
 * 1. The price card: the picks on one line, the ballpark range from the server,
 *    one sentence of ballpark wording (plus "example prices" while prices are unconfirmed) and
 *    "Financing available" with the lender disclosure behind "See details".
 *    Never a monthly payment.
 * 2. The booking card: the contractor's Calendly inline (name / email
 *    prefilled by the server), sized to its content, with a button that opens
 *    it in a new tab (also the only option inside the /embed iframe). An
 *    unqualified lead (outside the service area) is told we will call, or,
 *    when nothing was saved (result.saved false), to call us.
 * 3. "Prefer to talk now? Call (818) 643-6888".
 *
 * Draws only its content column from the heading down (props: ../screens.ts);
 * the shell draws the chrome and moves focus to the heading (headingId).
 * Inside the /embed iframe there is no nested calendar iframe, a button instead.
 */

const FRAME_START = 700;

export function FunnelBookingScreen({ spec, selection, contractor, result, embedded, headingId }: FunnelBookingScreenProps) {
  const uid = useId();
  const step = spec.bookingStep;
  const firstName = result.contact.firstName;
  const [details, setDetails] = useState(false);
  const [host, setHost] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(FRAME_START);
  const [booked, setBooked] = useState(false);

  const range = priceRange(result.estimate);
  const calendarUrl = result.qualified ? result.calendarUrl : undefined;
  const frame = !embedded && calendarUrl && host ? bookingFrameUrl(calendarUrl, host) : null;
  const tel = telHref(contractor.phone);
  const examplePrices = contractor.pricesConfirmed === false;

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  useEffect(() => {
    if (!calendarUrl) return;
    const onMessage = (e: MessageEvent) => {
      const msg = readCalendlyMessage(e.origin, e.data);
      if (!msg) return;
      if (msg.kind === 'height') setFrameHeight(msg.height);
      else setBooked(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [calendarUrl]);

  return (
    <div className="w-full" data-funnel-booking="">
      <h1 id={headingId} tabIndex={-1} className="fn-h1 text-balance outline-none">
        {step.headline}
      </h1>

      {/* Price card */}
      <section aria-labelledby={`${uid}-price`} className="mt-6 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" data-funnel-price="">
        <p id={`${uid}-price`} className="text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[var(--fn-muted)]">
          {priceEyebrow(spec, selection)}
        </p>
        <p className="mt-2.5 text-[clamp(26px,8vw,34px)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--fn-ink)] tabular-nums [text-wrap:balance]">
          {range ?? 'Priced at your free on-site visit'}
        </p>
        <p className="mt-2.5 text-[15px] leading-[22px] text-[var(--fn-text)] [text-wrap:pretty]">
          {step.priceNote}
          {/* While prices are unconfirmed: one quiet clause in the same paragraph, not a second notice. */}
          {examplePrices ? <span className="text-[var(--fn-muted)]"> Example prices, not yet confirmed.</span> : null}
        </p>
        {step.financingLabel ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="inline-flex items-center gap-2 text-[15px] text-[var(--fn-ink)]">
                <Check aria-hidden="true" className="size-4 text-[color:var(--fn-blue)]" strokeWidth={2.4} />
                {step.financingLabel}
              </p>
              {contractor.financingDisclosure ? (
                <button
                  type="button"
                  aria-expanded={details}
                  aria-controls={`${uid}-fin`}
                  onClick={() => setDetails((d) => !d)}
                  className="relative text-[15px] font-medium text-[color:var(--fn-blue-ink)] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fn-blue)]"
                >
                  {details ? 'Hide details' : 'See details'}
                </button>
              ) : null}
            </div>
            {contractor.financingDisclosure ? (
              <p
                id={`${uid}-fin`}
                hidden={!details}
                className="mt-2.5 text-[12.5px] leading-[18px] text-[var(--fn-muted)] motion-safe:animate-[funnel-fade_160ms_ease-out]"
              >
                {contractor.financingDisclosure}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Booking card */}
      <section aria-labelledby={`${uid}-book`} className="mt-4 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" data-funnel-calendar="">
        {booked ? (
          <div className="flex items-start gap-3 motion-safe:animate-[funnel-fade_180ms_ease-out]" role="status">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--fn-blue)] text-white" aria-hidden="true">
              <CalendarCheck className="size-4" strokeWidth={2.4} />
            </span>
            <div>
              <h2 id={`${uid}-book`} className="text-[19px] font-medium leading-tight text-[var(--fn-ink)]">
                You&rsquo;re booked{firstName ? `, ${firstName}` : ''}.
              </h2>
              <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]">
                Calendly has emailed you the details. {contractor.contractorName} will see you then.
              </p>
            </div>
          </div>
        ) : calendarUrl ? (
          <>
            <h2 id={`${uid}-book`} className="text-[17px] font-medium leading-[24px] text-[var(--fn-ink)] [text-wrap:pretty]">
              {step.bookingTitle}
            </h2>
            {embedded ? null : (
              // Height is reserved before the frame exists (no layout shift), then follows Calendly's own height;
              // Calendly draws its own loading state inside.
              <div className="relative -mx-5 mt-3 overflow-hidden" style={{ height: frameHeight }}>
                {frame ? (
                  <iframe
                    title={`Pick a time with ${contractor.contractorName}`}
                    src={frame}
                    className="relative block size-full border-0"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : null}
              </div>
            )}
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener"
              className={
                embedded
                  ? 'fn-btn mt-3 h-12 w-full px-4 text-[16px]'
                  : 'mt-3 inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[16px] font-medium text-[var(--fn-ink)] shadow-[inset_0_0_0_1px_var(--fn-line)] transition-[background-color,scale] duration-150 ease-out active:scale-[0.985] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-focus)] motion-reduce:transition-none [@media(hover:hover)]:hover:bg-[var(--fn-bg)]'
              }
            >
              {embedded ? null : <ExternalLink aria-hidden="true" className="size-4" />}
              {embedded ? 'Pick a time' : 'Open the calendar in a new tab'}
            </a>
          </>
        ) : result.saved === false ? (
          <div>
            <h2 id={`${uid}-book`} className="text-[19px] font-medium leading-tight text-[var(--fn-ink)]">
              {firstName ? `Thanks, ${firstName}.` : 'Thank you.'} We can&rsquo;t book this one online.
            </h2>
            <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]">
              It may be outside the area we serve. Give {contractor.contractorName} a call and we&rsquo;ll tell you what we can do.
            </p>
          </div>
        ) : (
          <div>
            <h2 id={`${uid}-book`} className="text-[19px] font-medium leading-tight text-[var(--fn-ink)]">
              {firstName ? `Thanks, ${firstName}.` : 'Thank you.'} Your design is with {contractor.contractorName}.
            </h2>
            <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]">We&rsquo;ll call you within one business day to talk through it and set up your free on-site estimate.</p>
          </div>
        )}
      </section>

      {tel && step.callPrompt ? (
        <p className="mt-5 text-[15px] leading-[22px] text-[var(--fn-text)]">
          {step.callPrompt}{' '}
          <a href={tel} className="inline-flex items-center gap-1 font-medium text-[color:var(--fn-blue)] underline-offset-4 [@media(hover:hover)]:hover:underline">
            <Phone aria-hidden="true" className="size-3.5" />
            <span className="tabular-nums">{contractor.phone}</span>
          </a>
        </p>
      ) : null}

      <style>{'@keyframes funnel-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'}</style>
    </div>
  );
}
