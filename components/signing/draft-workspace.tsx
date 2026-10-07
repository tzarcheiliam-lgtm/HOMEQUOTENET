'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Send, ShieldAlert, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldBox, FIELD_ICONS } from '@/components/signing/field-box';
import { PdfPageView, usePdf } from '@/components/signing/pdf-view';
import { DATE_FORMATS, FIELD_DEFAULT_PT, FIELD_TYPES, FIELD_TYPE_LABELS, LEGAL_REVIEW_NOTE, type FieldType } from '@/lib/signing/constants';
import { SIGNER_COLORS, autoAssign, colorFor, sendProblems, type UiField, type UiPage, type UiRecipient } from '@/lib/signing/view';
import { deleteDraftAction, markReviewedAction, saveDraftAction, sendAction } from '@/lib/actions/signing';

export interface DraftInit {
  versionId: string; title: string; pages: UiPage[]; pdfUrl: string;
  subject: string; message: string; order: 'sequential' | 'parallel'; expiryDays: number;
  recipients: { name: string; email: string }[]; fields: UiField[];
  detection: { methods?: string[]; notes?: string[]; ocrPages?: number[]; pagesWithoutText?: number[]; ocrSkippedPages?: number[] } | null;
}

type Step = 'fields' | 'signers' | 'review';
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
let seq = 0;
const newKey = () => `n${Date.now().toString(36)}${seq++}`;

