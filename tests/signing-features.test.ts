/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createCanvas } from '@napi-rs/canvas';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStorage, fakeSupabase } from './helpers/pglite-supabase';
import { textContractPdf } from './helpers/signing-fixtures';

const h = vi.hoisted(() => ({ client: null as any, emails: [] as any[], failEmail: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({
  sendGmailMessage: async (m: any) => { if (h.failEmail) throw new Error('Gmail is down'); h.emails.push(m); return { id: 'm', fromEmail: 'hq@test' }; },
}));

import * as svc from '@/lib/signing/service';
import * as tpl from '@/lib/signing/templates';
import * as signer from '@/lib/signing/signer';
import { hashAccessCode, normalizeCodeInput, newAccessCode } from '@/lib/signing/access-code';
import { sha256Hex } from '@/lib/signing/pdf-validate';
import type { Profile } from '@/lib/types';

/**
 * The real service layer (lib/signing/*) end to end against migrations 0039 + 0040 in PGlite:
 * access codes through the signer API, automatic reminders, templates, and the lead tenant rule.
 */
let db: PGlite;
let storage: FakeStorage;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
let cA: string, cB: string;
let admin: Profile, userA: Profile, userB: Profile, setter: Profile;
const ctx = { ip: '203.0.113.5', userAgent: 'Mozilla/5.0 (iPhone)' };
const sigPng = (() => { const c = createCanvas(300, 90); const g = c.getContext('2d'); g.fillStyle = '#0b1b4d'; g.fillRect(10, 40, 280, 6); return c.toBuffer('image/png').toString('base64'); })();
const tokenFrom = (email: any) => /#t=([A-Za-z0-9_-]{43})/.exec(email.text)![1];

async function newDraft(actor: Profile, bytes: Uint8Array, opts: { contractorId?: string | null; leadId?: string | null } = {}) {
  const prep = await svc.prepareUpload(actor, opts.contractorId ?? null);
  storage.files.set(prep.path, bytes);
  return svc.registerUpload(actor, { docId: prep.docId, versionId: prep.versionId, contractorId: prep.contractorId, title: 'Home Improvement Agreement', leadId: opts.leadId ?? null });
}
interface Opts { order?: 'sequential' | 'parallel'; code?: boolean; remindDays?: number | null; remindMax?: number }
async function configure(actor: Profile, versionId: string, signers: { name: string; email: string }[], o: Opts = {}) {
  const b = await svc.getEditorBundle(actor, versionId);
  const fields = b.fields.map((f: any) => ({
    recipient_index: signers.length > 1 && f.page > 1 ? 2 : 1, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, group_key: f.group_key,
    prefill_value: null, date_format: f.type === 'date' ? 'MMM d, yyyy' : null, source: f.source, confidence: f.confidence, needs_review: f.needs_review, reviewed: true, role_hint: f.role_hint,
    detection_note: f.detection_note, source_ref: f.source_ref,
  }));
  await svc.saveDraft(actor, versionId, {
    subject: 'Please sign', message: 'Thanks!', signing_order: o.order ?? 'sequential', expiry_days: 7, recipients: signers, fields,
    auto_remind_days: o.remindDays ?? null, auto_remind_max: o.remindMax ?? 3, require_access_code: !!o.code,
  });
  await svc.markReviewed(actor, versionId);
}
async function signValues(token: string, session: unknown, name: string) {
  const s: any = await signer.signerOpen(token, ctx, session);
  expect(s.state).toBe('ok');
  return s.fields.filter((f: any) => f.mine && f.type !== 'date').map((f: any) => {
    if (f.type === 'signature' || f.type === 'initials') return { field_id: f.id, sig_method: 'typed', typed_text: name, image_png: sigPng };
    if (f.type === 'checkbox') return { field_id: f.id, value: f.required ? 'true' : 'false' };
    return { field_id: f.id, value: f.type === 'name' ? name : 'Acme Pools Inc.' };
  });
}
const codeFor = (codes: { recipientId: string; code: string }[], id: string) => codes.find((c) => c.recipientId === id)!.code;
const backdateSend = (recipientId: string, days: number) => q(`update signing_recipients set last_sent_at = now() - make_interval(days => $2), invited_at = now() - make_interval(days => $2) where id=$1`, [recipientId, days]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid(), first_name text, last_name text, zip text, phone_e164 text, created_at timestamptz default now());
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid, contractor_id uuid, created_at timestamptz default now());
    create function public.is_admin() returns boolean language sql stable as $$ select false $$;
    create function public.auth_contractor_id() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  for (const f of ['0039_document_signing.sql', '0040_signing_templates_reminders_codes.sql']) await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
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

describe('access code helpers', () => {
  it('hashes with the same formula as the database and accepts friendly input', () => {
    const c = newAccessCode();
    expect(c.code).toMatch(/^\d{6}$/);
    expect(c.hash).toBe(hashAccessCode(c.salt, c.code));
    expect(newAccessCode().salt).not.toBe(c.salt);
    expect(normalizeCodeInput('123 456')).toBe('123456');
    expect(normalizeCodeInput('123-456')).toBe('123456');
    for (const bad of ['12345', '1234567', 'abcdef', '', null, 123456]) expect(normalizeCodeInput(bad)).toBeNull();
  });
});

describe('access codes end to end', () => {
  it('a forwarded link is useless without the code; the right code unlocks viewing and signing', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada Lovelace', email: 'ada@example.test' }], { code: true });
    const { results, codes } = await svc.sendForSignature(userA, up.versionId);
    expect(results[0].sent).toBe(true);
    expect(codes).toHaveLength(1);
    const code = codes[0].code;
    // the code never travels in the email
    expect(h.emails[0].text).toMatch(/6-digit access code/);
    expect(h.emails[0].text + h.emails[0].html).not.toContain(code);
    const token = tokenFrom(h.emails[0]);
    const rec = (await q(`select access_code_hash, access_code_salt from signing_recipients where id=$1`, [codes[0].recipientId]))[0];
    expect(rec.access_code_hash).toBe(hashAccessCode(rec.access_code_salt, code));

    // 1. nothing about the document is revealed without a code
    const gated: any = await signer.signerOpen(token, ctx);
    expect(gated).toMatchObject({ state: 'code_required', locked: false, hasCode: true, remaining: 5, documentTitle: 'Home Improvement Agreement' });
    expect(gated.fields).toBeUndefined(); expect(gated.pdfUrl).toBeUndefined();
    // 2. every signer action refuses without the session
    await expect(signer.signerConsent(token, ctx)).rejects.toMatchObject({ code: 'code_required' });
    await expect(signer.signerDecline(token, 'no', ctx)).rejects.toMatchObject({ code: 'code_required' });
    await expect(signer.signerSubmit(token, { values: [] }, ctx)).rejects.toMatchObject({ code: 'code_required' });
    // 3. malformed input costs nothing; a wrong code costs an attempt and says how many are left
    await expect(signer.signerVerifyCode(token, '12ab', ctx)).rejects.toMatchObject({ code: 'bad_code_format' });
    await expect(signer.signerVerifyCode(token, code === '000000' ? '000001' : '000000', ctx)).rejects.toMatchObject({ code: 'wrong_code', extra: { remaining: 4 } });
    // 4. the right code (with spaces) returns a session that opens the document
    const ok = await signer.signerVerifyCode(token, `${code.slice(0, 3)} ${code.slice(3)}`, ctx);
    expect(ok.session).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const opened: any = await signer.signerOpen(token, ctx, ok.session);
    expect(opened.state).toBe('ok');
    expect(opened.consent.method).toBe('email_link_code');
    expect(opened.consent.identity).toMatch(/access code/);
    // a made-up or stale session does not work
    expect(((await signer.signerOpen(token, ctx, 'x'.repeat(43))) as any).state).toBe('code_required');
    await expect(signer.signerConsent(token, ctx, 'x'.repeat(43))).rejects.toMatchObject({ code: 'code_required' });
    // 5. sign with the session
    await signer.signerConsent(token, ctx, ok.session);
    const values = await signValues(token, ok.session, 'Ada Lovelace');
    const done = await signer.signerSubmit(token, { values, timezone: 'America/Los_Angeles' }, ctx, ok.session);
    expect(done).toMatchObject({ ok: true, completed: true });
    const b = await svc.getEditorBundle(userA, up.versionId);
    expect(b.version.status).toBe('completed');
    expect(b.recipients[0]).toMatchObject({ access_verified_at: expect.anything() });
    const events = b.events.map((e: any) => e.event_type);
    expect(events).toEqual(expect.arrayContaining(['access_code_issued', 'access_code_failed', 'access_code_verified', 'signed']));
    expect(JSON.stringify(b.events)).not.toContain(code);
  });

  it("one signer's session cannot be used on another signer's link", async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }], { code: true, order: 'parallel' });
    const { codes } = await svc.sendForSignature(userA, up.versionId);
    const [ta, tb] = h.emails.map(tokenFrom);
    const b = await svc.getEditorBundle(userA, up.versionId);
    const sa = await signer.signerVerifyCode(ta, codeFor(codes, b.recipients[0].id), ctx);
    expect(((await signer.signerOpen(tb, ctx, sa.session)) as any).state).toBe('code_required');
    await expect(signer.signerConsent(tb, ctx, sa.session)).rejects.toMatchObject({ code: 'code_required' });
    // and Ada's own code does not unlock Bob
    await expect(signer.signerVerifyCode(tb, codeFor(codes, b.recipients[0].id) === codeFor(codes, b.recipients[1].id) ? '999999' : codeFor(codes, b.recipients[0].id), ctx)).rejects.toMatchObject({ code: 'wrong_code' });
  });

  it('five wrong codes lock the signer; a new code from the sender unlocks them and kills the old one', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }], { code: true });
    const { codes } = await svc.sendForSignature(userA, up.versionId);
    const token = tokenFrom(h.emails[0]);
    const real = codes[0].code;
    const wrong = real === '123456' ? '654321' : '123456';
    for (let i = 0; i < 4; i++) await expect(signer.signerVerifyCode(token, wrong, ctx)).rejects.toMatchObject({ code: 'wrong_code' });
    await expect(signer.signerVerifyCode(token, wrong, ctx)).rejects.toMatchObject({ code: 'code_locked' });
    await expect(signer.signerVerifyCode(token, real, ctx)).rejects.toMatchObject({ code: 'code_locked' });
    expect(await signer.signerOpen(token, ctx)).toMatchObject({ state: 'code_required', locked: true });

    const b = await svc.getEditorBundle(userA, up.versionId);
    expect(b.recipients[0].access_code_locked_at).toBeTruthy();
    const fresh = await svc.regenerateAccessCode(userA, up.versionId, b.recipients[0].id);
    expect(fresh.code).toMatch(/^\d{6}$/);
    expect(h.emails).toHaveLength(1);                                          // a code is never emailed
    if (fresh.code !== real) await expect(signer.signerVerifyCode(token, real, ctx)).rejects.toMatchObject({ code: 'wrong_code' });
    expect((await signer.signerVerifyCode(token, fresh.code, ctx)).session).toBeTruthy();
  });

  it('resending the invitation rotates the link and clears an earlier verification', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }], { code: true });
    const { codes } = await svc.sendForSignature(userA, up.versionId);
    const t1 = tokenFrom(h.emails[0]);
    const s1 = await signer.signerVerifyCode(t1, codes[0].code, ctx);
    const b = await svc.getEditorBundle(userA, up.versionId);
    await svc.resendInvitation(userA, up.versionId, b.recipients[0].id);
    const t2 = tokenFrom(h.emails.at(-1));
    expect(t2).not.toBe(t1);
    expect(((await signer.signerOpen(t1, ctx, s1.session)) as any).state).toBe('invalid');
    expect(((await signer.signerOpen(t2, ctx, s1.session)) as any).state).toBe('code_required');   // the old session does not carry over
    expect((await signer.signerVerifyCode(t2, codes[0].code, ctx)).session).toBeTruthy();         // same code still works on the new link
  });

  it('a sequential request issues every code at send time but emails only the first signer; the next link also asks for the code', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }], { code: true });
    const { results, codes } = await svc.sendForSignature(userA, up.versionId);
    expect(results).toHaveLength(1); expect(codes).toHaveLength(2);
    const b = await svc.getEditorBundle(userA, up.versionId);
    const ta = tokenFrom(h.emails[0]);
    const sa = await signer.signerVerifyCode(ta, codeFor(codes, b.recipients[0].id), ctx);
    await signer.signerConsent(ta, ctx, sa.session);
    await signer.signerSubmit(ta, { values: await signValues(ta, sa.session, 'Ada'), timezone: 'UTC' }, ctx, sa.session);
    expect(h.emails.at(-1).toEmail).toBe('bob@example.test');
    expect(h.emails.at(-1).text).toMatch(/6-digit access code/);
    const tb = tokenFrom(h.emails.at(-1));
    expect(((await signer.signerOpen(tb, ctx)) as any).state).toBe('code_required');
  });

  it('a request without codes is unchanged, and codes cannot be issued for it', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    const { codes } = await svc.sendForSignature(userA, up.versionId);
    expect(codes).toEqual([]);
    expect(h.emails[0].text).not.toMatch(/access code/);
    expect(((await signer.signerOpen(tokenFrom(h.emails[0]), ctx)) as any).state).toBe('ok');
    const b = await svc.getEditorBundle(userA, up.versionId);
    await expect(svc.regenerateAccessCode(userA, up.versionId, b.recipients[0].id)).rejects.toMatchObject({ code: 'not_required' });
  });

  it("another company's user and a setter cannot issue codes", async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }], { code: true });
    await svc.sendForSignature(userA, up.versionId);
    const b = await svc.getEditorBundle(userA, up.versionId);
    await expect(svc.regenerateAccessCode(userB, up.versionId, b.recipients[0].id)).rejects.toMatchObject({ code: 'not_found' });
    // a non-manager gets the same "not found" as a stranger: nothing reveals that the request exists
    await expect(svc.regenerateAccessCode(setter, up.versionId, b.recipients[0].id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('automatic reminders end to end', () => {
  it('sends fresh-link reminders on schedule, never twice for one interval, up to the maximum', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }], { order: 'parallel', remindDays: 2, remindMax: 2 });
    await svc.sendForSignature(userA, up.versionId);
    expect(h.emails).toHaveLength(2);
    const [ta0] = h.emails.map(tokenFrom);
    const b = await svc.getEditorBundle(userA, up.versionId);
    expect(await svc.runAutoReminders()).toEqual({ claimed: 0, sent: 0 });                 // not due yet

    await backdateSend(b.recipients[0].id, 3);
    expect(await svc.runAutoReminders()).toEqual({ claimed: 1, sent: 1 });
    const reminder = h.emails.at(-1);
    expect(reminder.toEmail).toBe('ada@example.test');
    expect(reminder.subject).toMatch(/^Reminder:/);
    expect(tokenFrom(reminder)).not.toBe(ta0);                                              // fresh link
    expect(((await signer.signerOpen(ta0, ctx)) as any).state).toBe('invalid');             // the old link is dead
    expect(((await signer.signerOpen(tokenFrom(reminder), ctx)) as any).state).toBe('ok');
    expect(await svc.runAutoReminders()).toEqual({ claimed: 0, sent: 0 });                 // same interval: nothing more

    const after = await svc.getEditorBundle(userA, up.versionId);
    expect(after.recipients[0]).toMatchObject({ auto_reminders_sent: 1, last_email_status: 'sent' });
    expect(after.events.map((e: any) => e.event_type)).toContain('auto_reminded');
  });

  it('skips a signer who has the page open, and stops at the maximum', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }], { order: 'parallel', remindDays: 1, remindMax: 1 });
    await svc.sendForSignature(userA, up.versionId);
    const [ta, tb] = h.emails.map(tokenFrom);
    const b = await svc.getEditorBundle(userA, up.versionId);
    await signer.signerOpen(ta, ctx);                                                       // Ada is looking at it right now
    await backdateSend(b.recipients[0].id, 2); await backdateSend(b.recipients[1].id, 2);
    expect(await svc.runAutoReminders()).toEqual({ claimed: 1, sent: 1 });
    expect(h.emails.at(-1).toEmail).toBe('bob@example.test');
    expect(((await signer.signerOpen(ta, ctx)) as any).state).toBe('ok');                   // Ada's link was not rotated under her
    expect(tb).toBeTruthy();
    await backdateSend(b.recipients[1].id, 2);
    expect(await svc.runAutoReminders()).toEqual({ claimed: 0, sent: 0 });                 // Bob is at his maximum of 1
  });

  it('a failed reminder email is recorded and not retried before the next interval', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }], { remindDays: 1, remindMax: 3 });
    await svc.sendForSignature(userA, up.versionId);
    const b = await svc.getEditorBundle(userA, up.versionId);
    await backdateSend(b.recipients[0].id, 2);
    h.failEmail = true;
    expect(await svc.runAutoReminders()).toEqual({ claimed: 1, sent: 0 });
    h.failEmail = false;
    expect((await svc.getEditorBundle(userA, up.versionId)).recipients[0]).toMatchObject({ last_email_status: 'failed', last_email_error: 'Gmail is down', auto_reminders_sent: 1 });
    expect(await svc.runAutoReminders()).toEqual({ claimed: 0, sent: 0 });
  });

  it('reminder settings can be changed on an open request but only by its own company; maintenance runs them', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    await svc.sendForSignature(userA, up.versionId);
    await expect(svc.setReminders(userB, up.versionId, { days: 1, max: 3 })).rejects.toMatchObject({ code: 'not_found' });
    await expect(svc.setReminders(userA, up.versionId, { days: 99, max: 3 })).rejects.toMatchObject({ code: 'bad_request' });
    await svc.setReminders(userA, up.versionId, { days: 1, max: 3 });
    const b = await svc.getEditorBundle(userA, up.versionId);
    expect(b.version).toMatchObject({ auto_remind_days: 1, auto_remind_max: 3 });
    await backdateSend(b.recipients[0].id, 2);
    expect(await svc.signingMaintenance()).toMatchObject({ reminders: 1 });
  });
});

