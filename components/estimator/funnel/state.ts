import { activeSteps, answeredSteps, decodeFunnelSelection, defaultFunnelSelection, encodeFunnelSelection, normalizeFunnelSelection } from '@/lib/estimator/funnel/engine';
import type { FunnelPhoto, FunnelPhotoWidths, FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { FunnelLeadResult } from './screens';

/*
 * Pure helpers for the funnel screens (no React): which screen a URL asks
 * for, the URL of a screen, the step label and progress, and the
 * sessionStorage copy that lets a refresh keep the picks and the result.
 *
 * Screens, in order: the steps shown on this path ("?step=1" .. "?step=<n>",
 * n = 3 for just the pool, 4 with a spa, 7 for the full backyard: follow-up
 * steps count only when a pick asks for them), then the contact step
 * ("?step=contact") and the booking step ("?step=book"). The picks ride along
 * in the same query string (size=classic&finish=luxe&extras=spa&spa=flush), so
 * a copied link reopens the same design. Every helper that depends on the
 * path takes the selection (default: every step on its default).
 */

export type FunnelScreen = { kind: 'step'; index: number } | { kind: 'contact' } | { kind: 'book' };

export const CONTACT_PARAM = 'contact';
export const BOOK_PARAM = 'book';

/** How many steps this path shows. */
export function stepCount(spec: FunnelSpec, selection: FunnelSelection = defaultFunnelSelection(spec)): number {
  return activeSteps(spec, selection).length;
}

/** The screen a `?step=` value names (for these picks); anything unknown is step 1. */
export function parseScreen(spec: FunnelSpec, raw: string | null | undefined, selection?: FunnelSelection): FunnelScreen {
  if (raw === CONTACT_PARAM) return { kind: 'contact' };
  if (raw === BOOK_PARAM) return { kind: 'book' };
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= stepCount(spec, selection)) return { kind: 'step', index: n - 1 };
  return { kind: 'step', index: 0 };
}

/** A step screen past the end of this path (the picks changed under it) becomes the path's last step. */
export function clampScreen(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): FunnelScreen {
  if (screen.kind !== 'step') return screen;
  const last = stepCount(spec, selection) - 1;
  return screen.index > last ? { kind: 'step', index: last } : screen;
}

/** The `?step=` value of a screen. */
export function screenParam(screen: FunnelScreen): string {
  if (screen.kind === 'contact') return CONTACT_PARAM;
  if (screen.kind === 'book') return BOOK_PARAM;
  return String(screen.index + 1);
}

/** Same screen? */
export function sameScreen(a: FunnelScreen, b: FunnelScreen): boolean {
  return screenParam(a) === screenParam(b);
}

/**
 * "<pathname>?step=2&size=classic&finish=luxe&extras=pool". Any other param
 * already in `search` (UTMs, fbclid) is kept after them, for attribution; a
 * stale follow-up param (e.g. spa= after "Just the pool") is dropped.
 */
export function screenUrl(spec: FunnelSpec, pathname: string, screen: FunnelScreen, selection: FunnelSelection, search = ''): string {
  const own = new Set(['step', ...spec.steps.map((s) => s.id)]);
  const rest = [...new URLSearchParams(search.replace(/^\?/, ''))].filter(([k]) => !own.has(k));
  const tail = rest.length ? `&${new URLSearchParams(rest).toString()}` : '';
  return `${pathname}?step=${screenParam(screen)}&${encodeFunnelSelection(spec, selection)}${tail}`;
}

export function nextScreen(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): FunnelScreen {
  if (screen.kind === 'step') return screen.index + 1 < stepCount(spec, selection) ? { kind: 'step', index: screen.index + 1 } : { kind: 'contact' };
  return { kind: 'book' };
}

/** The screen the back arrow goes to; null on step 1 (no arrow there). */
export function prevScreen(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): FunnelScreen | null {
  if (screen.kind === 'contact') return { kind: 'step', index: stepCount(spec, selection) - 1 };
  if (screen.kind === 'book') return { kind: 'contact' };
  return screen.index > 0 ? { kind: 'step', index: screen.index - 1 } : null;
}

/** Position for transitions: steps 0..n-1, contact n, book n+1. */
export function screenOrder(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): number {
  if (screen.kind === 'step') return screen.index;
  const n = stepCount(spec, selection);
  return screen.kind === 'contact' ? n : n + 1;
}

