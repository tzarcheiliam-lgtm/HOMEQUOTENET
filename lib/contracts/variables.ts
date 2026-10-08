/**
 * Merge fields ({{client_company}} ...). Pure. One registry drives the editor's insert menu, the wizard's form,
 * validation, and rendering.
 */
import type { ContractClient, ContractSection, DocNode } from '@/lib/contracts/types';

export type VariableKind = 'text' | 'longtext' | 'money' | 'date';
export type VariableGroup = 'Client' | 'HomeQuote' | 'Dates' | 'Service' | 'Pricing' | 'Terms' | 'Branding';
export type VariableSource = 'crm' | 'system' | 'input' | 'branding';

export interface VariableDef {
  key: string;
  label: string;
  group: VariableGroup;
  kind: VariableKind;
  source: VariableSource;
  /** Optional variables resolve to `emptyText` when blank instead of blocking the send. */
  optional?: boolean;
  emptyText?: string;
  hint?: string;
  example: string;
}

export const VARIABLES: VariableDef[] = [
  { key: 'client_company', label: 'Client company', group: 'Client', kind: 'text', source: 'crm', example: 'Acme Pools LLC' },
  { key: 'client_name', label: 'Client contact name', group: 'Client', kind: 'text', source: 'crm', example: 'Jordan Rivera' },
  { key: 'client_email', label: 'Client email', group: 'Client', kind: 'text', source: 'crm', example: 'jordan@acmepools.example' },
  { key: 'client_phone', label: 'Client phone', group: 'Client', kind: 'text', source: 'crm', example: '(555) 010-0142' },
  { key: 'client_address', label: 'Client address', group: 'Client', kind: 'longtext', source: 'input', hint: 'Not stored in the CRM yet - enter it here.', example: '12 Main St, Springfield' },
  { key: 'client_logo', label: 'Client logo', group: 'Branding', kind: 'text', source: 'branding', optional: true, emptyText: '', hint: 'A paragraph that contains only this field shows the logo image.', example: '(logo)' },
  { key: 'homequote_company', label: 'HomeQuote company name', group: 'HomeQuote', kind: 'text', source: 'system', example: 'HomeQuote Network' },
  { key: 'homequote_logo', label: 'HomeQuote logo', group: 'Branding', kind: 'text', source: 'branding', optional: true, emptyText: '', hint: 'A paragraph that contains only this field shows the logo image.', example: '(logo)' },
  { key: 'effective_date', label: 'Effective date', group: 'Dates', kind: 'date', source: 'input', example: 'November 1, 2026' },
  { key: 'contract_date', label: 'Contract date', group: 'Dates', kind: 'date', source: 'system', hint: 'Set to the day the agreement is sent.', example: 'October 8, 2026' },
  { key: 'service_name', label: 'Service name', group: 'Service', kind: 'text', source: 'input', example: 'Pay Per Booked Appointment' },
  { key: 'service_description', label: 'Service description', group: 'Service', kind: 'longtext', source: 'input', example: 'Exclusive homeowner appointments for pool remodeling.' },
  { key: 'scope_of_work', label: 'Scope of work', group: 'Service', kind: 'longtext', source: 'input', example: 'Describe exactly what HomeQuote will deliver.' },
  { key: 'appointment_price', label: 'Price per appointment', group: 'Pricing', kind: 'money', source: 'input', example: '$150.00' },
  { key: 'monthly_retainer', label: 'Monthly retainer', group: 'Pricing', kind: 'money', source: 'input', example: '$1,500.00' },
  { key: 'setup_fee', label: 'Setup fee', group: 'Pricing', kind: 'money', source: 'input', example: '$500.00' },
  { key: 'advertising_budget', label: 'Advertising budget', group: 'Pricing', kind: 'money', source: 'input', hint: 'Paid by the client directly to the ad platform unless the agreement says otherwise.', example: '$3,000.00' },
  { key: 'payment_schedule', label: 'Payment schedule', group: 'Pricing', kind: 'longtext', source: 'input', example: 'Invoiced monthly, due within 15 days.' },
  { key: 'contract_duration', label: 'Contract duration', group: 'Terms', kind: 'text', source: 'input', example: '12 months' },
  { key: 'cancellation_notice', label: 'Cancellation notice', group: 'Terms', kind: 'text', source: 'input', example: '30 days written notice' },
  { key: 'refund_policy', label: 'Refund / replacement policy', group: 'Terms', kind: 'longtext', source: 'input', example: 'Describe the agreed refund or replacement rules.' },
  { key: 'qualification_standards', label: 'Appointment qualification standards', group: 'Terms', kind: 'longtext', source: 'input', example: 'Homeowner, in service area, project budget confirmed.' },
  { key: 'governing_law', label: 'Governing law / venue', group: 'Terms', kind: 'text', source: 'input', example: 'State of California' },
  { key: 'additional_terms', label: 'Additional terms', group: 'Terms', kind: 'longtext', source: 'input', optional: true, emptyText: 'None.', example: 'Any custom terms agreed with this client.' },
];

