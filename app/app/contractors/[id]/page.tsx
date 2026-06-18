import { notFound } from 'next/navigation';
import { Trash2, Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { getContractor } from '@/lib/data/contractors';
import { listVerticals } from '@/lib/data/verticals';
import {
  deleteContractor,
  deletePricingAgreement,
  updateContractor,
} from '@/lib/actions/contractors';
import { ContractorForm } from '@/components/contractors/contractor-form';
import { VerticalsForm } from '@/components/contractors/verticals-form';
import { PricingAgreementForm } from '@/components/contractors/pricing-agreement-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { PricingAgreement } from '@/lib/types';

export const metadata = { title: 'Contractor · HomeQuote Network' };

const money = (n: number | null) =>
  n === null ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

function summarize(a: PricingAgreement): string {
  switch (a.model) {
    case 'per_lead':
      return `${money(a.per_lead_amount)} / lead`;
    case 'per_appointment':
      return `${money(a.per_appointment_amount)} / appointment`;
    case 'revenue_share':
      return `${a.revenue_share_pct ?? '—'}% revenue share`;
    case 'subscription':
      return `${money(a.subscription_amount)} / ${a.subscription_period ?? 'period'}`;
    case 'hybrid': {
      const parts: string[] = [];
      if (a.per_lead_amount != null) parts.push(`${money(a.per_lead_amount)}/lead`);
      if (a.per_appointment_amount != null)
        parts.push(`${money(a.per_appointment_amount)}/appt`);
      if (a.revenue_share_pct != null) parts.push(`${a.revenue_share_pct}% rev`);
      return `Hybrid: ${parts.join(' + ') || '—'}`;
    }
    default:
      return a.model;
  }
}

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin']);
  const { id } = await params;

  const [detail, verticals] = await Promise.all([
    getContractor(id),
    listVerticals(),
  ]);
  if (!detail) notFound();

  const { contractor, verticalIds, agreements } = detail;

  return (
    <div className="space-y-8">
      <PageHeader
        title={contractor.name}
        backHref="/app/contractors"
        backLabel="Contractors"
      >
        <Badge variant="muted">{contractor.status}</Badge>
        <form action={deleteContractor}>
          <input type="hidden" name="id" value={contractor.id} />
          <Button type="submit" variant="outline" size="sm">
            <Trash2 className="size-4" /> Delete
          </Button>
        </form>
      </PageHeader>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Business contact and service information.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContractorForm
            action={updateContractor}
            contractor={contractor}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      {/* Verticals */}
      <Card>
        <CardHeader>
          <CardTitle>Verticals served</CardTitle>
          <CardDescription>
            Which lead categories this contractor can receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerticalsForm
            contractorId={contractor.id}
            allVerticals={verticals}
            selectedIds={verticalIds}
          />
        </CardContent>
      </Card>

      {/* Pricing agreements */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing agreements</CardTitle>
          <CardDescription>
            How this contractor is billed. You can have several (e.g. different
            models per vertical).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agreements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pricing agreements yet.
            </p>
          ) : (
            <div className="space-y-3">
              {agreements.map((a) => (
                <div key={a.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{summarize(a)}</span>
                        {a.is_exclusive && (
                          <Badge variant="secondary">Exclusive</Badge>
                        )}
                        {!a.is_active && <Badge variant="muted">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.vertical ? a.vertical.name : 'All verticals'}
                        {a.notes ? ` · ${a.notes}` : ''}
                      </p>
                    </div>
                    <form action={deletePricingAgreement}>
                      <input type="hidden" name="id" value={a.id} />
                      <input
                        type="hidden"
                        name="contractor_id"
                        value={contractor.id}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-primary">
                      Edit
                    </summary>
                    <div className="mt-3">
                      <PricingAgreementForm
                        contractorId={contractor.id}
                        verticals={verticals}
                        agreement={a}
                      />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          <details className="rounded-lg border border-dashed p-4">
            <summary className="flex cursor-pointer items-center gap-1 text-sm font-medium">
              <Plus className="size-4" /> Add pricing agreement
            </summary>
            <div className="mt-4">
              <PricingAgreementForm
                contractorId={contractor.id}
                verticals={verticals}
              />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
