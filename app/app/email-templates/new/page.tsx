import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { TemplateEditor } from '@/components/emails/template-editor';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'New Email Template · HomeQuote Network' };

export default async function NewEmailTemplatePage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6">
      <PageHeader title="New template" description="Subject, HTML body, plain-text fallback, and a live preview.">
        <Button asChild variant="ghost">
          <Link href="/app/email-templates">
            <ArrowLeft className="size-4" /> Back to templates
          </Link>
        </Button>
      </PageHeader>
      <TemplateEditor />
    </div>
  );
}
