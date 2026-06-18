import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getUserDetail } from '@/lib/data/team';
import { listContractorOptions } from '@/lib/data/contractors';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { UserActions } from '@/components/team/user-actions';
import { ROLE_LABELS } from '@/lib/nav';

export const metadata = { title: 'User · HomeQuote Network' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : '—';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin']);
  const { id } = await params;

  const [detail, contractors] = await Promise.all([
    getUserDetail(id),
    listContractorOptions(),
  ]);
  if (!detail) notFound();

  const { user, audit, activity } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.full_name || user.email || 'User'}
        description={user.email ?? undefined}
        backHref="/app/team"
        backLabel="Team"
      >
        <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
        <StatusBadge status={user.account_status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Management */}
        <div className="lg:col-span-2">
          <UserActions user={user} contractors={contractors} />
        </div>

        {/* Details + history */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Role" value={ROLE_LABELS[user.role]} />
              <Row label="Contractor" value={user.contractor_name} />
              <Row label="Last login" value={fmt(user.last_login_at)} />
              <Row label="Created" value={fmt(user.created_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account history</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No admin actions recorded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {audit.map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium">{a.action}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.actor_name ?? 'System'} · {fmt(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent lead activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This user hasn't logged lead activity yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a) => (
                    <li key={a.id} className="text-sm">
                      <Link
                        href={`/app/leads/${a.lead_id}`}
                        className="hover:underline"
                      >
                        {a.body || a.type}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {fmt(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
