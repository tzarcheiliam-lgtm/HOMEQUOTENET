'use client';

import { useActionState, useMemo, useState } from 'react';
import { createEmailTemplate, updateEmailTemplate, type EmailTemplateActionState } from '@/lib/actions/email-templates';
import { EMAIL_VARIABLE_GROUPS, findUnknownVariables } from '@/lib/emails/variables';
import { EMAIL_TEMPLATE_CATEGORIES } from '@/lib/emails/template-library';
import type { EmailTemplateRow } from '@/lib/data/email-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function sampleContext() {
  const context: Record<string, Record<string, string>> = {};
  for (const group of EMAIL_VARIABLE_GROUPS) {
    for (const field of group.fields) {
      const [root, key] = field.field.split('.');
      context[root] ??= {};
      context[root][key] = field.example;
    }
  }
  return context;
}

function renderSample(text: string): string {
  const context = sampleContext();
  return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_m, field: string) => {
    const [root, key] = field.split('.');
    return context[root]?.[key] ?? `{{${field}}}`;
  });
}

export function TemplateEditor({ template }: { template?: EmailTemplateRow }) {
  const isNew = !template;
  const boundAction = isNew ? createEmailTemplate : updateEmailTemplate;
  const [state, action, pending] = useActionState<EmailTemplateActionState, FormData>(boundAction, undefined);
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [htmlBody, setHtmlBody] = useState(template?.htmlBody ?? '');
  const [textBody, setTextBody] = useState(template?.textBody ?? '');
  const [tab, setTab] = useState<'html' | 'text' | 'preview'>('html');

  const unknown = useMemo(
    () => Array.from(new Set([...findUnknownVariables(subject), ...findUnknownVariables(htmlBody)])),
    [subject, htmlBody]
  );

  return (
    <form action={action} className="space-y-6">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Template name</Label>
          <Input id="name" name="name" defaultValue={template?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={template?.category ?? EMAIL_TEMPLATE_CATEGORIES[0]}>
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (internal, not sent)</Label>
        <Input id="description" name="description" defaultValue={template?.description ?? ''} maxLength={500} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={300} />
      </div>

      <div className="flex gap-1 border-b text-sm font-medium">
        {(['html', 'text', 'preview'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'html' ? 'HTML body' : t === 'text' ? 'Plain-text fallback' : 'Preview'}
          </button>
        ))}
      </div>

      {tab === 'html' && (
        <div className="space-y-2">
          <Textarea
            name="htmlBody"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={16}
            required
            className="font-mono text-xs"
          />
        </div>
      )}
      {tab === 'text' && (
        <div className="space-y-2">
          <Textarea name="textBody" value={textBody} onChange={(e) => setTextBody(e.target.value)} rows={16} required />
        </div>
      )}
      {tab === 'preview' && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subject: {renderSample(subject) || '(empty)'}
            </p>
            <iframe title="Email preview" className="h-[420px] w-full rounded border bg-white" srcDoc={renderSample(htmlBody)} />
          </CardContent>
        </Card>
      )}
      {tab !== 'preview' && (
        <>
          {/* hidden fields so switching tabs never drops the other body */}
          {tab !== 'html' && <input type="hidden" name="htmlBody" value={htmlBody} />}
          {tab !== 'text' && <input type="hidden" name="textBody" value={textBody} />}
        </>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Available variables</p>
        {EMAIL_VARIABLE_GROUPS.map((g) => (
          <p key={g.group}>
            <span className="font-medium">{g.group}:</span> {g.fields.map((f) => `{{${f.field}}}`).join(' · ')}
          </p>
        ))}
        {unknown.length > 0 && (
          <p className="mt-2 font-medium text-amber-700">
            Unknown variable{unknown.length === 1 ? '' : 's'} (will render blank): {unknown.map((v) => `{{${v}}}`).join(', ')}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="contractorVisible" defaultChecked={template?.contractorVisible} />
        Contractors can see and use this template
      </label>

      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state && state.ok && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : isNew ? 'Create template' : 'Save changes'}
      </Button>
    </form>
  );
}
