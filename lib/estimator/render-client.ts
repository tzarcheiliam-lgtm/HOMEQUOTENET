/**
 * Browser side of the optional photoreal render: the finished top-down design
 * (a PNG of the live scene) goes to POST /api/estimator/[slug]/render, which
 * asks kie.ai for a photorealistic aerial image; the screen polls GET
 * /api/estimator/[slug]/render/[taskId]. Only after the contact step: the
 * lead response carries a short-lived renderToken. Off when the server has
 * no KIE_API_KEY (the start call answers { ok: false, reason: 'disabled' }).
 */

export type RenderStart =
  | { ok: true; taskId: string }
  | { ok: false; reason: 'disabled' | 'limit' | 'invalid' | 'error'; message: string };

export type RenderStatus =
  | { status: 'running' }
  | { status: 'done'; imageUrl: string }
  | { status: 'failed'; message: string };

/** STAND-IN (replaced by the render agent): never starts a render. */
export async function startRender(_slug: string, _renderToken: string, _pngDataUrl: string): Promise<RenderStart> {
  return { ok: false, reason: 'disabled', message: 'Realistic renders are not switched on.' };
}

/** STAND-IN (replaced by the render agent). */
export async function checkRender(_slug: string, _renderToken: string, _taskId: string): Promise<RenderStatus> {
  return { status: 'failed', message: 'Realistic renders are not switched on.' };
}
