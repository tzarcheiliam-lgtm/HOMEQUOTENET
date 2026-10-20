import 'server-only';
import { loadAccessibleLead } from './access';
import { isUuid } from './context';
import { clip } from './untrusted';
import { createAction, fullName, leadHref, type ToolContext, type ToolDef } from './tools';
import {
  canIssueDocuments, contentHashOf, listApprovedTemplates, listDocumentsForActor, loadDocumentForActor, prepareDocument, previewOfDocument,
  signatureBlockers, type DocActor,
} from '@/lib/documents/service';
import { sanitizeValues, templateAllowedForState, DOC_TYPE_LABELS, type CustomerDocType } from '@/lib/documents/preview';
import { sectionsSchema } from '@/lib/contracts/types';
import { VARIABLE_BY_KEY, usedVariables } from '@/lib/contracts/variables';

const actorOf = (ctx: ToolContext): DocActor => ({ profile: ctx.profile, db: ctx.db, admin: ctx.admin });
const DOC_TYPES = ['work_order', 'proposal', 'contract'] as const;
export const docHref = (leadId: string) => `${leadHref(leadId)}#documents`;

async function listTemplates(ctx: ToolContext, input: Record<string, unknown>) {
  const docType = (DOC_TYPES as readonly string[]).includes(String(input.doc_type)) ? (input.doc_type as CustomerDocType) : undefined;
  let state: string | null | undefined;
  if (isUuid(input.lead_id)) {
    const lead = await loadAccessibleLead(ctx.db, ctx.profile, input.lead_id);
    if (!lead) return { error: 'not_found' };
    state = typeof lead.state === 'string' ? lead.state : null;
  }
  const templates = await listApprovedTemplates(ctx.admin, { docType, ...(state !== undefined ? { state } : {}) });
  return {
    count: templates.length,
    templates: templates.map(t => ({
      template_id: t.id, name: t.name, type: DOC_TYPE_LABELS[t.docType], approved_states: t.jurisdictions.length ? t.jurisdictions : 'any', version: t.versionNo,
      // What the person issuing the document must provide (price, scope...). Lead details are filled automatically.
      needs_from_user: usedVariables(t.sections).known.filter(k => VARIABLE_BY_KEY.get(k)?.source === 'input' && !VARIABLE_BY_KEY.get(k)?.optional)
        .map(k => VARIABLE_BY_KEY.get(k)!.label),
    })),
    note: count0(templates.length, docType, state),
  };
}
const count0 = (n: number, docType?: string, state?: string | null) =>
  n > 0 ? undefined
    : `No approved ${docType ? DOC_TYPE_LABELS[docType as CustomerDocType].toLowerCase() : 'document'} templates${state ? ` for ${state}` : ''}. An admin must approve a template (Contracts → Templates) before documents can be created. Do not write the document text yourself.`;

async function prepare(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.lead_id) || !isUuid(input.template_id)) return { error: 'invalid_ids' };
  const res = await prepareDocument(actorOf(ctx), {
    leadId: input.lead_id, templateId: input.template_id, values: input.values, title: typeof input.title === 'string' ? input.title : undefined,
    contractorId: isUuid(input.contractor_id) ? input.contractor_id : null,
  });
  if (res.status === 'error') return res.options ? { error: res.error, choose_contractor_from: res.options } : { error: res.error };
  if (res.status === 'needs_info') {
    return {
      status: 'needs_info',
      ask_the_user_for: res.preview.missing.map(m => ({ field: m.key, label: m.label, type: m.kind, hint: m.hint })),
      invalid: res.preview.invalid,
      already_filled_from_lead: res.preview.fields.filter(f => f.fromLead).map(f => f.label),
      note: 'Do not guess these values. Ask the user, then call prepare_document again with values.',
    };
  }
  const lead = await loadAccessibleLead(ctx.db, ctx.profile, input.lead_id);
  const p = res.preview;
  const created = await createAction(ctx, {
    kind: 'create_document', leadId: res.payload.lead_id, payload: res.payload as unknown as Record<string, unknown>,
    preview: {
      title: `Create ${DOC_TYPE_LABELS[p.docType].toLowerCase()}: ${p.title}`,
      target: { label: lead ? fullName(lead) : 'Lead', href: docHref(res.payload.lead_id) },
      lines: [`Template: ${p.templateName} (v${p.templateVersionNo}${p.jurisdiction ? `, ${p.jurisdiction}` : ''})`, 'Saves a draft. Nothing is sent to the customer.'],
      warning: p.reviewPassages ? 'The approved template still contains [REVIEW: …] passages, so it cannot be sent until an admin fixes the template.' : undefined,
      document: p, confirmLabel: 'Save draft',
    },
  });
  if ('error' in created) return created;
  return { status: 'preview_ready', action_id: created.id, note: 'The user sees an editable preview with a Save draft button. Nothing is saved until they press it. The wording comes from the approved template and cannot be changed.' };
}

