import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/actions/workflow-graph', () => ({
  cancelGraphRunAction: vi.fn(async () => ({ ok: true, message: 'Run cancelled.' })),
  retryGraphRunAction: vi.fn(async () => ({ ok: true, message: 'Retrying.' })),
}));
// The canvas is only mounted in a desktop browser; the SSR pass renders the placeholder.
vi.mock('@/components/workflows/builder/graph-canvas', () => ({ GraphCanvas: () => null }));

import { RunDetailView } from '@/components/workflows/runs/run-detail';
import { RunList } from '@/components/workflows/runs/run-list';
import type { RunDetail, RunListItem } from '@/lib/data/workflow-graph';
import { GRAPH_TEMPLATES, buildRunOverlay } from '@/lib/workflows/graph';

const graph = GRAPH_TEMPLATES[0].graph;
const JOB = '11111111-1111-4111-8111-111111111111';

function fixture(status = 'waiting'): RunDetail {
  const base = { startedAt: '2026-10-07T15:00:00Z', completedAt: null, resumeAt: null, nextRetryAt: null, skipReason: null, handle: null, outcome: null, executionStatus: null, reason: null, callJobId: null, adopted: false, error: null, attemptCount: 1, maxAttempts: 1 };
  return {
    run: {
      id: 'run-1', workflowId: 'wf-1', workflowName: 'New lead call', workflowVersion: 3, status, mode: 'live', source: 'event', contractorId: 'c-1', contractorName: 'Blue Wave Pools',
      leadId: 'lead-1', leadName: 'Sarah Nguyen', triggerEvent: 'lead.assigned', enrolledAt: '2026-10-07T15:00:00Z', startedAt: '2026-10-07T15:00:01Z', completedAt: null,
      currentStepKey: 'task_review', resumeAt: '2026-10-09T16:00:00Z', paused: false, cancelReason: null, lastError: null, contactSuppressed: false, endReason: null,
    },
    graph,
    steps: [
      { ...base, id: 's1', nodeId: 'trigger', status: 'succeeded', handle: 'next' },
      { ...base, id: 's2', nodeId: 'call_homeowner', status: 'succeeded', handle: 'needs_human_review', outcome: 'needs_human_review', executionStatus: 'completed', reason: 'no_explicit_outcome', callJobId: JOB, attemptCount: 1, maxAttempts: 2, adopted: true },
      { ...base, id: 's3', nodeId: 'note_booked', status: 'skipped', skipReason: 'contact_suppressed', handle: 'next' },
      { ...base, id: 's4', nodeId: 'task_review', status: 'waiting', resumeAt: '2026-10-09T16:00:00Z' },
    ],
    waits: [],
    calls: [{ id: JOB, status: 'completed', attempts: 1, maxAttempts: 2, createdAt: '2026-10-07T15:01:00Z', source: 'workflow' }],
    appointments: [{ id: 'a1', scheduledAt: '2026-10-10T17:00:00Z', status: 'scheduled' }],
    logs: [{ id: 'l1', at: '2026-10-07T15:00:00Z', level: 'info', code: 'run.started', message: 'Run started' }],
  };
}

const render = (detail: RunDetail, canManage: boolean, isAdmin: boolean) =>
  renderToStaticMarkup(<RunDetailView detail={detail} canManage={canManage} isAdmin={isAdmin} />);

