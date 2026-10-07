import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standard page header used on every app page: optional back link, title,
 * description, and a right-aligned actions slot. Keeps headers consistent.
 *
 * On phones the compact top bar (components/mobile/mobile-shell) already
 * carries the back arrow and the section title, so here the back link is
 * dropped and a list page's h1 stays in the document for screen readers only.
 * A record page (one with a back link) keeps its h1 visible: the record's
 * name is the useful thing to see.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  showTitleOnMobile = false,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  /** Keep the h1 visible on phones (greetings); default hides it on list pages. */
  showTitleOnMobile?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="size-4" /> {backLabel ?? 'Back'}
          </Link>
        )}
        <h1
          className={cn(
            'text-xl font-semibold tracking-tight text-foreground lg:text-[1.625rem] lg:leading-8',
            !backHref && !showTitleOnMobile && 'max-lg:sr-only'
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">{children}</div>
      )}
    </div>
  );
}
