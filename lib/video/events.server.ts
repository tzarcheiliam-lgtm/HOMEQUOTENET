import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueNotificationEvent, flushNotificationsSoon } from '@/lib/notifications/outbox';
import { parseRoomName, participantRole } from './links';

type Db = ReturnType<typeof createAdminClient>;

/**
 * The subset of a LiveKit webhook event HomeQuote reads (§52). The webhook
 * route verifies the signature first; this only records what happened.
 */
export interface VideoWebhookEvent {
  id?: string;
  event: string;
  createdAt?: number | bigint;
  room?: { sid?: string; name?: string; creationTime?: number | bigint } | null;
  participant?: { sid?: string; identity?: string; name?: string; kind?: number } | null;
}

export interface HandleDeps {
  db?: Db;
  now?: Date;
  /** Queue + send the "guest joined" alert. Injected by tests. */
  notifyGuestJoined?: (input: { kind: string; refId: string; roomSid: string; guestName: string | null }) => Promise<void>;
}

export type HandleResult =
  | { handled: false; reason: string }
  | { handled: true; event: string; callId: string; notified?: boolean };

const toDate = (secs: number | bigint | undefined, fallback: Date) => {
  const n = typeof secs === 'bigint' ? Number(secs) : secs;
  return n && Number.isFinite(n) && n > 0 ? new Date(n * 1000) : fallback;
};

async function defaultNotify(input: { kind: string; refId: string; roomSid: string; guestName: string | null }) {
  const ok = await enqueueNotificationEvent({
    type: 'video_guest_joined',
    entityType: input.kind,
    entityId: input.refId,
    dedupeKey: `video-guest-joined:${input.roomSid}`,
    payload: { roomSid: input.roomSid, guestName: input.guestName },
  });
  if (ok) flushNotificationsSoon();
}

/** Insert a participant once (keyed by sid). A host whose profile is gone is still recorded, without the link. */
async function upsertParticipant(db: Db, row: Record<string, unknown>) {
  const { error } = await db.from('video_call_participants').upsert(row, { onConflict: 'participant_sid', ignoreDuplicates: true });
  if (error && row.user_id) await db.from('video_call_participants').upsert({ ...row, user_id: null }, { onConflict: 'participant_sid', ignoreDuplicates: true });
}

