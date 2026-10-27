import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/actions/workflow-graph', () => ({
  createGraphWorkflowAction: vi.fn(async () => ({ ok: true, data: { id: 'wf-1' } })),
  cancelGraphRunAction: vi.fn(async () => ({ ok: true })),
  retryGraphRunAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/components/workflows/builder/graph-canvas', () => ({ GraphCanvas: () => null }));

import { GRAPH_TEMPLATES } from '@/lib/workflows/graph';
import { buildRunStory } from '@/lib/workflows/graph/run-story';
import { TemplateGallery, galleryCards } from '@/components/workflows/template-gallery';
import { CreateGraphForm } from '@/components/workflows/create-graph-form';
import { RunStory } from '@/components/workflows/runs/run-story';
import { RunDetailView } from '@/components/workflows/runs/run-detail';
import { RunList } from '@/components/workflows/runs/run-list';
import type { RunDetail } from '@/lib/data/workflow-graph';

const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const props = GRAPH_TEMPLATES.map(({ key, name, summary, description, requires }) => ({ key, name, summary, description, requires }));

describe('galleryCards', () => {
  it('describes each template: who it is for, how it starts and its steps', () => {
    const cards = galleryCards();
    expect(cards).toHaveLength(GRAPH_TEMPLATES.length);
    const website = cards.find((c) => c.key === 'text_website_leads')!;
    expect(website).toMatchObject({ scope: 'any', topic: 'texting', starts: 'New lead from Website Form', icon: 'MessageSquare' });
    expect(website.steps.map((s) => s.type)).toEqual(['wait_duration', 'send_sms']);
    expect(cards.find((c) => c.key === 'text_meta_leads')!.starts).toBe('New lead from Meta (Facebook/Instagram)');
    expect(cards.find((c) => c.key === 'appointment_confirmation_reminder')!.scope).toBe('contractor');
    expect(cards.find((c) => c.key === 'ai_qualification_call')!.topic).toBe('calls');
    expect(cards.find((c) => c.key === 'alert_on_text_reply')!.topic).toBe('alerts');
    expect(galleryCards(['text_meta_leads', 'nope']).map((c) => c.key)).toEqual(['text_meta_leads']);
  });
});

