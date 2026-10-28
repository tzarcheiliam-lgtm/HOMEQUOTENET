'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { createMcpKey } from '@/lib/actions/claude-connector';
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
        <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

const PERMS = [
  { value: 'write', label: 'Make changes', hint: 'Add notes to leads, change a lead’s status, and save workflow drafts (never published).' },
  { value: 'text', label: 'Text homeowners', hint: 'Send texts from your Mac. Every texting rule still applies; at most 30 texts a day per key.' },
];

export function CreateMcpKeyForm({ mcpUrl }: { mcpUrl: string }) {
  const [state, action, pending] = useActionState(createMcpKey, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-600/30 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
        <p className="text-sm font-semibold">Key “{state.name}” created ({state.scopes.join(', ')}). Copy it now: it won’t be shown again.</p>
        <CopyBlock label="Key" value={state.key} />
        <CopyBlock label="Claude Code: run this in a terminal" value={`claude mcp add --transport http homequote ${mcpUrl} --header "Authorization: Bearer ${state.key}"`} />
        <CopyBlock label="Claude (claude.ai / Desktop): Settings → Connectors → Add custom connector. URL:" value={mcpUrl} />
        <CopyBlock label="…then under Request headers add" value={`Authorization: Bearer ${state.key}`} />
        <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>Done</Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mcp-key-name">Key name</Label>
        <Input id="mcp-key-name" name="name" placeholder="e.g. Claude on my phone" maxLength={80} className="max-w-sm" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">What Claude can do with this key</legend>
        <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <input type="checkbox" checked readOnly disabled className="mt-0.5 size-4 accent-primary" />
          <span><span className="font-medium">Look things up</span><span className="mt-0.5 block text-xs text-muted-foreground">Leads, appointments, texting, workflows and a business summary. Always included.</span></span>
        </label>
        {PERMS.map((p) => (
          <label key={p.value} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="checkbox" name="scopes" value={p.value} className="mt-0.5 size-4 accent-primary" />
            <span><span className="font-medium">{p.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span></span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending}>
        <KeyRound className="size-4" aria-hidden="true" />
        {pending ? 'Creating…' : 'Create key'}
      </Button>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
