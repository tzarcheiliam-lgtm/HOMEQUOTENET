import { Mail, PlugZap } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { listEmailProspects } from '@/lib/data/emails';
import { listEmailTemplates } from '@/lib/data/email-templates';
import { getGmailConnectionStatus } from '@/lib/emails/gmail';
import { emailLogoUrl } from '@/lib/emails/template';
import { homequoteSystemValues } from '@/lib/emails/variables';

const PROSPECT_TEMPLATE_CATEGORIES = ['Contractor Sales', 'Contractor Onboarding'];
import { buttonVariants } from '@/components/ui/button';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { EmailComposer } from '@/components/calls/email-composer';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Emails · HomeQuote Network' };

const GMAIL_MESSAGES: Record<string, string> = {
  connected: 'HomeQuote Gmail connected successfully.',
  forbidden: 'Only an administrator can connect Gmail.',
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
  const [prospects, gmail, allTemplates] = await Promise.all([listEmailProspects(), getGmailConnectionStatus(), listEmailTemplates()]);
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
        description="Review and personally send a follow-up to one contractor at a time."
      >
        {me.role === 'admin' ? (
          <a href="/api/integrations/gmail/oauth/start" className={buttonVariants({ variant: gmail.connected ? 'outline' : 'default' })}>
            <PlugZap className="size-4" aria-hidden="true" />
            {gmail.connected ? 'Reconnect Gmail' : gmail.environmentReady ? 'Connect Gmail' : 'Configure Gmail'}
          </a>
        ) : null}
      </PageHeader>

      <CallsSubnav />

      {gmailResult && GMAIL_MESSAGES[gmailResult] ? (
        <p role={gmailResult === 'connected' ? 'status' : 'alert'} className={`rounded-md border px-4 py-3 text-sm ${gmailResult === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {GMAIL_MESSAGES[gmailResult]}
        </p>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="size-4" aria-hidden="true" />
        {gmail.connected ? `Sending from ${gmail.email}` : gmail.environmentReady ? 'Gmail OAuth is configured but no account is connected.' : 'Gmail OAuth is not configured on this server.'}
      </div>

      <EmailComposer
        prospects={prospects}
        gmailConnected={gmail.connected}
        logoUrl={logoUrl}
        libraryTemplates={libraryTemplates}
        homequote={homequoteSystemValues()}
      />
    </div>
  );
}
