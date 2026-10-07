import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CALL_OUTCOMES,
  CALL_OUTCOME_LABELS,
  GRAPH_NODE_TYPES,
  NODE_TYPES,
  defaultConfigFor,
  emptyGraph,
  type GraphIssue,
  type GraphNode,
  type GraphNodeType,
} from '@/lib/workflows/graph';
import type { BuilderLookups } from '@/lib/data/workflow-graph';
import { NodeConfigPanel } from '@/components/workflows/builder/config/node-config-panel';
import { TemplateField } from '@/components/workflows/builder/config/template-field';
import { ConditionGroupEditor } from '@/components/workflows/builder/config/condition-editor';
import { VariablePicker } from '@/components/workflows/builder/config/variable-picker';

const ID = '11111111-1111-4111-8111-111111111111';

const lookups: BuilderLookups = {
  emailTemplates: [{ id: ID, name: 'Welcome email', subject: 'Welcome aboard' }],
  teamMembers: [{ id: ID, name: 'Pat Contractor', role: 'owner' }],
  recipients: [{ id: ID, name: 'Dispatch', email: 'dispatch@example.com' }],
  calling: { mode: 'workflow_only', agentConfigured: true, phoneConfigured: false, globalEnabled: true, adminEnabled: false },
  smsConnected: false,
};

function nodeOf(type: GraphNodeType): GraphNode {
  return { id: type === 'trigger' ? 'trigger' : `${type}_1`, type, position: { x: 0, y: 0 }, config: defaultConfigFor(type) };
}

