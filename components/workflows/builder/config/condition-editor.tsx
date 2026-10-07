'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CONDITION_FIELDS,
  conditionField,
  type ConditionFieldDefinition,
  type ConditionScalar,
  type WorkflowCondition,
  type WorkflowConditionGroup,
  type WorkflowConditionOperator,
} from '@/lib/workflows';
import type { GraphIssue } from '@/lib/workflows/graph';
import { CheckList, Callout, Field, IssueMessages } from './forms/shared';

const MAX_RULES = 12;

const OPERATOR_LABELS: Record<WorkflowConditionOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  in: 'is any of',
  not_in: 'is none of',
  exists: 'has a value',
  not_exists: 'is empty',
  greater_than: 'is greater than',
  less_than: 'is less than',
};

const FIELD_GROUPS: { root: string; label: string }[] = [
  { root: 'lead', label: 'Homeowner & lead' },
  { root: 'assignment', label: 'Contractor pipeline' },
  { root: 'appointment', label: 'Appointment' },
  { root: 'estimate', label: 'Estimate' },
  { root: 'call', label: 'AI call' },
  { root: 'contractor', label: 'Contractor' },
];

const isGroup = (n: WorkflowCondition | WorkflowConditionGroup): n is WorkflowConditionGroup => 'match' in n;
const humanize = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Operators that make sense for a field. */
function operatorsFor(def: ConditionFieldDefinition | undefined): WorkflowConditionOperator[] {
  const presence: WorkflowConditionOperator[] = ['exists', 'not_exists'];
  if (!def) return ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', ...presence];
  switch (def.valueType) {
    case 'boolean':
      return ['equals', 'not_equals', ...presence];
    case 'number':
      return ['equals', 'not_equals', 'greater_than', 'less_than', ...presence];
    case 'datetime':
      return ['greater_than', 'less_than', ...presence];
    case 'string_array':
      return ['contains', 'not_contains', ...presence];
    case 'uuid':
      return ['equals', 'not_equals', 'in', 'not_in', ...presence];
    default:
      return def.enumValues
        ? ['equals', 'not_equals', 'in', 'not_in', ...presence]
        : ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', ...presence];
  }
}

function defaultValue(def: ConditionFieldDefinition | undefined): ConditionScalar {
  if (def?.enumValues?.[0]) return def.enumValues[0];
  if (def?.valueType === 'boolean') return true;
  if (def?.valueType === 'number') return 0;
  return '';
}

function leafFor(field: string): WorkflowCondition {
  return { field, operator: 'equals', value: defaultValue(conditionField(field)) };
}

/** Adapt the value to the operator's shape (none / single / list). */
function withOperator(leaf: WorkflowCondition, operator: WorkflowConditionOperator): WorkflowCondition {
  const def = conditionField(leaf.field);
  const base = { field: leaf.field, operator };
  if (operator === 'exists' || operator === 'not_exists') return base;
  const current = leaf.value;
  if (operator === 'in' || operator === 'not_in') {
    if (Array.isArray(current)) return { ...base, value: current };
    return { ...base, value: current === undefined || current === '' ? [] : [current] };
  }
  const single = Array.isArray(current) ? current[0] : current;
  if (operator === 'greater_than' || operator === 'less_than') return { ...base, value: def?.valueType === 'datetime' ? (typeof single === 'string' ? single : '') : typeof single === 'number' ? single : 0 };
  return { ...base, value: single === undefined ? defaultValue(def) : single };
}

const toLocalInput = (iso: unknown): string => {
  if (typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Number input that keeps its typed text. Remounted (via key) when the field/operator changes. */
function NumberValue({ value, onCommit, disabled, a11y }: { value: unknown; onCommit(n: number): void; disabled: boolean; a11y: { id: string; 'aria-invalid'?: true } }) {
  const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
  return (
    <Input
      {...a11y}
      type="text"
      inputMode="decimal"
      className="tabular-nums"
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n);
      }}
    />
  );
}

