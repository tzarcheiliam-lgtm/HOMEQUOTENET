import { buildProspectEmailText } from '@/lib/emails/template';

function encodedHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

/** A file attached to the message, e.g. a calendar invite. */
export interface MailAttachment {
  filename: string;
  /** e.g. 'text/calendar; method=PUBLISH' */
  contentType: string;
  content: string;
}

/** Plain ASCII names go in as-is; anything else is RFC 2047 encoded. */
function displayName(name: string): string {
  return /^[\x20-\x7e]+$/.test(name) ? name : encodedHeader(name);
}

/** Display name for the From header; letters, digits, spaces and · & ' . - only. */
function fromName(name: string | undefined): string {
  const safe = (name ?? '').replace(/[^\p{L}\p{N} ·&'.-]/gu, '').trim().slice(0, 80);
  return safe || 'HomeQuote Network';
}

export function buildRawGmailMessage(input: {
  fromEmail: string;
  /** Shown as the sender's name; defaults to "HomeQuote Network". */
  fromName?: string;
  toEmail: string;
  subject: string;
  message: string;
  html: string;
  /** Plain-text part as-is. Without it, `message` gets the prospect-email signature. */
  text?: string;
  /** Optional Reply-To (must be a plain address; CR/LF are rejected). */
  replyTo?: string;
  attachments?: MailAttachment[];
}): string {
  const boundary = 'hqn-prospect-email-boundary';
  const mixed = 'hqn-prospect-email-mixed';
  const attachments = (input.attachments ?? []).filter((a) => /^[\w.-]{1,80}$/.test(a.filename) && !/[\r\n]/.test(a.contentType));
  const lines = [
    `From: ${displayName(fromName(input.fromName))} <${input.fromEmail}>`,
    `To: ${input.toEmail}`,
    ...(input.replyTo && /^[^\s<>@,;]+@[^\s<>@,;]+$/.test(input.replyTo) ? [`Reply-To: ${input.replyTo}`] : []),
    `Subject: ${encodedHeader(input.subject)}`,
    'MIME-Version: 1.0',
    ...(attachments.length
      ? [`Content-Type: multipart/mixed; boundary="${mixed}"`, '', `--${mixed}`]
      : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    (input.text ?? buildProspectEmailText(input.message)).replace(/\r?\n/g, '\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html,
    '',
    `--${boundary}--`,
    ...attachments.flatMap((a) => [
      '',
      `--${mixed}`,
      `Content-Type: ${a.contentType}; name="${a.filename}"`,
      `Content-Disposition: attachment; filename="${a.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      ...(Buffer.from(a.content, 'utf8').toString('base64').match(/.{1,76}/g) ?? []),
    ]),
    ...(attachments.length ? ['', `--${mixed}--`] : []),
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

export async function deliverGmailWithAccessToken(
  accessToken: string,
  input: {
    fromEmail: string;
    fromName?: string;
    toEmail: string;
    subject: string;
    message: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: MailAttachment[];
  },
  request: typeof fetch = fetch
): Promise<{ id: string }> {
  const response = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: buildRawGmailMessage(input) }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !json.id) {
    throw new Error(json.error?.message || 'Gmail did not accept the message');
  }
  return { id: json.id };
}
