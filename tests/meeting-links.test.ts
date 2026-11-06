/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { parseVideoGuestToken, videoGuestToken, videoHostPath, videoRoomName, kindFromSegment } from '@/lib/video/links';
import { closedMessage } from '@/lib/video/copy';
import { contactKind, inviteMessage, inviteSubject, mailtoHref, smsHref } from '@/lib/video/share';
import { fullSchema } from './helpers/full-migrations';

vi.mock('server-only', () => ({}));

/**
 * Meeting links (/app/meetings, migration 0075): ad-hoc video rooms a rep makes
 * and sends to a prospect. Signed link kind 'l', the invite text, link status,
 * and RLS on the real migration chain.
 */

const SECRET = 'meeting-link-test-secret';

describe('meeting link tokens', () => {
  it('round-trip as their own kind, and a sales-meeting signature never opens a link', () => {
    const id = randomUUID();
    const t = videoGuestToken('link', id, SECRET)!;
    expect(t.startsWith('l')).toBe(true);
    expect(parseVideoGuestToken(t, SECRET)).toEqual({ kind: 'link', id });
    expect(parseVideoGuestToken(`s${t.slice(1)}`, SECRET)).toBeNull();
    const sales = videoGuestToken('sales_appointment', id, SECRET)!;
    expect(parseVideoGuestToken(`l${sales.slice(1)}`, SECRET)).toBeNull();
    expect(videoRoomName('link', id)).toBe(`hq-link-${id}`);
    expect(videoHostPath('link', id)).toBe(`/app/meet/link/${id}`);
    expect(kindFromSegment('link')).toBe('link');
  });

  it('tells a link guest to ask the sender, not to reply to a confirmation email', () => {
    expect(closedMessage({ state: 'cancelled' }, 'America/Los_Angeles', 'guest', 'link')?.body).toMatch(/person who sent you this link/);
    expect(closedMessage({ state: 'ended' }, 'America/Los_Angeles', 'guest', 'link')?.body).toMatch(/new one/);
    expect(closedMessage({ state: 'cancelled' }, 'America/Los_Angeles', 'guest', 'sales_appointment')?.body).toMatch(/confirmation email/);
  });
});

