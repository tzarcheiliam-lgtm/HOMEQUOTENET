import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { renderWorkflowTemplate, formatWorkflowDateTime, resolveMergeField } from '@/lib/workflows/merge';
import { parseWorkflowDefinition, validateWorkflowForEnable, mergeRootsForTrigger } from '@/lib/workflows/definition';
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates';
import type { WorkflowEvaluationContext } from '@/lib/workflows/planner';
import { checkWebhookUrl, isBlockedAddress, postWebhook, safeLookup } from '@/lib/workflows/webhook-safety.server';

const ctx = (over: Partial<WorkflowEvaluationContext> = {}): WorkflowEvaluationContext => ({
  contractor: null, lead: null, assignment: null, appointment: null, estimate: null, event: { payload: {} }, ...over,
});

// ---------------------------------------------------------------------------
// Rendering (lib/workflows/merge.ts — the one workflow renderer)
// ---------------------------------------------------------------------------
describe('merge field rendering', () => {
  it('uses the first name when present and "there" when missing — never "Hi ,"', () => {
    expect(renderWorkflowTemplate('Hi {{lead.first_name}},', ctx({ lead: { first_name: 'Liam' } }))).toBe('Hi Liam,');
    expect(renderWorkflowTemplate('Hi {{lead.first_name}},', ctx({ lead: { first_name: null } }))).toBe('Hi there,');
    expect(renderWorkflowTemplate('Hi {{lead.first_name}},', ctx({ lead: { first_name: '   ' } }))).toBe('Hi there,');
    expect(renderWorkflowTemplate('Hi {{lead.first_name}},', ctx())).toBe('Hi there,');
  });

  it('never leaves a gap before punctuation or a double space for other empty values', () => {
    const t = 'Your project in {{lead.city}}. Thanks, {{lead.first_name}} {{lead.last_name}}!';
    expect(renderWorkflowTemplate(t, ctx({ lead: { first_name: 'Dana', last_name: null, city: null } }))).toBe('Your project in. Thanks, Dana!');
    expect(renderWorkflowTemplate('Hello {{lead.last_name}} and welcome', ctx({ lead: {} }))).toBe('Hello and welcome');
  });

  it('renders appointment times as readable local time, never ISO/UTC', () => {
    // 21:30 UTC on Fri 25 Sep 2026 = 2:30 PM in Los Angeles (PDT).
    const at = '2026-09-25T21:30:00.000Z';
    expect(formatWorkflowDateTime(at)).toBe('Friday, September 25 at 2:30 PM');
    expect(formatWorkflowDateTime(at, 'America/New_York')).toBe('Friday, September 25 at 5:30 PM');
    expect(formatWorkflowDateTime('not a date')).toBe('');
    const out = renderWorkflowTemplate('Confirmed for {{appointment.scheduled_at}}.', ctx({ appointment: { scheduled_at: at } }));
    expect(out).toBe('Confirmed for Friday, September 25 at 2:30 PM.');
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T|Z\b|UTC/);
  });

  it('formats estimate amounts as currency', () => {
    expect(resolveMergeField(ctx({ estimate: { amount: 42000 } }), 'estimate.amount')).toBe('$42,000');
    expect(resolveMergeField(ctx({ estimate: { amount: '1234.5' } }), 'estimate.amount')).toBe('$1,234.50');
  });

  it('uses HOMEQUOTE_PHONE when configured and omits the line when it is not', () => {
    const t = 'Hi {{lead.first_name}},\n\nJust reply to this email.\nYou can also call us at {{homequote.phone}}.\n\nHomeQuote';
    const values = ctx({ lead: { first_name: 'Liam' } });
    expect(renderWorkflowTemplate(t, values, { phone: '(818) 555-2142' }))
      .toBe('Hi Liam,\n\nJust reply to this email.\nYou can also call us at (818) 555-2142.\n\nHomeQuote');
    expect(renderWorkflowTemplate(t, values, {})).toBe('Hi Liam,\n\nJust reply to this email.\n\nHomeQuote');
    expect(renderWorkflowTemplate(t, values, { phone: '  ' })).not.toContain('call us');
  });

  it('keeps the shipped No Answer template readable with and without a phone number', () => {
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.key === 'no_answer_follow_up')!;
    const step = tpl.definition.steps.find((s) => s.stepType === 'action' && s.action.type === 'send_email')!;
    const body = step.stepType === 'action' && step.action.type === 'send_email' ? String(step.action.config.body) : '';
    const noPhone = renderWorkflowTemplate(body, ctx({ lead: {} }));
    expect(noPhone).toMatch(/^Hi there,\n/);
    expect(noPhone).toContain('Just reply to this email');
    expect(noPhone).not.toMatch(/call us|\{\{| ,/);
  });
});

// ---------------------------------------------------------------------------
// Trigger / variable compatibility (canonical validateWorkflowForEnable)
// ---------------------------------------------------------------------------
const emailWorkflow = (trigger: string, body: string, extraSteps: unknown[] = []) => parseWorkflowDefinition({
  name: 'Readiness', trigger: { type: trigger, config: {} },
  steps: [
    { key: 'email_lead', position: 0, stepType: 'action', action: { type: 'send_email', config: { to: { kind: 'lead' }, subject: 'Hello', body } } },
    ...extraSteps,
  ],
});
const variableIssues = (def: ReturnType<typeof emailWorkflow>, contractorId: string | null = null) =>
  validateWorkflowForEnable(def, { contractorId }).filter((i) => i.code === 'variable_unavailable').map((i) => i.message);

