/**
 * The call list the caller is working from (view, niche, city, …), carried in the
 * URL so "Next" and "Save & next" stay inside it instead of jumping to whatever
 * is next in their whole queue.
 */
export const CONTEXT_KEYS = ['view', 'q', 'caller', 'disposition', 'city', 'county', 'service', 'niche', 'callback', 'sort'] as const;
export type ContextKey = (typeof CONTEXT_KEYS)[number];
export type QueueContext = Partial<Record<ContextKey, string>>;

export function contextFrom(get: (key: string) => string | undefined): QueueContext {
  const ctx: QueueContext = {};
  for (const k of CONTEXT_KEYS) {
    const v = get(k)?.trim();
    if (v) ctx[k] = v.slice(0, 200);
  }
  return ctx;
}

/** `a=b&c=d` with no leading `?`; empty when there is nothing to carry. */
export function contextQuery(ctx: QueueContext): string {
  const q = new URLSearchParams();
  for (const k of CONTEXT_KEYS) if (ctx[k]) q.set(k, ctx[k]!);
  return q.toString();
}

/** True when the caller narrowed the list beyond their default queue. */
export function hasListContext(ctx: QueueContext): boolean {
  return CONTEXT_KEYS.some((k) => (k === 'view' ? !!ctx.view && ctx.view !== 'mine' : !!ctx[k]));
}

export const withContext = (path: string, qs: string) => (qs ? `${path}?${qs}` : path);