describe('TemplateGallery', () => {
  it('renders an accessible radio card per template with icon, description, scope and step chips', () => {
    const html = decode(renderToStaticMarkup(<TemplateGallery cards={galleryCards()} value="text_no_reply_follow_up" onChange={() => undefined} />));
    expect(html).toContain('role="radiogroup"');
    expect((html.match(/type="radio"/g) ?? []).length).toBe(GRAPH_TEMPLATES.length + 1);
    expect(html).toContain('Start from scratch');
    for (const t of GRAPH_TEMPLATES) expect(html).toContain(t.name);
    expect(html).toContain('For:');
    expect(html).toContain('HomeQuote leads or one contractor');
    expect(html).toContain('One contractor');
    expect(html).toContain('Wait up to 1 day for a reply');
    expect(html).toContain('+2 more');
    expect(html).toContain('Use this');
    expect(html).toContain('Selected');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(/undefined|\[object/);
  });
});

describe('CreateGraphForm', () => {
  const contractors = [{ id: '22222222-2222-4222-8222-222222222222', name: 'Blue Wave Pools' }];
  it('admins see every template and the account picker', () => {
    const html = decode(renderToStaticMarkup(<CreateGraphForm templates={props} contractors={contractors} fixedContractorId={null} canPickNetwork />));
    expect(html).toContain('Text new website leads in 2 minutes');
    expect(html).toContain('Alert me when a lead texts back');
    expect(html).toContain('HomeQuote network');
    expect(html).toContain('Blue Wave Pools');
    expect(html).toContain('texts are signed with their name');
  });
  it('a contractor owner gets no account picker and no network-only templates', () => {
    const html = decode(renderToStaticMarkup(<CreateGraphForm templates={props} contractors={[]} fixedContractorId={contractors[0].id} canPickNetwork={false} />));
    expect(html).not.toContain('id="wf-scope"');
    expect(html).toContain('Appointment booked → confirmation → reminder');
    expect(html).toContain('No reply follow-up');
  });
});

describe('RunStory and the run page', () => {
  const graph = GRAPH_TEMPLATES.find((t) => t.key === 'text_no_reply_follow_up')!.graph;
  const base = { status: 'succeeded', startedAt: '2026-10-27T16:00:00Z', completedAt: '2026-10-27T16:02:00Z', resumeAt: null, nextRetryAt: null, skipReason: null, handle: 'next', outcome: null, executionStatus: null, reason: null, callJobId: null, adopted: false, error: null, attemptCount: 1, maxAttempts: 1 };
  const detail: RunDetail = {
    run: {
      id: 'run-1', workflowId: 'wf-1', workflowName: 'No reply follow-up', workflowVersion: 1, status: 'waiting', mode: 'live', source: 'event', contractorId: null, contractorName: null,
      leadId: 'lead-1', leadName: 'Ada Lovelace', triggerEvent: 'lead.created', enrolledAt: '2026-10-27T16:00:00Z', startedAt: '2026-10-27T16:00:01Z', completedAt: null,
      currentStepKey: 'wait_reply_2', resumeAt: '2026-10-29T16:02:00Z', paused: false, cancelReason: null, lastError: null, contactSuppressed: false, endReason: null,
    },
    graph,
    steps: [
      { ...base, id: 's1', nodeId: 'trigger' },
      { ...base, id: 's2', nodeId: 'text_1' },
      { ...base, id: 's3', nodeId: 'wait_reply_1', handle: 'timed_out' },
      { ...base, id: 's4', nodeId: 'text_2', status: 'skipped', skipReason: 'text_not_sent', textSkip: 'The daily text limit was reached.' },
      { ...base, id: 's5', nodeId: 'wait_reply_2', status: 'waiting', handle: null, completedAt: null, resumeAt: '2026-10-29T16:02:00Z' },
    ],
    waits: [], calls: [], appointments: [], logs: [],
  };

  it('RunStory renders each sentence with its state in words', () => {
    const items = buildRunStory(detail, { timeZone: 'America/Los_Angeles' });
    const html = decode(renderToStaticMarkup(<RunStory items={items} timeZoneLabel="Pacific time" />));
    expect(html).toContain('Texted Ada at 9:02 AM');
    expect(html).toContain('Waited for a reply — no reply after 1 day');
    expect(html).toContain('Text not sent: the daily text limit was reached');
    expect(html).toContain('Waiting up to 1 day for Ada to reply');
    expect(html).toContain('<span class="sr-only">Skipped: </span>');
    expect(html).toContain('Pacific time');
    expect(renderToStaticMarkup(<RunStory items={[]} />)).toContain('Nothing has happened');
  });

  it('the run page leads with the story and keeps the technical detail behind a Details toggle', () => {
    const html = decode(renderToStaticMarkup(<RunDetailView detail={detail} canManage isAdmin />));
    expect(html).toContain('What happened');
    expect(html).toContain('Texted Ada at 9:02 AM');
    const details = html.indexOf('<details');
    expect(details).toBeGreaterThan(html.indexOf('Texted Ada at 9:02 AM'));
    expect(html.slice(details)).toContain('Details');
    expect(html.slice(details)).toContain('(text_not_sent)');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('the run list shows the plain-English headline', () => {
    const html = decode(renderToStaticMarkup(<RunList isAdmin runs={[{
      id: 'r1', workflowId: 'wf-1', workflowName: 'No reply follow-up', workflowVersion: 1, contractorName: null, leadId: 'lead-1', leadName: 'Ada Lovelace',
      trigger: 'lead.created', source: 'event', mode: 'live', status: 'waiting', currentStepKey: 'wait_reply_2', enrolledAt: '2026-10-27T16:00:00Z', resumeAt: null,
      headline: 'Waiting up to 1 day for Ada to reply',
    }]} />));
    expect(html).toContain('What happened last');
    expect(html).toContain('Waiting up to 1 day for Ada to reply');
  });
});
