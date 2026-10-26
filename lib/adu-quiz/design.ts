/**
 * ADU quiz, build half: the options for each build step, labels, square footage,
 * and helpers that turn a (partial) design into chips and a plain-English
 * description. Pure (no React, no I/O) and contains NO prices: prices live in
 * lib/adu-quiz/config.ts (PRICING) and are only read on the server.
 */

export type Option = { value: string; label: string; note?: string };

export const PLACEMENTS: Option[] = [
  { value: 'backyard', label: 'Backyard', note: 'A detached home behind your house' },
  { value: 'garage_conversion', label: 'Convert my garage', note: 'Turn your existing garage into a home' },
  { value: 'attached', label: 'Attached to my house', note: 'An addition on the side of your home' },
  { value: 'above_garage', label: 'Above my garage', note: 'A second story over your garage' },
];

/** `sqft` is approximate; the 3-bedroom is "about 1,000 or more". */
export const SIZES: (Option & { sqft: number; beds: string })[] = [
  { value: 'studio', label: 'Studio', note: 'About 400 sq ft', sqft: 400, beds: 'Studio' },
  { value: '1br', label: '1 bedroom', note: 'About 600 sq ft', sqft: 600, beds: '1 bed' },
  { value: '2br', label: '2 bedroom', note: 'About 800 sq ft', sqft: 800, beds: '2 bed' },
  { value: '3br', label: '3 bedroom', note: 'About 1,000+ sq ft', sqft: 1000, beds: '3 bed' },
];

export const STYLES: Option[] = [
  { value: 'modern', label: 'Modern', note: 'Clean lines, low roof, big windows' },
  { value: 'craftsman', label: 'Craftsman', note: 'Gabled roof, grid windows' },
  { value: 'mediterranean', label: 'Mediterranean', note: 'Tile roof, arched windows' },
  { value: 'farmhouse', label: 'Farmhouse', note: 'Steep roof, black frames' },
];

/** `hex` drives the preview; `trim` is the contrasting trim colour. */
export const COLORS: (Option & { hex: string; trim: string })[] = [
  { value: 'white', label: 'Warm white', hex: '#f1ece1', trim: '#3b4048' },
  { value: 'gray', label: 'Soft gray', hex: '#a3acb5', trim: '#f4f4f2' },
  { value: 'sage', label: 'Sage green', hex: '#8fa68a', trim: '#f4f4f2' },
  { value: 'navy', label: 'Navy blue', hex: '#2f4d73', trim: '#f4f4f2' },
  { value: 'clay', label: 'Clay', hex: '#c27c58', trim: '#f4f4f2' },
  { value: 'charcoal', label: 'Charcoal', hex: '#3d434b', trim: '#f4f4f2' },
];

export const MATERIALS: Option[] = [
  { value: 'stucco', label: 'Stucco' },
  { value: 'wood', label: 'Wood siding' },
  { value: 'board_batten', label: 'Board and batten' },
];
/** Used for the preview when the visitor has not picked a material. */
export const DEFAULT_MATERIAL: Record<string, string> = {
  modern: 'stucco', craftsman: 'wood', mediterranean: 'stucco', farmhouse: 'board_batten',
};

export const EXTRAS: Option[] = [
  { value: 'solar', label: 'Solar panels' },
  { value: 'porch', label: 'Covered porch or deck' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'large_windows', label: 'Large windows or sliding doors' },
];

export const GOALS: Option[] = [
  { value: 'family', label: 'Family or multigenerational living' },
  { value: 'rental_income', label: 'Rental income' },
  { value: 'home_office', label: 'Home office or guest space' },
  { value: 'home_value', label: 'Increase home value' },
];

export const BUILD_IDS = ['placement', 'size', 'style', 'color', 'extras', 'goal'] as const;
export type BuildId = (typeof BUILD_IDS)[number];

export const BUILD_STEPS: { id: BuildId; title: string; hint?: string }[] = [
  { id: 'placement', title: 'Where will it go?' },
  { id: 'size', title: 'How big and how many bedrooms?' },
  { id: 'style', title: 'Pick a style.' },
  { id: 'color', title: 'Choose your exterior color.', hint: 'Optionally pick a material too.' },
  { id: 'extras', title: 'Add any finishing touches.', hint: 'Choose as many as you like, or none.' },
  { id: 'goal', title: 'What’s your main goal?', hint: 'This is just for our records. It will not change your design.' },
];

