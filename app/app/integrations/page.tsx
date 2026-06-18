import Link from 'next/link';
import { Plug, Settings2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listIntegrations } from '@/lib/data/integrations';
import { getConnector } from '@/lib/integrations/connectors';
import { toggleIntegration } from '@/lib/actions/integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Integrations · HomeQuote Network' };

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  connected: 'success',
  error: 'warning',
  disconnected: 'muted',
  disabled: 'muted',
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : 'Never';

export default async function IntegrationsPage() {
  await requireRole(['admin']);
  const integrations = await listIntegrations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect lead sources. Every source flows through one intake pipeline."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((it) => {
          const connector = getConnector(it.provider);
          const implemented = connector?.implemented ?? false;
          const isMeta = it.provider === 'meta';

          return (
            <Card key={it.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{it.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {connector?.description ?? it.provider}
                  </p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Plug className="size-4 text-muted-foreground" />
                </span>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[it.status] ?? 'muted'}>
                    {it.status}
                  </Badge>
                  {it.is_enabled ? (
                    <Badge variant="secondary">Enabled</Badge>
                  ) : (
                    <Badge variant="muted">Disabled</Badge>
                  )}
                  {!implemented && <Badge variant="muted">Coming soon</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last activity: {fmt(it.last_activity_at)}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {isMeta && (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/integrations/meta">
                        <Settings2 className="size-4" /> Configure
                      </Link>
                    </Button>
                  )}
                  {implemented && (
                    <form action={toggleIntegration}>
                      <input type="hidden" name="id" value={it.id} />
                      <input
                        type="hidden"
                        name="enable"
                        value={(!it.is_enabled).toString()}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant={it.is_enabled ? 'ghost' : 'default'}
                      >
                        {it.is_enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
