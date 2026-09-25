import type { ProviderMetadata, WorkflowErrorKind } from '@/lib/workflows/actions';

/**
 * Phone-based messaging contract (Phase 3 preparation).
 *
 * Phase 3 messaging must plug into the canonical Phase 1/2 workflow
 * contracts. Do not create a competing send_sms action, workflow trigger,
 * event system, or provider-specific workflow path.
 *
 *   workflow send_sms handler -> MessagingService -> MessagingProvider adapter -> provider
 *   provider webhook -> MessagingProvider.normalizeWebhook -> MessagingService -> emit_workflow_event('message.received')
 *
 * Email is NOT part of this contract: it stays on the existing Gmail path
 * (lib/emails/gmail.ts). See docs/workflow-phase-3-messaging-prep.md.
 */

// ---------------------------------------------------------------------------
// Channels, directions, statuses
// ---------------------------------------------------------------------------
/** SMS first; the rest are reserved so the schema never has to be SMS-only. */
export const MESSAGING_CHANNELS = ['sms', 'mms', 'whatsapp', 'imessage', 'rcs'] as const;
export type MessagingChannel = (typeof MESSAGING_CHANNELS)[number];
/** Channels an adapter may actually be built for today. */
export const ENABLED_MESSAGING_CHANNELS = ['sms'] as const satisfies readonly MessagingChannel[];

