import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeInternalUrl } from './url';
import { defaultPreferences, isNotificationType, type NotificationType, type PushPayload } from './types';
import { isPushConfigured, sendWebPush } from './webpush';

type Db = ReturnType<typeof createAdminClient>;

export interface SendPushInput {
  userIds: string[];
  /** A registered category, or 'test' (settings "send test": ignores preferences, no in-app row). */
  type: NotificationType | 'test';
  title: string;
  body?: string;
  /** Internal /app path. Anything else is replaced with /app. */
  url?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Injected by tests; defaults to the service-role client. */
  db?: Db;
}

export interface SendPushResult {
  recipients: number;
  notified: number;
  devices: number;
  sent: number;
  failed: number;
  removed: number;
}

const EMPTY: SendPushResult = { recipients: 0, notified: 0, devices: 0, sent: 0, failed: 0, removed: 0 };

/**
 * The one entry point every feature uses to notify people.
 *
 *   1. drop users who are inactive or whose preferences turn this type off
 *   2. write the in-app notification (the durable record)
 *   3. push to every enabled device of each remaining user
 *   4. delete subscriptions the push service reports as gone (404/410)
 *   5. log each attempt
 *
 * It NEVER throws: a failed push must not break the business action that
 * triggered it. Errors are logged and reflected in the returned counts.
 */
export async function sendPushNotification(input: SendPushInput): Promise<SendPushResult> {
  try {
    return await deliver(input);
  } catch (e) {
    console.error('[push] sendPushNotification failed:', e instanceof Error ? e.message : e);
    return { ...EMPTY };
  }
}

async function deliver(input: SendPushInput): Promise<SendPushResult> {
  const db = input.db ?? createAdminClient();
  const type = input.type;
  const isTest = type === 'test';
  if (!isTest && !isNotificationType(type)) throw new Error(`Unknown notification type: ${type}`);

  const userIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (userIds.length === 0) return { ...EMPTY };

  const title = input.title.slice(0, 120);
  const body = (input.body ?? '').slice(0, 240);
  const url = safeInternalUrl(input.url);

  // 1. Eligibility: active profiles that have not opted out of this type.
  const [{ data: profiles }, { data: prefRows }] = await Promise.all([
    db.from('profiles').select('id').in('id', userIds).eq('is_active', true),
    db.from('notification_preferences').select('*').in('user_id', userIds),
  ]);
  const active = new Set((profiles ?? []).map((p: { id: string }) => p.id));
  const prefs = new Map<string, Record<string, unknown>>();
  for (const row of (prefRows ?? []) as Record<string, unknown>[]) prefs.set(row.user_id as string, row);

  const eligible = userIds.filter((id) => {
    if (!active.has(id)) return false;
    if (isTest) return true;
    const row = prefs.get(id);
    // No row yet = defaults (everything on).
    if (!row) return defaultPreferences().types[type as NotificationType];
    return row.enabled !== false && row[type] !== false;
  });
  const result: SendPushResult = { ...EMPTY, recipients: userIds.length, notified: eligible.length };
  if (eligible.length === 0) return result;

  // 2. In-app record.
  if (!isTest) {
    const { error } = await db.from('notifications').insert(
      eligible.map((user_id) => ({
        user_id,
        type,
        title,
        body: body || null,
        url,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
      }))
    );
    if (error) console.error('[push] could not store in-app notifications:', error.message);
  }

  // 3. Devices.
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', eligible)
    .eq('enabled', true);
  const devices = (subs ?? []) as { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[];
  result.devices = devices.length;

  const logs: Record<string, unknown>[] = [];
  const log = (user_id: string, status: string, subscription_id: string | null, error?: string) =>
    logs.push({
      user_id,
      subscription_id,
      type,
      entity_id: input.entityId ?? null,
      title,
      body: body || null,
      status,
      error: error ?? null,
    });

  const withDevice = new Set(devices.map((d) => d.user_id));
  for (const id of eligible) if (!withDevice.has(id)) log(id, 'no_subscription', null);

  if (devices.length > 0 && !isPushConfigured()) {
    for (const d of devices) log(d.user_id, 'failed', d.id, 'VAPID keys are not configured');
    result.failed = devices.length;
  } else if (devices.length > 0) {
    // Unread counts feed the app-icon badge on each device.
    const unread = new Map<string, number>();
    if (!isTest) {
      await Promise.all(
        eligible.map(async (id) => {
          const { count } = await db
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', id)
            .is('read_at', null);
          unread.set(id, count ?? 0);
        })
      );
    }

    const gone: string[] = [];
    const ok: string[] = [];
    await Promise.all(
      devices.map(async (d) => {
        const payload: PushPayload = {
          title,
          body,
          icon: '/icons/homequote-192.png',
          badge: '/icons/homequote-badge.png',
          tag: input.entityId ? `${type}:${input.entityId}` : type,
          url,
          notification_type: type,
          entity_id: input.entityId ?? null,
          metadata: input.metadata ?? {},
          badge_count: isTest ? undefined : (unread.get(d.user_id) ?? 0),
        };
        const r = await sendWebPush(d, payload);
        if (r.ok) {
          result.sent++;
          ok.push(d.id);
          log(d.user_id, 'sent', d.id);
        } else if (r.gone) {
          result.removed++;
          gone.push(d.id);
          log(d.user_id, 'expired', d.id, r.error);
        } else {
          result.failed++;
          log(d.user_id, 'failed', d.id, r.error);
        }
      })
    );

    // 4. Housekeeping (best effort).
    if (gone.length) await db.from('push_subscriptions').delete().in('id', gone);
    if (ok.length) await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', ok);
  }

  // 5. Log.
  if (logs.length) {
    const { error } = await db.from('push_notification_logs').insert(logs);
    if (error) console.error('[push] could not write delivery log:', error.message);
  }
  return result;
}
