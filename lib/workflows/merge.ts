import type { WorkflowEvaluationContext } from './planner';
import { DEFAULT_WORKFLOW_TIMEZONE } from './wait';

/**
 * The ONE renderer for workflow message text ({{root.key}} merge fields from
 * MERGE_FIELDS in actions.ts). Every workflow email/notification and the
 * builder preview go through renderWorkflowTemplate — do not add another.
 *
 * Rendering rules (production readiness):
 *  - lead.first_name falls back to "there" ("Hi there,"); contractor.name to
 *    "our team". Other missing values render empty, and the space before any
 *    following punctuation is removed, so text never reads "Hi ," or "in .".
 *  - appointment.scheduled_at renders as local time, e.g.
 *    "Friday, September 25 at 2:30 PM", in `timeZone` (default: the canonical
 *    DEFAULT_WORKFLOW_TIMEZONE — contractors have no stored time zone yet).
 *  - estimate.amount renders as currency ("$42,000").
 *  - homequote.* values come from server config (HOMEQUOTE_PHONE,
 *    NEXT_PUBLIC_SITE_URL). When one is not configured, the whole line that
 *    references it is omitted instead of rendering "call  and ...".
 */
export interface WorkflowTemplateSystemValues {
  phone?: string;
  siteUrl?: string;
  /** IANA zone for date/time fields. */
  timeZone?: string;
}

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const FALLBACKS: Record<string, string> = { 'lead.first_name': 'there', 'contractor.name': 'our team' };
const OMIT_LINE_WHEN_MISSING = new Set(['homequote.phone', 'homequote.site_url']);
const EMPTY = '\u0000';

/** "Friday, September 25 at 2:30 PM" in `timeZone`; '' for missing/invalid input. */
export function formatWorkflowDateTime(value: unknown, timeZone: string = DEFAULT_WORKFLOW_TIMEZONE): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(date);
  const p = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
  return `${p('weekday')}, ${p('month')} ${p('day')} at ${p('hour')}:${p('minute')} ${p('dayPeriod').toUpperCase()}`;
}

function formatCurrency(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

function rawValue(values: WorkflowEvaluationContext, field: string, system: WorkflowTemplateSystemValues): string {
  const [root, key] = field.split('.');
  if (root === 'homequote') {
    if (key === 'phone') return system.phone?.trim() ?? '';
    if (key === 'site_url') return system.siteUrl?.trim() ?? '';
    return '';
  }
  const source = values[root as keyof WorkflowEvaluationContext];
  if (!source || typeof source !== 'object' || !(key in source)) return '';
  const value = (source as Record<string, unknown>)[key];
  if (field === 'appointment.scheduled_at') return formatWorkflowDateTime(value, system.timeZone);
  if (field === 'estimate.amount') return formatCurrency(value);
  return value == null ? '' : String(value).trim();
}

/** The value a merge field renders to, including fallbacks ('' = empty). */
export function resolveMergeField(values: WorkflowEvaluationContext, field: string, system: WorkflowTemplateSystemValues = {}): string {
  return rawValue(values, field, system) || FALLBACKS[field] || '';
}

export function renderWorkflowTemplate(
  template: string,
  values: WorkflowEvaluationContext,
  system: WorkflowTemplateSystemValues = {}
): string {
  const lines = template.split('\n').filter((line) =>
    !Array.from(line.matchAll(TOKEN), (m) => m[1]).some((field) => OMIT_LINE_WHEN_MISSING.has(field) && !resolveMergeField(values, field, system))
  );
  const rendered = lines
    .join('\n')
    .replace(TOKEN, (_match, field: string) => resolveMergeField(values, field, system) || EMPTY)
    // An empty value never leaves a gap before punctuation ("in ." -> "in.") ...
    .replace(/[ \t]*\u0000[ \t]*(?=[,.!?;:)])/g, '')
    // ... or a double space in the middle of a sentence.
    .replace(/([ \t])\u0000[ \t]+/g, '$1')
    .replace(/\u0000/g, '');
  return rendered
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
