'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMetaPages, type IntegrationState } from '@/lib/actions/integrations';

export type MetaPageRow = {
  page_id: string;
  label: string | null;
  contractor_id: string | null;
  sender_name: string | null;
  /** Env var that holds this Page's token, and whether it is set. Never the token itself. */
  token_env: string;
  token_set: boolean;
};

export function MetaPagesForm({
  integrationId,
  pages,
  contractors,
}: {
  integrationId: string;
  pages: MetaPageRow[];
  contractors: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<IntegrationState, FormData>(saveMetaPages, undefined);
  const [rows, setRows] = useState<(MetaPageRow & { key: number })[]>(pages.map((p, i) => ({ ...p, key: i })));
  const [next, setNext] = useState(pages.length);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={integrationId} />

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No Pages listed. Add each Facebook Page whose Instant Form leads should be imported.
        </p>
      )}

      {rows.map((r) => (
        <div key={r.key} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`page_id_${r.key}`}>Page ID</Label>
            <Input id={`page_id_${r.key}`} name="page_id" defaultValue={r.page_id} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`label_${r.key}`}>Label</Label>
            <Input id={`label_${r.key}`} name="label" defaultValue={r.label ?? ''} placeholder="e.g. Pool Masters Inc." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`contractor_${r.key}`}>Contractor</Label>
            <select
              id={`contractor_${r.key}`}
              name="contractor_id"
              defaultValue={r.contractor_id ?? ''}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">HomeQuote Network (house)</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`sender_${r.key}`}>Text sender name</Label>
            <Input id={`sender_${r.key}`} name="sender_name" defaultValue={r.sender_name ?? ''} maxLength={40} placeholder="Blank = house name" />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
            <span>
              Page token: <code>{r.token_env}</code> —{' '}
              <strong className={r.token_set ? 'text-foreground' : 'text-destructive'}>
                {r.token_set ? 'set' : 'not set (uses the shared token)'}
              </strong>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
              <Trash2 className="mr-1 size-4" /> Remove
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRows((rs) => [...rs, { key: next, page_id: '', label: null, contractor_id: null, sender_name: null, token_env: 'META_PAGE_ACCESS_TOKEN_<page id>', token_set: false }]);
            setNext((n) => n + 1);
          }}
        >
          <Plus className="mr-1 size-4" /> Add Page
        </Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save Pages'}</Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
