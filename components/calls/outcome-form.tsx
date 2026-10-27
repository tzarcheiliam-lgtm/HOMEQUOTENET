'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Keyboard, Mail, Save, Zap } from 'lucide-react';
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
  OUTCOME_KEYS,
  QUICK_LABELS,
  QUICK_OUTCOMES,
  TIME_ZONES,
} from '@/lib/calls/constants';
import { requiredFieldsFor, visibleFieldsFor, type OutcomeField } from '@/lib/calls/rules';
import type { ProspectDisposition } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useOutcomePreset, useWorkspaceNav } from './call-workspace';
import { useGoal } from './goal/goal-provider';
import { FOLLOW_UP_FOR } from '@/lib/emails/call-followups';
import { openQuickEmail } from '@/lib/calls/quick-email-events';

/** The field to focus when a shortcut picks an outcome that needs details. */
const FIRST_FIELD: Partial<Record<ProspectDisposition, string>> = {
  callback_requested: 'callback_date',
  interested: 'decision_maker_name',
  follow_up_required: 'follow_up_date',
  appointment_booked: 'appointment_date',
};

const KEY_FOR = Object.fromEntries(
  Object.entries(OUTCOME_KEYS).map(([k, v]) => [v, k])
) as Partial<Record<ProspectDisposition, string>>;

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  // The outcome picker is focused on load; shortcuts stand in for it.
  if (el.id === 'outcome') return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Log the outcome of a call. Picking an outcome reveals only the fields that
 * outcome needs — the same rules the server validates with — so the form is
 * short by default and never asks for something it will not use.
 *
 * Two submit buttons: "Save" stays on the record; "Save and open next" moves
 * straight to the next prospect in the queue, which is how a caller works
 * through a list without touching the mouse between calls.
 *
 * Outcomes with nothing else to fill in (QUICK_OUTCOMES) are one tap: they
 * save and open the next prospect immediately. On a keyboard, 1–9/0 pick an
 * outcome, C dials, N skips, Enter saves and moves on, ? shows the keys.
 * Every save bumps the daily goal HUD the moment it is submitted.
 *
 * Outcomes that call for a follow-up email (FOLLOW_UP_FOR) save without
 * leaving the prospect, then open the quick email sheet; Send & next or Skip
 * moves on. E opens the sheet any time.
 */
