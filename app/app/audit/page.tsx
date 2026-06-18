import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listAuditLogs } from '@/lib/data/team';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export const metadata = { title: 'Audit Log · HomeQuote Network' };

// Friendly labels for the action keys written by team actions.
const ACTION_LABELS: Record<string, string> = {
  'user.create': 'Created user',
  'user.invite': 'Invited user',
  'user.invite_resend': 'Resent invitation',
  'user.role': 'Changed role',
  'user.reassign': 'Reassigned contractor',
  'user.password_reset': 'Sent password reset',
  'user.status.active': 'Activated account',
  'user.status.suspended': 'Suspended account',
  'user.status.disabled': 'Disabled account',
  'user.status.pending': 'Set to pending',
  'user.delete': 'Deleted user',
};

function label(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith('user.bulk.'))
    return `Bulk ${action.slice('user.bulk.'.length)}`;
  return action;
}

export default async function AuditPage() {
  await requireRole(['admin']);
  const logs = await listAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="A record of administrative actions across user accounts."
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No activity yet"
          description="Account actions you take — creating users, role changes, suspensions — will appear here."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed by</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{label(l.action)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.actor_name ?? 'System'}
                  </TableCell>
                  <TableCell>
                    {l.target_user_id ? (
                      <Link
                        href={`/app/team/${l.target_user_id}`}
                        className="hover:underline"
                      >
                        {l.target_name ?? 'View user'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
