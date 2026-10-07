/**
 * Shared constants for Documents & Signing. Pure (safe to import from client components).
 * NOTE: the consent / identity wording below is plain-language product copy, NOT legal advice.
 * It must be reviewed by counsel for each jurisdiction before real contracts are signed.
 */
export const SIGNING_BUCKET = 'signing-documents';

export const LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxPages: 50,
  maxPageDimensionPt: 14_400,
  maxRecipients: 10,
  maxFields: 400,
  maxSignatureImageBytes: 300 * 1024,
  maxTextLength: 1000,
  /** OCR is CPU heavy; pages beyond this are skipped (manual placement still works). */
  maxOcrPages: 8,
  defaultExpiryDays: 14,
  /** Completed-document link validity in the completion email. */
  downloadLinkDays: 30,
  /** Audit/retention policy default. Counsel should confirm per jurisdiction/contract type. */
  retentionYears: 7,
} as const;

export type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'checkbox';
export const FIELD_TYPES: FieldType[] = ['signature', 'initials', 'name', 'date', 'text', 'checkbox'];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Signature',
  initials: 'Initials',
  name: 'Printed name',
  date: 'Date signed',
  text: 'Text',
  checkbox: 'Checkbox',
};

/** Default size as a fraction-independent size in PDF points (converted per page). */
export const FIELD_DEFAULT_PT: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 180, h: 36 },
  initials: { w: 64, h: 30 },
  name: { w: 170, h: 18 },
  date: { w: 110, h: 18 },
  text: { w: 170, h: 18 },
  checkbox: { w: 14, h: 14 },
};

export const DATE_FORMATS = ['MMM d, yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export type SigningStatus =
  | 'draft'
  | 'awaiting_signature'
  | 'partially_signed'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'expired';

export const STATUS_LABELS: Record<SigningStatus, string> = {
  draft: 'Draft',
  awaiting_signature: 'Awaiting signature',
  partially_signed: 'Partially signed',
  completed: 'Completed',
  declined: 'Declined',
  voided: 'Voided',
  expired: 'Expired',
};

export type RecipientStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: 'Not yet invited',
  sent: 'Invited',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
};

export const SIGNING_EVENT_LABELS: Record<string, string> = {
  version_created: 'New version created',
  placement_reviewed: 'Field placement reviewed',
  sent: 'Sent for signature',
  invited: 'Invitation emailed',
  invite_failed: 'Invitation email failed',
  reminded: 'Reminder emailed',
  viewed: 'Opened',
  viewed_again: 'Opened again',
  consent_given: 'Agreed to sign electronically',
  signed: 'Signed',
  declined: 'Declined to sign',
  completed: 'All signers finished',
  finalized: 'Final PDF and certificate created',
  finalize_failed: 'Final PDF generation failed',
  completion_emailed: 'Completion email sent',
  completion_email_failed: 'Completion email failed',
  voided: 'Voided',
  expired: 'Expired',
  downloaded: 'Downloaded',
};

// ---------------------------------------------------------------------------
// Electronic-signing consent shown to every signer before they sign.
// Versioned + hashed so the audit record proves exactly which text was accepted.
// ---------------------------------------------------------------------------
export const CONSENT_VERSION = 'esign-consent-2026-10-v1';

export const CONSENT_TEXT: string[] = [
  'I agree to review and sign this document electronically instead of on paper.',
  'I understand my typed or drawn signature will be applied to the document where I choose, and that I intend it as my signature on this document, to the extent permitted by law.',
  'I can view and keep a copy: when everyone has signed, I will receive a link to download the completed PDF. I can ask the sender for a paper copy, or withdraw my consent to sign electronically, by contacting them before I sign.',
  'To use this page I need a current web browser and a PDF viewer to open the completed file.',
];


/** What we actually do to identify the signer. Shown to the signer and recorded in the certificate. */
export const AUTH_METHOD = 'email_link' as const;
export const IDENTITY_STATEMENT =
  'The signer was identified only by access to a unique, expiring link sent to the email address the sender entered. HomeQuote Network did not independently verify the signer’s legal identity (no ID check, no SMS or access-code check).';

export const SIGNATURE_STATEMENT =
  'Signatures on this document are electronic signatures (drawn or typed by the signer). They are not certificate-based cryptographic digital signatures (e.g. PAdES).';

export const LEGAL_REVIEW_NOTE =
  'HomeQuote Network provides this tool as software only. Whether an electronic signature is valid or enforceable depends on the document, the parties and the jurisdiction. Have counsel review before using it for real contracts.';
