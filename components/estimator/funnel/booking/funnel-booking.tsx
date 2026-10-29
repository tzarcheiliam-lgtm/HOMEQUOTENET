'use client';

import { useEffect, useId, useState } from 'react';
import { CalendarCheck, Check, ExternalLink, Phone } from 'lucide-react';
import { telHref } from '@/components/estimator/shell/facts';
import { BookingFlow } from '@/components/booking/booking-flow';
import { exampleFinancingDisclosure, exampleFinancingLine, syncDemoFinancing } from '@/lib/estimator/demo-financing';
import type { FunnelBookingScreenProps } from '../screens';
import { bookingFrameUrl, plainBookingTitle, priceEyebrow, priceRange, readCalendlyMessage } from './state';
import { ShareDesignButton } from './share-design';
import { shareDesignPath, shareMessage } from '@/lib/estimator/share';

/**
 * The funnel's last screen: "Book your free call".
 * 1. The price card: the picks on one line, the ballpark range from the server,
 *    one sentence of ballpark wording (plus "example prices" while prices are unconfirmed) and
 *    "Financing available" with the lender disclosure behind "See details".
 *    No monthly payment, except DEMO ONLY with ?demo=financing (kept for the
 *    tab, lib/estimator/demo-financing.ts): "or from $649/mo*" from the low end
 *    of the range with the spec's exampleFinancing terms, a "Demo" pill and the
 *    example fine print behind "See details".
 * 2. The booking card: a quick free call (10 minutes; Liam calls) on HomeQuote's own calendar
 *    (<BookingFlow>, the contractor's calendar, or the HomeQuote team's for a
 *    network funnel), booked and recorded server-side with the ticket the lead
 *    route returned; confirmation, reminders and the reschedule / cancel link
 *    go out automatically. Fallback (an estimator still set to an external
 *    link): the Calendly inline, sized to its content, with a button that
 *    opens it in a new tab (the only option inside the /embed iframe). An
 *    unqualified lead outside the service area is told we will call; a renter
 *    ("No" to "Are you the homeowner?") that the funnel saved for review is told the project needs
 *    a personal review (the funnel's own review wording, no promised call);
 *    when nothing was saved (result.saved false), to call us.
 * 3. "Prefer to talk now? Call (818) 643-6888".
 *
 * Draws only its content column from the heading down (props: ../screens.ts);
 * the shell draws the chrome and moves focus to the heading (headingId).
 * Inside the /embed iframe there is no nested calendar iframe, a button instead.
 */

const FRAME_START = 700;

/** "or from $649/mo*" -> the words, the amount (set a touch heavier) and the asterisk. */
function monthlyParts(line: string): { before: string; amount: string; after: string } {
  const m = /^(.*?)(\$[\d,]+\/mo)(.*)$/.exec(line);
  return m ? { before: m[1], amount: m[2], after: m[3] } : { before: line, amount: '', after: '' };
}

