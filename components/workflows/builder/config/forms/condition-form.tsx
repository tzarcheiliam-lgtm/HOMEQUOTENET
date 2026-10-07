'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ancestorsOf } from '@/lib/workflows/graph';
import type { WorkflowConditionGroup } from '@/lib/workflows';
import { ConditionGroupEditor } from '../condition-editor';
import { Callout, Field, IssueMessages, issuesFor, type FormProps } from './shared';

const MAX_BRANCHES = 5;
type Branch = { id: string; label: string; conditions: WorkflowConditionGroup };

function readBranches(config: FormProps['config']): Branch[] {
  const raw = Array.isArray(config.branches) ? (config.branches as unknown[]) : [];
  return raw.flatMap((b) => {
    if (!b || typeof b !== 'object') return [];
    const o = b as Record<string, unknown>;
    if (typeof o.id !== 'string') return [];
    const conditions = o.conditions && typeof o.conditions === 'object' && Array.isArray((o.conditions as WorkflowConditionGroup).conditions) ? (o.conditions as WorkflowConditionGroup) : { match: 'all' as const, conditions: [] };
    return [{ id: o.id, label: typeof o.label === 'string' ? o.label : '', conditions }];
  });
}

/** `branch_<n>`: the next number above every existing one. Ids are what connections attach to, so they never change after creation. */
function nextBranchId(branches: Branch[]): string {
  const used = new Set(branches.map((b) => b.id));
  let n = branches.reduce((max, b) => Math.max(max, Number(/^branch_(\d+)$/.exec(b.id)?.[1] ?? 0)), 0) + 1;
  while (used.has(`branch_${n}`)) n += 1;
  return `branch_${n}`;
}

export function ConditionForm({ nodeId, config, onChange, readOnly, issues, graph }: FormProps) {
  const branches = readBranches(config);
  const hasCallUpstream = [...ancestorsOf(graph, nodeId)].some((id) => graph.nodes.find((n) => n.id === id)?.type === 'ai_call');
  const write = (next: Branch[]) => onChange({ ...config, branches: next });
  const update = (i: number, patch: Partial<Branch>) => write(branches.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...branches];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    write(next);
  };
  const branchIssues = (b: Branch, i: number) => [...issuesFor(issues, `branches.${b.id}`), ...issuesFor(issues, `branches.${i}`)];

  return (
    <div className="space-y-6">
      <Callout>
        <p>Branches are checked top to bottom. The first one that matches wins; if none match, the workflow follows <strong>Else</strong>.</p>
        {!hasCallUpstream ? <p>AI call fields only have a value after a Call homeowner step.</p> : null}
      </Callout>

      {branches.map((b, i) => {
        const own = branchIssues(b, i);
        return (
          <section key={b.id} className="space-y-4 rounded-lg border p-3" aria-label={`Branch ${i + 1}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{i === 0 ? 'If' : 'Else if'} (branch {i + 1})</p>
              <div className="flex items-center">
                <Button type="button" variant="ghost" size="icon" disabled={readOnly || i === 0} aria-label={`Move branch ${i + 1} up`} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={readOnly || i === branches.length - 1} aria-label={`Move branch ${i + 1} down`} onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={readOnly || branches.length <= 1} aria-label={`Remove branch ${i + 1}`} onClick={() => write(branches.filter((_, idx) => idx !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>
            <Field label="Branch name" required issues={issuesFor(issues, `branches.${i}.label`)}>
              {(a) => <Input {...a} value={b.label} maxLength={60} disabled={readOnly} onChange={(e) => update(i, { label: e.target.value })} />}
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Take this path when</p>
              <ConditionGroupEditor
                value={b.conditions}
                allowGraphOnly
                readOnly={readOnly}
                onChange={(next) => update(i, { conditions: next ?? { match: 'all', conditions: [] } })}
              />
            </div>
            <IssueMessages issues={own.filter((x) => !x.field?.endsWith('.label'))} />
          </section>
        );
      })}

      <IssueMessages issues={issues.filter((x) => x.field === 'branches')} />
      <Button
        type="button"
        variant="outline"
        disabled={readOnly || branches.length >= MAX_BRANCHES}
        onClick={() =>
          write([
            ...branches,
            {
              id: nextBranchId(branches),
              label: `Branch ${branches.length + 1}`,
              conditions: { match: 'all', conditions: [{ field: 'lead.status', operator: 'equals', value: 'new' }] },
            },
          ])
        }
      >
        <Plus aria-hidden /> Add a branch
      </Button>
      {branches.length >= MAX_BRANCHES ? <p className="text-xs text-muted-foreground">A step can have up to {MAX_BRANCHES} branches, plus Else.</p> : null}

      <div className="rounded-lg border border-dashed p-3 text-sm">
        <p className="font-medium">Else</p>
        <p className="text-xs text-muted-foreground">Everything that matches none of the branches above.</p>
      </div>
    </div>
  );
}
