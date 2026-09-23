import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverGmailWithAccessToken } from '@/lib/emails/gmail-message';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const CONNECTION_ID = true;

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
    fromEmail: required('GMAIL_FROM_EMAIL'),
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

export async function saveGmailConnection(input: {
  refreshToken: string;
  scope: string;
  connectedBy: string;
}) {
  if (!input.scope.split(/\s+/).includes(GMAIL_SEND_SCOPE)) {
    throw new Error('Google did not grant the Gmail send permission');
  }
  const { fromEmail } = gmailOAuthConfig();
  const admin = createAdminClient();
  const { error } = await admin.from('gmail_connections').upsert({
    id: CONNECTION_ID,
    email_address: fromEmail,
    encrypted_refresh_token: encryptRefreshToken(input.refreshToken),
    granted_scope: input.scope,
    connected_by: input.connectedBy,
    connected_at: new Date().toISOString(),
    last_error: null,
  });
  if (error) throw new Error(error.message);
}

export async function getGmailConnectionStatus(): Promise<{
  connected: boolean;
  environmentReady: boolean;
  email: string | null;
  lastError: string | null;
}> {
  const environmentReady = gmailEnvironmentReady();
  if (!environmentReady) return { connected: false, environmentReady, email: null, lastError: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from('gmail_connections')
    .select('email_address, last_error')
    .eq('id', CONNECTION_ID)
    .maybeSingle();
  return {
    connected: !!data,
    environmentReady,
    email: data?.email_address ?? null,
    lastError: data?.last_error ?? null,
  };
}

export async function sendGmailMessage(
  input: { toEmail: string; subject: string; message: string },
  request: typeof fetch = fetch
): Promise<{ id: string; fromEmail: string }> {
  const config = gmailOAuthConfig();
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from('gmail_connections')
    .select('encrypted_refresh_token')
    .eq('id', CONNECTION_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
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
    const message = tokenJson.error_description || 'Google rejected the Gmail connection';
    await admin.from('gmail_connections').update({ last_error: message }).eq('id', CONNECTION_ID);
    throw new Error(message);
  }

  let delivered: { id: string };
  try {
    delivered = await deliverGmailWithAccessToken(
      tokenJson.access_token,
      { fromEmail: config.fromEmail, ...input },
      request
    );
  } catch (error) {
    const message = (error as Error).message;
    await admin.from('gmail_connections').update({ last_error: message }).eq('id', CONNECTION_ID);
    throw new Error(message);
  }
  await admin
    .from('gmail_connections')
    .update({ last_used_at: new Date().toISOString(), last_error: null })
    .eq('id', CONNECTION_ID);
  return { id: delivered.id, fromEmail: config.fromEmail };
}
