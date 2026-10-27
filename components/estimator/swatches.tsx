/** Material swatch ids. Template options reference these via `option.swatch`. */
export const SWATCH_IDS = [
  'plaster',
  'quartz',
  'pebble',
  'tile_porcelain',
  'tile_glass',
  'stone',
  'concrete',
  'travertine',
  'pavers',
  'porcelain_deck',
  'deck_resurface',
] as const;
export type SwatchId = (typeof SWATCH_IDS)[number];

/** STAND-IN: material swatch (replaced by the real swatches). Unknown ids render nothing. */
export function Swatch({ id, className }: { id: string; className?: string }) {
  if (!(SWATCH_IDS as readonly string[]).includes(id)) return null;
  return <span className={className} aria-hidden="true" data-swatch={id} />;
}
