import { renderWorkflowTemplate, formatWorkflowDateTime, type WorkflowTemplateSystemValues } from '../merge';
import type { WorkflowEvaluationContext } from '../planner';
import { CALL_CONTEXT_FIELDS, CALL_PURPOSE_TEXT, GRAPH_VARIABLES, mergeTokensIn, type CallPurpose } from './model';

/**
 * Personalization for the graph engine: ONE renderer (the existing
 * renderWorkflowTemplate), a context builder that adds the derived fields the
 * variable picker offers, and preview helpers that report what is missing.
 */

export interface GraphEvaluationContext extends WorkflowEvaluationContext {
  call: Record<string, unknown> | null;
}

/** Adds derived lead fields (full name, project type). `projectType` is read from the vertical tables, never free text. */
export function withDerivedLeadFields(lead: Record<string, unknown> | null, projectType: string | null): Record<string, unknown> | null {
  if (!lead) return null;
  const full = [lead.first_name, lead.last_name].filter((x) => typeof x === 'string' && x.trim()).join(' ');
  return { ...lead, full_name: full || null, project_type: projectType };
}

export function sampleContext(): GraphEvaluationContext {
  const at = new Date(Date.now() + 3 * 86_400_000);
  at.setUTCHours(21, 0, 0, 0);
  return {
    lead: { first_name: 'Sarah', last_name: 'Nguyen', full_name: 'Sarah Nguyen', city: 'Austin', zip: '78701', project_type: 'Pool installation', state: 'TX', status: 'new', consent_granted: true },
    contractor: { id: 'sample', name: 'Blue Wave Pools' },
    assignment: { id: 'sample', status: 'assigned' },
    appointment: { scheduled_at: at.toISOString(), location: '123 Main St, Austin', status: 'scheduled' },
    estimate: { amount: 42000, status: 'sent' },
    call: null,
    event: { payload: {} },
  };
}

const FALLBACK_FIELDS = new Set(['lead.first_name', 'contractor.name']);
function rawPresent(values: GraphEvaluationContext, field: string): boolean {
  if (field.startsWith('homequote.')) return true; // server configuration; omitted lines handle absence
  const [root, key] = field.split('.');
  const source = (values as unknown as Record<string, unknown>)[root];
  if (!source || typeof source !== 'object') return false;
  const v = (source as Record<string, unknown>)[key];
  return v !== null && v !== undefined && String(v).trim() !== '';
}

export interface TemplatePreview {
  text: string;
  /** Variables used by the text whose value is missing for this lead (they render empty or with a fallback such as "there"). */
  missing: string[];
  unknown: string[];
}

export function previewTemplate(template: string, values: GraphEvaluationContext, system: WorkflowTemplateSystemValues = {}): TemplatePreview {
  const fields = Array.from(new Set(mergeTokensIn(template)));
  const known = new Set(GRAPH_VARIABLES.map((v) => v.field));
  return {
    text: renderWorkflowTemplate(template, values, system),
    missing: fields.filter((f) => known.has(f) && !rawPresent(values, f)),
    unknown: fields.filter((f) => !known.has(f)),
  };
}

/** One-line, control-character-free, length-capped text: data for the agent, never instructions. */
export function sanitizeCallText(s: string | null | undefined, max = 500): string {
  return (s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** The `call_purpose` / `call_context` handed to the Fish agent for a call node. Approved fields only. */
export function buildCallBrief(
  config: { purpose: CallPurpose; note?: string; contextFields: readonly string[] },
  values: GraphEvaluationContext,
  system: WorkflowTemplateSystemValues = {}
): { purpose: string; context: string; missing: string[] } {
  const purposeText = CALL_PURPOSE_TEXT[config.purpose].agent;
  const purpose = sanitizeCallText(config.note ? `${purposeText}. ${config.note}` : purposeText, 200);
  const parts: string[] = [];
  const missing: string[] = [];
  for (const key of config.contextFields) {
    const def = CALL_CONTEXT_FIELDS.find((f) => f.key === key);
    if (!def) continue;
    if (!rawPresent(values, def.variable)) { missing.push(def.label); continue; }
    const rendered = renderWorkflowTemplate(`{{${def.variable}}}`, values, system);
    if (rendered) parts.push(`${def.label}: ${sanitizeCallText(rendered, 120)}`);
  }
  return { purpose, context: sanitizeCallText(parts.join('; '), 500), missing };
}

export { formatWorkflowDateTime, FALLBACK_FIELDS };
