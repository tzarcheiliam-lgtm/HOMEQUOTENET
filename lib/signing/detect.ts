/**
 * Field detection orchestrator.
 *   1. Existing AcroForm widgets (most reliable).
 *   2. Text-layer + vector layout analysis for flat PDFs (heuristic).
 *   3. Local OCR for pages with no text layer (scans; least reliable, always flagged for review).
 * Results are SUGGESTIONS. The sender must review them; nothing here fills a signature or ticks a box.
 */
import { PDFArray, PDFBool, PDFCheckBox, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRadioGroup, PDFRef, PDFSignature, PDFTextField, PDFDropdown, PDFOptionList } from '@cantoo/pdf-lib';
import { LIMITS, type FieldType } from '@/lib/signing/constants';
import { extractLayouts } from '@/lib/signing/extract';
import { CONFIDENT, classifyLabel, rectIou, suggestFields, type PageLayout } from '@/lib/signing/layout';
import { ocrPages, rasterRulesForPages } from '@/lib/signing/ocr';
import { pointsToFraction, userRectToFraction, type PageGeom } from '@/lib/signing/geometry';

export interface DetectedField {
  type: FieldType;
  page: number;
  x: number; y: number; w: number; h: number;
  required: boolean;
  label: string | null;
  group_key: string | null;
  source: 'acroform' | 'text' | 'ocr';
  confidence: number;
  needs_review: boolean;
  role_hint: string | null;
  detection_note: string | null;
  source_ref: string | null;
}

export interface DetectionInfo {
  engine: 'hqn-layout-1';
  /** What produced the suggestions. */
  methods: ('acroform' | 'text' | 'ocr')[];
  acroformFields: number;
  pagesAnalyzed: number;
  pagesWithoutText: number[];
  ocrPages: number[];
  ocrSkippedPages: number[];
  /** Always local: nothing is sent to an external AI/OCR provider. */
  processing: 'local';
  notes: string[];
  ranAt: string;
  suggested: number;
  needsReview: number;
}

export interface DetectionResult { fields: DetectedField[]; info: DetectionInfo }

const OCR_CONFIDENCE_CAP = 0.7;
/** A page is treated as a scan when it is dominated by an image and has (almost) no text layer. */
const SCAN_MAX_CHARS = 40;

function widgetPageIndex(doc: PDFDocument, widgetRef: PDFRef | undefined, widgetDict: PDFDict): number {
  const p = widgetDict.get(PDFName.of('P'));
  const pages = doc.getPages();
  if (p instanceof PDFRef) {
    const idx = pages.findIndex((pg) => pg.ref === p);
    if (idx >= 0) return idx;
  }
  if (widgetRef) {
    for (let i = 0; i < pages.length; i++) {
      const annots = pages[i].node.lookupMaybe(PDFName.of('Annots'), PDFArray);
      if (!annots) continue;
      for (let j = 0; j < annots.size(); j++) if (annots.get(j) === widgetRef) return i;
    }
  }
  return -1;
}

async function acroFormFields(bytes: Uint8Array, geoms: PageGeom[]): Promise<DetectedField[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: false });
  const out: DetectedField[] = [];
  let form;
  try { form = doc.getForm(); } catch { return out; }
  for (const field of form.getFields()) {
    const name = field.getName();
    const acro = field.acroField;
    const flags = acro.dict.lookupMaybe(PDFName.of('Ff'), PDFNumber)?.asNumber() ?? 0;
    const readOnly = (flags & 1) !== 0;
    if (readOnly) continue;
    let generic = false; let type: FieldType; let conf: number; let label: string | null = null; let note: string | null = null; let group: string | null = null;
    const tooltip = acro.dict.lookupMaybe(PDFName.of('TU'), (await import('@cantoo/pdf-lib')).PDFString) as { decodeText(): string } | undefined;
    const hint = `${name} ${tooltip?.decodeText?.() ?? ''}`.replace(/[_.\-[\]]+/g, ' ');
    if (field instanceof PDFSignature) { type = 'signature'; conf = 0.95; label = 'Signature'; }
    else if (field instanceof PDFCheckBox) { type = 'checkbox'; conf = 0.85; label = name; }
    else if (field instanceof PDFRadioGroup) { type = 'checkbox'; conf = 0.7; label = name; group = `radio-${name}`.slice(0, 60); note = 'Radio buttons become an exclusive checkbox group. Confirm it.'; }
    else if (field instanceof PDFTextField || field instanceof PDFDropdown || field instanceof PDFOptionList) {
      if (field instanceof PDFTextField && (field.getText() ?? '').trim()) continue; // already filled by whoever made the PDF
      const cls = classifyLabel(hint);
      if (cls && cls.type !== 'checkbox') { type = cls.type; label = cls.label; conf = 0.82; }
      else { type = 'text'; label = name.replace(/[_.\-]+/g, ' ').trim().slice(0, 100) || 'Text'; conf = 0.55; generic = true; note = 'Generic form field; confirm who fills it in.'; }
    } else continue;
    const widgets = acro.getWidgets();
    widgets.forEach((w, i) => {
      const wd = w.dict;
      const idx = widgetPageIndex(doc, doc.context.getObjectRef(wd), wd);
      if (idx < 0 || !geoms[idx]) return;
      const r = w.getRectangle();
      if (!(r.width > 2 && r.height > 2)) return;
      const f = userRectToFraction(geoms[idx], { x: r.x, y: r.y, w: r.width, h: r.height });
      out.push({
        type, page: idx + 1, ...f, required: type === 'checkbox' ? /agree|accept|consent|acknowledg/i.test(hint) : generic ? (flags & 2) !== 0 : true,
        label, group_key: group, source: 'acroform', confidence: conf, needs_review: conf < CONFIDENT,
        role_hint: null, detection_note: note, source_ref: widgets.length > 1 ? `${name}#${i}` : name,
      });
    });
  }
  void PDFBool;
  return out;
}

