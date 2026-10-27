import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('@/lib/actions/workflow-graph', () => ({ archiveGraphAction: async () => ({ ok: true }) }));

import { DescribeWorkflowPanel } from '@/components/workflows/ai/describe-workflow-panel';
import { ChangeWithAi } from '@/components/workflows/ai/change-with-ai';
import { BuildProgress, ExplainList } from '@/components/workflows/ai/ai-parts';
import { AI_BUILD_EXAMPLES } from '@/lib/workflows/ai-builder/config';
import { explainGraph } from '@/lib/workflows/ai-builder/explain';
import { GRAPH_TEMPLATES } from '@/lib/workflows/graph';

describe('AI builder UI', () => {
  it('renders the describe panel with a labelled textarea, example chips, the build button and the remaining count', () => {
    const html = renderToStaticMarkup(<DescribeWorkflowPanel initialRemaining={12} contractors={[{ id: 'c1', name: 'Blue Wave Pools' }]} />);
    expect(html).toMatch(/Describe a workflow/);
    expect(html).toMatch(/<label[^>]*class="[^"]*sr-only[^"]*"[^>]*>What should the workflow do\?/);
    expect(html).toMatch(/<textarea/);
    for (const ex of AI_BUILD_EXAMPLES) expect(html).toContain(`>${ex.label}<`);
    expect(html).toMatch(/Build workflow/);
    expect(html).toMatch(/12 of 30 builds left today/);
    expect(html).toMatch(/unpublished draft/);
    expect(html).toMatch(/Blue Wave Pools/);
  });
  it('says plainly when no builds are left', () => {
    const html = renderToStaticMarkup(<DescribeWorkflowPanel initialRemaining={0} />);
    expect(html).toMatch(/You have used today’s 30 AI builds/);
  });
  it('shows progress as named steps with the current one marked', () => {
    const html = renderToStaticMarkup(<BuildProgress withSave progress={{ step: 'checking', attempt: 1, problems: null, seen: ['understanding', 'building', 'checking'] }} />);
    expect(html).toMatch(/Understanding your description/);
    expect(html).toMatch(/aria-current="step"[^>]*>.*Checking it against the workflow rules/);
    expect(html).toMatch(/Saving as a draft/);
    expect(html).toMatch(/motion-safe:animate-spin/); // reduced motion: no spinning
  });
  it('renders the compact "Change with AI" box and the plain-English explanation', () => {
    const g = GRAPH_TEMPLATES[0].graph;
    const html = renderToStaticMarkup(<ChangeWithAi workflowId="w" graph={g} flushSave={async () => true} getRevision={() => 1} onApply={() => undefined} initialRemaining={3} />);
    expect(html).toMatch(/Change with AI/);
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toMatch(/Explain this workflow/);
    const explained = renderToStaticMarkup(<ExplainList lines={explainGraph(g)} />);
    expect(explained).toMatch(/When: /);
  });
});
