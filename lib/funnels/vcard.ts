import type { FunnelConfig } from './schema';

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** E.164-style US number for the vCard TEL field, or null when it isn't a valid US number. */
export function vcardPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national) ? `+1${national}` : null;
}

/**
 * A vCard 3.0 for the funnel's "Save to contacts" button, so the homeowner has the
 * business saved (and recognises the caller). Null when the funnel has no usable phone.
 */
export function buildContactVCard(config: Pick<FunnelConfig, 'clientName' | 'industry' | 'contactCard'>): string | null {
  const card = config.contactCard;
  const tel = card?.phone ? vcardPhone(card.phone) : null;
  if (!card || !tel) return null;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(config.clientName)}`, `N:${esc(config.clientName)};;;;`, `ORG:${esc(config.clientName)}`, `TEL;TYPE=WORK,VOICE:${tel}`];
  if (card.email) lines.push(`EMAIL;TYPE=WORK:${esc(card.email)}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (config.industry) lines.push(`NOTE:${esc(`${config.industry} – expect a call about your estimate request.`)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

export const vcardFileName = (clientName: string) => `${clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'contact'}.vcf`;
