import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getIntegrationByProvider, listIntakeEvents } from '@/lib/data/integrations';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { MetaSettingsForm } from '@/components/integrations/meta-settings-form';
import { SimulateLeadForm } from '@/components/integrations/simulate-lead-form';
import { IntakeEventsTable } from '@/components/integrations/intake-events-table';
import { Inbox } from 'lucide-react';

export const metadata = { title: 'Meta Lead Ads · HomeQuote Network' };

const FIELD_MAP: { meta: string; lead: string }[] = [
  { meta: 'full_name / first_name + last_name', lead: 'Name' },
  { meta: 'phone_number', lead: 'Phone' },
  { meta: 'email', lead: 'Email' },
  { meta: 'city / state / zip_code', lead: 'Location' },
  { meta: 'campaign_name / campaign_id', lead: 'Campaign' },
  { meta: 'adset_name / adset_id', lead: 'Ad set' },
  { meta: 'ad_name / ad_id', lead: 'Ad' },
  { meta: 'form_name / form_id', lead: 'Form' },
  { meta: 'leadgen_id', lead: 'External lead ID' },
];

export default async function MetaIntegrationPage() {
  await requireRole(['admin']);
  const integration = await getIntegrationByProvider('meta');
  if (!integration) notFound();

  const events = await listIntakeEvents({ provider: 'meta', limit: 10 });
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const webhookUrl = `${siteUrl}/api/integrations/meta/webhook`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meta Lead Ads"
        description="Facebook & Instagram Lead Ads. Configure the webhook, then test it."
        backHref="/app/integrations"
        backLabel="Integrations"
      />

      {/* Webhook endpoint */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook endpoint</CardTitle>
          <CardDescription>
            Add this Callback URL in the Meta app's Webhooks settings and use the
            verify token below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block break-all rounded-md border bg-muted/50 px-3 py-2 text-sm">
            {webhookUrl}
          </code>
        </CardContent>
      </Card>

      {/* Connection settings */}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            The verify token can be any string — paste the same value into Meta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetaSettingsForm integration={integration} />
        </CardContent>
      </Card>

      {/* Field mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Field mapping</CardTitle>
          <CardDescription>
            How Meta lead fields map into the normalized lead model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {FIELD_MAP.map((m) => (
              <li key={m.lead} className="flex justify-between gap-4 py-2">
                <code className="text-muted-foreground">{m.meta}</code>
                <span className="font-medium">{m.lead}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Sandbox / testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test the connection</CardTitle>
          <CardDescription>
            Send a simulated lead through the full intake pipeline — duplicate
            detection and attribution included — with no ad spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulateLeadForm integrationId={integration.id} />
        </CardContent>
      </Card>

      {/* Recent intake */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Recent Meta intake
        </h2>
        {events.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Meta leads yet"
            description="Send a test lead above, or connect a live page to see events here."
          />
        ) : (
          <IntakeEventsTable rows={events} showProvider={false} />
        )}
      </div>
    </div>
  );
}
