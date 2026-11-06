/**
 * Recording consent for HomeQuote video calls (Phase 3, §51). Pure: no env,
 * no database, no LiveKit client, so the rules are unit tested and the browser
 * component and the server share them.
 *
 * California is an all-party-consent state (Penal Code §632), so the rule is:
 *   capture runs ONLY while every person in the room has agreed to THIS
 *   recording session, and at least two people are in it.
 *
 * Where each piece of state lives:
 * - Each participant's consent is a LiveKit participant attribute that only
 *   their own browser can set (`REC_ATTR` = the session id they agreed to).
 *   The server re-reads the room from LiveKit before it starts capture, so a
 *   host can never agree on a guest's behalf.
 * - The session (asking / recording / paused / off) is broadcast to everyone as
 *   room metadata (`hqRec`), written only by the server.
 * - The database row (video_recordings.state) is the durable record, with the
 *   longer lifecycle below.
 */

/** Participant attribute: the recording session id this person agreed to ('' = no). */
export const REC_ATTR = 'hq.rec_consent';
/** Key inside the LiveKit room metadata JSON. Other keys in that JSON are preserved. */
export const ROOM_META_KEY = 'hqRec';
/** Bump when the wording changes; stored with every consent. */
export const CONSENT_VERSION = 'v1-2026-11';
/** People needed in the room before capture starts (a recording of one person talking to nobody is useless). */
export const MIN_PARTICIPANTS = 2;

/** The wording shown in the call. Change it here (and bump CONSENT_VERSION). */
export const CONSENT_COPY = {
  requestButton: 'Record & summarize',
  title: 'Record this call?',
  body: (requester: string) =>
    `${requester} would like to record and transcribe this call so HomeQuote can write up notes. Recording starts only after everyone here agrees, and anyone can stop it at any time.`,
  detail: 'The audio is deleted after it is transcribed. The transcript and a short AI summary are kept in HomeQuote.',
  agree: 'I agree',
  decline: "Don't record",
  recording: 'Recording and transcribing',
  paused: (missing: string) => `Recording paused until ${missing} agrees`,
  waitingOthers: 'Waiting for everyone to agree',
  waitingJoin: 'Starts when the other person joins and agrees',
  stop: 'Stop recording',
  micHeld: 'Your microphone is off until you answer.',
} as const;

// --- database lifecycle --------------------------------------------------------------------------

export type RecordingState =
  | 'asking'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'cancelled'
  | 'processing'
  | 'done'
  | 'failed';

/** States in which the session is still "in the call" (one per room, unique index in 0077). */
export const LIVE_STATES: readonly RecordingState[] = ['asking', 'starting', 'recording', 'paused'];
export const isLive = (s: RecordingState) => LIVE_STATES.includes(s);

export type RecordingEvent =
  /** The server won the race to start a segment. */
  | 'start_claimed'
  /** LiveKit accepted the egress request. */
  | 'egress_started'
  /** LiveKit refused the egress request. */
  | 'egress_failed'
  /** Someone joined / is missing consent: stop capture, keep the session. */
  | 'pause'
  /** Someone pressed Stop or declined, or the room ended. */
  | 'stop'
  | 'process'
  | 'processed'
  | 'process_failed';

/**
 * The next state, or null when the event does not apply (the caller then does
 * nothing). `captured` = at least one audio segment exists, so a stop leads to
 * processing instead of 'cancelled'.
 */
export function nextRecordingState(state: RecordingState, event: RecordingEvent, captured = false): RecordingState | null {
  switch (event) {
    case 'start_claimed':
      return state === 'asking' || state === 'paused' ? 'starting' : null;
    case 'egress_started':
      return state === 'starting' ? 'recording' : null;
    case 'egress_failed':
      return state === 'starting' ? 'paused' : null;
    case 'pause':
      return state === 'recording' || state === 'starting' ? 'paused' : null;
    case 'stop':
      return isLive(state) ? (captured ? 'stopped' : 'cancelled') : null;
    case 'process':
      return state === 'stopped' || state === 'failed' ? 'processing' : null;
    case 'processed':
      return state === 'processing' ? 'done' : null;
    case 'process_failed':
      return state === 'processing' ? 'failed' : null;
  }
}

// --- what the room sees --------------------------------------------------------------------------

export type RoomRecState = 'asking' | 'recording' | 'paused' | 'off';
export interface RoomRec {
  id: string;
  state: RoomRecState;
  /** Who asked ("Liam"), for the dialog. */
  by: string;
}

/** The room-metadata view of a database state. 'starting' still reads as asking: capture is not on yet. */
export function roomStateFor(state: RecordingState): RoomRecState {
  if (state === 'asking' || state === 'starting') return 'asking';
  if (state === 'recording') return 'recording';
  if (state === 'paused') return 'paused';
  return 'off';
}