/** The call row for this room session, created on first sight (events can arrive in any order). */
async function ensureCall(db: Db, roomSid: string, roomName: string, ref: { kind: string; id: string }, startedAt: Date): Promise<string | null> {
  await db
    .from('video_calls')
    .upsert({ room_sid: roomSid, room_name: roomName, kind: ref.kind, ref_id: ref.id, started_at: startedAt.toISOString() }, { onConflict: 'room_sid', ignoreDuplicates: true });
  const { data } = await db.from('video_calls').select('id').eq('room_sid', roomSid).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Record one LiveKit event: room started / finished, participant joined / left.
 * Idempotent (keyed by room and participant sids), safe to replay. A guest who
 * joins while no host is in the room triggers the "guest joined" alert, once
 * per room session.
 */
export async function handleVideoEvent(ev: VideoWebhookEvent, deps: HandleDeps = {}): Promise<HandleResult> {
  const db = deps.db ?? createAdminClient();
  const now = deps.now ?? new Date();
  const ref = parseRoomName(ev.room?.name);
  const roomSid = ev.room?.sid;
  if (!ref || !roomSid || !ev.room?.name) return { handled: false, reason: 'not a HomeQuote room' };
  if (!['room_started', 'room_finished', 'participant_joined', 'participant_left'].includes(ev.event)) {
    return { handled: false, reason: `ignored event ${ev.event}` };
  }
  const at = toDate(ev.createdAt, now);
  const callId = await ensureCall(db, roomSid, ev.room.name, ref, toDate(ev.room.creationTime, at));
  if (!callId) return { handled: false, reason: 'could not record the call' };

  if (ev.event === 'room_finished') {
    await db.from('video_calls').update({ ended_at: at.toISOString() }).eq('id', callId).is('ended_at', null);
    return { handled: true, event: ev.event, callId };
  }
  if (ev.event === 'room_started') return { handled: true, event: ev.event, callId };

  const p = ev.participant;
  // Only people joining through our passes count; recorders, transcribers and other bots (kind != standard) do not.
  const who = participantRole(p?.identity);
  if (!p?.sid || !who || (p.kind !== undefined && p.kind !== 0)) return { handled: false, reason: 'not a host or guest' };

  if (ev.event === 'participant_left') {
    const { data } = await db.from('video_call_participants').update({ left_at: at.toISOString() }).eq('participant_sid', p.sid).select('id');
    if (!data?.length) {
      await upsertParticipant(db, { call_id: callId, participant_sid: p.sid, identity: p.identity, name: p.name || null, role: who.role, user_id: who.userId, left_at: at.toISOString() });
    }
    return { handled: true, event: ev.event, callId };
  }

  // participant_joined
  await upsertParticipant(db, { call_id: callId, participant_sid: p.sid, identity: p.identity, name: p.name || null, role: who.role, user_id: who.userId, joined_at: at.toISOString() });
  const firstCol = who.role === 'host' ? 'host_first_joined_at' : 'guest_first_joined_at';
  await db.from('video_calls').update({ [firstCol]: at.toISOString() }).eq('id', callId).is(firstCol, null);

  if (who.role !== 'guest') return { handled: true, event: ev.event, callId };

  // A host already in the room sees the guest arrive: no alert needed.
  const { data: hostsIn } = await db.from('video_call_participants').select('id').eq('call_id', callId).eq('role', 'host').is('left_at', null);
  if (hostsIn?.length) return { handled: true, event: ev.event, callId, notified: false };
  // Claim the one alert for this room session.
  const { data: claimed } = await db
    .from('video_calls')
    .update({ guest_notified_at: at.toISOString() })
    .eq('id', callId)
    .is('guest_notified_at', null)
    .select('id');
  if (!claimed?.length) return { handled: true, event: ev.event, callId, notified: false };
  await (deps.notifyGuestJoined ?? defaultNotify)({ kind: ref.kind, refId: ref.id, roomSid, guestName: p.name || null });
  return { handled: true, event: ev.event, callId, notified: true };
}

// --- reading -------------------------------------------------------------------------------------

export interface CallSummary {
  /** First time a guest joined, across every session of this room. */
  guestJoinedAt: string | null;
  hostJoinedAt: string | null;
  /** Minutes the guest and a host were both in the room (rounded), 0 when they never overlapped. */
  minutesTogether: number;
}

type ParticipantRow = { call_id: string; role: 'host' | 'guest'; joined_at: string | null; left_at: string | null };

/** Overlap of host and guest presence, in minutes. Open intervals end at `nowMs`. */
export function minutesTogether(rows: Pick<ParticipantRow, 'role' | 'joined_at' | 'left_at'>[], nowMs: number): number {
  const spans = (role: 'host' | 'guest') =>
    rows
      .filter((r) => r.role === role && r.joined_at)
      .map((r) => [Date.parse(r.joined_at!), r.left_at ? Date.parse(r.left_at) : nowMs] as const)
      .filter(([a, b]) => b > a);
  const hosts = spans('host');
  const guests = spans('guest');
  // Merge guest spans so two guest tabs are not counted twice, then intersect with the hosts' union.
  const union = (xs: (readonly [number, number])[]) => {
    const s = [...xs].sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    for (const [a, b] of s) {
      const last = out[out.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else out.push([a, b]);
    }
    return out;
  };
  let ms = 0;
  for (const [ga, gb] of union(guests)) for (const [ha, hb] of union(hosts)) ms += Math.max(0, Math.min(gb, hb) - Math.max(ga, ha));
  return Math.round(ms / 60_000);
}

/** Call history for a set of meetings of one kind (for list pages). Reads through the caller's own client (RLS). */
export async function callSummaries(
  db: { from: Db['from'] },
  kind: 'appointment' | 'sales_appointment' | 'link',
  refIds: string[],
  nowMs = Date.now()
): Promise<Map<string, CallSummary>> {
  const out = new Map<string, CallSummary>();
  if (!refIds.length) return out;
  const { data: calls, error } = await db.from('video_calls').select('id, ref_id, host_first_joined_at, guest_first_joined_at').eq('kind', kind).in('ref_id', refIds);
  if (error || !calls?.length) return out;
  const rows = calls as { id: string; ref_id: string; host_first_joined_at: string | null; guest_first_joined_at: string | null }[];
  const { data: parts } = await db.from('video_call_participants').select('call_id, role, joined_at, left_at').in('call_id', rows.map((c) => c.id));
  const byCall = new Map<string, ParticipantRow[]>();
  for (const p of (parts ?? []) as ParticipantRow[]) byCall.set(p.call_id, [...(byCall.get(p.call_id) ?? []), p]);
  const earliest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);
  for (const c of rows) {
    const prev = out.get(c.ref_id) ?? { guestJoinedAt: null, hostJoinedAt: null, minutesTogether: 0 };
    out.set(c.ref_id, {
      guestJoinedAt: earliest(prev.guestJoinedAt, c.guest_first_joined_at),
      hostJoinedAt: earliest(prev.hostJoinedAt, c.host_first_joined_at),
      minutesTogether: prev.minutesTogether + minutesTogether(byCall.get(c.id) ?? [], nowMs),
    });
  }
  return out;
}
