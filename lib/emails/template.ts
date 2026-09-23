export const MORE_INFO_TEMPLATE_KEY = 'more_info_after_call' as const;
export const EMAIL_LOGO_PATH = '/images/email/homequote-logo-transparent.png';

export interface EmailTemplateProspect {
  company_name: string;
}

function clean(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function servicePhrase(services: string[]): string | null {
  const values = Array.from(new Set(services.map(clean).filter(Boolean))).slice(0, 5);
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

export function emailLogoUrl(siteUrl: string): string {
  return new URL(EMAIL_LOGO_PATH, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}

export function buildMoreInfoAfterCallEmail(
  prospect: EmailTemplateProspect,
  contactName: string,
  discussedServices: string[]
): { subject: string; message: string } {
  const company = clean(prospect.company_name);
  const firstName = clean(contactName).split(' ')[0] || '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const services = servicePhrase(discussedServices);

  return {
    subject: `Following up after our call${company ? ` — ${company}` : ''}`,
    message: [
      greeting,
      '',
      `Thanks again for taking my call. I wanted to follow up with a little more detail on how HomeQuote Network could work with ${company}.`,
      '',
      'We speak directly with homeowners about their pool projects, qualify the project by confirming the details and fit, and then book a specific day and time for the contractor to meet with the homeowner.',
      ...(services
        ? [
            '',
            `Based on our conversation, we would focus on homeowners looking for ${services}.`,
          ]
        : []),
      '',
      'If that sounds worth exploring, would you be open to a 15-minute call with Liam?',
      '',
      'You can also book an appointment with Liam and see our results at https://homequotenet.com/.',
    ].join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function messageHtml(message: string): string {
  return message
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const content = escapeHtml(paragraph)
        .replace(
          /https:\/\/homequotenet\.com\/?/gi,
          '<a href="https://homequotenet.com/" style="color:#1267a8;text-decoration:underline;">homequotenet.com</a>'
        )
        .replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px 0;">${content}</p>`;
    })
    .join('');
}

/** Gmail-safe, inline-styled HTML used verbatim by both preview and delivery. */
export function buildProspectEmailHtml(message: string, logoUrl: string): string {
  const safeLogoUrl = escapeHtml(logoUrl);
  return [
    '<div style="margin:0;padding:0;background:#ffffff;color:#243447;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">',
    '<div style="max-width:600px;margin:0;padding:4px 0;">',
    messageHtml(message),
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #d9e5f2;padding-top:16px;border-collapse:separate;">',
    '<tr>',
    `<td style="padding:0 14px 0 0;vertical-align:middle;"><img src="${safeLogoUrl}" width="72" height="72" alt="HomeQuote Network" style="display:block;width:72px;height:72px;border:0;outline:none;text-decoration:none;"></td>`,
    '<td style="padding:0;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;line-height:1.4;">',
    '<div style="font-size:16px;font-weight:700;color:#082f63;">Liam</div>',
    '<div style="font-size:14px;font-weight:700;color:#1267a8;">HomeQuote Network</div>',
    '<div style="font-size:13px;color:#65758b;">Homeowner qualification &amp; pool project appointments</div>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
    '</div>',
  ].join('');
}

export function buildProspectEmailText(message: string): string {
  return `${message.trim()}\n\nBest,\nLiam\nHomeQuote Network`;
}
