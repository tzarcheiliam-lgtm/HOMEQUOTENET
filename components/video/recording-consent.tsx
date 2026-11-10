'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIsRecording, useLocalParticipant, useParticipants, useRoomInfo } from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';
import {
  recordingAvailability,
  requestRecording,
  stopRecording,
  syncRecording,
  type RecordingAvailability,
} from '@/lib/actions/video-recording';
import { CONSENT_COPY, MIN_PARTICIPANTS, REC_ATTR, missingConsent, namesList, parseRoomRec, type RoomRec } from '@/lib/video/transcripts/consent';

/**
 * All-party recording consent for HomeQuote video calls (§51). Self-contained: mount it anywhere
 * inside <LiveKitRoom>; it needs no props. Renders nothing unless call transcripts are switched on
 * (the server says so), so it is safe to mount everywhere.
 *
 * - The host sees "Record & summarize". Asking counts as the host's own consent.
 * - Everyone else gets a clear question. Capture starts only after EVERY person in the room agreed
 *   (the server checks LiveKit's participant list; this component cannot start anything).
 * - While capture is on, everyone sees a banner with Stop. Anyone can stop it at any time.
 * - Someone who joins mid-recording pauses it (the server pauses before they connect); their
 *   microphone stays off until they answer.
 */

const NAVY = '#0A1B3D';
const BLUE = '#0038B8';
const GOLD = '#F5B700';
const MIST = '#F4F7FC';
const SLATE = '#5B6B8C';
const RED = '#C2362B';
/** DM Sans body text (LiveKit's theme sets its own font on the call container). Headings use .font-display (Sora). */
const BODY_FONT = { fontFamily: 'var(--font-dm-sans), "DM Sans", Arial, sans-serif' } as const;

export function RecordingConsent() {
  const { name: roomName, metadata } = useRoomInfo();
  const [avail, setAvail] = useState<RecordingAvailability | null>(null);

  useEffect(() => {
    if (!roomName) return;
    let live = true;
    recordingAvailability(roomName).then(
      (a) => live && setAvail(a),
      () => live && setAvail({ enabled: false }),
    );
    return () => {
      live = false;
    };
  }, [roomName]);

  if (!roomName || !avail?.enabled) return null;
  return <ConsentControls roomName={roomName} rec={parseRoomRec(metadata)} canRequest={avail.canRequest} />;
}

