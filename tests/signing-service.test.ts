/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from '@cantoo/pdf-lib';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStorage, fakeSupabase } from './helpers/pglite-supabase';
import { rotatedContractPdf, scannedPdf, textContractPdf } from './helpers/signing-fixtures';

const h = vi.hoisted(() => ({ client: null as any, emails: [] as any[], failEmail: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({
  sendGmailMessage: async (m: any) => { if (h.failEmail) throw new Error('Gmail is down'); h.emails.push(m); return { id: 'm', fromEmail: 'hq@test' }; },
}));

import * as svc from '@/lib/signing/service';
import * as signer from '@/lib/signing/signer';
import { finalizeVersion } from '@/lib/signing/finalize';
import { sha256Hex } from '@/lib/signing/pdf-validate';
import type { Profile } from '@/lib/types';

let db: PGlite;
let storage: FakeStorage;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
let cA: string, cB: string;
let admin: Profile, userA: Profile, userB: Profile, setter: Profile;
const ctx = { ip: '203.0.113.5', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1' };

const sigPng = (() => { const c = createCanvas(300, 90); const g = c.getContext('2d'); g.fillStyle = '#0b1b4d'; g.fillRect(10, 40, 280, 6); return c.toBuffer('image/png').toString('base64'); })();
const tokenFrom = (email: any) => /#t=([A-Za-z0-9_-]{43})/.exec(email.text)![1];

async function newDraft(actor: Profile, bytes: Uint8Array, opts: { contractorId?: string | null; leadId?: string | null } = {}) {
  const prep = await svc.prepareUpload(actor, opts.contractorId ?? null);
  storage.files.set(prep.path, bytes);
  return svc.registerUpload(actor, { docId: prep.docId, versionId: prep.versionId, contractorId: prep.contractorId, title: 'Home Improvement Agreement', leadId: opts.leadId ?? null });
}
/** Assign page-1 fields to signer 1 and everything else to signer 2 (or all to 1), mark reviewed, set recipients. */
async function configure(actor: Profile, versionId: string, signers: { name: string; email: string }[], order: 'sequential' | 'parallel' = 'sequential') {
  const b = await svc.getEditorBundle(actor, versionId);
  const fields = b.fields.map((f: any) => ({
    recipient_index: signers.length > 1 && f.page > 1 ? 2 : 1, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, group_key: f.group_key,
    prefill_value: null, date_format: f.type === 'date' ? 'MMM d, yyyy' : null, source: f.source, confidence: f.confidence, needs_review: f.needs_review, reviewed: true, role_hint: f.role_hint,
    detection_note: f.detection_note, source_ref: f.source_ref,
  }));
  await svc.saveDraft(actor, versionId, { subject: 'Please sign', message: 'Thanks!', signing_order: order, expiry_days: 7, recipients: signers, fields });
  await svc.markReviewed(actor, versionId);
}
async function valuesFor(token: string, name: string) {
  const s: any = await signer.signerOpen(token, ctx);
  expect(s.state).toBe('ok');
  return {
    session: s,
    values: s.fields.filter((f: any) => f.mine && f.type !== 'date').map((f: any) => {
      if (f.type === 'signature' || f.type === 'initials') return { field_id: f.id, sig_method: 'typed', typed_text: name, image_png: sigPng };
      if (f.type === 'checkbox') return { field_id: f.id, value: f.required ? 'true' : 'false' };
      return { field_id: f.id, value: f.type === 'name' ? name : 'Acme Pools Inc.' };
    }),
  };
}
const signAs = async (token: string, name: string, tz = 'America/Los_Angeles') => {
  const { values } = await valuesFor(token, name);
  await signer.signerConsent(token, ctx);
  return signer.signerSubmit(token, { values, timezone: tz }, ctx);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid(), first_name text, last_name text);
    create function public.is_admin() returns boolean language sql stable as $$ select false $$;
    create function public.auth_contractor_id() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/0039_document_signing.sql', import.meta.url), 'utf8'));
  storage = new FakeStorage();
  h.client = fakeSupabase(db, storage);
  cA = (await q(`insert into contractors(name) values ('Acme Pools') returning id`))[0].id;
  cB = (await q(`insert into contractors(name) values ('Beta Roofing') returning id`))[0].id;
  const mk = async (role: string, contractor: string | null, contractor_role: string | null, name: string) => {
    const id = (await q(`insert into profiles(role) values ($1) returning id`, [role]))[0].id;
    return { id, role, contractor_id: contractor, contractor_role, is_active: true, full_name: name, email: `${name.toLowerCase().replace(/\W/g, '')}@sender.test` } as unknown as Profile;
  };
  admin = await mk('admin', null, null, 'Liam Admin');
  userA = await mk('contractor', cA, 'owner', 'Owner A');
  userB = await mk('contractor', cB, 'staff', 'Staff B');
  setter = await mk('setter', null, null, 'Setter');
}, 60_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { h.emails.length = 0; h.failEmail = false; });

describe('end to end: upload -> suggest -> review -> invite -> sign (2 signers, in order) -> completed PDF + certificate', () => {
  it('works, including replay safety and integrity', async () => {
    const original = await textContractPdf();
    const up = await newDraft(userA, original);
    expect(up.suggested).toBeGreaterThan(8);

    // the original in storage is untouched and its hash was recorded
    const v0 = (await q(`select original_path, original_sha256, status, detection from signing_versions where id=$1`, [up.versionId]))[0];
    expect(v0.status).toBe('draft');
    expect(sha256Hex(storage.files.get(v0.original_path)!)).toBe(v0.original_sha256);
    expect(v0.detection.processing).toBe('local');

    // cannot send before reviewing / without signers
    await expect(svc.sendForSignature(userA, up.versionId)).rejects.toMatchObject({ code: 'subject_required' });
    await configure(userA, up.versionId, [{ name: 'Ada Lovelace', email: 'ada@example.test' }, { name: 'Bob Builder', email: 'bob@example.test' }]);

    const sent = await svc.sendForSignature(userA, up.versionId);
    expect(sent).toHaveLength(1); // sequential: only the first signer is invited
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0].toEmail).toBe('ada@example.test');
    expect(h.emails[0].replyTo).toBe(userA.email);
    expect(h.emails[0].html).toContain('Acme Pools');
    const t1 = tokenFrom(h.emails[0]);

    // locked once sent
    await expect(svc.saveDraft(userA, up.versionId, { subject: 'x', message: '', signing_order: 'parallel', expiry_days: 7, recipients: [], fields: [] })).rejects.toMatchObject({ code: 'locked' });

    // nothing but a hash of the token is stored; the link is not in the events
    const stored = await q(`select token_hash from signing_recipients where version_id=$1 and token_hash is not null`, [up.versionId]);
    expect(stored.map((r: any) => r.token_hash)).toEqual([expect.stringMatching(/^[0-9a-f]{64}$/)]);
    expect(JSON.stringify(await q(`select * from signing_events`))).not.toContain(t1);

    // signer 1: missing a required field is rejected and stores nothing
    const { session, values } = await valuesFor(t1, 'Ada Lovelace');
    expect(session.sender.business).toBe('Acme Pools');
    expect(session.fields.filter((f: any) => f.mine).length).toBeGreaterThan(5);
    expect(session.fields.some((f: any) => !f.mine)).toBe(true);
    await expect(signer.signerSubmit(t1, { values, timezone: 'UTC' }, ctx)).rejects.toMatchObject({ code: 'consent_required' });
    await signer.signerConsent(t1, ctx);
    const sigOnly = values.filter((v: any) => v.image_png).slice(0, 1);
    await expect(signer.signerSubmit(t1, { values: sigOnly, timezone: 'UTC' }, ctx)).rejects.toMatchObject({ code: 'missing_required' });
    expect((await q(`select count(*)::int n from signing_field_values`))[0].n).toBe(0);

    // a value for someone else's field is refused
    const otherFieldId = (await q(`select f.id from signing_fields f join signing_recipients r on r.id=f.recipient_id where f.version_id=$1 and r.order_index=2 limit 1`, [up.versionId]))[0].id;
    await expect(signer.signerSubmit(t1, { values: [...values, { field_id: otherFieldId, value: 'hijack' }], timezone: 'UTC' }, ctx)).rejects.toMatchObject({ code: 'bad_field' });

    // too-long text is refused rather than clipped
    const longVals = values.map((v: any) => (v.value === 'Ada Lovelace' ? { ...v, value: 'x'.repeat(900) } : v));
    await expect(signer.signerSubmit(t1, { values: longVals, timezone: 'UTC' }, ctx)).rejects.toMatchObject({ code: 'too_long' });

    // success; the next signer is invited automatically
    const r1: any = await signer.signerSubmit(t1, { values, timezone: 'America/Los_Angeles' }, ctx);
    expect(r1).toMatchObject({ ok: true, completed: false });
    expect(h.emails).toHaveLength(2);
    expect(h.emails[1].toEmail).toBe('bob@example.test');
    const t2 = tokenFrom(h.emails[1]);
    expect((await q(`select status from signing_versions where id=$1`, [up.versionId]))[0].status).toBe('partially_signed');

    // replay of a finished token: idempotent, no duplicate values, no new email
    const n = (await q(`select count(*)::int n from signing_field_values`))[0].n;
    expect(await signer.signerSubmit(t1, { values, timezone: 'UTC' }, ctx)).toMatchObject({ ok: true });
    expect((await q(`select count(*)::int n from signing_field_values`))[0].n).toBe(n);
    expect(h.emails).toHaveLength(2);
    expect(await signer.signerOpen(t1, ctx)).toMatchObject({ state: 'signed' });
    // the date was stamped server-side in the signer's own time zone
    const dateVals = await q(`select v.value from signing_field_values v join signing_fields f on f.id=v.field_id where f.type='date' and v.version_id=$1`, [up.versionId]);
    expect(dateVals[0].value).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 20\d\d$/);

    // signer 2 completes -> everything is finalized
    const r2: any = await signAs(t2, 'Bob Builder');
    expect(r2).toMatchObject({ ok: true, completed: true, finalized: true });
    const v = (await q(`select * from signing_versions where id=$1`, [up.versionId]))[0];
    expect(v.status).toBe('completed');
    expect(v.final_sha256 && v.certificate_sha256 && v.retention_until).toBeTruthy();
    const finalBytes = storage.files.get(v.final_path)!;
    expect(sha256Hex(finalBytes)).toBe(v.final_sha256);
    if (process.env.WRITE_FIXTURES) { const fs = await import('node:fs'); fs.mkdirSync(process.env.SIGNING_OUT_DIR!, { recursive: true }); fs.writeFileSync(`${process.env.SIGNING_OUT_DIR}/e2e-final.pdf`, finalBytes); fs.writeFileSync(`${process.env.SIGNING_OUT_DIR}/e2e-cert.pdf`, storage.files.get(v.certificate_path)!); }
    expect(sha256Hex(storage.files.get(v.certificate_path)!)).toBe(v.certificate_sha256);
    expect(sha256Hex(storage.files.get(v.original_path)!)).toBe(v.original_sha256); // original still untouched
    expect((await PDFDocument.load(finalBytes)).getPageCount()).toBe(2);
    expect((await q(`select signing_verify_chain($1) as ok`, [up.versionId]))[0].ok).toBe(true);

    // completion emails: each signer gets a secure download link, plus the sender
    const completion = h.emails.slice(2);
    expect(completion.map((e: any) => e.toEmail).sort()).toEqual(['ada@example.test', 'bob@example.test', userA.email].sort());
    const dlToken = /#d=([A-Za-z0-9_-]{43})/.exec(completion.find((e: any) => e.toEmail === 'ada@example.test').text)![1];
    expect(await signer.downloadSession(dlToken)).toMatchObject({ state: 'ready', ready: true });
    expect(await signer.downloadWithToken(dlToken, 'final')).toContain('https://storage.test/signed/');
    expect(await signer.downloadWithToken(t1, 'certificate')).toContain('signed'); // spent signing token: read-only download only
    await expect(signer.downloadWithToken(generateBogus(), 'final')).rejects.toMatchObject({ code: 'invalid' });

    // sender downloads are authorised and integrity checked
    expect(await svc.senderFileUrl(userA, up.versionId, 'final')).toContain('storage.test');
    storage.files.set(v.final_path, new Uint8Array([1, 2, 3])); // tamper with the stored file
    await expect(svc.senderFileUrl(userA, up.versionId, 'final')).rejects.toMatchObject({ code: 'integrity' });
    await expect(signer.downloadWithToken(dlToken, 'final')).rejects.toMatchObject({ code: 'integrity' });
    storage.files.set(v.final_path, finalBytes);

    // finalizing again is a no-op
    expect(await finalizeVersion(up.versionId)).toEqual({ status: 'already' });
  }, 120_000);
});

