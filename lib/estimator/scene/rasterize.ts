/**
 * STAND-IN (replaced by the render agent): turn the live <PoolScene> SVG into a
 * PNG data URL (textures inlined so the canvas is not tainted), for the
 * photoreal render and the "save my design" download.
 */
export async function rasterizeScene(_svg: SVGSVGElement, _width = 1536): Promise<string> {
  throw new Error('rasterizeScene is not implemented yet');
}
