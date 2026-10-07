import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from '@cantoo/pdf-lib';
import { LIMITS } from '@/lib/signing/constants';
import { makePageGeom, type PageGeom } from '@/lib/signing/geometry';

export class PdfRejected extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export interface PageInfo { w: number; h: number; rotation: number }
export interface InspectedPdf {
  sha256: string;
  size: number;
  pageCount: number;
  pages: PageInfo[];
  geoms: PageGeom[];
  hasAcroForm: boolean;
}

export const sha256Hex = (bytes: Uint8Array | Buffer | string) => createHash('sha256').update(bytes).digest('hex');

function hasKey(dict: PDFDict | undefined, name: string) {
  return !!dict && dict.has(PDFName.of(name));
}

/**
 * Validates an uploaded file BEFORE it is accepted: real PDF, size/page limits, not encrypted,
 * parseable, sane page dimensions, and free of document-level scripts. The original bytes are never
 * modified; this only reads them.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<InspectedPdf> {
  try {
    return await inspectPdfUnsafe(bytes);
  } catch (e) {
    if (e instanceof PdfRejected) throw e;
    throw new PdfRejected('This PDF could not be read. It may be damaged. Try re-saving or printing it to a new PDF.', 'unreadable');
  }
}

async function inspectPdfUnsafe(bytes: Uint8Array): Promise<InspectedPdf> {
  if (bytes.byteLength === 0) throw new PdfRejected('The file is empty.', 'empty');
  if (bytes.byteLength > LIMITS.maxFileBytes) {
    throw new PdfRejected(`The file is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`, 'too_large');
  }
  // %PDF- may be preceded by a little junk; the spec allows it within the first 1024 bytes.
  const head = Buffer.from(bytes.subarray(0, 1024)).toString('latin1');
  if (!head.includes('%PDF-')) throw new PdfRejected('This is not a PDF file.', 'not_pdf');

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: false });
  } catch (error) {
    const msg = String((error as Error)?.message ?? '');
    if (/encrypt/i.test(msg)) {
      throw new PdfRejected('This PDF is password-protected or encrypted. Remove the protection and upload it again.', 'encrypted');
    }
    throw new PdfRejected('This PDF could not be read. It may be damaged. Try re-saving or printing it to a new PDF.', 'unreadable');
  }
  if (doc.isEncrypted) {
    throw new PdfRejected('This PDF is password-protected or encrypted. Remove the protection and upload it again.', 'encrypted');
  }
  const pageCount = doc.getPageCount();
  if (pageCount < 1) throw new PdfRejected('This PDF has no pages.', 'no_pages');
  if (pageCount > LIMITS.maxPages) {
    throw new PdfRejected(`This PDF has ${pageCount} pages; the limit is ${LIMITS.maxPages}.`, 'too_many_pages');
  }

  // Active content: refuse scripts rather than carry them into a legal document.
  const catalog = doc.catalog;
  const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  if (hasKey(catalog, 'OpenAction') || hasKey(catalog, 'AA') || hasKey(names, 'JavaScript')) {
    throw new PdfRejected('This PDF contains scripts or automatic actions, which are not allowed. Print it to a new PDF and upload that.', 'active_content');
  }

  const pages: PageInfo[] = [];
  const geoms: PageGeom[] = [];
  for (const page of doc.getPages()) {
    const box = page.getCropBox();
    if (!(box.width > 0 && box.height > 0) || box.width > LIMITS.maxPageDimensionPt || box.height > LIMITS.maxPageDimensionPt) {
      throw new PdfRejected('This PDF has a page with an unsupported size.', 'bad_page_size');
    }
    const geom = makePageGeom({ x: box.x, y: box.y, w: box.width, h: box.height }, page.getRotation().angle);
    geoms.push(geom);
    pages.push({ w: round(geom.width), h: round(geom.height), rotation: geom.rotation });
    // widget annotation scripts
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (annots) {
      for (let i = 0; i < annots.size(); i++) {
        const a = annots.lookupMaybe(i, PDFDict);
        const action = a?.lookupMaybe(PDFName.of('A'), PDFDict);
        const s = action?.get(PDFName.of('S'));
        if (s && String(s) === '/JavaScript') {
          throw new PdfRejected('This PDF contains scripts, which are not allowed. Print it to a new PDF and upload that.', 'active_content');
        }
      }
    }
  }

  const acro = catalog.get(PDFName.of('AcroForm'));
  void PDFRef;
  return {
    sha256: sha256Hex(bytes),
    size: bytes.byteLength,
    pageCount,
    pages,
    geoms,
    hasAcroForm: !!acro,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
