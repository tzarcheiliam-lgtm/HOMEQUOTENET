'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { tidyPhone } from '@/components/estimator/configurator/result/booking-state';
import { estimatorConsentText, funnelContactErrors, newSubmissionId, submitEstimatorLead, type EstimatorLeadRequest } from '@/lib/estimator/lead-client';
import type { FunnelContactScreenProps } from '../screens';
import {
  clearContactDraft,
  emptyFunnelFields,
  firstInvalid,
  formErrors,
  funnelLeadRequest,
  loadContactDraft,
  placeErrors,
  saveContactDraft,
  type FunnelContactFields,
} from './state';

/**
 * The funnel's contact step: "Your estimate is ready. / Where should we send it?"
 * Buildoly's shape: four fields (name, email, phone, ZIP: it gates the service
 * area), then the button, with the consent wording in small print right under
 * it: tapping the button is the agreement (agree-on-submit; the lead route
 * still checks the exact wording). "Do you own this home?" is asked only when
 * the spec says so (contactStep.askHomeowner). Then the lead POST with the picks.
 * The server prices the picks and answers with the estimate; onSuccess hands it
 * to the shell (onDone), which stores it and opens the booking screen.
 *
 * Built so the first submit goes through: one specific message at a time (the
 * first field to fix gets it and the focus; a field is also checked when left),
 * Return moves to the next field and only the last one submits, everything typed is kept (and survives a reload), one
 * automatic retry on a network error with the same submission id (never two
 * leads), the button locked while sending, a changed consent wording shown in place.
 *
 * Draws only its content column from the heading down (props: ../screens.ts);
 * the shell draws "LAST STEP", the back arrow, the gutters and the footer, and
 * moves focus to the heading (headingId).
 */

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

const fieldBase =
  'peer block h-14 w-full rounded-[8px] border bg-white px-[15px] pb-[7px] pt-[23px] text-[16px] leading-[22px] text-[var(--fn-ink)] outline-none transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none';
const fieldOk = 'border-[var(--fn-line)] focus:border-[var(--fn-blue)] focus:shadow-[0_0_0_1px_var(--fn-blue)]';
const fieldBad = 'border-[#c4281c] focus:shadow-[0_0_0_1px_#c4281c]';

type TextKey = 'name' | 'email' | 'phone' | 'zip' | 'address';

