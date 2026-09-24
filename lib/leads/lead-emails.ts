/**
 * HomeQuote lead emails: the internal "new lead — needs qualification" alert
 * and the "qualified lead" email sent to selected recipients. Pure builders
 * (no I/O) so content is unit-tested; lib/leads/notify.ts gathers the data.
 * Gmail-safe inline-styled HTML plus a plain-text alternative.
 */

export interface LeadEmailAnswer {
  label: string;
  value: string;
}

export interface LeadEmailData {
  leadId: string;
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  city: string | null;
  zip: string | null;
  homeowner: string | null;
  timeline: string | null;
  budget: string | null;
  /** e.g. "Pool" — used in the qualified-lead subject. */
  industry: string | null;
  source: string | null;
  submittedAt: string;
  isRepeat: boolean;
  /** The funnel's automatic service-area/answer check, when one ran. */
  autoCheck: boolean | null;
  answers: LeadEmailAnswer[];
  qualificationNotes: string | null;
  qualifiedBy: string | null;
  appointment: { scheduledAt: string | null; verified: boolean } | null;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

const TZ = 'America/Los_Angeles';
const NAVY = '#082f63';
const BLUE = '#1267a8';
const INK = '#243447';
const MUTED = '#65758b';
const RULE = '#d9e5f2';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** One header line: no CR/LF, collapsed whitespace, bounded length. */
export function oneLine(value: string, max = 200): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function formatPacific(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

/** Digits-only tel: target, US numbers normalized to +1XXXXXXXXXX. */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
  if (digits.length >= 7 && digits.length <= 15) return `tel:+${digits}`;
  return null;
}

/** Friendly (818) 555-0100 display for US numbers; anything else unchanged. */
export function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length === 10) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return phone;
}

function location(d: LeadEmailData): string | null {
  const parts = [d.city, d.zip].filter(Boolean);
  return parts.length ? parts.join(' / ') : null;
}

function subjectPlace(d: LeadEmailData): string {
  return d.city || (d.zip ? `ZIP ${d.zip}` : 'Location unknown');
}

function industryWord(industry: string | null): string {
  const word = (industry ?? '').trim().split(/\s+/)[0] ?? '';
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : 'HomeQuote';
}

export function appointmentLine(a: LeadEmailData['appointment']): string | null {
  if (!a) return null;
  const when = a.scheduledAt ? formatPacific(a.scheduledAt) : 'time not captured — check Calendly';
  return `Booked by the homeowner: ${when}${a.verified ? '' : ' (not yet verified)'}`;
}

// ---- HTML pieces --------------------------------------------------------------

type Row = { label: string; value: string | null; href?: string | null };

function rowsHtml(rows: Row[]): string {
  return rows
    .map(({ label, value, href }) => {
      const shown = value ? escapeHtml(value) : '<span style="color:#9aa8b8;">—</span>';
      const content =
        value && href
          ? `<a href="${escapeHtml(href)}" style="color:${BLUE};font-weight:700;text-decoration:none;">${shown}</a>`
          : shown;
      return [
        '<tr>',
        `<td style="padding:9px 12px 9px 0;border-bottom:1px solid ${RULE};color:${MUTED};font-size:13px;vertical-align:top;width:34%;">${escapeHtml(label)}</td>`,
        `<td style="padding:9px 0;border-bottom:1px solid ${RULE};color:${INK};font-size:15px;font-weight:600;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${content}</td>`,
        '</tr>',
      ].join('');
    })
    .join('');
}

function button(label: string, href: string, solid: boolean): string {
  const style = solid
    ? `background:${NAVY};color:#ffffff;border:2px solid ${NAVY};`
    : `background:#ffffff;color:${NAVY};border:2px solid ${NAVY};`;
  return `<a href="${escapeHtml(href)}" style="${style}display:inline-block;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">${escapeHtml(label)}</a>`;
}

function shell(eyebrow: string, title: string, body: string, footer: string): string {
  return [
    `<div style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:${INK};">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f6fa;"><tr><td align="center" style="padding:20px 12px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3eaf2;">',
    `<tr><td style="background:${NAVY};padding:16px 24px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.3px;">HomeQuote Network</td></tr>`,
    '<tr><td style="padding:24px;">',
    `<div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BLUE};margin:0 0 6px 0;">${escapeHtml(eyebrow)}</div>`,
    `<div style="font-size:22px;font-weight:700;color:${NAVY};line-height:1.3;margin:0 0 18px 0;">${escapeHtml(title)}</div>`,
    body,
    '</td></tr>',
    `<tr><td style="padding:14px 24px;border-top:1px solid ${RULE};color:${MUTED};font-size:12px;line-height:1.5;">${footer}</td></tr>`,
    '</table></td></tr></table></div>',
  ].join('');
}

function textRows(rows: Row[]): string {
  return rows.map((r) => `${r.label}: ${r.value ?? '—'}`).join('\n');
}

function extraAnswers(d: LeadEmailData): Row[] {
  return d.answers.map((a) => ({ label: a.label, value: a.value }));
}

// ---- Internal alert -------------------------------------------------------------

