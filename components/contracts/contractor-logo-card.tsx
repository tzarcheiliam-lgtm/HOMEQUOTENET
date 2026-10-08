'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { ClientMark } from '@/components/contracts/client-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { removeCrmLogoAction, uploadLogoAction } from '@/lib/actions/contracts';

/** The company logo saved on the CRM record. It is reused automatically on every new agreement. */
export function ContractorLogoCard({ contractorId, name, logoUrl }: { contractorId: string; name: string; logoUrl: string | null }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData(); fd.set('file', file); fd.set('contractorId', contractorId); fd.set('saveToCrm', 'true');
    const r = await uploadLogoAction(fd);
    setBusy(false);
    if (ref.current) ref.current.value = '';
    if (!r.ok) return toast(r.error, 'error');
    toast('Logo saved.'); router.refresh();
  };
  return (
    <Card>
      <CardHeader><CardTitle>Company logo</CardTitle><CardDescription>Shown beside the HomeQuote logo on contracts. PNG, JPG or WebP, up to 2 MB.</CardDescription></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <ClientMark name={name} url={logoUrl} size={64} />
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="crm-logo-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {logoUrl ? 'Change logo' : 'Upload logo'}</Button>
          {logoUrl && <Button type="button" variant="destructive-outline" size="sm" disabled={busy} onClick={async () => { setBusy(true); const r = await removeCrmLogoAction(contractorId); setBusy(false); if (!r.ok) return toast(r.error, 'error'); toast('Logo removed.'); router.refresh(); }}><Trash2 className="size-4" /> Remove</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
