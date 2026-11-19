/**
 * Video call recordings (§51, video mode): small pure helpers shared by the processing job,
 * the pages and the tests.
 */

export const recordingPath = (id: string) => `/app/recordings/${id}`;

/** "32 min", "1 h 05 min", "45 s". */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** The line added to the prospect's notes (or the lead's timeline) once a video recording is ready. */
export function recordingNote(ctx: { when: string | null; seconds: number | null; url: string; deleteOn: string }): string {
  const length = formatDuration(ctx.seconds);
  return [
    `Video call recorded${ctx.when ? ` (${ctx.when})` : ''}${length ? ` · ${length}` : ''} · with everyone's consent`,
    `Watch: ${ctx.url}`,
    `Deleted automatically on ${ctx.deleteOn}.`,
  ].join('\n');
}

/** "Feb 17, 2027" in the given zone. */
export function formatDay(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
  } catch {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
  }
}

/** File name for a download: "HomeQuote call - ABC Roofing - 2026-11-19 (part 2).mp4". */
export function downloadName(input: { label: string | null; startedAtMs: number; part: number; parts: number }): string {
  const day = new Date(input.startedAtMs).toISOString().slice(0, 10);
  const label = (input.label ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `HomeQuote call${label ? ` - ${label}` : ''} - ${day}${input.parts > 1 ? ` (part ${input.part})` : ''}.mp4`;
}
