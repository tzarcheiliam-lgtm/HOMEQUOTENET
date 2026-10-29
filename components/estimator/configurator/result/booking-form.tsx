'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Check, ExternalLink, Loader2, Phone } from 'lucide-react';
import { telHref } from '@/components/estimator/shell/facts';
import {
  estimatorConsentText,
  leadFieldErrors,
  newSubmissionId,
  submitEstimatorLead,
  type EstimatorLeadRequest,
} from '@/lib/estimator/lead-client';
import type { ConfiguratorBookingProps } from '../result-types';
import {
  bookingRequest,
  calendarFrameUrl,
  emptyBookingFields,
  firstInvalidField,
  generalErrors,
  tidyPhone,
  type BookingFields,
} from './booking-state';

/**
 * The configurator's booking step: contact details (first and last name,
 * phone, email, ZIP, "do you own the home", the funnel consent wording and the
 * optional measurement box, exactly as the old flow), then the lead POST with
 * the design, then the free consultation calendar.
 *
 * Built so a first submit goes through: specific messages per field, focus on
 * the first one to fix, everything typed is kept, one automatic retry on a
 * network error (same submission id, so never two leads), the button locked
 * while sending, and a changed consent wording shown in place.
 */

type Success = { qualified: boolean; calendarUrl?: string; firstName: string };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Page URL (UTMs for attribution) and, only with measurement allowed, the Meta browser ids. */
function readTracking(measurement: boolean): EstimatorLeadRequest['tracking'] {
  try {
    const pageUrl = window.location.href.slice(0, 4000);
    if (!measurement) return { pageUrl };
    const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
    return { fbp: cookie('_fbp'), fbc: cookie('_fbc'), eventId: newSubmissionId(), pageUrl };
  } catch {
    return undefined;
  }
}

const input =
  'block h-12 w-full rounded-xl border bg-white px-3.5 text-[16px] text-[#111] placeholder:text-[#9a948a] transition-colors duration-150 focus:outline-none focus-visible:border-[var(--cfg-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cfg-accent-line)] motion-reduce:transition-none';
const okBorder = 'border-[#d9d4ca] hover:border-[#bdb7ab]';
const badBorder = 'border-[#b42318]';

