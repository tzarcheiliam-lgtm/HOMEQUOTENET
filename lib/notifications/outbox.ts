import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildNotifications, type NotificationEvent } from './routing';
import { sendPushNotification } from './service';
import type { NotificationType } from './types';

type Db = ReturnType<typeof createAdminClient>;

/**
 * The outbox pattern, same shape as lead_email_deliveries: database triggers
 * (and a few app hooks) record "something happened" in public.notification_events
 * inside the same transaction as the business change; this worker turns those
 * facts into notifications afterwards. A crash or a push outage therefore
 * never loses an alert and never fails the action that caused it.
 */

export interface ProcessResult {
  claimed: number;
  processed: number;
  failed: number;
}

export async function processNotificationEvents(opts: { limit?: number; db?: Db } = {}): Promise<ProcessResult> {
  const db = opts.db ?? createAdminClient();
  const { data, error } = await db.rpc('claim_notification_events', { p_limit: opts.limit ?? 25 });
  if (error) throw new Error(`Could not claim notification events: ${error.message}`);
  const events = (data ?? []) as NotificationEvent[];
  const result: ProcessResult = { claimed: events.length, processed: 0, failed: 0 };

  for (const event of events) {
    try {
      const messages = await buildNotifications(event, db);
      for (const m of messages) {
        await sendPushNotification({ ...m, db });
      }
      await db.from('notification_events').update({ processed_at: new Date().toISOString(), error: null }).eq('id', event.id);
      result.processed++;
    } catch (e) {
      result.failed++;
      // Left unprocessed: claim_notification_events retries it (max 5 attempts).
      await db
        .from('notification_events')
        .update({ error: (e instanceof Error ? e.message : String(e)).slice(0, 500) })
        .eq('id', event.id);
    }
  }
  return result;
}

/**
 * Deliver whatever the database just queued, right after the current response
 * is sent (funnel submit, server actions, webhooks). Fire-and-forget: the
 * every-5-minute tick is the backstop if this never runs.
 */
export function flushNotificationsSoon(): void {
  try {
    after(async () => {
      try {
        await processNotificationEvents();
      } catch (e) {
        console.error('[push] flush failed:', e instanceof Error ? e.message : e);
      }
    });
  } catch {
    /* outside a request scope; the scheduled tick will pick it up */
  }
}

/**
 * Record an event from application code (for facts the database cannot see:
 * a Stripe payment, a reassignment, a workflow alert). Idempotent on dedupeKey
 * and non-throwing.
 */
export async function enqueueNotificationEvent(input: {
  type: NotificationType;
  entityType: string;
  entityId: string;
  dedupeKey: string;
  leadId?: string | null;
  contractorId?: string | null;
  payload?: Record<string, unknown>;
  db?: Db;
}): Promise<void> {
  try {
    const db = input.db ?? createAdminClient();
    const { error } = await db.from('notification_events').insert({
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId,
      lead_id: input.leadId ?? null,
      contractor_id: input.contractorId ?? null,
      payload: input.payload ?? {},
      dedupe_key: input.dedupeKey,
    });
    if (error && error.code !== '23505') console.error('[push] could not enqueue event:', error.message);
  } catch (e) {
    console.error('[push] could not enqueue event:', e instanceof Error ? e.message : e);
  }
}

/**
 * Called from the existing scheduler (/api/workflows/tick): queue callbacks
 * that just came due, deliver everything pending, prune old rows.
 */
export async function runNotificationMaintenance(): Promise<ProcessResult & { callbacksQueued: number }> {
  const db = createAdminClient();
  const { data: queued, error } = await db.rpc('enqueue_due_callbacks');
  if (error) console.error('[push] enqueue_due_callbacks failed:', error.message);
  const result = await processNotificationEvents({ limit: 50, db });
  await db.rpc('prune_notification_history');
  return { ...result, callbacksQueued: typeof queued === 'number' ? queued : 0 };
}

/**
 * Workflow hook: lets a future workflow action raise a push alert with the
 * same routing, preferences and logging as everything else.
 */
export async function raiseWorkflowAlert(input: {
  key: string;
  title: string;
  body?: string;
  url?: string;
  userIds?: string[];
}): Promise<void> {
  await enqueueNotificationEvent({
    type: 'workflow_alert',
    entityType: 'workflow',
    entityId: crypto.randomUUID(),
    dedupeKey: `workflow-alert:${input.key}`,
    payload: { title: input.title, body: input.body ?? '', url: input.url ?? '/app', userIds: input.userIds ?? [] },
  });
  flushNotificationsSoon();
}
