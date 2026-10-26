import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { buildBrandedEmailHtml, buildBrandedEmailText, emailLogoUrl } from '@/lib/emails/template';
import { publicSiteUrl } from './site-url';

/** HomeQuote's own reset page. The token is only spent when the person clicks the button there. */
export function resetPageUrl(tokenHash: string, base = publicSiteUrl()): string {
  return `${base}/reset-password?token_hash=${encodeURIComponent(tokenHash)}`;
}

export function buildResetEmail(link: string, base = publicSiteUrl()) {
  const paragraphs = [
    'We received a request to reset the password on your HomeQuote Network account.',
    'Click the button below to choose a new password. The link works once and expires in one hour.',
    'If you did not ask for this, you can ignore this email — your password will not change.',
  ];
  const html = buildBrandedEmailHtml(paragraphs, {
    logoUrl: emailLogoUrl(base),
    ctaText: 'Reset my password',
    ctaUrl: link,
    footerNote: 'Secure account email from HomeQuote Network',
  });
  const text = `${buildBrandedEmailText(paragraphs, { footerNote: 'homequotenet.com' })}\n\nReset my password: ${link}`;
  return { subject: 'Reset your HomeQuote Network password', html, text };
}

/**
 * Send a password-reset email from HomeQuote itself (our Gmail sender, our
 * domain, our /reset-password page). Never throws and never reveals whether the
 * address has an account. If our sender is not connected, it falls back to the
 * Supabase email, still pointed at the real site URL (never localhost).
 */
export async function sendPasswordReset(email: string): Promise<'sent' | 'fallback' | 'skipped'> {
  const base = publicSiteUrl();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return 'skipped'; // unknown email: silently nothing
    const mail = buildResetEmail(resetPageUrl(tokenHash, base), base);
    await sendGmailMessage({ toEmail: email, subject: mail.subject, message: mail.text, html: mail.html, text: mail.text });
    return 'sent';
  } catch (e) {
    console.error('[password-reset] HomeQuote email failed, using fallback:', e instanceof Error ? e.message : e);
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${base}/auth/callback?next=/set-password` });
      return 'fallback';
    } catch {
      return 'skipped';
    }
  }
}
