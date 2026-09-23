export const MORE_INFO_TEMPLATE_KEY = 'more_info_after_call' as const;

export interface EmailTemplateProspect {
  company_name: string;
  primary_services: string[];
}

function clean(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function servicePhrase(services: string[]): string {
  const values = services.map(clean).filter(Boolean).slice(0, 3);
  if (values.length === 0) return 'pool projects';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values[0]}, ${values[1]}, and ${values[2]}`;
}

export function buildMoreInfoAfterCallEmail(
  prospect: EmailTemplateProspect,
  contactName: string,
  senderName: string | null
): { subject: string; message: string } {
  const company = clean(prospect.company_name);
  const firstName = clean(contactName).split(' ')[0] || '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const signatureName = clean(senderName ?? '').split(' ')[0];
  const signature = signatureName
    ? `Best,\n${signatureName}\nHomeQuote Network`
    : 'Best,\nHomeQuote Network';

  return {
    subject: `Following up after our call${company ? ` — ${company}` : ''}`,
    message: [
      greeting,
      '',
      `Thanks again for taking the time to speak with me${company ? ` about ${company}` : ''}.`,
      '',
      `HomeQuote Network calls and qualifies homeowners looking for ${servicePhrase(prospect.primary_services)}, then books pool project appointments directly on the contractor’s calendar.`,
      '',
      'The offer is $125 per booked appointment, with no upfront payment for a batch of leads.',
      '',
      `Would you be open to a 15-minute call to see whether this could be a fit${company ? ` for ${company}` : ''}?`,
      '',
      signature,
    ].join('\n'),
  };
}
