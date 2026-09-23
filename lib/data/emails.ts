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
}

/** RLS keeps callers to their assignments and lets admins select all prospects. */
export async function listEmailProspects(): Promise<EmailProspectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractor_prospects')
    .select('id, company_name, decision_maker_name, decision_maker_email, email_service_interests, email, primary_services, disposition')
    .is('archived_at', null)
    .order('company_name', { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailProspectOption[];
}
