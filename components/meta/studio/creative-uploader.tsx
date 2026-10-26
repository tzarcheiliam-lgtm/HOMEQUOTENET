'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { finalizeCreativeUpload, startCreativeUpload } from '@/lib/actions/meta-studio';

type Phase = 'idle' | 'registering' | 'uploading' | 'checking' | 'done' | 'error';
const BUCKET = 'meta-creatives';

/** Grabs one frame from a video as a small JPEG for the library thumbnail. The original file is never touched. */
async function videoThumb(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'metadata'; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); });
    v.currentTime = Math.min(1, (v.duration || 1) / 2);
    await new Promise<void>((res) => { v.onseeked = () => res(); });
    const c = document.createElement('canvas');
    const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.max(1, Math.round(v.videoWidth * scale)); c.height = Math.max(1, Math.round(v.videoHeight * scale));
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    return await new Promise<Blob | null>((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.8));
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

export function CreativeUploader({ contractors }: { contractors: { id: string; name: string }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; kind: 'image' | 'video'; name: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  function pick(f: File | null) {
    setFile(f); setMessage(null); setPhase('idle');
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(f ? { url: URL.createObjectURL(f), kind: f.type.startsWith('video/') ? 'video' : 'image', name: f.name } : null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setMessage('Choose a file first.'); setPhase('error'); return; }
    const fd = new FormData(e.currentTarget);
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    fd.set('kind', kind); fd.set('mime', file.type); fd.set('bytes', String(file.size));
    if (!fd.get('name')) fd.set('name', file.name.replace(/\.[^.]+$/, ''));
    setPhase('registering'); setMessage(null);
    let started: Awaited<ReturnType<typeof startCreativeUpload>>;
    try { started = await startCreativeUpload(undefined, fd); }
    catch { setPhase('error'); setMessage('Something went wrong while preparing the upload. Please try again.'); return; }
    if (started?.error || !started?.id) { setPhase('error'); setMessage(started?.error ?? 'Could not start the upload.'); return; }
    const info = started.data as { path: string; token: string };
    setPhase('uploading');
    const storage = createClient().storage.from(BUCKET);
    let up: Awaited<ReturnType<typeof storage.uploadToSignedUrl>>;
    try { up = await storage.uploadToSignedUrl(info.path, info.token, file, { contentType: file.type }); } catch { setPhase('error'); setMessage('Upload failed. Check your connection and try again.'); return; }
    if (up.error) { setPhase('error'); setMessage('Upload failed. Check your connection and try again.'); return; }
    const thumb = (started.data as { thumb: { path: string; token: string } | null }).thumb;
    if (thumb && kind === 'video') { const blob = await videoThumb(file); if (blob) await storage.uploadToSignedUrl(thumb.path, thumb.token, blob, { contentType: 'image/jpeg' }); }
    setPhase('checking');
    let done: Awaited<ReturnType<typeof finalizeCreativeUpload>>;
    try { done = await finalizeCreativeUpload(started.id); } catch { setPhase('error'); setMessage('Something went wrong while checking the file. It was not added; please try again.'); return; }
    if (done?.error) { setPhase('error'); setMessage(done.error); return; }
    setPhase('done'); setMessage(done?.success ?? 'Ready.');
    setFile(null); setPreview(null); if (input.current) input.current.value = '';
    window.location.reload();
  }

  const busy = phase === 'registering' || phase === 'uploading' || phase === 'checking';
  const label = { idle: 'Upload', registering: 'Preparing…', uploading: 'Uploading…', checking: 'Checking the file…', done: 'Done', error: 'Upload' }[phase];
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cu-file">Image (JPG, PNG) or video (MP4, MOV)</Label>
            <Input id="cu-file" ref={input} type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" onChange={(e) => pick(e.target.files?.[0] ?? null)} disabled={busy} />
          </div>
          <div className="space-y-1.5"><Label htmlFor="cu-name">Name</Label><Input id="cu-name" name="name" maxLength={120} placeholder="Defaults to the file name" disabled={busy} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-contractor">Contractor</Label>
            <Select id="cu-contractor" name="contractor_id" disabled={busy}>
              <option value="">HomeQuote network</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="cu-campaign">Campaign or project (optional)</Label><Input id="cu-campaign" name="campaign_label" maxLength={120} disabled={busy} /></div>
          <div className="space-y-1.5"><Label htmlFor="cu-tags">Tags (comma separated)</Label><Input id="cu-tags" name="tags" maxLength={400} disabled={busy} /></div>
          <input type="hidden" name="with_thumbnail" value={file?.type.startsWith('video/') ? '1' : ''} />
        </div>
        <div className="flex min-h-48 items-center justify-center rounded-lg border bg-muted/30 p-2">
          {!preview ? <p className="text-sm text-muted-foreground">Preview appears here</p>
            : preview.kind === 'image' ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview.url} alt={`Preview of ${preview.name}`} className="max-h-72 rounded object-contain" />
            : <video src={preview.url} controls muted playsInline className="max-h-72 rounded" />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Your original file is stored untouched. HQN does not crop, re-encode or generate variants; if a file is outside what Meta accepts you will be told why.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !file}><Upload className="size-4" aria-hidden="true" />{label}</Button>
        {message && <p role={phase === 'error' ? 'alert' : 'status'} className={phase === 'error' ? 'text-sm text-destructive' : 'text-sm text-emerald-700'}>{message}</p>}
      </div>
    </form>
  );
}