describe('templates end to end', () => {
  it('saves a layout by role, copies the PDF privately, and creates a fresh draft from it', async () => {
    const original = await textContractPdf();
    const up = await newDraft(userA, original);
    await configure(userA, up.versionId, [{ name: 'Ada Lovelace', email: 'ada@example.test' }, { name: 'Bob Builder', email: 'bob@example.test' }], { code: true, remindDays: 3, remindMax: 2 });
    const saved = await tpl.saveAsTemplate(userA, up.versionId, { name: 'Standard agreement', description: 'Pool jobs', roleLabels: ['Homeowner', 'Contractor'] });
    const row = (await q(`select * from signing_templates where id=$1`, [saved.templateId]))[0];
    expect(row).toMatchObject({ contractor_id: cA, name: 'Standard agreement', require_access_code: true, auto_remind_days: 3, auto_remind_max: 2 });
    expect(sha256Hex(storage.files.get(row.original_path)!)).toBe(row.original_sha256);       // its own verified copy
    expect(row.original_path).not.toBe((await svc.getEditorBundle(userA, up.versionId)).version.original_path);
    expect(JSON.stringify(await q(`select * from signing_templates`))).not.toMatch(/ada@example|Bob Builder/);

    // deleting the source draft cannot take the template's file with it
    const views = await tpl.listTemplates(userA);
    expect(views.map((v) => v.name)).toEqual(['Standard agreement']);
    expect(views[0]).toMatchObject({ roles: ['Homeowner', 'Contractor'], companyName: 'Acme Pools' });
    expect(views[0].fieldCount).toBeGreaterThan(5);
    expect(JSON.stringify(views[0])).not.toContain(row.original_path);                         // storage paths never reach the UI

    const made = await tpl.createFromTemplate(userA, saved.templateId, { title: 'Smith job', recipients: [{ name: 'Pat Smith', email: 'pat@example.test' }, { name: 'Casey Crew', email: 'casey@example.test' }] });
    const nb = await svc.getEditorBundle(userA, made.versionId);
    expect(nb.version).toMatchObject({ status: 'draft', require_access_code: true, auto_remind_days: 3, placement_reviewed_at: null });
    expect(nb.document.title).toBe('Smith job');
    expect(nb.recipients.map((r: any) => r.name)).toEqual(['Pat Smith', 'Casey Crew']);
    expect(nb.fields.length).toBe(views[0].fieldCount);
    expect(nb.fields.filter((f: any) => f.recipient_id).length).toBeGreaterThan(5);
    const copy = storage.files.get(nb.version.original_path)!;
    expect(sha256Hex(copy)).toBe(row.original_sha256);
    expect(nb.version.original_path).not.toBe(row.original_path);                                // the document owns a separate copy
    // not sendable until a person reviews the placement
    await expect(svc.sendForSignature(userA, made.versionId)).rejects.toMatchObject({ code: 'review_required' });
    await svc.markReviewed(userA, made.versionId);
    const sent = await svc.sendForSignature(userA, made.versionId);
    expect(sent.codes).toHaveLength(2);
    expect((await q(`select use_count from signing_templates where id=$1`, [saved.templateId]))[0].use_count).toBe(1);
  });

  it('keeps tenants apart: other companies and setters cannot list, read or use a template', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    const { templateId } = await tpl.saveAsTemplate(userA, up.versionId, { name: 'Private to A', roleLabels: ['Signer'] });
    expect((await tpl.listTemplates(userB)).map((t) => t.name)).not.toContain('Private to A');
    await expect(tpl.getTemplate(userB, templateId)).rejects.toMatchObject({ code: 'template_not_found' });
    await expect(tpl.createFromTemplate(userB, templateId, { title: 'x', recipients: [{ name: 'A', email: 'a@example.test' }] })).rejects.toMatchObject({ code: 'template_not_found' });
    await expect(tpl.archiveTemplate(userB, templateId)).rejects.toMatchObject({ code: 'template_not_found' });
    await expect(tpl.listTemplates(setter)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(tpl.saveAsTemplate(userB, up.versionId, { name: 'steal', roleLabels: ['x'] })).rejects.toMatchObject({ code: 'not_found' });
    expect((await tpl.listTemplates(admin)).map((t) => t.name)).toContain('Private to A');
    expect(await q(`select count(*)::int n from signing_templates where name = 'steal'`)).toEqual([{ n: 0 }]);
  });

  it('validates input, refuses a mismatched signer count, and archived templates disappear', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }, { name: 'Bob', email: 'bob@example.test' }]);
    await expect(tpl.saveAsTemplate(userA, up.versionId, { name: '', roleLabels: ['a', 'b'] })).rejects.toMatchObject({ code: 'bad_request' });
    await expect(tpl.saveAsTemplate(userA, up.versionId, { name: 'T', roleLabels: ['only one'] })).rejects.toMatchObject({ code: 'bad_roles' });
    const before = storage.files.size;
    const { templateId } = await tpl.saveAsTemplate(userA, up.versionId, { name: 'Two roles', roleLabels: ['One', 'Two'] });
    await expect(tpl.createFromTemplate(userA, templateId, { title: 'T', recipients: [{ name: 'Solo', email: 'solo@example.test' }] })).rejects.toMatchObject({ code: 'bad_roles' });
    expect(storage.files.size).toBe(before + 1);                                                // the failed attempt left no orphan copy
    await expect(tpl.createFromTemplate(userA, templateId, { title: 'T', recipients: [{ name: 'A', email: 'not-an-email' }, { name: 'B', email: 'b@example.test' }] })).rejects.toMatchObject({ code: 'bad_request' });
    await tpl.archiveTemplate(userA, templateId);
    expect((await tpl.listTemplates(userA)).map((t) => t.name)).not.toContain('Two roles');
    await expect(tpl.createFromTemplate(userA, templateId, { title: 'T', recipients: [{ name: 'A', email: 'a@example.test' }, { name: 'B', email: 'b@example.test' }] })).rejects.toMatchObject({ code: 'template_not_found' });
  });

  it('refuses a corrupted template file instead of creating a document from it', async () => {
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    const { templateId } = await tpl.saveAsTemplate(userA, up.versionId, { name: 'Tampered', roleLabels: ['Signer'] });
    const path = (await q(`select original_path from signing_templates where id=$1`, [templateId]))[0].original_path;
    storage.files.set(path, new Uint8Array([1, 2, 3, 4]));
    const docsBefore = (await q(`select count(*)::int n from signing_documents`))[0].n;
    await expect(tpl.createFromTemplate(userA, templateId, { title: 'T', recipients: [{ name: 'A', email: 'a@example.test' }] })).rejects.toMatchObject({ code: 'integrity' });
    expect((await q(`select count(*)::int n from signing_documents`))[0].n).toBe(docsBefore);
  });

  it("a template made from a company's document only accepts that company's leads", async () => {
    const lead = (await q(`insert into leads(first_name,last_name) values ('Dana','Prospect') returning id`))[0].id;
    await q(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2)`, [lead, cB]);
    const up = await newDraft(userA, await textContractPdf());
    await configure(userA, up.versionId, [{ name: 'Ada', email: 'ada@example.test' }]);
    const { templateId } = await tpl.saveAsTemplate(userA, up.versionId, { name: 'Lead rule', roleLabels: ['Signer'] });
    await expect(tpl.createFromTemplate(userA, templateId, { title: 'T', leadId: lead, recipients: [{ name: 'A', email: 'a@example.test' }] })).rejects.toMatchObject({ code: 'lead_mismatch' });
    await q(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2)`, [lead, cA]);
    const made = await tpl.createFromTemplate(userA, templateId, { title: 'T', leadId: lead, recipients: [{ name: 'A', email: 'a@example.test' }] });
    expect((await svc.getEditorBundle(userA, made.versionId)).lead).toEqual({ id: lead, name: 'Dana Prospect' });
  });
});

