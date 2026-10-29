import { rasterizeScene, rasterSize } from '../rasterize.ts';

/**
 * The live bathroom picture as a PNG data URL, for "Save my design" and the
 * photoreal render. Browser only.
 *
 * <BathScene> draws on a <canvas>. It registers a painter for its canvas, so
 * an export is repainted at the requested width (sharp at any size, settled:
 * never a mid-crossfade frame, files loaded first) instead of upscaling the
 * on-screen pixels. Without a painter the canvas pixels are resampled; an SVG
 * (the old stand-in, or any SVG scene) goes through the pool rasterizer.
 */

/** Paints the current design at width x height and returns the canvas. */
export type BathPainter = (width: number, height: number) => Promise<HTMLCanvasElement> | HTMLCanvasElement;

const painters = new WeakMap<object, BathPainter>();

/** Called by <BathScene>; returns the unregister function. */
export function registerBathPainter(canvas: HTMLCanvasElement, painter: BathPainter): () => void {
  painters.set(canvas, painter);
  return () => {
    if (painters.get(canvas) === painter) painters.delete(canvas);
  };
}

/** Export size: the scene's 3:2 at `width` (clamped like the pool export). */
export const bathRasterSize = rasterSize;

function isCanvas(el: unknown): el is HTMLCanvasElement {
  return !!el && typeof (el as HTMLCanvasElement).getContext === 'function' && typeof (el as HTMLCanvasElement).toDataURL === 'function';
}

/**
 * PNG data URL of the scene at `width` x (width * 2/3). Rejects with a plain
 * Error when the browser cannot draw it.
 */
export async function rasterizeBathScene(el: HTMLCanvasElement | SVGSVGElement, width = 1536): Promise<string> {
  if (typeof document === 'undefined') throw new Error('rasterizeBathScene runs in the browser.');
  if (!isCanvas(el)) return rasterizeScene(el, width);
  const size = rasterSize(width);
  try {
    const painter = painters.get(el);
    let source: HTMLCanvasElement = el;
    if (painter) source = await painter(size.width, size.height);
    if (source.width === size.width && source.height === size.height) return source.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = size.width;
    out.height = size.height;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('This browser cannot draw the design.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, size.width, size.height);
    return out.toDataURL('image/png');
  } catch (error) {
    throw error instanceof Error ? error : new Error('The design could not be drawn.');
  }
}