function render(node: GraphNode, opts: { readOnly?: boolean; contractorId?: string | null; issues?: GraphIssue[] } = {}) {
  const base = emptyGraph();
  const graph = node.type === 'trigger' ? base : { ...base, nodes: [...base.nodes, node] };
  return renderToStaticMarkup(
    <NodeConfigPanel
      node={node}
      graph={graph}
      issues={opts.issues ?? []}
      lookups={lookups}
      contractorId={opts.contractorId ?? null}
      readOnly={opts.readOnly ?? false}
      onPatch={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onClose={() => undefined}
    />
  );
}

const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('NodeConfigPanel', () => {
  for (const type of GRAPH_NODE_TYPES) {
    for (const readOnly of [false, true]) {
      it(`renders ${type} (readOnly=${readOnly})`, () => {
        const html = render(nodeOf(type), { readOnly });
        expect(html).toContain(NODE_TYPES[type].label);
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('[object Object]');
        expect(html).not.toContain('NaN');
      });
    }
  }

  it('hides duplicate/delete for the trigger and when read-only', () => {
    expect(render(nodeOf('trigger'))).not.toContain('Delete step');
    expect(render(nodeOf('add_note'), { readOnly: true })).not.toContain('Delete step');
    expect(render(nodeOf('add_note'))).toContain('Delete step');
    expect(render(nodeOf('add_note'))).toContain('Duplicate step');
  });

  it('shows the SMS step as requiring setup', () => {
    const html = render(nodeOf('send_sms'));
    expect(html).toContain('Requires setup');
    expect(decode(html)).toContain(NODE_TYPES.send_sms.setupNote);
  });

  it('lists all 9 AI call result paths and the completed-vs-qualified note', () => {
    const html = decode(render(nodeOf('ai_call')));
    expect(CALL_OUTCOMES).toHaveLength(9);
    for (const outcome of CALL_OUTCOMES) expect(html).toContain(CALL_OUTCOME_LABELS[outcome]);
    expect(html).toContain('Completed means the call ended; it does not mean the homeowner qualified.');
    expect(html).toContain('What the Fish agent must return');
  });

  it('shows calling readiness with plain guidance when not ready', () => {
    const html = decode(render(nodeOf('ai_call')));
    expect(html).toContain('Mode: Workflow only');
    expect(html).toContain('Phone number is not set');
    expect(html).toContain('Ask a HomeQuote admin');
  });

  it('only offers the contractor pipeline and own-team notifications to contractor workflows', () => {
    const status = render(nodeOf('update_lead_status'), { contractorId: ID });
    expect(status).toContain('Contractor pipeline stage');
    expect(status).toContain('not allowed here');
    const notify = render(nodeOf('send_notification'), { contractorId: ID });
    expect(notify).not.toContain('HomeQuote admins');
  });

  it('shows saved recipients only for network workflows', () => {
    expect(render(nodeOf('send_email'), { contractorId: null })).toContain('Saved recipients');
    expect(render(nodeOf('send_email'), { contractorId: ID })).not.toContain('Saved recipients');
  });

  it('shows inline messages under matching controls and unmatched ones at the top', () => {
    const issues: GraphIssue[] = [
      { severity: 'error', code: 'a', message: 'Subject problem', field: 'subject' },
      { severity: 'warning', code: 'b', message: 'General problem' },
    ];
    const node = { ...nodeOf('send_email'), config: { ...defaultConfigFor('send_email') } };
    const html = render(node, { issues });
    expect(html).toContain('Subject problem');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Needs attention');
    expect(html).toContain('General problem');
  });

  it('describes trigger entry rules and that publishing never enrolls existing leads', () => {
    const html = render(nodeOf('trigger'));
    expect(html).toContain('Only enroll leads that match');
    expect(html).toContain('Publishing never enrolls existing leads');
  });

  it('shows a plain-language summary for business hours', () => {
    expect(decode(render(nodeOf('wait_business_hours')))).toContain('Wait until the next weekday between 9:00 AM and 5:00 PM');
  });
});

describe('TemplateField', () => {
  it('previews with the sample homeowner and flags unknown variables', () => {
    const html = renderToStaticMarkup(
      <TemplateField label="Message" value="Hi {{lead.first_name}} {{lead.nope}}" onChange={() => undefined} />
    );
    expect(html).toContain('Preview for Sarah Nguyen');
    expect(html).toContain('Hi Sarah');
    expect(html).toContain('lead.nope');
    expect(html).toContain('Insert variable');
  });

  it('warns about variables with no value', () => {
    const html = renderToStaticMarkup(
      <TemplateField
        label="Message"
        value="Project: {{lead.project_type}}"
        onChange={() => undefined}
        ctx={{ lead: { first_name: 'Lee' }, contractor: null, assignment: null, appointment: null, estimate: null, call: null, event: { payload: {} } }}
      />
    );
    expect(html).toContain('has no value for this lead, so it will be left out');
  });
});

describe('ConditionGroupEditor', () => {
  it('preserves nested groups it cannot edit', () => {
    const html = renderToStaticMarkup(
      <ConditionGroupEditor
        readOnly={false}
        onChange={() => undefined}
        value={{
          match: 'all',
          conditions: [
            { field: 'lead.status', operator: 'equals', value: 'new' },
            { match: 'any', conditions: [{ field: 'lead.city', operator: 'equals', value: 'Austin' }] },
          ],
        }}
      />
    );
    expect(html).toContain('Advanced rules preserved');
    expect(html).toContain('Rule 1');
  });

  it('hides call fields unless graph-only fields are allowed', () => {
    const value = { match: 'all' as const, conditions: [{ field: 'lead.status', operator: 'equals' as const, value: 'new' }] };
    const without = renderToStaticMarkup(<ConditionGroupEditor readOnly={false} onChange={() => undefined} value={value} />);
    const withCalls = renderToStaticMarkup(<ConditionGroupEditor readOnly={false} onChange={() => undefined} value={value} allowGraphOnly />);
    expect(without).not.toContain('AI call result');
    expect(withCalls).toContain('AI call result');
  });
});

describe('VariablePicker', () => {
  it('renders a closed button', () => {
    const html = renderToStaticMarkup(<VariablePicker onPick={() => undefined} />);
    expect(html).toContain('Insert variable');
    expect(html).toContain('aria-expanded="false"');
  });
});
