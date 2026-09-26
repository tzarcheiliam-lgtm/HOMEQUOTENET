/**
 * Email to the contractor when an admin sets the price on their request.
 * Pure builder (no I/O). Sent only when an admin clicks "Send price".
 */
import { escapeHtml, oneLine, type BuiltEmail } from '@/lib/leads/lead-emails';
import { formatQuote, type Quote } from '@/lib/billing/pricing';

export function buildPriceReadyEmail(
  d: { firstName: string | null; serviceName: string; quote: Quote },
  payUrl: string,
): BuiltEmail {
  const service = oneLine(d.serviceName, 120);
  const price = formatQuote(d.quote);
  const greeting = d.firstName ? `Hi ${oneLine(d.firstName, 60)},` : 'Hi,';
  const terms =
    d.quote.price_interval === 'month'
      ? 'Monthly services renew each month until you cancel. You can manage or cancel billing from the portal.'
      : 'This is a one-time payment.';
  const lines = [
    greeting,
    '',
    `Your price for ${service} is ready: ${price}.`,
    ...(d.quote.price_description ? ['', d.quote.price_description] : []),
    '',
    `Review and pay securely in your HomeQuote portal: ${payUrl}`,
    '',
    terms,
    '',
    'Questions? Just reply to this email.',
    '',
    'The HomeQuote team',
  ];
  const text = lines.join('\n');
  const html = `<div style="font-family:Arial,sans-serif;color:#243447;font-size:15px;line-height:1.5">
<p>${escapeHtml(greeting)}</p>
<p>Your price for <strong>${escapeHtml(service)}</strong> is ready:</p>
<p style="font-size:22px;font-weight:bold;margin:8px 0">${escapeHtml(price)}</p>
${d.quote.price_description ? `<p style="color:#65758b">${escapeHtml(d.quote.price_description)}</p>` : ''}
<p><a href="${escapeHtml(payUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Review &amp; pay</a></p>
<p style="color:#65758b;font-size:13px">${escapeHtml(terms)}</p>
<p>Questions? Just reply to this email.<br>The HomeQuote team</p>
</div>`;
  return { subject: `Your HomeQuote price for ${service}`, text, html };
}
