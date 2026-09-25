import type { WorkflowActionResult, WorkflowSkipReason } from '@/lib/workflows/actions';
import type { SendMessageResult, SuppressionReason } from './types';

/**
 * Maps a MessagingService result onto Phase 1's canonical
 * WorkflowActionResult. This is the entire surface the future send_sms
 * handler needs from messaging; it does not assume anything about Phase 2's
 * dispatcher signatures.
 *
 * An 'accepted' send is a workflow success even if the carrier later reports
 * undelivered: the action (hand the message to the carrier) happened. Late
 * delivery failures update the message row, not the finished step.
 */
const SKIP_FOR: Record<SuppressionReason, WorkflowSkipReason> = {
  opted_out: 'no_consent',
  no_consent: 'no_consent',
  invalid_phone: 'missing_contact',
  no_sender: 'unavailable_action',
  sender_tenant_mismatch: 'unavailable_action',
  channel_unavailable: 'unavailable_action',
  not_allowlisted: 'unavailable_action',
  messaging_disabled: 'unavailable_action',
};

export function toWorkflowActionResult(result: SendMessageResult, now: Date): WorkflowActionResult {
  switch (result.outcome) {
    case 'accepted':
      return {
        outcome: 'success',
        output: { messageId: result.messageId, status: result.status, replayed: result.replayed },
        provider: result.provider,
      };
    case 'suppressed':
      return { outcome: 'skipped', reason: SKIP_FOR[result.reason] };
    case 'deferred': {
      // Quiet hours: nothing sent. A temporary failure with retry-after lets
      // the Phase 1 retry contract reschedule without a new outcome type.
      const seconds = Math.max(60, Math.ceil((new Date(result.notBefore).getTime() - now.getTime()) / 1000));
      return {
        outcome: 'temporary_failure',
        error: { code: 'quiet_hours', message: 'Held until the recipient’s allowed sending window', kind: 'temporary', retryable: true },
        retryAfterSeconds: seconds,
      };
    }
    case 'failed':
      return result.error.kind === 'temporary'
        ? {
            outcome: 'temporary_failure',
            error: { code: result.error.code, message: result.error.message, kind: 'temporary', retryable: true },
            retryAfterSeconds: result.error.retryAfterSeconds,
            provider: result.provider,
          }
        : {
            outcome: 'permanent_failure',
            error: { code: result.error.code, message: result.error.message, kind: 'permanent', retryable: false },
            provider: result.provider,
          };
  }
}
