import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { assistantLimits, type AssistantLimits } from './config';
import { usdToMicros } from './pricing';

export interface Spend {
  userDayMicros: number;
  tenantMonthMicros: number;
  orgMonthMicros: number;
  requestsLastMinute: number;
}

export type LimitVerdict =
  | { ok: true }
  | { ok: false; code: 'rate_limited' | 'user_limit' | 'tenant_limit' | 'org_budget'; message: string };

/** Pure decision so it can be tested without a database. Checked in order of how recoverable each is. */
export function evaluateLimits(spend: Spend, limits: AssistantLimits, hasTenant: boolean): LimitVerdict {
  if (spend.requestsLastMinute >= limits.perMinute) {
    return { ok: false, code: 'rate_limited', message: 'You are sending messages too quickly. Wait a few seconds and try again.' };
  }
  if (spend.orgMonthMicros >= usdToMicros(limits.orgMonthlyUsd)) {
    return { ok: false, code: 'org_budget', message: 'The assistant has reached this month’s usage budget and is paused until next month or until an admin raises the limit.' };
  }
  if (hasTenant && spend.tenantMonthMicros >= usdToMicros(limits.tenantMonthlyUsd)) {
    return { ok: false, code: 'tenant_limit', message: 'Your company has reached this month’s assistant usage limit. It resets next month.' };
  }
  if (spend.userDayMicros >= usdToMicros(limits.userDailyUsd)) {
    return { ok: false, code: 'user_limit', message: 'You have reached your daily assistant limit. It frees up again within 24 hours.' };
  }
  return { ok: true };
}

const monthStartUtc = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/** Reads spend with the service role (the budget view spans users), then applies the verdict. */
export async function checkLimits(
  admin: SupabaseClient,
  who: { userId: string; contractorId: string | null },
  now = new Date()
): Promise<LimitVerdict> {
  const limits = assistantLimits();
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const month = monthStartUtc(now).toISOString();
  const minuteAgo = new Date(now.getTime() - 60_000).toISOString();

  const [user, tenant, org, recent] = await Promise.all([
    admin.rpc('assistant_spend_micros', { p_since: dayAgo, p_user: who.userId }),
    who.contractorId ? admin.rpc('assistant_spend_micros', { p_since: month, p_contractor: who.contractorId }) : Promise.resolve({ data: 0, error: null }),
    admin.rpc('assistant_spend_micros', { p_since: month }),
    admin.from('assistant_messages').select('id', { count: 'exact', head: true }).eq('user_id', who.userId).eq('role', 'user').gte('created_at', minuteAgo),
  ]);
  // If we cannot read the spend, fail closed: an unmetered assistant defeats the budget.
  if (user.error || tenant.error || org.error || recent.error) {
    return { ok: false, code: 'org_budget', message: 'The assistant is temporarily unavailable (usage could not be verified). Try again shortly.' };
  }
  return evaluateLimits(
    {
      userDayMicros: Number(user.data ?? 0),
      tenantMonthMicros: Number(tenant.data ?? 0),
      orgMonthMicros: Number(org.data ?? 0),
      requestsLastMinute: recent.count ?? 0,
    },
    limits,
    !!who.contractorId
  );
}

export async function recordUsage(
  admin: SupabaseClient,
  row: {
    userId: string; contractorId: string | null; conversationId: string | null;
    feature: 'chat' | 'summary'; model: string; costMicros: number;
    inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number;
    status: 'ok' | 'cancelled' | 'error'; errorCode?: string;
  }
) {
  await admin.from('assistant_usage').insert({
    user_id: row.userId, contractor_id: row.contractorId, conversation_id: row.conversationId,
    feature: row.feature, model: row.model, input_tokens: row.inputTokens, output_tokens: row.outputTokens,
    cache_read_tokens: row.cacheReadTokens ?? 0, cache_write_tokens: row.cacheWriteTokens ?? 0,
    cost_micros: row.costMicros, status: row.status, error_code: row.errorCode ?? null,
  });
}
