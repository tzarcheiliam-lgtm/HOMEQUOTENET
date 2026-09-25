import {
  workflowConditionGroupSchema,
  type ConditionScalar,
  type WorkflowCondition,
  type WorkflowConditionGroup,
} from './conditions';

export interface ResolvedWorkflowField {
  found: boolean;
  value: unknown;
}

export type WorkflowFieldResolver = (field: string) => ResolvedWorkflowField;

export interface ConditionEvaluation {
  matched: boolean;
  kind: 'group' | 'condition';
  field?: string;
  operator?: WorkflowCondition['operator'];
  actual?: unknown;
  children?: ConditionEvaluation[];
}

export function resolveWorkflowPath(root: unknown, path: string): ResolvedWorkflowField {
  let current = root;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return { found: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[part];
  }
  return { found: true, value: current };
}

function normalizedString(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function equals(actual: unknown, expected: ConditionScalar): boolean {
  if (typeof actual === 'string' && typeof expected === 'string') {
    return normalizedString(actual) === normalizedString(expected);
  }
  return actual === expected;
}

function exists(field: ResolvedWorkflowField): boolean {
  if (!field.found || field.value === null || field.value === undefined) return false;
  if (typeof field.value === 'string') return field.value.trim().length > 0;
  if (Array.isArray(field.value)) return field.value.length > 0;
  return true;
}

function ordered(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function evaluateLeaf(condition: WorkflowCondition, field: ResolvedWorkflowField): boolean {
  const expected = condition.value;
  switch (condition.operator) {
    case 'exists':
      return exists(field);
    case 'not_exists':
      return !exists(field);
    case 'equals':
      return field.found && !Array.isArray(expected) && expected !== undefined && equals(field.value, expected);
    case 'not_equals':
      return !field.found || expected === undefined || Array.isArray(expected) || !equals(field.value, expected);
    case 'contains':
    case 'not_contains': {
      let contains = false;
      if (field.found && typeof expected === 'string') {
        if (typeof field.value === 'string') {
          contains = normalizedString(field.value).includes(normalizedString(expected));
        } else if (Array.isArray(field.value)) {
          contains = field.value.some((item) => equals(item, expected));
        }
      }
      return condition.operator === 'contains' ? contains : !contains;
    }
    case 'in':
    case 'not_in': {
      const included = field.found && Array.isArray(expected) && expected.some((item) => equals(field.value, item));
      return condition.operator === 'in' ? included : !included;
    }
    case 'greater_than':
    case 'less_than': {
      if (!field.found || expected === undefined || Array.isArray(expected)) return false;
      const actualOrder = ordered(field.value);
      const expectedOrder = ordered(expected);
      if (actualOrder === null || expectedOrder === null) return false;
      return condition.operator === 'greater_than' ? actualOrder > expectedOrder : actualOrder < expectedOrder;
    }
  }
}

function isGroup(node: WorkflowCondition | WorkflowConditionGroup): node is WorkflowConditionGroup {
  return 'match' in node;
}

export function evaluateWorkflowConditions(
  group: WorkflowConditionGroup,
  resolve: WorkflowFieldResolver
): ConditionEvaluation {
  const parsed = workflowConditionGroupSchema.parse(group);
  const children = parsed.conditions.map((node): ConditionEvaluation => {
    if (isGroup(node)) return evaluateWorkflowConditions(node, resolve);
    const actual = resolve(node.field);
    return {
      matched: evaluateLeaf(node, actual),
      kind: 'condition',
      field: node.field,
      operator: node.operator,
      ...(actual.found ? { actual: actual.value } : {}),
    };
  });
  return {
    matched: parsed.match === 'all' ? children.every((child) => child.matched) : children.some((child) => child.matched),
    kind: 'group',
    children,
  };
}

export function conditionsMatch(
  group: WorkflowConditionGroup | null | undefined,
  resolve: WorkflowFieldResolver
): boolean {
  return group ? evaluateWorkflowConditions(group, resolve).matched : true;
}