export function buildNewLeadAlert(d: LeadEmailData, leadUrl: string): BuiltEmail {
  const subject = oneLine(`New HomeQuote Lead — ${d.service || 'Project not specified'} — ${subjectPlace(d)}`);
  const phoneHref = d.phone ? telHref(d.phone) : null;
  const rows: Row[] = [
    { label: 'Name', value: d.name },
    { label: 'Phone', value: d.phone ? displayPhone(d.phone) : null, href: phoneHref },
    { label: 'Email', value: d.email, href: d.email ? `mailto:${d.email}` : null },
    { label: 'Project', value: d.service },
    { label: 'City / ZIP', value: location(d) },
    { label: 'Homeowner', value: d.homeowner },
    { label: 'Timeline', value: d.timeline },
    ...(d.budget ? [{ label: 'Budget', value: d.budget }] : []),
    { label: 'Lead Source/Campaign', value: d.source },
    { label: 'Submitted', value: formatPacific(d.submittedAt) },
    ...(d.appointment ? [{ label: 'Appointment', value: appointmentLine(d.appointment) }] : []),
  ];
  const notes: string[] = [];
  if (d.isRepeat) notes.push('Repeat request: this person already has a lead in HomeQuote. The details below were added to the existing lead.');
  if (d.autoCheck === false) notes.push('The form’s automatic check flagged this lead (for example, outside the service area). Review it before sending.');

  const noteHtml = notes
    .map((n) => `<div style="background:#fff7e6;border:1px solid #f5d9a3;color:#7a4b00;border-radius:8px;padding:10px 12px;font-size:14px;margin:0 0 14px 0;">${escapeHtml(n)}</div>`)
    .join('');
  const extras = extraAnswers(d);
  const body = [
    noteHtml,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rowsHtml(rows)}</table>`,
    extras.length
      ? `<div style="font-size:13px;font-weight:700;color:${MUTED};margin:20px 0 4px 0;">All form answers</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rowsHtml(extras)}</table>`
      : '',
    '<div style="margin:22px 0 0 0;">',
    button('VIEW & QUALIFY LEAD', leadUrl, true),
    phoneHref ? button(`Call ${displayPhone(d.phone!)}`, phoneHref, false) : '',
    '</div>',
  ].join('');
  const html = shell(
    'New lead — needs qualification',
    d.name,
    body,
    'Sent only to the HomeQuote team. No contractor has been emailed this lead. Qualify it in HomeQuote, then choose who receives it.'
  );
  const text = [
    'NEW LEAD — NEEDS QUALIFICATION',
    ...notes.map((n) => `! ${n}`),
    '',
    textRows(rows),
    ...(extras.length ? ['', 'All form answers', textRows(extras)] : []),
    '',
    `VIEW & QUALIFY LEAD: ${leadUrl}`,
    '',
    'Sent only to the HomeQuote team. No contractor has been emailed this lead.',
  ].join('\n');
  return { subject, text, html };
}

// ---- Qualified lead to recipients ------------------------------------------------

export function buildQualifiedLeadEmail(d: LeadEmailData, recipientName: string | null): BuiltEmail {
  const subject = oneLine(
    `Qualified ${industryWord(d.industry)} Lead — ${d.service || 'Project'} — ${subjectPlace(d)}`
  );
  const phoneHref = d.phone ? telHref(d.phone) : null;
  const rows: Row[] = [
    { label: 'Name', value: d.name },
    { label: 'Phone', value: d.phone ? displayPhone(d.phone) : null, href: phoneHref },
    { label: 'Email', value: d.email, href: d.email ? `mailto:${d.email}` : null },
    { label: 'Project Type', value: d.service },
    { label: 'City / ZIP', value: location(d) },
    { label: 'Timeline', value: d.timeline },
    ...(d.homeowner ? [{ label: 'Homeowner', value: d.homeowner }] : []),
    ...(d.budget ? [{ label: 'Budget', value: d.budget }] : []),
    { label: 'Appointment', value: appointmentLine(d.appointment) ?? 'Not booked yet' },
  ];
  const greeting = recipientName ? `Hi ${oneLine(recipientName, 60).split(' ')[0]},` : 'Hi,';
  const intro = 'HomeQuote has spoken with this homeowner and qualified the project. Please reach out promptly.';
  const extras = extraAnswers(d);
  const body = [
    `<p style="margin:0 0 6px 0;font-size:15px;">${escapeHtml(greeting)}</p>`,
    `<p style="margin:0 0 18px 0;font-size:15px;line-height:1.55;">${escapeHtml(intro)}</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rowsHtml(rows)}</table>`,
    d.qualificationNotes
      ? `<div style="font-size:13px;font-weight:700;color:${MUTED};margin:20px 0 6px 0;">Qualification notes</div><div style="background:#f3f6fa;border-radius:8px;padding:12px 14px;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(d.qualificationNotes)}</div>`
      : '',
    extras.length
      ? `<div style="font-size:13px;font-weight:700;color:${MUTED};margin:20px 0 4px 0;">Project details from the homeowner</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rowsHtml(extras)}</table>`
      : '',
    '<div style="margin:22px 0 0 0;">',
    phoneHref ? button(`Call ${displayPhone(d.phone!)}`, phoneHref, true) : '',
    d.email ? button('Email homeowner', `mailto:${d.email}`, !phoneHref) : '',
    '</div>',
  ].join('');
  const html = shell(
    'Qualified lead',
    `${d.service || 'Project'} — ${subjectPlace(d)}`,
    body,
    'Sent to you by HomeQuote Network. Homeowner details are shared for this project only — please don’t forward them.'
  );
  const text = [
    greeting,
    '',
    intro,
    '',
    textRows(rows),
    ...(d.qualificationNotes ? ['', 'Qualification notes:', d.qualificationNotes] : []),
    ...(extras.length ? ['', 'Project details from the homeowner', textRows(extras)] : []),
    '',
    '— HomeQuote Network',
  ].join('\n');
  return { subject, text, html };
}
