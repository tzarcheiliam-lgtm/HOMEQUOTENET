import 'server-only';
import { loadAvailabilityContext } from './data.server';
import { REASON_LABELS, unavailableReason, type UnavailableReason } from './slots';
import { parseWallTime } from './time';
import { DEFAULT_TZ } from '@/components/calls/format';

export interface SlotCheck {
  ok: boolean;
  reason?: UnavailableReason;
  message?: string;
  /** Epoch ms of the parsed start. */
  startMs: number;
  timezone: string;
}

/**
 * Parse what a staff member typed (`datetime-local`, read as workspace wall
 * time — the same zone the appointment lists display in) and test it against the
 * contractor's availability. Throws on an unparsable value.
 */
export async function checkContractorSlot(
  contractorId: string,
  rawDateTime: string,
  opts: { excludeAppointmentId?: string; durationMinutes?: number } = {}
): Promise<SlotCheck> {
  const startMs = parseWallTime(rawDateTime, DEFAULT_TZ);
  if (startMs === null) throw new Error('Pick a valid date and time');
  const ctx = await loadAvailabilityContext(contractorId, startMs, startMs + 86_400_000);
  const reason = unavailableReason(ctx, startMs, opts.durationMinutes, opts.excludeAppointmentId);
  return {
    ok: reason === null,
    reason: reason ?? undefined,
    message: reason ? `That time is ${REASON_LABELS[reason]}.` : undefined,
    startMs,
    timezone: ctx.settings.timezone,
  };
}
