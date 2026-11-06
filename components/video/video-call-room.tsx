'use client';

import '@livekit/components-styles';
import './video-theme.css';
import { useCallback, useRef, useState } from 'react';
import { LiveKitRoom, PreJoin, VideoConference, useRemoteParticipants, type LocalUserChoices } from '@livekit/components-react';
import { CalendarClock, MonitorSmartphone, PhoneOff, RotateCcw } from 'lucide-react';
import type { JoinResult } from '@/lib/actions/video';
import type { JoinPass } from '@/lib/video/livekit.server';
import { BrandLogo } from '@/components/brand-logo';
import { CallShell } from './call-shell';
import { RecordingConsent } from './recording-consent';

export interface VideoCallRoomProps {
  role: 'host' | 'guest';
  /** "Video call with Liam from HomeQuote" */
  title: string;
  /** "Tue, Nov 4 · 10:00 AM PST" */
  when: string;
  /** Who the waiting banner waits for ("Liam from HomeQuote", "Mike (ABC Roofing)"). */
  waitingFor: string;
  defaultName: string;
  /** Server action, already bound to the meeting: mints a short-lived LiveKit pass. */
  join: (name: string) => Promise<JoinResult>;
  /** Where "Back" goes after leaving (host: the appointments list). */
  backHref?: string;
}

type Stage =
  | { kind: 'prejoin' }
  | { kind: 'joining'; choices: LocalUserChoices }
  | { kind: 'call'; choices: LocalUserChoices; pass: JoinPass }
  | { kind: 'left'; choices: LocalUserChoices };

/** While nobody else is in the room: a quiet pill with a slow gold pulse. */
function WaitingBanner({ waitingFor }: { waitingFor: string }) {
  const others = useRemoteParticipants();
  if (others.length > 0) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4 sm:top-5">
      <p className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#12264f]/95 px-4 py-2 text-center text-sm text-white shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur">
        <span className="hq-pulse size-2 shrink-0 rounded-full bg-[#f5b700]" aria-hidden="true" />
        Waiting for {waitingFor}. You’ll be connected automatically.
      </p>
    </div>
  );
}

export function VideoCallRoom({ role, title, when, waitingFor, defaultName, join, backHref }: VideoCallRoomProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'prejoin' });
  const [error, setError] = useState<string | null>(null);
  const [deviceNote, setDeviceNote] = useState<string | null>(null);

  const busy = useRef(false);

  const enter = useCallback(
    async (choices: LocalUserChoices) => {
      if (busy.current) return;
      busy.current = true;
      setError(null);
      setStage({ kind: 'joining', choices });
      try {
        const r = await join(choices.username);
        if (!r.ok) {
          setError(r.error);
          setStage({ kind: 'prejoin' });
          return;
        }
        setStage({ kind: 'call', choices, pass: r.pass });
      } catch {
        setError('Could not reach HomeQuote. Check your connection and try again.');
        setStage({ kind: 'prejoin' });
      } finally {
        busy.current = false;
      }
    },
    [join]
  );

  if (stage.kind === 'call') {
    const { choices, pass } = stage;
    return (
      <div data-lk-theme="default" className="hq-call relative h-dvh w-full bg-[#0a1b3d]">
        <LiveKitRoom
          serverUrl={pass.serverUrl}
          token={pass.participantToken}
          connect
          video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
          audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
          options={{ adaptiveStream: true, dynacast: true }}
          onDisconnected={() => setStage({ kind: 'left', choices })}
          onError={(e) => setError(e.message || 'The video call hit a problem.')}
          onMediaDeviceFailure={() => setDeviceNote('Your camera or microphone could not start. Check the browser permission and try again.')}
          className="h-full"
        >
          {/* Brand + meeting name, out of the way of the video. */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2.5 rounded-xl bg-[#071330]/70 px-3 py-2 backdrop-blur">
            <BrandLogo tone="reversed" variant="mark" className="size-6" />
            <span className="hidden max-w-[40ch] truncate text-sm font-medium text-white/90 sm:block">{title}</span>
          </div>
          <WaitingBanner waitingFor={waitingFor} />
          <RecordingConsent /> {/* Phase 3 §51: recording consent; renders nothing while transcripts are off */}
          {deviceNote ? (
            <div role="alert" className="absolute inset-x-0 top-28 z-10 flex justify-center px-4 sm:top-20">
              <p className="rounded-xl bg-red-600/95 px-4 py-2 text-sm text-white">{deviceNote}</p>
            </div>
          ) : null}
          <VideoConference />
        </LiveKitRoom>
      </div>
    );
  }

  if (stage.kind === 'left') {
    return (
      <div data-lk-theme="default" className="hq-call">
        <CallShell className="justify-center text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10">
            <PhoneOff className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">You left the call</h1>
          <p className="mt-2 text-sm text-white/60">{title}</p>
          {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => enter(stage.choices)}
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0038b8] px-6 font-semibold transition-colors hover:bg-[#1d52c9]"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Rejoin
            </button>
            {backHref ? (
              <a href={backHref} className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
                Back to HomeQuote
              </a>
            ) : null}
          </div>
        </CallShell>
      </div>
    );
  }

  return (
    <div data-lk-theme="default" className="hq-call">
      <CallShell>
        <div className="text-center">
          <h1 className="font-display text-balance text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/65">
            <CalendarClock className="size-4" aria-hidden="true" />
            {when}
          </p>
        </div>

        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#12264f]/80 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] sm:p-5">
          <PreJoin
            defaults={{ username: defaultName, videoEnabled: true, audioEnabled: true }}
            onSubmit={enter}
            onValidate={(v) => v.username.trim().length > 0}
            onError={() => setDeviceNote('We could not open your camera or microphone. Allow access in your browser, or join without them.')}
            joinLabel={stage.kind === 'joining' ? 'Joining…' : role === 'host' ? 'Start call' : 'Join call'}
            userLabel="Your name"
            micLabel="Microphone"
            camLabel="Camera"
            persistUserChoices={false}
          />
        </div>
        {deviceNote ? <p className="mt-3 text-center text-sm text-amber-200">{deviceNote}</p> : null}
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-white/50">
          <MonitorSmartphone className="size-3.5" aria-hidden="true" />
          No app needed. On a phone, allow camera and microphone when asked.
        </p>
      </CallShell>
    </div>
  );
}
