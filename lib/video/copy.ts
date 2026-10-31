import { formatSlot, safeTimeZone, zoneAbbreviation, formatTime } from '@/lib/booking/format';
import type { JoinWindow, VideoRole } from './links';

/** "Tue, Nov 4 · 10:00 AM PST" in the given zone. */
export function videoWhen(startMs: number, timeZone: string): string {
  return formatSlot(startMs, safeTimeZone(timeZone));
}

/** What the call page says when the room is not open. Null when it is. */
export function closedMessage(w: JoinWindow, timeZone: string, role: VideoRole = 'guest'): { title: string; body: string } | null {
  const tz = safeTimeZone(timeZone);
  if (role === 'host' && w.state === 'ended') return { title: 'This video call has ended', body: 'The room closes two hours after the booked end time.' };
  if (role === 'host' && w.state === 'cancelled') return { title: 'This meeting is not active', body: 'It was cancelled or already closed out, so its video room is off.' };
  switch (w.state) {
    case 'open':
      return null;
    case 'too_early':
      return {
        title: role === 'host' ? 'The room isn’t open yet' : 'Your video call isn’t open yet',
        body: `You can join from ${formatTime(w.opensAtMs, tz)} ${zoneAbbreviation(w.opensAtMs, tz)}${w.opensAtMs - Date.now() > 20 * 3_600_000 ? ` on ${formatSlot(w.opensAtMs, tz).split(' · ')[0]}` : ''}. Come back to this same link then.`,
      };
    case 'ended':
      return { title: 'This video call has ended', body: 'Need to talk again? Reply to your confirmation email and we’ll set up a new time.' };
    case 'cancelled':
      return { title: 'This meeting was cancelled', body: 'Want a new time? Reply to your confirmation email.' };
  }
}
