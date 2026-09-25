/**
 * Phone-based messaging (SMS first) — Phase 3 preparation scaffolding.
 *
 * Phase 3 messaging must plug into the canonical Phase 1/2 workflow
 * contracts. Do not create a competing send_sms action, workflow trigger,
 * event system, or provider-specific workflow path.
 *
 * Pure contracts and helpers only: no database access, no real provider, no
 * sending. Server-side (webhook helpers use node:crypto).
 * Design: docs/workflow-phase-3-messaging-prep.md
 *
 * Phone parsing lives in lib/leads/normalize.ts (parseUsPhone / normalizePhone)
 * so every lookup matches leads.phone_e164; it is re-exported here.
 */
export { parseUsPhone, normalizePhone, type UsPhoneParseResult, type UsPhoneParseFailure } from '@/lib/leads/normalize';
export * from './types';
export * from './status';
export * from './opt-out';
export * from './segments';
export * from './mode';
export * from './workflow-result';
export * from './webhook';
export * from './mock-provider';
