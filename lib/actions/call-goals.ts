'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from '@/lib/calls/goals';

/**
 * Administrator controls for the calling HUD: each person's daily call goal
 * and the opt-in leaderboard. Both write through the signed-in admin's own
 * client, so RLS and the profile guard (0059) are the boundary, not just this
 * check — and both are audited.
 */

async function audit(action: string, targetUserId: string | null, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    action,
    target_user_id: targetUserId,
    metadata,
  });
}

const goalSchema = z.object({
  user_id: z.string().uuid(),
  daily_call_goal: z.coerce.number().int().min(MIN_DAILY_GOAL).max(MAX_DAILY_GOAL),
});

export type GoalActionState = { ok: boolean; error?: string } | undefined;

export async function setDailyCallGoal(_prev: GoalActionState, fd: FormData): Promise<GoalActionState> {
  await requireRole(['admin']);
  const parsed = goalSchema.safeParse({
    user_id: fd.get('user_id'),
    daily_call_goal: fd.get('daily_call_goal'),
  });
  if (!parsed.success) {
    return { ok: false, error: `Goal must be a whole number from ${MIN_DAILY_GOAL} to ${MAX_DAILY_GOAL}` };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ daily_call_goal: parsed.data.daily_call_goal })
    .eq('id', parsed.data.user_id);
  if (error) {
    return {
      ok: false,
      error: /daily_call_goal/.test(error.message)
        ? 'Call goals need database migration 0059 — apply it, then try again.'
        : error.message,
    };
  }
  await audit('user.daily_call_goal', parsed.data.user_id, { daily_call_goal: parsed.data.daily_call_goal });
  revalidatePath('/app/calls', 'layout');
  revalidatePath(`/app/team/${parsed.data.user_id}`);
  return { ok: true };
}

export async function setLeaderboardEnabled(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const enabled = fd.get('enabled') === 'true';
  const supabase = await createClient();
  const { error } = await supabase
    .from('call_workspace_settings')
    .update({ leaderboard_enabled: enabled, updated_at: new Date().toISOString(), updated_by: me.id })
    .eq('id', true);
  if (error) throw new Error(error.message);
  await audit('calls.leaderboard', null, { enabled });
  revalidatePath('/app/calls', 'layout');
}
