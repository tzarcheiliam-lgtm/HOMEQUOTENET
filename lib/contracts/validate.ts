/**
 * Pre-send validation. Pure, so the wizard can show the same list the server enforces.
 */
import { signerSchema, type ContractClient, type ContractSection, type ContractSigner } from '@/lib/contracts/types';
import { VARIABLE_BY_KEY, formatMoney, moneyToNumber, placeholderCount, resolveVariables, type ResolveResult } from '@/lib/contracts/variables';

export interface ValidationIssue { code: string; message: string; field?: string; step?: 'client' | 'configure' | 'branding' | 'send' | 'content' }
export interface ValidationReport { errors: ValidationIssue[]; warnings: ValidationIssue[]; resolved: ResolveResult; placeholders: number }

export interface ValidateInput {
  sections: ContractSection[];
  variables: Record<string, string | undefined>;
  client: ContractClient;
  signers: ContractSigner[];
  placeholdersAcknowledged: boolean;
  today?: string;
}

export function validateContract(i: ValidateInput): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const resolved = resolveVariables(i.sections, i.variables, i.client, { today: i.today });
  for (const key of resolved.missing) {
    const def = VARIABLE_BY_KEY.get(key)!;
    errors.push({ code: 'missing_variable', field: key, step: def.group === 'Client' ? 'client' : 'configure', message: `${def.label} is required.` });
  }
  for (const [key, message] of Object.entries(resolved.invalid)) errors.push({ code: 'invalid_variable', field: key, step: 'configure', message });
  for (const key of resolved.unknown) errors.push({ code: 'unknown_variable', field: key, step: 'content', message: `The text uses {{${key}}}, which is not a known merge field. Fix or remove it.` });

  if (!i.sections.some((s) => s.kind === 'signatures')) errors.push({ code: 'no_signatures', step: 'content', message: 'The agreement has no Signatures section.' });
  if (!i.sections.some((s) => s.kind === 'rich' && s.doc.content?.some((n) => n.content?.length))) errors.push({ code: 'empty', step: 'content', message: 'The agreement has no text.' });

  if (!i.signers.length) errors.push({ code: 'no_signers', step: 'send', message: 'Add at least one signer.' });
  const seen = new Set<string>();
  i.signers.forEach((s, idx) => {
    const p = signerSchema.safeParse(s);
    if (!p.success) errors.push({ code: 'bad_signer', step: 'send', field: `signers.${idx}`, message: `Signer ${idx + 1}: ${p.error.issues[0]?.message ?? 'check the details'}.` });
    const em = s.email.trim().toLowerCase();
    if (em && seen.has(em)) errors.push({ code: 'duplicate_signer', step: 'send', field: `signers.${idx}`, message: `${s.email} is listed twice. Each signer needs their own email address.` });
    seen.add(em);
  });
  if (i.signers.length && !i.signers.some((s) => s.role === 'client')) warnings.push({ code: 'no_client_signer', step: 'send', message: 'No signer is marked as the client.' });

  const placeholders = placeholderCount(i.sections);
  if (placeholders > 0 && !i.placeholdersAcknowledged) {
    errors.push({ code: 'placeholders_unacknowledged', step: 'send', message: `${placeholders} placeholder passage${placeholders === 1 ? '' : 's'} marked [REVIEW: …] remain in the text. Replace them with approved wording, or confirm below that you have reviewed this agreement.` });
  } else if (placeholders > 0) {
    warnings.push({ code: 'placeholders', step: 'send', message: `${placeholders} [REVIEW: …] passage${placeholders === 1 ? '' : 's'} will appear in the agreement exactly as written.` });
  }
  return { errors, warnings, resolved, placeholders };
}

/** Rough total contract value from the fee fields; null when it cannot be computed (e.g. pay-per-appointment). */
export function estimateContractValue(values: Record<string, string | undefined>): number | null {
  const setup = moneyToNumber(values.setup_fee) ?? 0;
  const monthly = moneyToNumber(values.monthly_retainer);
  const dur = /(\d{1,3})\s*(month|year)/i.exec(values.contract_duration ?? '');
  const months = dur ? Number(dur[1]) * (/year/i.test(dur[2]) ? 12 : 1) : null;
  if (monthly != null && months) return setup + monthly * months;
  if (setup > 0 && monthly == null) return setup;
  return null;
}
export { formatMoney };
