import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from '@cantoo/pdf-lib';
import * as fontkitModule from 'fontkit';
import { initialsOf } from '@/lib/contracts/logo';
import { contractNumber } from '@/lib/contracts/numbers';
import type { Block, RenderModel, Run } from '@/lib/contracts/render-model';
import { LOGO_SIZES, type Branding } from '@/lib/contracts/types';
import { loadUnicodeFont } from '@/lib/signing/stamp';

/**
 * Contract -> PDF. Letter pages, Helvetica family (DejaVu Sans for characters outside WinAnsi), real text
 * (selectable / searchable), logos preserved at their aspect ratio. Signature, printed-name and date field
 * rectangles are returned as page fractions for the signing engine.
 */
export class ContractRenderError extends Error {}

export interface PdfSigner { role: 'client' | 'homequote' | 'other'; label: string; name: string; email: string }
export interface PdfInput {
  title: string;
  contractNo: number | null;
  model: RenderModel;
  branding: Branding;
  clientName: string;
  hqName: string;
  hqLogo: Uint8Array | null;
  clientLogo: Uint8Array | null;
  signers: PdfSigner[];
  exhibits?: { name: string; bytes: Uint8Array }[];
}
export interface PdfFieldPlacement { signerIndex: number; type: 'signature' | 'name' | 'date'; page: number; x: number; y: number; w: number; h: number; label: string }
export interface PdfOutput { bytes: Uint8Array; pageCount: number; bodyPages: number; fields: PdfFieldPlacement[]; pages: { w: number; h: number }[] }

const W = 612, H = 792, MX = 58, TOP = 56, BOTTOM = 62;
const CW = W - MX * 2;
const INK = rgb(0.09, 0.1, 0.14), MUTED = rgb(0.42, 0.45, 0.5), NAVY = rgb(0.06, 0.09, 0.16), RULE = rgb(0.84, 0.86, 0.9);
const REVIEW_BG = rgb(1, 0.94, 0.62), MISSING = rgb(0.75, 0.1, 0.1), TILE = rgb(0.93, 0.95, 0.98);

interface Fonts { reg: PDFFont; bold: PDFFont; ital: PDFFont; boldItal: PDFFont; uni: PDFFont | null }

export { contractNumber };

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
function clean(s: string): string {
  return s.normalize('NFC').replace(/\t/g, '    ').replace(/[   ]/g, ' ').replace(/‑/g, '-')
    .replace(/[​‌‍⁠﻿]/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '');
}

interface Word { text: string; font: PDFFont; size: number; width: number; run: Run; space: boolean }
interface Line { words: Word[]; width: number; blank: boolean }

class Ctx {
  page!: PDFPage;
  pageNo = 0;
  y = TOP;
  dry = false;
  pages: PDFPage[] = [];
  fields: PdfFieldPlacement[] = [];
  private sets = new Map<PDFFont, Set<number>>();
  constructor(public doc: PDFDocument, public f: Fonts) {}

  newPage() {
    if (this.dry) return;
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.pageNo = this.pages.length;
    this.y = TOP;
  }
  get limit() { return H - BOTTOM; }
  ensure(h: number) { if (!this.dry && this.y + h > this.limit) this.newPage(); }
  /** Make sure the next h points fit on this page, else start a new one (no-op in dry runs). */
  fits(h: number) { return this.dry || this.y + h <= this.limit; }

  has(font: PDFFont, ch: string) {
    let s = this.sets.get(font);
    if (!s) { s = new Set(font.getCharacterSet()); this.sets.set(font, s); }
    return s.has(ch.codePointAt(0)!);
  }
  fontFor(run: Run, text: string): PDFFont {
    const base = run.b && run.i ? this.f.boldItal : run.b ? this.f.bold : run.i ? this.f.ital : this.f.reg;
    if (!this.f.uni) return base;
    for (const ch of text) if (!this.has(base, ch)) return this.f.uni;
    return base;
  }

