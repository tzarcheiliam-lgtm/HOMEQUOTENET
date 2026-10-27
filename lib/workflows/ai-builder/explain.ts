import { conditionField, type WorkflowCondition, type WorkflowConditionGroup } from '../conditions';
import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '../events';
import { describeNode } from '../graph/edit';
import { CALL_PURPOSE_TEXT, NODE_TYPES, handlesFor, nodeDisplayName, type CallPurpose, type GraphNode, type WorkflowGraph } from '../graph/model';

/**
 * "Explain this workflow": a plain-English walk of any graph, from the trigger down every path.
 * Pure and model-free, so it is exactly what the engine would do (it reads the same graph), and it is
 * what the AI builder's result card shows as "the steps" (never the model's own description).
 */
export interface ExplainLine { depth: number; text: string; nodeId?: string; kind: 'trigger' | 'step' | 'branch' | 'jump' }

const DAY = 1440;
export function humanMinutes(m: number): string {
  if (m % DAY === 0) return `${m / DAY} day${m / DAY === 1 ? '' : 's'}`;
  if (m % 60 === 0) return `${m / 60} hour${m / 60 === 1 ? '' : 's'}`;
  return `${m} minute${m === 1 ? '' : 's'}`;
}
const quote = (s: unknown, max = 70) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return `“${t.length > max ? `${t.slice(0, max - 1)}…` : t}”`;
};
const words = (s: string) => s.replaceAll('_', ' ');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AUDIENCE: Record<string, string> = {
  admins: 'HomeQuote admins', assigned_setter: 'the assigned setter', assigned_caller: 'the assigned caller', assigned_contractor: 'the contractor team', specific_user: 'a chosen team member',
};

function conditionText(c: WorkflowCondition | WorkflowConditionGroup): string {
  if ('match' in c) return c.conditions.map(conditionText).join(c.match === 'all' ? ' and ' : ' or ');
  const label = conditionField(c.field)?.label ?? c.field.replace(/^event\.payload\./, 'event ');
  const v = Array.isArray(c.value) ? c.value.map((x) => words(String(x))).join(' / ') : c.value === undefined ? '' : words(String(c.value));
  switch (c.operator) {
    case 'exists': return `${label} is set`;
    case 'not_exists': return `${label} is empty`;
    case 'in': return `${label} is ${v}`;
    case 'not_in': return `${label} is not ${v}`;
    default: return `${label} ${words(c.operator)} ${v}`;
  }
}

function eventLabel(e: unknown): string {
  return WORKFLOW_TRIGGERS[e as WorkflowEventType]?.label ?? words(String(e ?? 'something'));
}

/** One sentence for one step. */
export function describeStep(node: GraphNode): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = node.config as Record<string, any>;
  const named = node.name?.trim() ? `${node.name.trim()}: ` : '';
  switch (node.type) {
    case 'send_email':
      return `${named}Email ${c.to?.kind === 'recipients' ? 'chosen recipients' : 'the homeowner'}${c.templateId ? ' a saved template' : c.subject ? ` ${quote(c.subject, 60)}` : ''}`;
    case 'send_sms':
      return `${named}Text the homeowner ${quote(c.body)}`;
    case 'ai_call':
      return `${named}AI call the homeowner (${CALL_PURPOSE_TEXT[c.purpose as CallPurpose]?.label.toLowerCase() ?? 'call'}), up to ${c.maxAttempts ?? 1} attempt${(c.maxAttempts ?? 1) > 1 ? 's' : ''}`;
    case 'create_task':
      return `${named}Create a staff task ${quote(c.title)}${typeof c.dueInMinutes === 'number' ? `, due in ${humanMinutes(c.dueInMinutes)}` : ''}`;
    case 'add_note':
      return `${named}Add a lead note ${quote(c.body)}`;
    case 'update_lead_status':
      return `${named}Move the ${c.pipeline === 'assignment' ? 'contractor stage' : 'lead stage'} to “${words(String(c.status ?? ''))}”`;
    case 'assign_lead':
      return `${named}Assign the lead (${c.strategy === 'specific' ? 'one person' : `round robin of ${(c.userIds ?? []).length}`})`;
    case 'send_notification':
      return `${named}Alert ${AUDIENCE[c.audience] ?? 'the team'}: ${quote(c.title, 60)}`;
    case 'wait_duration':
      return c.mode === 'before_appointment' ? `${named}Wait until ${c.hoursBefore} hours before the appointment` : `${named}Wait ${humanMinutes(Number(c.amount) * ({ minutes: 1, hours: 60, days: DAY } as Record<string, number>)[c.unit as string])}`;
    case 'wait_business_hours': {
      const days = (c.days ?? [1, 2, 3, 4, 5]) as number[];
      return `${named}Wait for business hours (${c.startHour ?? 9}:00–${c.endHour ?? 17}:00, ${days.map((d) => DAYS[d]).join(', ')})`;
    }
    case 'wait_event':
      return `${named}Wait up to ${humanMinutes(Number(c.timeoutMinutes))} for “${eventLabel(c.event)}”`;
    case 'condition':
      return `${named}Check which applies`;
    case 'end':
      return `${named}End${c.reason ? ` (${c.reason})` : ''}`;
    default:
      return `${named}${NODE_TYPES[node.type]?.label ?? node.type}: ${describeNode(node)}`;
  }
}

