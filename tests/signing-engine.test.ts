import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFName } from '@cantoo/pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

vi.mock('server-only', () => ({}));
import { inspectPdf, PdfRejected, sha256Hex } from '@/lib/signing/pdf-validate';
import { detectFields } from '@/lib/signing/detect';
import { displayedToUser, makePageGeom, placeRect, userToDisplayed, type PageGeom } from '@/lib/signing/geometry';
import { classifyLabel } from '@/lib/signing/layout';
import { extractLayouts } from '@/lib/signing/extract';
import { fitText, prepareFonts, stampPdf, textFits, type StampField, type StampValue } from '@/lib/signing/stamp';
import { buildCertificate } from '@/lib/signing/certificate';
import { formatSigningDate, safeTimeZone } from '@/lib/signing/format';
import { inspectPngBase64, draftSchema } from '@/lib/signing/schemas';
import { generateToken, hashToken, looksLikeToken } from '@/lib/signing/tokens';
import { actorCanAccessDocument } from '@/lib/signing/access';
import { canManageSigning } from '@/lib/permissions';
import { autoAssign, effectiveStatus, sendProblems, type UiField } from '@/lib/signing/view';
import { acroFormPdf, croppedPdf, fakePdf, manyPagesPdf, rotatedContractPdf, scannedPdf, textContractPdf } from './helpers/signing-fixtures';
import type { Profile } from '@/lib/types';

const png = (w = 300, h = 80) => { const c = createCanvas(w, h); const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(10, 10, w - 20, h - 20); return c.toBuffer('image/png').toString('base64'); };
const detect = async (b: Uint8Array, ocr = false) => detectFields(b, (await inspectPdf(b)).geoms, { ocr });

describe('upload validation', () => {
  it('accepts a normal PDF and records hash, pages and display size', async () => {
    const b = await textContractPdf();
    const i = await inspectPdf(b);
    expect(i).toMatchObject({ pageCount: 2, sha256: sha256Hex(b) });
    expect(i.pages[0]).toEqual({ w: 612, h: 792, rotation: 0 });
  });
  it('reports displayed size for rotated pages and CropBox pages', async () => {
    expect((await inspectPdf(await rotatedContractPdf(90))).pages[0]).toEqual({ w: 612, h: 792, rotation: 90 });
    expect((await inspectPdf(await croppedPdf())).pages[0]).toEqual({ w: 600, h: 800, rotation: 0 });
  });
  it('rejects non-PDFs, empty, damaged, too-many-page and script-bearing files with clear codes', async () => {
    await expect(inspectPdf(new TextEncoder().encode('hello world'))).rejects.toMatchObject({ code: 'not_pdf' });
    await expect(inspectPdf(new Uint8Array())).rejects.toMatchObject({ code: 'empty' });
    await expect(inspectPdf(fakePdf())).rejects.toBeInstanceOf(PdfRejected);
    await expect(inspectPdf(await manyPagesPdf(51))).rejects.toMatchObject({ code: 'too_many_pages' });
    const doc = await PDFDocument.create(); doc.addPage();
    doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'app.alert(1)' }));
    await expect(inspectPdf(await doc.save())).rejects.toMatchObject({ code: 'active_content' });
  });
});

describe('page geometry', () => {
  const cases: [string, PageGeom][] = [
    ['plain', makePageGeom({ x: 0, y: 0, w: 612, h: 792 }, 0)],
    ['cropbox offset', makePageGeom({ x: 50, y: 30, w: 600, h: 800 }, 0)],
    ['rot90', makePageGeom({ x: 0, y: 0, w: 792, h: 612 }, 90)],
    ['rot180', makePageGeom({ x: 10, y: 20, w: 612, h: 792 }, 180)],
    ['rot270 offset', makePageGeom({ x: 15, y: 25, w: 792, h: 612 }, 270)],
    ['negative rotation normalises', makePageGeom({ x: 0, y: 0, w: 100, h: 200 }, -90)],
  ];
  for (const [name, g] of cases) {
    it(`round-trips displayed <-> user space (${name})`, () => {
      for (const [dx, dy] of [[0, 0], [g.width, 0], [g.width, g.height], [g.width * 0.3, g.height * 0.7]] as const) {
        const u = displayedToUser(g, dx, dy);
        const d = userToDisplayed(g, u.x, u.y);
        expect(d.x).toBeCloseTo(dx, 6); expect(d.y).toBeCloseTo(dy, 6);
        expect(u.x).toBeGreaterThanOrEqual(g.box.x - 1e-6); expect(u.x).toBeLessThanOrEqual(g.box.x + g.box.w + 1e-6);
        expect(u.y).toBeGreaterThanOrEqual(g.box.y - 1e-6); expect(u.y).toBeLessThanOrEqual(g.box.y + g.box.h + 1e-6);
      }
    });
  }
  it('placeRect anchors at the displayed bottom-left with the page rotation', () => {
    const g = makePageGeom({ x: 0, y: 0, w: 792, h: 612 }, 90);
    const p = placeRect(g, { x: 0, y: 0.5, w: 0.5, h: 0.1 });
    expect(p.rotateDeg).toBe(90);
    expect(p.width).toBeCloseTo(306); expect(p.height).toBeCloseTo(79.2);
  });
});

