const KNOWN_EVENTS = new Set(['call.ended', 'call.analyzed', 'phone_call.dial_finished']);

/**
 * Idempotency key for a Fish webhook delivery (docs: "Delivery semantics").
 * call.ended / phone_call.dial_finished dedupe on (event, session.id);
 * call.analyzed also on analysis.finished_at, since a re-run analysis is a new
 * event that supersedes the old one. Returns null for events we don't store.
 */
export function dedupeKey(p: { event?: unknown; session?: { id?: unknown }; analysis?: { finished_at?: unknown } }): string | null {
  const event = typeof p.event === 'string' ? p.event : '';
  const id = typeof p.session?.id === 'string' ? p.session.id : '';
  if (!KNOWN_EVENTS.has(event) || !id) return null;
  if (event !== 'call.analyzed') return `${event}:${id}`;
  return `${event}:${id}:${typeof p.analysis?.finished_at === 'string' ? p.analysis.finished_at : ''}`;
}
