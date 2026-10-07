# Documents & Signing (electronic signature)

Status: implemented end to end, **not yet deployed**. Migration `0039_document_signing.sql` must be applied first.

## What it does
Upload a PDF -> suggested signing fields -> sender reviews/edits -> one or more signers are emailed an expiring link -> they sign on any device -> signed PDF + certificate of completion are produced and emailed.

Sections: sidebar **Documents & Signing** (`/app/documents`, admins + contractor owners/staff), a Documents panel on lead and contractor (admin) records, public signing page `/sign`.

## Production setup checklist
1. Apply `supabase/migrations/0039_document_signing.sql` (creates the **private** `signing-documents` bucket, tables, RLS, state functions).
2. No new environment variables. It uses the existing Supabase keys, `NEXT_PUBLIC_SITE_URL` (links in emails) and the existing Gmail connection (`/app/calls/emails` OAuth). Signing emails send "From" the connected HomeQuote Gmail address with `Reply-To` set to the sender.
3. `/api/workflows/tick` (existing 5-minute GitHub Actions job) now also expires overdue requests and retries stuck PDF generation. Without it links still stop working at expiry (checked on every use) but status labels only flip when someone looks.
4. Hosting: the upload analysis and OCR run in Node serverless functions (`maxDuration = 60` on the document pages). Vercel Hobby caps functions at 60s; scans of many pages may need Pro. `next.config.ts` already lists the pdf.js/OCR assets (`lib/signing/assets/`: English OCR model ~4 MB, DejaVu Sans font) for file tracing.
5. **Legal review before real contracts** (see below).

## Costs
No per-document fees, no external vendors. Costs are Supabase storage/egress, Vercel function time (OCR is the heavy part: ~1.5 s per scanned page here), and Gmail sending limits (~500/day for a free Google account, ~2,000/day Workspace). Libraries: `@cantoo/pdf-lib` (MIT, maintained fork), `pdfjs-dist` (Apache-2.0), `tesseract.js` (Apache-2.0, runs locally with a bundled model), `@napi-rs/canvas`, `fontkit`, DejaVu Sans (free licence).

## Field detection
Order: (1) real AcroForm widgets; (2) text layer + vector rules/boxes (labels such as Signature/Initials/Printed name/Date/Title/Company, underscore runs, rules above/below/right of labels, boxes, checkbox squares and glyphs); (3) local OCR for image-only pages. Sentences that merely mention "signature" are not fields: a label needs to be short or label-like **and** have a line/box/underscore slot nearby. Coordinates are stored as fractions of the *displayed* page (after /Rotate, CropBox) and converted to PDF user space only when stamping (`lib/signing/geometry.ts`), verified for 0/90/180/270 and offset CropBoxes.

**Limits (be honest with users):** it is heuristic. It can miss fields and suggest wrong ones; anything under 75% confidence, every OCR result, every Yes/No pair, and any "no slot found" guess is flagged for review, and sending requires a page-by-page review. Not handled: text that is rotated relative to the displayed page, non-English labels (OCR model is English), checkboxes in scans, handwriting, tables where many labels share a line, forms drawn as images. Manual placement always works and is the fallback when detection fails or OCR is unavailable. Nothing is ever pre-signed or pre-ticked; sender prefill is limited to plain text fields and is stored apart from signer input.

## Identity, signatures, legal posture
* Signers are identified **only by an emailed link** (256-bit random token in the URL fragment, stored as a SHA-256 hash, expiring, rotated on resend, dead after signing/void/expiry/decline). No ID check, SMS or access code. The UI, the email footer and the certificate say so; nothing implies legal identity is proven.
* Signatures are drawn or typed images. They are **not** certificate-based/cryptographic digital signatures (no PAdES). The final PDF is not cryptographically signed; integrity is provided by recorded SHA-256 hashes (original, final, certificate), write-once DB columns, hash verification before every download, and a hash-chained append-only audit log.
* Consent wording is versioned and hashed (`lib/signing/constants.ts`, `CONSENT_VERSION`). It is plain-language product copy, **not legal advice**. Before real use have counsel review: ESIGN/UETA/eIDAS applicability, documents excluded from e-signature (wills, certain real-estate/consumer notices, etc.), consumer-disclosure requirements, the retention period (default 7 years from completion, `retention_until`; nothing purges automatically), privacy notices for IP/user-agent collection, and contractor-licensing rules for home-improvement contracts in each state.
* Not claimed: equivalence to DocuSign, compliance/certification, enforceability in every jurisdiction.

## Security model
* Private bucket, no storage policies; every file access is a server check + 60 s signed URL (preview 10 min). Uploads go browser -> signed upload URL; the server re-validates (PDF magic, <=25 MB, <=50 pages, not encrypted, no JavaScript/OpenAction, sane page size, parseable).
* Tenant isolation in three layers: server (`lib/signing/access.ts`, same "not found" answer for missing and foreign), RLS (read-only for browser roles; token hashes and signature blobs are column-revoked), and service-role-only SQL functions. Setters/callers have no access.
* Atomic state machine in SQL (`signing_send/submit/decline/void/new_version/...`): row locks serialize concurrent submissions; a retry after success returns `already` and changes nothing; sequential order, required fields, exclusive checkbox groups and field ownership are enforced in the DB. Triggers lock a sent version's content/fields/recipients, make events/values append-only and final hashes write-once.
* Tokens are never logged or stored in plaintext; the signer API takes them in a POST body; `/sign` is `no-store`, `no-referrer`, `noindex`. Errors returned to signers are generic.
* Failed emails are recorded per signer and can be resent; finalization is single-flight with a DB lease and retried by the tick or a button.

## Tests
`tests/signing-sql.test.ts` (migration in PGlite: locking, tokens, order, groups, expiry, versions, immutability, hash chain, RLS/column grants), `tests/signing-engine.test.ts` (validation, geometry, detection on text/rotated/cropped/AcroForm/scanned PDFs, stamping verified by re-extracting text, long names, certificate, permissions), `tests/signing-service.test.ts` (the real service layer end to end against the migration SQL with a PGlite-backed Supabase stand-in: 2-signer in-order flow, replay, tenant isolation, resend/remind/decline/void/new version, expiry, email failure, finalize failure + single-flight, rotated + scanned documents). Test PDFs are generated (`tests/helpers/signing-fixtures.ts`); no real emails are sent (the mailer is mocked).
Not covered by automated tests: a live Supabase project, real Gmail delivery, and real-browser E2E of the sender screens beyond manual Playwright screenshots (editor, review, mobile signer were checked this way).

## Roadmap / not built
Reusable templates (copy a draft's fields/signer roles to a new document), automatic scheduled reminders (manual remind exists), SMS/access-code identity checks, cryptographic PDF signing, bulk send, DOCX upload, per-contractor retention settings and purge job, a lead picker on the upload screen (attach from the lead page instead), customer/job records (the app has leads and contractors only).
