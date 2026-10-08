import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WIZARD_STEPS = ['Template', 'Client', 'Agreement', 'Branding', 'Preview', 'Send'] as const;

/** Six-step progress indicator. Interactive when `onGo` is given (steps already reached are clickable). */
export function WizardSteps({ current, reached, onGo }: { current: number; reached?: number; onGo?: (i: number) => void }) {
  const max = reached ?? current;
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {WIZARD_STEPS.map((label, i) => {
          const done = i < current, isCurrent = i === current, clickable = !!onGo && i <= max && !isCurrent;
          const inner = (
            <>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', isCurrent ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-emerald-600 bg-emerald-600 text-white' : 'bg-background text-muted-foreground')}>
                {done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn('whitespace-nowrap text-sm', isCurrent ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
            </>
          );
          return (
            <li key={label} className="flex items-center gap-1" aria-current={isCurrent ? 'step' : undefined}>
              {clickable ? <button type="button" onClick={() => onGo!(i)} className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{inner}</button>
                : <span className="flex items-center gap-2 px-1.5 py-1">{inner}</span>}
              {i < WIZARD_STEPS.length - 1 && <span className="mx-1 hidden h-px w-5 bg-border sm:block" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
