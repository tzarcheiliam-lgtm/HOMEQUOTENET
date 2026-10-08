import { notFound, redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { canManageContracts } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractError } from '@/lib/contracts/errors';
import { clientLogoUrl, loadContract } from '@/lib/contracts/contracts';
import { assetUrl } from '@/lib/contracts/storage';
import { brandingSchema, clientSchema, sectionsSchema, settingsSchema, type ContractSigner } from '@/lib/contracts/types';
import { ContractWizard } from '@/components/contracts/contract-wizard';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Prepare agreement · HomeQuote Network' };
export const maxDuration = 60;

export default async function EditContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const profile = await requireProfile();
  if (!canManageContracts(profile)) redirect('/app/contracts');
  const { id } = await params;
  const sp = await searchParams;
  const row = await loadContract(profile, id).catch((e) => { if (e instanceof ContractError) return null; throw e; });
  if (!row) notFound();
  const db = createAdminClient();
  // sent agreements are read-only: go to the record
  if (row.sent_at) redirect(`/app/contracts/${id}`);
  if (row.signing_version_id) {
    const { data: v } = await db.from('signing_versions').select('status').eq('id', row.signing_version_id).maybeSingle();
    if (v && v.status !== 'draft') redirect(`/app/contracts/${id}`);
  }
  const [{ data: cs }, { data: atts }] = await Promise.all([
    db.from('contractors').select('id,name,contact_name,email,phone,logo_path').order('name').limit(500),
    db.from('contract_attachments').select('id,filename,size_bytes,page_count').eq('contract_id', id).order('created_at'),
  ]);
  const contractors = await Promise.all((cs ?? []).map(async (c) => ({ id: c.id as string, name: (c.name ?? '') as string, contactName: (c.contact_name ?? '') as string, email: (c.email ?? '') as string, phone: (c.phone ?? '') as string, logoUrl: await assetUrl(c.logo_path) })));
  const branding = brandingSchema.parse(row.branding);
  const uploadedLogoUrl = branding.clientLogoPath ? await assetUrl(branding.clientLogoPath) : null;
  void clientLogoUrl;
  const step = Number(sp.step);
  return (
    <div className="space-y-4">
      <PageHeader title={row.title} description={`Agreement ${`HQ-C-${String(row.contract_no).padStart(5, '0')}`} · draft. Changes are saved automatically.`} backHref="/app/contracts" backLabel="Contracts" />
      <ContractWizard
        key={row.id}
        id={row.id}
        templateName={row.template_name ?? 'Agreement'}
        contractors={contractors}
        uploadedLogoUrl={uploadedLogoUrl}
        attachments={atts ?? []}
        initialStep={Number.isInteger(step) ? step : row.contractor_id || clientSchema.parse(row.client).company ? 2 : 1}
        initial={{
          title: row.title, contractorId: row.contractor_id, client: clientSchema.parse(row.client), variables: row.variables, branding,
          signers: (row.signers ?? []) as ContractSigner[], settings: settingsSchema.parse(row.settings ?? {}), sections: sectionsSchema.parse(row.sections),
        }}
      />
    </div>
  );
}
