import { notFound, redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { canManageSigning } from '@/lib/permissions';
import { SigningError } from '@/lib/signing/errors';
import { getTemplate } from '@/lib/signing/templates';
import { PageHeader } from '@/components/ui/page-header';
import { UseTemplateForm } from '@/components/signing/use-template-form';

export const metadata = { title: 'Use template · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function UseTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const { id } = await params;
  let tpl;
  try { tpl = await getTemplate(profile, id); } catch (e) { if (e instanceof SigningError) notFound(); throw e; }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={tpl.name} description="Enter who signs. The PDF and the field layout come from the template; you will review the placement before sending." backHref="/app/documents/templates" backLabel="Templates" />
      <UseTemplateForm templateId={tpl.id} defaultTitle={tpl.name} roles={tpl.roles} companyId={tpl.contractor_id} />
    </div>
  );
}
