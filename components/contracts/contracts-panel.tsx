import Link from 'next/link';
import { FileSignature, Plus, ShieldCheck } from 'lucide-react';
import { ContractsList } from '@/components/contracts/contracts-list';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listContracts } from '@/lib/contracts/contracts';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Contractor profile (admin): every agreement with this company, the one in force, and signing progress. */
export async function ContractsPanel({ actor, contractorId }: { actor: Profile; contractorId: string }) {
  const rows = await listContracts(actor, { contractorId, sort: 'created_desc' }).catch(() => []);
  const active = rows.find((r) => r.status === 'completed');
  const inProgress = rows.filter((r) => r.open).length;
  return (
    <Card id="contracts">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><FileSignature className="size-4" /> Contracts</CardTitle>
        <Link href={`/app/contracts/new?contractor=${contractorId}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}><Plus className="size-4" /> New agreement</Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <ShieldCheck className="size-4" aria-hidden="true" /> Active agreement: <Link href={`/app/contracts/${active.id}`} className="font-medium underline underline-offset-2">{active.title}</Link>
          </p>
        ) : <p className="text-sm text-muted-foreground">{rows.length ? 'No completed agreement yet.' : 'No agreements yet. Create one from a template in about two minutes.'}</p>}
        {inProgress > 0 && <p className="text-sm text-muted-foreground">{inProgress} awaiting signature.</p>}
        {rows.length > 0 && <ContractsList rows={rows} admin compact />}
      </CardContent>
    </Card>
  );
}
