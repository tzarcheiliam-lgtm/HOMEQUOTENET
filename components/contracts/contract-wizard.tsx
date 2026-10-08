'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowLeftRight, Building2, Check, FileUp, Loader2, Plus, Search, Send, Trash2, Upload, UserPlus } from 'lucide-react';
import { ClientMark } from '@/components/contracts/client-mark';
import { DocumentView, LogoHeader } from '@/components/contracts/document-view';
import { PdfPreview } from '@/components/contracts/pdf-preview';
import { RichEditor } from '@/components/contracts/rich-editor';
import { SaveIndicator, useAutosave } from '@/components/contracts/use-autosave';
import { WizardSteps } from '@/components/contracts/wizard-steps';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { addExhibitAction, previewContractAction, removeExhibitAction, removeLogoAction, saveContractAction, sendContractAction, uploadLogoAction } from '@/lib/actions/contracts';
import { buildRenderModel } from '@/lib/contracts/render-model';
import {
  BRANDING_MODES, BRANDING_MODE_LABELS, type Branding, type ContractClient, type ContractSection, type ContractSettings, type ContractSigner,
} from '@/lib/contracts/types';
import { validateContract } from '@/lib/contracts/validate';
import { VARIABLE_BY_KEY, usedVariables, type VariableDef } from '@/lib/contracts/variables';
import { cn } from '@/lib/utils';

export interface WizardContractor { id: string; name: string; contactName: string; email: string; phone: string; logoUrl: string | null }
export interface WizardDraft {
  title: string; contractorId: string | null; client: ContractClient; variables: Record<string, string>; branding: Branding; signers: ContractSigner[];
  settings: ContractSettings; sections: ContractSection[];
}
export interface WizardProps {
  id: string; templateName: string; initial: WizardDraft; contractors: WizardContractor[]; uploadedLogoUrl: string | null; initialStep: number;
  attachments: { id: string; filename: string; size_bytes: number; page_count: number | null }[];
}

const EXPIRY_OPTIONS = [3, 7, 14, 30, 60, 90];
const REMIND_OPTIONS: [number | null, string][] = [[null, 'No reminders'], [1, 'Daily'], [2, 'Every 2 days'], [3, 'Every 3 days'], [5, 'Every 5 days'], [7, 'Weekly']];

