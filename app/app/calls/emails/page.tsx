import { Mail, PlugZap } from 'lucide-react';
import type { GmailSenderStatus } from '@/lib/emails/gmail';
import { requireCallWorkspace } from '@/lib/auth';
import { listEmailProspects } from '@/lib/data/emails';
import { listEmailTemplates } from '@/lib/data/email-templates';
import { getGmailConnectionStatus } from '@/lib/emails/gmail';
import { emailLogoUrl } from '@/lib/emails/template';
import { homequoteSystemValues } from '@/lib/emails/variables';

const PROSPECT_TEMPLATE_CATEGORIES = [
  'Contractor Sales',
  'Contractor Onboarding',
  'Homeowner Follow-Up',
  'Estimate Follow-Up',
  'Appointments',
];
import { buttonVariants } from '@/components/ui/button';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { EmailComposer } from '@/components/calls/email-composer';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Emails · HomeQuote Network' };

const GMAIL_MESSAGES: Record<string, string> = {
  connected: 'Your Gmail is connected. Emails you send will come from that account.',
  connected_automation: 'Automation sender connected. Workflows, signing, lead and billing emails now send from that account.',
  forbidden: 'You do not have permission to connect that Gmail account.',
  invalid_state: 'Google connection expired or failed its security check. Try again.',
  cancelled: 'Google connection was cancelled.',
  token_error: 'Google did not return a usable Gmail connection. Check the OAuth setup and try again.',
  not_configured: 'Gmail OAuth environment variables are incomplete.',
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const [prospects, gmail, allTemplates] = await Promise.all([listEmailProspects(), getGmailConnectionStatus(me.id), listEmailTemplates()]);
  const params = await searchParams;
  const gmailResult = Array.isArray(params.gmail) ? params.gmail[0] : params.gmail;
  const logoUrl = emailLogoUrl(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const libraryTemplates = allTemplates
    .filter((t) => t.isActive && PROSPECT_TEMPLATE_CATEGORIES.includes(t.category))
    .map((t) => ({ key: t.key, category: t.category, name: t.name, subject: t.subject, textBody: t.textBody }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emails"
        description="Review and personally send a follow-up to one contractor or homeowner at a time."
      />

      <CallsSubnav />

      {gmailResult && GMAIL_MESSAGES[gmailResult] ? (
        <p role={gmailResult === 'connected' ? 'status' : 'alert'} className={`rounded-md border px-4 py-3 text-sm ${gmailResult === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {GMAIL_MESSAGES[gmailResult]}
        </p>
      ) : null}

      <SenderPanel
        environmentReady={gmail.environmentReady}
        mine={gmail.mine}
        automation={gmail.automation}
        isAdmin={me.role === 'admin'}
      />

      <EmailComposer
        prospects={prospects}
        gmailConnected={gmail.canSend}
        logoUrl={logoUrl}
        libraryTemplates={libraryTemplates}
        homequote={homequoteSystemValues()}
      />
    </div>
  );
}

function SenderRow({
  label,
  hint,
  status,
  href,
  empty,
}: {
  label: string;
  hint: string;
  status: GmailSenderStatus;
  href: string;
  empty: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {status ? (
            <>
              Sending as <span className="font-medium text-foreground">{status.email}</span>
            </>
          ) : (
            empty
          )}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {status?.lastError ? (
          <p role="alert" className="mt-1 text-xs text-amber-800">
            Last send failed: {status.lastError}. Reconnect to fix it.
          </p>
        ) : null}
      </div>
      <a href={href} className={buttonVariants({ variant: status ? 'outline' : 'default', size: 'sm' })}>
        <PlugZap className="size-4" aria-hidden="true" />
        {status ? 'Change account' : 'Connect Gmail'}
      </a>
    </div>
  );
}

function SenderPanel({
  environmentReady,
  mine,
  automation,
  isAdmin,
}: {
  environmentReady: boolean;
  mine: GmailSenderStatus;
  automation: GmailSenderStatus;
  isAdmin: boolean;
}) {
  if (!environmentReady) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Mail className="size-4" aria-hidden="true" />
        Gmail OAuth is not configured on this server.
      </div>
    );
  }
  return (
    <section aria-label="Email senders" className="divide-y rounded-md border px-4">
      <SenderRow
        label="Your sender"
        hint={
          mine
            ? 'Emails you send from this page go out from this account.'
            : automation
              ? `Until you connect your own Gmail, your emails go out from ${automation.email}.`
              : 'Connect your Google account to send from this page.'
        }
        status={mine}
        href="/api/integrations/gmail/oauth/start?kind=user"
        empty="Not connected"
      />
      {isAdmin ? (
        <SenderRow
          label="Automation sender"
          hint="Used by workflows, document signing, lead and billing emails, and as the fallback above. Choose any Google account, such as info@homequotenet.com."
          status={automation}
          href="/api/integrations/gmail/oauth/start?kind=automation"
          empty="Not connected"
        />
      ) : null}
    </section>
  );
}
