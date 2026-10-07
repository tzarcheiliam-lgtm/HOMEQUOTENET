/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
/**
 * OCR for scanned (image-only) pages. Runs LOCALLY in this server process with tesseract.js
 * (WebAssembly) and a bundled English model, so page images are never sent to any external AI/OCR
 * service. Cost: server CPU/time only (no per-page fees). Limits: English text, ~150 dpi render,
 * horizontal text only, checkboxes are NOT detected in scans, and it can misread handwriting/noise.
 */
import path from 'node:path';
import { openWithPdfjs } from '@/lib/signing/pdfjs';
import type { HLine, PageLayout, TextRun } from '@/lib/signing/layout';

const SCALE = 2; // 144 dpi

function langDir(): string {
  return process.env.SIGNING_OCR_LANG_DIR || path.join(process.cwd(), 'lib', 'signing', 'assets');
}

interface OcrWord { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

function collectWords(data: any): OcrWord[] {
  if (Array.isArray(data?.words) && data.words.length) return data.words;
  const out: OcrWord[] = [];
  for (const b of data?.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const w of l.words ?? []) out.push(w);
  return out;
}

/** Horizontal rules from the raster: long runs of dark pixels, merged across 1–4 rows. */
export function rasterRules(gray: Uint8Array, w: number, h: number, scale: number): HLine[] {
  const minRun = Math.round(34 * scale);
  const rows: { y: number; x1: number; x2: number }[] = [];
  for (let y = 0; y < h; y++) {
    let start = -1, gaps = 0;
    for (let x = 0; x <= w; x++) {
      const dark = x < w && gray[y * w + x] < 150;
      if (dark) { if (start < 0) start = x; gaps = 0; }
      else if (start >= 0) {
        if (++gaps > 2 || x === w) {
          const end = x - gaps;
          if (end - start >= minRun) rows.push({ y, x1: start, x2: end });
          start = -1; gaps = 0;
        }
      }
    }
  }
  const merged: { y0: number; y1: number; x1: number; x2: number }[] = [];
  for (const r of rows) {
    const m = merged.find((c) => r.y - c.y1 <= 1 && Math.abs(c.x1 - r.x1) <= 6 && Math.abs(c.x2 - r.x2) <= 6);
    if (m) { m.y1 = r.y; m.x1 = Math.min(m.x1, r.x1); m.x2 = Math.max(m.x2, r.x2); }
    else merged.push({ y0: r.y, y1: r.y, x1: r.x1, x2: r.x2 });
  }
  // a rule is thin; thick bars / text underlines glued to glyph rows are ignored
  return merged.filter((m) => m.y1 - m.y0 <= 5 * scale).map((m) => ({ x1: m.x1 / scale, x2: m.x2 / scale, y: (m.y0 + m.y1) / 2 / scale }));
}

/** Renders pages and returns their ruled lines only (for searchable scans whose text layer has no vector rules). */
export async function rasterRulesForPages(bytes: Uint8Array, pageNumbers: number[]): Promise<Map<number, HLine[]>> {
  const out = new Map<number, HLine[]>();
  if (!pageNumbers.length) return out;
  const { pdf, destroy } = await openWithPdfjs(bytes);
  try {
    for (const n of pageNumbers) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: SCALE });
      const cc = (pdf as unknown as { canvasFactory: { create(w: number, h: number): { canvas: any; context: any } } }).canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: cc.context, viewport: vp, canvas: cc.canvas } as never).promise;
      const img = cc.context.getImageData(0, 0, cc.canvas.width, cc.canvas.height);
      const gray = new Uint8Array(cc.canvas.width * cc.canvas.height);
      for (let i = 0, j = 0; i < img.data.length; i += 4, j++) gray[j] = (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11) | 0;
      out.set(n, rasterRules(gray, cc.canvas.width, cc.canvas.height, SCALE));
      page.cleanup();
    }
  } finally {
    await destroy();
  }
  return out;
}

export async function ocrPages(bytes: Uint8Array, pageNumbers: number[]): Promise<Map<number, PageLayout>> {
  const result = new Map<number, PageLayout>();
  if (!pageNumbers.length) return result;
  const { pdf, destroy } = await openWithPdfjs(bytes);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    langPath: langDir(),
    gzip: false,
    cacheMethod: 'none',
    logger: () => undefined,
    errorHandler: () => undefined,
  } as never);
  try {
    for (const n of pageNumbers) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: SCALE });
      const canvasAndContext = (pdf as unknown as { canvasFactory: { create(w: number, h: number): { canvas: any; context: any } } }).canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: canvasAndContext.context, viewport: vp, canvas: canvasAndContext.canvas } as never).promise;
      const { canvas, context } = canvasAndContext;
      const img = context.getImageData(0, 0, canvas.width, canvas.height);
      const gray = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0, j = 0; i < img.data.length; i += 4, j++) gray[j] = (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11) | 0;
      const png: Buffer = canvas.toBuffer('image/png');
      const { data } = await worker.recognize(png, {}, { blocks: true } as never);
      const runs: TextRun[] = [];
      for (const w of collectWords(data)) {
        const text = String(w.text ?? '').trim();
        if (!text) continue;
        const h = (w.bbox.y1 - w.bbox.y0) / SCALE;
        runs.push({ str: text, x: w.bbox.x0 / SCALE, w: (w.bbox.x1 - w.bbox.x0) / SCALE, baseline: w.bbox.y1 / SCALE - h * 0.18, size: Math.max(6, h * 1.05) });
      }
      result.set(n, { width: vp.width / SCALE, height: vp.height / SCALE, runs, lines: rasterRules(gray, canvas.width, canvas.height, SCALE), boxes: [] });
      page.cleanup();
    }
  } finally {
    await worker.terminate();
    await destroy();
  }
  return result;
}
