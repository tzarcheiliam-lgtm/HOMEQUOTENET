'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

export type FormState = { error?: string; success?: boolean } | undefined;

// ---- helpers ---------------------------------------------------------------

function parseServiceAreas(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function numOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(raw: FormDataEntryValue | null): string | null {
  const s = raw === null ? '' : String(raw).trim();
  return s === '' ? null : s;
}

// ---- contractors -----------------------------------------------------------

const contractorSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  contact_name: z.string().nullable(),
  email: z.string().email('Invalid email').or(z.literal('')).nullable(),
  phone: z.string().nullable(),
  status: z.enum(['active', 'paused', 'inactive']),
  notes: z.string().nullable(),
});

export async function createContractor(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(['admin']);

  const parsed = contractorSchema.safeParse({
    name: formData.get('name'),
    contact_name: strOrNull(formData.get('contact_name')),
    email: strOrNull(formData.get('email')) ?? '',
    phone: strOrNull(formData.get('phone')),
    status: formData.get('status') ?? 'active',
    notes: strOrNull(formData.get('notes')),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractors')
    .insert({
      name: parsed.data.name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      status: parsed.data.status,
      notes: parsed.data.notes,
      service_areas: parseServiceAreas(formData.get('service_areas')),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app/contractors');
  redirect(`/app/contractors/${data!.id}`);
}

export async function updateContractor(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(['admin']);

  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Missing contractor id' };

  const parsed = contractorSchema.safeParse({
    name: formData.get('name'),
    contact_name: strOrNull(formData.get('contact_name')),
    email: strOrNull(formData.get('email')) ?? '',
    phone: strOrNull(formData.get('phone')),
    status: formData.get('status') ?? 'active',
    notes: strOrNull(formData.get('notes')),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('contractors')
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      status: parsed.data.status,
      notes: parsed.data.notes,
      service_areas: parseServiceAreas(formData.get('service_areas')),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/app/contractors/${id}`);
  revalidatePath('/app/contractors');
  return { success: true };
}

export async function deleteContractor(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('contractors').delete().eq('id', id);

  revalidatePath('/app/contractors');
  redirect('/app/contractors');
}

// ---- verticals served ------------------------------------------------------

export async function setContractorVerticals(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(['admin']);

  const contractorId = String(formData.get('contractor_id') ?? '');
  if (!contractorId) return { error: 'Missing contractor id' };

  const verticalIds = formData.getAll('vertical_ids').map(String);

  const supabase = await createClient();

  // Replace the set: delete existing, insert selected.
  const { error: delError } = await supabase
    .from('contractor_verticals')
    .delete()
    .eq('contractor_id', contractorId);
  if (delError) return { error: delError.message };

  if (verticalIds.length > 0) {
    const { error: insError } = await supabase
      .from('contractor_verticals')
      .insert(
        verticalIds.map((vid) => ({
          contractor_id: contractorId,
          vertical_id: vid,
        }))
      );
    if (insError) return { error: insError.message };
  }

  revalidatePath(`/app/contractors/${contractorId}`);
  return { success: true };
}

// ---- pricing agreements ----------------------------------------------------

const pricingSchema = z.object({
  contractor_id: z.string().min(1),
  model: z.enum([
    'per_lead',
    'per_appointment',
    'revenue_share',
    'hybrid',
    'subscription',
  ]),
});

function pricingFieldsFromForm(formData: FormData) {
  return {
    vertical_id: strOrNull(formData.get('vertical_id')),
    per_lead_amount: numOrNull(formData.get('per_lead_amount')),
    per_appointment_amount: numOrNull(formData.get('per_appointment_amount')),
    revenue_share_pct: numOrNull(formData.get('revenue_share_pct')),
    subscription_amount: numOrNull(formData.get('subscription_amount')),
    subscription_period: strOrNull(formData.get('subscription_period')),
    is_exclusive: formData.get('is_exclusive') === 'on',
    is_active: formData.get('is_active') === 'on',
    notes: strOrNull(formData.get('notes')),
  };
}

export async function createPricingAgreement(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(['admin']);

  const parsed = pricingSchema.safeParse({
    contractor_id: formData.get('contractor_id'),
    model: formData.get('model'),
  });
  if (!parsed.success) return { error: 'Choose a valid pricing model' };

  const supabase = await createClient();
  const { error } = await supabase.from('pricing_agreements').insert({
    contractor_id: parsed.data.contractor_id,
    model: parsed.data.model,
    ...pricingFieldsFromForm(formData),
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/contractors/${parsed.data.contractor_id}`);
  return { success: true };
}

export async function updatePricingAgreement(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(['admin']);

  const id = String(formData.get('id') ?? '');
  const contractorId = String(formData.get('contractor_id') ?? '');
  if (!id || !contractorId) return { error: 'Missing identifiers' };

  const model = String(formData.get('model'));
  const supabase = await createClient();
  const { error } = await supabase
    .from('pricing_agreements')
    .update({ model, ...pricingFieldsFromForm(formData) })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath(`/app/contractors/${contractorId}`);
  return { success: true };
}

export async function deletePricingAgreement(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  const contractorId = String(formData.get('contractor_id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('pricing_agreements').delete().eq('id', id);

  if (contractorId) revalidatePath(`/app/contractors/${contractorId}`);
}
