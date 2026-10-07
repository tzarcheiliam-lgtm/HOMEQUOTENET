'use client';

import { useMemo, type ReactNode } from 'react';
import { Copy, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { BuilderLookups } from '@/lib/data/workflow-graph';
import {
  CALL_OUTCOME_LABELS,
  NODE_TYPES,
  handlesFor,
  nodeDisplayName,
  sampleContext,
  type CallOutcome,
  type GraphEvaluationContext,
  type GraphIssue,
  type GraphNode,
  type GraphNodeType,
  type HandleDef,
  type WorkflowGraph,
} from '@/lib/workflows/graph';
import { CATEGORY_STYLE, NodeIcon } from '../node-icons';
import { AddNoteForm } from './forms/add-note-form';
import { AiCallForm } from './forms/ai-call-form';
import { AssignLeadForm } from './forms/assign-lead-form';
import { ConditionForm } from './forms/condition-form';
import { CreateTaskForm } from './forms/create-task-form';
import { EndForm } from './forms/end-form';
import { SendEmailForm } from './forms/send-email-form';
import { SendNotificationForm } from './forms/send-notification-form';
import { SendSmsForm } from './forms/send-sms-form';
import { TriggerForm } from './forms/trigger-form';
import { UpdateLeadStatusForm } from './forms/update-lead-status-form';
import { WaitBusinessHoursForm } from './forms/wait-business-hours-form';
import { WaitDurationForm } from './forms/wait-duration-form';
import { WaitEventForm } from './forms/wait-event-form';
import { Callout, IssueMessages, type Config, type FormProps } from './forms/shared';

export interface NodeConfigPanelProps {
  /** The selected step. */
  node: GraphNode;
  /** The whole graph, for context (upstream steps, connections). */
  graph: WorkflowGraph;
  /** Issues already filtered to THIS step. */
  issues: GraphIssue[];
  lookups: BuilderLookups;
  /** Workflow scope: null = HomeQuote network workflow. */
  contractorId: string | null;
  readOnly: boolean;
  /** Called on every change. `config`, when present, is the COMPLETE new config. */
  onPatch(patch: { name?: string | null; config?: Record<string, unknown> }): void;
  onDuplicate(): void;
  onDelete(): void;
  onClose(): void;
  /** Real lead facts for template previews; the built-in sample homeowner when absent. */
  previewContext?: GraphEvaluationContext;
}

const FORMS: Record<GraphNodeType, (props: FormProps) => ReactNode> = {
  trigger: TriggerForm,
  send_email: SendEmailForm,
  send_sms: SendSmsForm,
  ai_call: AiCallForm,
  create_task: CreateTaskForm,
  add_note: AddNoteForm,
  update_lead_status: UpdateLeadStatusForm,
  assign_lead: AssignLeadForm,
  send_notification: SendNotificationForm,
  wait_duration: WaitDurationForm,
  wait_business_hours: WaitBusinessHoursForm,
  wait_event: WaitEventForm,
  condition: ConditionForm,
  end: EndForm,
};

/** Config keys each form shows inline messages for. Anything else is listed at the top of the panel. */
const INLINE_FIELDS: Record<GraphNodeType, string[]> = {
  trigger: ['event', 'filters', 'entry'],
  send_email: ['to', 'templateId', 'subject', 'body', 'onError'],
  send_sms: [],
  ai_call: ['purpose', 'note', 'contextFields', 'maxAttempts', 'retryDelayMinutes', 'windowStartHour', 'windowEndHour', 'resultTimeoutMinutes', 'analysisGraceMinutes'],
  create_task: ['title', 'description', 'dueInMinutes', 'assignee', 'onError'],
  add_note: ['body', 'onError'],
  update_lead_status: ['pipeline', 'status', 'onError'],
  assign_lead: ['strategy', 'userIds', 'onError'],
  send_notification: ['audience', 'userId', 'title', 'body', 'onError'],
  wait_duration: ['mode', 'amount', 'unit', 'hoursBefore', 'ifPast'],
  wait_business_hours: ['days', 'startHour', 'endHour', 'zone', 'timezone', 'minimumDelayMinutes'],
  wait_event: ['event', 'toStatuses', 'timeoutMinutes'],
  condition: ['branches'],
  end: ['reason'],
};

/** Plain-language meaning of each AI call result path. */
const OUTCOME_HELP: Record<CallOutcome, string> = {
  booked: 'The homeowner agreed to a time AND a matching appointment is recorded for this lead. If none is recorded within the wait, the run goes to “Needs human review” instead.',
  qualified_awaiting_scheduling: 'The homeowner is a real prospect, but no time was agreed yet.',
  callback_requested: 'The homeowner asked to be called back.',
  needs_human_review: 'The call ended but the result was unclear or unavailable. A person should take a look.',
  no_answer: 'Nobody picked up, or the line was busy, on the last attempt.',
  wrong_number: 'The person reached is not the homeowner.',
  opted_out: 'The homeowner asked not to be contacted again. Automated contact stops.',
  failed: 'The call could not be placed or was blocked, for example by calling hours or settings.',
  timed_out: 'No final result arrived before the "give up waiting" time you set.',
};

const TONE_DOT: Record<HandleDef['tone'], string> = {
  default: 'bg-primary',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-zinc-500',
  muted: 'bg-zinc-300 dark:bg-zinc-600',
};

function NextSteps({ node, graph }: { node: GraphNode; graph: WorkflowGraph }) {
  const handles = handlesFor(node.type, node.config);
  const isCall = node.type === 'ai_call';

  if (handles.length === 0) {
    return (
      <section aria-labelledby="next-heading" className="space-y-2">
        <h3 id="next-heading" className="text-sm font-semibold tracking-tight">Where this step goes next</h3>
        <p className="text-xs text-muted-foreground">Nothing. The workflow finishes here.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="next-heading" className="space-y-3">
      <div className="space-y-0.5">
        <h3 id="next-heading" className="text-sm font-semibold tracking-tight">Where this step goes next</h3>
        <p className="text-xs text-muted-foreground">Connect these on the canvas. An unconnected path ends the workflow there.</p>
      </div>
      {isCall ? (
        <Callout>
          Completed means the call ended; it does not mean the homeowner qualified. The result comes from the agent&apos;s post-call analysis.
        </Callout>
      ) : null}
      <ul className="divide-y rounded-md border">
        {handles.map((h) => {
          const edge = graph.edges.find((e) => e.source === node.id && e.sourceHandle === h.id);
          const target = edge ? graph.nodes.find((n) => n.id === edge.target) : undefined;
          const help = isCall ? OUTCOME_HELP[h.id as CallOutcome] : undefined;
          return (
            <li key={h.id} className="space-y-1 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', TONE_DOT[h.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{isCall ? CALL_OUTCOME_LABELS[h.id as CallOutcome] ?? h.label : h.label}</p>
                  {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
                </div>
              </div>
              <p className={cn('pl-[18px] text-xs', target ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {target ? `Connected to “${nodeDisplayName(target)}”` : 'Not connected. The workflow ends here.'}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Side-panel (desktop) / full-screen sheet (mobile) editor for one workflow step.
 * Single column, scrolls internally, and never mutates what it is given: every
 * change goes out through `onPatch` with a new config object.
 */
export function NodeConfigPanel({
  node,
  graph,
  issues,
  lookups,
  contractorId,
  readOnly,
  onPatch,
  onDuplicate,
  onDelete,
  onClose,
  previewContext,
}: NodeConfigPanelProps) {
  const def = NODE_TYPES[node.type];
  const ctx = useMemo(() => previewContext ?? sampleContext(), [previewContext]);
  const Form = FORMS[node.type];
  const style = CATEGORY_STYLE[def.category];
  const canChangeStructure = node.type !== 'trigger' && !readOnly;
  const nameId = `step-name-${node.id}`;

  const inline = INLINE_FIELDS[node.type];
  const topIssues = issues.filter((i) => !i.field || !inline.some((f) => i.field === f || i.field!.startsWith(`${f}.`)));

  const formProps: FormProps = {
    nodeId: node.id,
    config: node.config as Config,
    onChange: (config) => onPatch({ config }),
    readOnly,
    issues,
    lookups,
    contractorId,
    graph,
    ctx,
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background" data-testid="node-config-panel">
      <header className="shrink-0 space-y-3 border-b p-4">
        <div className="flex items-start gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.chip)}>
            <NodeIcon type={node.type} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight tracking-tight">{def.label}</h2>
            <p className="text-xs text-muted-foreground">{def.description}</p>
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0 items-center">
            {canChangeStructure ? (
              <>
                <Button type="button" variant="ghost" size="icon" aria-label="Duplicate step" onClick={onDuplicate}>
                  <Copy aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete step" onClick={onDelete}>
                  <Trash2 aria-hidden />
                </Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
              <X aria-hidden />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={nameId}>Step name</Label>
          <Input
            id={nameId}
            value={node.name ?? ''}
            placeholder={def.label}
            maxLength={120}
            disabled={readOnly}
            onChange={(e) => onPatch({ name: e.target.value.trim() ? e.target.value : null })}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 pb-8">
        {readOnly ? <Callout>This workflow is view-only right now, so its steps cannot be changed.</Callout> : null}

        {topIssues.length > 0 ? (
          <section aria-label="Things to fix in this step" className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Needs attention</p>
            <IssueMessages issues={topIssues} />
          </section>
        ) : null}

        <Form key={node.id} {...formProps} />

        <NextSteps node={node} graph={graph} />
      </div>
    </div>
  );
}