function Field({ def, value, error, onChange }: { def: VariableDef; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `v-${def.key}`;
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : def.hint ? `${id}-hint` : undefined } as const;
  return (
    <div className={cn('space-y-1.5', def.kind === 'longtext' && 'sm:col-span-2')}>
      <Label htmlFor={id}>{def.label}{!def.optional && <span className="text-destructive"> *</span>}{def.optional && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
      {def.kind === 'longtext' ? <Textarea {...common} rows={3} value={value} maxLength={6000} onChange={(e) => onChange(e.target.value)} />
        : def.kind === 'money' ? (
          <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input {...common} inputMode="decimal" className="pl-7" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} /></div>)
          : <Input {...common} type={def.kind === 'date' ? 'date' : 'text'} value={value} placeholder={def.kind === 'date' ? undefined : def.example} maxLength={400} onChange={(e) => onChange(e.target.value)} />}
      {def.hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{def.hint}</p>}
      {error && <p id={`${id}-err`} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function ContractWizard({ id, templateName, initial, contractors, uploadedLogoUrl, initialStep, attachments: initialAttachments }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 5));
  const [reached, setReached] = useState(Math.min(Math.max(initialStep, 1), 5));
  const [draft, setDraft] = useState<WizardDraft>(initial);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(uploadedLogoUrl);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [showErrors, setShowErrors] = useState(false);
  const [search, setSearch] = useState('');
  const [newClient, setNewClient] = useState(!initial.contractorId && !!initial.client.company);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'quick'>('pdf');
  const [editSection, setEditSection] = useState('');
  const [sending, startSend] = useTransition();
  const [logoBusy, setLogoBusy] = useState(false);
  const [saveToCrm, setSaveToCrm] = useState(true);
  const [sendResults, setSendResults] = useState<{ name: string; email: string; sent: boolean; error?: string }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const exhibitRef = useRef<HTMLInputElement>(null);

  const { state, flush } = useAutosave({
    value: draft,
    save: async (d) => {
      const r = await saveContractAction(id, { title: d.title, contractorId: d.contractorId, client: d.client, variables: d.variables, branding: d.branding, signers: d.signers, settings: d.settings, sections: d.sections });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
  });
  const patch = (p: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...p }));
  const setVar = (k: string, v: string) => setDraft((d) => ({ ...d, variables: { ...d.variables, [k]: v } }));
  const contractor = contractors.find((c) => c.id === draft.contractorId) ?? null;
  const logoUrl = uploadedUrl ?? (draft.branding.useCrmLogo ? contractor?.logoUrl ?? null : null);

  const report = useMemo(() => validateContract({ sections: draft.sections, variables: draft.variables, client: draft.client, signers: draft.signers, placeholdersAcknowledged: draft.settings.placeholdersAcknowledged }), [draft]);
  const ack = draft.settings.placeholdersAcknowledged;
  const setAck = (v: boolean) => setDraft((d) => ({ ...d, settings: { ...d.settings, placeholdersAcknowledged: v } }));
  const used = useMemo(() => usedVariables(draft.sections), [draft.sections]);
  const inputVars = used.known.map((k) => VARIABLE_BY_KEY.get(k)!).filter((d) => d.source === 'input' && d.group !== 'Client');
  const issuesFor = (key: string) => report.errors.find((e) => e.field === key)?.message;
  const model = useMemo(() => buildRenderModel(draft.sections, report.resolved.values), [draft.sections, report.resolved.values]);
  const clientName = draft.client.company || 'Client';

  const selectContractor = (c: WizardContractor) => {
    setNewClient(false); setUploadedUrl(null);
    setDraft((d) => ({
      ...d, contractorId: c.id,
      client: { company: c.name, name: c.contactName, email: c.email, phone: c.phone, address: '' },
      signers: d.signers.map((s) => (s.role === 'client' ? { ...s, name: c.contactName || s.name, email: c.email || s.email } : s)),
      branding: { ...d.branding, clientLogoPath: null, useCrmLogo: true },
    }));
  };
  const startNewClient = () => { setNewClient(true); setUploadedUrl(null); setDraft((d) => ({ ...d, contractorId: null, client: { company: '', name: '', email: '', phone: '', address: '' }, branding: { ...d.branding, clientLogoPath: null, useCrmLogo: false } })); };

  const go = async (to: number) => {
    if (to === 0) { await flush(); router.push('/app/contracts/new'); return; }
    if (to > step) {
      if (step === 1 && !draft.client.company.trim()) { setShowErrors(true); toast('Choose or enter the client first.', 'error'); return; }
      if (step === 2) setShowErrors(true);
    }
    const ok = await flush();
    if (!ok) { toast('Your latest changes could not be saved. Try again.', 'error'); return; }
    setStep(to); setReached((r) => Math.max(r, to));
    if (to === 4) setPreviewKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    const fd = new FormData();
    fd.set('file', file); fd.set('contractId', id);
    if (contractor && saveToCrm) { fd.set('saveToCrm', 'true'); fd.set('contractorId', contractor.id); }
    const r = await uploadLogoAction(fd);
    setLogoBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    if (!r.ok) return toast(r.error, 'error');
    setUploadedUrl(r.url); setDraft((d) => ({ ...d, branding: { ...d.branding, useCrmLogo: true } }));
    if (contractor && saveToCrm) toast(`Saved as ${contractor.name}'s logo for future agreements.`);
    else toast('Logo uploaded.');
  };
  const removeLogo = async () => {
    setLogoBusy(true);
    await flush();
    const r = await removeLogoAction(id);
    setLogoBusy(false);
    if (!r.ok) return toast(r.error, 'error');
    setUploadedUrl(null); setDraft((d) => ({ ...d, branding: { ...d.branding, useCrmLogo: false } }));
    toast('Logo removed from this agreement.');
  };
  const addExhibit = async (file: File) => {
    const fd = new FormData(); fd.set('file', file); fd.set('contractId', id);
    const r = await addExhibitAction(fd);
    if (exhibitRef.current) exhibitRef.current.value = '';
    if (!r.ok) return toast(r.error, 'error');
    toast('Exhibit attached.'); router.refresh();
  };

  const moveSigner = (i: number, d: number) => setDraft((s) => { const a = s.signers.slice(); const j = i + d; if (j < 0 || j >= a.length) return s; [a[i], a[j]] = [a[j], a[i]]; return { ...s, signers: a }; });
  const setSigner = (i: number, p: Partial<ContractSigner>) => setDraft((s) => ({ ...s, signers: s.signers.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  const send = () => startSend(async () => {
    setShowErrors(true);
    if (report.errors.length) { toast('Fix the items listed before sending.', 'error'); return; }
    if (!(await flush())) { toast('Could not save your latest changes.', 'error'); return; }
    const r = await sendContractAction(id, ack);
    if (!r.ok) { toast(r.error, 'error'); return; }
    const failed = r.results.filter((x) => !x.sent);
    if (failed.length) { setSendResults(r.results); toast('Sent, but an invitation email failed. You can resend it from the agreement page.', 'error'); }
    else toast('Sent for signature.');
    router.push(`/app/contracts/${id}`);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WizardSteps current={step} reached={reached} onGo={(i) => void go(i)} />
        <SaveIndicator state={state} onRetry={() => void flush()} />
      </div>

      {step === 1 && (
        <section aria-labelledby="s1" className="space-y-4">
          <div><h2 id="s1" className="text-lg font-semibold">Who is this agreement with?</h2><p className="text-sm text-muted-foreground">Pick an existing contractor and their details fill in automatically, or enter a new client.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-3 p-4 lg:gap-3 lg:p-5">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input aria-label="Search contractors" placeholder="Search contractors" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <ul className="max-h-[22rem] space-y-1 overflow-y-auto" aria-label="Contractors">
                {contractors.filter((c) => `${c.name} ${c.contactName} ${c.email}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 60).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => selectContractor(c)} aria-pressed={draft.contractorId === c.id}
                      className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring', draft.contractorId === c.id && 'border-primary bg-primary/5')}>
                      <ClientMark name={c.name} url={c.logoUrl} size={36} />
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{[c.contactName, c.email].filter(Boolean).join(' · ') || 'No contact on file'}</span></span>
                      {draft.contractorId === c.id && <Check className="size-4 text-primary" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
                {contractors.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">No contractors in the CRM yet.</li>}
              </ul>
              <Button type="button" variant={newClient ? 'default' : 'outline'} onClick={startNewClient}><UserPlus className="size-4" /> New client (not in CRM)</Button>
            </Card>
            <Card className="gap-3 p-4 lg:gap-3 lg:p-5">
              <div className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" aria-hidden="true" /><p className="font-medium">Client details</p>{contractor && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">From CRM · editable</span>}</div>
              {([['company', 'Company', true], ['name', 'Contact name', false], ['email', 'Email', false], ['phone', 'Phone', false]] as const).map(([k, label, req]) => (
                <div key={k} className="space-y-1.5"><Label htmlFor={`c-${k}`}>{label}{req && <span className="text-destructive"> *</span>}</Label>
                  <Input id={`c-${k}`} type={k === 'email' ? 'email' : 'text'} value={draft.client[k]} aria-invalid={k === 'company' && showErrors && !draft.client.company.trim()} onChange={(e) => patch({ client: { ...draft.client, [k]: e.target.value } })} /></div>
              ))}
              <div className="space-y-1.5"><Label htmlFor="c-address">Address <span className="text-destructive">*</span></Label>
                <Textarea id="c-address" rows={2} value={draft.client.address} aria-invalid={showErrors && !draft.client.address.trim()} onChange={(e) => patch({ client: { ...draft.client, address: e.target.value } })} />
                <p className="text-xs text-muted-foreground">Addresses are not stored in the CRM yet, so enter it for this agreement.</p></div>
            </Card>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="s2" className="space-y-4">
          <div><h2 id="s2" className="text-lg font-semibold">Configure the agreement</h2><p className="text-sm text-muted-foreground">{templateName} · prices, dates and terms. Anything marked * must be filled before it can be sent.</p></div>
          <Card className="gap-4 p-4 lg:gap-4 lg:p-5">
            <div className="space-y-1.5"><Label htmlFor="title">Agreement title</Label><Input id="title" value={draft.title} maxLength={200} onChange={(e) => patch({ title: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {inputVars.map((d) => <Field key={d.key} def={d} value={draft.variables[d.key] ?? ''} error={showErrors || draft.variables[d.key] ? issuesFor(d.key) : undefined} onChange={(v) => setVar(d.key, v)} />)}
            </div>
            {inputVars.length === 0 && <p className="text-sm text-muted-foreground">This template has no per-client fields.</p>}
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div className="space-y-1.5"><Label htmlFor="contract_date">Contract date (optional)</Label><Input id="contract_date" type="date" value={draft.variables.contract_date ?? ''} onChange={(e) => setVar('contract_date', e.target.value)} /><p className="text-xs text-muted-foreground">Leave blank to use the day you send it.</p></div>
            </div>
          </Card>
          <Card className="gap-3 p-4 lg:gap-3 lg:p-5">
            <p className="font-medium">Customize the wording <span className="font-normal text-muted-foreground">(optional)</span></p>
            <p className="text-sm text-muted-foreground">Edit the text of this agreement only. The template and other agreements are not affected.</p>
            <Select aria-label="Section to edit" value={editSection} onChange={(e) => setEditSection(e.target.value)}>
              <option value="">Choose a section…</option>
              {draft.sections.filter((s) => s.kind === 'rich' || s.doc.content?.length).map((s) => <option key={s.id} value={s.id}>{s.title || '(untitled)'}</option>)}
            </Select>
            {draft.sections.filter((s) => s.id === editSection).map((s) => (
              <RichEditor key={s.id} value={s.doc} label={`${s.title} content`} onChange={(doc) => setDraft((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, doc } : x)) }))} />
            ))}
          </Card>
          <Card className="gap-3 p-4 lg:gap-3 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">Exhibits <span className="font-normal text-muted-foreground">(optional PDFs appended to the agreement)</span></p>
              <>
                <input ref={exhibitRef} type="file" accept="application/pdf" className="sr-only" id="exhibit-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addExhibit(f); }} />
                <Button type="button" variant="outline" size="sm" onClick={() => exhibitRef.current?.click()}><FileUp className="size-4" /> Attach PDF</Button></>
            </div>
            {attachments.length === 0 ? <p className="text-sm text-muted-foreground">No exhibits.</p> : (
              <ul className="divide-y rounded-lg border">{attachments.map((a, i) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><span className="min-w-0 truncate">Exhibit {String.fromCharCode(65 + i)} - {a.filename} <span className="text-muted-foreground">({a.page_count ?? '?'} pp)</span></span>
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${a.filename}`} onClick={async () => { const r = await removeExhibitAction(id, a.id); if (!r.ok) return toast(r.error, 'error'); setAttachments((x) => x.filter((y) => y.id !== a.id)); }}><Trash2 className="size-4" /></Button></li>
              ))}</ul>
            )}
          </Card>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="s3" className="space-y-4">
          <div><h2 id="s3" className="text-lg font-semibold">Branding</h2><p className="text-sm text-muted-foreground">Both company logos appear side by side at the top of the agreement and in the PDF.</p></div>
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Card className="gap-4 p-4 lg:gap-4 lg:p-5">
              <div className="space-y-1.5"><Label htmlFor="b-mode">Logo layout</Label>
                <Select id="b-mode" value={draft.branding.mode} onChange={(e) => patch({ branding: { ...draft.branding, mode: e.target.value as Branding['mode'] } })}>{BRANDING_MODES.map((m) => <option key={m} value={m}>{BRANDING_MODE_LABELS[m]}</option>)}</Select></div>
              {draft.branding.mode === 'side_by_side' && <Button type="button" variant="outline" onClick={() => patch({ branding: { ...draft.branding, swap: !draft.branding.swap } })}><ArrowLeftRight className="size-4" /> Swap sides ({draft.branding.swap ? 'client first' : 'HomeQuote first'})</Button>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="b-size">Size</Label><Select id="b-size" value={draft.branding.size} onChange={(e) => patch({ branding: { ...draft.branding, size: e.target.value as Branding['size'] } })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></Select></div>
                <div className="space-y-1.5"><Label htmlFor="b-align">Position</Label><Select id="b-align" value={draft.branding.align} onChange={(e) => patch({ branding: { ...draft.branding, align: e.target.value as Branding['align'] } })}><option value="center">Centered</option><option value="spread">Edges</option></Select></div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">{clientName} logo</p>
                <div className="flex items-center gap-3"><ClientMark name={clientName} url={logoUrl} size={56} />
                  <p className="text-xs text-muted-foreground">{logoUrl ? (uploadedUrl ? 'Uploaded for this agreement.' : 'Saved in the CRM.') : 'No logo yet - a neat initials tile is used instead.'}</p></div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="logo-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={logoBusy} onClick={() => fileRef.current?.click()}>{logoBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {logoUrl ? 'Change logo' : 'Upload logo'}</Button>
                  {logoUrl && <Button type="button" variant="destructive-outline" size="sm" disabled={logoBusy} onClick={() => void removeLogo()}><Trash2 className="size-4" /> Remove</Button>}
                  {!logoUrl && contractor?.logoUrl && !draft.branding.useCrmLogo && <Button type="button" variant="outline" size="sm" onClick={() => patch({ branding: { ...draft.branding, useCrmLogo: true } })}>Use CRM logo</Button>}
                </div>
                {contractor && <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={saveToCrm} onChange={(e) => setSaveToCrm(e.target.checked)} /> Also save to {contractor.name}&rsquo;s CRM profile</label>}
                <p className="text-xs text-muted-foreground">PNG, JPG or WebP up to 2 MB. Transparency is kept and the image is never stretched.</p>
              </div>
            </Card>
            <Card className="gap-3 bg-muted/30 p-4 lg:gap-3 lg:p-5">
              <p className="text-sm font-medium">Preview</p>
              <div className="rounded-lg bg-white p-6 ring-1 ring-border"><LogoHeader branding={draft.branding} clientName={clientName} clientLogoUrl={logoUrl} />{draft.branding.mode === 'none' && <p className="text-center text-sm text-muted-foreground">No logos will be shown.</p>}
                <p className="mt-4 text-xl font-bold text-slate-900">{draft.title}</p></div>
            </Card>
          </div>
        </section>
      )}

      {step === 4 && (
        <section aria-labelledby="s4" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="s4" className="text-lg font-semibold">Preview</h2><p className="text-sm text-muted-foreground">This is exactly what {draft.client.name || 'the client'} will receive.</p></div>
            <div className="flex gap-1 rounded-lg border p-0.5" role="group" aria-label="Preview type">
              {(['pdf', 'quick'] as const).map((m) => <button key={m} type="button" aria-pressed={previewMode === m} onClick={() => setPreviewMode(m)} className={cn('rounded-md px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', previewMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{m === 'pdf' ? 'PDF (exact)' : 'Quick view'}</button>)}
            </div></div>
          {report.errors.length > 0 && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" aria-hidden="true" /> Not ready to send yet</p>
              <ul className="mt-1 list-disc pl-6">{report.errors.slice(0, 6).map((e, i) => <li key={i}>{e.message}</li>)}</ul>
            </div>
          )}
          {previewMode === 'pdf'
            ? <PdfPreview refreshKey={previewKey} load={async () => { if (!(await flush())) return { ok: false as const, error: 'Fix the save error first.' }; return previewContractAction(id); }} />
            : <DocumentView title={draft.title} subtitle={`${templateName} · ${clientName}`} model={model} branding={draft.branding} clientName={clientName} clientLogoUrl={logoUrl} signers={draft.signers} />}
        </section>
      )}

      {step === 5 && (
        <section aria-labelledby="s5" className="space-y-4">
          <div><h2 id="s5" className="text-lg font-semibold">Send for signature</h2><p className="text-sm text-muted-foreground">Choose who signs, in what order, and add an optional message. Each signer gets a private, expiring link by email.</p></div>
          <Card className="gap-4 p-4 lg:gap-4 lg:p-5">
            <p className="font-medium">Signers</p>
            <ul className="space-y-3">
              {draft.signers.map((s, i) => (
                <li key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end">
                  <span className="hidden size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold sm:flex" aria-hidden="true">{i + 1}</span>
                  <div className="space-y-1"><Label htmlFor={`sg-l-${i}`} className="text-xs">Role label</Label><Input id={`sg-l-${i}`} value={s.label} maxLength={80} onChange={(e) => setSigner(i, { label: e.target.value })} /></div>
                  <div className="space-y-1"><Label htmlFor={`sg-n-${i}`} className="text-xs">Full name</Label><Input id={`sg-n-${i}`} value={s.name} onChange={(e) => setSigner(i, { name: e.target.value })} aria-invalid={showErrors && !s.name.trim()} /></div>
                  <div className="space-y-1"><Label htmlFor={`sg-e-${i}`} className="text-xs">Email</Label><Input id={`sg-e-${i}`} type="email" value={s.email} onChange={(e) => setSigner(i, { email: e.target.value })} aria-invalid={showErrors && !/.+@.+\..+/.test(s.email)} /></div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={`Move signer ${i + 1} up`} disabled={i === 0} onClick={() => moveSigner(i, -1)}><ArrowUp className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Move signer ${i + 1} down`} disabled={i === draft.signers.length - 1} onClick={() => moveSigner(i, 1)}><ArrowDown className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove signer ${i + 1}`} disabled={draft.signers.length <= 1} onClick={() => patch({ signers: draft.signers.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
            {draft.signers.length < 6 && <div><Button type="button" variant="outline" size="sm" onClick={() => patch({ signers: [...draft.signers, { role: 'other', label: 'Additional signer', name: '', email: '' }] })}><Plus className="size-4" /> Add signer</Button></div>}
            <fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-3">
              <legend className="sr-only">Signing options</legend>
              <div className="space-y-1.5"><Label htmlFor="o-order">Signing order</Label>
                <Select id="o-order" value={draft.settings.signingOrder} onChange={(e) => patch({ settings: { ...draft.settings, signingOrder: e.target.value as ContractSettings['signingOrder'] } })}><option value="sequential">One after another (in the order above)</option><option value="parallel">Everyone at once</option></Select></div>
              <div className="space-y-1.5"><Label htmlFor="o-exp">Link expires after</Label>
                <Select id="o-exp" value={draft.settings.expiryDays} onChange={(e) => patch({ settings: { ...draft.settings, expiryDays: Number(e.target.value) } })}>{EXPIRY_OPTIONS.map((d) => <option key={d} value={d}>{d} days</option>)}</Select></div>
              <div className="space-y-1.5"><Label htmlFor="o-rem">Reminders</Label>
                <Select id="o-rem" value={draft.settings.autoRemindDays ?? ''} onChange={(e) => patch({ settings: { ...draft.settings, autoRemindDays: e.target.value === '' ? null : Number(e.target.value) } })}>{REMIND_OPTIONS.map(([v, l]) => <option key={l} value={v ?? ''}>{l}</option>)}</Select></div>
            </fieldset>
            <div className="space-y-1.5"><Label htmlFor="o-subj">Email subject</Label><Input id="o-subj" value={draft.settings.subject} maxLength={200} placeholder={`Please review and sign: ${draft.title}`} onChange={(e) => patch({ settings: { ...draft.settings, subject: e.target.value } })} /></div>
            <div className="space-y-1.5"><Label htmlFor="o-msg">Message (optional)</Label><Textarea id="o-msg" rows={3} maxLength={4000} value={draft.settings.message} onChange={(e) => patch({ settings: { ...draft.settings, message: e.target.value } })} /></div>
          </Card>

          <Card className="gap-3 p-4 lg:gap-3 lg:p-5" aria-label="Pre-send checks">
            <p className="font-medium">Before you send</p>
            {report.errors.length === 0 ? <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="size-4" aria-hidden="true" /> All required fields are filled and there are no unresolved merge fields.</p> : (
              <ul className="space-y-1 text-sm text-destructive" role="alert">{report.errors.filter((e) => e.code !== 'placeholders_unacknowledged').map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {e.message}
                  <button type="button" className="underline underline-offset-2" onClick={() => void go(e.step === 'client' ? 1 : e.step === 'configure' || e.step === 'content' ? 2 : 5)}>Fix</button></li>
              ))}</ul>
            )}
            {report.placeholders > 0 && (
              <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>{report.placeholders} passage{report.placeholders === 1 ? '' : 's'} marked <strong>[REVIEW: …]</strong> still remain. I have reviewed this agreement&rsquo;s wording and want it sent exactly as shown. This is recorded in the audit trail.</span>
              </label>
            )}
            <p className="text-xs text-muted-foreground">Signers are identified by their private email link (no ID check). Signing does not start billing; payment is confirmed separately.</p>
          </Card>
          {sendResults && <p className="text-sm text-destructive">{sendResults.filter((r) => !r.sent).map((r) => `${r.name}: ${r.error}`).join(' ')}</p>}
        </section>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" disabled={step <= 1} onClick={() => void go(step - 1)}><ArrowLeft className="size-4" /> Back</Button>
        {step < 5 ? <Button type="button" onClick={() => void go(step + 1)}>Continue <ArrowRight className="size-4" /></Button>
          : <Button type="button" size="lg" disabled={sending || report.errors.length > 0} onClick={send}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send for signature</Button>}
      </div>
      {step === 5 && report.errors.length > 0 && <p className="text-right text-xs text-muted-foreground">Sending is blocked until the items above are fixed.</p>}
    </div>
  );
}
