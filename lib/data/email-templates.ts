import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface EmailTemplateRow {
  id: string;
  key: string;
  category: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  contractorVisible: boolean;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS =
  'id, key, category, name, description, subject, html_body, text_body, variables, contractor_visible, is_system, is_active, created_at, updated_at';

function toRow(r: Record<string, unknown>): EmailTemplateRow {
  return {
    id: r.id as string,
    key: r.key as string,
    category: r.category as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    subject: r.subject as string,
    htmlBody: r.html_body as string,
    textBody: r.text_body as string,
    variables: (r.variables as string[] | null) ?? [],
    contractorVisible: r.contractor_visible as boolean,
    isSystem: r.is_system as boolean,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** RLS scopes this: admins see everything, contractors see only active + contractor_visible rows. */
export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('email_templates').select(COLUMNS).order('category').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRow);
}

export async function getEmailTemplate(id: string): Promise<EmailTemplateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('email_templates').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRow(data) : null;
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('email_templates').select(COLUMNS).eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRow(data) : null;
}
