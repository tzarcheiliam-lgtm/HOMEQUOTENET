/**
 * The map grid behind Refresh Prospects' Google search.
 *
 * Google returns at most 60 results for one search. Searching "pool builder in
 * Los Angeles County" therefore always yields the same 60, and every run after
 * the first is mostly duplicates. Instead each county is cut into squares and
 * every square is searched on its own (Places `locationRestriction`). A square
 * that comes back full (60) probably holds more, so it is split into four
 * smaller squares, and so on: sparse areas cost one request, dense ones are
 * searched street by street.
 *
 * Progress is remembered per niche + phrase + square (prospect_search_cells),
 * so the next run continues where the last stopped instead of starting over.
 * A finished square is searched again after STALE_DAYS, to pick up new
 * businesses.
 *
 * Pure: no I/O.
 */

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface GridCell {
  /** Stable id: "<county code>:<row>.<col>" then "/<quadrant>" per split. */
  key: string;
  county: string;
  bounds: Bounds;
  depth: number;
}

/** Mainland extents, slightly generous; results outside the county are rejected by qualify(). */
export const COUNTY_GRID: { name: string; code: string; bounds: Bounds }[] = [
  { name: 'Los Angeles', code: 'la', bounds: { south: 33.7, west: -118.95, north: 34.82, east: -117.65 } },
  { name: 'Ventura', code: 'ven', bounds: { south: 34.03, west: -119.48, north: 34.9, east: -118.63 } },
];

/** Side of a top-level square, in degrees (~28 km). */
export const ROOT_SIZE = 0.25;
/** Splits allowed below a root; depth 4 squares are ~1.7 km. */
export const MAX_DEPTH = 4;
/** A full result set: 3 pages of 20. */
export const SATURATED_AT = 60;
export const STALE_DAYS = 120;

export function rootCells(): GridCell[] {
  const out: GridCell[] = [];
  for (const c of COUNTY_GRID) {
    const rows = Math.ceil((c.bounds.north - c.bounds.south) / ROOT_SIZE - 1e-9);
    const cols = Math.ceil((c.bounds.east - c.bounds.west) / ROOT_SIZE - 1e-9);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const south = c.bounds.south + r * ROOT_SIZE;
        const west = c.bounds.west + k * ROOT_SIZE;
        out.push({
          key: `${c.code}:${r}.${k}`,
          county: c.name,
          depth: 0,
          bounds: {
            south: round(south),
            west: round(west),
            north: round(Math.min(c.bounds.north, south + ROOT_SIZE)),
            east: round(Math.min(c.bounds.east, west + ROOT_SIZE)),
          },
        });
      }
    }
  }
  return out;
}

/** Quadrants 0 SW, 1 SE, 2 NW, 3 NE. */
export function childCells(cell: GridCell): GridCell[] {
  const { south, west, north, east } = cell.bounds;
  const midLat = round((south + north) / 2);
  const midLng = round((west + east) / 2);
  const quads: Bounds[] = [
    { south, west, north: midLat, east: midLng },
    { south, west: midLng, north: midLat, east },
    { south: midLat, west, north, east: midLng },
    { south: midLat, west: midLng, north, east },
  ];
  return quads.map((bounds, q) => ({ key: `${cell.key}/${q}`, county: cell.county, depth: cell.depth + 1, bounds }));
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export interface CellState {
  status: 'done' | 'split';
  searchedAt: string; // ISO
}

/**
 * The squares still to search, broad first: unknown squares, finished squares
 * that have gone stale, and the children of squares that were split.
 */
export function frontier(
  state: Map<string, CellState>,
  opts: { now?: Date; staleDays?: number; maxDepth?: number } = {}
): GridCell[] {
  const now = (opts.now ?? new Date()).getTime();
  const staleMs = (opts.staleDays ?? STALE_DAYS) * 86_400_000;
  const maxDepth = opts.maxDepth ?? MAX_DEPTH;
  const out: GridCell[] = [];
  let level = rootCells();
  while (level.length > 0) {
    const next: GridCell[] = [];
    for (const cell of level) {
      const st = state.get(cell.key);
      if (!st) out.push(cell);
      else if (st.status === 'split' && cell.depth < maxDepth) next.push(...childCells(cell));
      else if (now - new Date(st.searchedAt).getTime() > staleMs) out.push(cell);
    }
    level = next;
  }
  return out;
}

/** What a completed search of a square means for the next run. */
export function outcomeFor(cell: GridCell, resultCount: number, maxDepth = MAX_DEPTH): CellState['status'] {
  return resultCount >= SATURATED_AT && cell.depth < maxDepth ? 'split' : 'done';
}

/** Places API (New) locationRestriction for a square. */
export function toRectangle(b: Bounds) {
  return {
    rectangle: {
      low: { latitude: b.south, longitude: b.west },
      high: { latitude: b.north, longitude: b.east },
    },
  };
}
