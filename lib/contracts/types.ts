/**
 * Contract document model. Pure (safe to import from client components).
 *
 * Content is a small, whitelisted subset of the TipTap/ProseMirror JSON schema, grouped into ordered SECTIONS.
 * The same normalized content is rendered by the HTML preview and by the PDF generator (see render-model.ts),
 * so the two cannot drift structurally.
 */
import { z } from 'zod';

export interface DocMark { type: 'bold' | 'italic' | 'underline' }
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
}

export const NODE_TYPES = [
  'doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'table', 'tableRow', 'tableCell', 'tableHeader',
  'hardBreak', 'text', 'pageBreak', 'horizontalRule',
] as const;
const NODE_SET = new Set<string>(NODE_TYPES);
const MARK_SET = new Set(['bold', 'italic', 'underline']);

export const LIMITS = {
  maxSections: 40,
  maxDocBytes: 150_000,
  maxTitle: 200,
  maxVariableLength: 6000,
  maxLogoBytes: 2 * 1024 * 1024,
  maxAttachmentBytes: 8 * 1024 * 1024,
  maxAttachments: 5,
  maxSigners: 6,
} as const;

/** Drops anything outside the whitelist (unknown nodes, marks, attributes). Never trusts stored/posted JSON. */
export function sanitizeDoc(node: unknown, depth = 0): DocNode | null {
  if (!node || typeof node !== 'object' || depth > 12) return null;
  const n = node as Record<string, unknown>;
  const type = typeof n.type === 'string' ? n.type : '';
  if (!NODE_SET.has(type)) return null;
  const out: DocNode = { type };
  if (type === 'text') {
    if (typeof n.text !== 'string' || !n.text) return null;
    out.text = n.text.slice(0, 20_000);
    const marks = Array.isArray(n.marks) ? n.marks : [];
    const kept = marks.filter((m): m is DocMark => !!m && typeof m === 'object' && MARK_SET.has((m as DocMark).type)).map((m) => ({ type: m.type }));
    if (kept.length) out.marks = kept;
    return out;
  }
  if (type === 'heading') {
    const level = Number((n.attrs as { level?: unknown } | undefined)?.level);
    out.attrs = { level: level === 1 || level === 3 ? level : 2 };
  }
  if (type === 'orderedList') {
    const start = Number((n.attrs as { start?: unknown } | undefined)?.start);
    if (Number.isInteger(start) && start > 1 && start < 1000) out.attrs = { start };
  }
  if (type === 'tableCell' || type === 'tableHeader') {
    const a = (n.attrs ?? {}) as Record<string, unknown>;
    const span = (v: unknown) => { const x = Number(v); return Number.isInteger(x) && x > 1 && x <= 12 ? x : undefined; };
    const attrs: Record<string, unknown> = {};
    if (span(a.colspan)) attrs.colspan = span(a.colspan);
    if (span(a.rowspan)) attrs.rowspan = span(a.rowspan);
    if (Object.keys(attrs).length) out.attrs = attrs;
  }
  if (Array.isArray(n.content)) {
    const kids = n.content.map((c) => sanitizeDoc(c, depth + 1)).filter((c): c is DocNode => !!c);
    if (kids.length) out.content = kids;
  }
  return out;
}

export interface ContractSection {
  id: string;
  /** Library key (e.g. "payment_terms") or "custom". */
  key: string;
  kind: 'rich' | 'signatures';
  title: string;
  showTitle: boolean;
  numbered: boolean;
  pageBreakBefore: boolean;
  doc: DocNode;
}

export const emptyDoc = (): DocNode => ({ type: 'doc', content: [{ type: 'paragraph' }] });

const docSchema = z.unknown().transform((v, ctx) => {
  const d = sanitizeDoc(v);
  if (!d || d.type !== 'doc') { ctx.addIssue({ code: 'custom', message: 'Invalid section content' }); return z.NEVER; }
  if (JSON.stringify(d).length > LIMITS.maxDocBytes) { ctx.addIssue({ code: 'custom', message: 'A section is too long' }); return z.NEVER; }
  return d;
});

export const sectionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  key: z.string().trim().min(1).max(60).default('custom'),
  kind: z.enum(['rich', 'signatures']).default('rich'),
  title: z.string().trim().max(160).default(''),
  showTitle: z.boolean().default(true),
  numbered: z.boolean().default(true),
  pageBreakBefore: z.boolean().default(false),
  doc: docSchema,
});
export const sectionsSchema = z.array(sectionSchema).max(LIMITS.maxSections).superRefine((s, ctx) => {
  if (new Set(s.map((x) => x.id)).size !== s.length) ctx.addIssue({ code: 'custom', message: 'Duplicate section ids' });
  if (s.filter((x) => x.kind === 'signatures').length > 1) ctx.addIssue({ code: 'custom', message: 'Only one signatures section is allowed' });
});

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------
export const BRANDING_MODES = ['side_by_side', 'homequote_only', 'client_only', 'none'] as const;
export type BrandingMode = (typeof BRANDING_MODES)[number];
export const BRANDING_MODE_LABELS: Record<BrandingMode, string> = {
  side_by_side: 'Both logos side by side',
  homequote_only: 'HomeQuote logo only',
  client_only: 'Client logo only',
  none: 'No logos',
};
export const LOGO_SIZES = { small: 34, medium: 44, large: 56 } as const;

export const brandingSchema = z.object({
  mode: z.enum(BRANDING_MODES).default('side_by_side'),
  /** Put the client logo on the left (default: HomeQuote on the left). */
  swap: z.boolean().default(false),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  /** center = grouped in the middle with a divider; spread = HomeQuote left edge, client right edge. */
  align: z.enum(['center', 'spread']).default('center'),
  /** Logo uploaded for THIS agreement (storage path in contract-assets). Falls back to the CRM logo. */
  clientLogoPath: z.string().max(300).nullable().default(null),
  /** Use the saved CRM logo when no agreement-specific logo is set. */
  useCrmLogo: z.boolean().default(true),
});
export type Branding = z.infer<typeof brandingSchema>;
export const defaultBranding = (): Branding => brandingSchema.parse({});

// ---------------------------------------------------------------------------
// Signers
// ---------------------------------------------------------------------------
export const signerSchema = z.object({
  /** "client" | "homequote" | "other" - decides which company the signature block is for. */
  role: z.enum(['client', 'homequote', 'other']),
  label: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1, 'Enter the signer’s name').max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
});
export type ContractSigner = z.infer<typeof signerSchema>;

export const clientSchema = z.object({
  company: z.string().trim().max(200).default(''),
  name: z.string().trim().max(200).default(''),
  email: z.string().trim().max(254).default(''),
  phone: z.string().trim().max(60).default(''),
  address: z.string().trim().max(400).default(''),
});
export type ContractClient = z.infer<typeof clientSchema>;

export const settingsSchema = z.object({
  signingOrder: z.enum(['sequential', 'parallel']).default('sequential'),
  expiryDays: z.number().int().min(1).max(90).default(14),
  subject: z.string().trim().max(200).default(''),
  message: z.string().trim().max(4000).default(''),
  autoRemindDays: z.number().int().min(1).max(30).nullable().default(3),
  /** Admin confirmed they know placeholder passages ([REVIEW: ...]) remain in the text. */
  placeholdersAcknowledged: z.boolean().default(false),
  roles: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
});
export type ContractSettings = z.infer<typeof settingsSchema>;
