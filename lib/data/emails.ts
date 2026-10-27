import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface EmailProspectOption {
  id: string;
  company_name: string;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  email_service_interests: string[];
  email: string | null;
  primary_services: string[];
  disposition: string;
  city: string | null;
  /** Migration 0063; absent before it. */
  email_opt_out_at?: string | null;
}

/** RLS keeps callers to their assignments and lets admins select all prospects. */
export async function listEmailProspects(): Promise<EmailProspectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractor_prospects')
    .select('*')
    .is('archived_at', null)
    .order('company_name', { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailProspectOption[];
}
