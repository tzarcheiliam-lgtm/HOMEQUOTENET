function encodedHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

export function buildRawGmailMessage(input: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  message: string;
}): string {
  const lines = [
    `From: HomeQuote Network <${input.fromEmail}>`,
    `To: ${input.toEmail}`,
    `Subject: ${encodedHeader(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.message,
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

export async function deliverGmailWithAccessToken(
  accessToken: string,
  input: { fromEmail: string; toEmail: string; subject: string; message: string },
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
