/**
 * Internal email to the HQN team when a contractor asks about a growth
 * service. Pure builder (no I/O) so content is unit-tested; the sender is
 * lib/growth/notify.ts. Gmail-safe inline HTML plus a plain-text alternative.
 */
import { escapeHtml, formatPacific, oneLine, type BuiltEmail } from '@/lib/leads/lead-emails';

export interface ServiceRequestEmailData {
  companyName: string;
  serviceName: string;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterPhone: string | null;
  notes: string | null;
  submittedAt: string;
}

const INK = '#243447';
const MUTED = '#65758b';
const RULE = '#d9e5f2';

export function serviceRequestsUrl(siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'): string {
  return new URL('/app/service-requests?status=new', siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}

export function buildServiceRequestAlert(d: ServiceRequestEmailData, reviewUrl: string): BuiltEmail {
  const company = oneLine(d.companyName, 120);
  const service = oneLine(d.serviceName, 120);
  const subject = oneLine(`Service request: ${service} · ${company}`);
  const rows: [string, string][] = [
    ['Company', company],
    ['Service', service],
    ['Requested by', oneLine(d.requesterName || 'Unknown', 120)],
    ['Email', d.requesterEmail ? oneLine(d.requesterEmail, 254) : '—'],
    ['Phone', d.requesterPhone ? oneLine(d.requesterPhone, 40) : '—'],
    ['Submitted', formatPacific(d.submittedAt)],
  ];
  const notes = d.notes?.trim() || null;

  const text = [
    `${company} asked about ${service}.`,
    'Interest only: nothing was purchased or billed.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Notes: ${notes ?? '(none)'}`,
    '',
    `Review and update the status: ${reviewUrl}`,
  ].join('\n');

  const cell = `padding:6px 0;border-bottom:1px solid ${RULE};font-size:14px;vertical-align:top`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${RULE};border-radius:8px">
<tr><td style="padding:24px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">Grow Your Business · new request</p>
<h1 style="margin:0 0 8px;font-size:20px;line-height:1.3">${escapeHtml(company)} asked about ${escapeHtml(service)}</h1>
<p style="margin:0 0 16px;font-size:13px;color:${MUTED}">Interest only: nothing was purchased or billed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `<tr><td style="${cell};width:120px;color:${MUTED}">${escapeHtml(k)}</td><td style="${cell}">${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
<p style="margin:16px 0 4px;font-size:12px;color:${MUTED}">Notes</p>
<p style="margin:0 0 20px;font-size:14px;white-space:pre-wrap">${notes ? escapeHtml(notes) : '<span style="color:' + MUTED + '">(none)</span>'}</p>
<a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">Review request</a>
</td></tr></table></body></html>`;

  return { subject, text, html };
}
