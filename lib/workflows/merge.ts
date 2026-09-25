import type { WorkflowEvaluationContext } from './planner';

export interface WorkflowTemplateSystemValues {
  phone?: string;
  siteUrl?: string;
}

function mergeValue(
  values: WorkflowEvaluationContext,
  field: string,
  system: WorkflowTemplateSystemValues
): string {
  const [root, key] = field.split('.');
  if (root === 'homequote') {
    if (key === 'phone') return system.phone ?? '';
    if (key === 'site_url') return system.siteUrl ?? '';
    return '';
  }

  const source = values[root as keyof WorkflowEvaluationContext];
  if (source && typeof source === 'object' && key in source) {
    const value = (source as Record<string, unknown>)[key];
    return value == null ? '' : String(value);
  }
  return '';
}

export function renderWorkflowTemplate(
  template: string,
  values: WorkflowEvaluationContext,
  system: WorkflowTemplateSystemValues = {}
): string {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, field: string) =>
    mergeValue(values, field, system)
  );
}