export function ConfiguratorBooking({ slug, contractor, selection, answers, embedded, onSent }: ConfiguratorBookingProps) {
  const uid = useId();
  const [fields, setFields] = useState<BookingFields>(emptyBookingFields);
  // Off until the homeowner ticks it (an opt-in, never pre-ticked).
  const [measurement, setMeasurement] = useState(false);
  const [consentWording, setConsentWording] = useState(() => estimatorConsentText(contractor.contractorName));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Success | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const sendingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  // The form's height when it turns into the thank-you, kept as a minimum so nothing below jumps.
  const [keepHeight, setKeepHeight] = useState<number | null>(null);
  // One id per design + details: a retry (ours or theirs) of the same submission is answered once.
  const submission = useRef<{ id: string; body: string } | null>(null);

  useEffect(() => {
    if (!focusTick) return;
    const key = firstInvalidField(errors);
    const el = key ? formRef.current?.querySelector<HTMLElement>(`[data-field="${key}"]`) : formRef.current?.querySelector<HTMLElement>('[data-form-error]');
    el?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only after a submit attempt
  }, [focusTick]);

  useEffect(() => {
    if (!done) return;
    doneRef.current?.focus({ preventScroll: true });
    doneRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [done]);

  const set = <K extends keyof BookingFields>(key: K, value: BookingFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sendingRef.current) return;
    const local = leadFieldErrors(fields);
    if (Object.keys(local).length) {
      setErrors(local);
      setFocusTick((n) => n + 1);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setErrors({});
    const draft = bookingRequest({ answers, selection, fields, consentText: consentWording, measurement });
    const body = JSON.stringify(draft);
    if (!submission.current || submission.current.body !== body) submission.current = { id: newSubmissionId(), body };
    const res = await submitEstimatorLead(slug, { ...draft, tracking: readTracking(measurement), submissionId: submission.current.id });
    sendingRef.current = false;
    setSending(false);
    if (res.ok) {
      setKeepHeight(formRef.current?.offsetHeight ?? null);
      setDone({ qualified: res.qualified, calendarUrl: res.calendarUrl, firstName: fields.firstName.trim() });
      onSent?.();
      return;
    }
    if (res.consentText) {
      // The wording changed since the page loaded: show the new one and ask for the box again.
      setConsentWording(res.consentText);
      setFields((f) => ({ ...f, consent: false }));
    }
    setErrors(res.errors);
    setFocusTick((n) => n + 1);
  };

  if (done) {
    return (
      <div style={keepHeight ? { minHeight: keepHeight } : undefined}>
        <BookingDone done={done} contractor={contractor} embedded={embedded} headingRef={doneRef} />
      </div>
    );
  }

  const general = generalErrors(errors);
  const fieldCount = Object.keys(errors).length - general.length;
  const err = (key: string) => errors[key];
  const describedBy = (key: string, hint?: boolean) => [hint ? `${uid}-${key}-h` : '', err(key) ? `${uid}-${key}-e` : ''].filter(Boolean).join(' ') || undefined;

  const text = (key: 'firstName' | 'lastName' | 'phone' | 'email' | 'zip', label: string, extra: Record<string, string | number>, hint?: string) => (
    <div>
      <label htmlFor={`${uid}-${key}`} className="mb-1.5 block text-[13.5px] font-medium text-[#111]">
        {label}
      </label>
      <input
        id={`${uid}-${key}`}
        data-field={key}
        name={key}
        value={fields[key]}
        onChange={(e) => set(key, e.target.value)}
        // Only when tidying changes it: a no-op set would clear the field's error on blur, shift the layout
        // under the pointer and swallow the click on "Book my free consultation".
        onBlur={
          key === 'phone'
            ? () => {
                const tidy = tidyPhone(fields.phone);
                if (tidy !== fields.phone) set('phone', tidy);
              }
            : undefined
        }
        aria-invalid={err(key) ? true : undefined}
        aria-describedby={describedBy(key, Boolean(hint))}
        className={`${input} ${err(key) ? badBorder : okBorder}`}
        {...extra}
      />
      {hint ? (
        <p id={`${uid}-${key}-h`} className="mt-1 text-[12px] text-[#6d675d]">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${uid}-${key}-e`}>{err(key)}</FieldError>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-describedby={`${uid}-intro`} className="space-y-4" data-booking-form="">
      <p id={`${uid}-intro`} className="sr-only">
        Your design and estimate are sent with your details.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {text('firstName', 'First name', { type: 'text', autoComplete: 'given-name', maxLength: 80 })}
        {text('lastName', 'Last name', { type: 'text', autoComplete: 'family-name', maxLength: 80 })}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {text('phone', 'Mobile phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '(818) 555-0142', maxLength: 30 })}
        {text('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'you@example.com', maxLength: 254, spellCheck: 'false' })}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {text('zip', 'Property ZIP code', { type: 'text', autoComplete: 'postal-code', inputMode: 'numeric', placeholder: '91302', maxLength: 10 })}
        <fieldset aria-describedby={err('homeowner') ? `${uid}-homeowner-e` : undefined}>
          <legend className="mb-1.5 block text-[13.5px] font-medium text-[#111]">Do you own the home?</legend>
          <div className={`grid h-12 grid-cols-2 gap-1 rounded-xl border bg-white p-1 ${err('homeowner') ? badBorder : 'border-[#d9d4ca]'}`}>
            {(
              [
                ['yes', 'Yes'],
                ['no', 'No'],
              ] as const
            ).map(([value, label], i) => (
              <label
                key={value}
                className={`relative flex cursor-pointer items-center justify-center rounded-lg text-[14.5px] font-medium transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--cfg-accent)] motion-reduce:transition-none ${
                  fields.homeowner === value ? 'bg-[#111] text-white' : 'text-[#3d3a34] hover:bg-[#f5f3ef]'
                }`}
              >
                <input
                  type="radio"
                  name={`${uid}-homeowner`}
                  value={value}
                  checked={fields.homeowner === value}
                  onChange={() => set('homeowner', value)}
                  data-field={i === 0 ? 'homeowner' : undefined}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError id={`${uid}-homeowner-e`}>{err('homeowner')}</FieldError>
        </fieldset>
      </div>

      {/* Honeypot: hidden, inert, and named so browser autofill leaves it alone. */}
      <div hidden inert aria-hidden="true" className="hidden">
        <label>
          Leave this empty
          <input type="text" name="contact_url_2" tabIndex={-1} autoComplete="off" value={fields.website} onChange={(e) => set('website', e.target.value)} />
        </label>
      </div>

      <div className="pt-1">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-[19px] text-[#4a463f]">
          <input
            type="checkbox"
            data-field="consent"
            checked={fields.consent}
            onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={err('consent') ? true : undefined}
            aria-describedby={err('consent') ? `${uid}-consent-e` : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-[var(--cfg-accent)]"
          />
          <span>
            {consentWording}{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#111]">
              Privacy policy
            </a>
            {' · '}
            <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#111]">
              Terms
            </a>
          </span>
        </label>
        <FieldError id={`${uid}-consent-e`} className="pl-[30px]">
          {err('consent')}
        </FieldError>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-[12px] leading-[18px] text-[#6d675d]">
          <input
            type="checkbox"
            checked={measurement}
            onChange={(e) => setMeasurement(e.target.checked)}
            className="mt-px size-4 shrink-0 accent-[var(--cfg-accent)]"
          />
          <span>Allow optional advertising measurement</span>
        </label>
      </div>

      <div role="alert" aria-live="assertive" className="empty:hidden">
        {fieldCount > 0 && general.length === 0 ? (
          <p className="text-[13.5px] font-medium text-[#b42318]">
            {fieldCount === 1 ? 'One thing to fix above.' : `${fieldCount} things to fix above.`}
          </p>
        ) : null}
        {general.map((message) => (
          <p key={message} data-form-error="" tabIndex={-1} className="rounded-xl border border-[#f1c9c4] bg-[#fdf3f2] px-3.5 py-3 text-[13.5px] leading-5 text-[#8a1c12] outline-none">
            {message}
          </p>
        ))}
      </div>

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending || undefined}
        className="inline-flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[var(--cfg-accent)] px-6 text-[16px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] disabled:cursor-wait motion-reduce:transition-none"
      >
        {sending ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <CalendarDays aria-hidden="true" className="size-4" />}
        {sending ? 'Sending your design…' : 'Book my free consultation'}
      </button>
      <p className="text-center text-[12.5px] text-[#6d675d]">Free and no obligation. We&rsquo;ll call you within one business day.</p>
    </form>
  );
}

function FieldError({ id, children, className = '' }: { id: string; children?: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p id={id} className={`mt-1.5 text-[12.5px] font-medium leading-[18px] text-[#b42318] ${className}`}>
      {children}
    </p>
  );
}

/** After a saved lead: thanks, the calendar (inline on our own page, a button in the iframe), and the phone. */
function BookingDone({
  done,
  contractor,
  embedded,
  headingRef,
}: {
  done: Success;
  contractor: ConfiguratorBookingProps['contractor'];
  embedded?: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => setHost(window.location.hostname), []);
  const frame = !embedded && done.calendarUrl && host ? calendarFrameUrl(done.calendarUrl, host) : null;
  const tel = telHref(contractor.phone);
  return (
    <div data-booking-done="">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-white" aria-hidden="true">
          <Check className="size-4" strokeWidth={2.6} />
        </span>
        <div>
          <h3 ref={headingRef} tabIndex={-1} className="text-[19px] font-semibold leading-tight text-[#111] outline-none">
            {done.firstName ? `Thanks, ${done.firstName}.` : 'Thank you.'} Your design is with {contractor.contractorName}.
          </h3>
          <p className="mt-1.5 text-[14.5px] leading-[22px] text-[#4a463f]">
            We&rsquo;ll call you within one business day
            {done.qualified && done.calendarUrl ? ', or pick a time for your free on-site consultation now.' : ' to talk through your design and next steps.'}
          </p>
        </div>
      </div>

      {done.qualified && done.calendarUrl ? (
        <div className="mt-5">
          {frame ? (
            <div className="overflow-hidden rounded-xl border border-[#e4e0d8] bg-white">
              <iframe
                title={`Book a free consultation with ${contractor.contractorName}`}
                src={frame}
                className="block h-[680px] w-full"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            </div>
          ) : null}
          <a
            href={done.calendarUrl}
            target="_blank"
            rel="noopener"
            className={`inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl px-6 text-[16px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none ${
              frame
                ? 'mt-3 border border-[#d9d4ca] bg-white text-[#111] hover:bg-[#f5f3ef]'
                : 'bg-[var(--cfg-accent)] text-white hover:bg-[var(--cfg-accent-hover)]'
            }`}
          >
            {frame ? <ExternalLink aria-hidden="true" className="size-4" /> : <CalendarDays aria-hidden="true" className="size-4" />}
            {frame ? 'Open the calendar in a new tab' : 'Pick a time'}
          </a>
        </div>
      ) : null}

      {tel ? (
        <p className="mt-4 text-[13.5px] text-[#4a463f]">
          Rather talk now?{' '}
          <a href={tel} className="inline-flex items-center gap-1 font-medium text-[#111] underline underline-offset-4">
            <Phone aria-hidden="true" className="size-3.5" />
            <span className="tabular-nums">{contractor.phone}</span>
          </a>
        </p>
      ) : null}
    </div>
  );
}
