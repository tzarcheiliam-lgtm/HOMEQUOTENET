'use client';

import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BuilderLookups } from '@/lib/data/workflow-graph';
import type { GraphEvaluationContext, GraphIssue, WorkflowGraph } from '@/lib/workflows/graph';

export type Config = Record<string, unknown>;

/** What every per-type form receives. */
export interface FormProps {
  nodeId: string;
  config: Config;
  /** Always called with a NEW config object. */
  onChange(config: Config): void;
  readOnly: boolean;
  /** Every issue for THIS step; each form shows the ones whose `field` matches a control it renders. */
  issues: GraphIssue[];
  lookups: BuilderLookups;
  contractorId: string | null;
  graph: WorkflowGraph;
  ctx: GraphEvaluationContext;
}

// ---------------------------------------------------------------------------
// Small value helpers (config is untyped JSON: never trust its shape)
// ---------------------------------------------------------------------------
export const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
export const asNumber = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
export const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
export const asRecord = (v: unknown): Config => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Config) : {});

/** A copy of `config` without the given keys. */
export function without(config: Config, ...keys: string[]): Config {
  const next: Config = { ...config };
  for (const k of keys) delete next[k];
  return next;
}

/** Issues about `field` or anything nested under it (`branches.0.x` matches `branches`). */
export function issuesFor(issues: GraphIssue[], field: string): GraphIssue[] {
  return issues.filter((i) => i.field !== undefined && (i.field === field || i.field.startsWith(`${field}.`)));
}

export function formatMinutes(total: number): string {
  if (total >= 1440 && total % 1440 === 0) return `${total / 1440} ${total / 1440 === 1 ? 'day' : 'days'}`;
  if (total >= 60 && total % 60 === 0) return `${total / 60} ${total / 60 === 1 ? 'hour' : 'hours'}`;
  return `${total} ${total === 1 ? 'minute' : 'minutes'}`;
}