describe('RunDetailView', () => {
  it('explains the call result and execution status as two different things', () => {
    const html = render(fixture(), true, true);
    expect(html).toContain('Needs human review');
    expect(html).toContain('Execution status:');
    expect(html).toContain('completed');
    expect(html).toContain('Reused the call the automatic form-to-call feature already placed');
    expect(html).toContain('Skipped — homeowner opted out');
    expect(html).toContain('<ol');
  });

  it('shows Cancel run only to managers of an open run', () => {
    expect(render(fixture('waiting'), true, true)).toContain('Cancel run');
    expect(render(fixture('waiting'), false, true)).not.toContain('Cancel run');
    expect(render(fixture('completed'), true, true)).not.toContain('Cancel run');
    expect(render(fixture('failed'), true, true)).toContain('Retry failed step');
    expect(render(fixture('failed'), false, true)).not.toContain('Retry failed step');
  });

  it('links AI call records and shows the activity log to admins only', () => {
    const admin = render(fixture(), true, true);
    expect(admin).toContain(`/app/ai-calls/${JOB}`);
    expect(admin).toContain('Activity log');
    const other = render(fixture(), true, false);
    expect(other).not.toContain('/app/ai-calls/');
    expect(other).not.toContain('Activity log');
  });

  it('never prints raw objects or JSON', () => {
    for (const html of [render(fixture(), true, true), render(fixture('failed'), false, false)]) {
      expect(html).not.toContain('[object Object]');
      expect(html).not.toMatch(/&quot;|\{"/);
      expect(html).not.toContain('undefined');
    }
  });

  it('describes why a run is waiting and what went wrong in plain language', () => {
    expect(render(fixture(), false, false)).toMatch(/Waiting until/);
    const failed = fixture('failed');
    failed.run.lastError = { code: 'gmail_not_connected', message: 'Gmail is not connected' };
    const html = render(failed, true, false);
    expect(html).toContain('gmail_not_connected');
    expect(html).toContain('Gmail is not connected');
    const paused = fixture(); paused.run.paused = true;
    expect(render(paused, false, false)).toContain('Held while the workflow is paused');
  });
});

describe('RunList', () => {
  const item: RunListItem = {
    id: 'r1', workflowId: 'wf-1', workflowName: 'New lead call', workflowVersion: 3, contractorName: 'Blue Wave Pools', leadId: 'lead-1', leadName: 'Sarah Nguyen',
    trigger: 'lead.assigned', source: 'event', mode: 'test', status: 'waiting', currentStepKey: 'task_review', enrolledAt: '2026-10-07T15:00:00Z', resumeAt: '2026-10-09T16:00:00Z',
  };
  it('renders rows, hides the contractor column for non-admins and shows an empty state', () => {
    const admin = renderToStaticMarkup(<RunList runs={[item]} isAdmin filters={{}} workflows={[{ id: 'wf-1', name: 'New lead call' }]} />);
    expect(admin).toContain('/app/leads/lead-1');
    expect(admin).toContain('v3');
    expect(admin).toContain('Test');
    expect(admin).toContain('Blue Wave Pools');
    expect(renderToStaticMarkup(<RunList runs={[item]} isAdmin={false} />)).not.toContain('Blue Wave Pools');
    expect(renderToStaticMarkup(<RunList runs={[]} isAdmin={false} />)).toContain('No runs yet');
  });
});

describe('buildRunOverlay on the AI qualification template', () => {
  const steps = (handle: string, next: string) => [
    { nodeId: 'trigger', status: 'succeeded', handle: 'next' },
    { nodeId: 'call_homeowner', status: 'succeeded', handle },
    { nodeId: next, status: 'succeeded', handle: 'next' },
  ];
  it('follows the booked path', () => {
    const o = buildRunOverlay(graph, steps('booked', 'note_booked'), 'running', null);
    expect(o.nodes.call_homeowner.state).toBe('done');
    expect(o.nodes.note_booked.state).toBe('done');
    expect(o.nodes.task_no_answer).toBeUndefined();
  });
  it('follows the no_answer path instead', () => {
    const o = buildRunOverlay(graph, steps('no_answer', 'task_no_answer'), 'running', null);
    expect(o.nodes.task_no_answer.state).toBe('done');
    expect(o.nodes.note_booked).toBeUndefined();
    const edgeIds = graph.edges.filter((e) => e.source === 'call_homeowner' && e.sourceHandle === 'no_answer').map((e) => e.id);
    expect(edgeIds.every((id) => o.edges.has(id))).toBe(true);
  });
  it('stops at a waiting node', () => {
    const o = buildRunOverlay(graph, [{ nodeId: 'trigger', status: 'succeeded', handle: 'next' }, { nodeId: 'call_homeowner', status: 'waiting', handle: null }], 'waiting', 'call_homeowner');
    expect(o.nodes.call_homeowner.state).toBe('waiting');
  });
});
