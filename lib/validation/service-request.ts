import { z } from 'zod';
import { NOTES_MAX, REQUEST_SOURCES, REQUEST_STATUSES, SERVICE_SLUGS, isRequestableService } from '@/lib/growth/catalog';

/**
 * A contractor's request for a Growth Tools service.
 *
 * Deliberately has no company or user fields: the server action takes both
 * from the signed-in profile, so a modified form cannot file for another
 * company. RLS on service_requests enforces the same rule in the database.
 */
export const serviceRequestSchema = z.object({
  service: z
    .enum(SERVICE_SLUGS, { errorMap: () => ({ message: 'Choose a service' }) })
    .refine(isRequestableService, 'This service is no longer offered. Choose another one.'),
  notes: z
    .string()
    .trim()
    .max(NOTES_MAX, `Keep notes under ${NOTES_MAX.toLocaleString()} characters`)
    .transform((s) => (s === '' ? null : s))
    .nullable(),
  // Where the request was made from. Unknown values are dropped, not rejected.
  source: z.enum(REQUEST_SOURCES).nullable().catch(null),
});

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export function parseServiceRequest(formData: FormData) {
  return serviceRequestSchema.safeParse({
    service: formData.get('service'),
    notes: String(formData.get('notes') ?? ''),
    source: formData.get('source'),
  });
}

const statusValues = REQUEST_STATUSES.map((s) => s.value) as [string, ...string[]];

export const statusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(statusValues),
});
