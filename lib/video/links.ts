/**
 * HomeQuote video rooms (LiveKit): links, room names and the join window.
 * Pure (no env, no database) so it can be unit tested; callers pass the
 * signing secret (lib/booking/notify.server bookingLinkSecret).
 *
 * The guest link is SIGNED, not stored: `/meet/<k><32 hex id><22 char sig>`,
 * where k is 'a' (homeowner appointment) or 's' (sales appointment) and the sig
 * is HMAC-SHA256(secret, "video-room:v1:<kind>:<id>") cut to 132 bits. Every
 * existing video meeting therefore has a link without a migration or a
 * back-fill, and a cancelled meeting's link stops working because the page
 * re-checks the booking. Rotating the secret retires every guest link (and the
 * booking manage links, which share it).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type VideoMeetingKind = 'appointment' | 'sales_appointment';
export type VideoRole = 'host' | 'guest';

const KIND_CHAR: Record<VideoMeetingKind, string> = { appointment: 'a', sales_appointment: 's' };
const CHAR_KIND: Record<string, VideoMeetingKind> = { a: 'appointment', s: 'sales_appointment' };
/** The host page's URL segment per kind (/app/meet/<segment>/<id>). */
const KIND_SEGMENT: Record<VideoMeetingKind, string> = { appointment: 'appt', sales_appointment: 'sales' };
const SEGMENT_KIND: Record<string, VideoMeetingKind> = { appt: 'appointment', sales: 'sales_appointment' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^([as])([0-9a-f]{32})([A-Za-z0-9_-]{22})$/;
const SIG_CHARS = 22;

function signature(kind: VideoMeetingKind, id: string, secret: string): string {
  return createHmac('sha256', secret).update(`video-room:v1:${kind}:${id.toLowerCase()}`).digest('base64url').slice(0, SIG_CHARS);
}

/** The guest token for one meeting, or null without a secret / with a malformed id. */
export function videoGuestToken(kind: VideoMeetingKind, id: string, secret: string | null): string | null {
  if (!secret || !UUID_RE.test(id)) return null;
  return `${KIND_CHAR[kind]}${id.replace(/-/g, '').toLowerCase()}${signature(kind, id, secret)}`;
}

/** The meeting a guest token belongs to, or null when it is malformed or the signature does not match. */
export function parseVideoGuestToken(token: unknown, secret: string | null): { kind: VideoMeetingKind; id: string } | null {
  if (!secret || typeof token !== 'string') return null;
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const kind = CHAR_KIND[m[1]];
  const h = m[2];
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  const want = Buffer.from(signature(kind, id, secret));
  const got = Buffer.from(m[3]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { kind, id };
}

/** Public guest page. */
export const videoGuestPath = (token: string) => `/meet/${token}`;

/** Signed-in host page (inside /app, so the session guards it). */
export const videoHostPath = (kind: VideoMeetingKind, id: string) => `/app/meet/${KIND_SEGMENT[kind]}/${id}`;

/** The kind behind a host page's URL segment ('sales' / 'appt'). */
export function kindFromSegment(segment: string): VideoMeetingKind | null {
  return SEGMENT_KIND[segment] ?? null;
}

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** LiveKit room name: one room per meeting, stable across reschedules. */
export const videoRoomName = (kind: VideoMeetingKind, id: string) => `hq-${KIND_SEGMENT[kind]}-${id.toLowerCase()}`;

/**
 * The https meeting link the booker supplied themselves (Zoom, Meet...), else
 * null. Finds it anywhere in the text: a setter may type "Zoom: https://…", and
 * a booking-page sales meeting stores "phone · email · <calendar link>".
 */
export function ownMeetingLink(v: string | null | undefined): string | null {
  const m = /https:\/\/[^\s<>"'·]+/i.exec(v ?? '');
  if (!m) return null;
  const link = m[0].replace(/[.,;:!?)\]]+$/, '');
  if (link.length > 500) return null;
  try {
    const u = new URL(link);
    return u.protocol === 'https:' && u.hostname.includes('.') ? link : null;
  } catch {
    return null;
  }
}

/**
 * Does this meeting run in a HomeQuote video room? Only video meetings, only
 * when LiveKit is configured, and never when the booker gave their own link
 * (so existing Zoom / Meet links keep working unchanged).
 */
export function usesVideoRoom(m: { meetingType: string | null | undefined; ownLink: string | null | undefined }, enabled: boolean): boolean {
  return enabled && m.meetingType === 'video' && !ownMeetingLink(m.ownLink);
}

// --- join window ---------------------------------------------------------------------------------

/** Guests may enter this long before the start; hosts a bit earlier to set up. */
export const GUEST_EARLY_MS = 15 * 60_000;
export const HOST_EARLY_MS = 60 * 60_000;
/** Calls run over: the room stays open this long after the booked end. */
export const LATE_MS = 2 * 3_600_000;

export type JoinWindow =
  | { state: 'open' }
  | { state: 'too_early'; opensAtMs: number }
  | { state: 'ended' }
  | { state: 'cancelled' };

export function joinWindow(m: { live: boolean; startMs: number; endMs: number }, role: VideoRole, nowMs: number): JoinWindow {
  if (!m.live) return { state: 'cancelled' };
  const opensAtMs = m.startMs - (role === 'host' ? HOST_EARLY_MS : GUEST_EARLY_MS);
  if (nowMs < opensAtMs) return { state: 'too_early', opensAtMs };
  const end = Math.max(m.endMs, m.startMs);
  if (nowMs > end + LATE_MS) return { state: 'ended' };
  return { state: 'open' };
}

/** A display name a guest typed: trimmed, single-spaced, 1–60 chars, else the fallback. */
export function cleanDisplayName(v: unknown, fallback: string): string {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  return s || fallback;
}
