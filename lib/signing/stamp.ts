/**
 * Stamps sender prefill + signer-entered values onto a COPY of the original PDF.
 * Everything is positioned from displayed-page fractions via geometry.placeRect, so rotated pages and
 * CropBox offsets land where the sender saw them. Text is fitted (shrink, then wrap); if it cannot fit
 * it is rejected earlier at signing time (see fitText) instead of being clipped here.
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import * as fontkitModule from 'fontkit';
import fs from 'node:fs';
import path from 'node:path';
import type { FieldType } from '@/lib/signing/constants';
import { displayedToUser, makePageGeom, placeRect, type PageGeom } from '@/lib/signing/geometry';

export interface StampField {
  id: string;
  type: FieldType;
  page: number;
  x: number; y: number; w: number; h: number;
  prefill_value: string | null;
  source_ref: string | null;
  source: string;
}
export interface StampValue {
  field_id: string;
  value: string | null;
  sig_method: 'drawn' | 'typed' | null;
  typed_text: string | null;
  image_png: string | null;
}

let unicodeFontBytes: Uint8Array | null = null;
export function loadUnicodeFont(): Uint8Array {
  if (!unicodeFontBytes) {
    const dir = process.env.SIGNING_ASSET_DIR || path.join(process.cwd(), 'lib', 'signing', 'assets');
    unicodeFontBytes = fs.readFileSync(path.join(dir, 'DejaVuSans.ttf'));
  }
  return unicodeFontBytes;
}

export interface Fonts { latin: PDFFont; unicode: () => Promise<PDFFont> }

export async function prepareFonts(doc: PDFDocument): Promise<Fonts> {
  const latin = await doc.embedFont(StandardFonts.Helvetica);
  let unicode: PDFFont | null = null;
  return {
    latin,
    unicode: async () => {
      if (!unicode) {
        doc.registerFontkit(((fontkitModule as unknown as { default?: unknown }).default ?? fontkitModule) as never);
        unicode = await doc.embedFont(loadUnicodeFont(), { subset: true });
      }
      return unicode;
    },
  };
}

export async function fontFor(text: string, fonts: Fonts): Promise<PDFFont> {
  const set = new Set(fonts.latin.getCharacterSet());
  for (const ch of text) if (!set.has(ch.codePointAt(0)!)) return fonts.unicode();
  return fonts.latin;
}

export interface Fit { size: number; lines: string[] }

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] | null {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxW) { line = next; continue; }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxW) { line = word; continue; }
      // a single very long token: hard-break it
      let chunk = '';
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxW && chunk) { lines.push(chunk); chunk = ch; } else chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

/** Fits text into a box (points). Shrinks a single line first, then wraps; null = cannot fit legibly. */
export function fitText(text: string, font: PDFFont, wPt: number, hPt: number): Fit | null {
  const maxW = Math.max(4, wPt - 4);
  const maxSize = Math.min(12, Math.max(6, hPt - 4));
  const single = !text.includes('\n');
  if (single) {
    for (let size = maxSize; size >= 6; size -= 0.5) {
      if (font.widthOfTextAtSize(text, size) <= maxW) return { size, lines: [text] };
    }
  }
  for (let size = Math.min(maxSize, 10); size >= 6.5; size -= 0.5) {
    const lines = wrap(text, font, size, maxW);
    if (lines && lines.length * size * 1.15 <= hPt - 2) return { size, lines };
  }
  return null;
}

/** Can this text be drawn legibly in a field of this size? Used to reject at submit time. */
export async function textFits(text: string, fieldWpt: number, fieldHpt: number): Promise<boolean> {
  const doc = await PDFDocument.create();
  const fonts = await prepareFonts(doc);
  const font = await fontFor(text, fonts);
  return fitText(text, font, fieldWpt, fieldHpt) !== null;
}

function drawTextBox(page: PDFPage, geom: PageGeom, f: { x: number; y: number; w: number; h: number }, fit: Fit, font: PDFFont) {
  const lineH = fit.size * 1.15;
  const totalH = fit.lines.length * lineH;
  const boxH = f.h * geom.height;
  const boxTop = f.y * geom.height;
  const startTop = boxTop + Math.max(0, (boxH - totalH) / 2);
  fit.lines.forEach((line, i) => {
    const baselineY = startTop + i * lineH + fit.size * 0.92;
    const p = displayedToUser(geom, f.x * geom.width + 2, baselineY);
    page.drawText(line, { x: p.x, y: p.y, size: fit.size, font, color: rgb(0.05, 0.05, 0.12), rotate: degrees(geom.rotation) });
  });
}

export async function stampPdf(original: Uint8Array, fields: StampField[], values: StampValue[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(original, { updateMetadata: false, ignoreEncryption: false, throwOnInvalidObject: false });
  const fonts = await prepareFonts(doc);
  const pages = doc.getPages();
  const geoms = pages.map((p) => {
    const b = p.getCropBox();
    return makePageGeom({ x: b.x, y: b.y, w: b.width, h: b.height }, p.getRotation().angle);
  });
  const byField = new Map(values.map((v) => [v.field_id, v]));

  // Drop the original interactive fields we replaced, so an empty widget does not draw over the value.
  const consumed = new Set(fields.filter((f) => f.source === 'acroform' && f.source_ref).map((f) => f.source_ref!.replace(/#\d+$/, '')));
  if (consumed.size) {
    try {
      const form = doc.getForm();
      for (const name of consumed) {
        try { form.removeField(form.getField(name)); } catch { /* leave it in place */ }
      }
    } catch { /* no form */ }
  }

  for (const f of fields) {
    const page = pages[f.page - 1];
    const geom = geoms[f.page - 1];
    if (!page || !geom) continue;
    const v = byField.get(f.id);
    if (f.type === 'signature' || f.type === 'initials') {
      if (!v?.image_png) continue;
      const img = await doc.embedPng(Buffer.from(v.image_png, 'base64'));
      const boxW = f.w * geom.width, boxH = f.h * geom.height;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * scale, h = img.height * scale;
      const sub = { x: f.x + ((boxW - w) / 2) / geom.width, y: f.y + ((boxH - h) / 2) / geom.height, w: w / geom.width, h: h / geom.height };
      const p = placeRect(geom, sub);
      page.drawImage(img, { x: p.x, y: p.y, width: p.width, height: p.height, rotate: degrees(p.rotateDeg) });
    } else if (f.type === 'checkbox') {
      if (v?.value !== 'true') continue;
      const s = Math.min(f.w * geom.width, f.h * geom.height);
      const ox = f.x * geom.width + (f.w * geom.width - s) / 2, oy = f.y * geom.height + (f.h * geom.height - s) / 2;
      const pt = (fx: number, fy: number) => displayedToUser(geom, ox + fx * s, oy + fy * s);
      const a = pt(0.2, 0.55), b = pt(0.42, 0.78), c = pt(0.82, 0.22);
      const thickness = Math.max(1, s * 0.12);
      page.drawLine({ start: a, end: b, thickness, color: rgb(0.05, 0.05, 0.12) });
      page.drawLine({ start: b, end: c, thickness, color: rgb(0.05, 0.05, 0.12) });
    } else {
      const text = (f.prefill_value ?? v?.value ?? '').toString();
      if (!text.trim()) continue;
      const font = await fontFor(text, fonts);
      const fit = fitText(text, font, f.w * geom.width, f.h * geom.height);
      if (!fit) throw new Error(`Text does not fit field ${f.id}`);
      drawTextBox(page, geom, f, fit, font);
    }
  }
  return doc.save();
}
