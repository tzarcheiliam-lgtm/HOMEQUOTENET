import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Server-side pagination as plain links; keeps every other query param. */
export function Pagination({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set('page', String(p));
    return `/app/calls?${sp.toString()}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const linkClass = (disabled: boolean) =>
    cn(
      buttonVariants({ variant: 'outline', size: 'sm' }),
      disabled && 'pointer-events-none opacity-50'
    );

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span className="tabular-nums">
        {from}{'–'}{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={linkClass(page <= 1)}
        >
          <ChevronLeft className="size-4" /> Previous
        </Link>
        <span className="tabular-nums">
          Page {page} of {pages}
        </span>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pages}
          className={linkClass(page >= pages)}
        >
          Next <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
