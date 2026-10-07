import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { aiCallingEnabled } from '@/lib/ai-calling/config';

type Db = ReturnType<typeof createAdminClient>;

/** Contractor AI-calling readiness for the call step's side panel (identifiers are never returned, only whether they are set). */
export async function readiness(db: Db, contractorId: string | null) {
  if (!contractorId) return { calling: null };
  const [global, contractor] = await Promise.all([
    db.from('ai_calling_settings').select('enabled').eq('id', true).maybeSingle(),
    db.from('ai_calling_contractor_settings').select('mode,agent_id,phone_number_id').eq('contractor_id', contractorId).maybeSingle(),
  ]);
  const c = contractor.data as { mode: string; agent_id: string | null; phone_number_id: string | null } | null;
  return {
    calling: {
      mode: c?.mode ?? null,
      agentConfigured: !!c?.agent_id?.trim(),
      phoneConfigured: !!c?.phone_number_id?.trim(),
      globalEnabled: aiCallingEnabled(),
      adminEnabled: (global.data as { enabled?: boolean } | null)?.enabled === true,
    },
  };
}
