'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { createSeretApiKey } from '@/lib/actions/seret-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2">
        <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs">{value}</pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

export function CreateKeyForm({ mcpUrl }: { mcpUrl: string }) {
  const [state, action, pending] = useActionState(createSeretApiKey, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-600/30 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
        <p className="text-sm font-semibold">Key “{state.name}” created. Copy it now: it won’t be shown again.</p>
        <CopyBlock label="API key" value={state.key} />
        <CopyBlock label="Claude Code: run this in a terminal" value={`claude mcp add --transport http seret ${mcpUrl} --header "Authorization: Bearer ${state.key}"`} />
        <CopyBlock label="Claude (claude.ai / Desktop): Settings → Connectors → Add custom connector, then under Request headers add" value={`Authorization: Bearer ${state.key}`} />
        <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>Done</Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="key-name">Key name</Label>
        <Input id="key-name" name="name" placeholder="e.g. Claude on my laptop" maxLength={80} />
      </div>
      <Button type="submit" disabled={pending}>
        <KeyRound className="size-4" aria-hidden="true" />
        {pending ? 'Creating…' : 'Create API key'}
      </Button>
      {state && !state.ok && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}
