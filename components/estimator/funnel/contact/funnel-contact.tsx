'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
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
 * Name, email, phone, ZIP (it gates the service area), "do you own this home"
 * (the funnel's qualification rule), the funnel's consent wording with its
 * checkbox (the lead route checks both), then the lead POST with the picks.
 * The server prices the picks and answers with the estimate; onSuccess hands it
 * to the shell (onDone), which stores it and opens the booking screen.
 *
 * Built so the first submit goes through: specific messages per field, focus on
 * the first one to fix, everything typed is kept (and survives a reload), one
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

export function FunnelContactScreen({ slug, spec, selection, contractor, headingId, onDone }: FunnelContactScreenProps) {
  const uid = useId();
  const step = spec.contactStep;
  const [fields, setFields] = useState<FunnelContactFields>(emptyFunnelFields);
  // The contractor's default (opt_out = on); the visitor can untick it.
  const [measurement, setMeasurement] = useState(contractor.adMeasurement === 'opt_out');
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
    const local = funnelContactErrors(fields);
    if (Object.keys(local).length) {
      setErrors(local);
      setFocusTick((n) => n + 1);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setErrors({});
    const draft = funnelLeadRequest({ spec, selection, fields, consentText: consentWording, measurement });
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
      });
      return;
    }
    if (res.consentText) {
      // The wording changed since the page loaded: show the new one and ask for the box again.
      setConsentWording(res.consentText);
      setFields((f) => ({ ...f, consent: false }));
    }
    setErrors(placeErrors(res.errors));
    setFocusTick((n) => n + 1);
  };

  const general = formErrors(errors);
  const fieldCount = Object.keys(errors).length - general.length;
  const err = (key: string) => errors[key];

  const text = (key: TextKey, label: string, extra: Record<string, string | number | boolean>) => (
    <div>
      <div className="relative">
        <input
          id={`${uid}-${key}`}
          data-field={key}
          name={key}
          value={fields[key]}
          placeholder=" "
          onChange={(e) => set(key, e.target.value)}
          // Only when tidying changes it, so a blur never clears an error or shifts the layout under the pointer.
          onBlur={
            key === 'phone'
              ? () => {
                  const tidy = tidyPhone(fields.phone);
                  if (tidy !== fields.phone) set('phone', tidy);
                }
              : undefined
          }
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
      <h1 id={headingId} tabIndex={-1} className="fn-h1 text-balance outline-none">
        {step.headline}
        <span className="block text-[var(--fn-muted-strong)]">{step.subline}</span>
      </h1>

      <form ref={formRef} onSubmit={submit} noValidate className="mt-6" data-funnel-contact-form="">
        <div className="space-y-3">
          {text('name', 'Name', { type: 'text', autoComplete: 'name', autoCapitalize: 'words', maxLength: 160, enterKeyHint: 'next' })}
          {text('email', 'Email', {
            type: 'email',
            autoComplete: 'email',
            inputMode: 'email',
            autoCapitalize: 'none',
            autoCorrect: 'off',
            spellCheck: false,
            maxLength: 254,
            enterKeyHint: 'next',
          })}
          {text('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 30, enterKeyHint: 'next' })}
          {text('zip', 'ZIP code', { type: 'text', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 10, enterKeyHint: step.askAddress ? 'next' : 'done' })}
          {step.askAddress ? text('address', 'Street address (optional)', { type: 'text', autoComplete: 'street-address', maxLength: 300, enterKeyHint: 'done' }) : null}
        </div>

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
                    name={`${uid}-homeowner`}
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

        {/* Honeypot: hidden, inert, and named so browser autofill leaves it alone. */}
        <div hidden inert aria-hidden="true" className="hidden">
          <label>
            Leave this empty
            <input type="text" name="contact_url_2" tabIndex={-1} autoComplete="off" value={fields.website} onChange={(e) => set('website', e.target.value)} />
          </label>
        </div>

        <div className="mt-5">
          <label className="flex cursor-pointer touch-manipulation items-start gap-3 text-[13px] leading-[19px] text-[var(--fn-muted)]">
            <span className="relative mt-px inline-flex size-[22px] shrink-0">
              <input
                type="checkbox"
                data-field="consent"
                checked={fields.consent}
                onChange={(e) => set('consent', e.target.checked)}
                aria-invalid={err('consent') ? true : undefined}
                aria-describedby={err('consent') ? `${uid}-consent-e` : undefined}
                className={`peer size-[22px] cursor-pointer appearance-none rounded-[5px] border bg-white transition-colors duration-150 checked:border-[color:var(--fn-blue)] checked:bg-[color:var(--fn-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fn-blue)] motion-reduce:transition-none ${
                  err('consent') ? 'border-[#c4281c]' : 'border-[#b8b8bd]'
                }`}
              />
              <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute inset-[4px] size-[14px] text-white opacity-0 peer-checked:opacity-100" />
            </span>
            <span>
              {consentWording}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Privacy
              </a>
              {' · '}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Terms
              </a>
            </span>
          </label>
          <FieldError id={`${uid}-consent-e`} className="pl-[34px]">
            {err('consent')}
          </FieldError>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-[12px] leading-[18px] text-[var(--fn-muted)]">
            <input
              type="checkbox"
              checked={measurement}
              onChange={(e) => setMeasurement(e.target.checked)}
              className="ml-[3px] size-4 shrink-0 accent-[color:var(--fn-blue)]"
            />
            <span>Allow optional advertising measurement</span>
          </label>
        </div>

        <div role="alert" aria-live="assertive" className="mt-4 empty:mt-0">
          {fieldCount > 0 && general.length === 0 ? (
            <p className="text-[14px] font-medium text-[#c4281c]">{fieldCount === 1 ? 'One thing to fix above.' : `${fieldCount} things to fix above.`}</p>
          ) : null}
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
          className="fn-btn mt-4 h-12 w-full gap-2 px-4 text-[16px] disabled:cursor-wait"
        >
          {sending ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin motion-reduce:animate-none" /> : null}
          {sending ? 'Getting your estimate…' : step.cta}
        </button>
        <p className="mt-3 flex items-start gap-2 text-[14px] leading-5 text-[var(--fn-muted)]">
          <ShieldCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-[color:var(--fn-blue)]" strokeWidth={2.2} />
          <span>{step.trustLine}</span>
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
