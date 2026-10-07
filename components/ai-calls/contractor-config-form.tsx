'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { saveContractorCalling, type AiActionState } from '@/lib/actions/ai-calling';
import type { ContractorCallingRow } from '@/lib/data/ai-calling';

const MODE_LABEL = { off: 'Off', manual_only: 'Manual only', workflow_only: 'Workflow only (published automations place the calls)', automatic: 'Automatic (new form leads, and workflows)' } as const;

export function ContractorConfigForm({ row }: { row: ContractorCallingRow }) {
  const [state, action, pending] = useActionState<AiActionState, FormData>(saveContractorCalling, undefined);
  const s = row.settings;
  const cfg = row.config;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{row.name}</CardTitle>
        <Badge variant={cfg.status === 'ready' ? 'success' : cfg.status === 'incomplete' ? 'warning' : 'muted'}>
          {cfg.status === 'ready' ? 'Configured' : cfg.status === 'incomplete' ? 'Incomplete' : 'Off'}
        </Badge>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="contractor_id" value={row.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`mode-${row.id}`}>Calling mode</Label>
            <Select id={`mode-${row.id}`} name="mode" defaultValue={s?.mode ?? 'off'}>
              {Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`agent-${row.id}`}>Fish agent id</Label>
              <Input id={`agent-${row.id}`} name="agent_id" defaultValue={s?.agent_id ?? ''} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`pn-${row.id}`}>Fish phone number id</Label>
              <Input id={`pn-${row.id}`} name="phone_number_id" defaultValue={s?.phone_number_id ?? ''} autoComplete="off" />
            </div>
          </div>
          {cfg.missing.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Missing: {cfg.missing.join(', ')}. Calls are blocked until both are set.</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
            <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
