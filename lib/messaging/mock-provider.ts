import { countSmsSegments } from './segments';
import { mapProviderStatus } from './status';
import { hmacSignature, isFreshTimestamp, safeEqual } from './webhook';
import type {
  MessagingError,
  MessagingProvider,
  NormalizedWebhook,
  ProviderSendRequest,
  ProviderSendResult,
  RawWebhook,
  WebhookVerification,
} from './types';

/**
 * In-memory provider for development and tests. Never touches the network.
 * It implements the full MessagingProvider contract — send, webhook
 * verification (HMAC + replay window) and normalization — so the service,
 * the webhook route and the workflow handler can all be exercised end to end
 * without a real provider or real phone numbers.
 */

export interface MockSend {
  providerMessageId: string;
  request: ProviderSendRequest;
}

export interface MockProviderOptions {
  /** Webhook signing secret for verifyWebhook. */
  webhookSecret?: string;
  /** Scripted failures, consumed in order, one per send. */
  failures?: MessagingError[];
}

interface MockWebhookBody {
  type: 'message.received' | 'message.status';
  id?: string;
  message_id: string;
  status?: string;
  from?: string;
  to?: string;
  text?: string;
  media_count?: number;
  occurred_at: string;
  error?: { code: string; message: string } | null;
}

export class MockMessagingProvider implements MessagingProvider {
  readonly name = 'mock';
  readonly capabilities = {
    channels: ['sms'] as const,
    reportsCost: false,
    supportsIdempotencyKey: true,
    deliveryReceipts: true,
    carrierOptOut: false,
    maxBodyLength: 1600,
  };
  readonly sent: MockSend[] = [];
  private readonly byKey = new Map<string, string>();
  private readonly failures: MessagingError[];
  private counter = 0;

  constructor(private readonly options: MockProviderOptions = {}) {
    this.failures = [...(options.failures ?? [])];
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const failure = this.failures.shift();
    if (failure) return { ok: false, error: failure, providerStatus: 'failed' };
    // Honors idempotency keys like a well-behaved provider would.
    const existing = this.byKey.get(request.idempotencyKey);
    if (existing) return { ok: true, providerMessageId: existing, status: 'queued', providerStatus: 'queued' };
    const providerMessageId = `mock_${++this.counter}`;
    this.byKey.set(request.idempotencyKey, providerMessageId);
    this.sent.push({ providerMessageId, request });
    return {
      ok: true,
      providerMessageId,
      status: 'queued',
      providerStatus: 'queued',
      cost: { segments: countSmsSegments(request.body).segments, source: 'estimated' },
    };
  }

  verifyWebhook(webhook: RawWebhook): WebhookVerification {
    const secret = this.options.webhookSecret;
    if (!secret) return { ok: false, reason: 'misconfigured' };
    const signature = webhook.headers['x-mock-signature'];
    const timestamp = webhook.headers['x-mock-timestamp'];
    if (!signature || !timestamp) return { ok: false, reason: 'missing_signature' };
    if (!isFreshTimestamp(timestamp, webhook.receivedAt)) return { ok: false, reason: 'stale' };
    return safeEqual(signature, hmacSignature(secret, timestamp, webhook.rawBody)) ? { ok: true } : { ok: false, reason: 'bad_signature' };
  }

  normalizeWebhook(webhook: RawWebhook): NormalizedWebhook {
    let body: MockWebhookBody;
    try {
      body = JSON.parse(webhook.rawBody) as MockWebhookBody;
    } catch {
      return { kind: 'ignored', reason: 'invalid_json' };
    }
    if (body.type === 'message.received' && body.from && body.to) {
      return {
        kind: 'inbound',
        message: {
          provider: this.name,
          providerMessageId: body.message_id,
          channel: 'sms',
          from: body.from,
          to: body.to,
          body: body.text ?? '',
          mediaCount: body.media_count ?? 0,
          receivedAt: body.occurred_at,
          segments: body.text ? countSmsSegments(body.text).segments : null,
        },
      };
    }
    if (body.type === 'message.status' && body.status) {
      const status = mapProviderStatus(this.name, body.status);
      if (!status || status === 'received' || status === 'suppressed') return { kind: 'ignored', reason: `unknown_status:${body.status}` };
      return {
        kind: 'delivery',
        update: {
          provider: this.name,
          providerMessageId: body.message_id,
          providerEventId: body.id ?? null,
          status,
          providerStatus: body.status,
          occurredAt: body.occurred_at,
          error: body.error ?? null,
        },
      };
    }
    return { kind: 'ignored', reason: 'unsupported_type' };
  }

  /** Test helper: a correctly signed webhook for `body`. */
  signedWebhook(body: object, now = new Date()): RawWebhook {
    const rawBody = JSON.stringify(body);
    const timestamp = String(Math.floor(now.getTime() / 1000));
    return {
      rawBody,
      receivedAt: now,
      headers: { 'x-mock-timestamp': timestamp, 'x-mock-signature': hmacSignature(this.options.webhookSecret ?? '', timestamp, rawBody) },
    };
  }
}
