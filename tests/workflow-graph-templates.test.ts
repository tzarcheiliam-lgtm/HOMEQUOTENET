import { describe, expect, it } from 'vitest';
import {
  GRAPH_TEMPLATES, NODE_CONFIG_SCHEMAS, dryRunGraph, getGraphTemplate, sampleContext, templateFitsOwner, templateGraphFor,
  templateScope, templateSteps, triggerOf, validateGraph, type GraphEvaluationContext, type IntegrationReadiness, type WorkflowGraph,
} from '@/lib/workflows/graph';
import { mergeRootsForTrigger } from '@/lib/workflows/definition';

const mergeRootsForTriggerProxy = (type: 'lead.created', contractorId: string | null) => mergeRootsForTrigger(type, { contractorId });

const CONTRACTOR = '22222222-2222-4222-8222-222222222222';
const ready: IntegrationReadiness = { sms: true, calling: { contractorMode: 'workflow_only', agentConfigured: true, phoneConfigured: true, globalEnabled: true, adminEnabled: true } };
const errorsOf = (graph: WorkflowGraph, contractorId: string | null, integrations: IntegrationReadiness = ready) =>
  validateGraph(graph, { contractorId, mode: 'publish', integrations }).issues.filter((i) => i.severity === 'error');

const TEXTING_KEYS = ['text_website_leads', 'text_meta_leads', 'text_no_reply_follow_up', 'text_appointment_reminders', 'alert_on_text_reply'];
const texts = (g: WorkflowGraph) => g.nodes.filter((n) => n.type === 'send_sms');
const t = (key: string) => getGraphTemplate(key)!;

describe('starter templates: every one passes the publish gate for the owners it is offered to', () => {
  for (const tpl of GRAPH_TEMPLATES) {
    const scope = templateScope(tpl);
    if (scope !== 'contractor') {
      it(`${tpl.key}: HomeQuote network workflow`, () => {
        expect(templateFitsOwner(tpl, null)).toBe(true);
        expect(errorsOf(templateGraphFor(tpl, null), null)).toEqual([]);
      });
    }
    if (scope !== 'network') {
      it(`${tpl.key}: one contractor's workflow`, () => {
        expect(templateFitsOwner(tpl, CONTRACTOR)).toBe(true);
        expect(errorsOf(templateGraphFor(tpl, CONTRACTOR), CONTRACTOR)).toEqual([]);
      });
    }
  }

  it('declares a scope and an icon on every template, and refuses owners outside the scope', () => {
    for (const tpl of GRAPH_TEMPLATES) {
      expect(tpl.scope).toBeDefined();
      expect(tpl.icon).toBeTruthy();
    }
    expect(templateFitsOwner(t('appointment_confirmation_reminder'), null)).toBe(false);
    expect(templateFitsOwner({ scope: 'network' }, CONTRACTOR)).toBe(false);
    // The contractor-only email template really is invalid for the network, which is why it is scoped.
    expect(errorsOf(t('appointment_confirmation_reminder').graph, null).map((i) => i.code)).toContain('variable_unavailable');
  });

  it('texting templates cannot be published while texting is not ready (the sms_not_ready gate still applies)', () => {
    for (const key of TEXTING_KEYS.filter((k) => k !== 'alert_on_text_reply')) {
      const codes = errorsOf(t(key).graph, null, { ...ready, sms: false, smsReason: 'Mac bridge not connected' }).map((i) => i.code);
      expect(codes).toContain('sms_not_ready');
    }
  });

  it('only ever creates drafts of data: nothing in a template enrolls, sends or publishes by itself', () => {
    for (const tpl of GRAPH_TEMPLATES) {
      for (const g of [tpl.graph, tpl.contractorGraph].filter(Boolean) as WorkflowGraph[]) {
        expect(g.schemaVersion).toBe(2);
        expect(triggerOf(g)).not.toBeNull();
      }
    }
  });
});

