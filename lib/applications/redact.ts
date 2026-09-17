/**
 * Redaction for failure logging.
 *
 * When a contractor application cannot be delivered we still want a log line —
 * otherwise a lost submission is invisible. But a production log is a durable,
 * widely-readable store, so the applicant's personal details must not go into
 * it. This module reduces a submission to the fields needed to notice, count
 * and diagnose a failure, and nothing more.
 *
 * Pure and dependency-free so it can be unit-tested; `deliver.ts` imports
 * `server-only` and cannot be.
 *
 * KEPT      reference id, timestamp, company, service area, project types,
 *           track, source pathname, sink statuses, error categories.
 * OMITTED   applicant name, email, phone, website, notes, the raw payload,
 *           and raw error text (which can carry URLs, credentials or
 *           connection details).
 *
 * The trade-off is deliberate: a failed application can no longer be recovered
 * from logs alone. Configure a delivery sink so failures stay rare.
 */

import type { SinkState } from './outcome';

/** The only shape ever written to a production failure log. */
export type RedactedLogRecord = {
  ref: string;
  submitted_at: string;
  company: string;
  service_areas: string;
  primary_services: string[];
  track: string;
  /** Pathname only — query string and fragment are dropped. */
  source_path: string | null;
  sinks: { webhook: SinkState; supabase: SinkState };
  error_categories: string[];
};

/** The subset of an application this module is allowed to read. */
export type RedactableRecord = {
  submitted_at: string;
  company: string;
  service_areas: string;
  primary_services: readonly string[];
  track: string;
  source_page: string | null;
};

export type RedactionContext = {
  ref: string;
  sinks: { webhook: SinkState; supabase: SinkState };
  errors: readonly string[];
};

/**
 * Reduces an error message to a stable category. The raw text is never
 * returned: a webhook URL, a Postgres connection string or a bearer token can
 * all end up in an error message, and any of them in a log is a leak.
 */
export function categorizeError(raw: string): string {
  const s = String(raw).toLowerCase();

  if (s.startsWith('webhook')) {
    if (s.includes('abort') || s.includes('timeout')) return 'webhook_timeout';
    // The status code itself is safe and is the most useful single signal.
    const status = /responded\s+(\d{3})/.exec(s);
    if (status) return `webhook_http_${status[1]}`;
    if (s.includes('fetch failed') || s.includes('enotfound') || s.includes('econnrefused')) {
      return 'webhook_unreachable';
    }
    return 'webhook_error';
  }

  if (s.startsWith('supabase')) {
    if (s.includes('fetch failed') || s.includes('enotfound')) {
      return 'supabase_unreachable';
    }
    return 'supabase_error';
  }

  return 'unknown_error';
}

/**
 * Pathname only. A referer can carry query parameters — including, on some
 * platforms, tracking values tied to an individual — so everything after the
 * path is discarded.
 */
export function toLogPath(sourcePage: string | null): string | null {
  if (!sourcePage) return null;
  try {
    return new URL(sourcePage).pathname || null;
  } catch {
    // Not an absolute URL. Keep the leading path segment only, never a query.
    const path = String(sourcePage).split('?')[0].split('#')[0].trim();
    return path === '' ? null : path;
  }
}

/**
 * Builds the loggable view of a submission.
 *
 * Constructs a fresh object field by field rather than deleting keys from the
 * record, so a field added to the application form in future is omitted by
 * default instead of silently appearing in logs.
 */
export function redactForLog(
  record: RedactableRecord,
  context: RedactionContext
): RedactedLogRecord {
  return {
    ref: context.ref,
    submitted_at: record.submitted_at,
    company: record.company,
    service_areas: record.service_areas,
    primary_services: [...record.primary_services],
    track: record.track,
    source_path: toLogPath(record.source_page),
    sinks: { webhook: context.sinks.webhook, supabase: context.sinks.supabase },
    error_categories: [...new Set(context.errors.map(categorizeError))],
  };
}

/**
 * A short, random reference for correlating log lines about one submission.
 * Deliberately not derived from the applicant's details: a hash of a
 * low-entropy value like an email address is still personal data.
 */
export function newSubmissionRef(): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(16).slice(2).padEnd(12, '0');
  return `hq_${rand.slice(0, 10)}`;
}