function ConsentControls({ roomName, rec, canRequest }: { roomName: string; rec: RoomRec | null; canRequest: boolean }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const capturing = useIsRecording();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const people = participants.filter((p) => p.kind !== ParticipantKind.EGRESS);
  const me = people.find((p) => p.isLocal) ?? localParticipant;
  const agreed = !!rec && me.attributes?.[REC_ATTR] === rec.id;
  const missing = rec ? missingConsent(people.map((p) => ({ identity: p.identity, name: p.name || 'a guest', consent: p.attributes?.[REC_ATTR] })), rec.id) : [];
  const needsAnswer = !!rec && !agreed;
  // Stable keys for effects: the rec object is re-created on every render (speaking changes re-render).
  const recId = rec?.id ?? null;
  const recState = rec?.state ?? null;
  const signature = people.map((p) => `${p.identity}:${p.attributes?.[REC_ATTR] ?? ''}`).sort().join('|');

  // When the room changes (someone agreed, joined or left), let the server re-check. Only people who
  // have agreed (and the host) ask, so the server is not asked once per viewer for every change.
  useEffect(() => {
    if (!recId || !(agreed || canRequest)) return;
    const t = setTimeout(() => void syncRecording(roomName).catch(() => undefined), 700);
    return () => clearTimeout(t);
  }, [recId, recState, agreed, canRequest, roomName, signature]);

  // The host's browser keeps a slow heartbeat while recording: it lets the server split a long call
  // into files the speech-to-text service accepts, and re-checks consent as a backstop.
  useEffect(() => {
    if (!canRequest || recState !== 'recording') return;
    const t = setInterval(() => void syncRecording(roomName).catch(() => undefined), 4 * 60_000);
    return () => clearInterval(t);
  }, [canRequest, recState, roomName]);

  // Microphone hold: capture is on and I have not answered -> my mic stays off until I do (re-applied
  // if they unmute from the control bar before answering).
  const held = useRef(false);
  const [micHeld, setMicHeld] = useState(false);
  const releaseMic = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setMicHeld(false);
    void localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
  }, [localParticipant]);
  useEffect(() => {
    if (needsAnswer && (capturing || recState === 'recording') && isMicrophoneEnabled) {
      held.current = true;
      setMicHeld(true);
      void localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
    }
    if (!recId) releaseMic();
  }, [needsAnswer, capturing, recState, recId, isMicrophoneEnabled, localParticipant, releaseMic]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 7_000);
    return () => clearTimeout(t);
  }, [note]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      setNote('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const ask = () =>
    run(async () => {
      const r = await requestRecording(roomName);
      if (!r.ok || !r.id) return setNote(r.ok ? 'Could not ask. Try again.' : r.error);
      await localParticipant.setAttributes({ [REC_ATTR]: r.id }); // asking = the host's own consent
      await syncRecording(roomName);
    });

  const agree = () =>
    run(async () => {
      if (!rec) return;
      await localParticipant.setAttributes({ [REC_ATTR]: rec.id });
      releaseMic();
      await syncRecording(roomName);
    });

  const stop = (reason: 'stopped' | 'declined') =>
    run(async () => {
      const r = await stopRecording(roomName, localParticipant.identity, reason);
      if (!r.ok) return setNote(r.error);
      releaseMic();
      setNote(reason === 'declined' ? 'This call will not be recorded.' : canRequest ? 'Recording stopped. The notes will be in HomeQuote in a few minutes.' : 'Recording stopped.');
    });

  const onAir = capturing || rec?.state === 'recording';
  const status = !rec
    ? capturing ? CONSENT_COPY.recording : null
    : rec.state === 'recording' ? CONSENT_COPY.recording
    : rec.state === 'paused' ? CONSENT_COPY.paused(namesList(missing))
    : people.length < MIN_PARTICIPANTS ? CONSENT_COPY.waitingJoin
    : missing.length ? `${CONSENT_COPY.waitingOthers} (${namesList(missing)})`
    : 'Starting the recording…';

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2" style={BODY_FONT}>
        {status ? (
          <div role="status" aria-live="polite" className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm" style={{ background: MIST, color: NAVY, borderColor: '#D9E1EE' }}>
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${onAir ? 'motion-safe:animate-pulse' : ''}`} style={{ background: onAir ? RED : SLATE }} />
            <span className="min-w-0 truncate">{status}</span>
            {rec ? (
              <button type="button" onClick={() => stop('stopped')} disabled={busy} className="ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white disabled:opacity-60" style={{ background: NAVY }}>
                {CONSENT_COPY.stop}
              </button>
            ) : null}
          </div>
        ) : canRequest ? (
          <button
            type="button"
            onClick={ask}
            disabled={busy}
            title="Asks everyone in the call to agree first. You agree by asking."
            className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            style={{ background: MIST, color: NAVY, borderColor: '#D9E1EE' }}
          >
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: GOLD }} />
            {busy ? 'Asking…' : CONSENT_COPY.requestButton}
          </button>
        ) : null}
        {note ? (
          <p role="status" className="pointer-events-auto rounded-md px-3 py-1.5 text-xs" style={{ background: NAVY, color: MIST }}>
            {note}
          </p>
        ) : null}
      </div>
      {needsAnswer && rec ? <ConsentDialog rec={rec} busy={busy} micHeld={micHeld} onAgree={agree} onDecline={() => stop('declined')} /> : null}
    </>
  );
}

function ConsentDialog({ rec, busy, micHeld, onAgree, onDecline }: { rec: RoomRec; busy: boolean; micHeld: boolean; onAgree: () => void; onDecline: () => void }) {
  const titleId = useId();
  const bodyId = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center p-4 sm:items-center" style={{ ...BODY_FONT, background: 'rgba(10, 27, 61, 0.55)' }}>
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border p-5 outline-none"
        style={{ background: MIST, color: NAVY, borderColor: '#D9E1EE' }}
      >
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {CONSENT_COPY.title}
        </h2>
        <div id={bodyId} className="mt-2 space-y-2 text-sm leading-6">
          <p>{CONSENT_COPY.body(rec.by)}</p>
          <p style={{ color: SLATE }}>{CONSENT_COPY.detail}</p>
          {micHeld ? <p className="font-medium">{CONSENT_COPY.micHeld}</p> : null}
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDecline} disabled={busy} className="min-h-11 rounded-lg border px-4 text-sm font-medium disabled:opacity-60" style={{ borderColor: SLATE, color: NAVY, background: 'transparent' }}>
            {CONSENT_COPY.decline}
          </button>
          <button type="button" onClick={onAgree} disabled={busy} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BLUE }}>
            {CONSENT_COPY.agree}
          </button>
        </div>
      </div>
    </div>
  );
}
