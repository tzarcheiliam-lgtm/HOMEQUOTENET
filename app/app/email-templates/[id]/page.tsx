import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getEmailTemplate } from '@/lib/data/email-templates';
import { TemplateEditor } from '@/components/emails/template-editor';
import { SendTestButton } from '@/components/emails/send-test-button';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Edit Email Template · HomeQuote Network' };

export default async function EmailTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const { id } = await params;
  const template = await getEmailTemplate(id);
  if (!template) notFound();
  if (profile.role === 'contractor' && !(template.contractorVisible && template.isActive)) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={template.name} description={template.category}>
        <Button asChild variant="ghost">
          <Link href="/app/email-templates">
            <ArrowLeft className="size-4" /> Back to templates
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Send a copy to yourself with sample data before using this template live.
          </p>
          <SendTestButton templateId={template.id} />
        </CardContent>
      </Card>

      {profile.role === 'admin' ? (
        <TemplateEditor template={template} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject: {template.subject}</p>
            <iframe title="Email preview" className="h-[500px] w-full rounded border bg-white" srcDoc={template.htmlBody} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
