import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ROLE_LABELS } from '@/lib/nav';
import { ACCOUNT_STATUSES } from '@/components/ui/status-badge';
import type { UserFilters } from '@/lib/data/team';

export function TeamFilters({ current }: { current: UserFilters }) {
  return (
    <Card className="p-4">
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input name="q" placeholder="Search name or email…" defaultValue={current.q ?? ''} />
        </div>
        <Select name="role" defaultValue={current.role ?? ''}>
          <option value="">All roles</option>
          {(['admin', 'setter', 'contractor'] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={current.status ?? ''}>
          <option value="">All statuses</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="sort" defaultValue={current.sort ?? 'created'}>
          <option value="created">Newest first</option>
          <option value="last_login">Last login</option>
          <option value="name">Name (A–Z)</option>
        </Select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" size="sm">
            Apply
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/app/team">Clear</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