  text(s: string, x: number, topY: number, size: number, font: PDFFont, color = INK) {
    if (this.dry || !s) return;
    this.page.drawText(s, { x, y: H - topY - size * 0.82, size, font, color });
  }
  line(x1: number, y1: number, x2: number, y2: number, thickness = 0.6, color = RULE) {
    if (this.dry) return;
    this.page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness, color });
  }
  rect(x: number, topY: number, w: number, h: number, color: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>) {
    if (this.dry) return;
    this.page.drawRectangle({ x, y: H - topY - h, width: w, height: h, color, ...(border ? { borderColor: border, borderWidth: 0.6 } : {}) });
  }
  image(img: PDFImage, x: number, topY: number, w: number, h: number) {
    if (this.dry) return;
    this.page.drawImage(img, { x, y: H - topY - h, width: w, height: h });
  }
}

/** Splits runs into measured words, honouring "\n" as a forced break. */
function layoutLines(ctx: Ctx, runs: Run[], width: number, size: number, boldAll = false): Line[] {
  const lines: Line[] = [];
  let cur: Line = { words: [], width: 0, blank: true };
  const push = (force = false) => {
    while (cur.words.length && cur.words[cur.words.length - 1].space) { cur.width -= cur.words[cur.words.length - 1].width; cur.words.pop(); }
    if (cur.words.length || force) lines.push(cur);
    cur = { words: [], width: 0, blank: true };
  };
  for (const r0 of runs) {
    const run = boldAll ? { ...r0, b: true } : r0;
    const text = clean(run.text);
    const parts = text.split('\n');
    parts.forEach((part, pi) => {
      if (pi > 0) push(true);
      for (const tok of part.split(/( +)/).filter((t) => t !== '')) {
        const space = tok.trim() === '';
        const font = ctx.fontFor(run, tok);
        const safe = [...tok].map((ch) => (ctx.has(font, ch) ? ch : '?')).join('');
        const w = font.widthOfTextAtSize(safe, size);
        if (space) {
          if (!cur.words.length) continue; // no leading spaces on a line
          cur.words.push({ text: ' ', font, size, width: w, run, space: true }); cur.width += w; continue;
        }
        if (cur.width + w > width && cur.words.length) push();
        if (w > width) { // a single token wider than the line (URL, hash): hard-break it
          let chunk = '';
          for (const ch of safe) {
            const cw = font.widthOfTextAtSize(chunk + ch, size);
            if (cw > width && chunk) { cur.words.push({ text: chunk, font, size, width: font.widthOfTextAtSize(chunk, size), run, space: false }); cur.width += font.widthOfTextAtSize(chunk, size); cur.blank = false; push(); chunk = ch; } else chunk += ch;
          }
          if (chunk) { const cw = font.widthOfTextAtSize(chunk, size); cur.words.push({ text: chunk, font, size, width: cw, run, space: false }); cur.width += cw; cur.blank = false; }
          continue;
        }
        cur.words.push({ text: safe, font, size, width: w, run, space: false }); cur.width += w; cur.blank = false;
      }
    });
  }
  push(runs.length === 0 || lines.length === 0);
  return lines;
}

interface Frame { x: number; width: number; size: number; leading: number; color?: ReturnType<typeof rgb>; boldAll?: boolean }

function drawLine(ctx: Ctx, line: Line, x: number, color = INK) {
  let cx = x;
  for (const w of line.words) {
    if (!w.space) {
      if (w.run.review) ctx.rect(cx - 1, ctx.y - 1, w.width + 2, w.size * 1.25, REVIEW_BG);
      ctx.text(w.text, cx, ctx.y, w.size, w.font, w.run.missing ? MISSING : color);
      if (w.run.u) ctx.line(cx, ctx.y + w.size * 0.98, cx + w.width, ctx.y + w.size * 0.98, 0.6, w.run.missing ? MISSING : color);
    } else if (w.run.review) ctx.rect(cx, ctx.y - 1, w.width, w.size * 1.25, REVIEW_BG);
    cx += w.width;
  }
}

