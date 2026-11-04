/**
 * Reads the first sheet of an .xlsx file, or a .csv file, into rows of
 * strings. Small and dependency-free on purpose: it only has to read license
 * lists like CSLB's export, and it runs in the browser (so a large file never
 * has to be uploaded whole) as well as in tests.
 *
 * Decompression is injected: the browser passes DecompressionStream, tests
 * pass node:zlib. Legacy binary .xls is refused with a clear message.
 */

export type InflateRaw = (data: Uint8Array) => Promise<Uint8Array>;

export class SpreadsheetError extends Error {}

/** Browser inflater: DecompressionStream('deflate-raw'). */
export const browserInflateRaw: InflateRaw = async (data) => {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

export async function readSpreadsheet(bytes: Uint8Array, inflateRaw: InflateRaw): Promise<string[][]> {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return readXlsx(bytes, inflateRaw);
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new SpreadsheetError('This is an old-style .xls file. Open it in Excel and save it as .xlsx or .csv.');
  }
  return parseCsv(new TextDecoder('utf-8').decode(bytes));
}

/* ---- ZIP ------------------------------------------------------------------- */

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function zipEntries(b: Uint8Array): ZipEntry[] {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new SpreadsheetError('The file is not a readable .xlsx workbook.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || view.getUint32(p, true) !== 0x02014b50) {
      throw new SpreadsheetError('The .xlsx file looks damaged.');
    }
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    out.push({
      method: view.getUint16(p + 10, true),
      compressedSize: view.getUint32(p + 20, true),
      localOffset: view.getUint32(p + 42, true),
      name: dec.decode(b.subarray(p + 46, p + 46 + nameLen)),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function zipRead(b: Uint8Array, e: ZipEntry, inflateRaw: InflateRaw): Promise<string> {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const lh = e.localOffset;
  if (view.getUint32(lh, true) !== 0x04034b50) throw new SpreadsheetError('The .xlsx file looks damaged.');
  const start = lh + 30 + view.getUint16(lh + 26, true) + view.getUint16(lh + 28, true);
  const raw = b.subarray(start, start + e.compressedSize);
  let data: Uint8Array;
  if (e.method === 0) data = raw;
  else if (e.method === 8) data = await inflateRaw(raw);
  else throw new SpreadsheetError('The .xlsx file uses an unsupported compression method.');
  return new TextDecoder('utf-8').decode(data).replace(/^﻿/, '');
}

/* ---- XLSX ------------------------------------------------------------------ */

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, ent: string) => {
    const e = ent.toLowerCase();
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : '';
  });
}

/** All <t> text inside a fragment (handles rich-text runs), phonetic runs skipped. */
function textOf(fragment: string): string {
  const noPhonetic = fragment.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
  let out = '';
  for (const m of noPhonetic.matchAll(/<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g)) {
    out += decodeXml(m[1] ?? '');
  }
  return out;
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, '').toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(bytes: Uint8Array, inflateRaw: InflateRaw): Promise<string[][]> {
  const entries = zipEntries(bytes);
  const sheets = entries
    .filter((e) => /^xl\/worksheets\/[^/]+\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  if (sheets.length === 0) throw new SpreadsheetError('The workbook has no sheets.');

  const sstEntry = entries.find((e) => e.name.toLowerCase() === 'xl/sharedstrings.xml');
  const shared: string[] = [];
  if (sstEntry) {
    const sst = await zipRead(bytes, sstEntry, inflateRaw);
    for (const m of sst.matchAll(/<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g)) {
      shared.push(textOf(m[1] ?? ''));
    }
  }

  const xml = await zipRead(bytes, sheets[0], inflateRaw);
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const row: string[] = [];
    let next = 0;
    for (const cm of (rm[1] ?? '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] ?? '';
      const ref = /\br="([A-Z]+)\d*"/i.exec(attrs)?.[1];
      const col = ref ? columnIndex(ref) : next;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? 'n';
      const v = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = v !== undefined ? (shared[Number(v)] ?? '') : '';
      else if (type === 'inlineStr') value = textOf(body);
      else value = v !== undefined ? decodeXml(v) : '';
      while (row.length < col) row.push('');
      row[col] = value;
      next = col + 1;
    }
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

/* ---- CSV ------------------------------------------------------------------- */

/** RFC 4180 (quoted fields may hold commas, "" and newlines). Tab-separated files work too. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.indexOf('\n') >= 0 ? src.indexOf('\n') : src.length);
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}
