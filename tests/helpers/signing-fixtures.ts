/**
 * Test PDFs (generated, never real contracts). Used by the unit tests and the dev preview harness.
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

const PAGE: [number, number] = [612, 792];

interface Ctx { page: PDFPage; font: PDFFont; bold: PDFFont }
const txt = (c: Ctx, s: string, x: number, y: number, size = 11, bold = false) =>
  c.page.drawText(s, { x, y, size, font: bold ? c.bold : c.font, color: rgb(0.1, 0.1, 0.1) });
const hline = (c: Ctx, x1: number, x2: number, y: number) =>
  c.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.8, color: rgb(0, 0, 0) });
const box = (c: Ctx, x: number, y: number, s = 10) =>
  c.page.drawRectangle({ x, y, width: s, height: s, borderWidth: 0.8, borderColor: rgb(0, 0, 0) });

/** Upright content on a fresh page: coordinates are the upright displayed page, y up from bottom. */
async function drawContract(doc: PDFDocument, page: PDFPage, which: 'p1' | 'p2'): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const c: Ctx = { page, font, bold };
  if (which === 'p1') {
    txt(c, 'HOME IMPROVEMENT AGREEMENT', 72, 720, 16, true);
    txt(c, 'This agreement is made between Acme Pools Inc. ("Contractor") and the Homeowner named below.', 72, 690);
    txt(c, 'The signature of the Homeowner below is required before work begins and is legally binding on both parties.', 72, 674);
    txt(c, 'Payment terms: 30% deposit, balance on completion. Please sign and return this signature page.', 72, 658);
    // signature block 1 (label + underscores to the right)
    txt(c, 'Homeowner', 72, 560, 11, true);
    txt(c, 'Signature:', 72, 530); hline(c, 140, 330, 528);
    txt(c, 'Printed Name:', 72, 500); hline(c, 150, 330, 498);
    txt(c, 'Date:', 350, 530); hline(c, 380, 480, 528);
    // label BELOW the line (second common layout)
    hline(c, 72, 260, 440); txt(c, 'Contractor Signature', 72, 428, 9);
    hline(c, 300, 420, 440); txt(c, 'Date', 300, 428, 9);
    txt(c, 'Company Name:', 72, 395); hline(c, 160, 330, 393);
    txt(c, 'Title:', 350, 395); hline(c, 380, 500, 393);
    // checkbox with an agreement label + yes/no choice
    box(c, 72, 340); txt(c, 'I have read and agree to the terms above', 90, 341, 10);
    txt(c, 'Financing needed?', 72, 300, 10); box(c, 180, 299); txt(c, 'Yes', 194, 300, 10); box(c, 230, 299); txt(c, 'No', 244, 300, 10);
    txt(c, 'Initials: ______', 72, 120);
  } else {
    txt(c, 'SCHEDULE A', 72, 720, 14, true);
    txt(c, 'Work to be performed: resurfacing, new tile, equipment replacement. Signature lines appear on page one.', 72, 690);
    txt(c, 'Seller', 72, 400, 11, true);
    txt(c, 'Signed by: ________________________', 72, 370);
    txt(c, 'Name (print): ________________________', 72, 340);
    txt(c, 'Date signed: ____________', 72, 310);
  }
}

/** A 2-page text PDF with several signature-block layouts and ordinary prose mentioning "signature". */
export async function textContractPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  await drawContract(doc, doc.addPage(PAGE), 'p1');
  await drawContract(doc, doc.addPage(PAGE), 'p2');
  doc.setTitle('Test contract');
  return doc.save();
}

/** Same upright content shown through /Rotate (90/180/270), as scanner/CAD exports do. */
export async function rotatedContractPdf(rotation: 90 | 180 | 270): Promise<Uint8Array> {
  const src = await PDFDocument.create();
  await drawContract(src, src.addPage(PAGE), 'p1');
  const srcBytes = await src.save();
  const doc = await PDFDocument.create();
  const [embedded] = await doc.embedPdf(srcBytes, [0]);
  const [W, H] = PAGE;
  // user-space page size before rotation
  const size: [number, number] = rotation === 180 ? [W, H] : [H, W];
  const page = doc.addPage(size);
  page.setRotation(degrees(rotation));
  // choose the placement that makes the content upright when displayed
  if (rotation === 90) page.drawPage(embedded, { x: H, y: 0, rotate: degrees(90), width: W, height: H });
  else if (rotation === 180) page.drawPage(embedded, { x: W, y: H, rotate: degrees(180), width: W, height: H });
  else page.drawPage(embedded, { x: 0, y: W, rotate: degrees(270), width: W, height: H });
  return doc.save();
}

/** Page with a non-zero CropBox origin, to catch offset bugs. */
export async function croppedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([700, 900]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Signature:', { x: 140, y: 400, size: 11, font });
  page.drawLine({ start: { x: 210, y: 398 }, end: { x: 400, y: 398 }, thickness: 0.8 });
  page.setCropBox(50, 50, 600, 800);
  return doc.save();
}

/** A PDF with real AcroForm widgets (names exercise the semantic classifier). */
export async function acroFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PAGE);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Service Agreement Form', { x: 72, y: 720, size: 16, font });
  const form = doc.getForm();
  const mk = (name: string, x: number, y: number, w = 200) => {
    const f = form.createTextField(name);
    f.addToPage(page, { x, y, width: w, height: 20, borderWidth: 1 });
    return f;
  };
  mk('Customer Full Name', 72, 640);
  mk('Signer Initials', 300, 640, 60);
  mk('Company', 72, 600);
  mk('Job Title', 300, 600);
  mk('Date Signed', 72, 560, 120);
  mk('Notes_1', 72, 520, 300);
  const cb = form.createCheckBox('agree_terms');
  cb.addToPage(page, { x: 72, y: 480, width: 14, height: 14 });
  page.drawText('I agree to the terms', { x: 92, y: 482, size: 10, font });
  return doc.save();
}

/** Image-only (scanned) page: text and rules rasterized, no text layer. */
export async function scannedPdf(): Promise<Uint8Array> {
  const scale = 2;
  const canvas = createCanvas(612 * scale, 792 * scale);
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineWidth = 2;
  g.font = `${22 * scale / 2}px Arial, Liberation Sans, DejaVu Sans, sans-serif`;
  const t = (s: string, x: number, y: number, size = 15) => { g.font = `${size * scale}px Liberation Sans, Arial, DejaVu Sans, sans-serif`; g.fillText(s, x * scale, y * scale); };
  const l = (x1: number, x2: number, y: number) => { g.beginPath(); g.moveTo(x1 * scale, y * scale); g.lineTo(x2 * scale, y * scale); g.stroke(); };
  t('EQUIPMENT PURCHASE AGREEMENT', 72, 90, 22);
  t('The buyer agrees to purchase the equipment described in the attached schedule.', 72, 130, 13);
  t('Buyer Signature:', 72, 560); l(220, 420, 562);
  t('Printed Name:', 72, 620); l(190, 420, 622);
  t('Date:', 440, 560); l(480, 560, 562);
  const png = canvas.toBuffer('image/png');
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(png);
  const page = doc.addPage(PAGE);
  page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
  return doc.save();
}

/** Many pages (for limits / multi-page placement). */
export async function manyPagesPdf(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= n; i++) doc.addPage(PAGE).drawText(`Page ${i}`, { x: 72, y: 700, size: 14, font });
  return doc.save();
}

/** Looks like a PDF but is not (for upload validation). */
export const fakePdf = () => new TextEncoder().encode('%PDF-1.4\nthis is not really a pdf');
