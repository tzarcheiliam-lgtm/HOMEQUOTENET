import { requireCallWorkspace } from '@/lib/auth';
import { getGoalSnapshot, type GoalSnapshot } from '@/lib/data/call-stats';
import { GoalProvider } from '@/components/calls/goal/goal-provider';
import { GoalHud } from '@/components/calls/goal/goal-hud';

/**
 * Every calling-workspace page sits under the daily goal HUD. The provider
 * lives here so it survives Save-and-next navigation between prospects —
 * the count bumps on submit and the celebration plays across the hop.
 * If the numbers cannot be read, the workspace still works without the HUD.
 */
export default async function CallsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireCallWorkspace();
  let snapshot: GoalSnapshot | null = null;
  try {
    snapshot = await getGoalSnapshot(me.id);
  } catch (e) {
    console.error('[calls] goal snapshot failed', e);
  }
  if (!snapshot) return <>{children}</>;
  return (
    <GoalProvider snapshot={snapshot}>
      <div className="space-y-4 lg:space-y-5">
        <GoalHud variant="calls" />
        {children}
      </div>
    </GoalProvider>
  );
}