describe('invite message', () => {
  const now = Date.UTC(2026, 10, 6, 17, 0); // Fri Nov 6, 9:00 AM PST
  it('reads naturally for "now", with the name and the link', () => {
    const m = inviteMessage({ url: 'https://homequotenet.com/meet/labc', guestName: 'Mike Jones', hostFirstName: 'Liam', startsAtMs: null, nowMs: now });
    expect(m).toBe("Hi Mike, it's Liam from HomeQuote. Here's the link for our video call: https://homequotenet.com/meet/labc\n\nNo app or download needed. Just tap the link on your phone or computer.");
  });
  it('says today / tomorrow / the date in the meeting’s zone', () => {
    const base = { url: 'u', guestName: '', hostFirstName: null, timeZone: 'America/Los_Angeles', nowMs: now };
    expect(inviteMessage({ ...base, startsAtMs: Date.UTC(2026, 10, 6, 22, 30) })).toContain('for today at 2:30 PM PST');
    expect(inviteMessage({ ...base, startsAtMs: Date.UTC(2026, 10, 7, 18, 0) })).toContain('for tomorrow at 10:00 AM PST');
    expect(inviteMessage({ ...base, startsAtMs: Date.UTC(2026, 10, 10, 18, 0) })).toContain('for Tuesday, Nov 10 at 10:00 AM PST');
    expect(inviteMessage({ ...base, startsAtMs: null })).toMatch(/^Hi, it's HomeQuote\./);
    expect(inviteSubject('Liam')).toBe('Video call with Liam from HomeQuote');
  });
  it('turns a typed phone or email into the right send button', () => {
    expect(contactKind('(310) 555-0100')).toEqual({ phone: '+13105550100', email: null });
    expect(contactKind('+44 20 7946 0958')).toEqual({ phone: '+442079460958', email: null });
    expect(contactKind('mike@abc.com')).toEqual({ phone: null, email: 'mike@abc.com' });
    expect(contactKind('call him')).toEqual({ phone: null, email: null });
    expect(smsHref('+13105550100', 'Hi & bye')).toBe('sms:+13105550100?&body=Hi%20%26%20bye');
    expect(mailtoHref('mike@abc.com', 'S', 'B')).toBe('mailto:mike@abc.com?subject=S&body=B');
  });
});

describe('link status', () => {
  it('is open from 15 minutes before the start until 2 hours after the end', async () => {
    const { linkStatus } = await import('@/lib/data/meeting-links');
    const start = Date.UTC(2026, 10, 6, 18, 0);
    const r = { cancelledAt: null, startsAt: new Date(start).toISOString(), endsAt: new Date(start + 30 * 60_000).toISOString() };
    expect(linkStatus(r, start - 16 * 60_000)).toBe('upcoming');
    expect(linkStatus(r, start - 15 * 60_000)).toBe('open');
    expect(linkStatus(r, start + 30 * 60_000 + 2 * 3_600_000 + 1)).toBe('ended');
    expect(linkStatus({ ...r, cancelledAt: new Date(start).toISOString() }, start)).toBe('cancelled');
  });
});

// ---------------------------------------------------------------------------------------------
// RLS on the real migration chain
// ---------------------------------------------------------------------------------------------

let db: PGlite;
const id = Object.fromEntries(['admin', 'liam', 'nadav', 'contractor', 'company'].map((k) => [k, randomUUID()])) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('app.uid','${userId}', false)`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('app.uid','', false)`);
  }
}
const insertLink = (host: string) =>
  q(`insert into public.meeting_links(host_id, guest_name, starts_at, ends_at) values ($1, 'Mike', now(), now() + interval '1 hour') returning id`, [host]);

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'Acme')`, [id.company]);
  for (const [uid, role, company] of [
    [id.admin, 'admin', null],
    [id.liam, 'caller', null],
    [id.nadav, 'setter', null],
    [id.contractor, 'contractor', id.company],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, is_active=true, account_status='active' where id=$1`, [uid, role, company]);
  }
}, 120_000);
afterAll(async () => {
  await db?.close();
});

describe('meeting_links RLS', () => {
  it('reps create and see only their own links; admins see all; contractors see none', async () => {
    const [liamLink] = await as(id.liam, () => insertLink(id.liam));
    const [nadavLink] = await as(id.nadav, () => insertLink(id.nadav));
    expect((await as(id.liam, () => q(`select id from public.meeting_links`))).map((r) => r.id)).toEqual([liamLink.id]);
    expect((await as(id.admin, () => q(`select id from public.meeting_links order by created_at`))).map((r) => r.id).sort()).toEqual([liamLink.id, nadavLink.id].sort());
    expect(await as(id.contractor, () => q(`select id from public.meeting_links`))).toEqual([]);
    await expect(as(id.contractor, () => insertLink(id.contractor))).rejects.toThrow();
  });

  it('nobody can create a link hosted by someone else, or cancel someone else’s', async () => {
    await expect(as(id.liam, () => insertLink(id.nadav))).rejects.toThrow();
    const [nadavLink] = await as(id.nadav, () => insertLink(id.nadav));
    const touched = await as(id.liam, () => q(`update public.meeting_links set cancelled_at = now() where id = $1 returning id`, [nadavLink.id]));
    expect(touched).toEqual([]);
    const byAdmin = await as(id.admin, () => q(`update public.meeting_links set cancelled_at = now() where id = $1 returning id`, [nadavLink.id]));
    expect(byAdmin).toHaveLength(1);
  });

  it('rejects a window that ends before it starts', async () => {
    await expect(q(`insert into public.meeting_links(host_id, starts_at, ends_at) values ($1, now(), now() - interval '1 minute')`, [id.liam])).rejects.toThrow();
  });
});