export const VARIABLE_BY_KEY = new Map(VARIABLES.map((v) => [v.key, v]));
export const KNOWN_VARIABLES = new Set(VARIABLES.map((v) => v.key));
export const SYSTEM_DEFAULTS: Record<string, string> = { homequote_company: 'HomeQuote Network' };

const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
export const tokensIn = (text: string): string[] => Array.from(text.matchAll(TOKEN), (m) => m[1]);

// ---------------------------------------------------------------------------
// Text walking helpers (shared with the renderer)
// ---------------------------------------------------------------------------
const TEXTBLOCKS = new Set(['paragraph', 'heading']);
/** Plain text of every text block in a node tree (inline runs concatenated, so a token split by bold still matches). */
export function textBlocks(node: DocNode, out: string[] = []): string[] {
  if (TEXTBLOCKS.has(node.type)) {
    out.push((node.content ?? []).map((c) => (c.type === 'text' ? c.text ?? '' : c.type === 'hardBreak' ? '\n' : '')).join(''));
    return out;
  }
  for (const c of node.content ?? []) textBlocks(c, out);
  return out;
}

export function sectionTexts(sections: ContractSection[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    if (s.title) out.push(s.title);
    textBlocks(s.doc, out);
  }
  return out;
}

/** Variables the content actually uses, in first-use order. */
export function usedVariables(sections: ContractSection[]): { known: string[]; unknown: string[] } {
  const known: string[] = [], unknown: string[] = [];
  for (const t of sectionTexts(sections)) {
    for (const k of tokensIn(t)) {
      const key = k.toLowerCase();
      const list = KNOWN_VARIABLES.has(key) ? known : unknown;
      if (!list.includes(key)) list.push(key);
    }
  }
  return { known, unknown };
}

export const PLACEHOLDER = /\[REVIEW:[^\]]*\]/g;
export function placeholderCount(sections: ContractSection[]): number {
  return sectionTexts(sections).reduce((n, t) => n + (t.match(PLACEHOLDER)?.length ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** yyyy-mm-dd -> "November 1, 2026" without any timezone shifting. */
export function formatLongDate(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}
export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

/** "1500", "$1,500", "1500.5" -> "$1,500.00"; null if it is not a plain non-negative amount. */
export function formatMoney(raw: string): string | null {
  const cleaned = raw.trim().replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function moneyToNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const f = formatMoney(raw);
  return f ? Number(f.replace(/[$,]/g, '')) : null;
}

export interface ResolveResult {
  /** key -> display text, for every variable that has a usable value. */
  values: Record<string, string>;
  /** Used by the content but blank. */
  missing: string[];
  /** Typed wrongly (money / date). key -> message */
  invalid: Record<string, string>;
  /** {{tokens}} that are not in the registry. */
  unknown: string[];
}

/**
 * Resolves the variables the sections use. `raw` holds what the admin typed (money as typed, date as yyyy-mm-dd);
 * client fields come from `client`. Nothing silently defaults except the documented system values.
 */
export function resolveVariables(sections: ContractSection[], raw: Record<string, string | undefined>, client: ContractClient, opts: { today?: string } = {}): ResolveResult {
  const { known, unknown } = usedVariables(sections);
  const source: Record<string, string> = {
    ...SYSTEM_DEFAULTS,
    contract_date: opts.today ?? todayIso(),
    client_company: client.company, client_name: client.name, client_email: client.email, client_phone: client.phone, client_address: client.address,
  };
  // Explicit values typed on the agreement win over CRM data and system defaults ("override before sending").
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string' && v.trim()) source[k] = v;
  const values: Record<string, string> = {};
  const missing: string[] = [];
  const invalid: Record<string, string> = {};
  for (const key of known) {
    const def = VARIABLE_BY_KEY.get(key)!;
    if (def.source === 'branding') { values[key] = def.emptyText ?? ''; continue; }
    const v = (source[key] ?? '').trim();
    if (!v) {
      if (def.optional) values[key] = def.emptyText ?? '';
      else missing.push(key);
      continue;
    }
    if (v.length > 6000) { invalid[key] = `${def.label} is too long.`; continue; }
    if (def.kind === 'money') {
      const f = formatMoney(v);
      if (!f) invalid[key] = `${def.label} must be an amount like 1500 or 1,500.00.`; else values[key] = f;
    } else if (def.kind === 'date') {
      const f = formatLongDate(v);
      if (!f) invalid[key] = `${def.label} must be a valid date.`; else values[key] = f;
    } else values[key] = v;
  }
  return { values, missing, invalid, unknown };
}
