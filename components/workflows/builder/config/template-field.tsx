'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FALLBACK_FIELDS, previewTemplate, sampleContext, type GraphEvaluationContext, type GraphIssue } from '@/lib/workflows/graph';
import { Field, IssueMessages } from './forms/shared';
import { VariablePicker } from './variable-picker';

/**
 * Text with merge variables: a variable picker that inserts `{{field}}` at the
 * caret, a live preview rendered by the same renderer the engine uses, a
 * warning for variables that have no value for this lead, and an error for
 * unknown variables. All output is plain text (never HTML).
 */
export function TemplateField({
  value,
  onChange,
  label,
  multiline,
  max,
  ctx,
  readOnly,
  issues = [],
  hint,
  rows,
  required,
  placeholder,
}: {
  value: string;
  onChange(next: string): void;
  label: ReactNode;
  multiline?: boolean;
  max?: number;
  /** Real lead facts for the preview; the built-in sample homeowner when absent. */
  ctx?: GraphEvaluationContext;
  readOnly?: boolean;
  issues?: GraphIssue[];
  hint?: ReactNode;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const nextCaret = useRef<number | null>(null);

  useEffect(() => {
    const pos = nextCaret.current;
    if (pos === null) return;
    nextCaret.current = null;
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pos, pos);
    }
  });

  const base = useMemo(() => ctx ?? sampleContext(), [ctx]);
  const preview = useMemo(() => previewTemplate(value, base), [value, base]);
  const who = String(base.lead?.full_name ?? base.lead?.first_name ?? 'this lead');
  const over = max !== undefined && value.length > max;

  const insert = (field: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const token = `{{${field}}}`;
    nextCaret.current = start + token.length;
    onChange(value.slice(0, start) + token + value.slice(end));
  };

  return (
    <Field label={label} hint={hint} issues={issues} required={required}>
      {(a) => (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              {...a}
              ref={inputRef}
              rows={rows ?? 5}
              value={value}
              disabled={readOnly}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Input {...a} ref={inputRef} value={value} disabled={readOnly} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
          )}
          <div className="flex items-center justify-between gap-2">
            <VariablePicker onPick={insert} disabled={readOnly} />
            {max !== undefined ? (
              <span className={cn('text-xs tabular-nums', over ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                {value.length}/{max}
              </span>
            ) : null}
          </div>

          {preview.unknown.length > 0 ? (
            <div className="space-y-1" role="alert">
              {preview.unknown.map((f) => (
                <p key={f} className="text-xs text-destructive">
                  {`{{${f}}}`} is not a variable HomeQuote knows. Remove it or choose one from the list.
                </p>
              ))}
            </div>
          ) : null}

          {preview.missing.length > 0 ? (
            <IssueMessages
              issues={preview.missing.map((f) => ({
                severity: 'warning' as const,
                code: 'preview_missing',
                message: FALLBACK_FIELDS.has(f)
                  ? `{{${f}}} has no value for this lead, so a generic word will be used instead.`
                  : `{{${f}}} has no value for this lead, so it will be left out.`,
              }))}
            />
          ) : null}

          {value.trim() ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Preview for {who}</p>
              <p className="whitespace-pre-wrap break-words text-sm">{preview.text}</p>
            </div>
          ) : null}
        </div>
      )}
    </Field>
  );
}
