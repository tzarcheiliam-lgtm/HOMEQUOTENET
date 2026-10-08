import { notFound, redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { canManageContracts } from '@/lib/permissions';
import { ContractError } from '@/lib/contracts/errors';
import { getTemplate, listCategories } from '@/lib/contracts/templates';
import { TemplateEditor } from '@/components/contracts/template-editor';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Edit template · HomeQuote Network' };
export const maxDuration = 60;

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!canManageContracts(profile)) redirect('/app');
  const { id } = await params;
  const got = await getTemplate(profile, id).catch((e) => { if (e instanceof ContractError) return null; throw e; });
  if (!got) notFound();
  const { template: t, usageCount } = got;
  const categories = await listCategories(profile);
  return (
    <div className="space-y-4">
      <PageHeader title="Template" description="Edit sections, merge fields and defaults. Publish to make a new version available." backHref="/app/contracts/templates" backLabel="Templates" />
      <TemplateEditor
        key={t.id}
        id={t.id}
        status={t.status}
        isDefault={t.is_default}
        latestVersionNo={t.latest_version_no}
        usageCount={usageCount}
        categories={categories}
        initial={{ name: t.name, description: t.description ?? '', category: t.category, sections: t.sections, signerRoles: t.signer_roles, defaultVariables: t.default_variables, branding: t.branding, requiresReview: t.requires_review }}
      />
    </div>
  );
}
