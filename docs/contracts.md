# Contracts & Templates (migration 0042)

Reusable agreements on top of Documents & Signing. A contract is rendered to a PDF and sent through the **existing signing engine** (migrations 0039/0040): tokens, consent, audit hash chain, reminders, expiry, certificate and final PDF are unchanged.

## Deploy
1. Apply `supabase/migrations/0042_contracts_templates.sql` (needs 0039, 0040, 0041). It adds `contractors.logo_path`, the private bucket `contract-assets`, the `contract_*` tables, state functions, RLS, and the `contract.*` workflow events.
2. No new env vars. Uses existing Supabase keys, Gmail connection and `/api/workflows/tick`.
3. The seven starter templates are seeded on first visit to `/app/contracts/templates` (or `/new`), once each.
4. New npm deps: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-table`.
5. **Have counsel review** all starter wording. Every obligation ends in a `[REVIEW: …]` marker; the send step requires the sender to acknowledge any that remain (recorded in `contract_events`). Nothing here is legal advice or a claim of DocuSign-equivalence.

## Routes
`/app/contracts` (dashboard; contractor users see only sent agreements of their company), `/new` (template gallery), `/[id]/edit` (wizard steps 2-6, drafts only), `/[id]` (record, audit, downloads), `/templates`, `/templates/[id]` (editor).

## Model
- `contract_templates` (working copy) -> `contract_template_versions` (immutable snapshot per publish). `contracts` copy sections at creation, so template edits never change existing agreements; templates in use cannot be deleted (FK restrict + service check).
- Content = whitelisted TipTap JSON in ordered sections (`lib/contracts/types.ts`, sanitized server-side). Merge fields in `lib/contracts/variables.ts`; unresolved/invalid fields block sending.
- `lib/contracts/render-model.ts` is the single normalized model for the HTML preview and `pdf.ts`. The PDF preview shows the real bytes.
- Send: validate -> render PDF -> `signing_documents` (HQN-owned) + `signing_versions` + fields/recipients -> `contract_link_signing` -> `signing.sendForSignature` -> `contract_mark_sent`. Failures unlink and delete the draft. Once the signing request leaves `draft`, a trigger freezes the contract row and forbids delete.
- Logos: validated by magic bytes, re-encoded to PNG (metadata stripped, transparency kept, margins trimmed), stored in `contract-assets`. CRM logo = `contractors.logo_path`.
- Status is derived (draft/sent/viewed/partially_signed/completed/declined/expired/voided), never stored twice.
- Events: DB triggers emit `contract.created/sent/viewed/signed/fully_signed/declined/expired` (network-level, `entity_type='contract'`, payload `clientContractorId`). Existing visual workflows can start from them (tested: notify admins). Signing never touches billing.

## Limits
- Addresses are not in the CRM; entered per agreement. No CC-only recipients (only signers get the completed PDF). No workflow action changes a contractor's onboarding stage (none exists). Table rows taller than a page are rejected; cells do not support rowspan. Exhibits are PDFs appended unsigned-page-numbered. Signer identity = emailed link only (existing posture).
