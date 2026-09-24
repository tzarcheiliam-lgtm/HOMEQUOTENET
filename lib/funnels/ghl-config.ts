import { z } from 'zod';

/** Non-secret GHL integration settings (integrations.config). Shared with scripts, so no server-only import. */
const id = z.string().min(1).max(100);
export const ghlConfigSchema = z.object({
  api: z.literal('ghl-v2'),
  locationId: id,
  pipelineId: id,
  pipelineStageId: id,
  // Server env var holding the Private Integration token, e.g. GHL_POOL_MASTERS_TOKEN.
  tokenEnv: z.string().regex(/^GHL_[A-Z0-9_]+$/).optional(),
  tags: z.array(z.string().min(1).max(100)).max(10).default([]),
  onlyQualified: z.boolean().default(true),
  source: z.string().max(100).default('HomeQuote website funnel'),
  customFields: z.array(z.object({
    id,
    // answers.<questionId>, attribution.<key> or "qualified".
    from: z.string().regex(/^(answers|attribution)\.[a-z0-9_]+$|^qualified$/),
    // Checkbox / multi-select GHL fields take arrays.
    multi: z.boolean().default(false),
    // Funnel answer value -> exact GHL picklist option. Unmapped answers use the option label.
    map: z.record(z.string()).default({}),
  })).max(50).default([]),
});
export type GhlConfig = z.infer<typeof ghlConfigSchema>;