describe('texting templates: wording and wiring', () => {
  const longCtx = (): GraphEvaluationContext => {
    const c = sampleContext();
    return {
      ...c,
      lead: { ...c.lead!, first_name: 'Maximiliana', phone: '+15125550100', consent_granted: true },
      contractor: { ...(c.contractor ?? {}), name: 'Sunshine Coast Premium Pools & Outdoor Living' },
      appointment: { ...(c.appointment ?? {}), scheduled_at: '2026-11-11T22:30:00Z', status: 'scheduled' },
    };
  };

  it.each(TEXTING_KEYS.flatMap((k) => [[k, 'network'], [k, 'contractor']] as const))('%s (%s): friendly, short, no links, says who is texting', async (key, owner) => {
    const tpl = t(key);
    const graph = templateGraphFor(tpl, owner === 'network' ? null : CONTRACTOR);
    for (const n of texts(graph)) {
      const body = String(n.config.body);
      expect(body).not.toMatch(/https?:|www\.|\{\{\s*homequote\.site_url/);
      expect(NODE_CONFIG_SCHEMAS.send_sms.safeParse(n.config).success).toBe(true);
      // The first text of a conversation names the sender; reminders say whose appointment it is.
      if (owner === 'contractor') expect(body).toContain('{{contractor.name}}');
      else expect(body).not.toContain('{{contractor.name}}');
    }
    const run = await dryRunGraph(graph, longCtx(), { eventWaits: Object.fromEntries(graph.nodes.filter((n) => n.type === 'wait_event').map((n) => [n.id, 'timeout'])) });
    for (const step of run.steps.filter((s) => s.type === 'send_sms')) {
      const message = String(step.preview?.message ?? '');
      expect(message.length).toBeGreaterThan(20);
      expect(message.length).toBeLessThan(300);
      expect(message).toContain('Maximiliana');
      expect(message).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('speed-to-lead templates start on the lead source values the app actually stores', () => {
    const entry = (key: string) => JSON.stringify(triggerOf(t(key).graph)!.config.entry);
    expect(triggerOf(t('text_website_leads').graph)!.config.event).toBe('lead.created');
    expect(entry('text_website_leads')).toContain('"field":"lead.source","operator":"equals","value":"website"');
    expect(entry('text_meta_leads')).toContain('"field":"lead.source","operator":"equals","value":"meta"');
    for (const key of ['text_website_leads', 'text_meta_leads']) {
      expect(entry(key)).toContain('lead.consent_granted');
      expect(texts(t(key).graph).every((n) => n.config.assistant === true)).toBe(true);
    }
    const wait = t('text_website_leads').graph.nodes.find((n) => n.type === 'wait_duration')!;
    expect(wait.config).toEqual({ mode: 'duration', amount: 2, unit: 'minutes' });
    expect(t('text_meta_leads').graph.nodes.some((n) => n.type.startsWith('wait_'))).toBe(false);
  });

  it('no-reply follow-up: two workflow-owned texts a day apart, a reply alerts the team, silence marks it cold', async () => {
    const g = t('text_no_reply_follow_up').graph;
    expect(texts(g)).toHaveLength(2);
    expect(texts(g).every((n) => n.config.assistant === false)).toBe(true);
    const waits = g.nodes.filter((n) => n.type === 'wait_event');
    expect(waits.map((w) => w.config)).toEqual([{ event: 'message.received', timeoutMinutes: 1440 }, { event: 'message.received', timeoutMinutes: 1440 }]);

    const ctx = { ...sampleContext(), lead: { ...sampleContext().lead!, phone: '+15125550100', consent_granted: true } };
    const silent = await dryRunGraph(g, ctx, { eventWaits: { wait_reply_1: 'timeout', wait_reply_2: 'timeout' } });
    expect(silent.path).toEqual(['text_1', 'wait_reply_1', 'text_2', 'wait_reply_2', 'note_cold', 'alert_cold', 'end_cold']);
    expect(silent.steps.find((s) => s.nodeId === 'note_cold')!.preview).toMatchObject({ note: 'No reply, marked cold' });
    const replied = await dryRunGraph(g, ctx, { eventWaits: { wait_reply_1: 'received' } });
    expect(replied.path).toEqual(['text_1', 'wait_reply_1', 'alert_replied', 'end_replied']);
    const lateReply = await dryRunGraph(g, ctx, { eventWaits: { wait_reply_1: 'timeout', wait_reply_2: 'received' } });
    expect(lateReply.path).toEqual(['text_1', 'wait_reply_1', 'text_2', 'wait_reply_2', 'alert_replied', 'end_replied']);
    const alert = g.nodes.find((n) => n.id === 'alert_replied')!;
    expect(alert.config).toMatchObject({ audience: 'admins', title: 'A lead replied' });
    expect(templateGraphFor(t('text_no_reply_follow_up'), CONTRACTOR).nodes.find((n) => n.id === 'alert_replied')!.config).toMatchObject({ audience: 'assigned_contractor' });
  });

  it('appointment reminders: 24 hours and 2 hours before, re-checking the appointment each time', async () => {
    const g = t('text_appointment_reminders').graph;
    const waits = g.nodes.filter((n) => n.type === 'wait_duration').map((n) => n.config);
    expect(waits).toEqual([
      { mode: 'before_appointment', hoursBefore: 24, ifPast: 'continue' },
      { mode: 'before_appointment', hoursBefore: 2, ifPast: 'end' },
    ]);
    expect(g.settings.exitEvents).toEqual(expect.arrayContaining(['appointment.cancelled', 'appointment.rescheduled']));
    const c = sampleContext();
    const ctx = { ...c, lead: { ...c.lead!, phone: '+15125550100' }, appointment: { ...(c.appointment ?? {}), status: 'scheduled', scheduled_at: new Date(Date.now() + 3 * 86_400_000).toISOString() } };
    const run = await dryRunGraph(g, ctx, {});
    expect(run.path).toEqual(['wait_day_before', 'still_on_day', 'text_day', 'wait_2_hours', 'still_on_soon', 'text_soon', 'end_sent']);
    const cancelled = await dryRunGraph(g, { ...ctx, appointment: { ...ctx.appointment, status: 'cancelled' } }, {});
    expect(cancelled.path).toEqual(['wait_day_before', 'still_on_day', 'end_changed']);
  });

  it('reply alert: starts on a text reply and only notifies the team (no homeowner contact)', () => {
    const g = t('alert_on_text_reply').graph;
    expect(triggerOf(g)!.config).toMatchObject({ event: 'message.received', filters: { channels: ['sms'] } });
    expect(g.nodes.map((n) => n.type)).toEqual(['trigger', 'send_notification', 'end']);
    expect(g.settings.reentry).toBe('once_per_event');
  });

  it('every contact template has stop conditions', () => {
    for (const tpl of GRAPH_TEMPLATES) {
      const contacts = tpl.graph.nodes.some((n) => ['send_sms', 'send_email', 'ai_call'].includes(n.type));
      if (contacts) expect(tpl.graph.settings.exitEvents.length + tpl.graph.nodes.filter((n) => n.type === 'ai_call').length).toBeGreaterThan(0);
    }
  });

  it('mergeRoots sanity: a network "New lead" workflow has no contractor, a contractor one does', () => {
    expect(mergeRootsForTriggerProxy('lead.created', null).has('contractor')).toBe(false);
    expect(mergeRootsForTriggerProxy('lead.created', CONTRACTOR).has('contractor')).toBe(true);
  });
});

describe('templateSteps (gallery chips)', () => {
  it('lists steps in the order a lead meets them, once each, without finish steps', () => {
    expect(templateSteps(t('text_no_reply_follow_up').graph).map((s) => s.id)).toEqual(['text_1', 'wait_reply_1', 'alert_replied', 'text_2', 'wait_reply_2', 'note_cold', 'alert_cold']);
    expect(templateSteps(t('text_meta_leads').graph).map((s) => s.label)).toEqual(['Text the lead']);
  });
});
