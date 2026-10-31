'use client';

import '@livekit/components-styles';
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { LiveKitRoom, PreJoin, VideoConference, useRemoteParticipants, type LocalUserChoices } from '@livekit/components-react';
import type { JoinResult } from '@/lib/actions/video';
import type { JoinPass } from '@/lib/video/livekit.server';

export interface VideoCallRoomProps {
  role: 'host' | 'guest';
  /** "Video call with HomeQuote Network" */
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

// HomeQuote blue on LiveKit's dark theme.
const THEME = { '--lk-accent-bg': '#0038B8', '--lk-accent2': '#1a4fc4', '--lk-accent3': '#3364cc', '--lk-accent4': '#4d79d4' } as CSSProperties;

function WaitingBanner({ waitingFor }: { waitingFor: string }) {
  const others = useRemoteParticipants();
  if (others.length > 0) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
      <p className="rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white shadow-lg">
        Waiting for {waitingFor} to join. You&apos;ll be connected automatically.
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
      <div data-lk-theme="default" style={THEME} className="relative h-dvh w-full">
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
          <WaitingBanner waitingFor={waitingFor} />
          {deviceNote ? (
            <div role="alert" className="absolute inset-x-0 top-16 z-10 flex justify-center px-4">
              <p className="rounded-md bg-red-600/90 px-3 py-2 text-sm text-white">{deviceNote}</p>
            </div>
          ) : null}
          <VideoConference />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <main data-lk-theme="default" style={THEME} className="flex min-h-dvh flex-col items-center bg-[#111] px-4 py-8 text-white">
      <div className="w-full max-w-[480px] space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">HomeQuote Network</p>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-white/70">{when}</p>
      </div>
      {error ? (
        <p role="alert" className="mt-4 w-full max-w-[480px] rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {stage.kind === 'left' ? (
        <div className="mt-8 w-full max-w-[480px] space-y-4 text-center">
          <p className="text-base">You left the call.</p>
          <div className="flex justify-center gap-3">
            <button type="button" className="lk-button lk-join-button" style={{ background: '#0038B8' }} onClick={() => enter(stage.choices)}>
              Rejoin
            </button>
            {backHref ? (
              <a href={backHref} className="lk-button">
                Back to HomeQuote
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 w-full">
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
          {deviceNote ? <p className="mx-auto mt-2 max-w-[480px] text-center text-sm text-amber-200">{deviceNote}</p> : null}
          <p className="mx-auto mt-4 max-w-[480px] text-center text-xs text-white/50">
            Works in your browser, no app needed. On a phone, allow camera and microphone when asked.
          </p>
        </div>
      )}
    </main>
  );
}