export function OutcomeForm({
  prospectId,
  disposition,
  decisionMakerName,
  decisionMakerEmail = null,
  bestContactMethod,
  isDnc,
  contextQuery,
  emailFollowUps = false,
}: {
  prospectId: string;
  disposition: ProspectDisposition;
  decisionMakerName: string | null;
  decisionMakerEmail?: string | null;
  bestContactMethod: string | null;
  isDnc: boolean;
  /** The list this prospect was opened from, so Save & next stays inside it. */
  contextQuery?: string;
  /** Offer the follow-up email after saving (Gmail connected, prospect may be emailed). */
  emailFollowUps?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProspectActionState, FormData>(
    logCallOutcome,
    undefined
  );
  const [outcome, setOutcome] = useState<ProspectDisposition | ''>('');
  // The phone action bar's "Appt" button pre-selects Appointment booked.
  const preset = useOutcomePreset();
  useEffect(() => {
    if (preset) setOutcome(preset.outcome);
  }, [preset]);

  const router = useRouter();
  const { tel, nextHref } = useWorkspaceNav();
  const goal = useGoal();
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const bumpRef = useRef<number | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  // A save the server rejected never counted: take its bump back.
  useEffect(() => {
    if (state && !state.ok) {
      goal?.revert(bumpRef.current);
      bumpRef.current = null;
    }
  }, [state, goal]);

  // Saved with "then email": open the follow-up sheet, pointed at the next prospect.
  const opened = useRef<number | null>(null);
  useEffect(() => {
    if (!state || !state.ok || !state.followUp || opened.current === state.followUp.n) return;
    opened.current = state.followUp.n;
    const f = state.followUp;
    const qs = contextQuery ?? '';
    const nextUrl = state.nextId
      ? `/app/calls/${state.nextId}${qs ? `?${qs}` : ''}`
      : `/app/calls?${qs || 'view=mine'}&done=1`;
    openQuickEmail({
      outcome: f.outcome,
      when: f.at ? { iso: f.at, timeZone: f.timeZone, type: f.type } : null,
      nextHref: nextUrl,
    });
  }, [state, contextQuery]);

  // The "next" button saves then emails when this outcome has a follow-up.
  const withEmail = emailFollowUps && !!outcome && !!FOLLOW_UP_FOR[outcome];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const o = new FormData(e.currentTarget).get('outcome');
    if (o) bumpRef.current = goal?.bump({ key: prospectId, outcome: o as ProspectDisposition }) ?? null;
  };

  /** One tap: choose the outcome, save, open the next prospect. */
  const quick = useCallback(
    (o: ProspectDisposition) => {
      if (pending) return;
      flushSync(() => setOutcome(o));
      formRef.current?.requestSubmit(nextRef.current ?? undefined);
    },
    [pending]
  );

  /** Choose an outcome that needs details and jump to its first field. */
  const pick = useCallback((o: ProspectDisposition) => {
    flushSync(() => setOutcome(o));
    const id = FIRST_FIELD[o];
    if (id) document.getElementById(id)?.focus();
  }, []);

  useEffect(() => {
    if (isDnc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      // The quick email sheet (a modal) has its own keys.
      if (document.querySelector('[aria-modal="true"]')) return;
      const k = e.key;
      const o = OUTCOME_KEYS[k];
      if (o) {
        e.preventDefault();
        if (QUICK_OUTCOMES.includes(o)) quick(o);
        else pick(o);
      } else if ((k === 'c' || k === 'C') && tel) {
        e.preventDefault();
        window.location.href = tel;
      } else if ((k === 'n' || k === 'N' || k === 'ArrowRight') && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      } else if (k === 'Enter' && outcome && !pending) {
        e.preventDefault();
        formRef.current?.requestSubmit(nextRef.current ?? undefined);
      } else if (k === 'e' || k === 'E') {
        e.preventDefault();
        openQuickEmail({ outcome: outcome || undefined });
      } else if (k === '?') {
        e.preventDefault();
        setShowKeys((v) => !v);
      } else if (k === 'Escape') {
        setShowKeys(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDnc, quick, pick, tel, nextHref, router, outcome, pending]);
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
    <Card id="log" className="max-lg:gap-3 max-lg:border-0 max-lg:bg-transparent max-lg:py-0 max-lg:shadow-none">
      <CardHeader className="pb-3 max-lg:px-0">
        <CardTitle className="text-base">Log this call</CardTitle>
      </CardHeader>
      <CardContent className="max-lg:px-0">
        <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="prospect_id" value={prospectId} />
          <input type="hidden" name="list_context" value={contextQuery ?? ''} />

          <div className="space-y-1.5">
            <Label htmlFor="outcome">
              Outcome <span className="text-destructive">*</span>
            </Label>
            {/* Phones: big tap tiles; once chosen they collapse to a summary. */}
            <div className="lg:hidden">
              {outcome ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Check className="size-4 text-emerald-700" aria-hidden="true" />
                    {DISPOSITIONS.find((d) => d.value === outcome)?.label}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setOutcome('')}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div role="group" aria-label="Outcome" className="grid grid-cols-2 gap-2">
                    {DISPOSITIONS.filter((d) => LOGGABLE_OUTCOMES.includes(d.value)).map((d) => {
                      const isQuick = QUICK_OUTCOMES.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          disabled={pending}
                          onClick={() => (isQuick ? quick(d.value) : setOutcome(d.value))}
                          className={cn(
                            'flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium leading-tight active:scale-[0.98] active:bg-accent disabled:opacity-60',
                            isQuick ? 'border-primary/25 bg-primary/5' : 'bg-card'
                          )}
                        >
                          {d.label}
                          {isQuick ? <Zap className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="size-3 text-primary" aria-hidden="true" /> one tap: saves, offers the follow-up email, opens the next prospect
                  </p>
                </>
              )}
            </div>
            <div className="hidden flex-wrap gap-1.5 pb-1 lg:flex" role="group" aria-label="One-tap outcomes">
              {QUICK_OUTCOMES.map((o) => (
                <Button
                  key={o}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => quick(o)}
                  className="gap-1.5 border-primary/25 bg-primary/5 hover:bg-primary/10"
                  title={`Save as ${DISPOSITIONS.find((d) => d.value === o)?.label} and open the next prospect`}
                >
                  {KEY_FOR[o] ? (
                    <kbd className="rounded border bg-background px-1 font-mono text-[10px] leading-4 text-muted-foreground">
                      {KEY_FOR[o]}
                    </kbd>
                  ) : null}
                  {QUICK_LABELS[o]}
                </Button>
              ))}
            </div>
            <Select
              id="outcome"
              name="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ProspectDisposition)}
              aria-invalid={errors.outcome ? true : undefined}
              className="max-lg:hidden"
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
            <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground max-lg:hidden">
              <span>Currently: {DISPOSITIONS.find((d) => d.value === disposition)?.label ?? disposition}</span>
              <button
                type="button"
                onClick={() => setShowKeys((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-foreground"
                aria-expanded={showKeys}
              >
                <Keyboard className="size-3.5" aria-hidden="true" /> Shortcuts <kbd className="font-mono">?</kbd>
              </button>
            </p>
            {showKeys ? <ShortcutSheet /> : null}
          </div>

          {show('callback_at') ? (
            <div className="grid grid-cols-2 gap-3">
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

          {show('decision_maker_email') ? (
            <Field label="Best email" htmlFor="decision_maker_email" error={errors.decision_maker_email}>
              <Input
                id="decision_maker_email"
                name="decision_maker_email"
                type="email"
                inputMode="email"
                defaultValue={decisionMakerEmail ?? ''}
                placeholder="Ask: what's the best email for you?"
                autoComplete="off"
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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
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
                  className="col-span-2 sm:col-span-1"
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
              rows={5}
              placeholder="What was said, who you spoke to, anything the next call needs to know."
            />
          </Field>

          {state && !state.ok && state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state && state.ok && state.message ? (
            <p className="text-sm text-emerald-700" role="status">
              {state.message}
            </p>
          ) : null}

          <div className="sticky bottom-0 z-30 -mx-3 flex flex-wrap gap-2 border-t bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur max-lg:[&>button]:flex-1 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:backdrop-blur-none">
            <Button type="submit" name="intent" value="save" disabled={pending || !outcome}>
              <Save className="size-4" aria-hidden="true" />
              {pending ? 'Saving…' : 'Save outcome'}
            </Button>
            <Button
              type="submit"
              name="intent"
              value={withEmail ? 'save_then_email' : 'save_and_next'}
              variant="outline"
              ref={nextRef}
              disabled={pending || !outcome}
            >
              {withEmail ? 'Save, email & next' : 'Save and open next'}
              {withEmail ? <Mail className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ShortcutSheet() {
  const rows: [string, string][] = [
    ...Object.entries(OUTCOME_KEYS).map(
      ([k, o]) =>
        [k, `${DISPOSITIONS.find((d) => d.value === o)?.label}${QUICK_OUTCOMES.includes(o) ? ' — saves & next' : ''}`] as [string, string]
    ),
    ['C', 'Call this number'],
    ['E', 'Email them (follow-up for this outcome)'],
    ['N / →', 'Skip to the next prospect'],
    ['Enter', 'Save and open next'],
    ['?', 'Show / hide this list'],
  ];
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs max-lg:hidden">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([k, label]) => (
          <div key={k} className="flex items-center gap-2">
            <dt>
              <kbd className="inline-block min-w-6 rounded border bg-background px-1 text-center font-mono text-[10px] leading-4">
                {k}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
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
