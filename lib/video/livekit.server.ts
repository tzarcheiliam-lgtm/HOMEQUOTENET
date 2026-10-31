import 'server-only';
import { randomBytes } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';
import type { VideoRole } from './links';

/**
 * LiveKit Cloud (https://livekit.com) carries the audio/video for HomeQuote
 * video rooms. Set in Vercel:
 *   LIVEKIT_URL         wss://<project>.livekit.cloud
 *   LIVEKIT_API_KEY     the project's API key
 *   LIVEKIT_API_SECRET  the project's API secret (server-only, never shipped to the browser)
 * Without all three, video rooms are off everywhere and video meetings fall
 * back to the booker's own link (or "we'll send you the link").
 */
interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function livekitConfig(): LiveKitConfig | null {
  const url = env('LIVEKIT_URL');
  const apiKey = env('LIVEKIT_API_KEY');
  const apiSecret = env('LIVEKIT_API_SECRET');
  if (!url || !apiKey || !apiSecret || !/^wss?:\/\//i.test(url)) return null;
  return { url, apiKey, apiSecret };
}

export function videoRoomsEnabled(): boolean {
  return livekitConfig() !== null;
}

export interface JoinPass {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  participantName: string;
}

/**
 * A short-lived pass into one room. It only has to be valid when the browser
 * connects (LiveKit refreshes it for the rest of the call), so it lasts 10
 * minutes. LiveKit Cloud creates the room on the first join, so there is no
 * separate "create room" call. Everyone can talk, share video and screen, and
 * chat; the role rides along as a participant attribute for the UI.
 */
export async function mintJoinPass(input: {
  roomName: string;
  role: VideoRole;
  /** Stable for a host (their profile id); guests get a random suffix per join. */
  identity?: string;
  name: string;
}): Promise<JoinPass | null> {
  const cfg = livekitConfig();
  if (!cfg) return null;
  const identity = input.identity ?? `${input.role}-${randomBytes(6).toString('hex')}`;
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity,
    name: input.name,
    ttl: '10m',
    attributes: { role: input.role },
  });
  at.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return { serverUrl: cfg.url, participantToken: await at.toJwt(), roomName: input.roomName, participantName: input.name };
}
