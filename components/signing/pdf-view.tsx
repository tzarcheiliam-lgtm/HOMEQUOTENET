'use client';

import { useEffect, useRef, useState } from 'react';
import type { UiPage } from '@/lib/signing/view';

// pdf.js is loaded on demand (legacy build: works on older iOS/Android WebViews).
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
type PdfDoc = import('pdfjs-dist/legacy/build/pdf.mjs').PDFDocumentProxy;

let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      return m;
    });
  }
  return pdfjsPromise;
}

export function usePdf(url: string | null) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let task: { promise: Promise<PdfDoc>; destroy(): Promise<void> } | null = null;
    setDoc(null); setError(null);
    loadPdfjs()
      .then((pdfjs) => { task = pdfjs.getDocument({ url, isEvalSupported: false } as never); return task!.promise; })
      .then((d) => { if (!cancelled) setDoc(d); })
      .catch(() => { if (!cancelled) setError('The document could not be displayed.'); });
    return () => { cancelled = true; void task?.destroy(); };
  }, [url]);
  return { doc, error };
}

/**
 * One page: a box with the page's exact aspect ratio (known up front, so no layout shift), a canvas drawn
 * lazily when near the viewport, and an overlay layer whose children use % of the page.
 */
export function PdfPageView({ doc, pageNumber, meta, children, className, onLayer }: {
  doc: PdfDoc | null; pageNumber: number; meta: UiPage; children?: React.ReactNode; className?: string;
  onLayer?: (el: HTMLDivElement | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [drawn, setDrawn] = useState<string>('');

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setVisible(true); }, { rootMargin: '800px' });
    io.observe(el);
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    setWidth(Math.round(el.clientWidth));
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);

  useEffect(() => {
    if (!doc || !visible || !width || !canvas.current) return;
    const key = `${width}`;
    if (drawn === key) return;
    let cancelled = false;
    let task: { cancel(): void; promise: Promise<unknown> } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current!;
      c.width = Math.floor(viewport.width); c.height = Math.floor(viewport.height);
      task = page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport });
      await task.promise;
      if (!cancelled) setDrawn(key);
    })().catch(() => undefined);
    return () => { cancelled = true; task?.cancel(); };
  }, [doc, visible, width, pageNumber, drawn]);

  return (
    <div ref={wrap} className={`relative w-full select-none overflow-hidden bg-white shadow-sm ring-1 ring-border ${className ?? ''}`} style={{ aspectRatio: `${meta.w} / ${meta.h}` }} data-page={pageNumber}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label={`Page ${pageNumber}`} />
      <div ref={onLayer} className="absolute inset-0">{children}</div>
    </div>
  );
}
