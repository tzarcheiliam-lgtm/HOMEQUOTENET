/**
 * Pure helpers for customer documents (work orders / proposals / contracts): which fields a person may edit, what is
 * missing, and a plain-text preview of the exact wording. No I/O, safe to import from client components.
 *
 * The WORDING of a document is the snapshot of an admin-approved template and is never editable here. Only merge-field
 * values (names, prices, dates, scope) can be changed, and those are validated by the same resolver the PDF uses.
 */
import { buildRenderModel, runsText, type Block } from '@/lib/contracts/render-model';
import type { ContractSection } from '@/lib/contracts/types';
import { LEAD_PREFILL_KEYS, VARIABLE_BY_KEY, placeholderCount, resolveVariables, usedVariables, todayIso } from '@/lib/contracts/variables';

export const DOC_TYPE_LABELS = { work_order: 'Work order', proposal: 'Proposal', contract: 'Contract' } as const;
export type CustomerDocType = keyof typeof DOC_TYPE_LABELS;

export interface DocFieldView {
  key: string;
  label: string;
  kind: 'text' | 'longtext' | 'money' | 'date';
  value: string;
  required: boolean;
  /** true when the value was filled from the lead record (so the user knows to double-check it). */
  fromLead: boolean;
  hint?: string;
}
export interface DocPreview {
  docType: CustomerDocType;
  templateName: string;
  templateVersionNo: number;
  jurisdiction: string | null;
  title: string;
  fields: DocFieldView[];
  sections: { title: string | null; text: string }[];
  missing: { key: string; label: string; kind: string; hint?: string }[];
  invalid: { key: string; label: string; message: string }[];
  reviewPassages: number;
}

const EMPTY_CLIENT = { company: '', name: '', email: '', phone: '', address: '' };

/** Merge fields a person may type into. System and branding fields are never editable. */
export function editableKeys(sections: ContractSection[]): string[] {
  return usedVariables(sections).known.filter((k) => VARIABLE_BY_KEY.get(k)?.source === 'input');
}

/** Keeps only editable, known keys with string values. Anything else the model or client sends is dropped. */
export function sanitizeValues(sections: ContractSection[], input: unknown): Record<string, string> {
  const allowed = new Set(editableKeys(sections));
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (allowed.has(k) && typeof v === 'string') out[k] = v.trim().slice(0, 6000);
  }
  return out;
}

function blockText(b: Block): string {
  switch (b.t) {
    case 'heading': case 'para': return runsText(b.runs);
    case 'list': return b.items.map((item, i) => `${b.ordered ? `${b.start + i}.` : '•'} ${item.map(blockText).join(' ')}`).join('\n');
    case 'table': return b.rows.map((r) => r.cells.map((c) => c.blocks.map(blockText).join(' ')).join(' | ')).join('\n');
    case 'signatures': return '[Signature, printed name and date for each signer]';
    default: return '';
  }
}

export function previewDocument(input: {
  docType: CustomerDocType; templateName: string; templateVersionNo: number; jurisdiction: string | null; title: string;
  sections: ContractSection[]; values: Record<string, string>; leadFilled?: string[]; today?: string;
}): DocPreview {
  const today = input.today ?? todayIso();
  const resolved = resolveVariables(input.sections, input.values, EMPTY_CLIENT, { today });
  const model = buildRenderModel(input.sections, resolved.values);
  const leadFilled = new Set(input.leadFilled ?? []);
  const fields: DocFieldView[] = editableKeys(input.sections).map((key) => {
    const def = VARIABLE_BY_KEY.get(key)!;
    return { key, label: def.label, kind: def.kind, value: input.values[key] ?? '', required: !def.optional, fromLead: leadFilled.has(key) && !!input.values[key], hint: def.hint };
  });
  return {
    docType: input.docType, templateName: input.templateName, templateVersionNo: input.templateVersionNo, jurisdiction: input.jurisdiction, title: input.title,
    fields,
    sections: model.sections.map((s) => ({ title: s.title, text: s.blocks.map(blockText).filter(Boolean).join('\n') })),
    missing: resolved.missing.map((key) => { const d = VARIABLE_BY_KEY.get(key)!; return { key, label: d.label, kind: d.kind, hint: d.hint }; }),
    invalid: Object.entries(resolved.invalid).map(([key, message]) => ({ key, label: VARIABLE_BY_KEY.get(key)?.label ?? key, message })),
    reviewPassages: placeholderCount(input.sections),
  };
}

/** Customer fields the lead record can provide. Nothing about price, scope or terms is ever derived from a lead. */
export function prefillFromLead(
  lead: Record<string, unknown>, contractorName: string | null
): { values: Record<string, string>; filled: string[] } {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = [str(lead.first_name), str(lead.last_name)].filter(Boolean).join(' ');
  const cityLine = [str(lead.city), [str(lead.state), str(lead.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const address = [str(lead.address), cityLine].filter(Boolean).join(', ');
  const candidates: Record<(typeof LEAD_PREFILL_KEYS)[number], string> = {
    customer_name: name, customer_email: str(lead.email), customer_phone: str(lead.phone), customer_address: address,
    project_address: address, project_description: str(lead.project_description), contractor_company: contractorName?.trim() ?? '',
  };
  const values: Record<string, string> = {};
  const filled: string[] = [];
  for (const k of LEAD_PREFILL_KEYS) if (candidates[k]) { values[k] = candidates[k]; filled.push(k); }
  return { values, filled };
}

/** A template may be offered for this lead's state. Contracts require an explicit state match; others are open when untagged. */
export function templateAllowedForState(t: { docType: string; jurisdictions: string[] }, state: string | null | undefined): boolean {
  const s = (state ?? '').trim().toUpperCase();
  if (t.docType === 'contract') return t.jurisdictions.length > 0 && !!s && t.jurisdictions.includes(s);
  return t.jurisdictions.length === 0 || (!!s && t.jurisdictions.includes(s));
}