export function formatHour(hour: number): string {
  if (hour === 24) return '12:00 AM (end of day)';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export function IssueMessages({ id, issues }: { id?: string; issues: GraphIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div id={id} className="space-y-1">
      {issues.map((issue, i) => (
        <p
          key={`${issue.code}-${i}`}
          className={cn('flex items-start gap-1.5 text-xs', issue.severity === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400')}
        >
          {issue.severity === 'error' ? <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />}
          <span>{issue.message}</span>
        </p>
      ))}
    </div>
  );
}

/** A quiet explanatory box. `warn` is amber; never red (red is reserved for blocking errors). */
export function Callout({ children, tone = 'info', className }: { children: ReactNode; tone?: 'info' | 'warn' | 'ok'; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border p-3 text-xs leading-relaxed',
        tone === 'info' && 'border-border bg-muted/40 text-muted-foreground',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
        className
      )}
    >
      {tone === 'warn' ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper: visible label + hint + inline issues + aria wiring
// ---------------------------------------------------------------------------
export interface ControlA11y {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export function Field({
  label,
  hint,
  issues = [],
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  issues?: GraphIssue[];
  required?: boolean;
  className?: string;
  children: (a11y: ControlA11y) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const msgId = `${id}-msg`;
  const describedBy = [hint ? hintId : null, issues.length ? msgId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="text-muted-foreground">*</span> : null}
      </Label>
      {children({ id, 'aria-invalid': issues.some((i) => i.severity === 'error') ? true : undefined, 'aria-describedby': describedBy })}
      {hint ? <p id={hintId} className="text-xs text-muted-foreground">{hint}</p> : null}
      <IssueMessages id={msgId} issues={issues} />
    </div>
  );
}

/** Groups several controls under one visible legend (checkbox lists, toggle rows). */
export function Group({ legend, hint, issues = [], children, className }: { legend: ReactNode; hint?: ReactNode; issues?: GraphIssue[]; children: ReactNode; className?: string }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, issues.length ? `${id}-msg` : null].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset className={cn('min-w-0 space-y-1.5', className)} aria-describedby={describedBy} aria-invalid={issues.some((i) => i.severity === 'error') ? true : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      {children}
      {hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      <IssueMessages id={`${id}-msg`} issues={issues} />
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Checkbox list
// ---------------------------------------------------------------------------
export interface CheckOption {
  value: string;
  label: string;
  hint?: string;
}

export function CheckList({
  legend,
  hint,
  options,
  selected,
  onChange,
  disabled,
  issues,
  emptyText,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  options: CheckOption[];
  selected: string[];
  onChange(next: string[]): void;
  disabled?: boolean;
  issues?: GraphIssue[];
  emptyText?: string;
}) {
  return (
    <Group legend={legend} hint={hint} issues={issues}>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText ?? 'Nothing to choose from.'}</p>
      ) : (
        <div className="divide-y rounded-md border">
          {options.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <label key={o.value} className={cn('flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2.5', disabled && 'cursor-not-allowed opacity-60')}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                />
                <span className="min-w-0 text-sm leading-snug">
                  {o.label}
                  {o.hint ? <span className="block text-xs text-muted-foreground">{o.hint}</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Whole-number input: keeps the typed text so the field can be cleared
// ---------------------------------------------------------------------------
const parseInt10 = (t: string): number | undefined => (/^\d{1,9}$/.test(t.trim()) ? Number(t.trim()) : undefined);

export function IntField({
  label,
  value,
  onCommit,
  min,
  max,
  optional,
  suffix,
  hint,
  issues,
  disabled,
  placeholder,
}: {
  label: ReactNode;
  value: number | undefined;
  onCommit(next: number | undefined): void;
  min?: number;
  max?: number;
  optional?: boolean;
  suffix?: string;
  hint?: ReactNode;
  issues?: GraphIssue[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [seen, setSeen] = useState(value);
  // Re-sync only when the committed value changed from outside (undo, mode switch), never while typing.
  if (value !== seen) {
    setSeen(value);
    if (parseInt10(text) !== value && !(value === undefined && text.trim() === '')) setText(value === undefined ? '' : String(value));
  }
  const parsed = parseInt10(text);
  const outOfRange = parsed !== undefined && ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));
  const bad = text.trim() !== '' && parsed === undefined;
  const local: GraphIssue[] = [];
  if (bad) local.push({ severity: 'warning', code: 'local_number', message: 'Enter a whole number.' });
  else if (outOfRange) local.push({ severity: 'warning', code: 'local_range', message: `Enter a number between ${min ?? 0} and ${max ?? 'the maximum'}.` });
  const all = [...(issues ?? []), ...local];

  return (
    <Field label={label} hint={hint} issues={all}>
      {(a) => (
        <div className="flex items-center gap-2">
          <Input
            {...a}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="max-w-28 tabular-nums"
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={a['aria-invalid'] || bad || outOfRange ? true : undefined}
            onChange={(e) => {
              const t = e.target.value;
              setText(t);
              const n = parseInt10(t);
              if (n !== undefined) onCommit(n);
              else if (optional && t.trim() === '') onCommit(undefined);
            }}
            onBlur={() => {
              if (parseInt10(text) === undefined && !(optional && text.trim() === '')) setText(value === undefined ? '' : String(value));
            }}
          />
          {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Duration input: whole number + unit, stored as minutes
// ---------------------------------------------------------------------------
export type DurationUnit = 'minutes' | 'hours' | 'days';
const UNIT_MINUTES: Record<DurationUnit, number> = { minutes: 1, hours: 60, days: 1440 };
const UNIT_LABEL: Record<DurationUnit, string> = { minutes: 'minutes', hours: 'hours', days: 'days' };

function bestUnit(minutes: number | undefined, units: DurationUnit[], fallback: DurationUnit): DurationUnit {
  if (minutes && minutes > 0) {
    for (const u of ['days', 'hours', 'minutes'] as const) if (units.includes(u) && minutes % UNIT_MINUTES[u] === 0) return u;
  }
  return units.includes(fallback) ? fallback : units[0];
}

export function DurationField({
  label,
  minutes,
  onChange,
  units = ['minutes', 'hours', 'days'],
  defaultUnit = 'hours',
  min,
  max,
  optional,
  hint,
  issues,
  disabled,
}: {
  label: ReactNode;
  minutes: number | undefined;
  onChange(next: number | undefined): void;
  units?: DurationUnit[];
  defaultUnit?: DurationUnit;
  min?: number;
  max?: number;
  optional?: boolean;
  hint?: ReactNode;
  issues?: GraphIssue[];
  disabled?: boolean;
}) {
  const initialUnit = bestUnit(minutes, units, defaultUnit);
  const [unit, setUnit] = useState<DurationUnit>(initialUnit);
  const [text, setText] = useState(minutes === undefined ? '' : String(minutes / UNIT_MINUTES[initialUnit]));
  const [seen, setSeen] = useState(minutes);
  if (minutes !== seen) {
    setSeen(minutes);
    const typed = parseInt10(text);
    const typedMinutes = typed === undefined ? undefined : typed * UNIT_MINUTES[unit];
    if (typedMinutes !== minutes && !(minutes === undefined && text.trim() === '')) {
      const u = bestUnit(minutes, units, unit);
      setUnit(u);
      setText(minutes === undefined ? '' : String(minutes / UNIT_MINUTES[u]));
    }
  }
  const typed = parseInt10(text);
  const total = typed === undefined ? undefined : typed * UNIT_MINUTES[unit];
  const bad = text.trim() !== '' && typed === undefined;
  const outOfRange = total !== undefined && ((min !== undefined && total < min) || (max !== undefined && total > max));
  const local: GraphIssue[] = [];
  if (bad) local.push({ severity: 'warning', code: 'local_number', message: 'Enter a whole number.' });
  else if (outOfRange) local.push({ severity: 'warning', code: 'local_range', message: `Choose between ${formatMinutes(min ?? 0)} and ${max !== undefined ? formatMinutes(max) : 'the maximum'}.` });
  const all = [...(issues ?? []), ...local];

  return (
    <Field label={label} hint={hint} issues={all}>
      {(a) => (
        <div className="flex items-center gap-2">
          <Input
            {...a}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="max-w-24 tabular-nums"
            value={text}
            disabled={disabled}
            aria-invalid={a['aria-invalid'] || bad || outOfRange ? true : undefined}
            onChange={(e) => {
              const t = e.target.value;
              setText(t);
              const n = parseInt10(t);
              if (n !== undefined) onChange(n * UNIT_MINUTES[unit]);
              else if (optional && t.trim() === '') onChange(undefined);
            }}
            onBlur={() => {
              if (parseInt10(text) === undefined && !(optional && text.trim() === '')) {
                const u = bestUnit(minutes, units, unit);
                setUnit(u);
                setText(minutes === undefined ? '' : String(minutes / UNIT_MINUTES[u]));
              }
            }}
          />
          <Select
            aria-label={`${typeof label === 'string' ? label : 'Time'} unit`}
            className="max-w-32"
            value={unit}
            disabled={disabled}
            onChange={(e) => {
              const u = e.target.value as DurationUnit;
              setUnit(u);
              if (typed !== undefined) onChange(typed * UNIT_MINUTES[u]);
            }}
          >
            {units.map((u) => (
              <option key={u} value={u}>{UNIT_LABEL[u]}</option>
            ))}
          </Select>
        </div>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Hour select
// ---------------------------------------------------------------------------
export function HourSelect({
  label,
  value,
  onChange,
  from,
  to,
  defaultLabel,
  hint,
  issues,
  disabled,
}: {
  label: ReactNode;
  value: number | undefined;
  onChange(next: number | undefined): void;
  from: number;
  to: number;
  /** When set, an empty first option with this label means "not set". */
  defaultLabel?: string;
  hint?: ReactNode;
  issues?: GraphIssue[];
  disabled?: boolean;
}) {
  const hours: number[] = [];
  for (let h = from; h <= to; h += 1) hours.push(h);
  return (
    <Field label={label} hint={hint} issues={issues}>
      {(a) => (
        <Select
          {...a}
          value={value === undefined ? '' : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        >
          {defaultLabel ? <option value="">{defaultLabel}</option> : null}
          {hours.map((h) => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </Select>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// "If this step fails"
// ---------------------------------------------------------------------------
export function OnErrorField({ config, onChange, readOnly, issues }: Pick<FormProps, 'config' | 'onChange' | 'readOnly' | 'issues'>) {
  return (
    <Field
      label="If this step fails"
      hint="Choose what happens if this step cannot be completed (for example, a temporary problem that keeps repeating)."
      issues={issuesFor(issues, 'onError')}
    >
      {(a) => (
        <Select {...a} value={config.onError === 'continue' ? 'continue' : 'fail_run'} disabled={readOnly} onChange={(e) => onChange({ ...config, onError: e.target.value })}>
          <option value="fail_run">Stop the workflow</option>
          <option value="continue">Keep going</option>
        </Select>
      )}
    </Field>
  );
}