function drawRuns(ctx: Ctx, runs: Run[], fr: Frame) {
  const lines = layoutLines(ctx, runs, fr.width, fr.size, fr.boldAll);
  if (lines.length >= 3 && !ctx.fits(fr.leading * 2)) ctx.newPage(); // avoid a lone first line at the bottom
  for (const ln of lines) {
    ctx.ensure(fr.leading);
    drawLine(ctx, ln, fr.x, fr.color);
    ctx.y += fr.leading;
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
interface Images { hq: PDFImage | null; client: PDFImage | null; hqDims: { w: number; h: number } | null; clientDims: { w: number; h: number } | null }
interface Env { img: Images; input: PdfInput }

const BODY = 10.5, LEAD = 15;

function fitBox(iw: number, ih: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / iw, maxH / ih);
  return { w: iw * s, h: ih * s };
}

function drawBlocks(ctx: Ctx, env: Env, blocks: Block[], fr: Frame) {
  for (const b of blocks) {
    switch (b.t) {
      case 'para':
        if (!b.runs.length || b.runs.every((r) => !r.text.trim())) { ctx.y += fr.leading * 0.55; break; }
        drawRuns(ctx, b.runs, fr);
        ctx.y += fr.leading * 0.35;
        break;
      case 'heading': {
        const size = b.level === 1 ? 16 : b.level === 2 ? 13 : 11.5;
        ctx.y += size * 0.5;
        ctx.ensure(size * 1.4 + 34);
        drawRuns(ctx, b.runs, { ...fr, size, leading: size * 1.35, boldAll: true, color: NAVY });
        ctx.y += size * 0.25;
        break;
      }
      case 'list': {
        const indent = 20;
        b.items.forEach((item, i) => {
          const marker = b.ordered ? `${b.start + i}.` : '•';
          ctx.ensure(fr.leading * 2);
          ctx.text(marker, fr.x + (b.ordered ? 2 : 6), ctx.y, fr.size, ctx.f.reg, INK);
          drawBlocks(ctx, env, item, { ...fr, x: fr.x + indent, width: fr.width - indent });
        });
        break;
      }
      case 'table': drawTable(ctx, env, b, fr); break;
      case 'pageBreak': if (ctx.y > TOP + 1) ctx.newPage(); break;
      case 'rule': ctx.y += 4; ctx.ensure(10); ctx.line(fr.x, ctx.y, fr.x + fr.width, ctx.y); ctx.y += 10; break;
      case 'logo': drawInlineLogo(ctx, env, b.which, fr); break;
      case 'signatures': drawSignatures(ctx, env); break;
    }
  }
}

function drawInlineLogo(ctx: Ctx, env: Env, which: 'client' | 'homequote', fr: Frame) {
  const img = which === 'client' ? env.img.client : env.img.hq;
  const dims = which === 'client' ? env.img.clientDims : env.img.hqDims;
  const h = 40;
  ctx.ensure(h + 8);
  if (img && dims) {
    const bx = fitBox(dims.w, dims.h, Math.min(190, fr.width), h);
    ctx.image(img, fr.x, ctx.y, bx.w, bx.h);
  } else drawLogoFallback(ctx, env, which, fr.x, ctx.y, h, 'left');
  ctx.y += h + 8;
}

function drawTable(ctx: Ctx, env: Env, t: Extract<Block, { t: 'table' }>, fr: Frame) {
  const cols = Math.max(1, ...t.rows.map((r) => r.cells.reduce((n, c) => n + c.colspan, 0)));
  const colW = fr.width / cols;
  const pad = 5;
  const cellFrame = (span: number, x: number): Frame => ({ x: x + pad, width: colW * span - pad * 2, size: Math.min(fr.size, 9.5), leading: 13 });
  const measure = (row: (typeof t.rows)[number]) => {
    let hmax = 0;
    row.cells.forEach((c) => {
      const keep = { y: ctx.y, dry: ctx.dry };
      ctx.dry = true; ctx.y = 0;
      drawBlocks(ctx, env, c.blocks, { ...cellFrame(c.colspan, 0), boldAll: c.header } as Frame);
      hmax = Math.max(hmax, ctx.y);
      ctx.y = keep.y; ctx.dry = keep.dry;
    });
    return Math.max(hmax, 13) + pad * 2;
  };
  ctx.y += 4;
  const header = t.rows[0]?.cells.every((c) => c.header) ? t.rows[0] : null;
  const drawRow = (row: (typeof t.rows)[number], rowH: number) => {
    let x = fr.x;
    const top = ctx.y;
    row.cells.forEach((c) => {
      const w = colW * c.colspan;
      ctx.rect(x, top, w, rowH, c.header ? TILE : rgb(1, 1, 1), RULE);
      const save = ctx.y; ctx.y = top + pad;
      drawBlocks(ctx, env, c.blocks, { ...cellFrame(c.colspan, x), boldAll: c.header } as Frame);
      ctx.y = save;
      x += w;
    });
    ctx.y = top + rowH;
  };
  t.rows.forEach((row) => {
    const rowH = measure(row);
    if (rowH > ctx.limit - TOP) throw new ContractRenderError('A table row is too tall to fit on one page. Shorten the cell text or split the row.');
    if (!ctx.fits(rowH)) {
      ctx.newPage();
      if (header && row !== header) { const hh = measure(header); drawRow(header, hh); }
    }
    drawRow(row, rowH);
  });
  ctx.y += 8;
}

// ---------------------------------------------------------------------------
// Logos / header
// ---------------------------------------------------------------------------
function drawLogoFallback(ctx: Ctx, env: Env, which: 'client' | 'homequote', x: number, topY: number, h: number, _align: 'left' | 'right') {
  void _align;
  const name = which === 'client' ? env.input.clientName || 'Client' : env.input.hqName;
  ctx.rect(x, topY, h, h, TILE, RULE);
  const ini = initialsOf(name);
  const size = h * 0.4;
  const w = ctx.f.bold.widthOfTextAtSize(ini, size);
  ctx.text(ini, x + (h - w) / 2, topY + (h - size) / 2 + 1, size, ctx.f.bold, NAVY);
  const label = clean(name).slice(0, 40);
  const lines = layoutLines(ctx, [{ text: label, b: true }], 120, 10).slice(0, 2);
  let ly = topY + h / 2 - (lines.length * 12) / 2;
  for (const ln of lines) { const keep = ctx.y; ctx.y = ly; drawLine(ctx, ln, x + h + 8, NAVY); ctx.y = keep; ly += 12; }
}

function logoSlot(env: Env, which: 'client' | 'homequote', h: number): { w: number; draw: (ctx: Ctx, x: number, topY: number) => void } {
  const img = which === 'client' ? env.img.client : env.img.hq;
  const dims = which === 'client' ? env.img.clientDims : env.img.hqDims;
  if (img && dims) {
    const bx = fitBox(dims.w, dims.h, 190, h);
    return { w: bx.w, draw: (ctx, x, topY) => ctx.image(img, x, topY + (h - bx.h) / 2, bx.w, bx.h) };
  }
  // attractive fallback: initials tile + company name
  return { w: h + 8 + 120, draw: (ctx, x, topY) => drawLogoFallback(ctx, env, which, x, topY, h, 'left') };
}

function drawHeader(ctx: Ctx, env: Env) {
  const { branding: b, title, contractNo, clientName, hqName } = env.input;
  const h = LOGO_SIZES[b.size];
  const slots: ('homequote' | 'client')[] = b.mode === 'side_by_side' ? (b.swap ? ['client', 'homequote'] : ['homequote', 'client'])
    : b.mode === 'homequote_only' ? ['homequote'] : b.mode === 'client_only' ? ['client'] : [];
  if (slots.length) {
    const items = slots.map((s) => logoSlot(env, s, h));
    const top = ctx.y;
    if (items.length === 2) {
      if (b.align === 'spread') {
        items[0].draw(ctx, MX, top);
        items[1].draw(ctx, W - MX - items[1].w, top);
      } else {
        const gap = 40;
        const total = items[0].w + gap + items[1].w;
        const x0 = (W - total) / 2;
        items[0].draw(ctx, x0, top);
        ctx.line(x0 + items[0].w + gap / 2, top - 2, x0 + items[0].w + gap / 2, top + h + 2, 0.8, RULE);
        items[1].draw(ctx, x0 + items[0].w + gap, top);
      }
    } else items[0].draw(ctx, b.align === 'spread' ? MX : (W - items[0].w) / 2, top);
    ctx.y = top + h + 12;
    ctx.line(MX, ctx.y, W - MX, ctx.y, 0.8, RULE);
    ctx.y += 22;
  }
  const titleLines = layoutLines(ctx, [{ text: title, b: true }], CW, 22);
  for (const ln of titleLines) { drawLine(ctx, ln, MX, NAVY); ctx.y += 28; }
  const sub = [contractNo != null ? `Agreement ${contractNumber(contractNo)}` : null, `${hqName} and ${clientName || 'Client'}`].filter(Boolean).join('  ·  ');
  drawRuns(ctx, [{ text: sub }], { x: MX, width: CW, size: 9.5, leading: 13, color: MUTED });
  ctx.y += 14;
}

// ---------------------------------------------------------------------------
// Signature blocks
// ---------------------------------------------------------------------------
const SIG_ROW_H = 190;
function drawSignatures(ctx: Ctx, env: Env) {
  const signers = env.input.signers;
  const cols = signers.length > 1 ? 2 : 1;
  const gap = 28;
  const colW = cols === 2 ? (CW - gap) / 2 : 300;
  ctx.y += 8;
  for (let i = 0; i < signers.length; i += cols) {
    ctx.ensure(SIG_ROW_H);
    const rowTop = ctx.y;
    for (let c = 0; c < cols && i + c < signers.length; c++) {
      const s = signers[i + c];
      const idx = i + c;
      const bx = MX + c * (colW + gap);
      const company = s.role === 'client' ? env.input.clientName : s.role === 'homequote' ? env.input.hqName : '';
      ctx.text(clean(s.label), bx, rowTop, 10.5, ctx.f.bold, NAVY);
      ctx.text(clean([company, s.name].filter(Boolean).join(' · ')).slice(0, 70), bx, rowTop + 15, 8.5, ctx.f.reg, MUTED);
      const sigTop = rowTop + 38;
      ctx.line(bx, sigTop + 40, bx + colW, sigTop + 40, 0.8, INK);
      ctx.text('Signature', bx, sigTop + 43, 8, ctx.f.reg, MUTED);
      const nameTop = rowTop + 100;
      ctx.line(bx, nameTop + 18, bx + colW, nameTop + 18, 0.8, INK);
      ctx.text('Printed name', bx, nameTop + 21, 8, ctx.f.reg, MUTED);
      const dateTop = rowTop + 142;
      ctx.line(bx, dateTop + 18, bx + 130, dateTop + 18, 0.8, INK);
      ctx.text('Date', bx, dateTop + 21, 8, ctx.f.reg, MUTED);
      if (!ctx.dry) {
        const f = (type: PdfFieldPlacement['type'], x: number, top: number, w: number, h: number, label: string) =>
          ctx.fields.push({ signerIndex: idx, type, page: ctx.pageNo, x: x / W, y: top / H, w: w / W, h: h / H, label });
        f('signature', bx, sigTop, colW, 40, `${s.label} signature`);
        f('name', bx, nameTop, colW, 18, `${s.label} printed name`);
        f('date', bx, dateTop, 130, 18, `${s.label} date`);
      }
    }
    ctx.y = rowTop + SIG_ROW_H;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function needsUnicode(input: PdfInput, latin: PDFFont): boolean {
  const set = new Set(latin.getCharacterSet());
  const check = (s: string) => { for (const ch of clean(s)) if (ch !== '\n' && !set.has(ch.codePointAt(0)!)) return true; return false; };
  const runs = (rs: Run[]) => rs.some((r) => check(r.text));
  const blocks = (bs: Block[]): boolean => bs.some((b) => {
    if (b.t === 'para' || b.t === 'heading') return runs(b.runs);
    if (b.t === 'list') return b.items.some(blocks);
    if (b.t === 'table') return b.rows.some((r) => r.cells.some((c) => blocks(c.blocks)));
    return false;
  });
  return check(input.title) || check(input.clientName) || check(input.hqName) || input.signers.some((s) => check(s.label) || check(s.name))
    || input.model.sections.some((s) => (s.title ? check(s.title) : false) || blocks(s.blocks));
}

async function embedLogo(doc: PDFDocument, bytes: Uint8Array | null) {
  if (!bytes) return { img: null, dims: null };
  try {
    const img = await doc.embedPng(bytes);
    return { img, dims: { w: img.width, h: img.height } };
  } catch { return { img: null, dims: null }; }
}

export async function renderContractPdf(input: PdfInput): Promise<PdfOutput> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.title.slice(0, 200));
  doc.setProducer('HomeQuote Network');
  doc.setCreator('HomeQuote Network');
  const f: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold),
    ital: await doc.embedFont(StandardFonts.HelveticaOblique), boldItal: await doc.embedFont(StandardFonts.HelveticaBoldOblique), uni: null,
  };
  if (needsUnicode(input, f.reg)) {
    doc.registerFontkit(((fontkitModule as unknown as { default?: unknown }).default ?? fontkitModule) as never);
    f.uni = await doc.embedFont(loadUnicodeFont(), { subset: true });
  }
  const hq = await embedLogo(doc, input.hqLogo), client = await embedLogo(doc, input.clientLogo);
  const env: Env = { input, img: { hq: hq.img, hqDims: hq.dims, client: client.img, clientDims: client.dims } };
  const ctx = new Ctx(doc, f);
  ctx.newPage();
  drawHeader(ctx, env);

  const body: Frame = { x: MX, width: CW, size: BODY, leading: LEAD };
  for (const s of input.model.sections) {
    if (s.pageBreakBefore && ctx.y > TOP + 1) ctx.newPage();
    if (s.title) {
      ctx.y += 12;
      const keep = s.kind === 'signatures' ? SIG_ROW_H + 90 : 60;
      ctx.ensure(keep);
      drawRuns(ctx, [{ text: s.title }], { x: MX, width: CW, size: 13, leading: 18, boldAll: true, color: NAVY });
      ctx.y += 3;
    } else if (s.kind === 'signatures') ctx.ensure(SIG_ROW_H + 40);
    drawBlocks(ctx, env, s.blocks, body);
  }

  const bodyPages = ctx.pages.length;
  const exhibits = input.exhibits ?? [];
  for (let i = 0; i < exhibits.length; i++) {
    let src: PDFDocument;
    try { src = await PDFDocument.load(exhibits[i].bytes); } catch { throw new ContractRenderError(`Exhibit “${exhibits[i].name}” could not be read.`); }
    const copied = await doc.copyPages(src, src.getPageIndices());
    copied.forEach((p, pi) => {
      doc.addPage(p);
      if (pi === 0) {
        const label = `Exhibit ${String.fromCharCode(65 + i)} - ${clean(exhibits[i].name).slice(0, 80)}`;
        const { height } = p.getSize();
        p.drawRectangle({ x: 20, y: height - 22, width: Math.min(420, f.reg.widthOfTextAtSize(label.replace(/[^\x20-\x7e]/g, '?'), 8) + 12), height: 14, color: rgb(1, 1, 1) });
        p.drawText(label.replace(/[^\x20-\x7e]/g, '?'), { x: 26, y: height - 18, size: 8, font: f.reg, color: MUTED });
      }
    });
  }

  const total = doc.getPageCount();
  ctx.pages.forEach((p, i) => {
    p.drawLine({ start: { x: MX, y: 44 }, end: { x: W - MX, y: 44 }, thickness: 0.5, color: RULE });
    const left = clean(`${input.title}${input.contractNo != null ? `  ·  ${contractNumber(input.contractNo)}` : ''}`).slice(0, 90);
    const font = f.uni && [...left].some((ch) => !f.reg.getCharacterSet().includes(ch.codePointAt(0)!)) ? f.uni : f.reg;
    const safeLeft = [...left].map((ch) => (font.getCharacterSet().includes(ch.codePointAt(0)!) ? ch : '?')).join('');
    p.drawText(safeLeft, { x: MX, y: 30, size: 8, font, color: MUTED });
    const right = `Page ${i + 1} of ${total}`;
    p.drawText(right, { x: W - MX - f.reg.widthOfTextAtSize(right, 8), y: 30, size: 8, font: f.reg, color: MUTED });
  });

  const bytes = await doc.save();
  return { bytes, pageCount: total, bodyPages, fields: ctx.fields, pages: Array.from({ length: total }, () => ({ w: W, h: H })) };
}
