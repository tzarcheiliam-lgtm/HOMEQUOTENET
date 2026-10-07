import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { canManageSigning, isHqnAdministrator } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { UploadForm } from '@/components/signing/upload-form';

export const metadata = { title: 'New document · HomeQuote Network' };
export const maxDuration = 60;

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ lead?: string; contractor?: string }> }) {
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const sp = await searchParams;
  const supabase = await createClient();
  const admin = isHqnAdministrator(profile);
  const contractors = admin ? ((await supabase.from('contractors').select('id,name').order('name')).data ?? []) : null;
  let leadName: string | null = null; let leadId: string | null = null;
  if (sp.lead && /^[0-9a-f-]{36}$/i.test(sp.lead)) {
    const { data: l } = await supabase.from('leads').select('id,first_name,last_name').eq('id', sp.lead).maybeSingle();
    if (l) { leadId = l.id; leadName = [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead'; }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New document" description="Upload a PDF to prepare it for signing." backHref="/app/documents" backLabel="Documents">
        <Link href="/app/documents/templates" className="text-sm font-medium text-primary hover:underline">Start from a template instead</Link>
      </PageHeader>
      <UploadForm contractors={contractors} fixedContractorId={admin ? null : profile.contractor_id} defaultContractorId={admin && sp.contractor && /^[0-9a-f-]{36}$/i.test(sp.contractor) ? sp.contractor : ''} leadId={leadId} leadName={leadName} />
    </div>
  );
}
