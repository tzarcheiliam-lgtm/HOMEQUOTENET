import { CALL_OUTCOME_LABELS, handlesFor, nodeById, type CallOutcome } from '@/lib/workflows/graph';
import type { RunDetail } from '@/lib/data/workflow-graph';
import { WORKFLOW_TRIGGERS } from '@/lib/workflows/events';
import { formatWhen, humanize } from './run-format';

/** Plain-language explanations of what a run is doing / did. Pure, so they are easy to test. */

type Step = RunDetail['steps'][number];

const SKIP_TEXT: Record<string, string> = {
  contact_suppressed: 'Skipped — homeowner opted out',
  no_consent: 'Skipped — no recorded consent',
  consent_missing: 'Skipped — no recorded consent',
  consent_not_granted: 'Skipped — no recorded consent',
  test_mode: 'Skipped — test mode',
  condition_not_met: 'Skipped — its condition was not met',
  anchor_missing: 'Skipped — there is no appointment time to wait for',
  anchor_past: 'Skipped — the appointment is too soon',
  no_email: 'Skipped — the homeowner has no email on file',
  no_phone: 'Skipped — the homeowner has no phone number on file',
};

export const describeSkip = (reason: string) => SKIP_TEXT[reason] ?? `Skipped — ${humanize(reason).toLowerCase()}`;

export const callOutcomeLabel = (outcome: string) => CALL_OUTCOME_LABELS[outcome as CallOutcome] ?? humanize(outcome);

export function branchLabel(detail: Pick<RunDetail, 'graph'>, step: Step): string | null {
  if (!step.handle) return null;
  const node = nodeById(detail.graph, step.nodeId);
  if (!node) return humanize(step.handle);
  return handlesFor(node.type, node.config).find((h) => h.id === step.handle)?.label ?? humanize(step.handle);
}

/** "Waiting until Fri 9:00 AM (next business day)" and friends. Null when the run is not held. */
export function describeWait(detail: RunDetail): string | null {
  const { run, steps, waits, graph } = detail;
  if (run.paused) return 'Held while the workflow is paused';
  if (run.status !== 'waiting') return null;
  const step =
    steps.find((s) => s.nodeId === run.currentStepKey && (s.status === 'waiting' || s.status === 'retry_scheduled')) ??
    [...steps].reverse().find((s) => s.status === 'waiting' || s.status === 'retry_scheduled');
  const node = step ? nodeById(graph, step.nodeId) : run.currentStepKey ? nodeById(graph, run.currentStepKey) : undefined;
  const wait = waits.find((w) => w.status === 'open' && (!step || w.stepKey === step.nodeId)) ?? waits.find((w) => w.status === 'open');
  const at = step?.resumeAt ?? run.resumeAt;

  if (step?.status === 'retry_scheduled') {
    const next = Math.min(step.attemptCount + 1, step.maxAttempts);
    const when = step.nextRetryAt ?? at;
    return `Retrying (attempt ${next} of ${step.maxAttempts})${when ? ` at ${formatWhen(when)}` : ''}`;
  }
  if (node?.type === 'ai_call' || wait?.kind === 'call') {
    const until = wait?.timeoutAt ?? at;
    return `Waiting for the call result${until ? ` — gives up at ${formatWhen(until)}` : ''}`;
  }
  if (node?.type === 'wait_event' || wait?.kind === 'event') {
    const until = wait?.timeoutAt ?? at;
    const event = typeof node?.config?.event === 'string' ? (WORKFLOW_TRIGGERS as Record<string, { label: string } | undefined>)[node.config.event]?.label : null;
    return `Waiting for ${event ? event.toLowerCase() : 'an event'}${until ? ` — gives up at ${formatWhen(until)}` : ''}`;
  }
  if (node?.type === 'wait_business_hours') return at ? `Waiting until ${formatWhen(at)} (next business day)` : 'Waiting for the next business day';
  if (at) return `Waiting until ${formatWhen(at)}`;
  return 'Waiting for the next step to be due';
}