const ROOM_STATES: readonly RoomRecState[] = ['asking', 'recording', 'paused', 'off'];

function parseJsonObject(metadata: string | null | undefined): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const v = JSON.parse(metadata);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The recording session in a room's metadata, or null (none, off, or malformed). */
export function parseRoomRec(metadata: string | null | undefined): RoomRec | null {
  const v = parseJsonObject(metadata)[ROOM_META_KEY] as Partial<RoomRec> | undefined;
  if (!v || typeof v.id !== 'string' || !v.id || !ROOM_STATES.includes(v.state as RoomRecState)) return null;
  if (v.state === 'off') return null;
  return { id: v.id.slice(0, 64), state: v.state as RoomRecState, by: typeof v.by === 'string' ? v.by.slice(0, 60) : 'HomeQuote' };
}

/** New room metadata with our key set (or removed), keeping every other key as it was. */
export function withRoomRec(metadata: string | null | undefined, rec: RoomRec | null): string {
  const obj = parseJsonObject(metadata);
  if (rec && rec.state !== 'off') obj[ROOM_META_KEY] = { id: rec.id, state: rec.state, by: rec.by };
  else delete obj[ROOM_META_KEY];
  return JSON.stringify(obj);
}

// --- the capture decision ------------------------------------------------------------------------

export interface CallParticipant {
  identity: string;
  name: string;
  /** The REC_ATTR value: the session id they agreed to, or '' / null. */
  consent: string | null | undefined;
  /** LiveKit's own recorder (egress) participant: never asked, never counted. */
  isRecorder?: boolean;
}

export const hasConsented = (p: CallParticipant, recordingId: string) => !!recordingId && p.consent === recordingId;

/** Display names of the people in the room who have not agreed yet. */
export function missingConsent(participants: CallParticipant[], recordingId: string): string[] {
  return participants.filter((p) => !p.isRecorder && !hasConsented(p, recordingId)).map((p) => p.name || 'a guest');
}

export type CaptureDecision =
  | { action: 'start' }
  | { action: 'stop'; reason: 'missing_consent' | 'empty_room'; missing: string[] }
  | { action: 'none'; missing: string[]; waitingForJoin: boolean };

/**
 * What the server should do now, given the session state and the room as
 * LiveKit reports it. Capture starts only when everyone (at least two people)
 * agreed to THIS session, and stops the moment anyone in the room has not.
 */
export function captureDecision(input: { state: RecordingState; recordingId: string; participants: CallParticipant[] }): CaptureDecision {
  const people = input.participants.filter((p) => !p.isRecorder);
  const missing = missingConsent(people, input.recordingId);
  if (input.state === 'recording' || input.state === 'starting') {
    if (people.length === 0) return { action: 'stop', reason: 'empty_room', missing };
    if (missing.length > 0) return { action: 'stop', reason: 'missing_consent', missing };
    return { action: 'none', missing, waitingForJoin: false };
  }
  if (input.state === 'asking' || input.state === 'paused') {
    if (missing.length === 0 && people.length >= MIN_PARTICIPANTS) return { action: 'start' };
    return { action: 'none', missing, waitingForJoin: people.length < MIN_PARTICIPANTS };
  }
  return { action: 'none', missing, waitingForJoin: false };
}

/** "Mike", "Mike and Ann", "Mike, Ann and 2 others". */
export function namesList(names: string[]): string {
  const n = [...new Set(names.filter(Boolean))];
  if (n.length === 0) return 'everyone';
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n[0]}, ${n[1]} and ${n.length - 2} other${n.length - 2 === 1 ? '' : 's'}`;
}

// --- room names ----------------------------------------------------------------------------------

const ROOM_RE = /^hq-(appt|sales|link)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const SEGMENT_KIND = { appt: 'appointment', sales: 'sales_appointment', link: 'link' } as const;

/** The meeting behind a room name (`hq-sales-<id>` ...), or null for anything else. Inverse of videoRoomName. */
export function meetingFromRoomName(roomName: unknown): { kind: 'appointment' | 'sales_appointment' | 'link'; id: string } | null {
  if (typeof roomName !== 'string') return null;
  const m = ROOM_RE.exec(roomName);
  return m ? { kind: SEGMENT_KIND[m[1] as keyof typeof SEGMENT_KIND], id: m[2] } : null;
}

/** Storage key of one audio segment. */
export const segmentPath = (recordingId: string, seq: number) => `calls/${recordingId}/${String(seq).padStart(2, '0')}.ogg`;

/** Rotate the audio file before this age so one file stays under the speech-to-text 60-minute limit. */
export const SEGMENT_ROTATE_MS = 50 * 60_000;
export function shouldRotate(segmentStartedAtMs: number, nowMs: number): boolean {
  return nowMs - segmentStartedAtMs >= SEGMENT_ROTATE_MS;
}
