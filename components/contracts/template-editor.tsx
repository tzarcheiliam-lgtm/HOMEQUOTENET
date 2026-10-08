'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, ArrowDown, ArrowUp, Copy, Eye, FileText, GripVertical, Loader2, Plus, Settings2, Star, Trash2, UploadCloud, PenLine } from 'lucide-react';
import { DocumentView } from '@/components/contracts/document-view';
import { PdfPreview } from '@/components/contracts/pdf-preview';
import { RichEditor } from '@/components/contracts/rich-editor';
import { SaveIndicator, useAutosave } from '@/components/contracts/use-autosave';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { archiveTemplateAction, deleteTemplateAction, duplicateTemplateAction, previewTemplateAction, publishTemplateAction, saveTemplateAction, setDefaultTemplateAction } from '@/lib/actions/contracts';
import { SECTION_LIBRARY } from '@/lib/contracts/library';
import { buildRenderModel } from '@/lib/contracts/render-model';
import { BRANDING_MODES, BRANDING_MODE_LABELS, emptyDoc, type Branding, type ContractSection } from '@/lib/contracts/types';
import { VARIABLE_BY_KEY, usedVariables, placeholderCount } from '@/lib/contracts/variables';
import { cn } from '@/lib/utils';

export interface TemplateDraft {
  name: string; description: string; category: string; sections: ContractSection[]; signerRoles: { key: string; label: string }[];
  defaultVariables: Record<string, string>; branding: Branding; requiresReview: boolean;
}
export interface TemplateEditorProps {
  id: string; initial: TemplateDraft; status: 'draft' | 'published' | 'archived'; isDefault: boolean; latestVersionNo: number; usageCount: number; categories: string[];
}
type Tab = 'edit' | 'preview' | 'pdf' | 'settings';
const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'edit', label: 'Edit', icon: PenLine }, { id: 'preview', label: 'Preview', icon: Eye }, { id: 'pdf', label: 'PDF preview', icon: FileText }, { id: 'settings', label: 'Settings', icon: Settings2 },
];
const uid = (k: string) => `${k}-${Math.random().toString(36).slice(2, 8)}`;