function branchLabel(node: GraphNode, handleId: string, handleLabel: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = node.config as Record<string, any>;
  if (node.type === 'condition') {
    if (handleId === 'else') return 'Otherwise';
    const b = (c.branches ?? []).find((x: { id: string }) => x.id === handleId);
    return b ? `If ${b.label}${b.conditions ? ` (${conditionText(b.conditions)})` : ''}` : `If ${handleLabel}`;
  }
  if (node.type === 'wait_event') return handleId === 'received' ? 'If it happens' : `If not within ${humanMinutes(Number(c.timeoutMinutes))}`;
  if (node.type === 'ai_call') return `If the call result is “${handleLabel}”`;
  return handleLabel;
}

export function explainGraph(graph: WorkflowGraph): ExplainLine[] {
  const lines: ExplainLine[] = [];
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  if (!trigger) return [{ depth: 0, text: 'No trigger yet: this workflow never starts.', kind: 'trigger' }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tc = trigger.config as Record<string, any>;
  const filters = tc.filters && typeof tc.filters === 'object' ? Object.entries(tc.filters as Record<string, unknown[]>).filter(([, v]) => Array.isArray(v) && v.length) : [];
  lines.push({
    depth: 0, kind: 'trigger', nodeId: trigger.id,
    text: `When: ${eventLabel(tc.event)}${filters.length ? ` (${filters.map(([k, v]) => `${words(k).replace(/statuses$/, 'status')} ${v.map((x) => words(String(x))).join(' / ')}`).join('; ')})` : ''}${tc.entry ? `, only if ${conditionText(tc.entry)}` : ''}`,
  });
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const number = new Map<string, number>();
  let counter = 0;
  const next = (id: string, handle: string) => {
    const e = graph.edges.find((x) => x.source === id && x.sourceHandle === handle);
    return e ? byId.get(e.target) ?? null : null;
  };
  const walk = (node: GraphNode | null, depth: number, guard: number) => {
    let cur = node;
    while (cur && guard < 400) {
      guard += 1;
      if (number.has(cur.id)) { lines.push({ depth, kind: 'jump', nodeId: cur.id, text: `Continue at step ${number.get(cur.id)} (${nodeDisplayName(cur)})` }); return; }
      counter += 1;
      number.set(cur.id, counter);
      lines.push({ depth, kind: 'step', nodeId: cur.id, text: `${counter}. ${describeStep(cur)}` });
      const handles = handlesFor(cur.type, cur.config);
      if (handles.length === 0) return;
      if (handles.length === 1) { cur = next(cur.id, handles[0].id); continue; }
      const connected = handles.filter((h) => next(cur!.id, h.id));
      for (const h of connected) {
        lines.push({ depth: depth + 1, kind: 'branch', nodeId: cur.id, text: `${branchLabel(cur, h.id, h.label)}:` });
        walk(next(cur.id, h.id), depth + 2, guard);
      }
      const open = handles.length - connected.length;
      if (open > 0 && cur.type !== 'ai_call') lines.push({ depth: depth + 1, kind: 'branch', text: `${open === handles.length ? 'Then the workflow ends' : 'Any other result: the workflow ends'}` });
      else if (open > 0) lines.push({ depth: depth + 1, kind: 'branch', text: 'Any other call result: the workflow ends' });
      return;
    }
  };
  walk(next(trigger.id, 'next'), 0, 0);
  if (counter === 0) lines.push({ depth: 0, kind: 'step', text: 'No steps yet.' });
  return lines;
}

/** The same walk as plain text, one line per entry (indented with spaces). */
export function explainGraphText(graph: WorkflowGraph): string {
  return explainGraph(graph).map((l) => `${'  '.repeat(l.depth)}${l.text}`).join('\n');
}
