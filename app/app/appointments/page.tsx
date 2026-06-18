import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { listAppointments } from '@/lib/data/appointments';
import { APPOINTMENT_STATUSES } from '@/lib/leads/constants';
import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

export const metadata = { title: 'Appointments · HomeQuote Network' };

const statusLabel = (s: string) =>
  APPOINTMENT_STATUSES.find((x) => x.value === s)?.label ?? s;

export default async function AppointmentsPage() {
  await requireProfile();
  const appointments = await listAppointments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Appointments across your assigned leads, soonest first."
      />

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments scheduled"
          description="Schedule one from a lead's distribution section and it'll appear here."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {a.scheduled_at
                      ? new Date(a.scheduled_at).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {a.lead_id ? (
                      <Link
                        href={`/app/leads/${a.lead_id}`}
                        className="font-medium hover:underline"
                      >
                        {a.lead_name}
                      </Link>
                    ) : (
                      a.lead_name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.contractor_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.location ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{statusLabel(a.status)}</Badge>
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
