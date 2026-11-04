// Decides which alerts to send, given what Jarvis already told you (kept in state.json). Pure functions.

/** Reminder schedule for a conversation waiting for a person: right away, after 1 hour, after 4 hours. */
export const HANDOFF_PINGS_MIN = [0, 60, 240];

/**
 * @typedef {{ lead: string, link: string, summary?: string, since: string }} WaitingItem
 * @typedef {Record<string, { firstSeen: string, pings: number }>} HandoffState  keyed by the lead link
 * @param {HandoffState} prev   what was already sent (from state.json)
 * @param {WaitingItem[]} items texting_overview.need_a_person right now
 * @param {Date} now
 * @param {boolean} active      inside active hours; outside, nothing is sent but new items are still tracked
 * @returns {{ send: { item: WaitingItem, nth: number }[], next: HandoffState }}
 */
export function planHandoffAlerts(prev, items, now, active) {
  const next = {};
  const send = [];
  for (const item of items ?? []) {
    if (!item?.link) continue;
    const seen = prev?.[item.link] ?? { firstSeen: now.toISOString(), pings: 0 };
    const entry = { ...seen };
    const dueAt = HANDOFF_PINGS_MIN[entry.pings];
    const ageMin = (now.getTime() - new Date(entry.firstSeen).getTime()) / 60000;
    if (active && dueAt !== undefined && ageMin >= dueAt) {
      // Skip reminders that were missed overnight: send the latest one due, once.
      let nth = entry.pings;
      while (HANDOFF_PINGS_MIN[nth + 1] !== undefined && ageMin >= HANDOFF_PINGS_MIN[nth + 1]) nth += 1;
      send.push({ item, nth });
      entry.pings = nth + 1;
    }
    next[item.link] = entry; // items that disappeared were handled: dropped from state
  }
  return { send, next };
}

/**
 * First run: one combined message instead of a burst, and every current item counts as pinged once.
 * @param {WaitingItem[]} items
 * @param {Date} now
 * @returns {HandoffState}
 */
export function seedHandoffs(items, now) {
  const next = {};
  for (const item of items ?? []) if (item?.link) next[item.link] = { firstSeen: now.toISOString(), pings: 1 };
  return next;
}

/**
 * HomeQuote automations in "attention" state, plus the Mac bridge. Alerts once when something goes bad and once when
 * it recovers. Keys: automation name, or "mac_bridge".
 * @param {Record<string, string>} prev
 * @param {{ name: string, note?: string | null }[]} attention
 * @param {{ texting_on?: boolean, mac_bridge?: { connected?: boolean } } | null | undefined} texting
 * @returns {{ bad: { key: string, note: string }[], recovered: string[], next: Record<string, string> }}
 */
export function planHealthAlerts(prev, attention, texting) {
  const now = {};
  for (const a of attention ?? []) now[a.name] = a.note ?? 'Needs a look';
  if (texting && texting.texting_on && !texting.mac_bridge?.connected) now.mac_bridge = 'The Mac texting bridge is not connected: new leads are not being texted.';
  const bad = Object.entries(now).filter(([k]) => !(k in (prev ?? {}))).map(([key, note]) => ({ key, note }));
  const recovered = Object.keys(prev ?? {}).filter((k) => !(k in now));
  return { bad, recovered, next: now };
}
