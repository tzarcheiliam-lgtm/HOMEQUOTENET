import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { selectActiveAgreement } from '@/lib/outcomes/pricing';
import type {
  Contractor,
  PricingAgreement,
  Vertical,
} from '@/lib/types';

/**
 * Resolve the active pricing agreement id for a contractor + lead vertical.
 * Returns null if the contractor has no applicable active agreement.
 * (H1 — used so assignments link an agreement and commissions aren't $0.)
 */
export async function resolvePricingAgreementId(
  contractorId: string,
  verticalId: string | null
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pricing_agreements')
    .select('*')
    .eq('contractor_id', contractorId)
    .eq('is_active', true);
  const agreement = selectActiveAgreement(
    (data as PricingAgreement[]) ?? [],
    verticalId
  );
  return agreement?.id ?? null;
}

export interface ContractorListRow extends Contractor {
  vertical_count: number;
  agreement_count: number;
}

export interface ContractorOption {
  id: string;
  name: string;
}

/** Lightweight list for select inputs / filters. */
export async function listContractorOptions(): Promise<ContractorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contractors')
    .select('id, name')
    .order('name');
  return (data as ContractorOption[]) ?? [];
}

/** All contractors with cheap related counts, for the list page (admin). */
export async function listContractors(): Promise<ContractorListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contractors')
    .select(
      '*, contractor_verticals(count), pricing_agreements(count)'
    )
    .order('created_at', { ascending: false });

  return (data ?? []).map((row: any) => ({
    ...(row as Contractor),
    vertical_count: row.contractor_verticals?.[0]?.count ?? 0,
    agreement_count: row.pricing_agreements?.[0]?.count ?? 0,
  }));
}

export interface ContractorDetail {
  contractor: Contractor;
  verticalIds: string[];
  agreements: (PricingAgreement & { vertical: Vertical | null })[];
}

/** Full contractor record for the detail page: fields, verticals served, pricing. */
export async function getContractor(
  id: string
): Promise<ContractorDetail | null> {
  const supabase = await createClient();

  const { data: contractor } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single();

  if (!contractor) return null;

  const [{ data: cv }, { data: agreements }] = await Promise.all([
    supabase
      .from('contractor_verticals')
      .select('vertical_id')
      .eq('contractor_id', id),
    supabase
      .from('pricing_agreements')
      .select('*, vertical:verticals(*)')
      .eq('contractor_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    contractor: contractor as Contractor,
    verticalIds: (cv ?? []).map((r: any) => r.vertical_id),
    agreements: (agreements ?? []) as ContractorDetail['agreements'],
  };
}
