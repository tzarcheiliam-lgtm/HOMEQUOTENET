/**
 * Native-PDF extraction: text runs and vector rules/boxes in DISPLAYED coordinates (points,
 * top-left origin, after /Rotate and CropBox), via pdf.js. Feeds layout.ts.
 */
import { openWithPdfjs } from '@/lib/signing/pdfjs';
import type { Box, HLine, PageLayout, TextRun } from '@/lib/signing/layout';

type M = number[];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

export async function extractLayouts(bytes: Uint8Array): Promise<{ layouts: PageLayout[]; textChars: number[]; bigImage: boolean[] }> {
  const { pdfjs, pdf, destroy } = await openWithPdfjs(bytes);
  const OPS = pdfjs.OPS as Record<string, number>;
  const STROKE = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const layouts: PageLayout[] = [];
  const textChars: number[] = [];
  const bigImage: boolean[] = [];
  const IMAGE_OPS = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintJpegXObject, OPS.paintImageXObjectRepeat].filter((n) => n !== undefined));
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const layout: PageLayout = { width: vp.width, height: vp.height, runs: [], lines: [], boxes: [] };
      const tc = await page.getTextContent();
      let chars = 0;
      for (const item of tc.items as { str?: string; transform?: number[]; width?: number }[]) {
        if (!item.str || !item.transform) continue;
        chars += item.str.trim().length;
        const m = mul(vp.transform as M, item.transform);
        const size = Math.hypot(m[2], m[3]);
        if (!size || Math.abs(m[1]) > 0.25 * Math.abs(m[0])) continue; // only upright (in the displayed page) text
        if (!item.str.trim() && item.str.length < 2) continue;
        layout.runs.push({ str: item.str, x: m[4], w: Math.abs(item.width ?? 0) * Math.hypot(m[0], m[1]) / Math.max(1e-6, Math.hypot(item.transform[0], item.transform[1])) , baseline: m[5], size } satisfies TextRun);
      }
      textChars.push(chars);

      const ops = await page.getOperatorList();
      const stack: M[] = [];
      let ctm: M = [1, 0, 0, 1, 0, 0];
      const base = vp.transform as M;
      let pageHasBigImage = false;
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.transform) ctm = mul(ctm, args as M);
        else if (IMAGE_OPS.has(fn)) {
          const f = mul(base, ctm);
          if (Math.abs(f[0] * f[3] - f[1] * f[2]) >= 0.5 * vp.width * vp.height) pageHasBigImage = true;
        }
        else if (fn === OPS.constructPath) {
          const [op, data] = args as [number, ArrayLike<number>[]];
          const path = data?.[0];
          if (!path) continue;
          const full = mul(base, ctm);
          const subpaths: { x: number; y: number }[][] = [];
          let cur: { x: number; y: number }[] = [];
          let closed = false;
          for (let k = 0; k < path.length;) {
            const code = path[k++];
            if (code === 0) { if (cur.length) subpaths.push(cur); cur = [apply(full, path[k], path[k + 1])]; k += 2; closed = false; }
            else if (code === 1) { cur.push(apply(full, path[k], path[k + 1])); k += 2; }
            else if (code === 2) { k += 6; cur.push({ x: NaN, y: NaN }); }
            else if (code === 3) { k += 4; cur.push({ x: NaN, y: NaN }); }
            else if (code === 4) { closed = true; if (cur.length) cur.push({ ...cur[0] }); }
          }
          if (cur.length) subpaths.push(cur);
          void closed;
          const stroked = STROKE.has(op);
          const filled = op === OPS.fill || op === OPS.eoFill || op === OPS.fillStroke || op === OPS.eoFillStroke || op === OPS.closeFillStroke || op === OPS.closeEOFillStroke;
          for (const sp of subpaths) {
            if (sp.some((p) => Number.isNaN(p.x))) continue;
            const xs = sp.map((p) => p.x), ys = sp.map((p) => p.y);
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            const w = x1 - x0, h = y1 - y0;
            if (sp.length === 2) {
              if (h <= 1.2 && w >= 20 && stroked) layout.lines.push({ x1: x0, x2: x1, y: (y0 + y1) / 2 } satisfies HLine);
            } else if (sp.length >= 4 && sp.length <= 6) {
              const axisAligned = sp.every((p, j) => j === 0 || Math.abs(p.x - sp[j - 1].x) < 0.5 || Math.abs(p.y - sp[j - 1].y) < 0.5);
              if (!axisAligned) continue;
              if (h <= 1.6 && w >= 20 && (filled || stroked)) layout.lines.push({ x1: x0, x2: x1, y: (y0 + y1) / 2 });
              else if (w >= 5 && h >= 5 && stroked && !(filled && w > 30 && h > 30)) layout.boxes.push({ x: x0, y: y0, w, h } satisfies Box);
            }
          }
        }
      }
      layouts.push(layout);
      bigImage.push(pageHasBigImage);
      page.cleanup();
    }
  } finally {
    await destroy();
  }
  return { layouts, textChars, bigImage };
}
