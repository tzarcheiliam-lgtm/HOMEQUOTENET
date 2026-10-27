import { requireProfile } from '@/lib/auth';
import { getGoalSnapshot, type GoalSnapshot } from '@/lib/data/call-stats';
import { GoalProvider } from '@/components/calls/goal/goal-provider';
import { GoalHud } from '@/components/calls/goal/goal-hud';

/**
 * Appointment setters call homeowner leads too, and those calls count toward
 * the same daily goal — so setters get the HUD here. Everyone else (admins,
 * contractors) sees the leads pages exactly as before.
 */
export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile();
  if (me.role !== 'setter') return <>{children}</>;
  let snapshot: GoalSnapshot | null = null;
  try {
    snapshot = await getGoalSnapshot(me.id);
  } catch (e) {
    console.error('[leads] goal snapshot failed', e);
  }
  if (!snapshot) return <>{children}</>;
  return (
    <GoalProvider snapshot={snapshot}>
      <div className="space-y-4 lg:space-y-5">
        <GoalHud variant="leads" />
        {children}
      </div>
    </GoalProvider>
  );
}
