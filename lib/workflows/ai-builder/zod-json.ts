import type { ZodTypeAny } from 'zod';

/**
 * A small Zod (v3) -> JSON Schema converter for the AI builder's tool definition. It walks the REAL
 * schemas in lib/workflows (so the model's tool can never drift from the validator) and covers exactly
 * the Zod constructs those schemas use. Refinements (`.refine`/`.superRefine`) cannot be expressed in
 * JSON Schema; they are still enforced, because every tool result is re-validated with the Zod schema.
 *
 * Recursive (lazy) schemas, i.e. condition groups, are expanded inline up to `maxLazyDepth` levels
 * (the validator's own nesting limit) instead of using $ref.
 */
export type JsonSchema = Record<string, unknown>;

interface Ctx { lazyDepth: number; maxLazyDepth: number }

// Zod v3 internals are untyped here on purpose: only `_def` is read.
type AnyDef = { typeName: string; [k: string]: unknown };
const defOf = (s: ZodTypeAny) => (s as unknown as { _def: AnyDef })._def;

/** True when a value may be left out of an object (optional, or has a default). */
function isOptional(s: ZodTypeAny): boolean {
  const d = defOf(s);
  if (d.typeName === 'ZodOptional' || d.typeName === 'ZodDefault') return true;
  if (d.typeName === 'ZodEffects') return isOptional(d.schema as ZodTypeAny);
  return false;
}

function convert(s: ZodTypeAny, ctx: Ctx): JsonSchema | null {
  const d = defOf(s);
  const description = (d.description as string | undefined) ?? undefined;
  const withDesc = (j: JsonSchema | null) => (j && description ? { ...j, description } : j);
  switch (d.typeName) {
    case 'ZodString': {
      const out: JsonSchema = { type: 'string' };
      for (const c of (d.checks as { kind: string; value?: number; regex?: RegExp }[]) ?? []) {
        if (c.kind === 'min') out.minLength = c.value;
        else if (c.kind === 'max') out.maxLength = c.value;
        else if (c.kind === 'uuid') out.format = 'uuid';
        else if (c.kind === 'datetime') out.format = 'date-time';
        else if (c.kind === 'regex' && c.regex) out.pattern = c.regex.source;
      }
      return withDesc(out);
    }
    case 'ZodNumber': {
      const checks = (d.checks as { kind: string; value?: number; inclusive?: boolean }[]) ?? [];
      const out: JsonSchema = { type: checks.some((c) => c.kind === 'int') ? 'integer' : 'number' };
      for (const c of checks) {
        if (c.kind === 'min') out[c.inclusive === false ? 'exclusiveMinimum' : 'minimum'] = c.value;
        else if (c.kind === 'max') out[c.inclusive === false ? 'exclusiveMaximum' : 'maximum'] = c.value;
      }
      return withDesc(out);
    }
    case 'ZodBoolean':
      return withDesc({ type: 'boolean' });
    case 'ZodEnum':
      return withDesc({ type: 'string', enum: [...(d.values as string[])] });
    case 'ZodLiteral':
      return withDesc({ const: d.value });
    case 'ZodArray': {
      const items = convert(d.type as ZodTypeAny, ctx);
      if (!items) return null;
      const out: JsonSchema = { type: 'array', items };
      const min = d.minLength as { value: number } | null;
      const max = d.maxLength as { value: number } | null;
      if (min) out.minItems = min.value;
      if (max) out.maxItems = max.value;
      return withDesc(out);
    }
    case 'ZodObject': {
      const shape = (d.shape as () => Record<string, ZodTypeAny>)();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        const j = convert(v, ctx);
        if (!j) continue;
        properties[k] = j;
        if (!isOptional(v)) required.push(k);
      }
      const out: JsonSchema = { type: 'object', properties };
      if (required.length) out.required = required;
      if (d.unknownKeys === 'strict') out.additionalProperties = false;
      return withDesc(out);
    }
    case 'ZodDiscriminatedUnion':
    case 'ZodUnion': {
      const opts = d.typeName === 'ZodUnion' ? (d.options as ZodTypeAny[]) : [...(d.options as ZodTypeAny[])];
      const anyOf = opts.map((o) => convert(o, ctx)).filter((x): x is JsonSchema => !!x);
      if (!anyOf.length) return null;
      return withDesc(anyOf.length === 1 ? anyOf[0] : { anyOf });
    }
    case 'ZodOptional':
      return withDesc(convert(d.innerType as ZodTypeAny, ctx));
    case 'ZodNullable': {
      const inner = convert(d.innerType as ZodTypeAny, ctx);
      return inner ? withDesc({ anyOf: [inner, { type: 'null' }] }) : null;
    }
    case 'ZodDefault': {
      const inner = convert(d.innerType as ZodTypeAny, ctx);
      if (!inner) return null;
      const value = (d.defaultValue as () => unknown)();
      return withDesc({ ...inner, default: value });
    }
    case 'ZodEffects':
      return withDesc(convert(d.schema as ZodTypeAny, ctx));
    case 'ZodLazy': {
      if (ctx.lazyDepth >= ctx.maxLazyDepth) return null;
      return withDesc(convert((d.getter as () => ZodTypeAny)(), { ...ctx, lazyDepth: ctx.lazyDepth + 1 }));
    }
    case 'ZodRecord': {
      const value = convert(d.valueType as ZodTypeAny, ctx);
      return withDesc({ type: 'object', ...(value && Object.keys(value).length ? { additionalProperties: value } : {}) });
    }
    case 'ZodUnknown':
    case 'ZodAny':
      return withDesc({});
    default:
      // A construct this converter does not know: fail loudly in tests rather than emit a wrong schema.
      throw new Error(`zod-json: unsupported Zod type ${d.typeName}`);
  }
}

export function zodToJsonSchema(schema: ZodTypeAny, opts: { maxLazyDepth?: number } = {}): JsonSchema {
  return convert(schema, { lazyDepth: 0, maxLazyDepth: opts.maxLazyDepth ?? 3 }) ?? {};
}

/**
 * True when every valid value of this JSON schema must contain a uuid (a specific person, template or record).
 * The AI builder never knows real ids, so such steps are left for the admin to set up by hand.
 */
export function requiresId(schema: JsonSchema): boolean {
  if (schema.format === 'uuid') return true;
  if (Array.isArray(schema.anyOf)) return (schema.anyOf as JsonSchema[]).every(requiresId);
  if (schema.type === 'array') return typeof schema.minItems === 'number' && schema.minItems >= 1 && !!schema.items && requiresId(schema.items as JsonSchema);
  if (schema.type === 'object' && schema.properties) {
    const props = schema.properties as Record<string, JsonSchema>;
    return ((schema.required as string[] | undefined) ?? []).some((k) => props[k] && requiresId(props[k]));
  }
  return false;
}