async function listDocs(ctx: ToolContext, input: Record<string, unknown>) {
  const rows = await listDocumentsForActor(actorOf(ctx), isUuid(input.lead_id) ? input.lead_id : null, 10);
  return {
    count: rows.length,
    documents: rows.map(r => ({ document_id: r.id, type: DOC_TYPE_LABELS[r.doc_type as CustomerDocType], title: r.title, status: r.status, version: r.current_version_no, created: r.created_at, lead_link: docHref(r.lead_id) })),
  };
}

async function getDoc(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.document_id)) return { error: 'invalid_document_id' };
  const doc = await loadDocumentForActor(actorOf(ctx), input.document_id);
  if (!doc) return { error: 'not_found' };
  const preview = previewOfDocument(doc);
  const blockers = doc.status === 'draft' ? signatureBlockers(doc, ctx.profile).map(b => b.message) : [];
  return {
    document: { document_id: doc.id, type: DOC_TYPE_LABELS[doc.doc_type], title: doc.title, status: doc.status, version: doc.current_version_no, template: `${doc.template_name} v${doc.template_version_no}`, link: docHref(doc.lead_id) },
    customer: { name: doc.customer.name, email: doc.customer.email },
    values: Object.fromEntries(preview.fields.map(f => [f.label, clip(f.value, 400)])),
    text: preview.sections.map(s => ({ section: s.title, text: clip(s.text, 700) })),
    cannot_be_sent_yet_because: blockers,
  };
}

async function proposeChanges(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.document_id)) return { error: 'invalid_document_id' };
  const doc = await loadDocumentForActor(actorOf(ctx), input.document_id);
  if (!doc) return { error: 'not_found' };
  if (doc.status !== 'draft') return { error: 'already_sent_cannot_edit' };
  const sections = sectionsSchema.parse(doc.sections);
  const changes = sanitizeValues(sections, input.values);
  const changed = Object.entries(changes).filter(([k, v]) => (doc.variables[k] ?? '') !== v);
  if (!changed.length) return { error: 'no_changes', note: 'Only merge-field values can be edited; the approved wording cannot be changed.' };
  const values = { ...doc.variables, ...changes };
  const preview = previewOfDocument(doc, values);
  if (preview.missing.length || preview.invalid.length) return { status: 'needs_info', missing: preview.missing.map(m => m.label), invalid: preview.invalid };
  const lines = changed.map(([k, v]) => `${VARIABLE_BY_KEY.get(k)?.label ?? k}: ${clip(doc.variables[k], 80) ?? '(empty)'} → ${clip(v, 80)}`);
  return createAction(ctx, {
    kind: 'update_document', leadId: doc.lead_id, documentId: doc.id, payload: { document_id: doc.id, values: changes, expected_version_no: doc.current_version_no },
    preview: { title: `Edit ${doc.title}`, target: { label: doc.title, href: docHref(doc.lead_id) }, lines: [...lines, `Saves as version ${doc.current_version_no + 1}; earlier versions are kept.`], document: preview, confirmLabel: 'Save changes' },
  });
}

