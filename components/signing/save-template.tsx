'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { BookmarkPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveTemplateAction } from '@/lib/actions/signing';

/**
 * Saves this document's PDF + field layout as a reusable template. Signer ROLES are saved, never people: no names,
 * emails or signed values are kept (pre-filled text is kept only if you tick the box).
 */
export function SaveTemplate({ versionId, signerCount, defaultName, beforeSave }: { versionId: string; signerCount: number; defaultName: string; beforeSave?: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState<string[]>(() => Array.from({ length: signerCount }, (_, i) => `Signer ${i + 1}`));
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) return <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Saved as a template. <Link className="underline" href="/app/documents/templates">View templates</Link></p>;
  if (!open) {
    return <Button type="button" variant="outline" size="sm" disabled={signerCount < 1} onClick={() => setOpen(true)} title={signerCount < 1 ? 'Add at least one signer first' : undefined}><BookmarkPlus className="size-4" /> Save as template</Button>;
  }
  const submit = () => start(async () => {
    setError(null);
    if (beforeSave && !(await beforeSave())) return setError('Could not save your changes first.');
    const r = await saveTemplateAction(versionId, { name, description, roleLabels: labels, keepPrefill: keep });
    if (!r.ok) return setError(r.error);
    setDone(true);
  });
  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <p className="text-xs text-muted-foreground">Saves the PDF and where every field goes, by signer role. Signer names, emails and anything signed are not saved.</p>
      <div className="space-y-1.5"><Label htmlFor="tpl-name">Template name *</Label><Input id="tpl-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="tpl-desc">Description</Label><Input id="tpl-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use it (optional)" /></div>
      <div className="space-y-1.5"><Label>Signer roles (in signing order)</Label>
        {labels.map((l, i) => <Input key={i} aria-label={`Role ${i + 1}`} maxLength={60} value={l} onChange={(e) => setLabels((ls) => ls.map((x, k) => (k === i ? e.target.value : x)))} />)}
      </div>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
        <span>Also keep text I pre-filled on the document <span className="text-muted-foreground">(leave off if it contains details of this customer)</span></span></label>
      {error && <p className="text-destructive" role="alert">{error}</p>}
      <div className="flex gap-2"><Button type="button" size="sm" onClick={submit} disabled={pending || !name.trim() || labels.some((l) => !l.trim())}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Save template</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button></div>
    </div>
  );
}
