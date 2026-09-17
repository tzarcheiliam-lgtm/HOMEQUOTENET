'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { submitApplication } from '@/lib/actions/applications';
import { initialApplicationState } from '@/lib/applications/state';
import {
  PRIMARY_SERVICES,
  AVG_PROJECT_VALUES,
  MIN_PROJECT_SIZES,
  LEAD_CAPACITIES,
  RESPONSE_TIMES,
  CRM_OPTIONS,
  TRACK_LABELS,
  type Track,
} from '@/lib/validation/application';
import { site, hasRealContactEmail } from '@/content/site';
import { cn } from '@/lib/utils';

/* ---- Field primitives --------------------------------------------------- */

const controlClass =
  'w-full rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-4 py-3 text-[15px] text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] transition-colors focus:border-[var(--hq-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--hq-accent)]/30';

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[var(--hq-text)]"
      >
        {label}
        {required ? (
          <span className="ml-1 text-[var(--hq-accent-bright)]" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-[var(--hq-text-dim)]">
            Optional
          </span>
        )}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs leading-5 text-[var(--hq-text-dim)]">{hint}</p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--hq-bad)]"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Text({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  hint,
  error,
  defaultValue,
  autoComplete,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <FieldShell
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={controlClass}
      />
    </FieldShell>
  );
}

function Select({
  name,
  label,
  options,
  required,
  error,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
  error?: string;
  defaultValue?: string;
  placeholder: string;
}) {
  const id = `f-${name}`;
  return (
    <FieldShell label={label} htmlFor={id} error={error} required={required}>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(controlClass, 'appearance-none bg-[right_1rem_center] bg-no-repeat pr-10')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236c7583' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/* ---- Submit button ------------------------------------------------------ */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--hq-accent)] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(61,125,255,0.6)] transition-colors hover:bg-[var(--hq-accent-bright)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Submitting…
        </>
      ) : (
        <>
          {site.cta.primary}
          <ArrowRight className="size-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

/* ---- Success state ------------------------------------------------------ */

function SuccessPanel() {
  return (
    <div
      className="hq-card p-8 text-center sm:p-12"
      role="status"
      aria-live="polite"
    >
      <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-[var(--hq-accent-glow)] text-[var(--hq-accent-bright)]">
        <CheckCircle2 className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--hq-text)]">
        Application received.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[var(--hq-text-muted)]">
        Thank you. We will review your project types, service area, and capacity
        against current availability in your market and follow up.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-5 text-left">
        <p className="text-sm font-semibold text-[var(--hq-text)]">
          What happens next
        </p>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--hq-text-muted)]">
          <li>1. We check availability in your area.</li>
          <li>2. A short call to confirm the details.</li>
          <li>
            3. Appointment standard, pricing, and test volume sent to you in
            writing.
          </li>
        </ol>
      </div>

      <p className="mt-6 text-sm leading-6 text-[var(--hq-text-dim)]">
        Submitting this application does not create an agreement or an
        obligation.
      </p>
    </div>
  );
}

/* ---- Form --------------------------------------------------------------- */

