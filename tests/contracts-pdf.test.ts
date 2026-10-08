/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { STARTER_TEMPLATES, P, H, UL, OL, DOC } from '@/lib/contracts/library';
import { loadHomeQuoteLogo, normalizeLogo, sniffImage } from '@/lib/contracts/logo';
import { renderContractPdf, type PdfSigner } from '@/lib/contracts/pdf';
import { buildRenderModel } from '@/lib/contracts/render-model';
import { brandingSchema, type ContractSection, type DocNode } from '@/lib/contracts/types';
import { VARIABLE_BY_KEY, usedVariables } from '@/lib/contracts/variables';
import { openWithPdfjs } from '@/lib/signing/pdfjs';

/**
 * PDF engine: layout, pagination, fields, logos. Set CONTRACT_PDF_OUT=<dir> to also write PNG renders of every page
 * for a visual check.
 */
const OUT = process.env.CONTRACT_PDF_OUT;
const signers: PdfSigner[] = [
  { role: 'client', label: 'Client', name: 'Jordan Rivera', email: 'jordan@acme.test' },
  { role: 'homequote', label: 'HomeQuote Network', name: 'Liam Admin', email: 'liam@hq.test' },
];
const sample = (sections: ContractSection[]) => {
  const v: Record<string, string> = {};
  for (const k of usedVariables(sections).known) { const d = VARIABLE_BY_KEY.get(k)!; v[k] = d.source === 'branding' ? '' : d.example; }
  v.client_company = 'Acme Pools LLC';
  return v;
};
const logo = async (w: number, h: number, color = '#c2410c') => { const c = createCanvas(w, h); const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `${h / 2}px sans-serif`; g.fillText('ACME', 10, h * 0.65); return normalizeLogo(new Uint8Array(await c.encode('png'))); };

