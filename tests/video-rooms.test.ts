import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GUEST_EARLY_MS,
  HOST_EARLY_MS,
  LATE_MS,
  cleanDisplayName,
  joinWindow,
  kindFromSegment,
  ownMeetingLink,
  parseVideoGuestToken,
  usesVideoRoom,
  videoGuestPath,
  videoGuestToken,
  videoHostPath,
  videoRoomName,
} from '@/lib/video/links';
import { closedMessage } from '@/lib/video/copy';

vi.mock('server-only', () => ({}));

/**
 * HomeQuote video rooms (LiveKit), Phase 1: signed guest links, which meetings
 * get a room, the join window, and the LiveKit join pass.
 */

const SECRET = 'test-secret-for-video-links';

describe('guest links', () => {
  it('round-trips both kinds and stays URL-safe', () => {
    for (const kind of ['appointment', 'sales_appointment'] as const) {
      const id = randomUUID();
      const token = videoGuestToken(kind, id, SECRET)!;
      expect(token).toMatch(/^[as][0-9a-f]{32}[A-Za-z0-9_-]{22}$/);
      expect(encodeURIComponent(token)).toBe(token);
      expect(parseVideoGuestToken(token, SECRET)).toEqual({ kind, id });
      expect(videoGuestPath(token)).toBe(`/meet/${token}`);
    }
  });

  it('is stable per meeting (every email and reminder carries the same link)', () => {
    const id = randomUUID();
    expect(videoGuestToken('sales_appointment', id, SECRET)).toBe(videoGuestToken('sales_appointment', id.toUpperCase(), SECRET));
  });

  it('rejects forged, edited, cross-kind and wrong-secret links', () => {
    const id = randomUUID();
    const token = videoGuestToken('sales_appointment', id, SECRET)!;
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(parseVideoGuestToken(flipped, SECRET)).toBeNull();
    // Same id and signature, other kind: the signature covers the kind.
    expect(parseVideoGuestToken(`a${token.slice(1)}`, SECRET)).toBeNull();
    // Another meeting's id under this meeting's signature.
    const other = randomUUID().replace(/-/g, '');
    expect(parseVideoGuestToken(`s${other}${token.slice(33)}`, SECRET)).toBeNull();
    expect(parseVideoGuestToken(token, 'another-secret')).toBeNull();
    expect(parseVideoGuestToken(token, null)).toBeNull();
    expect(parseVideoGuestToken(`${token}x`, SECRET)).toBeNull();
    expect(parseVideoGuestToken('../../etc/passwd', SECRET)).toBeNull();
    expect(parseVideoGuestToken(undefined, SECRET)).toBeNull();
  });

  it('needs a secret and a real id', () => {
    expect(videoGuestToken('appointment', randomUUID(), null)).toBeNull();
    expect(videoGuestToken('appointment', 'not-a-uuid', SECRET)).toBeNull();
  });

  it('names one room and one host page per meeting', () => {
    const id = randomUUID();
    expect(videoRoomName('sales_appointment', id)).toBe(`hq-sales-${id}`);
    expect(videoRoomName('appointment', id)).toBe(`hq-appt-${id}`);
    expect(videoHostPath('sales_appointment', id)).toBe(`/app/meet/sales/${id}`);
    expect(kindFromSegment('sales')).toBe('sales_appointment');
    expect(kindFromSegment('appt')).toBe('appointment');
    expect(kindFromSegment('other')).toBeNull();
  });
});