describe('trigger-variable compatibility', () => {
  it('flags appointment variables on a new-lead trigger with a clear message', () => {
    expect(variableIssues(emailWorkflow('lead.created', 'See you {{appointment.scheduled_at}}'))).toEqual([
      'Cannot enable workflow: {{appointment.scheduled_at}} is not available for the New lead trigger.',
    ]);
  });

  it('allows lead + appointment variables on appointment triggers', () => {
    expect(variableIssues(emailWorkflow('appointment.booked', 'Hi {{lead.first_name}}, see you {{appointment.scheduled_at}} at {{appointment.location}}'))).toEqual([]);
  });

  it('allows lead (contact) variables on message.received', () => {
    expect(variableIssues(emailWorkflow('message.received', 'Reply from {{lead.first_name}}'))).toEqual([]);
  });

  it('flags estimate variables outside estimate.sent and contractor variables where no contractor exists', () => {
    expect(variableIssues(emailWorkflow('lead.created', 'Estimate {{estimate.amount}}'))).toHaveLength(1);
    expect(variableIssues(emailWorkflow('estimate.sent', 'Estimate {{estimate.amount}} from {{contractor.name}}'))).toEqual([]);
    // A HomeQuote workflow on a network-level trigger has no contractor to name…
    expect(variableIssues(emailWorkflow('lead.created', 'From {{contractor.name}}'))).toHaveLength(1);
    // …a contractor-owned workflow always does.
    expect(variableIssues(emailWorkflow('lead.created', 'From {{contractor.name}}'), '00000000-0000-4000-8000-000000000001')).toEqual([]);
  });

  it('flags waits anchored to an appointment time on a trigger with no appointment', () => {
    const def = emailWorkflow('lead.created', 'Hi', [
      { key: 'remind', position: 1, stepType: 'action', action: { type: 'wait', config: { mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -60 } } },
    ]);
    expect(variableIssues(def)).toEqual(['Cannot enable workflow: {{appointment.scheduled_at}} is not available for the New lead trigger.']);
  });

  it('exposes the roots per trigger and keeps every shipped template compatible', () => {
    expect([...mergeRootsForTrigger('appointment.no_show', { contractorId: null })].sort()).toEqual(['appointment', 'contractor', 'homequote', 'lead']);
    for (const t of WORKFLOW_TEMPLATES) {
      expect(validateWorkflowForEnable(t.definition, { contractorId: null }).filter((i) => i.code === 'variable_unavailable')).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// Webhook SSRF protection
// ---------------------------------------------------------------------------
describe('webhook target safety', () => {
  it.each([
    '127.0.0.1', '127.8.8.8', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.10', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::10.0.0.1',
  ])('blocks %s', (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(['8.8.8.8', '172.32.0.1', '104.16.0.1', '2606:4700::1111'])('allows public %s', (ip) => expect(isBlockedAddress(ip)).toBe(false));

  it('rejects unsafe URLs before any DNS lookup', () => {
    expect(checkWebhookUrl('http://example.com/hook')).toEqual({ ok: false, reason: 'https_required' });
    expect(checkWebhookUrl('https://user:pw@example.com/hook')).toEqual({ ok: false, reason: 'credentials_in_url' });
    for (const u of ['https://localhost/x', 'https://api.localhost/x', 'https://printer.local/x', 'https://metadata.google.internal/x', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://169.254.169.254/latest']) {
      expect(checkWebhookUrl(u).ok).toBe(false);
    }
    expect(checkWebhookUrl('https://hooks.zapier.com/hooks/catch/1/abc').ok).toBe(true);
  });

  const fakeResolve = (addresses: string[]) => (_host: string, _o: unknown, cb: (e: null, a: { address: string; family: number }[]) => void) =>
    cb(null, addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })));

  it('blocks public-looking hostnames that resolve to private addresses (no connection is made)', async () => {
    for (const addrs of [['10.0.0.5'], ['169.254.169.254'], ['93.184.216.34', '127.0.0.1'], ['::ffff:192.168.0.1']]) {
      await expect(postWebhook('https://rebind.example.com/hook', { headers: {}, body: '{}', resolve: fakeResolve(addrs) as never }))
        .resolves.toEqual({ ok: false, reason: 'blocked', detail: 'blocked_address' });
    }
  });

  it('hands public addresses to the connection (single and all-address lookups)', async () => {
    const lookup = safeLookup(fakeResolve(['93.184.216.34', '2606:4700::1111']) as never);
    await new Promise<void>((done) => lookup('example.com', {}, (err: unknown, address: unknown, family: unknown) => {
      expect(err).toBeNull(); expect(address).toBe('93.184.216.34'); expect(family).toBe(4); done();
    }));
    await new Promise<void>((done) => lookup('example.com', { all: true }, (err: unknown, list: unknown) => {
      expect(err).toBeNull(); expect(list).toHaveLength(2); done();
    }));
  });
});
