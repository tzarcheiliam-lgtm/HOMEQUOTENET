'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { prepareUploadAction, registerUploadAction } from '@/lib/actions/signing';
import { LIMITS, SIGNING_BUCKET } from '@/lib/signing/constants';

export function UploadForm({ contractors, fixedContractorId, defaultContractorId = '', leadId, leadName }: {  defaultContractorId?: string; contractors: { id: string; name: string }[] | null; fixedContractorId: string | null; leadId: string | null; leadName: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [contractorId, setContractorId] = useState<string>(fixedContractorId ?? defaultContractorId);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'analyzing'>('idle');
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | null) => {
    setError(null); setFile(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError('Please choose a PDF file.');
    if (f.size > LIMITS.maxFileBytes) return setError(`That file is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').slice(0, 200));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Choose a PDF first.');
    setError(null); setPhase('uploading');
    try {
      const prep = await prepareUploadAction(contractors ? contractorId || null : fixedContractorId);
      if (!prep.ok) throw new Error(prep.error);
      const { error: upErr } = await createClient().storage.from(SIGNING_BUCKET).uploadToSignedUrl(prep.path, prep.token, file, { contentType: 'application/pdf' });
      if (upErr) throw new Error('The upload failed. Check your connection and try again.');
      setPhase('analyzing');
      const reg = await registerUploadAction({ docId: prep.docId, versionId: prep.versionId, contractorId: prep.contractorId, title, leadId });
      if (!reg.ok) throw new Error(reg.error);
      router.push(`/app/documents/${reg.versionId}`);
    } catch (err) {
      setError((err as Error).message); setPhase('idle');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card><CardContent className="space-y-4 p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40">
          <FileUp className="size-8 text-muted-foreground" />
          <span className="font-medium">{file ? file.name : 'Choose a PDF'}</span>
          <span className="text-xs text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `Up to ${LIMITS.maxFileBytes / 1024 / 1024} MB and ${LIMITS.maxPages} pages. Not password-protected.`}</span>
          <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
        <div className="space-y-1.5"><Label htmlFor="title">Document title *</Label><Input id="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required /></div>
        {contractors && (
          <div className="space-y-1.5"><Label htmlFor="company">Company</Label>
            <Select id="company" value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
              <option value="">HomeQuote Network (internal)</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Decides whose users can see and manage this document.</p></div>
        )}
        {leadId && <p className="text-sm text-muted-foreground">This document will be attached to lead <strong>{leadName ?? leadId}</strong>.</p>}
      </CardContent></Card>
      <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>Your file is stored privately and your original is never modified. Suggested fields are found by analysing the PDF on our own server (including OCR for scanned pages); the document is not sent to an outside AI or OCR service.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" size="lg" disabled={!file || !title.trim() || phase !== 'idle'} className="max-lg:w-full">
        {phase === 'idle' ? 'Upload and find fields' : <><Loader2 className="size-4 animate-spin" /> {phase === 'uploading' ? 'Uploading…' : 'Finding suggested fields…'}</>}
      </Button>
    </form>
  );
}