export function FunnelContactScreen({ slug, spec, selection, contractor, headingId, onDone, onOpenSent }: FunnelContactScreenProps) {
  const uid = useId();
  const step = spec.contactStep;
  const askHomeowner = step.askHomeowner === true;
  const rules = { askHomeowner, consentOnSubmit: true };
  const [fields, setFields] = useState<FunnelContactFields>(emptyFunnelFields);
  // Never pre-ticked (same as the configurator): only the visitor's own tick sends browser ids to Meta.
  const [measurement, setMeasurement] = useState(false);
  const [consentWording, setConsentWording] = useState(() => estimatorConsentText(contractor.contractorName));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const sendingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Saving the draft starts only after it was restored, so the empty first render never overwrites it.
  const [ready, setReady] = useState(false);
  // One id per picks + details: a retry (ours or theirs) of the same submission is answered once.
  const submission = useRef<{ id: string; body: string } | null>(null);

  // Restore a draft after mount (no hydration mismatch; fixed-height fields, so nothing moves).
  useEffect(() => {
    const draft = loadContactDraft(slug);
    if (draft) setFields((f) => ({ ...f, ...draft }));
    setReady(true);
  }, [slug]);

  useEffect(() => {
    if (ready) saveContactDraft(slug, fields);
  }, [slug, fields, ready]);

  useEffect(() => {
    if (!focusTick) return;
    const key = firstInvalid(errors);
    const el = key ? formRef.current?.querySelector<HTMLElement>(`[data-field="${key}"]`) : formRef.current?.querySelector<HTMLElement>('[data-form-error]');
    el?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only after a submit attempt
  }, [focusTick]);

  const set = <K extends keyof FunnelContactFields>(key: K, value: FunnelContactFields[K]) => {
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
    const local = funnelContactErrors(fields, rules);
    const first = firstInvalid(local);
    if (first) {
      // One message at a time, on the field that gets the focus: never a wall of red.
      setErrors({ [first]: local[first] });
      setFocusTick((n) => n + 1);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setErrors({});
    const draft = funnelLeadRequest({ spec, selection, fields, consentText: consentWording, measurement, consentOnSubmit: true });
    const body = JSON.stringify(draft);
    if (!submission.current || submission.current.body !== body) submission.current = { id: newSubmissionId(), body };
    const res = await submitEstimatorLead(slug, { ...draft, tracking: readTracking(measurement), submissionId: submission.current.id });
    sendingRef.current = false;
    setSending(false);
    if (res.ok) {
      setReady(false);
      clearContactDraft(slug);
      onDone({
        estimate: res.estimate,
        qualified: res.qualified,
        calendarUrl: res.calendarUrl,
        contact: { firstName: draft.contact.firstName, lastName: draft.contact.lastName, email: draft.contact.email },
        selection: draft.funnel,
        saved: res.saved,
      });
      return;
    }
    if (res.consentText) {
      // The wording changed since the page loaded: show the new one; the next tap agrees to it.
      setConsentWording(res.consentText);
    }
    setErrors(placeErrors(res.errors));
    setFocusTick((n) => n + 1);
  };

  /** Leaving a field that has something in it checks just that field (an empty one waits for the submit). */
  const check = (key: TextKey, value: string) => {
    if (key === 'address' || !value.trim()) return;
    const message = funnelContactErrors({ ...fields, [key]: value }, rules)[key];
    setErrors((e) => {
      if ((e[key] ?? undefined) === message) return e;
      const next = { ...e };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  };

  /** The keyboard says "Next": go to the next field instead of submitting the form. */
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.currentTarget.enterKeyHint !== 'next') return;
    e.preventDefault();
    const inputs = Array.from(formRef.current?.querySelectorAll<HTMLInputElement>('input[data-text]') ?? []);
    inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
  };

  const general = formErrors(errors);
  const err = (key: string) => errors[key];
  const lastText: TextKey = step.askAddress ? 'address' : 'zip';

  const text = (key: TextKey, label: string, extra: Record<string, string | number | boolean>) => (
    <div>
      <div className="relative">
        <input
          id={`${uid}-${key}`}
          data-field={key}
          data-text=""
          name={key}
          value={fields[key]}
          placeholder=" "
          onChange={(e) => set(key, e.target.value)}
          onKeyDown={onEnter}
          onBlur={() => {
            if (key === 'phone') {
              const tidy = tidyPhone(fields.phone);
              if (tidy !== fields.phone) set('phone', tidy);
              check('phone', tidy);
            } else check(key, fields[key]);
          }}
          enterKeyHint={key === lastText ? 'go' : 'next'}
          aria-invalid={err(key) ? true : undefined}
          aria-describedby={err(key) ? `${uid}-${key}-e` : undefined}
          className={`${fieldBase} ${err(key) ? fieldBad : fieldOk}`}
          {...extra}
        />
        <label
          htmlFor={`${uid}-${key}`}
          className="pointer-events-none absolute left-[16px] top-[17px] origin-left text-[16px] leading-[22px] text-[var(--fn-muted)] transition-transform duration-150 ease-out peer-focus:-translate-y-[10px] peer-focus:scale-[0.75] peer-[:not(:placeholder-shown)]:-translate-y-[10px] peer-[:not(:placeholder-shown)]:scale-[0.75] motion-reduce:transition-none"
        >
          {label}
        </label>
      </div>
      <FieldError id={`${uid}-${key}-e`}>{err(key)}</FieldError>
    </div>
  );

  return (
    <div className="w-full" data-funnel-contact="">
      <h1 id={headingId} tabIndex={-1} className="fn-h1 outline-none">
        {step.headline}
        <span className="block text-pretty text-[var(--fn-muted-strong)]">{step.subline}</span>
      </h1>

      {onOpenSent ? (
        <button
          type="button"
          onClick={onOpenSent}
          className="mt-5 flex w-full touch-manipulation items-center justify-between gap-3 rounded-[8px] bg-white px-[15px] py-3 text-left text-[15px] leading-5 text-[var(--fn-text)] shadow-[0_0_0_1px_var(--fn-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-focus)]"
          data-funnel-sent=""
        >
          <span>You&rsquo;ve already sent this design.</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[color:var(--fn-blue-ink)]">
            See your estimate <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </button>
      ) : null}

      <form ref={formRef} onSubmit={submit} noValidate className="mt-6" data-funnel-contact-form="">
        <div className="space-y-3">
          {text('name', 'Name', { type: 'text', autoComplete: 'name', autoCapitalize: 'words', maxLength: 160 })}
          {text('email', 'Email', {
            type: 'email',
            autoComplete: 'email',
            inputMode: 'email',
            autoCapitalize: 'none',
            autoCorrect: 'off',
            spellCheck: false,
            maxLength: 254,
          })}
          {text('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 30 })}
          {text('zip', 'ZIP code', { type: 'text', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 10 })}
          {step.askAddress ? text('address', 'Street address (optional)', { type: 'text', autoComplete: 'street-address', maxLength: 300 }) : null}
        </div>

        {askHomeowner ? (
        <fieldset className="mt-5" aria-describedby={err('homeowner') ? `${uid}-homeowner-e` : undefined}>
          <legend className="text-[15px] font-medium text-[var(--fn-ink)]">Do you own this home?</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                ['yes', 'Yes'],
                ['no', 'No'],
              ] as const
            ).map(([value, label], i) => {
              const on = fields.homeowner === value;
              return (
                <label
                  key={value}
                  data-selected={on || undefined}
                  // The error border inline: .es-fn .fn-option's own border outranks a utility class.
                  style={err('homeowner') && !on ? { borderColor: '#c4281c' } : undefined}
                  className="fn-option flex h-12 items-center justify-center text-[16px] font-medium text-[var(--fn-ink)]"
                >
                  <input
                    type="radio"
                    name={`${slug}-homeowner`}
                    value={value}
                    checked={on}
                    onChange={() => set('homeowner', value)}
                    data-field={i === 0 ? 'homeowner' : undefined}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <FieldError id={`${uid}-homeowner-e`}>{err('homeowner')}</FieldError>
        </fieldset>
        ) : null}

        {/* Honeypot: hidden, inert, and named so browser autofill leaves it alone. */}
        <div hidden inert aria-hidden="true" className="hidden">
          <label>
            Leave this empty
            <input type="text" name="contact_url_2" tabIndex={-1} autoComplete="off" value={fields.website} onChange={(e) => set('website', e.target.value)} />
          </label>
        </div>

        <div role="alert" aria-live="assertive" className="mt-4 empty:mt-0">
          {general.map((message) => (
            <p
              key={message}
              data-form-error=""
              tabIndex={-1}
              className="rounded-[8px] border border-[#f1c9c4] bg-[#fdf3f2] px-[15px] py-3 text-[14px] leading-5 text-[#8a1c12] outline-none"
            >
              {message}
            </p>
          ))}
        </div>

        <button
          type="submit"
          disabled={sending}
          aria-busy={sending || undefined}
          aria-describedby={`${uid}-consent`}
          className="fn-btn mt-5 h-12 w-full gap-2 px-4 text-[17px] disabled:cursor-wait lg:h-[52px] lg:text-[18px]"
        >
          {sending ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin motion-reduce:animate-none" /> : null}
          {sending ? 'Getting your estimate…' : step.cta}
        </button>
        {step.trustLine ? <p className="mt-3 text-[14px] leading-5 text-[var(--fn-muted)]">{step.trustLine}</p> : null}

        {/* Agree-on-submit: the exact wording the server checks, right under the button. */}
        <p id={`${uid}-consent`} className="mt-4 text-[12px] leading-[17px] text-[var(--fn-muted)]" data-funnel-consent="">
          By tapping &ldquo;{step.cta}&rdquo;: {consentWording}
        </p>
        <p className="-ml-2 mt-0.5 flex flex-wrap items-center text-[12px] leading-[17px] text-[var(--fn-muted)]">
          <a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center px-2 underline underline-offset-2">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <a href="/terms" target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center px-2 underline underline-offset-2">
            Terms
          </a>
          <span aria-hidden="true">·</span>
          <label className="inline-flex min-h-8 cursor-pointer touch-manipulation items-center gap-1.5 px-2">
            <input
              type="checkbox"
              checked={measurement}
              onChange={(e) => setMeasurement(e.target.checked)}
              className="size-3.5 shrink-0 accent-[color:var(--fn-blue)]"
            />
            <span>Allow optional ad measurement</span>
          </label>
        </p>
      </form>
    </div>
  );
}

function FieldError({ id, children, className = '' }: { id: string; children?: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p id={id} className={`mt-1.5 text-[13.5px] font-medium leading-[18px] text-[#c4281c] ${className}`}>
      {children}
    </p>
  );
}
