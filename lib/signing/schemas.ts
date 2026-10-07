import { z } from 'zod';
import { DATE_FORMATS, FIELD_TYPES, LIMITS } from '@/lib/signing/constants';

const frac = z.number().min(0).max(1);
export const fieldSchema = z.object({
  recipient_index: z.number().int().min(1).max(LIMITS.maxRecipients).nullable(),
  type: z.enum(FIELD_TYPES as [string, ...string[]]),
  page: z.number().int().min(1).max(LIMITS.maxPages),
  x: frac, y: frac, w: z.number().min(0.003).max(1), h: z.number().min(0.003).max(1),
  required: z.boolean(),
  label: z.string().max(120).nullable().optional(),
  group_key: z.string().max(60).nullable().optional(),
  prefill_value: z.string().max(LIMITS.maxTextLength).nullable().optional(),
  date_format: z.enum(DATE_FORMATS).nullable().optional(),
  source: z.enum(['acroform', 'text', 'ocr', 'manual']).default('manual'),
  confidence: z.number().min(0).max(1).nullable().optional(),
  needs_review: z.boolean().default(false),
  reviewed: z.boolean().default(false),
  role_hint: z.string().max(40).nullable().optional(),
  detection_note: z.string().max(300).nullable().optional(),
  source_ref: z.string().max(200).nullable().optional(),
}).refine((f) => f.x + f.w <= 1.0001 && f.y + f.h <= 1.0001, 'Field must stay on the page')
  .refine((f) => !f.prefill_value || f.type === 'text', 'Only text fields can be pre-filled');

export const recipientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(254),
});

export const draftSchema = z.object({
  subject: z.string().trim().max(200).default(''),
  message: z.string().trim().max(4000).default(''),
  signing_order: z.enum(['sequential', 'parallel']),
  expiry_days: z.number().int().min(1).max(90),
  auto_remind_days: z.number().int().min(1).max(30).nullable().default(null),
  auto_remind_max: z.number().int().min(1).max(10).default(3),
  require_access_code: z.boolean().default(false),
  recipients: z.array(recipientSchema).max(LIMITS.maxRecipients),
  fields: z.array(fieldSchema).max(LIMITS.maxFields),
});
export type DraftInput = z.infer<typeof draftSchema>;

export const submitValueSchema = z.object({
  field_id: z.string().uuid(),
  value: z.string().max(LIMITS.maxTextLength).nullish(),
  sig_method: z.enum(['drawn', 'typed']).nullish(),
  typed_text: z.string().max(200).nullish(),
  image_png: z.string().max(Math.ceil(LIMITS.maxSignatureImageBytes * 1.4)).nullish(),
});
export const submitSchema = z.object({
  values: z.array(submitValueSchema).max(LIMITS.maxFields),
  timezone: z.string().max(64).optional(),
});

/** Validates a base64 PNG and returns its pixel size, or null. */
export function inspectPngBase64(b64: string): { width: number; height: number; bytes: number } | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 33 || buf.length > LIMITS.maxSignatureImageBytes) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  if (!width || !height || width > 2400 || height > 1200) return null;
  return { width, height, bytes: buf.length };
}

export const reminderSchema = z.object({
  days: z.number().int().min(1).max(30).nullable(),
  max: z.number().int().min(1).max(10),
});

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the template a name').max(120),
  description: z.string().trim().max(500).default(''),
  roleLabels: z.array(z.string().trim().min(1, 'Name every signer role').max(60)).min(1).max(LIMITS.maxRecipients),
  keepPrefill: z.boolean().default(false),
});
export type TemplateInput = z.infer<typeof templateInputSchema>;

export const fromTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Give the document a title').max(200),
  leadId: z.string().uuid().nullable().default(null),
  recipients: z.array(recipientSchema).min(1).max(LIMITS.maxRecipients),
});
export type FromTemplateInput = z.infer<typeof fromTemplateSchema>;
