'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { activeSteps, funnelPhoto, pickedOptions } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import { RENDER_POLL_MS, RENDER_TIMEOUT_MS, checkRender, startRender } from '@/lib/estimator/render-client';
import { StepPhoto } from '../step-photo';
import { resolvePhoto } from '../state';

/** Largest side of the photo sent (3:2, like the render), and the biggest file a phone may pick. */
const OUT_W = 1800;
const OUT_H = 1200;
const MAX_PICK_BYTES = 25 * 1024 * 1024;

type Phase = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; url: string } | { kind: 'failed'; message: string };

/**
 * The roofing funnel's "See it on your house" (booking screen, after the lead
 * is saved): the homeowner takes or picks a photo of the front of THEIR home,
 * it is cropped to 3:2 and shrunk in the browser (JPEG, no metadata), sent to
 * the render route with their picks, and kie.ai repaints only the roof with
 * the material and colour they chose (the prompt is built on the server from
 * the picks). The render route's limits apply (per lead, per visitor per hour,
 * per day) and each render is recorded on the lead. Nothing is shown before a
 * render token exists (renders off, or nothing saved). If the render fails,
 * the example photo of their pick is shown instead.
 */
export function RoofPreview({ slug, spec, selection, renderToken }: { slug: string; spec: FunnelSpec; selection: FunnelSelection; renderToken: string }) {
  const uid = useId();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
  }, []);

  const steps = activeSteps(spec, selection);
  const last = steps[steps.length - 1];
  const example = last ? resolvePhoto(funnelPhoto(spec, last.id, selection), new Set()) : null;
  const picks = pickedOptions(spec, selection).map((o) => o.title.toLowerCase());
  const roofWords = picks.length >= 2 ? `${picks[picks.length - 1]} ${picks[0]}` : picks.join(' ');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_PICK_BYTES) {
      setPhase({ kind: 'failed', message: 'Please pick a photo (JPEG, PNG or HEIC) under 25 MB.' });
      return;
    }
    setPhase({ kind: 'working' });
    let dataUrl: string;
    try {
      dataUrl = await toUploadJpeg(file);
    } catch {
      setPhase({ kind: 'failed', message: 'That photo could not be read. Try another one, or a screenshot of it.' });
      return;
    }
    const start = await startRender(slug, renderToken, dataUrl, selection);
    if (!start.ok) {
      if (alive.current) setPhase({ kind: 'failed', message: start.message });
      return;
    }
    const until = Date.now() + RENDER_TIMEOUT_MS;
    while (alive.current && Date.now() < until) {
      await new Promise((r) => setTimeout(r, RENDER_POLL_MS));
      const status = await checkRender(slug, renderToken, start.taskId);
      if (!alive.current) return;
      if (status.status === 'done') return setPhase({ kind: 'done', url: status.imageUrl });
      if (status.status === 'failed') return setPhase({ kind: 'failed', message: status.message });
    }
    if (alive.current) setPhase({ kind: 'failed', message: 'This is taking longer than usual. Please try again.' });
  };

  return (
    <section aria-labelledby={`${uid}-h`} className="mt-4 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" data-funnel-roof-preview="">
      <h2 id={`${uid}-h`} className="text-[17px] font-medium leading-[24px] text-[var(--fn-ink)]">
        See it on your house
      </h2>
      {phase.kind === 'done' ? (
        <>
          <div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-[12px] bg-[var(--fn-bg,#f6f5f2)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- the render's own URL (kie.ai) */}
            <img src={phase.url} alt={`Your home with a new ${roofWords} roof (AI-generated preview)`} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="mt-2 text-[13px] leading-[18px] text-[var(--fn-muted)]">AI-generated preview of your {roofWords} roof, not the finished look. Your roofer brings real samples.</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)] [text-wrap:pretty]">
            Take or pick a photo of the front of your home. We&rsquo;ll show it with your new {roofWords} roof in about a minute.
          </p>
          {phase.kind === 'failed' && example ? (
            <div className="mt-3">
              <StepPhoto photos={[['pick', example]]} selected="pick" frame={{ fit: 'contain', zoom: 1, backdrop: 'blur' }} />
            </div>
          ) : null}
          <p role="status" aria-live="polite" className="mt-2 text-[14px] leading-5 text-[var(--fn-muted)] empty:hidden">
            {phase.kind === 'working' ? 'Putting your new roof on… this takes about a minute.' : phase.kind === 'failed' ? phase.message : ''}
          </p>
          <label
            className={`fn-btn mt-3 h-12 w-full gap-2 px-4 text-[16px] ${phase.kind === 'working' ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
            aria-disabled={phase.kind === 'working' || undefined}
          >
            {phase.kind === 'working' ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin motion-reduce:animate-none" /> : <Camera aria-hidden="true" className="size-[18px]" />}
            {phase.kind === 'working' ? 'Working on it…' : phase.kind === 'failed' ? 'Try another photo' : 'Add a photo of your home'}
            <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={phase.kind === 'working'} />
          </label>
        </>
      )}
    </section>
  );
}

/** The picked photo, centre-cropped to 3:2 and at most 1800 x 1200, as a JPEG data URL (the canvas drops EXIF and location). */
async function toUploadJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('unreadable'));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error('empty');
    // Centre crop to 3:2 landscape.
    const cropW = Math.min(w, (h * 3) / 2);
    const cropH = (cropW * 2) / 3;
    const scale = Math.min(1, OUT_W / cropW);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropW * scale);
    canvas.height = Math.round(Math.min(OUT_H, cropH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