export function DraftWorkspace({ init }: { init: DraftInit }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('fields');
  const [fields, setFields] = useState<UiField[]>(init.fields);
  const [recipients, setRecipients] = useState<UiRecipient[]>(init.recipients.map((r) => ({ key: newKey(), ...r })));
  const [subject, setSubject] = useState(init.subject || `Please sign ${init.title}`);
  const [message, setMessage] = useState(init.message);
  const [order, setOrder] = useState(init.order);
  const [expiryDays, setExpiryDays] = useState(init.expiryDays);
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState<FieldType | null>(null);
  const [activeSigner, setActiveSigner] = useState(1);
  const [save, setSave] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { doc, error: pdfError } = usePdf(init.pdfUrl);
  const dirtyRef = useRef(false);
  const savingRef = useRef<Promise<boolean> | null>(null);

  const touch = useCallback(() => { dirtyRef.current = true; setSave('dirty'); }, []);

  // ---- persistence ---------------------------------------------------------------------------------
  const payload = useMemo(() => {
    const validIdx = new Map<number, number>();
    const recs: { name: string; email: string }[] = [];
    recipients.forEach((r, i) => {
      if (r.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim())) { recs.push({ name: r.name.trim(), email: r.email.trim() }); validIdx.set(i + 1, recs.length); }
    });
    return {
      subject, message, signing_order: order, expiry_days: expiryDays, recipients: recs,
      fields: fields.map((f) => ({
        recipient_index: f.recipient_index ? validIdx.get(f.recipient_index) ?? null : null, type: f.type, page: f.page,
        x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, group_key: f.group_key, prefill_value: f.prefill_value || null,
        date_format: f.type === 'date' ? (f.date_format ?? 'MMM d, yyyy') : null, source: f.source, confidence: f.confidence, needs_review: f.needs_review,
        reviewed: f.reviewed, role_hint: f.role_hint, detection_note: f.detection_note, source_ref: f.source_ref,
      })),
    };
  }, [fields, recipients, subject, message, order, expiryDays]);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const flush = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) await savingRef.current;
    if (!dirtyRef.current) return true;
    dirtyRef.current = false;
    setSave('saving');
    const p = (async () => {
      const res = await saveDraftAction(init.versionId, payloadRef.current);
      if (!res.ok) { dirtyRef.current = true; setSave('error'); setSaveError(res.error); return false; }
      setSaveError(null);
      setSave(dirtyRef.current ? 'dirty' : 'saved');
      return true;
    })();
    savingRef.current = p;
    const ok = await p;
    savingRef.current = null;
    return ok;
  }, [init.versionId]);

  useEffect(() => {
    if (save !== 'dirty') return;
    const t = setTimeout(() => { void flush(); }, 1200);
    return () => clearTimeout(t);
  }, [save, payload, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // ---- field operations ----------------------------------------------------------------------------
  const updateField = (key: string, patch: Partial<UiField>, markReviewed = true) => {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch, ...(markReviewed && f.needs_review ? { reviewed: true } : {}) } : f)));
    touch();
  };
  const removeField = (key: string) => { setFields((fs) => fs.filter((f) => f.key !== key)); setSelected(null); touch(); };
  const sel = fields.find((f) => f.key === selected) ?? null;

  const placeField = (type: FieldType, pageNo: number, fx: number, fy: number) => {
    const meta = init.pages[pageNo - 1];
    const d = FIELD_DEFAULT_PT[type];
    const w = d.w / meta.w, h = d.h / meta.h;
    const f: UiField = {
      key: newKey(), recipient_index: type === 'date' || recipients.length ? Math.min(activeSigner, Math.max(1, recipients.length)) : null, type, page: pageNo,
      x: Math.min(1 - w, Math.max(0, fx - w / 2)), y: Math.min(1 - h, Math.max(0, fy - h / 2)), w, h,
      required: type !== 'checkbox' || false, label: null, group_key: null, prefill_value: null, date_format: type === 'date' ? 'MMM d, yyyy' : null,
      source: 'manual', confidence: null, needs_review: false, reviewed: false, role_hint: null, detection_note: null, source_ref: null,
    };
    if (!recipients.length) f.recipient_index = null;
    setFields((fs) => [...fs, f]); setSelected(f.key); setArmed(null); touch();
  };

  // drag / resize
  const drag = useRef<null | { key: string; mode: 'move' | 'resize'; layer: HTMLElement; ox: number; oy: number; start: UiField }>(null);
  const layers = useRef<Record<number, HTMLDivElement | null>>({});
  const onFieldDown = (e: React.PointerEvent, f: UiField, mode: 'move' | 'resize') => {
    e.stopPropagation(); e.preventDefault();
    const layer = layers.current[f.page]; if (!layer) return;
    const r = layer.getBoundingClientRect();
    drag.current = { key: f.key, mode, layer, ox: (e.clientX - r.left) / r.width - f.x, oy: (e.clientY - r.top) / r.height - f.y, start: f };
    setSelected(f.key);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const rr = d.layer.getBoundingClientRect();
      const px = (ev.clientX - rr.left) / rr.width, py = (ev.clientY - rr.top) / rr.height;
      if (d.mode === 'move') updateField(d.key, { x: Math.min(1 - d.start.w, Math.max(0, px - d.ox)), y: Math.min(1 - d.start.h, Math.max(0, py - d.oy)) }, false);
      else updateField(d.key, { w: Math.min(1 - d.start.x, Math.max(0.01, px - d.start.x)), h: Math.min(1 - d.start.y, Math.max(0.008, py - d.start.y)) }, false);
    };
    const up = () => { const d = drag.current; drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (d) setFields((fs) => fs.map((x) => (x.key === d.key && x.needs_review ? { ...x, reviewed: true } : x))); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onLayerDown = (e: React.PointerEvent, pageNo: number) => {
    const layer = layers.current[pageNo]; if (!layer) return;
    if (armed) {
      const r = layer.getBoundingClientRect();
      placeField(armed, pageNo, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    } else setSelected(null);
  };
  // keyboard nudge / delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || step !== 'fields') return;
      const tag = (e.target as HTMLElement)?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const f = fields.find((x) => x.key === selected); if (!f) return;
      const stepX = (e.shiftKey ? 8 : 1) / init.pages[f.page - 1].w, stepY = (e.shiftKey ? 8 : 1) / init.pages[f.page - 1].h;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeField(f.key); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); updateField(f.key, { x: Math.max(0, f.x - stepX) }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); updateField(f.key, { x: Math.min(1 - f.w, f.x + stepX) }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); updateField(f.key, { y: Math.max(0, f.y - stepY) }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); updateField(f.key, { y: Math.min(1 - f.h, f.y + stepY) }); }
      else if (e.key === 'Escape') { setSelected(null); setArmed(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const uncertain = fields.filter((f) => f.needs_review && !f.reviewed);
  const jumpToUncertain = () => {
    const f = uncertain.find((u) => u.key !== selected) ?? uncertain[0]; if (!f) return;
    setSelected(f.key); setPage(f.page);
    document.querySelector(`[data-page="${f.page}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ---- signers -------------------------------------------------------------------------------------
  const addSigner = () => {
    if (recipients.length >= 10) return;
    const next = [...recipients, { key: newKey(), name: '', email: '' }];
    setRecipients(next);
    if (recipients.length === 0) setFields((fs) => autoAssign(fs, 1));
    touch();
  };
  const moveSigner = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= recipients.length) return;
    const rs = [...recipients]; [rs[i], rs[j]] = [rs[j], rs[i]]; setRecipients(rs);
    setFields((fs) => fs.map((f) => (f.recipient_index === i + 1 ? { ...f, recipient_index: j + 1 } : f.recipient_index === j + 1 ? { ...f, recipient_index: i + 1 } : f)));
    touch();
  };
  const removeSigner = (i: number) => {
    setRecipients((rs) => rs.filter((_, k) => k !== i));
    setFields((fs) => fs.map((f) => (f.recipient_index === i + 1 ? { ...f, recipient_index: null } : f.recipient_index && f.recipient_index > i + 1 ? { ...f, recipient_index: f.recipient_index - 1 } : f)));
    setActiveSigner(1); touch();
  };

  // ---- review + send -------------------------------------------------------------------------------
  const problems = sendProblems({ subject, recipients, fields, order });
  const [visited, setVisited] = useState<Set<number>>(new Set([1]));
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentResults, setSentResults] = useState<{ name: string; email: string; sent: boolean; error?: string }[] | null>(null);
  useEffect(() => { if (step === 'review') setVisited((v) => new Set(v).add(page)); }, [page, step]);
  const allVisited = visited.size >= init.pages.length;

  const doSend = async () => {
    setSending(true); setSendError(null);
    try {
      if (!(await flush())) throw new Error('Could not save your changes first.');
      const rv = await markReviewedAction(init.versionId);
      if (!rv.ok) throw new Error(rv.error);
      const res = await sendAction(init.versionId);
      if (!res.ok) throw new Error(res.error);
      setSentResults(res.results);
      router.refresh();
    } catch (e) { setSendError((e as Error).message); }
    finally { setSending(false); }
  };

  if (sentResults) {
    const failed = sentResults.filter((r) => !r.sent);
    return (
      <Card><CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="size-5 text-emerald-600" /> Sent for signature</div>
        <p className="text-sm text-muted-foreground">The document and its fields are now locked. Any change from here creates a new version and cancels this request.</p>
        {failed.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Some invitation emails could not be sent</p>
            {failed.map((f) => <p key={f.email}>{f.name} ({f.email}): {f.error}</p>)}
            <p className="mt-1">Open the document and use “Resend” once the problem is fixed.</p>
          </div>
        )}
        <Button onClick={() => router.push(`/app/documents/${init.versionId}`)}>View request</Button>
      </CardContent></Card>
    );
  }

  const pageList = step === 'review' ? [page] : init.pages.map((_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex items-center gap-1 text-sm">
          {([['fields', '1. Fields'], ['signers', '2. Signers & message'], ['review', '3. Review & send']] as [Step, string][]).map(([s, label]) => (
            <li key={s}><button type="button" onClick={() => setStep(s)} className={`rounded-md px-3 py-1.5 font-medium ${step === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button></li>
          ))}
        </ol>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {save === 'saving' && <><Loader2 className="size-3 animate-spin" /> Saving…</>}
          {save === 'saved' && <>Saved</>}
          {save === 'dirty' && <>Unsaved changes</>}
          {save === 'error' && <span className="text-destructive">Not saved: {saveError}</span>}
        </div>
      </div>

      {init.detection && step === 'fields' && (
        <Card className="border-amber-200 bg-amber-50/60"><CardContent className="flex gap-3 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <p className="font-medium text-amber-900">Suggested fields are a starting point, not a guarantee</p>
            <p className="text-amber-900/80">
              {fields.some((f) => f.source !== 'manual') ? `${fields.filter((f) => f.source !== 'manual').length} fields were suggested` : 'No fields were found automatically'}
              {init.detection.methods?.length ? ` using ${init.detection.methods.map((m) => ({ acroform: 'the PDF’s form fields', text: 'text and layout analysis', ocr: 'OCR (scanned pages)' } as Record<string, string>)[m] ?? m).join(', ')}` : ''}. Detection runs on our server only; nothing is sent to an outside AI or OCR service.
              Dashed amber boxes are uncertain: check each one. Detection can miss fields or place them wrongly, so review every page.
            </p>
            {init.detection.notes?.filter((n) => !n.startsWith('Detection is heuristic')).map((n) => <p key={n} className="text-amber-900/80">• {n}</p>)}
          </div>
        </CardContent></Card>
      )}

      {step === 'fields' && (
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 p-2 shadow-sm backdrop-blur">
          {FIELD_TYPES.map((t) => {
            const Icon = FIELD_ICONS[t];
            return (
              <Button key={t} type="button" size="sm" variant={armed === t ? 'default' : 'outline'} onClick={() => setArmed(armed === t ? null : t)} aria-pressed={armed === t}>
                <Icon className="size-4" /> {FIELD_TYPE_LABELS[t]}
              </Button>
            );
          })}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {recipients.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Assign new fields to
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={activeSigner} onChange={(e) => setActiveSigner(Number(e.target.value))}>
                  {recipients.map((r, i) => <option key={r.key} value={i + 1}>{r.name || `Signer ${i + 1}`}</option>)}
                </select>
              </label>
            )}
            {uncertain.length > 0 && <Button size="sm" variant="outline" onClick={jumpToUncertain}><AlertTriangle className="size-4 text-amber-600" /> {uncertain.length} to check</Button>}
          </div>
          {armed && <p className="w-full text-xs text-muted-foreground">Tap or click on the page where the {FIELD_TYPE_LABELS[armed].toLowerCase()} should go. Esc to cancel.</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- pages ---- */}
        <div className="min-w-0 space-y-4">
          {pdfError && <Card><CardContent className="p-4 text-sm text-destructive">{pdfError}</CardContent></Card>}
          {step === 'review' && (
            <div className="flex items-center justify-between rounded-lg border bg-card p-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /> Previous</Button>
              <span className="text-sm font-medium">Page {page} of {init.pages.length} <span className="text-xs text-muted-foreground">({visited.size} viewed)</span></span>
              <Button size="sm" variant="outline" disabled={page >= init.pages.length} onClick={() => setPage(page + 1)}>Next <ChevronRight className="size-4" /></Button>
            </div>
          )}
          {pageList.map((n) => (
            <div key={n} className="mx-auto w-full max-w-[820px]">
              {step !== 'review' && <p className="mb-1 text-xs text-muted-foreground">Page {n}</p>}
              <PdfPageView doc={doc} pageNumber={n} meta={init.pages[n - 1]} onLayer={(el) => { layers.current[n] = el; }}>
                <div className={`absolute inset-0 ${armed && step === 'fields' ? 'cursor-crosshair' : ''}`} onPointerDown={step === 'fields' ? (e) => onLayerDown(e, n) : undefined}>
                  {fields.filter((f) => f.page === n).map((f) => (
                    <FieldBox key={f.key} field={f} selected={step === 'fields' && f.key === selected}
                      signerLabel={f.recipient_index ? recipients[f.recipient_index - 1]?.name || `Signer ${f.recipient_index}` : 'Unassigned'}
                      onPointerDown={step === 'fields' ? (e) => onFieldDown(e, f, 'move') : undefined}
                      onResizeDown={step === 'fields' ? (e) => onFieldDown(e, f, 'resize') : undefined} />
                  ))}
                </div>
              </PdfPageView>
            </div>
          ))}
        </div>

        {/* ---- side panel ---- */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {step === 'fields' && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{sel ? `${FIELD_TYPE_LABELS[sel.type]} field` : 'Fields'}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!sel && <p className="text-muted-foreground">Pick a field type above and click the page to place it, or select a field to move, resize or configure it. Arrow keys nudge; Delete removes.</p>}
                {sel && (
                  <>
                    {sel.needs_review && !sel.reviewed && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        <p className="font-medium">Please check this suggestion{sel.confidence !== null ? ` (confidence ${Math.round(sel.confidence * 100)}%)` : ''}</p>
                        {sel.detection_note && <p>{sel.detection_note}</p>}
                        <Button size="sm" className="mt-2" onClick={() => updateField(sel.key, { reviewed: true }, false)}>Looks right</Button>
                      </div>
                    )}
                    <div className="space-y-1.5"><Label>Type</Label>
                      <select className="h-10 w-full rounded-md border bg-background px-2" value={sel.type} onChange={(e) => updateField(sel.key, { type: e.target.value as FieldType, prefill_value: e.target.value === 'text' ? sel.prefill_value : null, date_format: e.target.value === 'date' ? 'MMM d, yyyy' : null })}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                      </select></div>
                    <div className="space-y-1.5"><Label>Assigned to</Label>
                      <select className="h-10 w-full rounded-md border bg-background px-2" value={sel.recipient_index ?? ''} onChange={(e) => updateField(sel.key, { recipient_index: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">{sel.type === 'text' ? 'Nobody (sender fills it)' : 'Unassigned'}</option>
                        {recipients.map((r, i) => <option key={r.key} value={i + 1}>{r.name || `Signer ${i + 1}`}</option>)}
                      </select>
                      {recipients.length === 0 && <p className="text-xs text-muted-foreground">Add signers in step 2, then assign fields.</p>}
                      {sel.role_hint && <p className="text-xs text-muted-foreground">Nearby text suggests: “{sel.role_hint}”.</p>}</div>
                    <div className="space-y-1.5"><Label>Label (shown to signer)</Label>
                      <Input value={sel.label ?? ''} maxLength={120} onChange={(e) => updateField(sel.key, { label: e.target.value || null })} /></div>
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={sel.required} onChange={(e) => updateField(sel.key, { required: e.target.checked })} /> Required</label>
                    {sel.type === 'checkbox' && (
                      <div className="space-y-1.5"><Label>Exclusive choice group</Label>
                        <Input placeholder="e.g. financing (same name = pick one)" value={sel.group_key ?? ''} maxLength={60} onChange={(e) => updateField(sel.key, { group_key: e.target.value.trim() || null })} />
                        <p className="text-xs text-muted-foreground">Checkboxes sharing a group name are mutually exclusive. Signers always tick their own boxes; nothing is ever pre-ticked.</p></div>
                    )}
                    {sel.type === 'date' && (
                      <div className="space-y-1.5"><Label>Date format</Label>
                        <select className="h-10 w-full rounded-md border bg-background px-2" value={sel.date_format ?? 'MMM d, yyyy'} onChange={(e) => updateField(sel.key, { date_format: e.target.value })}>
                          {DATE_FORMATS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select><p className="text-xs text-muted-foreground">Filled automatically with the date the signer finishes.</p></div>
                    )}
                    {sel.type === 'text' && (
                      <div className="space-y-1.5"><Label>Pre-filled by you (optional)</Label>
                        <Input value={sel.prefill_value ?? ''} maxLength={1000} onChange={(e) => updateField(sel.key, { prefill_value: e.target.value || null, recipient_index: e.target.value ? null : sel.recipient_index })} />
                        <p className="text-xs text-muted-foreground">Your text is kept separate from what signers enter and cannot be edited by them.</p></div>
                    )}
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => removeField(sel.key)}><Trash2 className="size-4" /> Delete field</Button>
                  </>
                )}
                <div className="border-t pt-3 text-xs text-muted-foreground">{fields.length} field{fields.length === 1 ? '' : 's'} · {recipients.length} signer{recipients.length === 1 ? '' : 's'}</div>
              </CardContent>
            </Card>
          )}

          {step === 'signers' && (
            <>
              <Card><CardHeader className="pb-2"><CardTitle className="text-base">Signers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {recipients.length === 0 && <p className="text-sm text-muted-foreground">Add everyone who must sign.</p>}
                  {recipients.map((r, i) => (
                    <div key={r.key} className="space-y-2 rounded-md border p-3" style={{ borderLeft: `4px solid ${colorFor(i + 1).stroke}` }}>
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{order === 'sequential' ? `Signs ${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'}` : `Signer ${i + 1}`}</span>
                        <div className="flex gap-1">
                          {order === 'sequential' && <><Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === 0} onClick={() => moveSigner(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                            <Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === recipients.length - 1} onClick={() => moveSigner(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button></>}
                          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => removeSigner(i)} aria-label="Remove signer"><Trash2 className="size-4" /></Button></div></div>
                      <Input placeholder="Full name" maxLength={200} value={r.name} onChange={(e) => { setRecipients((rs) => rs.map((x, k) => (k === i ? { ...x, name: e.target.value } : x))); touch(); }} />
                      <Input placeholder="Email" type="email" inputMode="email" maxLength={254} value={r.email} onChange={(e) => { setRecipients((rs) => rs.map((x, k) => (k === i ? { ...x, email: e.target.value } : x))); touch(); }} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addSigner} disabled={recipients.length >= 10}><UserPlus className="size-4" /> Add signer</Button>
                  {recipients.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => { setFields((fs) => autoAssign(fs, recipients.length)); touch(); }}>Assign unassigned fields by nearby role words</Button>}
                  <div className="space-y-1.5 border-t pt-3"><Label>Signing order</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['sequential', 'In sequence'], ['parallel', 'Any order']] as const).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => { setOrder(v); touch(); }} className={`rounded-md border p-2 text-sm ${order === v ? 'border-primary bg-primary/5 font-medium' : 'text-muted-foreground'}`}>{l}</button>))}
                    </div>
                    <p className="text-xs text-muted-foreground">{order === 'sequential' ? 'Each signer is invited only after the previous one finishes.' : 'Everyone is invited immediately and can sign in any order.'}</p></div>
                </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-base">Email</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5"><Label htmlFor="subject">Subject *</Label><Input id="subject" maxLength={200} value={subject} onChange={(e) => { setSubject(e.target.value); touch(); }} /></div>
                  <div className="space-y-1.5"><Label htmlFor="msg">Message</Label><Textarea id="msg" rows={4} maxLength={4000} value={message} onChange={(e) => { setMessage(e.target.value); touch(); }} placeholder="Add a short note for your signers (optional)" /></div>
                  <div className="space-y-1.5"><Label htmlFor="exp">Link expires after (days)</Label><Input id="exp" type="number" min={1} max={90} value={expiryDays} onChange={(e) => { setExpiryDays(Math.max(1, Math.min(90, Number(e.target.value) || 14))); touch(); }} /></div>
                </CardContent></Card>
            </>
          )}

          {step === 'review' && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Review before sending</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Page through the whole document and check every field is where the signer should sign. Colours match each signer.</p>
                <ul className="space-y-1">
                  {recipients.map((r, i) => (<li key={r.key} className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: SIGNER_COLORS[i % SIGNER_COLORS.length].stroke }} /> <span className="truncate">{r.name || `Signer ${i + 1}`}</span><span className="ml-auto text-xs text-muted-foreground">{fields.filter((f) => f.recipient_index === i + 1).length} fields</span></li>))}
                </ul>
                {problems.length > 0 ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900"><p className="mb-1 font-medium">Fix before sending</p>{problems.map((p) => <p key={p}>• {p}</p>)}</div>
                ) : (<p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-4" /> Everything required is in place.</p>)}
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p><strong>How signers are identified:</strong> by a unique, expiring link sent to the email address you entered. No ID check is done, so an email link does not prove someone’s legal identity. Signatures are drawn or typed electronic signatures, not certificate-based digital signatures.</p>
                  <p className="mt-1">{LEGAL_REVIEW_NOTE}</p>
                </div>
                <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!allVisited} />
                  <span className={allVisited ? '' : 'text-muted-foreground'}>I have reviewed the field placement on every page{!allVisited ? ` (view all ${init.pages.length} pages first)` : ''}.</span></label>
                {sendError && <p className="text-destructive">{sendError}</p>}
                <Button className="w-full" disabled={problems.length > 0 || !confirmed || sending} onClick={doSend}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send for signature</Button>
                <p className="text-xs text-muted-foreground">Once sent, the document and fields are locked. Changing anything later creates a new version and cancels this request.</p>
              </CardContent></Card>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (confirm('Delete this draft and its uploaded file?')) { const r = await deleteDraftAction(init.versionId); if (r.ok) router.push('/app/documents'); } }}><Trash2 className="size-4" /> Delete draft</Button>
            {step !== 'review' && <Button type="button" onClick={async () => { await flush(); setStep(step === 'fields' ? 'signers' : 'review'); window.scrollTo({ top: 0 }); }}>{step === 'fields' ? 'Next: signers' : 'Next: review'} <ChevronRight className="size-4" /></Button>}
          </div>
        </aside>
      </div>
    </div>
  );
}
