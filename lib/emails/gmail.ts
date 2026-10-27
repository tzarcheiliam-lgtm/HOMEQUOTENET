import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverGmailWithAccessToken } from '@/lib/emails/gmail-message';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

/**
 * Gmail always sends as the Google account that granted access, whatever the
 * From header says. These extra scopes let the callback read which account that
 * was, so the app stores (and displays) the real sending address.
 */
export const GMAIL_IDENTITY_SCOPES = ['openid', 'email'];

/** Pre-selected in Google's account chooser for the shared automation sender. */
export const DEFAULT_AUTOMATION_EMAIL = 'info@homequotenet.com';

export type GmailSenderKind = 'automation' | 'user';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function encryptionKey(): Buffer {
  const raw = required('GMAIL_TOKEN_ENCRYPTION_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

export function encryptRefreshToken(token: string, key = encryptionKey()): string {
  return encryptToken(token, key);
}

export function decryptRefreshToken(value: string, key = encryptionKey()): string {
  return decryptToken(value, key);
}

export function gmailOAuthConfig() {
  return {
    clientId: required('GOOGLE_GMAIL_CLIENT_ID'),
    clientSecret: required('GOOGLE_GMAIL_CLIENT_SECRET'),
    redirectUri: required('GMAIL_OAUTH_REDIRECT_URI'),
    // Only a hint for the automation account chooser. Whichever account is
    // actually approved becomes the sender, so changing it never needs an env edit.
    automationHintEmail: process.env.GMAIL_AUTOMATION_EMAIL?.trim() || DEFAULT_AUTOMATION_EMAIL,
  };
}

export function gmailEnvironmentReady(): boolean {
  try {
    gmailOAuthConfig();
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export async function fetchAuthorizedEmail(
  accessToken: string,
  request: typeof fetch = fetch
): Promise<string | null> {
  const response = await request('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const json = (await response.json().catch(() => ({}))) as { email?: string };
  return json.email?.trim() || null;
}

type ConnectionRow = {
  id: string;
  kind: GmailSenderKind;
  email_address: string;
  encrypted_refresh_token: string;
};

/**
 * The connection a send should use: the member's own when they have one,
 * otherwise the shared automation sender. Automations pass no userId.
 */
async function loadConnection(
  admin: ReturnType<typeof createAdminClient>,
  userId?: string
): Promise<ConnectionRow | null> {
  const columns = 'id, kind, email_address, encrypted_refresh_token';
  if (userId) {
    const { data, error } = await admin
      .from('gmail_connections')
      .select(columns)
      .eq('kind', 'user')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as ConnectionRow;
  }
  const { data, error } = await admin
    .from('gmail_connections')
    .select(columns)
    .eq('kind', 'automation')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConnectionRow | null) ?? null;
}

/** Which address a send for this member would go out from, or null if none is connected. */
export async function resolveGmailSender(
  userId?: string
): Promise<{ kind: GmailSenderKind; email: string } | null> {
  const connection = await loadConnection(createAdminClient(), userId);
  return connection ? { kind: connection.kind, email: connection.email_address } : null;
}

export async function saveGmailConnection(input: {
  kind: GmailSenderKind;
  /** Required for kind 'user': the team member this sender belongs to. */
  userId?: string;
  refreshToken: string;
  scope: string;
  connectedBy: string;
  /** The Google account that actually granted access (read from Google by the caller). */
  authorizedEmail: string;
}) {
  if (!input.scope.split(/\s+/).includes(GMAIL_SEND_SCOPE)) {
    throw new Error('Google did not grant the Gmail send permission');
  }
  if (input.kind === 'user' && !input.userId) throw new Error('A team member is required for a personal sender');
  const admin = createAdminClient();
  const values = {
    email_address: input.authorizedEmail,
    encrypted_refresh_token: encryptRefreshToken(input.refreshToken),
    granted_scope: input.scope,
    connected_by: input.connectedBy,
    connected_at: new Date().toISOString(),
    last_error: null,
  };

  let existing = admin.from('gmail_connections').select('id').eq('kind', input.kind);
  if (input.kind === 'user') existing = existing.eq('user_id', input.userId!);
  const { data: row, error: lookupError } = await existing.maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const { error } = row
    ? await admin.from('gmail_connections').update(values).eq('id', row.id)
    : await admin
        .from('gmail_connections')
        .insert({ ...values, kind: input.kind, user_id: input.kind === 'user' ? input.userId : null });
  if (error) throw new Error(error.message);
}

export type GmailSenderStatus = { email: string; lastError: string | null } | null;

export async function getGmailConnectionStatus(userId?: string): Promise<{
  environmentReady: boolean;
  /** The shared sender used by automations and as the fallback. */
  automation: GmailSenderStatus;
  /** This team member's own sender, if they connected one. */
  mine: GmailSenderStatus;
  /** True when a manual send by this member can go out (own sender or the fallback). */
  canSend: boolean;
}> {
  const environmentReady = gmailEnvironmentReady();
  if (!environmentReady) return { environmentReady, automation: null, mine: null, canSend: false };
  const admin = createAdminClient();
  const { data } = await admin
    .from('gmail_connections')
    .select('kind, user_id, email_address, last_error');
  const rows = data ?? [];
  const toStatus = (row?: { email_address: string; last_error: string | null }): GmailSenderStatus =>
    row ? { email: row.email_address, lastError: row.last_error } : null;
  const automation = toStatus(rows.find((row) => row.kind === 'automation'));
  const mine = userId ? toStatus(rows.find((row) => row.kind === 'user' && row.user_id === userId)) : null;
  return { environmentReady, automation, mine, canSend: !!(mine || automation) };
}

export async function sendGmailMessage(
  input: {
    toEmail: string;
    subject: string;
    message: string;
    html: string;
    text?: string;
    replyTo?: string;
    /** Sender display name (e.g. "Sam Setter · HomeQuote Network"). */
    fromName?: string;
    attachments?: import('@/lib/emails/gmail-message').MailAttachment[];
    /** Send from this team member's own Gmail when connected; omit for automations. */
    senderUserId?: string;
  },
  request: typeof fetch = fetch
): Promise<{ id: string; fromEmail: string }> {
  const config = gmailOAuthConfig();
  const admin = createAdminClient();
  const { senderUserId, ...message } = input;
  const connection = await loadConnection(admin, senderUserId);
  if (!connection) throw new Error('HomeQuote Gmail is not connected');

  const tokenResponse = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: decryptRefreshToken(connection.encrypted_refresh_token),
      grant_type: 'refresh_token',
    }),
  });
  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenJson.access_token) {
    const detail = tokenJson.error_description || 'Google rejected the Gmail connection';
    await admin.from('gmail_connections').update({ last_error: detail }).eq('id', connection.id);
    throw new Error(connection.kind === 'user' ? `${detail}. Reconnect your Gmail on the Emails page.` : detail);
  }

  let delivered: { id: string };
  try {
    delivered = await deliverGmailWithAccessToken(
      tokenJson.access_token,
      { fromEmail: connection.email_address, ...message },
      request
    );
  } catch (error) {
    const detail = (error as Error).message;
    await admin.from('gmail_connections').update({ last_error: detail }).eq('id', connection.id);
    throw new Error(detail);
  }
  await admin
    .from('gmail_connections')
    .update({ last_used_at: new Date().toISOString(), last_error: null })
    .eq('id', connection.id);
  return { id: delivered.id, fromEmail: connection.email_address };
}