export const MESSAGE_DIRECTIONS = ['outbound', 'inbound'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

/**
 * Canonical message status. Providers map their own vocabulary onto this
 * (see status.ts). `suppressed` = HomeQuote decided not to send (opt-out,
 * allowlist, invalid number) and the provider was never called; `received`
 * is the only inbound status.
 */
export const MESSAGE_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'undelivered',
  'failed',
  'suppressed',
  'received',
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Sending identity (a number/profile HomeQuote or a contractor sends from)
// ---------------------------------------------------------------------------
export interface MessagingSender {
  id: string;
  /** Tenant. NULL = HomeQuote itself (Phase 1 convention). */
  contractorId: string | null;
  provider: string;
  channel: MessagingChannel;
  /** E.164 for phone channels. */
  address: string;
  /** Provider-side profile/number id, if the provider has one. Never a secret. */
  providerProfileId: string | null;
}

// ---------------------------------------------------------------------------
// Outbound
// ---------------------------------------------------------------------------
export interface SendMessageInput {
  /** Tenant of the send. Must equal the sender's tenant. NULL = HomeQuote. */
  contractorId: string | null;
  /** leads.id. Required for workflow sends; manual sends may omit it. */
  leadId: string | null;
  channel: MessagingChannel;
  /** Raw or E.164; the service parses it with parseUsPhone. */
  to: string;
  body: string;
  /** Pin a sender; otherwise the service picks the tenant's default sender. */
  senderId?: string | null;
  /** profiles.id for a human send; null for workflow/system sends. */
  initiatedBy: string | null;
  /**
   * Workflow sends: the Phase 1 step idempotency key (`<run>:<step>:<iteration>`,
   * stepRunIdempotencyKey()). Manual sends: `manual:<uuid>` generated once per
   * user click. Unique per message — a repeat returns the original message.
   */
  idempotencyKey: string;
  /** Present for workflow sends; stored on the message for traceability. */
  workflow?: { runId: string; stepRunId: string } | null;
  /** Transactional (appointment confirmation) vs marketing; opt-out blocks both for SMS. */
  purpose: 'transactional' | 'marketing';
  metadata?: Record<string, string | number | boolean | null>;
}

/** Why the service refused to call the provider. */
export const SUPPRESSION_REASONS = [
  'opted_out',
  'no_consent',
  'invalid_phone',
  'no_sender',
  'sender_tenant_mismatch',
  'channel_unavailable',
  'not_allowlisted',
  'messaging_disabled',
] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export interface MessagingError {
  /** Stable machine code, e.g. 'provider_timeout', 'invalid_recipient', 'rate_limited'. */
  code: string;
  /** No PII, no raw provider bodies, no secrets. */
  message: string;
  kind: WorkflowErrorKind;
  retryAfterSeconds?: number;
}

export interface MessageCost {
  /** Segments billed (GSM-7 153/160 or UCS-2 67/70 per part). */
  segments: number;
  /** Provider-reported cost in `currency`, when the provider exposes it. */
  amount?: number | null;
  currency?: string | null;
  carrierFee?: number | null;
  /** 'provider' when reported, 'estimated' when computed from segments x rate. */
  source: 'provider' | 'estimated';
}

export type SendMessageResult =
  | {
      outcome: 'accepted';
      messageId: string;
      status: Extract<MessageStatus, 'queued' | 'sent' | 'delivered'>;
      provider: ProviderMetadata;
      sentAt: string | null;
      /** True when this idempotency key had already been sent: nothing new went out. */
      replayed: boolean;
      cost?: MessageCost;
    }
  | { outcome: 'suppressed'; messageId: string | null; reason: SuppressionReason }
  /** Quiet hours: nothing sent; try again at notBefore. */
  | { outcome: 'deferred'; messageId: string | null; notBefore: string }
  | { outcome: 'failed'; messageId: string | null; error: MessagingError; provider?: ProviderMetadata };

/** The only messaging entry point application code (incl. workflow handlers) may use. */
export interface MessagingService {
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}

// ---------------------------------------------------------------------------
// Provider adapter contract
// ---------------------------------------------------------------------------
export interface MessagingProviderCapabilities {
  channels: readonly MessagingChannel[];
  /** Reports cost in send response or delivery callback. */
  reportsCost: boolean;
  /** Accepts an idempotency key on send (most SMS APIs do not). */
  supportsIdempotencyKey: boolean;
  /** Sends delivery receipts (DLRs). */
  deliveryReceipts: boolean;
  /** Provider/carrier enforces STOP itself (we still enforce locally). */
  carrierOptOut: boolean;
  maxBodyLength: number;
}

export interface ProviderSendRequest {
  from: MessagingSender;
  /** E.164, already validated. */
  to: string;
  body: string;
  channel: MessagingChannel;
  /** Our message id; adapters pass it as provider client-reference when supported. */
  messageId: string;
  idempotencyKey: string;
  /** Where the provider should post delivery callbacks. */
  statusCallbackUrl: string | null;
}

export type ProviderSendResult =
  | { ok: true; providerMessageId: string; status: MessageStatus; providerStatus: string; cost?: MessageCost }
  | { ok: false; error: MessagingError; providerStatus?: string; httpStatus?: number };

/** Raw webhook as received. Adapters must verify against the RAW body. */
export interface RawWebhook {
  /** Lower-cased header names (see lowerHeaders). */
  headers: Record<string, string>;
  rawBody: string;
  receivedAt: Date;
}

export type WebhookVerification =
  | { ok: true }
  | { ok: false; reason: 'missing_signature' | 'bad_signature' | 'stale' | 'misconfigured' };

export interface NormalizedInboundMessage {
  provider: string;
  providerMessageId: string;
  channel: MessagingChannel;
  /** E.164 of the homeowner. */
  from: string;
  /** E.164 of our sender — resolves the tenant. */
  to: string;
  body: string;
  mediaCount: number;
  receivedAt: string;
  segments: number | null;
}

export interface NormalizedDeliveryUpdate {
  provider: string;
  providerMessageId: string;
  /** Provider's own id for this callback when it has one; else derived (see idempotency). */
  providerEventId: string | null;
  status: Exclude<MessageStatus, 'received' | 'suppressed'>;
  providerStatus: string;
  occurredAt: string;
  error?: { code: string; message: string } | null;
  cost?: MessageCost;
}

/**
 * Providers usually post inbound messages and delivery receipts to one
 * endpoint, so one normalizer returns a union rather than two methods that
 * would each have to reject the other's payloads.
 */
export type NormalizedWebhook =
  | { kind: 'inbound'; message: NormalizedInboundMessage }
  | { kind: 'delivery'; update: NormalizedDeliveryUpdate }
  | { kind: 'ignored'; reason: string };

/**
 * One adapter per provider (Telnyx first). Adapters are server-only, pure
 * translation + transport: no database access, no tenant decisions, no
 * opt-out logic, no workflow imports. That all lives in MessagingService.
 */
export interface MessagingProvider {
  readonly name: string;
  readonly capabilities: MessagingProviderCapabilities;
  send(request: ProviderSendRequest): Promise<ProviderSendResult>;
  verifyWebhook(webhook: RawWebhook): WebhookVerification | Promise<WebhookVerification>;
  /** Parses a verified webhook body (inbound message or delivery receipt). */
  normalizeWebhook(webhook: RawWebhook): NormalizedWebhook;
}
