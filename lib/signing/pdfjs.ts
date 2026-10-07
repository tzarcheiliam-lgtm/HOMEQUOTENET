import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Loads the legacy (Node-friendly) pdf.js build lazily so importing this module stays cheap. */
export async function loadPdfjs() {
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

function assetDir(name: string): string {
  const root = process.env.PDFJS_ASSET_ROOT || path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
  return path.join(root, name) + path.sep;
}

export async function openWithPdfjs(bytes: Uint8Array) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes), // pdf.js takes ownership of the buffer; never hand it the caller's copy
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    standardFontDataUrl: assetDir('standard_fonts'),
    cMapUrl: assetDir('cmaps'),
    cMapPacked: true,
    wasmUrl: assetDir('wasm'),
    iccUrl: assetDir('iccs'),
    verbosity: 0,
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const pdf = await task.promise;
  return { pdfjs, pdf, destroy: () => task.destroy() };
}
void pathToFileURL;
