import { Trash2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { publicSiteUrl } from '@/lib/auth/site-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideMcpAction, revokeMcpKey } from '@/lib/actions/claude-connector';
import { Button } from '@/components/ui/button';
import { TOOLS } from '@/lib/mcp/tools';
import { CreateMcpKeyForm } from '@/components/claude-connector/create-key-form';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmAction } from '@/components/ui/confirm-action';

export const metadata = { title: 'Claude connector · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const SCOPE_LABEL: Record<string, string> = { read: 'Look things up', write: 'Make changes', text: 'Text homeowners', assign: 'Propose assignments' };

export default async function ClaudeConnectorPage() {
  await requireRole(['admin']);
  const mcpUrl = `${publicSiteUrl()}/api/mcp`;
  const db = createAdminClient();
  const [{ data: keys, error }, { data: calls }, { data: pending }] = await Promise.all([
    db.from('mcp_api_keys').select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at').order('created_at', { ascending: false }),
    db.from('mcp_tool_calls').select('id, key_id, tool, summary, ok, created_at').order('created_at', { ascending: false }).limit(25),
    db.from('mcp_pending_actions').select('id, key_id, summary, payload, created_at, expires_at').eq('status', 'pending').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20),
  ]);
  const keyName = new Map((keys ?? []).map((k) => [k.id, k.name]));
  const toolTitle = new Map(TOOLS.map((t) => [t.name, t.title]));
  const groups = (['read', 'write', 'text', 'assign'] as const).map((s) => ({ scope: s, tools: TOOLS.filter((t) => t.scope === s) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Claude connector" description="Connect Claude to HomeQuote so you can ask it about your leads, appointments, texting and automations — and, if you allow it, have it make changes for you." />

      {error && (
        <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="py-4 text-sm">
            <p className="font-semibold">One setup step left: run the database update <code className="rounded bg-muted px-1">0067_homequote_mcp.sql</code>.</p>
          </CardContent>
        </Card>
      )}

      {(pending ?? []).length > 0 && (
        <Card id="approvals" className="border-primary/40">
          <CardHeader>
            <CardTitle>Waiting for your approval</CardTitle>
            <CardDescription>Claude asked to do these. Nothing happens until you approve; requests expire after 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {(pending ?? []).map((p) => {
                const reason = (p.payload as { reason?: string | null })?.reason;
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.summary}</p>
                      <p className="text-xs text-muted-foreground">{reason ? `“${reason}” · ` : ''}asked by {keyName.get(p.key_id ?? '') ?? 'Claude'} · {when(p.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <form action={decideMcpAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="decline" /><Button type="submit" variant="outline" size="sm">Decline</Button></form>
                      <form action={decideMcpAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="approve" /><Button type="submit" size="sm">Approve</Button></form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a key</CardTitle>
          <CardDescription>Each key connects one Claude and acts as you. Pick what it’s allowed to do; you can revoke it any time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateMcpKeyForm mcpUrl={mcpUrl} />
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p><span className="font-medium text-foreground">Server URL:</span> <code>{mcpUrl}</code></p>
            <p className="mt-1">Try asking: “How did leads do this week?”, “Who books today?”, “Add a note to Ada’s lead that she prefers evenings”, “Build me a workflow that texts new Meta leads and alerts me if they reply.”</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">What Claude can do</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g.scope} className="space-y-2">
              <p className="text-sm font-semibold">{SCOPE_LABEL[g.scope]}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">{g.tools.map((t) => <li key={t.name}>{t.title}</li>)}</ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">It can’t publish workflows, delete anything, place calls or touch billing, and it can only <em>ask</em> to assign a lead: you approve each one here.</p>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="border-b pt-6"><CardTitle className="text-base">Keys</CardTitle></CardHeader>
        <CardContent className="p-0">
          {keys?.length ? (
            <ul className="divide-y">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {k.name} {k.revoked_at ? <Badge variant="muted" className="ml-1">Revoked</Badge> : <Badge variant="success" className="ml-1">Active</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <code>{k.key_prefix}…</code> · {(k.scopes as string[]).map((s) => SCOPE_LABEL[s] ?? s).join(', ')} · created {when(k.created_at)} · last used {when(k.last_used_at)}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <ConfirmAction
                      action={revokeMcpKey}
                      fields={{ id: k.id }}
                      triggerLabel={<><Trash2 className="size-3.5" aria-hidden="true" /> Revoke</>}
                      title={`Revoke “${k.name}”?`}
                      description="Claude stops being able to use HomeQuote with this key right away. This can’t be undone; create a new key if you need access again."
                      confirmLabel="Revoke key"
                      destructive
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No keys yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="border-b pt-6">
          <CardTitle className="text-base">What Claude did recently</CardTitle>
          <CardDescription>Every tool call, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {calls?.length ? (
            <ul className="divide-y">
              {calls.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p>{toolTitle.get(c.tool) ?? c.tool}{c.summary ? <span className="text-muted-foreground"> · {c.summary}</span> : null}</p>
                    <p className="text-xs text-muted-foreground">{keyName.get(c.key_id ?? '') ?? 'Deleted key'} · {when(c.created_at)}</p>
                  </div>
                  <Badge variant={c.ok ? 'success' : 'danger'}>{c.ok ? 'Done' : 'Didn’t work'}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nothing yet. Once Claude uses HomeQuote, it shows up here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