describe('field detection (suggestions only)', () => {
  it('finds signature blocks in a text PDF and ignores prose that merely mentions "signature"', async () => {
    const { fields, info } = await detect(await textContractPdf());
    const p1 = fields.filter((f) => f.page === 1);
    expect(p1.filter((f) => f.type === 'signature')).toHaveLength(2);
    expect(p1.some((f) => f.type === 'name')).toBe(true);
    expect(p1.filter((f) => f.type === 'date')).toHaveLength(2);
    expect(p1.some((f) => f.type === 'initials')).toBe(true);
    expect(fields.filter((f) => f.page === 2).map((f) => f.type).sort()).toEqual(['date', 'name', 'signature']);
    expect(fields.filter((f) => f.y < 0.2)).toHaveLength(0); // nothing on the paragraphs that talk about signing
    expect(p1.find((f) => f.role_hint === 'homeowner')).toBeTruthy();
    expect(info.processing).toBe('local');
    expect(info.notes.join(' ')).toMatch(/heuristic/i);
  });
  it('agreement checkboxes are required-by-signer, yes/no pairs are flagged, nothing is pre-filled', async () => {
    const { fields } = await detect(await textContractPdf());
    const cbs = fields.filter((f) => f.type === 'checkbox');
    expect(cbs).toHaveLength(3);
    expect(cbs.find((c) => /agree/i.test(c.label ?? ''))!.required).toBe(true);
    const yn = cbs.filter((c) => c.group_key);
    expect(yn).toHaveLength(2);
    expect(yn.every((c) => c.needs_review)).toBe(true);
    for (const f of fields) expect(f).not.toHaveProperty('value');
  });
  it('a document that only talks about signatures yields no fields', async () => {
    const doc = await PDFDocument.create(); const p = doc.addPage([612, 792]);
    p.drawText('Each party shall provide a signature on the final page. The signature must be handwritten or electronic.', { x: 40, y: 700, size: 10 });
    expect((await detect(await doc.save())).fields).toHaveLength(0);
  });
  it('produces identical displayed-space suggestions for 0/90/180/270 versions of the same page', async () => {
    const ref = (await detect(await textContractPdf())).fields.filter((f) => f.page === 1);
    for (const r of [90, 180, 270] as const) {
      const got = (await detect(await rotatedContractPdf(r))).fields;
      expect(got.map((f) => f.type)).toEqual(ref.map((f) => f.type));
      got.forEach((f, i) => { expect(f.x).toBeCloseTo(ref[i].x, 2); expect(f.y).toBeCloseTo(ref[i].y, 2); });
    }
  });
  it('honours CropBox offsets', async () => {
    const { fields } = await detect(await croppedPdf());
    expect(fields).toHaveLength(1);
    expect(fields[0].x * 600).toBeCloseTo(210 - 50 + 1, 0);
  });
  it('uses real AcroForm widgets first and classifies them by name', async () => {
    const { fields, info } = await detect(await acroFormPdf());
    expect(info.methods).toContain('acroform');
    const by = Object.fromEntries(fields.map((f) => [f.source_ref, f]));
    expect(by['Customer Full Name'].type).toBe('name');
    expect(by['Signer Initials'].type).toBe('initials');
    expect(by['Date Signed'].type).toBe('date');
    expect(by['agree_terms'].type).toBe('checkbox');
    expect(by['Notes_1'].needs_review).toBe(true);
    expect(fields.every((f) => f.source === 'acroform')).toBe(true);
  });
  it('scanned page: OCR runs locally and every result is flagged for review', async () => {
    const { fields, info } = await detect(await scannedPdf(), true);
    expect(info.ocrPages).toEqual([1]); expect(info.methods).toContain('ocr');
    expect(fields.map((f) => f.type).sort()).toEqual(['date', 'name', 'signature']);
    expect(fields.every((f) => f.source === 'ocr' && f.needs_review && f.confidence <= 0.7)).toBe(true);
  }, 60_000);
  it('with OCR off a scan yields nothing and says to place fields manually', async () => {
    const { fields, info } = await detect(await scannedPdf(), false);
    expect(fields).toHaveLength(0); expect(info.notes.join(' ')).toMatch(/place fields manually/i);
  });
  it('label classifier separates labels from sentences', () => {
    expect(classifyLabel('Signature:')?.type).toBe('signature');
    expect(classifyLabel('Printed Name')?.type).toBe('name');
    expect(classifyLabel('Effective Date')?.type).toBe('text');
    expect(classifyLabel('Date signed:')?.type).toBe('date');
    expect(classifyLabel('Initial deposit due')).toBeNull();
    expect(classifyLabel('Payment terms apply')).toBeNull();
  });
});

