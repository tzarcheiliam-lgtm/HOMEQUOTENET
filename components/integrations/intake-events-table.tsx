import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { IntakeEventRow } from '@/lib/data/integrations';

const STATUS_VARIANT: Record<
  string,
  'success' | 'warning' | 'muted' | 'secondary'
> = {
  created: 'success',
  duplicate: 'warning',
  error: 'warning',
  received: 'muted',
};

export function IntakeEventsTable({
  rows,
  showProvider = true,
}: {
  rows: IntakeEventRow[];
  showProvider?: boolean;
}) {
  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Received</TableHead>
            {showProvider && <TableHead>Source</TableHead>}
            <TableHead>Platform</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(e.received_at).toLocaleString()}
              </TableCell>
              {showProvider && (
                <TableCell className="capitalize">{e.provider}</TableCell>
              )}
              <TableCell className="text-muted-foreground">
                {e.platform ?? '—'}
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {e.full_name || e.email || e.phone || '—'}
                </span>
                {e.email && (
                  <span className="block text-xs text-muted-foreground">
                    {e.email}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[e.status] ?? 'muted'}>
                  {e.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {e.lead_id ? (
                  <Link
                    href={`/app/leads/${e.lead_id}`}
                    className="text-primary hover:underline"
                  >
                    View lead
                  </Link>
                ) : e.duplicate_of ? (
                  <Link
                    href={`/app/leads/${e.duplicate_of}`}
                    className="text-primary hover:underline"
                  >
                    Existing lead
                  </Link>
                ) : e.error ? (
                  <span className="text-destructive">{e.error}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
