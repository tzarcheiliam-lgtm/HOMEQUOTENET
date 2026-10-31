/**
 * Browser side of the optional photoreal render: the finished top-down design
 * (a PNG of the live scene) goes to POST /api/estimator/[slug]/render, which
 * asks kie.ai for a photorealistic aerial image; the screen polls GET
 * /api/estimator/[slug]/render/[taskId]. Only after the contact step: the
 * lead response carries a short-lived renderToken. Off when the server has
 * no KIE_API_KEY (the start call answers { ok: false, reason: 'disabled' }).
 * Neither call throws: every failure maps to the union types below.
 */

export type RenderStart =
  | { ok: true; taskId: string }
  | { ok: false; reason: 'disabled' | 'limit' | 'invalid' | 'error'; message: string };

export type RenderStatus =
  | { status: 'running' }
  | { status: 'done'; imageUrl: string }
  | { status: 'failed'; message: string };

/**
 * How often the screen calls checkRender, and when it gives up (renders take
 * ~20-90 s). The single source for these: the result screen imports them.
 */
export const RENDER_POLL_MS = 4000;
export const RENDER_TIMEOUT_MS = 4 * 60 * 1000;

/**
 * Hosting caps request bodies at 4.5 MB; above this many data-URL characters
 * the snapshot is re-encoded as JPEG (still far more detail than the model needs).
 */
export const MAX_UPLOAD_DATA_URL_CHARS = 4_000_000;

const OFFLINE = 'Could not reach the server. Check your connection and try again.';

/**
 * Per-request time limits: a request that hangs (a stalled phone network, a
 * server that never answers) must end, or the result would show "developing"
 * forever. The upload gets longer (up to ~4 MB from a phone).
 */
export const START_TIMEOUT_MS = 60_000;
export const CHECK_TIMEOUT_MS = 15_000;

/** An AbortSignal that fires after `ms` (AbortSignal.timeout is missing on older Safari). */
function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortController === 'undefined') return undefined;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
const GENERIC = 'Something went wrong. Please try again.';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be read'));
    img.src = src;
  });
}

/** Shrink a too-big snapshot: JPEG at full size, then smaller, until it fits. Unchanged outside a browser. */
export async function fitForUpload(dataUrl: string, maxChars = MAX_UPLOAD_DATA_URL_CHARS): Promise<string> {
  if (dataUrl.length <= maxChars || typeof document === 'undefined') return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    for (const [scale, quality] of [[1, 0.9], [1, 0.8], [0.75, 0.85], [0.5, 0.85]] as const) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpeg = canvas.toDataURL('image/jpeg', quality);
      if (jpeg.length <= maxChars) return jpeg;
    }
  } catch { /* send the original; the server answers if it is too big */ }
  return dataUrl;
}

function isRenderStart(value: unknown): value is RenderStart {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.ok === true ? typeof v.taskId === 'string' : v.ok === false && typeof v.reason === 'string' && typeof v.message === 'string';
}

function isRenderStatus(value: unknown): value is RenderStatus {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.status === 'running') return true;
  if (v.status === 'done') return typeof v.imageUrl === 'string';
  return v.status === 'failed' && typeof v.message === 'string';
}

/**
 * Send the design picture; answers the task id to poll, or why not. `funnel`:
 * the simple funnel's picks, for a render whose prompt depends on them (the
 * roofing funnel's "See it on your house": the server builds the prompt from them).
 */
export async function startRender(slug: string, renderToken: string, pngDataUrl: string, funnel?: Record<string, string>): Promise<RenderStart> {
  try {
    const image = await fitForUpload(pngDataUrl);
    const res = await fetch(`/api/estimator/${encodeURIComponent(slug)}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(funnel ? { renderToken, image, funnel } : { renderToken, image }),
      signal: timeoutSignal(START_TIMEOUT_MS),
    });
    const data: unknown = await res.json().catch(() => null);
    if (isRenderStart(data)) return data;
    if (res.status === 413) return { ok: false, reason: 'invalid', message: 'That picture is too large to send.' };
    return { ok: false, reason: 'error', message: GENERIC };
  } catch {
    return { ok: false, reason: 'error', message: OFFLINE };
  }
}

/**
 * One status check. A network blip or a 5xx while the render is running
 * reads as 'running' (the caller keeps polling until RENDER_TIMEOUT_MS).
 */
export async function checkRender(slug: string, renderToken: string, taskId: string): Promise<RenderStatus> {
  try {
    const res = await fetch(
      `/api/estimator/${encodeURIComponent(slug)}/render/${encodeURIComponent(taskId)}`,
      // A header, not ?token=: query strings end up in hosting and proxy access logs.
      // A check that times out reads as 'running' (below); the session's overall timeout still applies.
      { cache: 'no-store', headers: { 'x-render-token': renderToken }, signal: timeoutSignal(CHECK_TIMEOUT_MS) },
    );
    const data: unknown = await res.json().catch(() => null);
    if (isRenderStatus(data)) return data;
    return res.status >= 500 ? { status: 'running' } : { status: 'failed', message: GENERIC };
  } catch {
    return { status: 'running' };
  }
}
