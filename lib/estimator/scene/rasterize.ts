/**
 * Turn the live <PoolScene> SVG into a PNG data URL, for the photoreal render
 * and the "save my design" download. Browser only (canvas), but the pieces
 * that do not need a DOM are exported and tested in node.
 *
 * An SVG drawn into a canvas through an <img> cannot load anything outside
 * itself, so every texture/sprite <image> is fetched (same origin only) and
 * inlined as a data URL first. Animations are frozen and outgoing crossfade
 * layers dropped so the snapshot is the settled design, not a mid-fade frame.
 */

const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Picture aspect: the scene is 1200 x 800 (3:2). */
export function rasterSize(width: number): { width: number; height: number } {
  const w = Math.min(4096, Math.max(64, Math.round(Number.isFinite(width) ? width : 1536)));
  return { width: w, height: Math.round((w * 2) / 3) };
}

/**
 * Absolute URL of an <image> href worth inlining: same-origin http(s) or a
 * blob: URL. Null for data: URLs (already inline), in-document refs (#id)
 * and anything cross-origin.
 */
export function inlinableUrl(href: string | null | undefined, base: string): string | null {
  const value = href?.trim();
  if (!value || value.startsWith('#') || value.startsWith('data:')) return null;
  if (value.startsWith('blob:')) return value;
  try {
    const url = new URL(value, base);
    const origin = new URL(base).origin;
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin ? url.href : null;
  } catch {
    return null;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif',
};

/** Image type from a response header, falling back to the file extension. */
export function imageMime(url: string, header?: string | null): string {
  const type = header?.split(';')[0]?.trim().toLowerCase();
  if (type && type.startsWith('image/')) return type;
  const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
  return (ext && MIME_BY_EXT[ext]) || 'application/octet-stream';
}

/** Base64 without FileReader (works in browsers and node). Chunked so big files do not blow the stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Fetched data URLs by absolute URL; a failed fetch is forgotten so the next snapshot retries it. */
const dataUrlCache = new Map<string, Promise<string>>();

export async function fetchAsDataUrl(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  const cached = dataUrlCache.get(url);
  if (cached) return cached;
  const pending = (async () => {
    const res = await fetcher(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Image ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return `data:${imageMime(url, res.headers.get('content-type'))};base64,${bytesToBase64(bytes)}`;
  })();
  dataUrlCache.set(url, pending);
  pending.catch(() => dataUrlCache.delete(url));
  return pending;
}

/** The bits of an SVG element the inliner touches (lets node tests pass plain objects). */
export type HrefTarget = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getAttributeNS?(ns: string, name: string): string | null;
  removeAttributeNS?(ns: string, name: string): void;
};

/**
 * Point every image at an inline data URL. An image that cannot be inlined
 * (cross-origin, or its fetch failed) loses its href: the texture's flat
 * fallback colour under it still shows, which beats a broken snapshot.
 */
export async function inlineImageHrefs(
  targets: HrefTarget[],
  base: string,
  load: (url: string) => Promise<string> = (url) => fetchAsDataUrl(url),
): Promise<void> {
  await Promise.all(targets.map(async (el) => {
    const href = el.getAttribute('href') ?? el.getAttributeNS?.(XLINK_NS, 'href') ?? el.getAttribute('xlink:href');
    if (!href || href.startsWith('data:') || href.startsWith('#')) return;
    const url = inlinableUrl(href, base);
    let data: string | null = null;
    if (url) {
      try { data = await load(url); } catch { data = null; }
    }
    el.removeAttributeNS?.(XLINK_NS, 'href');
    el.removeAttribute('xlink:href');
    if (data) el.setAttribute('href', data);
    else el.removeAttribute('href');
  }));
}

/** Added to the copy: no motion, so every layer sits at its final look. */
export const FREEZE_CSS = '*{animation:none!important;transition:none!important}';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The design could not be drawn.'));
    img.src = src;
  });
}

async function drawToPng(src: string, width: number, height: number): Promise<string> {
  const img = await loadImage(src);
  try { await img.decode(); } catch { /* onload already fired; decode() is only a hint */ }
  // Safari can paint nested data-URL images a frame late; give it one.
  await new Promise((r) => setTimeout(r, 30));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the design.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

/**
 * PNG data URL of the scene at `width` x (width * 2/3). Rejects with a plain
 * Error when the browser cannot draw it (never a tainted-canvas surprise:
 * nothing outside the SVG is referenced by the time it is drawn).
 */
export async function rasterizeScene(svg: SVGSVGElement, width = 1536): Promise<string> {
  if (typeof document === 'undefined') throw new Error('rasterizeScene runs in the browser.');
  const size = rasterSize(width);
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', XLINK_NS);
    clone.setAttribute('width', String(size.width));
    clone.setAttribute('height', String(size.height));
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    // Outgoing crossfade layers would show at full opacity once animations stop.
    clone.querySelectorAll('.ps-fade-out').forEach((el) => el.remove());
    const freeze = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    freeze.textContent = FREEZE_CSS;
    clone.appendChild(freeze);
    await inlineImageHrefs(Array.from(clone.querySelectorAll('image, feImage')), document.baseURI);

    const markup = new XMLSerializer().serializeToString(clone);
    const blobUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      return await drawToPng(blobUrl, size.width, size.height);
    } catch {
      // Some engines refuse blob-URL SVGs in a canvas; a data URL is the slower, safer route.
      return await drawToPng(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, size.width, size.height);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('The design could not be drawn.');
  }
}
