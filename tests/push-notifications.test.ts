import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }));

const sendWebPush = vi.fn();
vi.mock('@/lib/notifications/webpush', () => ({
  isPushConfigured: () => true,
  sendWebPush: (...args: unknown[]) => sendWebPush(...args),
}));

import { safeInternalUrl } from '@/lib/notifications/url';
import { isAllowedPushEndpoint } from '@/lib/notifications/endpoint';
import { NOTIFICATION_TYPE_IDS, notificationTypesForRole } from '@/lib/notifications/types';
import { formatWhen } from '@/lib/notifications/routing';
import { sendPushNotification } from '@/lib/notifications/service';
import { fakeDb, type Row } from './fixtures/fake-db';

describe('notification URLs are internal only', () => {
  it('keeps /app paths', () => {
    for (const ok of ['/app', '/app/leads/abc', '/app/calls/appointments', '/app?tab=1', '/app/leads/1#notes']) {
      expect(safeInternalUrl(ok)).toBe(ok);
    }
  });

  it('collapses everything else to /app', () => {
    const bad = [
      'https://evil.example/app',
      '//evil.example',
      '/\\evil.example',
      '/apply',
      '/application',
      'javascript:alert(1)',
      '/app/\nx',
      '/sign-in',
      '',
      '   ',
      null,
      undefined,
      42,
      `/app/${'a'.repeat(600)}`,
    ];
    for (const b of bad) expect(safeInternalUrl(b)).toBe('/app');
  });
});

describe('push endpoint allowlist (SSRF guard)', () => {
  it('accepts the real push services', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://web.push.apple.com/QF8abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect(isAllowedPushEndpoint(ok)).toBe(true);
    }
  });

  it('rejects internal hosts, lookalikes, http and credentials', () => {
    for (const bad of [
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'http://fcm.googleapis.com/x',
      'https://fcm.googleapis.com.evil.example/x',
      'https://evilfcm.googleapis.com.attacker.io/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'not a url',
    ]) {
      expect(isAllowedPushEndpoint(bad)).toBe(false);
    }
  });
});

describe('notification categories', () => {
  const sql = readFileSync('supabase/migrations/0031_push_notifications.sql', 'utf8');
  const prefsTable = sql.slice(sql.indexOf('create table if not exists public.notification_preferences'), sql.indexOf('alter table public.notification_preferences enable'));
  const eventCheck = sql.slice(sql.indexOf('create table if not exists public.notification_events'), sql.indexOf('create index if not exists idx_notification_events_queue'));

  it('every registry type has a preference column and an outbox type', () => {
    for (const id of NOTIFICATION_TYPE_IDS) {
      expect(prefsTable, `preference column ${id}`).toMatch(new RegExp(`\\b${id}\\s+boolean not null default true`));
      expect(eventCheck, `outbox type ${id}`).toContain(`'${id}'`);
    }
  });

  it('never offers a role a category it cannot receive', () => {
    expect(notificationTypesForRole('contractor').map((t) => t.id)).not.toContain('new_lead');
    expect(notificationTypesForRole('contractor').map((t) => t.id)).not.toContain('payment_received');
    expect(notificationTypesForRole('caller').map((t) => t.id)).toContain('callback_due');
    expect(notificationTypesForRole('admin')).toHaveLength(NOTIFICATION_TYPE_IDS.length);
  });
});

describe('lock-screen text', () => {
  it('formats times in Los Angeles', () => {
    expect(formatWhen('2026-09-30T17:00:00.000Z')).toBe('Wed, Sep 30, 10:00 AM');
    expect(formatWhen(null)).toBeNull();
    expect(formatWhen('nope')).toBeNull();
  });
});

// --- sendPushNotification against an in-memory Supabase stand-in ----------------