function toDetected(layoutResult: ReturnType<typeof suggestFields>, page: number, layout: PageLayout, source: 'text' | 'ocr'): DetectedField[] {
  return layoutResult.map((s) => {
    const f = pointsToFraction(layout, s.rect);
    const confidence = source === 'ocr' ? Math.min(s.confidence, OCR_CONFIDENCE_CAP) : s.confidence;
    return {
      type: s.type, page, ...f, required: s.required, label: s.label, group_key: s.group_key, source, confidence,
      needs_review: source === 'ocr' || s.needs_review || confidence < CONFIDENT,
      role_hint: s.role_hint,
      detection_note: source === 'ocr' ? ((s.note ? s.note + ' ' : '') + 'Found by OCR on a scan; verify position.') : s.note,
      source_ref: null,
    };
  });
}

export async function detectFields(bytes: Uint8Array, geoms: PageGeom[], opts: { ocr?: boolean } = {}): Promise<DetectionResult> {
  const notes: string[] = [];
  const methods = new Set<'acroform' | 'text' | 'ocr'>();
  let fields: DetectedField[] = [];

  let acro: DetectedField[] = [];
  try { acro = await acroFormFields(bytes, geoms); } catch { notes.push('Form fields could not be read.'); }
  if (acro.length) { methods.add('acroform'); fields.push(...acro); }

  let layouts: PageLayout[] = [];
  let textChars: number[] = [];
  let bigImage: boolean[] = [];
  try {
    ({ layouts, textChars, bigImage } = await extractLayouts(bytes));
  } catch {
    notes.push('The text layer could not be analyzed; place fields manually.');
  }
  const pagesWithoutText = textChars.map((c, i) => (c < SCAN_MAX_CHARS && bigImage[i] ? i + 1 : 0)).filter(Boolean);
  const emptyPages = textChars.map((c, i) => (c === 0 && !bigImage[i] && !layouts[i]?.lines.length ? i + 1 : 0)).filter(Boolean);
  if (emptyPages.length) notes.push(`Page${emptyPages.length > 1 ? 's' : ''} ${emptyPages.join(', ')} ha${emptyPages.length > 1 ? 've' : 's'} no readable text; place fields manually there.`);
  // searchable scans: a text layer exists but the ruled lines are only in the picture
  const imagePagesWithText = bigImage.map((b, i) => (b && !pagesWithoutText.includes(i + 1) ? i + 1 : 0)).filter(Boolean).slice(0, LIMITS.maxOcrPages);
  if (imagePagesWithText.length) {
    try {
      const rules = await rasterRulesForPages(bytes, imagePagesWithText);
      for (const [n, ls] of rules) layouts[n - 1].lines.push(...ls);
    } catch { /* vector analysis still applies */ }
  }

  const layoutFields: DetectedField[] = [];
  layouts.forEach((layout, i) => {
    if (pagesWithoutText.includes(i + 1)) return;
    layoutFields.push(...toDetected(suggestFields(layout), i + 1, layout, 'text'));
  });
  if (layoutFields.length) methods.add('text');

  const ocrWanted = opts.ocr !== false ? pagesWithoutText : [];
  const ocrTodo = ocrWanted.slice(0, LIMITS.maxOcrPages);
  const ocrSkipped = ocrWanted.slice(LIMITS.maxOcrPages);
  if (ocrTodo.length) {
    try {
      const ocr = await ocrPages(bytes, ocrTodo);
      for (const [pageNo, layout] of ocr) layoutFields.push(...toDetected(suggestFields(layout), pageNo, layout, 'ocr'));
      if ([...ocr.values()].some((l) => l.runs.length)) methods.add('ocr');
    } catch {
      notes.push('OCR could not run on the scanned pages; place fields manually on those pages.');
    }
  }
  if (ocrSkipped.length) notes.push(`OCR was limited to the first ${LIMITS.maxOcrPages} scanned pages; pages ${ocrSkipped.join(', ')} need manual placement.`);
  if (pagesWithoutText.length && opts.ocr === false) notes.push('Scanned pages were not analyzed (OCR off); place fields manually.');

  // layout candidates that coincide with a real form widget are redundant
  for (const lf of layoutFields) {
    const dup = acro.some((a) => a.page === lf.page && rectIou({ x: a.x, y: a.y, w: a.w, h: a.h }, { x: lf.x, y: lf.y, w: lf.w, h: lf.h }) > 0.15);
    if (!dup) fields.push(lf);
  }

  fields = fields
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .slice(0, LIMITS.maxFields);

  if (!fields.length) notes.push('No likely signing fields were found. Add fields manually in the editor.');
  notes.push('Detection is heuristic and can miss fields or suggest wrong ones. Review every page before sending.');
  return {
    fields,
    info: {
      engine: 'hqn-layout-1', methods: [...methods], acroformFields: acro.length, pagesAnalyzed: geoms.length,
      pagesWithoutText, ocrPages: ocrTodo, ocrSkippedPages: ocrSkipped, processing: 'local', notes,
      ranAt: new Date().toISOString(), suggested: fields.length, needsReview: fields.filter((f) => f.needs_review).length,
    },
  };
}