export const BUILD_OPTIONS = {
  placement: PLACEMENTS, size: SIZES, style: STYLES, color: COLORS, material: MATERIALS, extras: EXTRAS, goal: GOALS,
} as const;

/** The design as the visitor has built it so far. Everything is optional until chosen. */
export type Design = {
  placement?: string;
  size?: string;
  style?: string;
  color?: string;
  material?: string;
  extras?: string[];
  goal?: string;
};

export const isOption = (list: readonly Option[], value: unknown): value is string =>
  typeof value === 'string' && list.some((o) => o.value === value);

/** Build answers are valid when the four required choices and the goal are real options; extras/material are optional. */
export function isDesignComplete(d: Design): boolean {
  return isOption(PLACEMENTS, d.placement) && isOption(SIZES, d.size) && isOption(STYLES, d.style)
    && isOption(COLORS, d.color) && isOption(GOALS, d.goal)
    && (d.material === undefined || isOption(MATERIALS, d.material))
    && (d.extras === undefined || (Array.isArray(d.extras) && d.extras.every((e) => isOption(EXTRAS, e)) && new Set(d.extras).size === d.extras.length));
}

const label = (list: readonly Option[], value?: string) => list.find((o) => o.value === value)?.label;

/** What the preview draws: choices made so far, with defaults for the rest. */
export function resolveDesign(d: Design) {
  const size = SIZES.find((s) => s.value === d.size) ?? SIZES[1];
  const style = (d.style && isOption(STYLES, d.style) ? d.style : 'modern');
  const color = COLORS.find((c) => c.value === d.color) ?? COLORS[0];
  return {
    hasAdu: !!d.placement,
    placement: d.placement && isOption(PLACEMENTS, d.placement) ? d.placement : 'backyard',
    size: size.value, sqft: size.sqft,
    style,
    color: color.value, hex: color.hex, trim: color.trim,
    material: d.material && isOption(MATERIALS, d.material) ? d.material : DEFAULT_MATERIAL[style],
    extras: new Set(d.extras ?? []),
  };
}
export type ResolvedDesign = ReturnType<typeof resolveDesign>;

/** The "Your ADU" chip row: fills in as choices are made. */
export function designChips(d: Design): string[] {
  const chips: string[] = [];
  const placement = label(PLACEMENTS, d.placement);
  if (placement) chips.push(placement);
  const size = SIZES.find((s) => s.value === d.size);
  if (size) chips.push(size.beds, `${size.sqft.toLocaleString('en-US')}${size.value === '3br' ? '+' : ''} sq ft`);
  const style = label(STYLES, d.style);
  if (style) chips.push(style);
  const color = label(COLORS, d.color);
  if (color) chips.push(d.material ? `${color}, ${label(MATERIALS, d.material)?.toLowerCase()}` : color);
  for (const e of d.extras ?? []) { const l = label(EXTRAS, e); if (l) chips.push(l); }
  return chips;
}

/** Plain-English description, used for the image alt text and the screen-reader announcement. */
export function describeDesign(d: Design): string {
  const placement = d.placement ? label(PLACEMENTS, d.placement)?.toLowerCase() : null;
  if (!placement) return 'Your lot and main house. Your ADU will appear here as you choose.';
  const size = SIZES.find((s) => s.value === d.size);
  const parts = [
    size ? `${size.label.toLowerCase()}, about ${size.sqft.toLocaleString('en-US')}${size.value === '3br' ? ' or more' : ''} square feet` : null,
    d.style ? `${label(STYLES, d.style)?.toLowerCase()} style` : null,
    d.color ? `${label(COLORS, d.color)?.toLowerCase()} exterior${d.material ? ` with ${label(MATERIALS, d.material)?.toLowerCase()}` : ''}` : null,
  ].filter(Boolean);
  const extras = (d.extras ?? []).map((e) => label(EXTRAS, e)?.toLowerCase()).filter(Boolean);
  return `Your ADU: ${placement}${parts.length ? `, ${parts.join(', ')}` : ''}${extras.length ? `, with ${extras.join(', ')}` : ''}.`;
}
