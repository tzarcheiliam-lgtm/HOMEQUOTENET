'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { LEAD_TIMELINES, estimatorConsentText } from '@/lib/estimator/lead-client';
import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { ChoiceTile, Field, QuestionFieldset, inputClass, textareaClass } from '../ui';
import { NOTE_MAX_LENGTH, type ContactInput, type FlowState } from '../use-estimator-flow';

/** Lead screen 1: ZIP, "Do you own the home?", timeline. */
export function ZipScreen({
  state,
  onChange,
  errors,
}: {
  state: Pick<FlowState, 'zip' | 'homeowner' | 'timeline'>;
  onChange: (patch: Partial<Pick<FlowState, 'zip' | 'homeowner' | 'timeline'>>) => void;
  errors: Record<string, string>;
}) {
  const uid = useId();
  return (
    <div className="space-y-7">
      <Field label="Property ZIP code" error={errors.zip} hint="5 digits" className="max-w-xs">
        {(p) => (
          <input
            {...p}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            pattern="[0-9]{5}"
            value={state.zip}
            onChange={(e) => onChange({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            className={inputClass}
          />
        )}
      </Field>

      <QuestionFieldset legend="Do you own the home?">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['yes', 'Yes'],
              ['no', 'No'],
            ] as const
          ).map(([id, label]) => (
            <ChoiceTile
              key={id}
              type="radio"
              name={`${uid}-owner`}
              value={id}
              checked={state.homeowner === id}
              onChange={() => onChange({ homeowner: id })}
              label={label}
            />
          ))}
        </div>
        {errors.homeowner ? <p className="mt-1 text-sm text-[var(--hq-bad)]">{errors.homeowner}</p> : null}
      </QuestionFieldset>

      <QuestionFieldset legend="When would you like to start?">
        <div className="grid gap-3 sm:grid-cols-2">
          {LEAD_TIMELINES.map((t) => (
            <ChoiceTile
              key={t.id}
              type="radio"
              name={`${uid}-timeline`}
              value={t.id}
              checked={state.timeline === t.id}
              onChange={() => onChange({ timeline: t.id })}
              label={t.label}
            />
          ))}
        </div>
        {errors.timeline ? <p className="mt-1 text-sm text-[var(--hq-bad)]">{errors.timeline}</p> : null}
      </QuestionFieldset>
    </div>
  );
}

/** Lead screen 2: contact details, consent, honeypot and an optional note. */
export function ContactScreen({
  contractor,
  contact,
  onChange,
  measurement,
  onMeasurementChange,
  errors,
}: {
  contractor: ContractorEstimatorConfig;
  contact: ContactInput;
  onChange: (patch: Partial<ContactInput>) => void;
  measurement: boolean;
  onMeasurementChange: (allowed: boolean) => void;
  errors: Record<string, string>;
}) {
  const consentId = useId();
  const consentErrorId = `${consentId}-e`;
  const textField = (
    key: 'firstName' | 'lastName' | 'email' | 'phone',
    label: string,
    inputProps: Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'autoComplete' | 'inputMode'>,
  ) => (
    <Field label={label} error={errors[key]}>
      {(p) => <input {...p} {...inputProps} value={contact[key]} onChange={(e) => onChange({ [key]: e.target.value })} className={inputClass} />}
    </Field>
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {textField('firstName', 'First name', { type: 'text', autoComplete: 'given-name' })}
        {textField('lastName', 'Last name', { type: 'text', autoComplete: 'family-name' })}
        {textField('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
        {textField('phone', 'Mobile phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
      </div>

      <Field
        label="Anything else we should know? (optional)"
        error={errors.note}
        hint={`${contact.note.length}/${NOTE_MAX_LENGTH}`}
      >
        {(p) => (
          <textarea
            {...p}
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={contact.note}
            onChange={(e) => onChange({ note: e.target.value })}
            className={textareaClass}
          />
        )}
      </Field>

      {/* Honeypot: hidden, inert and named so autofill ignores it; bots fill it in. */}
      <div hidden inert className="hidden">
        <label>
          Leave this empty
          <input
            type="text"
            name="contact_url_2"
            tabIndex={-1}
            autoComplete="off"
            value={contact.website}
            onChange={(e) => onChange({ website: e.target.value })}
          />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]">
          <input
            type="checkbox"
            checked={contact.consent}
            onChange={(e) => onChange({ consent: e.target.checked })}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? consentErrorId : undefined}
            className="mt-1 size-4 shrink-0 accent-[var(--hq-accent)]"
          />
          <span>
            {estimatorConsentText(contractor.contractorName)}{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Privacy policy
            </a>
            {' · '}
            <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Terms
            </a>
          </span>
        </label>
        {errors.consent ? (
          <p id={consentErrorId} className="mt-1 text-sm text-[var(--hq-bad)]">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[var(--hq-text-muted)]">
        <input
          type="checkbox"
          checked={measurement}
          onChange={(e) => onMeasurementChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--hq-accent)]"
        />
        <span>Allow optional advertising measurement</span>
      </label>
    </div>
  );
}