export function TemplateEditor({ id, initial, status, isDefault, latestVersionNo, usageCount, categories }: TemplateEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<TemplateDraft>(initial);
  const [tab, setTab] = useState<Tab>('edit');
  const [activeId, setActiveId] = useState(initial.sections[0]?.id ?? '');
  const [dragId, setDragId] = useState<string | null>(null);
  const [pdfKey, setPdfKey] = useState(0);
  const [busy, startBusy] = useTransition();

  const { state, flush } = useAutosave({
    value: draft,
    save: async (d) => {
      const r = await saveTemplateAction(id, { name: d.name, description: d.description, category: d.category, sections: d.sections, signerRoles: d.signerRoles, defaultVariables: d.defaultVariables, branding: d.branding, requiresReview: d.requiresReview });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
  });

  const update = useCallback((patch: Partial<TemplateDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const patchSection = (sid: string, patch: Partial<ContractSection>) => setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  const active = draft.sections.find((s) => s.id === activeId) ?? draft.sections[0];

  const move = (sid: string, to: number) => setDraft((d) => {
    const from = d.sections.findIndex((s) => s.id === sid);
    if (from < 0 || to < 0 || to >= d.sections.length || from === to) return d;
    const next = d.sections.slice(); const [item] = next.splice(from, 1); next.splice(to, 0, item);
    return { ...d, sections: next };
  });
  const addSection = (key: string) => {
    const entry = SECTION_LIBRARY.find((e) => e.key === key);
    const s: ContractSection = entry ? { ...entry.build(), id: uid(key) } : { id: uid('custom'), key: 'custom', kind: 'rich', title: 'New section', showTitle: true, numbered: true, pageBreakBefore: false, doc: emptyDoc() };
    if (s.kind === 'signatures' && draft.sections.some((x) => x.kind === 'signatures')) { toast('This template already has a Signatures section.', 'error'); return; }
    setDraft((d) => {
      // keep Signatures last
      const sigIdx = d.sections.findIndex((x) => x.kind === 'signatures');
      const at = s.kind === 'rich' && sigIdx >= 0 ? sigIdx : d.sections.length;
      const next = d.sections.slice(); next.splice(at, 0, s);
      return { ...d, sections: next };
    });
    setActiveId(s.id); setTab('edit');
  };
  const removeSection = (sid: string) => {
    setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== sid) }));
    if (activeId === sid) setActiveId(draft.sections.find((s) => s.id !== sid)?.id ?? '');
  };

  const used = useMemo(() => usedVariables(draft.sections), [draft.sections]);
  const placeholders = useMemo(() => placeholderCount(draft.sections), [draft.sections]);
  const sampleValues = useMemo(() => {
    const v: Record<string, string> = {};
    for (const k of used.known) { const def = VARIABLE_BY_KEY.get(k); v[k] = draft.defaultVariables[k]?.trim() || (def?.source === 'branding' ? '' : def?.example ?? ''); }
    return v;
  }, [used.known, draft.defaultVariables]);
  const model = useMemo(() => buildRenderModel(draft.sections, sampleValues), [draft.sections, sampleValues]);
  const hasSignatures = draft.sections.some((s) => s.kind === 'signatures');
  const problems = [
    ...(used.unknown.length ? [`Unknown merge fields: ${used.unknown.map((k) => `{{${k}}}`).join(', ')}`] : []),
    ...(!hasSignatures ? ['Add a Signatures section'] : []),
  ];

  const act = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, ok: (r: Record<string, unknown>) => void) =>
    startBusy(async () => { const r = await fn(); if (!r.ok) toast(r.error ?? 'Something went wrong.', 'error'); else ok(r); });

  const publish = () => act(async () => { if (!(await flush())) return { ok: false, error: 'Fix the save error first.' }; return publishTemplateAction(id); }, (r) => { toast(r.unchanged ? 'Already up to date.' : `Published version ${r.versionNo}.`); router.refresh(); });
  const canPublish = !problems.length && !busy;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <label className="sr-only" htmlFor="tpl-name">Template name</label>
          <Input id="tpl-name" value={draft.name} onChange={(e) => update({ name: e.target.value })} maxLength={120} className="h-11 max-w-xl border-transparent px-1 text-xl font-semibold shadow-none hover:border-input focus-visible:border-ring lg:h-10" />
          <div className="flex flex-wrap items-center gap-2 px-1">
            <Badge variant={status === 'published' ? 'success' : status === 'archived' ? 'muted' : 'warning'}>{status === 'published' ? `Published · v${latestVersionNo}` : status === 'archived' ? 'Archived' : 'Draft'}</Badge>
            {isDefault && <Badge variant="info"><Star aria-hidden="true" /> Default</Badge>}
            {draft.requiresReview && <Badge variant="warning">Starter wording - needs legal review</Badge>}
            <span className="text-xs text-muted-foreground">{usageCount} agreement{usageCount === 1 ? '' : 's'} created</span>
            <SaveIndicator state={state} onRetry={() => void flush()} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={publish} disabled={!canPublish || status === 'archived'} title={problems[0]}>{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} {status === 'published' ? 'Publish changes' : 'Publish'}</Button>
          <Button variant="outline" disabled={busy} onClick={() => act(() => duplicateTemplateAction(id), (r) => { toast('Template duplicated.'); router.push(`/app/contracts/templates/${r.id}`); })}><Copy className="size-4" /> Duplicate</Button>
          {status === 'published' && !isDefault && <Button variant="outline" disabled={busy} onClick={() => act(() => setDefaultTemplateAction(id), () => { toast('Set as the default template.'); router.refresh(); })}><Star className="size-4" /> Make default</Button>}
          {status !== 'archived' ? <Button variant="outline" disabled={busy} onClick={() => act(() => archiveTemplateAction(id, true), () => { toast('Template archived.'); router.push('/app/contracts/templates'); })}><Archive className="size-4" /> Archive</Button>
            : <Button variant="outline" disabled={busy} onClick={() => act(() => archiveTemplateAction(id, false), () => { toast('Template restored.'); router.refresh(); })}>Restore</Button>}
          <Button variant="destructive-outline" disabled={busy || usageCount > 0} title={usageCount > 0 ? 'Used by agreements. Archive it instead.' : undefined}
            onClick={() => { if (window.confirm('Delete this template permanently? This cannot be undone.')) act(() => deleteTemplateAction(id), () => { toast('Template deleted.'); router.push('/app/contracts/templates'); }); }}><Trash2 className="size-4" /> Delete</Button>
        </div>
      </div>

      {problems.length > 0 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{problems.join(' · ')}</div>}

      <div role="tablist" aria-label="Template views" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} type="button"
            onClick={() => { setTab(t.id); if (t.id === 'pdf') setPdfKey((k) => k + 1); }}
            className={cn('-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <t.icon className="size-4" aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'edit' && (
        <div id="panel-edit" role="tabpanel" aria-labelledby="tab-edit" className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <Card className="h-fit gap-3 p-3 lg:gap-3 lg:py-3">
            <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sections</p>
            <ol className="space-y-1" aria-label="Sections">
              {draft.sections.map((s, i) => (
                <li key={s.id}
                  draggable onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== s.id) move(dragId, i); setDragId(null); }}
                  className={cn('group flex items-center gap-1 rounded-md border bg-card pr-1 text-sm', activeId === s.id ? 'border-primary ring-1 ring-primary/30' : 'hover:bg-muted/50', dragId === s.id && 'opacity-50')}>
                  <span className="cursor-grab px-1 text-muted-foreground" aria-hidden="true"><GripVertical className="size-4" /></span>
                  <button type="button" onClick={() => setActiveId(s.id)} className="min-w-0 flex-1 truncate py-2 text-left outline-none focus-visible:underline">
                    {s.title || '(untitled)'} {s.kind === 'signatures' && <Badge variant="muted" className="ml-1">Signatures</Badge>}
                  </button>
                  <button type="button" aria-label={`Move ${s.title} up`} disabled={i === 0} onClick={() => move(s.id, i - 1)} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                  <button type="button" aria-label={`Move ${s.title} down`} disabled={i === draft.sections.length - 1} onClick={() => move(s.id, i + 1)} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                </li>
              ))}
            </ol>
            <div className="space-y-1.5 border-t pt-3">
              <Label htmlFor="add-section" className="text-xs">Add a section</Label>
              <Select id="add-section" value="" onChange={(e) => { if (e.target.value) addSection(e.target.value); e.target.value = ''; }}>
                <option value="">Choose from the library…</option>
                {SECTION_LIBRARY.map((e) => <option key={e.key} value={e.key}>{e.title}</option>)}
              </Select>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => addSection('custom')}><Plus className="size-4" /> Blank section</Button>
            </div>
          </Card>

          {active ? (
            <div className="space-y-3">
              <Card className="gap-3 p-3 lg:gap-3 lg:py-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-title">Section title</Label>
                    <Input id="sec-title" value={active.title} maxLength={160} onChange={(e) => patchSection(active.id, { title: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={active.showTitle} onChange={(e) => patchSection(active.id, { showTitle: e.target.checked })} /> Show title</label>
                    {active.kind === 'rich' && <label className="flex items-center gap-2"><input type="checkbox" checked={active.numbered} onChange={(e) => patchSection(active.id, { numbered: e.target.checked })} /> Numbered</label>}
                    <label className="flex items-center gap-2"><input type="checkbox" checked={active.pageBreakBefore} onChange={(e) => patchSection(active.id, { pageBreakBefore: e.target.checked })} /> Start on a new page</label>
                    <Button type="button" variant="destructive-outline" size="sm" onClick={() => removeSection(active.id)}><Trash2 className="size-4" /> Remove</Button>
                  </div>
                </div>
                {active.kind === 'signatures' && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Signature, printed-name and date fields are generated automatically for every signer when the agreement is sent. Edit only the introduction below.</p>}
              </Card>
              <RichEditor key={active.id} value={active.doc} label={`${active.title} content`} onChange={(doc) => patchSection(active.id, { doc })} />
              <p className="text-xs text-muted-foreground">Use <code>{'{{merge_fields}}'}</code> for values filled per client. Text in <mark className="rounded bg-amber-200/80 px-0.5">[REVIEW: …]</mark> marks wording that still needs approval - {placeholders} remain in this template.</p>
            </div>
          ) : <Card className="p-8 text-center text-sm text-muted-foreground">This template has no sections. Add one from the library.</Card>}
        </div>
      )}

      {tab === 'preview' && (
        <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" className="space-y-3">
          <p className="text-sm text-muted-foreground">Sample values are shown for merge fields. The PDF preview shows exact page breaks.</p>
          <DocumentView title={draft.name} subtitle="Agreement HQ-C-00000 · HomeQuote Network and Sample Client Co." model={model} branding={draft.branding} clientName="Sample Client Co." clientLogoUrl={null}
            signers={[{ role: 'client', label: draft.signerRoles[0]?.label ?? 'Client', name: 'Sample Signer' }, { role: 'homequote', label: draft.signerRoles[1]?.label ?? 'HomeQuote Network', name: 'HomeQuote Representative' }]} />
        </div>
      )}

      {tab === 'pdf' && (
        <div id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf">
          <PdfPreview refreshKey={pdfKey} load={async () => { if (!(await flush())) return { ok: false as const, error: 'Fix the save error first.' }; return previewTemplateAction(id); }} />
        </div>
      )}

      {tab === 'settings' && (
        <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" className="grid gap-4 lg:grid-cols-2">
          <Card className="gap-4 p-4 lg:gap-4 lg:p-5">
            <div className="space-y-1.5"><Label htmlFor="tpl-desc">Description</Label><Textarea id="tpl-desc" rows={3} maxLength={600} value={draft.description} onChange={(e) => update({ description: e.target.value })} /><p className="text-xs text-muted-foreground">Shown in the template gallery when choosing an agreement.</p></div>
            <div className="space-y-1.5"><Label htmlFor="tpl-cat">Category</Label><Input id="tpl-cat" list="tpl-cats" value={draft.category} maxLength={60} onChange={(e) => update({ category: e.target.value })} /><datalist id="tpl-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
            <div className="space-y-1.5"><Label htmlFor="tpl-brand">Default logo layout</Label>
              <Select id="tpl-brand" value={draft.branding.mode} onChange={(e) => update({ branding: { ...draft.branding, mode: e.target.value as Branding['mode'] } })}>{BRANDING_MODES.map((m) => <option key={m} value={m}>{BRANDING_MODE_LABELS[m]}</option>)}</Select></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.requiresReview} onChange={(e) => update({ requiresReview: e.target.checked })} /><span>Contains starter wording that has not been reviewed by counsel<span className="block text-xs text-muted-foreground">Untick once your attorney has approved this template.</span></span></label>
          </Card>
          <Card className="gap-4 p-4 lg:gap-4 lg:p-5">
            <div><p className="font-medium">Default signers</p><p className="text-xs text-muted-foreground">Order matters: signers sign in this order unless you change it per agreement. Roles: the first is the client, the second HomeQuote.</p></div>
            {draft.signerRoles.map((r, i) => (
              <div key={i} className="space-y-1.5"><Label htmlFor={`role-${i}`}>Signer {i + 1} label</Label>
                <Input id={`role-${i}`} value={r.label} maxLength={80} onChange={(e) => update({ signerRoles: draft.signerRoles.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></div>
            ))}
            <div className="border-t pt-4"><p className="font-medium">Default values</p><p className="mb-3 text-xs text-muted-foreground">Prefilled on every new agreement from this template (you can change them per client). Leave prices blank to enter them each time.</p>
              <div className="space-y-3">
                {used.known.filter((k) => { const d = VARIABLE_BY_KEY.get(k); return d && d.source === 'input'; }).map((k) => {
                  const d = VARIABLE_BY_KEY.get(k)!;
                  return (
                    <div key={k} className="space-y-1.5"><Label htmlFor={`dv-${k}`}>{d.label}</Label>
                      {d.kind === 'longtext' ? <Textarea id={`dv-${k}`} rows={2} value={draft.defaultVariables[k] ?? ''} onChange={(e) => update({ defaultVariables: { ...draft.defaultVariables, [k]: e.target.value } })} />
                        : <Input id={`dv-${k}`} type={d.kind === 'date' ? 'date' : 'text'} value={draft.defaultVariables[k] ?? ''} placeholder={d.example} onChange={(e) => update({ defaultVariables: { ...draft.defaultVariables, [k]: e.target.value } })} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Editing a template never changes agreements that were already created from it. <Link href="/app/contracts/templates" className="underline">Back to the template library</Link></p>
    </div>
  );
}