describe('stamping signed values', () => {
  const asField = (i: number, f: { type: StampField['type']; page: number; x: number; y: number; w: number; h: number }): StampField => ({ id: `f${i}`, ...f, prefill_value: null, source_ref: null, source: 'manual' });

  it('puts text inside its field on every page rotation (verified by re-extracting the stamped text)', async () => {
    for (const r of [0, 90, 180, 270] as const) {
      const orig = r === 0 ? await textContractPdf() : await rotatedContractPdf(r);
      const before = orig.slice();
      const geoms = (await inspectPdf(orig)).geoms;
      const fld = { type: 'name' as const, page: 1, x: 0.3, y: 0.55, w: 0.35, h: 0.03 };
      const out = await stampPdf(orig, [asField(0, fld)], [{ field_id: 'f0', value: 'ZETA-MARKER', sig_method: null, typed_text: null, image_png: null }]);
      expect(Buffer.from(orig).equals(Buffer.from(before))).toBe(true);
      const { layouts } = await extractLayouts(out);
      const run = layouts[0].runs.find((x) => x.str.includes('ZETA-MARKER'));
      expect(run, `rotation ${r}`).toBeTruthy();
      const W = geoms[0].width, H = geoms[0].height;
      expect(run!.x).toBeGreaterThanOrEqual(fld.x * W - 0.5);
      expect(run!.x + run!.w).toBeLessThanOrEqual((fld.x + fld.w) * W + 0.5);
      expect(run!.baseline).toBeGreaterThan(fld.y * H);
      expect(run!.baseline).toBeLessThanOrEqual((fld.y + fld.h) * H + 1);
    }
  });
  it('long names shrink then wrap and never overflow; absurd text is refused rather than clipped', async () => {
    const doc = await PDFDocument.create(); const fonts = await prepareFonts(doc);
    expect(fitText('Al', fonts.latin, 170, 18)!.size).toBeGreaterThanOrEqual(11);
    const fit = fitText('Alexandra Montgomery-Featherstonehaugh de la Cruz y Fernández', fonts.latin, 170, 30)!;
    for (const line of fit.lines) expect(fonts.latin.widthOfTextAtSize(line, fit.size)).toBeLessThanOrEqual(166);
    expect(await textFits('x'.repeat(400), 170, 18)).toBe(false);
    expect(await textFits('Zoë Ñandú – Łukasz Đặng Иван 山田太郎', 300, 24)).toBe(true);
  });
  it('draws signature images, ticks only ticked boxes, and leaves untouched fields blank', async () => {
    const orig = await textContractPdf();
    const fields = [asField(0, { type: 'signature', page: 1, x: 0.2, y: 0.4, w: 0.3, h: 0.05 }), asField(1, { type: 'checkbox', page: 1, x: 0.2, y: 0.6, w: 0.02, h: 0.02 }), asField(2, { type: 'checkbox', page: 1, x: 0.3, y: 0.6, w: 0.02, h: 0.02 })];
    const values: StampValue[] = [{ field_id: 'f0', value: null, sig_method: 'drawn', typed_text: null, image_png: png(300, 80) }, { field_id: 'f1', value: 'true', sig_method: null, typed_text: null, image_png: null }, { field_id: 'f2', value: 'false', sig_method: null, typed_text: null, image_png: null }];
    const out = await stampPdf(orig, fields, values);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
    expect((await stampPdf(orig, fields, [])).length).toBeLessThan(out.length);
  });
  it('removes the original AcroForm widget it replaces', async () => {
    const orig = await acroFormPdf();
    const f = (await detect(orig)).fields.find((x) => x.source_ref === 'Customer Full Name')!;
    const out = await stampPdf(orig, [{ id: 'a', type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, prefill_value: null, source_ref: f.source_ref, source: 'acroform' }], [{ field_id: 'a', value: 'Ada', sig_method: null, typed_text: null, image_png: null }]);
    const names = (await PDFDocument.load(out)).getForm().getFields().map((x) => x.getName());
    expect(names).not.toContain('Customer Full Name'); expect(names).toContain('Company');
  });
  it('builds a multi-page certificate with long names and many events; states what was not verified', async () => {
    const c = await buildCertificate({ documentTitle: 'Contract Ω', documentId: crypto.randomUUID(), versionId: crypto.randomUUID(), versionNo: 1, pageCount: 2, originalSha256: 'a'.repeat(64), finalSha256: 'b'.repeat(64),
      sender: { name: 'S', email: 's@x.test', business: 'Acme' }, sentAt: new Date().toISOString(), completedAt: new Date().toISOString(), expiresAt: null, signingOrder: 'sequential', retentionUntil: null,
      recipients: Array.from({ length: 4 }, (_, i) => ({ name: `Alexandra Montgomery-Featherstonehaugh ${i}`, email: `a${i}@example.test`, order: i + 1, status: 'signed', invitedAt: null, firstViewedAt: null, consentAt: null, signedAt: new Date().toISOString(), declinedAt: null, ip: '203.0.113.9', userAgent: 'Mozilla/5.0 (iPhone) Safari/605', timezone: 'UTC', authMethod: 'email_link', signatureMethods: ['signature: drawn'] })),
      consent: { version: 'v', sha256: 'c'.repeat(64), text: ['one', 'two'] }, events: Array.from({ length: 80 }, () => ({ at: new Date().toISOString(), type: 'Signed', who: 'X', ip: '1.1.1.1' })), chainHead: 'd'.repeat(64), chainValid: true });
    const { layouts } = await extractLayouts(c);
    const text = layouts.flatMap((l) => l.runs.map((r) => r.str)).join(' ');
    expect(layouts.length).toBeGreaterThan(2);
    expect(text).toMatch(/not certificate-based/i); expect(text).toMatch(/not independently verify/i);
    expect(text).toContain('b'.repeat(64).slice(0, 30));
  });
});

