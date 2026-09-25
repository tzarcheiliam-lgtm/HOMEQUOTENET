/**
 * Internal email to the HQN team when a contractor requests a Growth Tools
 * upsell. Pure builder (no I/O) so content is unit-tested; the sender is
 * lib/growth/notify.ts. Gmail-safe inline HTML plus a plain-text alternative.
 */
import { escapeHtml, formatPacific, oneLine, type BuiltEmail } from '@/lib/leads/lead-emails';

export interface ServiceRequestEmailData {
  contractorName: string;
  contractorId: string;
  serviceName: string;
  requesterName: string | null;
  requesterEmail: string | null;
  notes: string | null;
  submittedAt: string;
  /** e.g. "Growth Tools page"; omitted when unknown. */
  sourceLabel: string | null;
}

const INK = '#243447';
const MUTED = '#65758b';
const RULE = '#d9e5f2';

function appUrl(path: string, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'): string {
  return new URL(path, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}

export function contractorAccountUrl(contractorId: string, siteUrl?: string): string {
  return appUrl(`/app/contractors/${encodeURIComponent(contractorId)}`, siteUrl);
}

export function serviceRequestsUrl(siteUrl?: string): string {
  return appUrl('/app/service-requests?status=new', siteUrl);
}

export function buildServiceRequestAlert(
  d: ServiceRequestEmailData,
  links: { contractorUrl: string; reviewUrl: string }
): BuiltEmail {
  const contractor = oneLine(d.contractorName, 120);
  const service = oneLine(d.serviceName, 120);
  const subject = oneLine(`New HomeQuote Upsell Request — ${service}`);
  const notes = d.notes?.trim() || null;

  // Field order follows the requested email layout.
  const fields: [string, string, 'pre'?][] = [
    ['Contractor', contractor],
    ['Requested Service', service],
    ['Requested By', oneLine(d.requesterName || 'Unknown', 120)],
    ['Email', d.requesterEmail ? oneLine(d.requesterEmail, 254) : '—'],
    ['Contractor ID', oneLine(d.contractorId, 64)],
    ['Notes', notes ?? '(none)', 'pre'],
    ['Submitted', formatPacific(d.submittedAt)],
  ];
  if (d.sourceLabel) fields.push(['Source', oneLine(d.sourceLabel, 60)]);

  const text = [
    'New Upsell Request',
    '',
    ...fields.flatMap(([k, v]) => [`${k}:`, v, '']),
    `Open contractor account: ${links.contractorUrl}`,
    `Review upsell requests: ${links.reviewUrl}`,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${RULE};border-radius:8px">
<tr><td style="padding:24px">
<h1 style="margin:0 0 4px;font-size:20px;line-height:1.3">New Upsell Request</h1>
<p style="margin:0 0 20px;font-size:13px;color:${MUTED}">${escapeHtml(contractor)} requested ${escapeHtml(service)}.</p>
${fields
  .map(
    ([k, v, pre]) =>
      `<p style="margin:0;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED}">${escapeHtml(k)}</p>
<p style="margin:2px 0 14px;font-size:15px;${pre ? 'white-space:pre-wrap;' : ''}">${escapeHtml(v)}</p>`
  )
  .join('\n')}
<p style="margin:8px 0 0">
<a href="${escapeHtml(links.contractorUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;margin:0 8px 8px 0">Open contractor account</a>
<a href="${escapeHtml(links.reviewUrl)}" style="display:inline-block;border:1px solid ${RULE};color:${INK};text-decoration:none;padding:9px 16px;border-radius:6px;font-size:14px;margin:0 0 8px">Review requests</a>
</p>
</td></tr></table></body></html>`;

  return { subject, text, html };
}
