// Turns HomeQuote data into short Telegram messages. Pure functions (tested in tests/jarvis.test.ts).
// Telegram is not end-to-end encrypted, so messages carry first name + last initial, the city at most, and a link
// into HomeQuote (which needs a login) instead of phone numbers or full records.
import { ago, clockTime } from './schedule.mjs';

/** "Sergio Martinez Sandoval" -> "Sergio M." ; "" -> "Someone". */
export function shortName(full) {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Someone';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Collapse whitespace and cut at `n` characters on a word boundary. */
export function clip(text, n) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > n * 0.5 ? cut.slice(0, at) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

/** One waiting conversation (texting_overview.need_a_person entry). */
export function waitingLine(item, now) {
  return `• ${shortName(item.lead)} · waiting ${ago(item.since, now)}\n  ${clip(item.summary, 170)}\n  ${item.link}`;
}

export function formatWaiting(items, now) {
  if (!items?.length) return 'Nobody is waiting for you. 👍';
  const sorted = [...items].sort((a, b) => String(a.since).localeCompare(String(b.since)));
  return [`${sorted.length} waiting for a person (oldest first):`, ...sorted.map((i) => waitingLine(i, now))].join('\n\n');
}

/** Alert for a handoff: first time, then the reminders. */
export function handoffAlert(item, nth, now) {
  const head = nth === 0 ? '🔔 Needs you' : `⏰ Still waiting (reminder ${nth})`;
  return `${head}\n${waitingLine(item, now)}`;
}

export function formatStatus(texting, attention, now) {
  const lines = [];
  if (texting) {
    const b = texting.mac_bridge ?? {};
    lines.push(`Texting: ${texting.texting_on ? 'on' : 'OFF'} · Mac bridge ${b.connected ? 'connected' : 'NOT connected'}${b.last_check_in ? ` (checked in ${ago(b.last_check_in, now)} ago)` : ''}`);
    if (texting.texts_waiting_to_send) lines.push(`Texts queued: ${texting.texts_waiting_to_send}`);
    lines.push(`Waiting for a person: ${texting.need_a_person?.length ?? 0}`);
  }
  if (attention?.length) {
    lines.push('', `Needs a look (${attention.length}):`);
    for (const a of attention) lines.push(`• ${a.name}${a.note ? ` — ${clip(a.note, 120)}` : ''}`);
  } else if (attention) {
    lines.push('', 'All HomeQuote automations look healthy. ✅');
  }
  return lines.join('\n');
}

export function formatToday(appointments, tz) {
  const live = (appointments ?? []).filter((a) => a.status !== 'cancelled');
  if (!live.length) return 'Nothing on the calendar today.';
  return [`Today (${live.length}):`, ...live.map((a) => {
    const who = a.lead?.name ? shortName(a.lead.name) : 'Unknown';
    const where = a.lead?.city ? `, ${a.lead.city}` : '';
    const co = a.contractor ? ` · ${a.contractor}` : '';
    return `• ${clockTime(a.scheduled_at, tz)} ${who}${where}${co} (${a.status})`;
  })].join('\n');
}

/** Briefing without Claude (no ANTHROPIC_API_KEY, or the API is down). */
export function templateBriefing({ summary, texting, appointments, attention, tz }) {
  const out = ['☀️ Good morning. Here is today.'];
  out.push('', formatToday(appointments, tz));
  const waiting = texting?.need_a_person ?? [];
  out.push('', waiting.length ? `${waiting.length} waiting for you (oldest: ${shortName([...waiting].sort((a, b) => String(a.since).localeCompare(String(b.since)))[0].lead)}). Send /waiting for the list.` : 'Nobody is waiting for you.');
  if (summary) {
    const src = Object.entries(summary.bySource ?? {}).map(([k, v]) => `${k} ${v}`).join(', ');
    out.push('', `Last 24 h: ${summary.newLeads ?? 0} new leads${src ? ` (${src})` : ''}, ${summary.appointmentsBooked ?? 0} booked, ${summary.texts?.received ?? 0} texts in.`);
  }
  if (attention?.length) out.push('', `⚠️ ${attention.length} automation(s) need a look: ${attention.map((a) => a.name).join('; ')}`);
  if (texting && !texting.mac_bridge?.connected) out.push('', '⚠️ The Mac texting bridge is not connected — new leads are not being texted.');
  return out.join('\n');
}

/** Telegram allows 4096 characters per message; split on blank lines where possible. */
export function splitMessage(text, max = 3900) {
  const chunks = [];
  let rest = String(text);
  while (rest.length > max) {
    let at = rest.lastIndexOf('\n\n', max);
    if (at < max * 0.5) at = rest.lastIndexOf('\n', max);
    if (at < max * 0.5) at = max;
    chunks.push(rest.slice(0, at).trimEnd());
    rest = rest.slice(at).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
