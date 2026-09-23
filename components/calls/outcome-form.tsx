'use client';

import { useActionState, useMemo, useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logCallOutcome, type ProspectActionState } from '@/lib/actions/prospects';
import {
  APPOINTMENT_TYPES,
  CONTACT_METHODS,
  DISPOSITIONS,
  LOGGABLE_OUTCOMES,
  TIME_ZONES,
} from '@/lib/calls/constants';
import { requiredFieldsFor, visibleFieldsFor, type OutcomeField } from '@/lib/calls/rules';
import type { ProspectDisposition } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Log the outcome of a call. Picking an outcome reveals only the fields that
 * outcome needs — the same rules the server validates with — so the form is
 * short by default and never asks for something it will not use.
 *
 * Two submit buttons: "Save" stays on the record; "Save and open next" moves
 * straight to the next prospect in the queue, which is how a caller works
 * through a list without touching the mouse between calls.
 */
export function OutcomeForm({
  prospectId,
  disposition,
  decisionMakerName,
  bestContactMethod,
  isDnc,
}: {
  prospectId: string;
  disposition: ProspectDisposition;
  decisionMakerName: string | null;
  bestContactMethod: string | null;
  isDnc: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProspectActionState, FormData>(
    logCallOutcome,
    undefined
  );
  const [outcome, setOutcome] = useState<ProspectDisposition | ''>('');
  const visible = useMemo(
    () => new Set<OutcomeField>(outcome ? visibleFieldsFor(outcome) : ['notes']),
    [outcome]
  );
  const required = useMemo(
    () => new Set<OutcomeField>(outcome ? requiredFieldsFor(outcome) : []),
    [outcome]
  );
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const show = (f: OutcomeField) => visible.has(f);
  const req = (f: OutcomeField) => required.has(f);

  if (isDnc) {
    return (
      <Card id="log">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Log a call</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This contractor asked not to be called. No further calls can be logged.
            An administrator can lift the do-not-call status if it was set in error.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="log">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Log this call</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="prospect_id" value={prospectId} />

          <div className="space-y-1.5">
            <Label htmlFor="outcome">
              Outcome <span className="text-destructive">*</span>
            </Label>
            <Select
              id="outcome"
              name="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ProspectDisposition)}
              aria-invalid={errors.outcome ? true : undefined}
              autoFocus
              required
            >
              <option value="" disabled>
                Choose what happened…
              </option>
              {DISPOSITIONS.filter((d) => LOGGABLE_OUTCOMES.includes(d.value)).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.outcome} />
            <p className="text-xs text-muted-foreground">
              Currently: {DISPOSITIONS.find((d) => d.value === disposition)?.label ?? disposition}
            </p>
          </div>

          {show('callback_at') ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Callback date"
                htmlFor="callback_date"
                required={req('callback_at')}
                error={errors.callback_at}
              >
                <Input id="callback_date" name="callback_date" type="date" required={req('callback_at')} />
              </Field>
              <Field label="Callback time" htmlFor="callback_time" required={req('callback_at')}>
                <Input id="callback_time" name="callback_time" type="time" defaultValue="10:00" />
              </Field>
            </div>
          ) : null}

          {show('decision_maker_name') ? (
            <Field
              label="Decision-maker name"
              htmlFor="decision_maker_name"
              required={req('decision_maker_name')}
              error={errors.decision_maker_name}
            >
              <Input
                id="decision_maker_name"
                name="decision_maker_name"
                defaultValue={decisionMakerName ?? ''}
                autoComplete="off"
                required={req('decision_maker_name')}
              />
            </Field>
          ) : null}

          {show('best_contact_method') ? (
            <Field
              label="Best contact method"
              htmlFor="best_contact_method"
              required={req('best_contact_method')}
              error={errors.best_contact_method}
            >
              <Select
                id="best_contact_method"
                name="best_contact_method"
                defaultValue={bestContactMethod ?? ''}
                required={req('best_contact_method')}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {CONTACT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {show('follow_up_at') ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Follow-up date"
                htmlFor="follow_up_date"
                required={req('follow_up_at')}
                error={errors.follow_up_at}
              >
                <Input id="follow_up_date" name="follow_up_date" type="date" required={req('follow_up_at')} />
              </Field>
              <Field label="Follow-up time" htmlFor="follow_up_time">
                <Input id="follow_up_time" name="follow_up_time" type="time" defaultValue="10:00" />
              </Field>
            </div>
          ) : null}

          {show('appointment_at') ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sales appointment
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Date"
                  htmlFor="appointment_date"
                  required={req('appointment_at')}
                  error={errors.appointment_at}
                >
                  <Input id="appointment_date" name="appointment_date" type="date" required />
                </Field>
                <Field label="Time" htmlFor="appointment_time" required>
                  <Input id="appointment_time" name="appointment_time" type="time" required />
                </Field>
                <Field
                  label="Type"
                  htmlFor="appointment_type"
                  required={req('appointment_type')}
                  error={errors.appointment_type}
                >
                  <Select id="appointment_type" name="appointment_type" defaultValue="phone" required>
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Time zone"
                  htmlFor="time_zone"
                  required={req('time_zone')}
                  error={errors.time_zone}
                >
                  <Select id="time_zone" name="time_zone" defaultValue="America/Los_Angeles" required>
                    {TIME_ZONES.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                label="Confirmation phone or email"
                htmlFor="contact_info"
                required={req('contact_info')}
                error={errors.contact_info}
              >
                <Input id="contact_info" name="contact_info" autoComplete="off" required />
              </Field>
            </div>
          ) : null}

          {show('confirm_do_not_call') ? (
            <div
              className={cn(
                'space-y-2 rounded-md border p-3',
                errors.confirm_do_not_call ? 'border-destructive' : 'border-amber-300 bg-amber-50'
              )}
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="confirm_do_not_call"
                  className="mt-0.5 size-4 accent-primary"
                  required
                />
                <span>
                  This contractor asked not to be called again. Marking do-not-call
                  removes them from every calling list permanently; only an
                  administrator can reverse it.
                </span>
              </label>
              <FieldError message={errors.confirm_do_not_call} />
            </div>
          ) : null}

          <Field label="Notes" htmlFor="notes" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="What was said, who you spoke to, anything the next call needs to know."
            />
          </Field>

          {state && !state.ok && state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state && state.ok && state.message ? (
            <p className="text-sm text-emerald-600" role="status">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="intent" value="save" disabled={pending || !outcome}>
              <Save className="size-4" aria-hidden="true" />
              {pending ? 'Saving…' : 'Save outcome'}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="save_and_next"
              variant="outline"
              disabled={pending || !outcome}
            >
              Save and open next
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}