const generateBogus = () => 'B'.repeat(43);

describe('tenant isolation and authorisation (server side)', () => {
  it('other companies, setters and strangers cannot see, change, send or download a document', async () => {
    const up = await newDraft(userA, await textContractPdf());
    for (const bad of [userB, setter]) {
      await expect(svc.getEditorBundle(bad, up.versionId)).rejects.toMatchObject({ code: bad === setter ? 'forbidden' : 'not_found' }).catch(async () => {
        await expect(svc.getEditorBundle(bad, up.versionId)).rejects.toBeTruthy();
      });
      await expect(svc.saveDraft(bad, up.versionId, {})).rejects.toBeTruthy();
      await expect(svc.markReviewed(bad, up.versionId)).rejects.toBeTruthy();
      await expect(svc.sendForSignature(bad, up.versionId)).rejects.toBeTruthy();
      await expect(svc.senderFileUrl(bad, up.versionId, 'original')).rejects.toBeTruthy();
      await expect(svc.voidRequest(bad, up.versionId, 'x')).rejects.toBeTruthy();
      await expect(svc.deleteDraft(bad, up.versionId)).rejects.toBeTruthy();
    }
    // admin can; HQN-internal documents are invisible to contractors
    expect((await svc.getEditorBundle(admin, up.versionId)).document.contractor_id).toBe(cA);
    const internal = await newDraft(admin, await textContractPdf(), { contractorId: null });
    await expect(svc.getEditorBundle(userA, internal.versionId)).rejects.toMatchObject({ code: 'not_found' });
    // a contractor cannot upload into someone else's company by passing another id
    const prep = await svc.prepareUpload(userB, cA);
    expect(prep.contractorId).toBe(cB);
    expect(prep.path.startsWith(`c-${cB}/`)).toBe(true);
    await expect(svc.prepareUpload(setter, null)).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('a contractor cannot attach a lead they cannot see (RLS-scoped lookup) and bad uploads are rejected and cleaned up', async () => {
    const prep = await svc.prepareUpload(userA, null);
    storage.files.set(prep.path, new TextEncoder().encode('not a pdf at all'));
    await expect(svc.registerUpload(userA, { docId: prep.docId, versionId: prep.versionId, contractorId: null, title: 'Bad', leadId: null })).rejects.toMatchObject({ code: 'not_pdf' });
    expect(storage.files.has(prep.path)).toBe(false);
    expect((await q(`select count(*)::int n from signing_documents where id=$1`, [prep.docId]))[0].n).toBe(0);
    const prep2 = await svc.prepareUpload(userA, null);
    storage.files.set(prep2.path, await textContractPdf());
    await expect(svc.registerUpload(userA, { docId: prep2.docId, versionId: prep2.versionId, contractorId: null, title: 'T', leadId: '11111111-1111-4111-8111-111111111111' })).rejects.toMatchObject({ code: 'forbidden' });
    // a registered file that never arrived
    const prep3 = await svc.prepareUpload(userA, null);
    await expect(svc.registerUpload(userA, { docId: prep3.docId, versionId: prep3.versionId, contractorId: null, title: 'T', leadId: null })).rejects.toBeTruthy();
  });

  it('attaches visible leads', async () => {
    const lead = (await q(`insert into leads(first_name,last_name) values ('Pat','Homeowner') returning id`))[0].id;
    const up = await newDraft(userA, await textContractPdf(), { leadId: lead });
    expect((await svc.getEditorBundle(userA, up.versionId)).lead).toEqual({ id: lead, name: 'Pat Homeowner' });
  });
});

describe('request lifecycle', () => {
  it('parallel signers, resend rotates the link (old one dies), reminders, decline, void', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }], 'parallel');
    const sent = await svc.sendForSignature(userA, up.versionId);
    expect(sent.map((r) => r.sent)).toEqual([true, true]);
    expect(h.emails).toHaveLength(2);
    const [ta, tb] = h.emails.map(tokenFrom);
    const bundle = await svc.getEditorBundle(userA, up.versionId);
    const ada = bundle.recipients[0];

    await svc.resendInvitation(userA, up.versionId, ada.id);
    const ta2 = tokenFrom(h.emails.at(-1));
    expect(ta2).not.toBe(ta);
    expect(await signer.signerOpen(ta, ctx)).toMatchObject({ state: 'invalid' });
    expect(await signer.signerOpen(ta2, ctx)).toMatchObject({ state: 'ok' });
    await svc.remindRecipient(userA, up.versionId, ada.id);
    expect(h.emails.at(-1).subject).toMatch(/^Reminder:/);

    // any order: Bob can sign first
    expect(await signAs(tb, 'Bob')).toMatchObject({ ok: true, completed: false });
    await expect(svc.resendInvitation(userA, up.versionId, bundle.recipients[1].id)).rejects.toMatchObject({ code: 'not_open' });

    // decline closes the request for everyone
    await signer.signerOpen(tokenFrom(h.emails.at(-1)), ctx);
    await signer.signerDecline(tokenFrom(h.emails.at(-1)), 'Wrong price', ctx);
    expect((await svc.getEditorBundle(userA, up.versionId)).version.status).toBe('declined');
    expect(h.emails.at(-1).subject).toMatch(/^Declined:/);
    await expect(svc.voidRequest(userA, up.versionId, 'x')).rejects.toMatchObject({ code: 'not_voidable' });
  }, 60_000);

  it('void kills links and tells invited signers; a new version copies the layout and needs a fresh review', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    await svc.sendForSignature(userA, up.versionId);
    const t = tokenFrom(h.emails.at(-1));
    const nv = await svc.createNewVersion(userA, up.versionId);
    expect(nv.versionNo).toBe(2);
    expect(await signer.signerOpen(t, ctx)).toMatchObject({ state: 'voided', documentTitle: 'Home Improvement Agreement' });
    const b2 = await svc.getEditorBundle(userA, nv.versionId);
    expect(b2.version.status).toBe('draft');
    expect(b2.fields.length).toBe((await svc.getEditorBundle(userA, up.versionId)).fields.length);
    expect(b2.version.placement_reviewed_at).toBeNull();
    await expect(svc.sendForSignature(userA, nv.versionId)).rejects.toMatchObject({ code: 'review_required' });
    // editing the new draft works; the old version is frozen
    await svc.saveDraft(userA, nv.versionId, { subject: 'v2', message: '', signing_order: 'sequential', expiry_days: 7, recipients: [{ name: 'Ada', email: 'ada@example.test' }], fields: b2.fields.map((f: any) => ({ recipient_index: 1, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, group_key: f.group_key, source: f.source, needs_review: f.needs_review, reviewed: true })) });
    await expect(svc.saveDraft(userA, up.versionId, {})).rejects.toMatchObject({ code: 'locked' });
    // a draft version can be deleted, taking its row with it, and the previous version becomes current again
    await svc.deleteDraft(userA, nv.versionId);
    expect((await q(`select current_version_id from signing_documents where id=$1`, [b2.document.id]))[0].current_version_id).toBe(up.versionId);
  }, 60_000);

  it('expired links: rejected, marked expired, reminders refused, scheduler sweeps stragglers', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    await svc.sendForSignature(userA, up.versionId);
    const t = tokenFrom(h.emails.at(-1));
    await db.exec('alter table signing_versions disable trigger trg_signing_versions_guard');
    await db.query(`update signing_versions set expires_at = now() - interval '1 minute' where id=$1`, [up.versionId]);
    await db.exec('alter table signing_versions enable trigger trg_signing_versions_guard');
    const rid = (await svc.getEditorBundle(userA, up.versionId)).recipients[0].id;
    expect((await svc.getEditorBundle(userA, up.versionId)).version.status).toBe('expired'); // shown as expired even before the sweep
    await expect(svc.remindRecipient(userA, up.versionId, rid)).rejects.toMatchObject({ code: 'expired' });
    expect((await svc.signingMaintenance()).expired).toBe(1);
    expect(await signer.signerOpen(t, ctx)).toMatchObject({ state: 'expired' });
    await expect(signer.signerSubmit(t, { values: [], timezone: 'UTC' }, ctx)).rejects.toBeTruthy();
    expect((await q(`select status from signing_versions where id=$1`, [up.versionId]))[0].status).toBe('expired');
  });

  it('failed invitation email is recorded, visible, and can be resent; the request stays valid', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    h.failEmail = true;
    const res = await svc.sendForSignature(userA, up.versionId);
    expect(res[0]).toMatchObject({ sent: false, error: 'Gmail is down' });
    const b = await svc.getEditorBundle(userA, up.versionId);
    expect(b.version.status).toBe('awaiting_signature');
    expect(b.recipients[0]).toMatchObject({ last_email_status: 'failed', last_email_error: 'Gmail is down' });
    h.failEmail = false;
    expect((await svc.resendInvitation(userA, up.versionId, b.recipients[0].id)).sent).toBe(true);
    expect((await svc.getEditorBundle(userA, up.versionId)).recipients[0].last_email_status).toBe('sent');
  });

  it('a completion that fails to build the PDF stays completed, is retried, and is single-flight', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    await svc.sendForSignature(userA, up.versionId);
    const t = tokenFrom(h.emails.at(-1));
    const op = (await q(`select original_path from signing_versions where id=$1`, [up.versionId]))[0].original_path;
    const keep = storage.files.get(op)!;
    const { values } = await valuesFor(t, 'Ada');
    await signer.signerConsent(t, ctx);
    storage.files.delete(op); // simulate storage trouble while the signer is finishing
    const r: any = await signer.signerSubmit(t, { values, timezone: 'UTC' }, ctx);
    expect(r).toMatchObject({ ok: true, completed: true, finalized: false });
    const v1 = (await q(`select status, final_sha256, finalize_error from signing_versions where id=$1`, [up.versionId]))[0];
    expect(v1).toMatchObject({ status: 'completed', final_sha256: null });
    expect(v1.finalize_error).toBeTruthy();
    storage.files.set(op, keep);
    const [a, b] = await Promise.all([finalizeVersion(up.versionId), finalizeVersion(up.versionId)]);
    expect([a.status, b.status].sort()).toEqual(['busy', 'finalized']);
    expect((await q(`select final_sha256 from signing_versions where id=$1`, [up.versionId]))[0].final_sha256).toBeTruthy();
    expect(h.emails.filter((e: any) => /^Completed:/.test(e.subject)).length).toBe(2); // signer + sender, exactly once
  }, 60_000);
});

