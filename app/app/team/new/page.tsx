import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listContractorOptions } from '@/lib/data/contractors';
import { UserForm } from '@/components/team/user-form';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Add user · HomeQuote Network' };

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const mode = (Array.isArray(sp.mode) ? sp.mode[0] : sp.mode) === 'invite'
    ? 'invite'
    : 'create';

  const contractors = await listContractorOptions();

  const tab = (value: 'create' | 'invite', label: string) => (
    <Link
      href={`/app/team/new${value === 'invite' ? '?mode=invite' : ''}`}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium',
        mode === value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent'
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add a user"
        description={
          mode === 'create'
            ? 'Create an account with a temporary password — usable right away.'
            : 'Email an invitation; the user sets their own password.'
        }
        backHref="/app/team"
        backLabel="Team"
      />

      <div className="inline-flex gap-1 rounded-lg border p-1">
        {tab('create', 'Create with password')}
        {tab('invite', 'Send invitation')}
      </div>

      <UserForm mode={mode} contractors={contractors} />
    </div>
  );
}
