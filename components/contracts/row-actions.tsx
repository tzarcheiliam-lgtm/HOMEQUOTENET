'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Copy, Download, Eye, History, MoreHorizontal, PencilLine, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toaster';
import { contractFileAction, deleteDraftContractAction, duplicateContractAction } from '@/lib/actions/contracts';
import type { ContractStatus } from '@/lib/contracts/status';

/** Per-row actions on the dashboard: View, Edit draft, Duplicate, Send, Resend/Void (on the record), Download PDF, Audit history. */
export function ContractRowActions({ id, status, title, admin }: { id: string; status: ContractStatus; title: string; admin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const draft = status === 'draft';
  const openStatus = status === 'sent' || status === 'viewed' || status === 'partially_signed';
  const download = () => start(async () => {
    const r = await contractFileAction(id, status === 'completed' ? 'final' : 'original');
    if (!r.ok) return toast(r.error, 'error');
    window.location.assign(r.url);
  });
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${title}`} disabled={pending}><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!draft && <DropdownMenuItem asChild><Link href={`/app/contracts/${id}`}><Eye /> View</Link></DropdownMenuItem>}
        {admin && draft && <DropdownMenuItem asChild><Link href={`/app/contracts/${id}/edit`}><PencilLine /> Edit draft</Link></DropdownMenuItem>}
        {admin && draft && <DropdownMenuItem asChild><Link href={`/app/contracts/${id}/edit?step=5`}><Send /> Send</Link></DropdownMenuItem>}
        {admin && openStatus && <DropdownMenuItem asChild><Link href={`/app/contracts/${id}#signers`}><Send /> Resend / remind</Link></DropdownMenuItem>}
        {!draft && <DropdownMenuItem onSelect={download}><Download /> Download PDF</DropdownMenuItem>}
        {admin && !draft && <DropdownMenuItem asChild><Link href={`/app/contracts/${id}#audit`}><History /> Audit history</Link></DropdownMenuItem>}
        {admin && <DropdownMenuItem onSelect={() => start(async () => { const r = await duplicateContractAction(id); if (!r.ok) return toast(r.error, 'error'); toast('Duplicated as a new draft.'); router.push(`/app/contracts/${r.id}/edit`); })}><Copy /> Duplicate</DropdownMenuItem>}
        {admin && openStatus && <DropdownMenuItem variant="destructive" asChild><Link href={`/app/contracts/${id}#void`}><Ban /> Void…</Link></DropdownMenuItem>}
        {admin && draft && <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => { if (window.confirm(`Delete the draft “${title}”?`)) start(async () => { const r = await deleteDraftContractAction(id); if (!r.ok) return toast(r.error, 'error'); toast('Draft deleted.'); router.refresh(); }); }}><Trash2 /> Delete draft</DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
