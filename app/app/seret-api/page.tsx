import { Trash2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { publicSiteUrl } from '@/lib/auth/site-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { revokeSeretApiKey } from '@/lib/actions/seret-api';
import { describe, recentGenerations } from '@/lib/seret/engine';
import { CreateKeyForm } from '@/components/seret/create-key-form';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmAction } from '@/components/ui/confirm-action';

export const metadata = { title: 'Seret API · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default async function SeretApiPage() {
  await requireRole(['admin']);
  const mcpUrl = `${publicSiteUrl()}/api/seret/mcp`;
  const kieConfigured = !!process.env.KIE_API_KEY;
  const { data: keys } = await createAdminClient()
    .from('seret_api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false });
  const recent = kieConfigured ? await Promise.all((await recentGenerations(10)).map(describe)) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Seret API" description="Connect Claude to Seret so it can make images and videos for ads, using your kie.ai credits." />

      {!kieConfigured && (
        <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="py-4 text-sm">
            <p className="font-semibold">One setup step left: the server needs a kie.ai key.</p>
            <p className="mt-1 text-muted-foreground">
              In Vercel → Project → Settings → Environment Variables, add <code className="rounded bg-muted px-1">KIE_API_KEY</code> with your kie.ai API key
              (Production), then redeploy. Keys work for connecting now, but generating will fail until this is set.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a key</CardTitle>
          <CardDescription>
            Each key lets one Claude connect to Seret. Give it a name you’ll recognize, and revoke it any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateKeyForm mcpUrl={mcpUrl} />
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p><span className="font-medium text-foreground">Server URL:</span> <code>{mcpUrl}</code></p>
            <p className="mt-1">
              Claude gets these tools: list models, list ad presets, generate an image, start a video, check a job, list recent work.
              Ask it things like “Make three 9:16 images for a pool remodel ad.”
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="border-b pt-6">
          <CardTitle className="text-base">Keys</CardTitle>
        </CardHeader>
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
                      <code>{k.key_prefix}…</code> · created {when(k.created_at)} · last used {when(k.last_used_at)}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <ConfirmAction
                      action={revokeSeretApiKey}
                      fields={{ id: k.id }}
                      triggerLabel={<><Trash2 className="size-3.5" aria-hidden="true" /> Revoke</>}
                      title={`Revoke “${k.name}”?`}
                      description="Anything using this key stops working right away. This can’t be undone; create a new key if you need access again."
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

      {kieConfigured && (
        <Card className="p-0">
          <CardHeader className="border-b pt-6">
            <CardTitle className="text-base">Made through the API</CardTitle>
            <CardDescription>The latest images and videos Claude made with Seret. Links last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length ? (
              <ul className="divide-y">
                {recent.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1">{g.prompt}</p>
                      <p className="text-xs text-muted-foreground">{g.kind} · {g.model} · {when(g.created_at)}{g.error ? ` · ${g.error}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={g.status === 'failed' ? 'danger' : g.status === 'success' ? 'success' : 'muted'}>{g.status}</Badge>
                      {g.url && <a href={g.url} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline">Open</a>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nothing yet. Once Claude makes something, it shows up here.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
