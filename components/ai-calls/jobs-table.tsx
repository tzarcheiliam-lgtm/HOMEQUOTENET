import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusBadge } from '@/components/ai-calls/job-status-badge';
import { maskPhone } from '@/lib/ai-calling/phone';
import type { JobRow } from '@/lib/data/ai-calling';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—');
const dur = (s: number | null) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
const outcome = (j: JobRow) => {
  const summary = (j.analysis as { summary?: string | null } | null)?.summary;
  return summary ? (summary.length > 90 ? `${summary.slice(0, 90)}…` : summary) : j.ended_reason ? j.ended_reason.replaceAll('_', ' ') : j.dial_status ? j.dial_status.replaceAll('_', ' ') : '—';
};

export function JobsTable({ rows }: { rows: JobRow[] }) {
  if (!rows.length) return <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">No AI calls match these filters yet.</p>;
  return (
    <Table stack>
      <TableHeader>
        <TableRow>
          <TableHead>Created</TableHead><TableHead>Contractor</TableHead><TableHead>Contact</TableHead><TableHead>Source</TableHead>
          <TableHead>Status</TableHead><TableHead>Run at</TableHead><TableHead>Duration</TableHead><TableHead>Outcome</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((j) => (
          <TableRow key={j.id}>
            <TableCell label="Created" className="whitespace-nowrap">{fmt(j.created_at)}</TableCell>
            <TableCell label="Contractor">{j.contractor?.name ?? '—'}</TableCell>
            <TableCell label="Contact"><div className="font-medium">{j.contact_name ?? 'Unknown'}</div><div className="text-xs text-muted-foreground">{maskPhone(j.contact_phone)}</div></TableCell>
            <TableCell label="Source"><Badge variant={j.trigger_source === 'manual' ? 'outline' : 'secondary'}>{j.trigger_source === 'manual' ? 'Manual' : 'Automatic'}</Badge></TableCell>
            <TableCell label="Status"><JobStatusBadge status={j.status} blockReason={j.block_reason} /></TableCell>
            <TableCell label="Run at" className="whitespace-nowrap">{j.status === 'queued' ? fmt(j.run_at) : '—'}</TableCell>
            <TableCell label="Duration">{dur(j.duration_seconds)}</TableCell>
            <TableCell label="Outcome" className="max-w-xs">{outcome(j)}</TableCell>
            <TableCell><Link href={`/app/ai-calls/${j.id}`} className="text-sm font-medium text-primary hover:underline">Details</Link></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
