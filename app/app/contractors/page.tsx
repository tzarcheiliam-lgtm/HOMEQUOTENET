import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listContractors } from '@/lib/data/contractors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Contractors · HomeQuote Network' };

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  paused: 'warning',
  inactive: 'muted',
};

export default async function ContractorsPage() {
  // Setters read this list to know who they are setting appointments for;
  // creating and editing contractors stays with admins.
  const profile = await requireRole(['admin', 'setter']);
  const canManage = profile.role === 'admin';
  const contractors = await listContractors();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        description={
          canManage
            ? 'Businesses that receive your leads, with their verticals and pricing.'
            : 'Businesses that receive your leads.'
        }
      >
        {canManage ? (
          <Button asChild>
            <Link href="/app/contractors/new">
              <Plus className="size-4" /> New contractor
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {contractors.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No contractors yet"
          description={
            canManage
              ? 'Add your first contractor to start assigning and selling leads.'
              : 'No contractors have been added yet.'
          }
          action={
            canManage ? (
              <Button asChild>
                <Link href="/app/contractors/new">
                  <Plus className="size-4" /> New contractor
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Verticals</TableHead>
                {canManage ? (
                  <TableHead className="text-center">Agreements</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/app/contractors/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.contact_name || c.email || c.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'muted'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{c.vertical_count}</TableCell>
                  {canManage ? (
                    <TableCell className="text-center">
                      {c.agreement_count}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