/** The small label over the bar: "Step 1 of 3" (of 4 or 7 when follow-ups show), or the contact eyebrow ("Last step"). Null on booking (no bar). */
export function stepLabel(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): string | null {
  if (screen.kind === 'step') return `Step ${screen.index + 1} of ${stepCount(spec, selection)}`;
  if (screen.kind === 'contact') return spec.contactStep.eyebrow;
  return null;
}

/** How full the bar is (0..1): each step is one share, the contact step fills it. */
export function progress(spec: FunnelSpec, screen: FunnelScreen, selection?: FunnelSelection): number {
  if (screen.kind === 'step') return (screen.index + 1) / (stepCount(spec, selection) + 1);
  return 1;
}

/** Text of a step's button: the spec's finalCta on the path's last step, else the step's own cta, else "Continue". */
export function stepCta(spec: FunnelSpec, index: number, selection?: FunnelSelection): string {
  const steps = activeSteps(spec, selection ?? defaultFunnelSelection(spec));
  const step = steps[index];
  if (index === steps.length - 1 && spec.finalCta) return spec.finalCta;
  return step?.cta ?? 'Continue';
}

/* ------------------------------------------------------------------ */
/* Initial state from the URL (server page)                            */
/* ------------------------------------------------------------------ */

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The screen, picks and whether the URL carried any pick, from the page's searchParams. */
export function initialFromSearch(spec: FunnelSpec, search: SearchParams | undefined) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search ?? {})) {
    const value = first(v);
    if (typeof value === 'string') params.set(k, value);
  }
  const selection = decodeFunnelSelection(spec, params);
  return {
    screen: parseScreen(spec, params.get('step'), selection),
    selection,
    fromUrl: answeredSteps(spec, params).length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* sessionStorage                                                      */
/* ------------------------------------------------------------------ */

export type StoredFunnel = {
  v: 1;
  selection: FunnelSelection;
  /** After the contact step: what the lead route answered (the booking step needs it after a refresh). */
  result?: FunnelLeadResult;
};

export const storageKey = (slug: string) => `hq-funnel:${slug}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function session(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The saved picks (normalized) and result, or null. Never throws (private mode, blocked storage). */
export function readStored(spec: FunnelSpec, slug: string, storage: StorageLike | null = session()): StoredFunnel | null {
  try {
    const raw = storage?.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFunnel>;
    if (!parsed || parsed.v !== 1) return null;
    const result = parsed.result && typeof parsed.result === 'object' && parsed.result.estimate ? parsed.result : undefined;
    return { v: 1, selection: normalizeFunnelSelection(spec, parsed.selection), result };
  } catch {
    return null;
  }
}

/**
 * The stored lead result when it was priced for exactly these picks, else null:
 * after a pick changes, the booking step (and its range) is closed until the
 * contact step is sent again. A result saved before results carried their
 * picks is treated as stale.
 */
export function resultFor(spec: FunnelSpec, result: FunnelLeadResult | null | undefined, selection: FunnelSelection): FunnelLeadResult | null {
  if (!result?.selection) return null;
  const a = normalizeFunnelSelection(spec, result.selection);
  const b = normalizeFunnelSelection(spec, selection);
  return spec.steps.every((s) => a[s.id] === b[s.id]) ? result : null;
}

export function writeStored(slug: string, value: StoredFunnel, storage: StorageLike | null = session()): void {
  try {
    storage?.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // Storage full or blocked: the URL still carries the picks.
  }
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

/** What one photo layer shows after the server's file check: the photo itself, or its fallback when the file is not there. */
export type ShownPhoto = {
  src: string;
  srcSm?: string;
  widths?: FunnelPhotoWidths;
  alt: string;
  fallback?: { src: string; srcSm?: string; alt: string };
  isFallback: boolean;
};

/** Swap to the fallback when the server knows the file is missing (the browser never asks for it). */
export function resolvePhoto(photo: FunnelPhoto, missing: ReadonlySet<string>): ShownPhoto {
  if (photo.fallback && missing.has(photo.src)) return { ...photo.fallback, isFallback: true };
  return { ...photo, srcSm: photo.srcSm && missing.has(photo.srcSm) ? undefined : photo.srcSm, isFallback: false };
}

/** srcset for a photo with a phone copy (the configurator files are 1200 / 1800 px wide unless `widths` says otherwise). */
export function photoSrcSet(photo: { src: string; srcSm?: string; widths?: FunnelPhotoWidths }): string | undefined {
  if (!photo.srcSm) return undefined;
  const w = photo.widths ?? { sm: 1200, full: 1800 };
  return `${photo.srcSm} ${w.sm}w, ${photo.src} ${w.full}w`;
}
