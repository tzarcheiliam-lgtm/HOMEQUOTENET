import { resolveCallOutcome, type CallJobFacts } from '@/lib/workflows/graph/call-outcomes';
import { AI_BOOKING_MAX_GAP_MS } from './conversions';

export type AiJobForBooking = CallJobFacts & { conversation_started_at: string | null };

/**
 * Did an AI call actually report a booking that this appointment record follows? Uses the workflow builder's own
 * outcome resolver (a completed call whose analysis says booked), and the same ordering rule its booking confirmation
 * uses (the appointment was recorded AFTER the conversation began), plus an upper bound so an unrelated appointment
 * recorded days later is not attributed to the call. An AI call only ever CLAIMS a booking; a person still records it.
 */
export function aiCallBookedEvidence(jobs: AiJobForBooking[], appointmentCreatedAt: string): boolean {
  const recorded = Date.parse(appointmentCreatedAt);
  if (!Number.isFinite(recorded)) return false;
  return jobs.some((job) => {
    const began = Date.parse(job.conversation_started_at ?? '');
    if (!Number.isFinite(began) || began > recorded || recorded - began > AI_BOOKING_MAX_GAP_MS) return false;
    const r = resolveCallOutcome({ ...job, association: 'ok' }, { now: new Date(), analysisGraceMinutes: 0 });
    return r.state === 'final' && r.result.outcome === 'booked';
  });
}