describe('inputs, tokens and permissions', () => {
  it('validates signature PNGs strictly', () => {
    expect(inspectPngBase64(png())).toMatchObject({ width: 300, height: 80 });
    expect(inspectPngBase64('not base64!!')).toBeNull();
    expect(inspectPngBase64(Buffer.from('GIF89a-not-a-png-at-all-and-long-enough-to-pass-length-check').toString('base64'))).toBeNull();
    expect(inspectPngBase64(png(3000, 100))).toBeNull();
  });
  it('draft schema rejects off-page fields, prefill on non-text fields and bad emails', () => {
    const base = { subject: 's', message: '', signing_order: 'sequential', expiry_days: 14, recipients: [{ name: 'A', email: 'a@x.test' }], fields: [] as unknown[] };
    const f = { recipient_index: 1, type: 'signature', page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.05, required: true };
    expect(draftSchema.safeParse({ ...base, fields: [f] }).success).toBe(true);
    expect(draftSchema.safeParse({ ...base, fields: [{ ...f, x: 0.95 }] }).success).toBe(false);
    expect(draftSchema.safeParse({ ...base, fields: [{ ...f, prefill_value: 'x' }] }).success).toBe(false);
    expect(draftSchema.safeParse({ ...base, recipients: [{ name: 'A', email: 'nope' }] }).success).toBe(false);
  });
  it('tokens are 256-bit URL-safe random values and only hashes are derived for storage', () => {
    const a = generateToken(), b = generateToken();
    expect(a).not.toBe(b); expect(looksLikeToken(a)).toBe(true); expect(looksLikeToken('short')).toBe(false); expect(looksLikeToken('../../etc/passwd')).toBe(false);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/); expect(hashToken(a)).not.toContain(a);
  });
  it('formats signing dates in the signer’s zone and rejects bogus zones', () => {
    const d = new Date('2026-10-08T03:30:00Z');
    expect(formatSigningDate(d, 'MMM d, yyyy', 'America/Los_Angeles')).toBe('Oct 7, 2026');
    expect(formatSigningDate(d, 'MM/dd/yyyy', 'UTC')).toBe('10/08/2026');
    expect(formatSigningDate(d, 'yyyy-MM-dd', 'Asia/Tokyo')).toBe('2026-10-08');
    expect(safeTimeZone('Not/AZone')).toBe('UTC'); expect(safeTimeZone('x'.repeat(100))).toBe('UTC');
  });
  const profile = (o: Partial<Profile>): Profile => ({ id: 'u', role: 'contractor', contractor_id: 'c1', contractor_role: 'owner', is_active: true, ...o } as Profile);
  it('tenant isolation: contractors reach only their own company; admins everything; setters/callers nothing', () => {
    expect(actorCanAccessDocument(profile({}), { contractor_id: 'c1' })).toBe(true);
    expect(actorCanAccessDocument(profile({ contractor_role: 'staff' }), { contractor_id: 'c1' })).toBe(true);
    expect(actorCanAccessDocument(profile({}), { contractor_id: 'c2' })).toBe(false);
    expect(actorCanAccessDocument(profile({}), { contractor_id: null })).toBe(false);
    expect(actorCanAccessDocument(profile({ role: 'admin', contractor_id: null, contractor_role: null }), { contractor_id: 'c2' })).toBe(true);
    expect(actorCanAccessDocument(profile({ role: 'admin', is_active: false, contractor_id: null }), { contractor_id: 'c2' })).toBe(false);
    for (const role of ['setter', 'caller'] as const) expect(canManageSigning(profile({ role, contractor_id: null }))).toBe(false);
    expect(canManageSigning(profile({ contractor_id: null }))).toBe(false);
  });
});