describe('which meetings get a HomeQuote room', () => {
  it('finds a booker’s own https link anywhere in the text', () => {
    expect(ownMeetingLink('https://zoom.us/j/123')).toBe('https://zoom.us/j/123');
    expect(ownMeetingLink('Zoom: https://zoom.us/j/123.')).toBe('https://zoom.us/j/123');
    // book_sales_appointment writes "phone · email · link".
    expect(ownMeetingLink('+13105550100 · mike@abc.com · https://meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
    expect(ownMeetingLink('mike@abc.com')).toBeNull();
    expect(ownMeetingLink('(310) 555-0100')).toBeNull();
    expect(ownMeetingLink('http://insecure.example.com')).toBeNull();
    expect(ownMeetingLink(null)).toBeNull();
  });

  it('only video meetings without their own link, and only when LiveKit is set up', () => {
    expect(usesVideoRoom({ meetingType: 'video', ownLink: 'mike@abc.com' }, true)).toBe(true);
    expect(usesVideoRoom({ meetingType: 'video', ownLink: null }, true)).toBe(true);
    expect(usesVideoRoom({ meetingType: 'video', ownLink: 'https://zoom.us/j/1' }, true)).toBe(false);
    expect(usesVideoRoom({ meetingType: 'phone', ownLink: null }, true)).toBe(false);
    expect(usesVideoRoom({ meetingType: 'in_person', ownLink: null }, true)).toBe(false);
    expect(usesVideoRoom({ meetingType: 'video', ownLink: null }, false)).toBe(false);
  });
});

describe('join window', () => {
  const start = Date.UTC(2026, 10, 4, 18, 0);
  const meeting = { live: true, startMs: start, endMs: start + 30 * 60_000 };

  it('opens 15 minutes early for guests and an hour early for hosts', () => {
    expect(joinWindow(meeting, 'guest', start - GUEST_EARLY_MS - 1)).toEqual({ state: 'too_early', opensAtMs: start - GUEST_EARLY_MS });
    expect(joinWindow(meeting, 'guest', start - GUEST_EARLY_MS)).toEqual({ state: 'open' });
    expect(joinWindow(meeting, 'host', start - HOST_EARLY_MS)).toEqual({ state: 'open' });
    expect(joinWindow(meeting, 'host', start - HOST_EARLY_MS - 1).state).toBe('too_early');
  });

  it('stays open two hours past the booked end, then closes', () => {
    expect(joinWindow(meeting, 'guest', meeting.endMs + LATE_MS)).toEqual({ state: 'open' });
    expect(joinWindow(meeting, 'guest', meeting.endMs + LATE_MS + 1)).toEqual({ state: 'ended' });
  });

  it('a cancelled meeting never opens', () => {
    expect(joinWindow({ ...meeting, live: false }, 'host', start)).toEqual({ state: 'cancelled' });
  });

  it('explains a closed room in the viewer’s zone', () => {
    const msg = closedMessage({ state: 'too_early', opensAtMs: start - GUEST_EARLY_MS }, 'America/Los_Angeles');
    expect(msg?.body).toContain('9:45');
    expect(closedMessage({ state: 'open' }, 'America/Los_Angeles')).toBeNull();
    expect(closedMessage({ state: 'ended' }, 'America/Los_Angeles', 'host')?.title).toMatch(/ended/);
  });
});

describe('display names', () => {
  it('trims, collapses and caps what a guest types', () => {
    expect(cleanDisplayName('  Mike   Jones ', 'Guest')).toBe('Mike Jones');
    expect(cleanDisplayName('\u0000\u0007', 'Guest')).toBe('Guest');
    expect(cleanDisplayName(42, 'Guest')).toBe('Guest');
    expect(cleanDisplayName('x'.repeat(200), 'Guest')).toHaveLength(60);
  });
});

describe('LiveKit join pass', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off until all three LiveKit settings are present', async () => {
    vi.stubEnv('LIVEKIT_URL', '');
    vi.stubEnv('LIVEKIT_API_KEY', '');
    vi.stubEnv('LIVEKIT_API_SECRET', '');
    const { mintJoinPass, videoRoomsEnabled } = await import('@/lib/video/livekit.server');
    expect(videoRoomsEnabled()).toBe(false);
    expect(await mintJoinPass({ roomName: 'hq-sales-x', role: 'guest', name: 'Mike' })).toBeNull();
  });

  it('grants one room only, for 10 minutes, with the role as an attribute', async () => {
    vi.stubEnv('LIVEKIT_URL', 'wss://example.livekit.cloud');
    vi.stubEnv('LIVEKIT_API_KEY', 'APIkey123');
    vi.stubEnv('LIVEKIT_API_SECRET', 'a-long-enough-test-secret-for-hs256-signing');
    const { mintJoinPass, videoRoomsEnabled } = await import('@/lib/video/livekit.server');
    expect(videoRoomsEnabled()).toBe(true);
    const pass = await mintJoinPass({ roomName: 'hq-sales-abc', role: 'host', identity: 'host-1', name: 'Liam' });
    expect(pass?.serverUrl).toBe('wss://example.livekit.cloud');
    const claims = JSON.parse(Buffer.from(pass!.participantToken.split('.')[1], 'base64url').toString());
    expect(claims.iss).toBe('APIkey123');
    expect(claims.sub).toBe('host-1');
    expect(claims.name).toBe('Liam');
    expect(claims.video).toMatchObject({ room: 'hq-sales-abc', roomJoin: true, canPublish: true, canSubscribe: true });
    expect(claims.video.roomAdmin).toBeUndefined();
    expect(claims.video.roomCreate).toBeUndefined();
    expect(claims.attributes).toEqual({ role: 'host' });
    expect(claims.exp - claims.nbf).toBeLessThanOrEqual(600);
  });
});