describe('lead picker search', () => {
  it('finds leads by name for an admin, hides everything from non-managers, and validates the company id', async () => {
    await q(`insert into leads(first_name,last_name,zip,phone_e164) values ('Morgan','Lee','90210','+13105550111'), ('Morgan','Reyes','94105','+14155550122'), ('Sam','Stone','10001',null)`);
    const hits = await svc.searchLeads(admin, 'morgan', null);
    expect(hits.map((h) => h.name).sort()).toEqual(['Morgan Lee', 'Morgan Reyes']);
    expect(hits.find((h) => h.name === 'Morgan Lee')!.detail).toBe('90210 · ••0111');              // only the last 4 digits ever leave the server
    expect((await svc.searchLeads(admin, 'morgan re', null)).map((h) => h.name)).toEqual(['Morgan Reyes']);
    expect(JSON.stringify(hits)).not.toContain('3105550111');
    await expect(svc.searchLeads(setter, 'morgan', null)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(svc.searchLeads(admin, 'morgan', 'not-a-uuid')).rejects.toMatchObject({ code: 'bad_request' });
  });

  it("limits a company's search to leads assigned to that company (RLS-scoped client)", async () => {
    const mine = (await q(`insert into leads(first_name,last_name) values ('Avery','Mine') returning id`))[0].id;
    await q(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2)`, [mine, cA]);
    const real = h.client;
    const queried: string[] = [];
    // the production query embeds the lead inside lead_assignments; PGlite's stand-in cannot embed, so answer that one query by hand
    h.client = { ...real, from: (t: string) => {
      if (t !== 'lead_assignments') return real.from(t);
      const chain: any = new Proxy({}, { get: (_x, p) => p === 'then' ? (res: any) => res({ data: [{ lead: { id: mine, first_name: 'Avery', last_name: 'Mine', zip: '90001', phone_e164: '+13105550199' } }], error: null }) : (...a: unknown[]) => { queried.push(`${String(p)}:${a.join(',')}`); return chain; } });
      return chain;
    } };
    try {
      const hits = await svc.searchLeads(userA, 'avery', null);
      expect(hits.map((x) => x.name)).toEqual(['Avery Mine']);
      expect(queried).toContain(`eq:contractor_id,${cA}`);                                       // scoped to the user's own company, whatever the client asked
      await svc.searchLeads(userA, 'avery', cB);                                                 // a contractor user cannot pick another company
      expect(queried.filter((x) => x.startsWith('eq:contractor_id')).every((x) => x === `eq:contractor_id,${cA}`)).toBe(true);
    } finally { h.client = real; }
  });
});