describe('editor helpers', () => {
  const f = (o: Partial<UiField>): UiField => ({ key: Math.random().toString(), recipient_index: null, type: 'signature', page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.05, required: true, label: null, group_key: null, prefill_value: null, date_format: null, source: 'text', confidence: 0.9, needs_review: false, reviewed: false, role_hint: null, detection_note: null, source_ref: null, ...o });
  it('auto-assigns by role words, then by proximity; leaves far-away fields alone', () => {
    const out = autoAssign([f({ role_hint: 'buyer', y: 0.2 }), f({ type: 'date', y: 0.22, x: 0.5 }), f({ role_hint: 'seller', y: 0.6 }), f({ type: 'text', y: 0.95, x: 0.9 })], 2);
    expect(out.map((x) => x.recipient_index)).toEqual([1, 1, 2, null]);
    expect(autoAssign([f({}), f({ page: 2 })], 1).map((x) => x.recipient_index)).toEqual([1, 1]);
  });
  it('flags everything a sender must fix before sending', () => {
    const rec = [{ key: 'a', name: 'Ada', email: 'ada@x.test' }, { key: 'b', name: 'Bob', email: 'bad' }];
    const probs = sendProblems({ subject: '', recipients: rec, fields: [f({ recipient_index: 1 }), f({ type: 'text', needs_review: true })], order: 'sequential' }).join('|');
    for (const re of [/subject/, /valid email/, /Bob has no signature/, /not assigned/, /review/]) expect(probs).toMatch(re);
  });
  it('shows expired for lapsed open requests only', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(effectiveStatus('awaiting_signature', past)).toBe('expired');
    expect(effectiveStatus('completed', past)).toBe('completed');
  });
});