export function ApplicationForm({
  defaultTrack = 'pay_per_lead',
}: {
  defaultTrack?: Track;
}) {
  const [state, formAction] = useActionState(
    submitApplication,
    initialApplicationState
  );
  const [startedAt, setStartedAt] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const servicesId = useId();

  // Timestamp the render; the action rejects impossibly fast submissions.
  useEffect(() => {
    setStartedAt(String(Date.now()));
  }, []);

  // Move focus to the error summary so the failure is announced.
  useEffect(() => {
    if (state.status === 'error') errorRef.current?.focus();
  }, [state.status]);

  if (state.status === 'success') return <SuccessPanel />;

  const v = state.values;
  const str = (key: string) =>
    typeof v[key] === 'string' ? (v[key] as string) : undefined;
  const arr = (key: string) => (Array.isArray(v[key]) ? (v[key] as string[]) : []);
  const selectedServices = arr('primary_services');
  const selectedTrack = (str('track') as Track | undefined) ?? defaultTrack;

  return (
    <form action={formAction} noValidate={false} className="space-y-10">
      {/* Honeypot: hidden from people, visible to naive bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="company_url">Company URL</label>
        <input
          id="company_url"
          name="company_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="form_started_at" value={startedAt} />

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[var(--hq-bad)]/40 bg-[var(--hq-bad)]/10 p-4 outline-none"
        >
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-[var(--hq-bad)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--hq-text)]">
              {state.message}
            </p>
            {/*
              A delivery failure means nothing was stored, so the applicant
              needs a route that does not depend on the form. Only offered
              when a real inbox is configured — pointing someone at a
              placeholder address would be a dead end.
            */}
            {Object.keys(state.fieldErrors).length === 0 &&
            hasRealContactEmail ? (
              <p className="mt-1.5 text-sm leading-6 text-[var(--hq-text-muted)]">
                Nothing was saved, so please reach us directly and we will take
                your details over the phone or by email:{' '}
                <a
                  href={`tel:${site.contact.phoneHref}`}
                  className="font-medium text-[var(--hq-accent-bright)] hover:underline"
                >
                  {site.contact.phone}
                </a>{' '}
                or{' '}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="font-medium text-[var(--hq-accent-bright)] hover:underline"
                >
                  {site.contact.email}
                </a>
                .
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* --- Contact ------------------------------------------------------ */}
      <fieldset className="space-y-6">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]">
          Your details
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Text
            name="first_name"
            label="First name"
            required
            autoComplete="given-name"
            defaultValue={str('first_name')}
            error={state.fieldErrors.first_name}
          />
          <Text
            name="last_name"
            label="Last name"
            required
            autoComplete="family-name"
            defaultValue={str('last_name')}
            error={state.fieldErrors.last_name}
          />
        </div>

        <Text
          name="company"
          label="Company name"
          required
          autoComplete="organization"
          defaultValue={str('company')}
          error={state.fieldErrors.company}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Text
            name="phone"
            label="Phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="(555) 555-5555"
            defaultValue={str('phone')}
            error={state.fieldErrors.phone}
          />
          <Text
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            defaultValue={str('email')}
            error={state.fieldErrors.email}
          />
        </div>

        <Text
          name="website"
          label="Website"
          type="text"
          placeholder="yourcompany.com"
          hint="Helps us confirm the work you do. Leave blank if you do not have one."
          defaultValue={str('website')}
          error={state.fieldErrors.website}
        />
      </fieldset>

      <div className="hq-rule" aria-hidden="true" />

      {/* --- Work --------------------------------------------------------- */}
      <fieldset className="space-y-6">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]">
          The work you want
        </legend>

        <div className="space-y-3">
          <span
            id={servicesId}
            className="block text-sm font-medium text-[var(--hq-text)]"
          >
            Primary services
            <span className="ml-1 text-[var(--hq-accent-bright)]" aria-hidden="true">
              *
            </span>
          </span>
          <div
            role="group"
            aria-labelledby={servicesId}
            aria-describedby={
              state.fieldErrors.primary_services ? 'services-error' : undefined
            }
            className="grid gap-2.5 sm:grid-cols-2"
          >
            {PRIMARY_SERVICES.map((service) => (
              <label
                key={service}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] px-4 py-3 text-sm text-[var(--hq-text)] transition-colors hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent)] has-[:checked]:bg-[var(--hq-accent-glow)]"
              >
                <input
                  type="checkbox"
                  name="primary_services"
                  value={service}
                  defaultChecked={selectedServices.includes(service)}
                  className="size-4 shrink-0 accent-[var(--hq-accent)]"
                />
                {service}
              </label>
            ))}
          </div>
          {state.fieldErrors.primary_services ? (
            <p
              id="services-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--hq-bad)]"
            >
              <AlertCircle className="size-3.5" aria-hidden="true" />
              {state.fieldErrors.primary_services}
            </p>
          ) : null}
        </div>

        <FieldShell
          label="Service areas"
          htmlFor="f-service_areas"
          required
          hint="Counties, cities, or ZIP codes you actually drive to."
          error={state.fieldErrors.service_areas}
        >
          <textarea
            id="f-service_areas"
            name="service_areas"
            required
            rows={3}
            defaultValue={str('service_areas')}
            placeholder="e.g. Los Angeles County — San Fernando Valley, Santa Clarita, Pasadena"
            aria-invalid={state.fieldErrors.service_areas ? true : undefined}
            className={cn(controlClass, 'resize-y')}
          />
        </FieldShell>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            name="avg_project_value"
            label="Average project value"
            options={AVG_PROJECT_VALUES}
            required
            placeholder="Select a range"
            defaultValue={str('avg_project_value')}
            error={state.fieldErrors.avg_project_value}
          />
          <Select
            name="min_project_size"
            label="Minimum project size"
            options={MIN_PROJECT_SIZES}
            required
            placeholder="Select a minimum"
            defaultValue={str('min_project_size')}
            error={state.fieldErrors.min_project_size}
          />
        </div>
      </fieldset>

      <div className="hq-rule" aria-hidden="true" />

      {/* --- Capacity ----------------------------------------------------- */}
      <fieldset className="space-y-6">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]">
          Capacity and calendar
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            name="monthly_lead_capacity"
            label="Additional appointments you can handle monthly"
            options={LEAD_CAPACITIES}
            required
            placeholder="Select a number"
            defaultValue={str('monthly_lead_capacity')}
            error={state.fieldErrors.monthly_lead_capacity}
          />
          <Select
            name="response_time"
            label="How quickly your team can confirm a new appointment"
            options={RESPONSE_TIMES}
            required
            placeholder="Select a response time"
            defaultValue={str('response_time')}
            error={state.fieldErrors.response_time}
          />
        </div>

        <Select
          name="uses_crm"
          label="Do you currently use a CRM?"
          options={CRM_OPTIONS}
          required
          placeholder="Select an option"
          defaultValue={str('uses_crm')}
          error={state.fieldErrors.uses_crm}
        />
      </fieldset>

      <div className="hq-rule" aria-hidden="true" />

      {/* --- Arrangement -------------------------------------------------- */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]">
          Preferred arrangement
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'pay_per_lead' as Track,
                note: 'Pay for qualified appointments booked into your calendar. No monthly marketing retainer required to start.',
                tag: 'Recommended',
              },
              {
                value: 'managed' as Track,
                note: 'We build and manage the full acquisition system. Optional, quoted separately.',
                tag: null,
              },
            ]
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4 transition-colors hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent)] has-[:checked]:bg-[var(--hq-accent-glow)]"
            >
              <input
                type="radio"
                name="track"
                value={option.value}
                required
                defaultChecked={selectedTrack === option.value}
                className="mt-1 size-4 shrink-0 accent-[var(--hq-accent)]"
              />
              <span>
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--hq-text)]">
                  {TRACK_LABELS[option.value]}
                  {option.tag ? (
                    <span className="rounded-full border border-[var(--hq-accent-dim)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--hq-accent-bright)]">
                      {option.tag}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-[var(--hq-text-muted)]">
                  {option.note}
                </span>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors.track ? (
          <p role="alert" className="text-xs font-medium text-[var(--hq-bad)]">
            {state.fieldErrors.track}
          </p>
        ) : null}

        <FieldShell
          label="Anything else we should know"
          htmlFor="f-notes"
          error={state.fieldErrors.notes}
        >
          <textarea
            id="f-notes"
            name="notes"
            rows={4}
            defaultValue={str('notes')}
            placeholder="Where your work comes from today, what has and has not worked, questions about the programme."
            className={cn(controlClass, 'resize-y')}
          />
        </FieldShell>
      </fieldset>

      <div className="hq-rule" aria-hidden="true" />

      {/* --- Consent ------------------------------------------------------ */}
      <div className="space-y-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--hq-accent)]"
            aria-invalid={state.fieldErrors.consent ? true : undefined}
          />
          <span className="text-sm leading-6 text-[var(--hq-text-muted)]">
            I agree that {site.name} may contact me by phone, email, or text
            about this business application and appointment availability in my
            market. I can ask to stop at any time. See our{' '}
            <a
              href="/privacy"
              className="font-medium text-[var(--hq-accent-bright)] hover:underline"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="/terms"
              className="font-medium text-[var(--hq-accent-bright)] hover:underline"
            >
              Terms
            </a>
            .
          </span>
        </label>
        {state.fieldErrors.consent ? (
          <p role="alert" className="text-xs font-medium text-[var(--hq-bad)]">
            {state.fieldErrors.consent}
          </p>
        ) : null}

        <SubmitButton />

        <p className="text-xs leading-5 text-[var(--hq-text-dim)]">
          Submitting this application does not create an agreement or an
          obligation. The appointment standard, pricing, service areas, and
          exclusivity are confirmed in writing before anything launches.
        </p>
      </div>
    </form>
  );
}