describe('sendPushNotification', () => {
  const A = 'user-a';
  const B = 'user-b';
  const C = 'user-c-inactive';
  let tables: Record<string, Row[]>;

  beforeEach(() => {
    sendWebPush.mockReset();
    sendWebPush.mockResolvedValue({ ok: true });
    tables = {
      profiles: [
        { id: A, is_active: true },
        { id: B, is_active: true },
        { id: C, is_active: false },
      ],
      notification_preferences: [],
      notifications: [],
      push_notification_logs: [],
      push_subscriptions: [
        { id: 's-a1', user_id: A, endpoint: 'https://fcm.googleapis.com/a1', p256dh: 'k', auth: 'a', enabled: true },
        { id: 's-a2', user_id: A, endpoint: 'https://web.push.apple.com/a2', p256dh: 'k', auth: 'a', enabled: true },
        { id: 's-b1', user_id: B, endpoint: 'https://fcm.googleapis.com/b1', p256dh: 'k', auth: 'a', enabled: true },
        { id: 's-c1', user_id: C, endpoint: 'https://fcm.googleapis.com/c1', p256dh: 'k', auth: 'a', enabled: true },
      ],
    };
  });

  const send = (over: Partial<Parameters<typeof sendPushNotification>[0]> = {}) =>
    sendPushNotification({
      userIds: [A, B, C],
      type: 'lead_assigned',
      title: 'New Lead Assigned',
      body: 'Pool Remodel — Encino',
      url: '/app/leads/L1',
      entityId: 'L1',
      db: fakeDb(tables),
      ...over,
    });

  it('pushes to every device of every active user and records in-app + log rows', async () => {
    const r = await send();
    expect(r).toMatchObject({ recipients: 3, notified: 2, devices: 3, sent: 3, failed: 0, removed: 0 });
    expect(tables.notifications.map((n) => n.user_id).sort()).toEqual([A, B]);
    expect(tables.push_notification_logs.filter((l) => l.status === 'sent')).toHaveLength(3);
    const payload = sendWebPush.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({ title: 'New Lead Assigned', url: '/app/leads/L1', notification_type: 'lead_assigned', entity_id: 'L1', tag: 'lead_assigned:L1' });
  });

  it('respects a disabled category and the master switch', async () => {
    tables.notification_preferences = [
      { user_id: A, enabled: true, lead_assigned: false },
      { user_id: B, enabled: false, lead_assigned: true },
    ];
    const r = await send();
    expect(r.notified).toBe(0);
    expect(sendWebPush).not.toHaveBeenCalled();
    expect(tables.notifications).toHaveLength(0);
  });

  it('a different category still reaches a user who disabled another', async () => {
    tables.notification_preferences = [{ user_id: A, enabled: true, lead_assigned: false, appointment_booked: true }];
    const r = await send({ type: 'appointment_booked', userIds: [A] });
    expect(r.sent).toBe(2);
  });

  it('never notifies a user who is not in the recipient list', async () => {
    await send({ userIds: [B] });
    expect(sendWebPush.mock.calls.every(([t]) => (t as { endpoint: string }).endpoint.includes('/b1'))).toBe(true);
  });

  it('deletes subscriptions the push service reports gone, keeps the rest', async () => {
    sendWebPush.mockImplementation(async (t: { endpoint: string }) =>
      t.endpoint.endsWith('/a2') ? { ok: false, gone: true, statusCode: 410, error: '410 Gone' } : { ok: true }
    );
    const r = await send({ userIds: [A] });
    expect(r).toMatchObject({ sent: 1, removed: 1 });
    expect(tables.push_subscriptions.map((s) => s.id)).not.toContain('s-a2');
    expect(tables.push_subscriptions.map((s) => s.id)).toContain('s-a1');
    expect(tables.push_notification_logs.some((l) => l.status === 'expired')).toBe(true);
  });

  it('keeps a subscription after a transient failure and logs it', async () => {
    sendWebPush.mockResolvedValue({ ok: false, gone: false, statusCode: 503, error: '503 busy' });
    const r = await send({ userIds: [A] });
    expect(r).toMatchObject({ failed: 2, removed: 0 });
    expect(tables.push_subscriptions.filter((s) => s.user_id === A)).toHaveLength(2);
    expect(tables.notifications).toHaveLength(1); // the in-app record survives a failed push
  });

  it('never throws, even if the database explodes', async () => {
    const boom = { from: () => { throw new Error('db down'); } } as unknown as Parameters<typeof sendPushNotification>[0]['db'];
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(send({ db: boom })).resolves.toMatchObject({ sent: 0 });
    errors.mockRestore();
  });

  it('replaces an external URL with /app', async () => {
    await send({ url: 'https://evil.example/phish', userIds: [A] });
    expect((sendWebPush.mock.calls[0][1] as { url: string }).url).toBe('/app');
    expect(tables.notifications[0].url).toBe('/app');
  });

  it('test pushes ignore preferences and store no in-app row', async () => {
    tables.notification_preferences = [{ user_id: A, enabled: false }];
    const r = await send({ type: 'test', userIds: [A] });
    expect(r.sent).toBe(2);
    expect(tables.notifications).toHaveLength(0);
  });
});
