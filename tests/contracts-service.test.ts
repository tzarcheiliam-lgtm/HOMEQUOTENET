/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from '@cantoo/pdf-lib';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStorage, fakeSupabase } from './helpers/pglite-supabase';
import { BASE_DDL, MIGRATIONS_BEFORE_0041 } from './helpers/workflow-base-schema';

/**
 * Contracts & Templates against the REAL migrations (workflow 0020-0041, signing 0039/0040, contracts 0042) in an
 * in-process Postgres, driving the real service layer end to end: template library -> contract draft -> validation
 * -> PDF -> signing request -> two signers -> final PDF, plus tenant isolation, immutability and workflow events.
 * Only Gmail and object storage are faked.
 */
const h = vi.hoisted(() => ({ client: null as any, emails: [] as any[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: async (m: any) => { h.emails.push(m); return { id: 'm', fromEmail: 'hq@test' }; } }));

import * as ct from '@/lib/contracts/contracts';
import * as tp from '@/lib/contracts/templates';
import { STARTER_TEMPLATES } from '@/lib/contracts/library';
import * as signer from '@/lib/signing/signer';
import { finalizeVersion } from '@/lib/signing/finalize';
import { sha256Hex } from '@/lib/signing/pdf-validate';
import type { Profile } from '@/lib/types';

const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
let storage: FakeStorage;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const ctx = { ip: '203.0.113.5', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1' };
let cA: string, cB: string;
let admin: Profile, ownerA: Profile, staffB: Profile, setter: Profile;

const sigPng = (() => { const c = createCanvas(300, 90); const g = c.getContext('2d'); g.fillStyle = '#0b1b4d'; g.fillRect(10, 40, 280, 6); return c.toBuffer('image/png').toString('base64'); })();
const tokenFrom = (email: any) => /#t=([A-Za-z0-9_-]{43})/.exec(email.text)![1];
const png = async (w = 300, h2 = 120) => { const c = createCanvas(w, h2); const g = c.getContext('2d'); g.fillStyle = '#c2410c'; g.fillRect(20, 20, w - 40, h2 - 40); return new Uint8Array(await c.encode('png')); };

const FILL = {
  effective_date: '2026-11-01', appointment_price: '150', payment_schedule: 'Invoiced monthly for the prior month’s qualified appointments, due in 15 days.',
  service_description: 'Exclusive, pre-qualified homeowner appointments for pool remodeling.', scope_of_work: 'Book appointments in Los Angeles County.',
  contract_duration: '12 months', cancellation_notice: '30 days', refund_policy: 'Unqualified appointments are credited.', qualification_standards: 'Homeowner, in service area.',
  governing_law: 'California',
};

async function pay(): Promise<string> {
  const t = (await q(`select id from contract_templates where starter_key='pay_per_appointment'`))[0].id;
  return t;
}
async function readyContract(contractor: string | null = cA, tweak: Record<string, string> = {}) {
  const { id } = await ct.createContract(admin, { templateId: await pay(), contractorId: contractor });
  const cur = await ct.loadContract(admin, id);
  await ct.saveContract(admin, id, { variables: { ...cur.variables, ...FILL, ...tweak }, client: { ...cur.client, address: '12 Main St, Springfield' } });
  return id;
}
const signAs = async (token: string, name: string) => {
  const s: any = await signer.signerOpen(token, ctx);
  expect(s.state).toBe('ok');
  const values = s.fields.filter((f: any) => f.mine && f.type !== 'date').map((f: any) => (f.type === 'signature' ? { field_id: f.id, sig_method: 'typed', typed_text: name, image_png: sigPng } : { field_id: f.id, value: name }));
  await signer.signerConsent(token, ctx);
  return signer.signerSubmit(token, { values, timezone: 'America/Los_Angeles' }, ctx);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BASE_DDL);
  await db.exec(`alter table public.lead_email_deliveries add constraint lead_email_deliveries_kind_check check (kind in ('new_lead_alert','qualified_lead'))`);
  for (const f of MIGRATIONS_BEFORE_0041) await db.exec(read(f));
  await db.exec(read('0041_visual_workflow_builder.sql'));
  await db.exec(`alter table public.contractors add column contact_name text, add column email text, add column phone text, add column website text`);
  for (const f of ['0039_document_signing.sql', '0040_signing_templates_reminders_codes.sql', '0042_contracts_templates.sql']) {
    try { await db.exec(read(f)); } catch (e) { throw new Error(`${f}: ${(e as Error).message}`); }
  }
  storage = new FakeStorage();
  h.client = fakeSupabase(db, storage);
  cA = (await q(`insert into contractors(name, contact_name, email, phone) values ('Acme Pools LLC','Jordan Rivera','jordan@acme.test','(555) 010-0142') returning id`))[0].id;
  cB = (await q(`insert into contractors(name, contact_name, email) values ('Beta Roofing','Bea Beta','bea@beta.test') returning id`))[0].id;
  const mk = async (role: string, contractor: string | null, cr: string | null, name: string) => {
    const id = (await q(`insert into profiles(role, contractor_id, contractor_role, full_name, email) values ($1,$2,$3,$4,$5) returning id`, [role, contractor, cr, name, `${name.toLowerCase().replace(/\W/g, '')}@hq.test`]))[0].id;
    return { id, role, contractor_id: contractor, contractor_role: cr, is_active: true, full_name: name, email: `${name.toLowerCase().replace(/\W/g, '')}@hq.test` } as unknown as Profile;
  };
  admin = await mk('admin', null, null, 'Liam Admin');
  ownerA = await mk('contractor', cA, 'owner', 'Jordan Owner');
  staffB = await mk('contractor', cB, 'staff', 'Bea Staff');
  setter = await mk('setter', null, null, 'Sam Setter');
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { h.emails.length = 0; });

describe('template library', () => {
  it('seeds the seven starter templates once, published, flagged for review', async () => {
    expect(await tp.ensureStarterTemplates(admin)).toBe(7);
    expect(await tp.ensureStarterTemplates(admin)).toBe(0);
    const rows = await q(`select name, status, latest_version_no, requires_review, starter_key from contract_templates order by name`);
    expect(rows).toHaveLength(7);
    expect(rows.every((r: any) => r.status === 'published' && r.latest_version_no === 1 && r.requires_review)).toBe(true);
    expect(rows.map((r: any) => r.name)).toEqual(expect.arrayContaining(STARTER_TEMPLATES.map((s) => s.name)));
    for (const t of await q(`select sections from contract_templates`)) expect(t.sections.some((s: any) => s.kind === 'signatures')).toBe(true);
  });

  it('only administrators manage templates', async () => {
    await expect(tp.listTemplates(setter)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(tp.listTemplates(ownerA)).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('creates, edits, publishes (versioned), duplicates, sets default, archives and deletes', async () => {
    const { id } = await tp.createTemplate(admin, { name: 'My Agreement', category: 'Custom' });
    await expect(ct.createContract(admin, { templateId: id })).rejects.toMatchObject({ code: 'not_published' });
    const cur = (await tp.getTemplate(admin, id)).template;
    const sections = cur.sections.map((s) => (s.key === 'additional_terms' ? { ...s, title: 'Extra Terms' } : s));
    await tp.saveTemplate(admin, id, { sections });
    expect(await tp.publishTemplate(admin, id)).toEqual({ versionNo: 1, unchanged: false });
    expect(await tp.publishTemplate(admin, id)).toEqual({ versionNo: 1, unchanged: true });
    await tp.saveTemplate(admin, id, { description: 'changed' });
    expect((await tp.publishTemplate(admin, id)).versionNo).toBe(2);
    // unknown merge fields block publishing
    const bad = JSON.parse(JSON.stringify(sections));
    bad[1].doc.content.push({ type: 'paragraph', content: [{ type: 'text', text: 'Hello {{not_a_field}}' }] });
    await tp.saveTemplate(admin, id, { sections: bad });
    await expect(tp.publishTemplate(admin, id)).rejects.toMatchObject({ code: 'invalid' });
    // hostile content is stripped, not stored
    await tp.saveTemplate(admin, id, { sections: [{ id: 'x', key: 'custom', kind: 'rich', title: 'T', showTitle: true, numbered: true, pageBreakBefore: false, doc: { type: 'doc', content: [{ type: 'script', content: [] }, { type: 'paragraph', content: [{ type: 'text', text: 'ok', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] } }, sections.at(-1)] });
    const stored = (await tp.getTemplate(admin, id)).template.sections[0].doc;
    expect(JSON.stringify(stored)).not.toMatch(/script|javascript|link/);

    const dup = await tp.duplicateTemplate(admin, id);
    expect((await tp.getTemplate(admin, dup.id)).template).toMatchObject({ name: 'My Agreement (copy)', status: 'draft', is_default: false });
    await tp.saveTemplate(admin, dup.id, { sections }); await tp.publishTemplate(admin, dup.id);
    await tp.setDefaultTemplate(admin, id);
    await tp.setDefaultTemplate(admin, dup.id);
    expect((await q(`select id from contract_templates where is_default`)).map((r: any) => r.id)).toEqual([dup.id]);
    await expect(tp.setDefaultTemplate(admin, (await q(`select id from contract_templates where status='draft' limit 1`))[0]?.id ?? id)).resolves.toBeUndefined();

    await tp.setTemplateArchived(admin, id, true);
    expect((await tp.listTemplates(admin)).some((t) => t.id === id)).toBe(false);
    await tp.deleteTemplate(admin, id);
    expect(await q(`select 1 from contract_templates where id=$1`, [id])).toHaveLength(0);
    expect(await q(`select 1 from contract_template_versions where template_id=$1`, [id])).toHaveLength(0);
  });

  it('previews a template as a PDF', async () => {
    const prev = await tp.previewTemplatePdf(admin, await pay());
    const doc = await PDFDocument.load(Buffer.from(prev.base64, 'base64'));
    expect(doc.getPageCount()).toBe(prev.pageCount);
    expect(prev.pageCount).toBeGreaterThanOrEqual(2);
  });
});

describe('creating a contract from a template and filling it from the CRM', () => {
  it('copies the published template, fills the client from the CRM and sets default signers', async () => {
    const { id } = await ct.createContract(admin, { templateId: await pay(), contractorId: cA });
    const row = await ct.loadContract(admin, id);
    expect(row.client).toMatchObject({ company: 'Acme Pools LLC', name: 'Jordan Rivera', email: 'jordan@acme.test', phone: '(555) 010-0142' });
    expect(row.signers.map((s) => [s.role, s.email])).toEqual([['client', 'jordan@acme.test'], ['homequote', 'liamadmin@hq.test']]);
    expect(row.template_name).toBe('Pay Per Booked Appointment Agreement');
    expect(row.sections.length).toBeGreaterThan(8);
    expect((await q(`select event_type from contract_events where contract_id=$1`, [id])).map((r: any) => r.event_type)).toEqual(['created']);
    await expect(ct.createContract(admin, { templateId: await pay(), contractorId: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject({ code: 'bad_contractor' });
  });

  it('blocks sending until required merge fields are filled, with a clear list', async () => {
    const { id } = await ct.createContract(admin, { templateId: await pay(), contractorId: cA });
    const err: any = await ct.sendContract(admin, id).catch((e) => e);
    expect(err.code).toBe('validation');
    const fields = err.extra.issues.map((i: any) => i.field);
    expect(fields).toEqual(expect.arrayContaining(['effective_date', 'appointment_price', 'payment_schedule', 'service_description']));
    expect((await q(`select signing_version_id from contracts where id=$1`, [id]))[0].signing_version_id).toBeNull();
    expect(h.emails).toHaveLength(0);
    // wrongly typed money / date are rejected too
    await ct.saveContract(admin, id, { variables: { ...FILL, appointment_price: 'about 150', effective_date: '2026-13-45' } });
    const err2: any = await ct.sendContract(admin, id, { acknowledgePlaceholders: true }).catch((e) => e);
    expect(err2.extra.issues.map((i: any) => i.code)).toEqual(expect.arrayContaining(['invalid_variable']));
  });

  it('requires an acknowledgement while [REVIEW: …] placeholders remain', async () => {
    const id = await readyContract();
    const err: any = await ct.sendContract(admin, id).catch((e) => e);
    expect(err.extra.issues.map((i: any) => i.code)).toEqual(['placeholders_unacknowledged']);
  });

  it('refuses to save a duplicate signer email and requires valid signers', async () => {
    const id = await readyContract();
    await ct.saveContract(admin, id, { signers: [{ role: 'client', label: 'Client', name: 'A', email: 'same@x.test' }, { role: 'homequote', label: 'HQ', name: 'B', email: 'same@x.test' }] });
    const err: any = await ct.sendContract(admin, id, { acknowledgePlaceholders: true }).catch((e) => e);
    expect(err.extra.issues.map((i: any) => i.code)).toContain('duplicate_signer');
  });
});

describe('branding: two logos, upload validation, CRM logo, fallback', () => {
  it('rejects non-images and oversize files; stores a normalized PNG privately', async () => {
    const id = await readyContract();
    await expect(ct.uploadClientLogo(admin, { contractId: id, bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), saveToCrm: false })).rejects.toMatchObject({ code: 'bad_logo' });
    await expect(ct.uploadClientLogo(admin, { contractId: id, bytes: new Uint8Array(3 * 1024 * 1024), saveToCrm: false })).rejects.toMatchObject({ code: 'bad_logo' });
    const out = await ct.uploadClientLogo(admin, { contractId: id, bytes: await png(), saveToCrm: false });
    expect(out.path).toMatch(/^logos\/contract-/);
    const stored = storage.files.get(out.path)!;
    expect(Array.from(stored.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('accepts JPG and WebP, keeps transparency for PNG/WebP, never stretches', async () => {
    const id = await readyContract();
    const c = createCanvas(600, 150); const g = c.getContext('2d'); g.fillStyle = 'rgba(10,20,200,0.8)'; g.fillRect(100, 40, 400, 70);
    for (const fmt of ['jpeg', 'webp'] as const) {
      const bytes = new Uint8Array(await c.encode(fmt as any, 90));
      const r = await ct.uploadClientLogo(admin, { contractId: id, bytes, saveToCrm: false });
      expect(r.width / r.height).toBeGreaterThan(1);
    }
    const png2 = await ct.uploadClientLogo(admin, { contractId: id, bytes: new Uint8Array(await c.encode('png')), saveToCrm: false });
    // transparent margins were trimmed: 400x70 content => ratio ~5.7, not the 4:1 canvas
    expect(png2.width / png2.height).toBeCloseTo(400 / 70, 0);
  });

  it('saves a logo to the CRM and reuses it automatically; removing it falls back to a tile', async () => {
    await ct.uploadClientLogo(admin, { contractorId: cA, bytes: await png(), saveToCrm: true });
    const id = await readyContract(cA);
    const row = await ct.loadContract(admin, id);
    expect(await ct.clientLogoUrl(row)).toMatch(/^https:\/\/storage\.test\/signed\//);
    const withLogo = await ct.previewContractPdf(admin, id);
    await ct.removeClientLogo(admin, id); // hides the CRM logo for this agreement only
    expect(await ct.clientLogoUrl(await ct.loadContract(admin, id))).toBeNull();
    const without = await ct.previewContractPdf(admin, id);
    expect(Buffer.from(withLogo.base64, 'base64').length).toBeGreaterThan(Buffer.from(without.base64, 'base64').length);
    expect((await q(`select logo_path from contractors where id=$1`, [cA]))[0].logo_path).toMatch(/^logos\/c-/);
    await ct.removeCrmLogo(admin, cA);
    expect((await q(`select logo_path from contractors where id=$1`, [cA]))[0].logo_path).toBeNull();
  });

  it('supports all four branding modes in the PDF', async () => {
    const id = await readyContract(cA);
    const sizes: Record<string, number> = {};
    for (const mode of ['side_by_side', 'homequote_only', 'client_only', 'none']) {
      await ct.saveContract(admin, id, { branding: { mode } });
      const p = await ct.previewContractPdf(admin, id);
      expect(p.pageCount).toBeGreaterThanOrEqual(2);
      sizes[mode] = Buffer.from(p.base64, 'base64').length;
    }
    expect(sizes.none).toBeLessThan(sizes.homequote_only);
    expect(sizes.side_by_side).toBeGreaterThanOrEqual(sizes.homequote_only);
  });
});

describe('sending, signing and completion through the signing engine', () => {
  let contractId: string;
  let firstToken = '';
  it('sends: renders the PDF, registers fields for every signer, emails the first signer, locks the agreement', async () => {
    contractId = await readyContract(cA);
    const sent = await ct.sendContract(admin, contractId, { acknowledgePlaceholders: true });
    expect(sent.results).toHaveLength(1); // sequential: client first
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0].toEmail).toBe('jordan@acme.test');
    firstToken = tokenFrom(h.emails[0]);
    const row = await ct.loadContract(admin, contractId);
    expect(row.sent_at).toBeTruthy();
    expect(row.document_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row.variables.contract_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const v = (await q(`select * from signing_versions where id=$1`, [row.signing_version_id]))[0];
    expect(v.status).toBe('awaiting_signature');
    expect(v.original_sha256).toBe(row.document_sha256);
    expect(sha256Hex(storage.files.get(v.original_path)!)).toBe(v.original_sha256);
    expect((await q(`select count(*)::int n from signing_fields where version_id=$1`, [v.id]))[0].n).toBe(6); // signature + name + date per signer
    expect((await q(`select contractor_id from signing_documents where id=$1`, [v.document_id]))[0].contractor_id).toBeNull();
    // the PDF text really contains the merged values and no raw merge fields
    const doc = await PDFDocument.load(storage.files.get(v.original_path)!);
    expect(doc.getPageCount()).toBe(v.page_count);
    const { openWithPdfjs } = await import('@/lib/signing/pdfjs');
    const { pdf, destroy } = await openWithPdfjs(storage.files.get(v.original_path)!);
    let text = '';
    for (let n = 1; n <= pdf.numPages; n++) text += ((await (await pdf.getPage(n)).getTextContent()).items as any[]).map((i) => i.str).join(' ') + '\n';
    await destroy();
    expect(text).toContain('Acme Pools LLC');
    expect(text).toContain('$150.00');
    expect(text).toContain('November 1, 2026');
    expect(text).not.toMatch(/\{\{/);
    // sending again is refused: the agreement is locked and no second request is created
    await expect(ct.sendContract(admin, contractId, { acknowledgePlaceholders: true })).rejects.toMatchObject({ code: 'locked' });
    expect(h.emails).toHaveLength(1);
  });

  it('is frozen: edits are refused by the service AND by the database; template changes do not reach it', async () => {
    await expect(ct.saveContract(admin, contractId, { title: 'Hacked' })).rejects.toMatchObject({ code: 'locked' });
    await expect(db.query(`update contracts set title='x' where id=$1`, [contractId])).rejects.toThrow(/contracts:locked/);
    await expect(db.query(`update contracts set sections='[]'::jsonb where id=$1`, [contractId])).rejects.toThrow(/contracts:locked/);
    await expect(db.query(`delete from contracts where id=$1`, [contractId])).rejects.toThrow(/contracts:locked/);
    await expect(ct.deleteDraftContract(admin, contractId)).rejects.toMatchObject({ code: 'locked' });
    const before = JSON.stringify((await ct.loadContract(admin, contractId)).sections);
    const tid = await pay();
    await tp.saveTemplate(admin, tid, { sections: [{ id: 'z', key: 'custom', kind: 'rich', title: 'Changed', showTitle: true, numbered: true, pageBreakBefore: false, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'new' }] }] } }] });
    expect(JSON.stringify((await ct.loadContract(admin, contractId)).sections)).toBe(before);
    await expect(tp.deleteTemplate(admin, tid)).rejects.toMatchObject({ code: 'in_use' });
    await expect(db.query(`delete from contract_templates where id=$1`, [tid])).rejects.toThrow();
    await expect(db.query(`update contract_template_versions set snapshot='{}'::jsonb`)).rejects.toThrow(/contracts:immutable/);
  });

  it('shows Sent -> Viewed -> Partially signed -> Completed with both signatures, then a final PDF', async () => {
    expect((await ct.listContracts(admin)).find((c) => c.id === contractId)!.status).toBe('sent');
    const t1 = firstToken;
    await signer.signerOpen(t1, ctx);
    expect((await ct.listContracts(admin)).find((c) => c.id === contractId)!.status).toBe('viewed');
    await signAs(t1, 'Jordan Rivera');
    expect((await ct.listContracts(admin)).find((c) => c.id === contractId)!.status).toBe('partially_signed');
    expect(h.emails.filter((e) => e.toEmail === 'liamadmin@hq.test')).toHaveLength(1); // the countersigner is invited now
    const t2 = tokenFrom(h.emails.at(-1));
    await signAs(t2, 'Liam Admin');
    const row = await ct.loadContract(admin, contractId);
    await finalizeVersion(row.signing_version_id!);
    const list = (await ct.listContracts(admin)).find((c) => c.id === contractId)!;
    expect(list.status).toBe('completed');
    expect(list.hasFinal).toBe(true);
    expect(list.signers.map((s) => s.status)).toEqual(['signed', 'signed']);
    expect(list.valueLabel).toBe('$150 / appt');
    const fin = (await q(`select final_path from signing_versions where id=$1`, [row.signing_version_id]))[0].final_path;
    if (process.env.CONTRACT_PDF_OUT) (await import('node:fs')).writeFileSync(`${process.env.CONTRACT_PDF_OUT}/signed-final.pdf`, storage.files.get(fin)!);
    const url = await ct.contractFileUrl(admin, contractId, 'final');
    expect(url).toContain('storage.test');
    // signed documents stay immutable
    await expect(db.query(`update signing_versions set original_sha256=$2 where id=$1`, [row.signing_version_id, '0'.repeat(64)])).rejects.toThrow();
    const detail = await ct.getContractDetail(admin, contractId);
    expect(detail.timeline.map((t) => t.label)).toEqual(expect.arrayContaining(['Agreement created from template', 'Sent for signature', 'Opened', 'Signed', 'All signers finished']));
  });

  it('emits the contract workflow events exactly once each', async () => {
    const ev = await q(`select type, entity_type, contractor_id, payload from workflow_events where entity_id=$1 order by recorded_at, id`, [contractId]);
    const types = ev.map((e: any) => e.type);
    expect(types.filter((t: string) => t === 'contract.created')).toHaveLength(1);
    expect(types.filter((t: string) => t === 'contract.sent')).toHaveLength(1);
    expect(types.filter((t: string) => t === 'contract.viewed')).toHaveLength(1);
    expect(types.filter((t: string) => t === 'contract.signed')).toHaveLength(2);
    expect(types.filter((t: string) => t === 'contract.fully_signed')).toHaveLength(1);
    expect(ev.every((e: any) => e.entity_type === 'contract' && e.contractor_id === null)).toBe(true); // network-level only
    expect(ev.find((e: any) => e.type === 'contract.sent').payload).toMatchObject({ contractId, clientContractorId: cA });
    expect(ev.filter((e: any) => e.type === 'contract.signed').map((e: any) => e.payload.signerRole)).toEqual(['Client', 'HomeQuote Network']);
    // signing a contract never touches billing
    expect((await q(`select 1 from information_schema.tables where table_name in ('service_subscriptions','billing_events')`)).length).toBe(0);
  });
});

describe('access control', () => {
  let sentId: string, draftId: string, sentToken = '';
  beforeAll(async () => {
    sentId = await readyContract(cA);
    await ct.sendContract(admin, sentId, { acknowledgePlaceholders: true });
    sentToken = tokenFrom(h.emails.at(-1));
    draftId = await readyContract(cA);
  });

  it('a company sees only SENT agreements of its own organization, never drafts or other companies', async () => {
    const mine = await ct.listContracts(ownerA);
    expect(mine.map((c) => c.id)).toContain(sentId);
    expect(mine.map((c) => c.id)).not.toContain(draftId);
    expect(mine.every((c) => c.contractorId === cA)).toBe(true);
    expect(await ct.listContracts(staffB)).toEqual([]);
    await expect(ct.loadContract(staffB, sentId, 'any')).rejects.toMatchObject({ code: 'not_found' });
    await expect(ct.loadContract(ownerA, draftId, 'any')).rejects.toMatchObject({ code: 'not_found' });
    await expect(ct.contractFileUrl(staffB, sentId, 'original')).rejects.toMatchObject({ code: 'not_found' });
    expect(await ct.contractFileUrl(ownerA, sentId, 'original')).toContain('storage.test');
    await expect(ct.getContractDetail(ownerA, sentId)).resolves.toMatchObject({ admin: false, timeline: [] });
  });

  it('companies and other staff cannot mutate contracts', async () => {
    for (const who of [ownerA, staffB, setter]) {
      await expect(ct.saveContract(who, draftId, { title: 'x' })).rejects.toMatchObject({ code: 'forbidden' });
      await expect(ct.sendContract(who, draftId)).rejects.toMatchObject({ code: 'forbidden' });
      await expect(ct.voidContract(who, sentId, 'no')).rejects.toMatchObject({ code: 'forbidden' });
      await expect(ct.duplicateContract(who, sentId)).rejects.toMatchObject({ code: 'forbidden' });
      await expect(ct.uploadClientLogo(who, { contractorId: cA, bytes: await png(), saveToCrm: true })).rejects.toMatchObject({ code: 'forbidden' });
    }
  });

  it('row level security: a company session reads only its own sent agreements; no writes at all', async () => {
    const as = async (uid: string, fn: () => Promise<void>) => { await db.exec(`select set_config('test.uid','${uid}',false)`); await db.exec('set role authenticated'); try { await fn(); } finally { await db.exec('reset role'); } };
    await as(ownerA.id, async () => {
      const rows = await q(`select id from contracts`);
      expect(rows.map((r: any) => r.id)).toContain(sentId);
      expect(rows.map((r: any) => r.id)).not.toContain(draftId);
      await expect(db.query(`select settings from contracts`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`update contracts set title='x'`)).rejects.toThrow(/permission denied/);
      expect(await q(`select id from contract_templates`)).toEqual([]);
    });
    await as(staffB.id, async () => { expect(await q(`select id from contracts`)).toEqual([]); });
    await as(admin.id, async () => { expect((await q(`select id from contract_templates`)).length).toBeGreaterThan(5); });
  });

  it('voiding kills the signing links and shows Voided; duplicating makes a fresh editable draft', async () => {
    await ct.voidContract(admin, sentId, 'Wrong pricing');
    expect((await ct.listContracts(admin)).find((c) => c.id === sentId)!.status).toBe('voided');
    const s: any = await signer.signerOpen(sentToken, ctx);
    expect(s.state).not.toBe('ok');
    const dup = await ct.duplicateContract(admin, sentId);
    const row = await ct.loadContract(admin, dup.id);
    expect(row.signing_version_id).toBeNull();
    expect(row.settings.placeholdersAcknowledged).toBe(false);
    expect(row.variables.contract_date).toBeUndefined();
    await ct.saveContract(admin, dup.id, { title: 'Second try' });
    await ct.deleteDraftContract(admin, dup.id);
    expect(await q(`select 1 from contracts where id=$1`, [dup.id])).toHaveLength(0);
  });
});

describe('a failed send leaves nothing half-created', () => {
  it('cleans up the signing draft when the request cannot be sent', async () => {
    const id = await readyContract(cB);
    await ct.saveContract(admin, id, { signers: [] });
    const err: any = await ct.sendContract(admin, id, { acknowledgePlaceholders: true }).catch((e) => e);
    expect(err.code).toBe('validation');
    expect((await q(`select signing_version_id from contracts where id=$1`, [id]))[0].signing_version_id).toBeNull();
    expect(h.emails).toHaveLength(0);
  });
});
