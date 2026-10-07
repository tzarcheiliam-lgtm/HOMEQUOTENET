import 'server-only';
import { createPhoneCall } from './fish';
import { processAiCallQueue, type BatchResult } from './dispatch';
import { createSupabaseJobStore } from './store.server';

/** One scheduler tick (or a best-effort kick after a form submission). Safe to call concurrently. */
export async function runAiCallQueue(opts: { limit?: number } = {}): Promise<BatchResult> {
  return processAiCallQueue({ store: createSupabaseJobStore(), createCall: createPhoneCall }, opts);
}

/** Dispatches exactly one job now (manual "call immediately"). Same rules and the same queue claim as a tick. */
export async function dispatchJobNow(jobId: string): Promise<BatchResult> {
  return processAiCallQueue({ store: createSupabaseJobStore(), createCall: createPhoneCall }, { onlyId: jobId, limit: 1 });
}
