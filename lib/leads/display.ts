// Presentation-only helpers for the leads UI. Never used for business logic —
// qualification/status/send decisions all read the raw columns directly.

const KNOWN_LABELS: Record<string, string> = {
  zip: 'ZIP code',
  service: 'Service',
  timeline: 'Timeline',
  homeowner: 'Homeowner',
  budget: 'Budget',
  budget_range: 'Budget',
  scope: 'Scope',
  urgency: 'Urgency',
  decision_maker: 'Decision maker',
  notes: 'Notes',
  address: 'Address',
  city: 'City',
  state: 'State',
  project: 'Project',
  project_type: 'Project',
  square_footage: 'Square footage',
  property_type: 'Property type',
};

/** "full_remodel" / "1_3_months" / "1-3-months" -> "Full Remodel" / "1-3 Months". */
export function humanizeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  // Leave already human-readable strings (contain spaces, or mixed case with
  // punctuation) alone rather than mangling free text.
  if (/\s/.test(trimmed) && !/_/.test(trimmed)) return trimmed;

  return trimmed
    .split(/[_\s]+/)
    .map((word) => {
      // "3" + "months" pattern like "1_3_months" -> keep digits joined with a dash
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/(\d+)\s+(\d+)\s+/, '$1-$2 '); // "1 3 Months" -> "1-3 Months"
}

function humanizeBoolean(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  const s = String(value).trim().toLowerCase();
  if (s === 'yes' || s === 'true') return 'Yes';
  if (s === 'no' || s === 'false') return 'No';
  return humanizeToken(String(value));
}

export interface ParsedDescriptionField {
  key: string;
  label: string;
  value: string;
}

export interface ParsedDescription {
  /** True when the raw text was structured JSON we successfully parsed. */
  isStructured: boolean;
  fields: ParsedDescriptionField[];
  /** Free-text remainder to show as notes (structured mode) or as-is (fallback). */
  text: string | null;
}

/**
 * Safely turn a project_description value into something a human can read.
 * Handles the legacy case where a JSON blob (e.g. funnel answers) was stored
 * directly in the free-text column. Never throws, never returns raw JSON.
 */
export function parseLeadDescription(
  raw: string | null | undefined
): ParsedDescription {
  const value = (raw ?? '').trim();
  if (!value) return { isStructured: false, fields: [], text: null };

  const looksLikeJson =
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']'));

  if (looksLikeJson) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed as Record<string, unknown>).filter(
          ([, v]) => v !== null && v !== undefined && v !== ''
        );
        if (entries.length > 0) {
          const fields: ParsedDescriptionField[] = [];
          let notes: string | null = null;
          for (const [key, v] of entries) {
            const label =
              KNOWN_LABELS[key] ?? humanizeToken(key.replace(/[-_]/g, ' '));
            if (typeof v === 'boolean') {
              fields.push({ key, label, value: humanizeBoolean(v) });
            } else if (key === 'notes' || key === 'description' || key === 'message') {
              notes = String(v);
            } else if (typeof v === 'string' || typeof v === 'number') {
              fields.push({ key, label, value: humanizeToken(String(v)) });
            } else {
              // Nested object/array — render compactly rather than dumping JSON.
              fields.push({ key, label, value: humanizeToken(JSON.stringify(v).replace(/[{}"[\]]/g, ' ').trim()) });
            }
          }
          return { isStructured: true, fields, text: notes };
        }
      }
    } catch {
      // Fall through to plain-text rendering below.
    }
  }

  return { isStructured: false, fields: [], text: value };
}

/** "Not provided" fallback for empty fields, without endless dashes. */
export function displayValue(
  value: string | number | null | undefined,
  fallback = 'Not provided'
): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

/** Relative age since a timestamp, e.g. "12 minutes", "3 hours", "2 days". */
export function formatLeadAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}
