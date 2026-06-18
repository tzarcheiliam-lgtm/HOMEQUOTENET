import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

/**
 * Consistent empty state: an icon, a short title, a directive line, and an
 * optional action. Empty screens are an invitation to act, not a dead end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        {Icon && (
          <span className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </span>
        )}
        <div>
          <p className="font-medium">{title}</p>
          {description && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </Card>
  );
}