describe('document variety', () => {
  it('rotated and scanned PDFs go through the same pipeline and the signed copy keeps its page geometry', async () => {
    for (const [name, bytes] of [['rot270', await rotatedContractPdf(270)], ['scan', await scannedPdf()]] as const) {
      const up = await newDraft(userA, bytes);
      const b = await svc.getEditorBundle(userA, up.versionId);
      expect(b.fields.length, name).toBeGreaterThan(0);
      if (name === 'scan') { expect(b.fields.every((f: any) => f.needs_review && f.source === 'ocr')).toBe(true); expect((b.version.detection as any).methods).toContain('ocr'); }
      await configure(userA, up.versionId, [{ name: 'Zoë Ñandú-Featherstonehaugh de la Cruz y Fernández', email: 'z@example.test' }]);
      await svc.sendForSignature(userA, up.versionId);
      const t = tokenFrom(h.emails.at(-1));
      expect(await signAs(t, 'Zoë Ñandú-Featherstonehaugh de la Cruz y Fernández')).toMatchObject({ completed: true, finalized: true });
      const v = (await q(`select final_path from signing_versions where id=$1`, [up.versionId]))[0];
      const out = await PDFDocument.load(storage.files.get(v.final_path)!);
      const src = await PDFDocument.load(bytes);
      expect(out.getPageCount()).toBe(src.getPageCount());
      expect(out.getPage(0).getRotation().angle).toBe(src.getPage(0).getRotation().angle);
      expect(out.getPage(0).getSize()).toEqual(src.getPage(0).getSize());
    }
  }, 120_000);
});