export function FunnelBookingScreen({
  slug, spec, selection, contractor, template, result, embedded, headingId, initialDemoFinancing = false,
}: FunnelBookingScreenProps & {
  /** Previews / tests: start with the demo payment on (the browser still reads ?demo=financing). */
  initialDemoFinancing?: boolean;
}) {
  const uid = useId();
  const step = spec.bookingStep;
  const firstName = result.contact.firstName;
  const [details, setDetails] = useState(false);
  const [host, setHost] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(FRAME_START);
  const [booked, setBooked] = useState(false);
  // Read after mount only: the server render (and every visitor without the flag) never shows a payment.
  const [demoFinancing, setDemoFinancing] = useState(initialDemoFinancing);
  useEffect(() => {
    const on = syncDemoFinancing(window.location.search);
    setDemoFinancing((was) => was || on);
  }, []);

  const range = priceRange(result.estimate);
  // HomeQuote calendar (the lead route's booking ticket) first; an external link only without one.
  const ticket = result.qualified ? result.bookingTicket : undefined;
  const calendarUrl = result.qualified && !ticket ? result.calendarUrl : undefined;
  // "No" (not the homeowner): the funnel's homeowner rule did not pass (never a booking, never a promised call).
  const renter = !result.qualified && result.homeowner === 'no';
  const frame = !embedded && calendarUrl && host ? bookingFrameUrl(calendarUrl, host) : null;
  const tel = telHref(contractor.phone);
  const examplePrices = contractor.pricesConfirmed === false;
  const example = demoFinancing && step.exampleFinancing && range ? step.exampleFinancing : null;
  const monthly = example ? exampleFinancingLine(result.estimate.low, example) : null;
  // "Send my design to my partner": the signed link from the lead route (shows the ballpark), else the picks alone.
  const shareUrl = result.shareUrl ?? shareDesignPath(slug, spec, selection);
  const share = shareMessage(contractor.contractorName, template.trade === 'bathroom' ? 'bathroom' : 'pool');

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
        {renter ? 'Your ballpark estimate' : step.headline}
      </h1>

      {/* Price card */}
      <section aria-labelledby={`${uid}-price`} className="mt-6 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" data-funnel-price="">
        <p id={`${uid}-price`} className="text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[var(--fn-muted)]">
          {priceEyebrow(spec, selection)}
        </p>
        <p className="mt-2.5 text-[clamp(26px,7.6vw,31px)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--fn-ink)] tabular-nums [text-wrap:balance]">
          {range ?? 'Priced at your free on-site visit'}
        </p>
        {monthly && example ? (
          // DEMO ONLY, right under the range: an example payment, never an offer (the fine print is behind "See details").
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5" data-funnel-demo-financing="">
            <p className="text-[16.5px] leading-[24px] text-[var(--fn-text)] tabular-nums">
              {monthlyParts(monthly).before}
              <span className="font-medium text-[var(--fn-ink)]">{monthlyParts(monthly).amount}</span>
              {monthlyParts(monthly).after}
            </p>
            <span className="inline-flex h-[19px] items-center rounded-full bg-[#fff4e0] px-[7px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.07em] text-[#8a4b00] shadow-[inset_0_0_0_1px_rgba(138,75,0,0.16)]">
              Demo
            </span>
            <button
              type="button"
              aria-expanded={details}
              aria-controls={`${uid}-fin`}
              onClick={() => setDetails((d) => !d)}
              className="relative ml-auto text-[15px] font-medium text-[color:var(--fn-blue-ink)] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fn-blue)]"
            >
              {details ? 'Hide details' : 'See details'}
            </button>
          </div>
        ) : null}
        <p className="mt-2.5 text-[14.5px] leading-[21px] text-[var(--fn-text)] [text-wrap:pretty]">
          {step.priceNote}
          {/* While prices are unconfirmed: one quiet clause in the same paragraph, not a second notice. */}
          {examplePrices ? <span className="text-[var(--fn-muted)]"> Example prices, not yet confirmed.</span> : null}
        </p>
        {monthly && example ? (
          <div id={`${uid}-fin`} hidden={!details} className="mt-3 space-y-2 rounded-[10px] bg-[var(--fn-bg,#f6f5f2)] px-3.5 py-3 text-[12.5px] leading-[18px] text-[var(--fn-muted)] motion-safe:animate-[funnel-fade_160ms_ease-out]">
            <p>{exampleFinancingDisclosure(example)}</p>
            {contractor.financingDisclosure ? <p>{contractor.financingDisclosure}</p> : null}
          </div>
        ) : step.financingLabel ? (
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

      {result.saved === false ? null : <ShareDesignButton url={shareUrl} title={share.title} text={share.text} />}

      {/* Booking card */}
      <section
        aria-labelledby={ticket ? undefined : `${uid}-book`}
        aria-label={ticket ? 'Book your call' : undefined}
        className="mt-4 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
        data-funnel-calendar={ticket ? 'homequote' : ''}
      >
        {ticket ? (
          // Loads the open times, books under the calendar lock and shows "You're booked" (also after a refresh).
          // The page title already says "Book your free call": the card opens with one light sentence, then the
          // times (as on the Buildoly screen), so the first times show without scrolling on small phones.
          <BookingFlow grant={ticket} heading={null} intro={step.bookingTitle} headingLevel={2} />
        ) : booked ? (
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
              {plainBookingTitle(step.bookingTitle)}
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
              {renter
                ? `We book online visits with homeowners. Your details were not saved; give ${contractor.contractorName} a call and we’ll tell you what we can do.`
                : `It may be outside the area we serve. Give ${contractor.contractorName} a call and we’ll tell you what we can do.`}
            </p>
          </div>
        ) : renter ? (
          // Saved for review (the funnel's unqualifiedAction 'review'): no booking, no promised call.
          <div data-funnel-review="">
            <h2 id={`${uid}-book`} className="text-[19px] font-medium leading-tight text-[var(--fn-ink)]">
              {firstName ? `Thanks, ${firstName}.` : 'Thank you.'} Your project needs a personal review.
            </h2>
            <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]">
              We book on-site estimates online with homeowners. Your details are saved, and the {contractor.contractorName} team will review them
              before we can confirm a fit.
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