async function text(bytes: Uint8Array) {
  const { pdf, destroy } = await openWithPdfjs(bytes);
  const pages: string[] = [];
  let images = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    pages.push(((await page.getTextContent()).items as any[]).map((i) => i.str).join(' '));
    const ops = await page.getOperatorList();
    images += ops.fnArray.filter((f: number) => f === 85 || f === 86 || f === 82 || f === 83).length;
  }
  await destroy();
  return { pages, images };
}
async function dump(name: string, bytes: Uint8Array) {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/${name}.pdf`, bytes);
  const { pdf, destroy } = await openWithPdfjs(bytes);
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1.4 });
    const cc = (pdf as any).canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: cc.context, viewport: vp, canvas: cc.canvas } as never).promise;
    writeFileSync(`${OUT}/${name}-p${n}.png`, cc.canvas.toBuffer('image/png'));
  }
  await destroy();
}

describe('image handling', () => {
  it('sniffs real formats from bytes', async () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]))).toBe('png');
    expect(sniffImage(new TextEncoder().encode('GIF89a......................'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });
  it('bundles the HomeQuote logo', () => { expect(loadHomeQuoteLogo()?.length).toBeGreaterThan(1000); });
});

describe('every starter template renders to a valid, paginated PDF with fields for each signer', () => {
  it.each(STARTER_TEMPLATES.map((t) => [t.name, t] as const))('%s', async (_n, t) => {
    const values = sample(t.sections);
    const out = await renderContractPdf({
      title: t.name, contractNo: 42, model: buildRenderModel(t.sections, values), branding: brandingSchema.parse({}), clientName: 'Acme Pools LLC', hqName: 'HomeQuote Network',
      hqLogo: loadHomeQuoteLogo(), clientLogo: (await logo(400, 120)).png, signers,
    });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(out.pageCount);
    expect(out.pageCount).toBeGreaterThanOrEqual(2);
    expect(out.fields).toHaveLength(6);
    for (const f of out.fields) {
      expect(f.page).toBeGreaterThanOrEqual(1); expect(f.page).toBeLessThanOrEqual(out.pageCount);
      expect(f.x).toBeGreaterThanOrEqual(0); expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + f.w).toBeLessThanOrEqual(1); expect(f.y + f.h).toBeLessThanOrEqual(1);
    }
    // a signer's three fields never overlap each other, and signer blocks never overlap
    for (let i = 0; i < out.fields.length; i++) for (let j = i + 1; j < out.fields.length; j++) {
      const a = out.fields[i], b = out.fields[j];
      if (a.page !== b.page) continue;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap, `${a.label} vs ${b.label}`).toBe(false);
    }
    const { pages, images } = await text(out.bytes);
    const all = pages.join('\n');
    expect(all).toContain('Acme Pools LLC');
    expect(all).not.toMatch(/\{\{|\}\}/);
    expect(all).toContain('HQ-C-00042');
    expect(images).toBeGreaterThanOrEqual(2); // both logos
    await dump(t.starterKey, out.bytes);
  }, 30_000);
});

describe('layout details', () => {
  const longDoc = (): ContractSection[] => {
    const para = 'The quick brown fox jumps over the lazy dog. '.repeat(40);
    const table: DocNode = { type: 'table', content: [
      { type: 'tableRow', content: [{ type: 'tableHeader', content: [P('Milestone')] }, { type: 'tableHeader', content: [P('Amount')] }, { type: 'tableHeader', content: [P('Due')] }] },
      ...Array.from({ length: 6 }, (_, i) => ({ type: 'tableRow', content: [{ type: 'tableCell', content: [P(`Phase ${i + 1} - ${'details '.repeat(8)}`)] }, { type: 'tableCell', content: [P(`$${(i + 1) * 500}.00`)] }, { type: 'tableCell', content: [P('Net 15')] }] })),
    ] };
    return [
      { id: 'a', key: 'custom', kind: 'rich', title: 'Long Section', showTitle: true, numbered: true, pageBreakBefore: false, doc: DOC(H('Sub heading'), P(para), P('**Bold** _italic_ and plain; “smart quotes” – dash … ellipsis → arrow ✓ check'), UL(['One'], ['Two **bold**'], ['Three']), OL(['First'], ['Second']), table, P(para), { type: 'pageBreak' }, P('After the break.')) },
      { id: 'b', key: 'custom', kind: 'rich', title: 'Review passage', showTitle: true, numbered: true, pageBreakBefore: true, doc: DOC(P('Before [REVIEW: counsel to confirm wording] after, and {{missing_field}} stays visible.')) },
      { id: 'sig', key: 'signatures', kind: 'signatures', title: 'Signatures', showTitle: true, numbered: false, pageBreakBefore: false, doc: DOC(P('Signed electronically.')) },
    ];
  };
  it('paginates long content, tables, lists, page breaks, unicode, review and unresolved markers', async () => {
    const sections = longDoc();
    const out = await renderContractPdf({ title: 'Layout test ✓', contractNo: 1, model: buildRenderModel(sections, {}), branding: brandingSchema.parse({ mode: 'none' }), clientName: 'Acme', hqName: 'HomeQuote Network', hqLogo: null, clientLogo: null, signers });
    expect(out.pageCount).toBeGreaterThanOrEqual(4);
    const { pages } = await text(out.bytes);
    const all = pages.join('\n');
    expect(all).toContain('After the break.');
    expect(all).toContain('[REVIEW: counsel to confirm wording]');
    expect(all).toContain('{{missing_field}}');
    expect(all).toContain('Phase 6');
    // the page break pushes "After the break." to a later page than the long text
    expect(pages.findIndex((p) => p.includes('After the break.'))).toBeGreaterThan(pages.findIndex((p) => p.includes('Sub heading')));
    await dump('layout', out.bytes);
  });

  it('shows an initials tile when a company has no logo, and honours all four modes and both positions', async () => {
    const sections = STARTER_TEMPLATES[0].sections;
    const base = { title: 'Branding', contractNo: 2, model: buildRenderModel(sections, sample(sections)), clientName: 'Beta Roofing', hqName: 'HomeQuote Network', hqLogo: loadHomeQuoteLogo(), signers };
    const sizes: number[] = [];
    for (const b of [{ mode: 'side_by_side' }, { mode: 'side_by_side', swap: true, align: 'spread', size: 'large' }, { mode: 'homequote_only' }, { mode: 'client_only' }, { mode: 'none' }] as const) {
      const out = await renderContractPdf({ ...base, branding: brandingSchema.parse(b), clientLogo: null });
      sizes.push(out.bytes.length);
      const { pages } = await text(out.bytes);
      if (b.mode === 'side_by_side' || b.mode === 'client_only') expect(pages[0]).toContain('BR'); // fallback tile initials
      await dump(`brand-${b.mode}${'swap' in b ? '-swap' : ''}`, out.bytes);
    }
    expect(sizes[4]).toBeLessThan(sizes[0]);
  });

  it('keeps a wide logo and a tall logo inside their box without distortion', async () => {
    const wide = await logo(900, 90), tall = await logo(80, 400);
    expect(wide.width / wide.height).toBeCloseTo(10, 0);
    expect(tall.height / tall.width).toBeCloseTo(5, 0);
    const sections = STARTER_TEMPLATES[0].sections;
    for (const [n, l] of [['wide', wide], ['tall', tall]] as const) {
      const out = await renderContractPdf({ title: 'Logo shapes', contractNo: 3, model: buildRenderModel(sections, sample(sections)), branding: brandingSchema.parse({}), clientName: 'Acme', hqName: 'HomeQuote Network', hqLogo: loadHomeQuoteLogo(), clientLogo: l.png, signers });
      await dump(`logo-${n}`, out.bytes);
      expect(out.pageCount).toBeGreaterThan(1);
    }
  });

  it('refuses a table row taller than a page rather than clipping it', async () => {
    const huge: ContractSection[] = [{ id: 'x', key: 'custom', kind: 'rich', title: 'T', showTitle: true, numbered: true, pageBreakBefore: false, doc: DOC({ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [P('word '.repeat(6000))] }] }] }) }];
    await expect(renderContractPdf({ title: 'Huge', contractNo: 4, model: buildRenderModel(huge, {}), branding: brandingSchema.parse({}), clientName: 'A', hqName: 'H', hqLogo: null, clientLogo: null, signers })).rejects.toThrow(/too tall/);
  });

  it('appends PDF exhibits after the agreement and labels them', async () => {
    const ex = await PDFDocument.create(); ex.addPage([612, 792]); ex.addPage([612, 792]);
    const sections = STARTER_TEMPLATES[0].sections;
    const out = await renderContractPdf({ title: 'With exhibit', contractNo: 5, model: buildRenderModel(sections, sample(sections)), branding: brandingSchema.parse({}), clientName: 'A', hqName: 'H', hqLogo: null, clientLogo: null, signers, exhibits: [{ name: 'Insurance.pdf', bytes: await ex.save() }] });
    expect(out.pageCount).toBe(out.bodyPages + 2);
    const { pages } = await text(out.bytes);
    expect(pages[out.bodyPages]).toContain('Exhibit A');
  });
});
