import Link from 'next/link';
import { Plus, Mail } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listUsers, type UserFilters } from '@/lib/data/team';
import { Button } from '@/components/ui/button';
import { TeamFilters } from '@/components/team/team-filters';
import { TeamTable } from '@/components/team/team-table';
import { PageHeader } from '@/components/ui/page-header';
import type { AccountStatus, UserRole } from '@/lib/types';

export const metadata = { title: 'Team · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin']);
  const sp = await searchParams;

  const filters: UserFilters = {
    q: first(sp.q),
    role: first(sp.role) as UserRole | undefined,
    status: first(sp.status) as AccountStatus | undefined,
    sort: (first(sp.sort) as UserFilters['sort']) ?? 'created',
  };

  const users = await listUsers(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage admins, setters, and contractor accounts."
      >
        <Button asChild variant="outline">
          <Link href="/app/team/new?mode=invite">
            <Mail className="size-4" /> Invite
          </Link>
        </Button>
        <Button asChild>
          <Link href="/app/team/new">
            <Plus className="size-4" /> Create user
          </Link>
        </Button>
      </PageHeader>

      <TeamFilters current={filters} />
      <TeamTable rows={users} />
    </div>
  );
}
