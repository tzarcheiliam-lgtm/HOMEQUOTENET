import type { MessageStatus } from './types';

/**
 * Delivery callbacks arrive late, duplicated and out of order. A message's
 * status only moves forward: queued -> sent -> (delivered | undelivered |
 * failed). The first final status wins; later callbacks are still recorded
 * as delivery events but never rewrite the message.
 */
const RANK: Record<MessageStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  undelivered: 2,
  failed: 2,
  suppressed: 3,
  received: 3,
};

export const FINAL_MESSAGE_STATUSES = ['delivered', 'undelivered', 'failed', 'suppressed', 'received'] as const satisfies readonly MessageStatus[];

export function isFinalMessageStatus(status: MessageStatus): boolean {
  return (FINAL_MESSAGE_STATUSES as readonly string[]).includes(status);
}

/** The status a message should have after an incoming update. */
export function nextMessageStatus(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  if (isFinalMessageStatus(current)) return current;
  return RANK[incoming] > RANK[current] ? incoming : current;
}

/**
 * Provider vocabularies mapped onto canonical statuses. Adapters own their
 * map; these are the starting points (re-check against current provider docs
 * when each adapter is built). Unknown provider statuses return null and must
 * be logged, never guessed.
 */
export const PROVIDER_STATUS_MAPS: Record<string, Record<string, MessageStatus>> = {
  telnyx: {
    queued: 'queued',
    sending: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    delivery_unconfirmed: 'sent',
    delivery_failed: 'undelivered',
    sending_failed: 'failed',
    received: 'received',
  },
  twilio: {
    accepted: 'queued',
    scheduled: 'queued',
    queued: 'queued',
    sending: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    read: 'delivered',
    undelivered: 'undelivered',
    failed: 'failed',
    canceled: 'failed',
    received: 'received',
  },
  mock: { queued: 'queued', sent: 'sent', delivered: 'delivered', undelivered: 'undelivered', failed: 'failed', received: 'received' },
};

export function mapProviderStatus(provider: string, providerStatus: string): MessageStatus | null {
  return PROVIDER_STATUS_MAPS[provider]?.[providerStatus.trim().toLowerCase()] ?? null;
}
