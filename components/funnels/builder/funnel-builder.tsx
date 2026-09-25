'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown, Copy, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FunnelExperience } from '@/components/funnels/funnel-experience';
import { funnelSchema, type FunnelConfig, type Question } from '@/lib/funnels/schema';
import {
  addOption, addQuestion, duplicateQuestion, moveOption, moveQuestion, removeOption, removeQuestion,
  updateQuestion, type FunnelStatus,
} from '@/lib/funnels/builder';
import { saveFunnelConfig, saveFunnelRouting } from '@/lib/actions/funnel-builder';

type FixedStep = 'qualification' | 'contact' | 'calendar' | 'thanks';
type Selected = { kind: 'question'; id: string } | { kind: 'fixed'; id: FixedStep };

export function FunnelBuilder({
  funnelId, slug, status, initialConfig, initialContractorId, initialVerticalId, contractors, verticals,
}: {
  funnelId: string; slug: string; status: FunnelStatus; initialConfig: FunnelConfig;
  initialContractorId: string | null; initialVerticalId: string | null;
  contractors: { id: string; name: string }[]; verticals: { id: string; name: string }[];
}) {
  const [config, setConfig] = useState(initialConfig);
  const [routing, setRouting] = useState({ contractorId: initialContractorId ?? '', verticalId: initialVerticalId ?? '' });
  const [selected, setSelected] = useState<Selected>({ kind: 'question', id: initialConfig.questions[0]?.id ?? '' });
  const [dirty, setDirty] = useState(false);
  const [routingDirty, setRoutingDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const validity = funnelSchema.safeParse(config);
  const selectedQuestion = selected.kind === 'question' ? config.questions.find(q => q.id === selected.id) : undefined;

  function patch(next: FunnelConfig) { setConfig(next); setDirty(true); setSaveMessage(null); }
  function patchQuestion(id: string, fn: (q: Question) => Question) {
    const q = config.questions.find(q => q.id === id);
    if (q) patch(updateQuestion(config, id, fn(q)));
  }

  function save() {
    startSaving(async () => {
      const result = await saveFunnelConfig(funnelId, config);
      setSaveMessage(result.error ? { tone: 'error', text: result.error } : { tone: 'ok', text: 'Saved.' });
      if (!result.error) setDirty(false);
    });
  }
  function saveRouting() {
    startSaving(async () => {
      const result = await saveFunnelRouting(funnelId, {
        contractorId: routing.contractorId === 'house' || !routing.contractorId ? null : routing.contractorId,
        verticalId: routing.verticalId || null,
      });
      setSaveMessage(result.error ? { tone: 'error', text: result.error } : { tone: 'ok', text: 'Routing saved.' });
      if (!result.error) setRoutingDirty(false);
    });
  }

  const jumpToStep = selected.kind === 'question' ? selected.id : selected.id;
  const previewKey = useMemo(() => `${config.questions.length}:${config.questions.map(q => q.type).join(',')}`, [config.questions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/app/funnels" className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" /> Funnels</Link>
          <span>·</span><span>/estimate/{slug}</span>
          <Badge variant={status === 'published' ? 'success' : status === 'archived' ? 'muted' : 'outline'}>{status}</Badge>
          {!validity.success && <Badge variant="warning">Not publishable: {validity.error.issues[0]?.message}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && <span className={saveMessage.tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{saveMessage.text}</span>}
          <Button asChild variant="outline" size="sm"><Link href={`/estimate/${slug}`} target="_blank">Open live <ExternalLink className="ml-1 size-3.5" /></Link></Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_380px_1fr] lg:items-start">
        {/* LEFT: step list */}
        <Card>
          <CardContent className="space-y-1 p-3">
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Steps</p>
            {config.questions.map((q, i) => (
              <div key={q.id} className={`flex items-center gap-1 rounded-md px-1 py-1 ${selected.kind === 'question' && selected.id === q.id ? 'bg-accent' : ''}`}>
                <button className="flex-1 truncate text-left text-sm" onClick={() => setSelected({ kind: 'question', id: q.id })}>
                  {i + 1}. {q.headline || '(untitled)'} {q.showWhen.length > 0 && <span className="text-muted-foreground">↳</span>}
                </button>
                <button title="Move up" disabled={i === 0} onClick={() => patch(moveQuestion(config, q.id, 'up'))}><ArrowUp className="size-3.5 text-muted-foreground disabled:opacity-30" /></button>
                <button title="Move down" disabled={i === config.questions.length - 1} onClick={() => patch(moveQuestion(config, q.id, 'down'))}><ArrowDown className="size-3.5 text-muted-foreground disabled:opacity-30" /></button>
                <button title="Duplicate" onClick={() => patch(duplicateQuestion(config, q.id))}><Copy className="size-3.5 text-muted-foreground" /></button>
                <button title="Delete" onClick={() => { patch(removeQuestion(config, q.id)); if (selected.kind === 'question' && selected.id === q.id) setSelected({ kind: 'question', id: config.questions[0]?.id ?? '' }); }}>
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 px-1 pt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => patch(addQuestion(config, 'choice'))}><Plus className="mr-1 size-3.5" /> Choice</Button>
              {!config.questions.some(q => q.type === 'zip') && <Button size="sm" variant="outline" onClick={() => patch(addQuestion(config, 'zip'))}>+ ZIP</Button>}
            </div>
            <div className="mt-2 space-y-1 border-t pt-2">
              <button className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${selected.kind === 'fixed' && selected.id === 'qualification' ? 'bg-accent' : ''}`} onClick={() => setSelected({ kind: 'fixed', id: 'qualification' })}>Qualification</button>
              <button className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${selected.kind === 'fixed' && selected.id === 'contact' ? 'bg-accent' : ''}`} onClick={() => setSelected({ kind: 'fixed', id: 'contact' })}>Contact info</button>
              {config.calendarUrl && <button className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${selected.kind === 'fixed' && selected.id === 'calendar' ? 'bg-accent' : ''}`} onClick={() => setSelected({ kind: 'fixed', id: 'calendar' })}>Calendar</button>}
              <button className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${selected.kind === 'fixed' && selected.id === 'thanks' ? 'bg-accent' : ''}`} onClick={() => setSelected({ kind: 'fixed', id: 'thanks' })}>Thank you</button>
            </div>
          </CardContent>
        </Card>

        {/* CENTER: live phone preview */}
        <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-slate-900 shadow-xl">
          <div className="h-[700px] overflow-y-auto bg-white" key={previewKey}>
            <FunnelExperience slug={slug} initialConfig={config} demo={false} previewMode jumpToStep={jumpToStep} />
          </div>
        </div>

        {/* RIGHT: settings for the selected step, plus routing/branding */}
        <div className="space-y-4">
          {selectedQuestion && <StepSettings question={selectedQuestion} allQuestions={config.questions} onChange={fn => patchQuestion(selectedQuestion.id, fn)} />}
          {selected.kind === 'fixed' && selected.id === 'qualification' && (
            <Card><CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Qualification screen</h3>
              <Field label="Qualified message"><Textarea value={config.qualifiedMessage} onChange={e => patch({ ...config, qualifiedMessage: e.target.value })} /></Field>
              <Field label="Review message (not clearly qualified)"><Textarea value={config.reviewMessage} onChange={e => patch({ ...config, reviewMessage: e.target.value })} /></Field>
              <Field label="If not qualified">
                <Select value={config.unqualifiedAction} onChange={e => patch({ ...config, unqualifiedAction: e.target.value as 'review' | 'stop' })}>
                  <option value="review">Let them continue (review later)</option>
                  <option value="stop">Stop here</option>
                </Select>
              </Field>
            </CardContent></Card>
          )}
          {selected.kind === 'fixed' && selected.id === 'contact' && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">
              Name, phone and email are collected with built-in validation, a spam honeypot and TCPA consent —
              this step is not editable to keep that protection intact.
            </CardContent></Card>
          )}
          {selected.kind === 'fixed' && selected.id === 'calendar' && (
            <Card><CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Calendar</h3>
              <Field label="Provider">
                <Select value={config.calendarProvider} onChange={e => patch({ ...config, calendarProvider: e.target.value as 'ghl' | 'calendly' })}>
                  <option value="ghl">GoHighLevel (embedded calendar, server-confirmed)</option>
                  <option value="calendly">Calendly (inline, prefilled)</option>
                </Select>
              </Field>
              <Field label="Calendar URL"><Input value={config.calendarUrl ?? ''} onChange={e => patch({ ...config, calendarUrl: e.target.value })} placeholder="https://…" /></Field>
              {config.calendarProvider === 'ghl' && <Field label="Calendar ID (GHL)"><Input value={config.calendarId ?? ''} onChange={e => patch({ ...config, calendarId: e.target.value })} /></Field>}
              <Field label="Headline"><Input value={config.calendarHeadline ?? ''} onChange={e => patch({ ...config, calendarHeadline: e.target.value })} placeholder="Choose a time for your free estimate" /></Field>
              <Button variant="outline" size="sm" onClick={() => patch({ ...config, calendarUrl: undefined, calendarId: undefined })}>Remove calendar step</Button>
            </CardContent></Card>
          )}
          {selected.kind === 'fixed' && selected.id === 'thanks' && (
            <Card><CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Thank-you screen</h3>
              <Field label="Headline"><Input value={config.thankYouPage.headline} onChange={e => patch({ ...config, thankYouPage: { ...config.thankYouPage, headline: e.target.value } })} /></Field>
              <Field label="Message"><Textarea value={config.thankYouPage.message} onChange={e => patch({ ...config, thankYouPage: { ...config.thankYouPage, message: e.target.value } })} /></Field>
            </CardContent></Card>
          )}

          <Card><CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Branding</h3>
            <Field label="Client name"><Input value={config.clientName} onChange={e => patch({ ...config, clientName: e.target.value })} /></Field>
            <Field label="Industry"><Input value={config.industry} onChange={e => patch({ ...config, industry: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Primary color"><Input value={config.primaryColor} onChange={e => patch({ ...config, primaryColor: e.target.value })} /></Field>
              <Field label="Secondary color"><Input value={config.secondaryColor} onChange={e => patch({ ...config, secondaryColor: e.target.value })} /></Field>
            </div>
            <Field label="Logo (path or https URL)"><Input value={config.clientLogo ?? ''} onChange={e => patch({ ...config, clientLogo: e.target.value || undefined })} /></Field>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Service area &amp; qualification</h3>
            <Field label="Area label"><Input value={config.serviceArea.label} onChange={e => patch({ ...config, serviceArea: { ...config.serviceArea, label: e.target.value } })} /></Field>
            <Field label="ZIP codes (comma-separated)">
              <Textarea value={config.serviceArea.zipCodes.join(', ')} onChange={e => patch({ ...config, serviceArea: { ...config.serviceArea, zipCodes: splitList(e.target.value) } })} />
            </Field>
            <Field label="ZIP prefixes — 3 digits, covers a whole region (comma-separated)">
              <Textarea value={config.serviceArea.zipPrefixes.join(', ')} onChange={e => patch({ ...config, serviceArea: { ...config.serviceArea, zipPrefixes: splitList(e.target.value) } })} />
            </Field>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Routing</h3>
            <p className="text-xs text-muted-foreground">Who this funnel&apos;s leads belong to. Changing this does not move leads already created.</p>
            <Field label="Contractor">
              <Select value={routing.contractorId} onChange={e => { setRouting({ ...routing, contractorId: e.target.value }); setRoutingDirty(true); }}>
                <option value="house">HomeQuote (house lead, unassigned)</option>
                {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Vertical (optional)">
              <Select value={routing.verticalId} onChange={e => { setRouting({ ...routing, verticalId: e.target.value }); setRoutingDirty(true); }}>
                <option value="">None</option>
                {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Button size="sm" variant="outline" onClick={saveRouting} disabled={saving || !routingDirty}>Save routing</Button>
          </CardContent></Card>

          <Card><CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Tracking</h3>
            <Field label="Meta Pixel ID (optional)">
              <Input value={config.trackingPixels.metaPixelId ?? ''} onChange={e => patch({ ...config, trackingPixels: { metaPixelId: e.target.value || undefined } })} />
            </Field>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function StepSettings({ question, allQuestions, onChange }: { question: Question; allQuestions: Question[]; onChange: (fn: (q: Question) => Question) => void }) {
  const earlier = allQuestions.slice(0, allQuestions.findIndex(q => q.id === question.id));
  return (
    <Card><CardContent className="space-y-3 p-4">
      <h3 className="text-sm font-semibold">Step: {question.type === 'zip' ? 'ZIP code' : 'Choice'}</h3>
      <Field label="Headline"><Input value={question.headline} onChange={e => onChange(q => ({ ...q, headline: e.target.value }))} /></Field>
      <Field label="Supporting text (optional)"><Textarea value={question.description ?? ''} onChange={e => onChange(q => ({ ...q, description: e.target.value || undefined }))} /></Field>
      {question.type === 'choice' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Options</p>
          {question.options.map((option, i) => (
            <div key={option.value} className="space-y-1 rounded-md border p-2">
              <div className="flex items-center gap-1">
                <Input className="flex-1" value={option.label} onChange={e => onChange(q => ({ ...q, options: q.options.map(o => o.value === option.value ? { ...o, label: e.target.value } : o) }))} />
                <button title="Featured (visually emphasized)" onClick={() => onChange(q => ({ ...q, options: q.options.map(o => o.value === option.value ? { ...o, featured: !o.featured } : o) }))}>
                  <Badge variant={option.featured ? 'default' : 'outline'} className="cursor-pointer">★</Badge>
                </button>
                <button disabled={i === 0} onClick={() => onChange(q => moveOption(q, option.value, 'up'))}><ArrowUp className="size-3.5 text-muted-foreground disabled:opacity-30" /></button>
                <button disabled={i === question.options.length - 1} onClick={() => onChange(q => moveOption(q, option.value, 'down'))}><ArrowDown className="size-3.5 text-muted-foreground disabled:opacity-30" /></button>
                <button onClick={() => onChange(q => removeOption(q, option.value))}><Trash2 className="size-3.5 text-muted-foreground" /></button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => onChange(q => addOption(q))}><Plus className="mr-1 size-3.5" /> Add option</Button>
        </div>
      )}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">Show this step only if…</p>
        {question.showWhen.map((rule, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1">
            <Select value={rule.question} onChange={e => onChange(q => ({ ...q, showWhen: q.showWhen.map((r, ri) => ri === i ? { ...r, question: e.target.value } : r) }))}>
              {earlier.map(eq => <option key={eq.id} value={eq.id}>{eq.headline || eq.id}</option>)}
            </Select>
            <Select value={rule.operator} onChange={e => onChange(q => ({ ...q, showWhen: q.showWhen.map((r, ri) => ri === i ? { ...r, operator: e.target.value as typeof r.operator } : r) }))}>
              <option value="equals">is</option><option value="not_equals">is not</option><option value="in">is one of</option>
            </Select>
            <Input value={rule.values.join(',')} onChange={e => onChange(q => ({ ...q, showWhen: q.showWhen.map((r, ri) => ri === i ? { ...r, values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) } : r) }))} placeholder="option_value" />
            <button onClick={() => onChange(q => ({ ...q, showWhen: q.showWhen.filter((_, ri) => ri !== i) }))}><Trash2 className="size-3.5 text-muted-foreground" /></button>
          </div>
        ))}
        {earlier.length > 0 && <Button size="sm" variant="outline" onClick={() => onChange(q => ({ ...q, showWhen: [...q.showWhen, { question: earlier[0].id, operator: 'equals', values: [] }] }))}><Plus className="mr-1 size-3.5" /> Add condition</Button>}
        {earlier.length === 0 && <p className="text-xs text-muted-foreground">No earlier step to branch on.</p>}
      </div>
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
function splitList(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}
