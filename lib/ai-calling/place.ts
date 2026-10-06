import 'server-only';
import { aiCallingEnabled, E164 } from './config';
import { createPhoneCall, type CreatePhoneCallInput } from './fish';

/**
 * The only sanctioned way to place an AI call. Refuses unless the global kill
 * switch is on and the destination is valid E.164.
 *
 * NOT YET WIRED to any prospect list. Before a caller of this is written it
 * must also enforce, per destination: do-not-call (contractor_prospects.
 * disposition / do_not_call_at), calling-hours in the callee's time zone, and
 * recorded consent where required. Those rules are product/legal decisions.
 */
export async function placeAiCall(input: CreatePhoneCallInput) {
  if (!aiCallingEnabled()) throw new Error('AI calling is disabled (AI_CALLING_GLOBAL_ENABLED is not "true")');
  if (!E164.test(input.toNumber)) throw new Error('toNumber must be E.164, e.g. +14155550123');
  if (!input.idempotencyKey) throw new Error('idempotencyKey is required');
  return createPhoneCall(input);
}