async function proposeSignature(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.document_id)) return { error: 'invalid_document_id' };
  const doc = await loadDocumentForActor(actorOf(ctx), input.document_id);
  if (!doc) return { error: 'not_found' };
  const blockers = signatureBlockers(doc, ctx.profile);
  if (blockers.length) return { error: 'cannot_send_yet', reasons: blockers.map(b => b.message) };
  const sections = sectionsSchema.parse(doc.sections);
  const sha = contentHashOf(doc.title, doc.template_sha256, sections, doc.variables);
  return createAction(ctx, {
    kind: 'request_signature', leadId: doc.lead_id, documentId: doc.id, payload: { document_id: doc.id, version_no: doc.current_version_no, content_sha256: sha },
    preview: {
      title: `Send for e-signature: ${doc.title}`,
      target: { label: doc.title, href: docHref(doc.lead_id) },
      lines: [
        `Version ${doc.current_version_no} (${doc.template_name} v${doc.template_version_no})`,
        `Customer: ${doc.customer.name} <${doc.customer.email}> receives a secure signing link by email`,
        `You (${ctx.profile.email}) also sign as the contractor`,
        'Once sent, the document can no longer be edited.',
      ],
      warning: 'This emails the customer. It is a separate approval from saving the draft.',
      confirmLabel: 'Send for signature',
    },
  });
}

export const DOC_TOOLS: ToolDef[] = [
  {
    name: 'list_document_templates',
    description: 'Admin-approved templates for work orders, proposals and contracts that can be used for a customer. Pass lead_id so contracts are filtered to the customer’s state. If there are none, say so: you must never write document or legal text yourself.',
    input_schema: { type: 'object', properties: { doc_type: { type: 'string', enum: [...DOC_TYPES] }, lead_id: { type: 'string' } }, additionalProperties: false },
    run: listTemplates,
  },
  {
    name: 'prepare_document',
    description: 'Start a work order, proposal or contract for a lead from an approved template. Customer and project details are pulled from the lead automatically. If required information is missing (scope, price, payment terms, dates) it returns what to ask the user: ask, never invent. When complete it shows the user an editable preview; nothing is saved until they confirm.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' }, template_id: { type: 'string' }, title: { type: 'string' },
        values: { type: 'object', description: 'Merge-field values the USER provided, keyed by field name (e.g. scope_of_work, total_price, payment_schedule, start_date). Only facts the user stated.', additionalProperties: { type: 'string' } },
        contractor_id: { type: 'string', description: 'Admins only, when the lead is assigned to several contractors.' },
      },
      required: ['lead_id', 'template_id'], additionalProperties: false,
    },
    run: prepare,
  },
  {
    name: 'list_documents',
    description: 'Work orders, proposals and contracts already created, optionally for one lead.',
    input_schema: { type: 'object', properties: { lead_id: { type: 'string' } }, additionalProperties: false },
    run: listDocs,
  },
  {
    name: 'get_document',
    description: 'One document: status, version, customer, field values, text and anything blocking it from being sent.',
    input_schema: { type: 'object', properties: { document_id: { type: 'string' } }, required: ['document_id'], additionalProperties: false },
    run: getDoc,
  },
  {
    name: 'propose_document_changes',
    description: 'PROPOSE editing merge-field values (names, prices, dates, scope) of a DRAFT document. Saves a new version after the user confirms. The approved wording cannot be edited.',
    input_schema: {
      type: 'object',
      properties: { document_id: { type: 'string' }, values: { type: 'object', additionalProperties: { type: 'string' } } },
      required: ['document_id', 'values'], additionalProperties: false,
    },
    run: proposeChanges,
  },
  {
    name: 'propose_signature_request',
    description: 'PROPOSE sending a saved draft to the customer for electronic signature. This is a separate approval from saving. Only call when the user explicitly asks to send it. Never claim it was sent until the user confirmed and the app reports success.',
    input_schema: { type: 'object', properties: { document_id: { type: 'string' } }, required: ['document_id'], additionalProperties: false },
    run: proposeSignature,
  },
];

export { canIssueDocuments, templateAllowedForState };