/** Comma-separated list input that keeps its typed text. */
function ListValue({ value, onCommit, disabled, a11y }: { value: unknown; onCommit(v: string[]): void; disabled: boolean; a11y: { id: string; 'aria-invalid'?: true } }) {
  const [text, setText] = useState(Array.isArray(value) ? value.join(', ') : '');
  return (
    <Input
      {...a11y}
      value={text}
      disabled={disabled}
      placeholder="Separate values with commas"
      onChange={(e) => {
        setText(e.target.value);
        onCommit(e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

function LeafRow({
  leaf,
  index,
  onChange,
  onRemove,
  readOnly,
  allowGraphOnly,
}: {
  leaf: WorkflowCondition;
  index: number;
  onChange(next: WorkflowCondition): void;
  onRemove(): void;
  readOnly: boolean;
  allowGraphOnly: boolean;
}) {
  const def = conditionField(leaf.field);
  const available = (CONDITION_FIELDS as readonly ConditionFieldDefinition[]).filter((f) => f.availability === 'ready' && (allowGraphOnly || !f.graphOnly));
  const known = available.some((f) => f.field === leaf.field);
  const operators = operatorsFor(def);
  if (!operators.includes(leaf.operator)) operators.push(leaf.operator);
  const noValue = leaf.operator === 'exists' || leaf.operator === 'not_exists';
  const isList = leaf.operator === 'in' || leaf.operator === 'not_in';
  const valueKey = `${leaf.field}|${leaf.operator}`;
  const operatorLabel = (op: WorkflowConditionOperator) =>
    def?.valueType === 'datetime' && op === 'greater_than' ? 'is after' : def?.valueType === 'datetime' && op === 'less_than' ? 'is before' : OPERATOR_LABELS[op];

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rule {index + 1}</p>
        <Button type="button" variant="ghost" size="icon" disabled={readOnly} aria-label={`Remove rule ${index + 1}`} onClick={onRemove}>
          <Trash2 aria-hidden />
        </Button>
      </div>

      <Field label="Field">
        {(a) => (
          <Select {...a} value={leaf.field} disabled={readOnly} onChange={(e) => onChange(leafFor(e.target.value))}>
            {!known ? <option value={leaf.field}>{def?.label ?? leaf.field} (not available here)</option> : null}
            {FIELD_GROUPS.map((g) => {
              const fields = available.filter((f) => f.field.split('.')[0] === g.root);
              if (fields.length === 0) return null;
              return (
                <optgroup key={g.root} label={g.label}>
                  {fields.map((f) => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        )}
      </Field>

      <Field label="Condition">
        {(a) => (
          <Select {...a} value={leaf.operator} disabled={readOnly} onChange={(e) => onChange(withOperator(leaf, e.target.value as WorkflowConditionOperator))}>
            {operators.map((op) => (
              <option key={op} value={op}>{operatorLabel(op)}</option>
            ))}
          </Select>
        )}
      </Field>

      {noValue ? null : isList && def?.enumValues ? (
        <CheckList
          legend="Value"
          options={def.enumValues.map((v) => ({ value: v, label: humanize(v) }))}
          selected={Array.isArray(leaf.value) ? leaf.value.map(String) : []}
          disabled={readOnly}
          onChange={(next) => onChange({ ...leaf, value: next })}
        />
      ) : (
        <Field label="Value">
          {(a) => {
            if (isList) return <ListValue key={valueKey} value={leaf.value} disabled={readOnly} a11y={a} onCommit={(v) => onChange({ ...leaf, value: v })} />;
            if (def?.enumValues) {
              return (
                <Select {...a} value={typeof leaf.value === 'string' ? leaf.value : ''} disabled={readOnly} onChange={(e) => onChange({ ...leaf, value: e.target.value })}>
                  {typeof leaf.value === 'string' && !def.enumValues!.includes(leaf.value) ? <option value={leaf.value}>{leaf.value || 'Choose…'}</option> : null}
                  {def.enumValues!.map((v) => (
                    <option key={v} value={v}>{humanize(v)}</option>
                  ))}
                </Select>
              );
            }
            if (def?.valueType === 'boolean') {
              return (
                <Select {...a} value={leaf.value === false ? 'false' : 'true'} disabled={readOnly} onChange={(e) => onChange({ ...leaf, value: e.target.value === 'true' })}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              );
            }
            if (def?.valueType === 'number') {
              return <NumberValue key={valueKey} value={leaf.value} disabled={readOnly} a11y={a} onCommit={(n) => onChange({ ...leaf, value: n })} />;
            }
            if (def?.valueType === 'datetime') {
              return (
                <Input
                  {...a}
                  type="datetime-local"
                  value={toLocalInput(leaf.value)}
                  disabled={readOnly}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    onChange({ ...leaf, value: e.target.value && !Number.isNaN(d.getTime()) ? d.toISOString() : '' });
                  }}
                />
              );
            }
            return <Input {...a} value={typeof leaf.value === 'string' ? leaf.value : leaf.value === undefined ? '' : String(leaf.value)} disabled={readOnly} onChange={(e) => onChange({ ...leaf, value: e.target.value })} />;
          }}
        </Field>
      )}
    </div>
  );
}

/**
 * One level of AND / OR over simple rules. Nested groups created elsewhere are
 * preserved (shown as "advanced rules preserved") and can only be removed here.
 *
 * `nullable`: an empty editor reports `null` (no rule) instead of an empty group.
 * `allowGraphOnly`: also offer the AI call / estimate fields (valid after a call or
 * in condition steps; not valid in a trigger's entry rules).
 */
export function ConditionGroupEditor({
  value,
  onChange,
  readOnly,
  allowGraphOnly = false,
  nullable = false,
  issues = [],
  emptyText = 'No rules yet.',
}: {
  value: WorkflowConditionGroup | null | undefined;
  onChange(next: WorkflowConditionGroup | null): void;
  readOnly: boolean;
  allowGraphOnly?: boolean;
  nullable?: boolean;
  issues?: GraphIssue[];
  emptyText?: string;
}) {
  // Bumped when a rule is removed so rows (which keep typed text) remount instead of showing a neighbour's text.
  const [version, setVersion] = useState(0);
  const group: WorkflowConditionGroup = value && Array.isArray(value.conditions) ? value : { match: 'all', conditions: [] };
  const emit = (next: WorkflowConditionGroup) => onChange(nullable && next.conditions.length === 0 ? null : next);
  const setAt = (i: number, node: WorkflowCondition | WorkflowConditionGroup) => emit({ ...group, conditions: group.conditions.map((c, idx) => (idx === i ? node : c)) });
  const removeAt = (i: number) => {
    setVersion((v) => v + 1);
    emit({ ...group, conditions: group.conditions.filter((_, idx) => idx !== i) });
  };
  const firstField = ((CONDITION_FIELDS as readonly ConditionFieldDefinition[]).find((f) => f.availability === 'ready' && (allowGraphOnly || !f.graphOnly)) ?? CONDITION_FIELDS[0]).field;
  const defaultField = conditionField('lead.status') && (allowGraphOnly || !conditionField('lead.status')!.graphOnly) ? 'lead.status' : firstField;
  let ruleNo = 0;

  return (
    <div className="space-y-3">
      {group.conditions.length > 1 ? (
        <Field label="Match">
          {(a) => (
            <Select {...a} value={group.match} disabled={readOnly} onChange={(e) => emit({ ...group, match: e.target.value === 'any' ? 'any' : 'all' })}>
              <option value="all">All of these rules (AND)</option>
              <option value="any">Any of these rules (OR)</option>
            </Select>
          )}
        </Field>
      ) : null}

      {group.conditions.length === 0 ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null}

      {group.conditions.map((node, i) => {
        if (isGroup(node)) {
          return (
            <div key={`${version}-${i}`} className="flex items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <p>
                Advanced rules preserved. A group of {node.conditions.length} nested {node.conditions.length === 1 ? 'rule' : 'rules'} still applies, but it cannot be edited here.
              </p>
              <Button type="button" variant="ghost" size="sm" disabled={readOnly} onClick={() => removeAt(i)}>
                Remove
              </Button>
            </div>
          );
        }
        const n = ruleNo;
        ruleNo += 1;
        return <LeafRow key={`${version}-${i}`} leaf={node} index={n} readOnly={readOnly} allowGraphOnly={allowGraphOnly} onChange={(next) => setAt(i, next)} onRemove={() => removeAt(i)} />;
      })}

      <Button
        type="button"
        variant="outline"
        disabled={readOnly || group.conditions.length >= MAX_RULES}
        onClick={() => emit({ ...group, conditions: [...group.conditions, leafFor(defaultField)] })}
      >
        <Plus aria-hidden /> Add a rule
      </Button>
      {group.conditions.length >= MAX_RULES ? <Callout>Keep it simple: at most {MAX_RULES} rules in one group.</Callout> : null}
      <IssueMessages issues={issues} />
    </div>
  );
}
