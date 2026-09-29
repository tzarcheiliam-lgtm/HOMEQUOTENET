import { Send } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listRecipients } from '@/lib/data/lead-distribution';
import { listContractorOptions } from '@/lib/data/contractors';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RecipientForm } from '@/components/leads/recipient-form';

export const metadata = { title: 'Lead Recipients · HomeQuote Network' };

const KIND_LABEL = { team_member: 'Team member', contractor: 'Contractor' } as const;

export default async function LeadRecipientsPage() {
  await requireRole(['admin']);
  const [recipients, contractors] = await Promise.all([listRecipients(), listContractorOptions()]);
  const contractorOptions = contractors.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Recipients"
        description="People you can send a qualified lead to. New leads always go to the HomeQuote team first."
      />

      {recipients.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No recipients yet"
          description="Add the contractors and team members you send qualified leads to."
        />
      ) : (
        <Card className="p-0">
          <Table stack>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.company, r.email].filter(Boolean).join(' · ')}
                    </div>
                    {r.contractor && (
                      <div className="text-xs text-muted-foreground">Linked to {r.contractor.name}</div>
                    )}
                  </TableCell>
                  <TableCell label="Type">{KIND_LABEL[r.kind]}</TableCell>
                  <TableCell label="Phone" className="tabular-nums">{r.phone ?? '—'}</TableCell>
                  <TableCell label="Status">
                    <Badge variant={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <details className="group text-left">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-end text-right text-sm font-medium text-muted-foreground hover:text-foreground">
                        <span className="group-open:hidden">Edit</span>
                        <span className="hidden group-open:inline">Close</span>
                      </summary>
                      <div className="mt-3 w-full rounded-lg border bg-card p-4 lg:w-[min(36rem,80vw)]">
                        <RecipientForm recipient={r} contractors={contractorOptions} />
                      </div>
                    </details>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a recipient</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipientForm contractors={contractorOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
