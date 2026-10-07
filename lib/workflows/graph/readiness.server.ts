import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { aiCallingEnabled } from '@/lib/ai-calling/config';
import type { IntegrationReadiness } from './validate';

/** Facts the publish gate checks, read on the server (never taken from the browser). */
export async function loadIntegrationReadiness(contractorId: string | null): Promise<IntegrationReadiness> {
  const db = createAdminClient();
  const [templates, global, contractor] = await Promise.all([
    // A contractor workflow may use only templates contractors can see; HomeQuote workflows may use any active one.
    contractorId ? db.from('email_templates').select('id').eq('is_active', true).eq('contractor_visible', true) : db.from('email_templates').select('id').eq('is_active', true),
    db.from('ai_calling_settings').select('enabled').eq('id', true).maybeSingle(),
    contractorId ? db.from('ai_calling_contractor_settings').select('mode,agent_id,phone_number_id').eq('contractor_id', contractorId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const c = contractor.data as { mode: 'off' | 'manual_only' | 'automatic' | 'workflow_only'; agent_id: string | null; phone_number_id: string | null } | null;
  return {
    // No SMS provider is connected (lib/messaging has a contract and mock only).
    sms: false,
    calling: contractorId
      ? {
          contractorMode: c?.mode ?? null,
          agentConfigured: !!c?.agent_id?.trim(),
          phoneConfigured: !!c?.phone_number_id?.trim(),
          globalEnabled: aiCallingEnabled(),
          adminEnabled: (global.data as { enabled?: boolean } | null)?.enabled === true,
        }
      : null,
    activeEmailTemplateIds: new Set(((templates.data ?? []) as { id: string }[]).map((t) => t.id)),
  };
}
