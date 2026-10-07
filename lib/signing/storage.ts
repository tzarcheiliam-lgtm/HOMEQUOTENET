import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGNING_BUCKET } from '@/lib/signing/constants';
import { SigningError } from '@/lib/signing/errors';
import { sha256Hex } from '@/lib/signing/pdf-validate';

export async function downloadObject(path: string): Promise<Uint8Array> {
  const { data, error } = await createAdminClient().storage.from(SIGNING_BUCKET).download(path);
  if (error || !data) throw new SigningError('storage', 'The stored file could not be read.');
  return new Uint8Array(await data.arrayBuffer());
}

/** Reads a file and refuses it if its hash differs from the recorded one (integrity check). */
export async function downloadVerified(path: string, expectedSha256: string): Promise<Uint8Array> {
  const bytes = await downloadObject(path);
  if (sha256Hex(bytes) !== expectedSha256) {
    throw new SigningError('integrity', 'The stored file does not match its recorded fingerprint, so it was not released.');
  }
  return bytes;
}

export async function uploadObject(path: string, bytes: Uint8Array, upsert = false) {
  const { error } = await createAdminClient().storage.from(SIGNING_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert, cacheControl: '0' });
  if (error) throw new SigningError('storage', 'The file could not be stored.');
}

export async function signedUrl(path: string, seconds = 120, downloadName?: string): Promise<string> {
  const { data, error } = await createAdminClient().storage.from(SIGNING_BUCKET).createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) throw new SigningError('storage', 'Could not create a download link.');
  return data.signedUrl;
}

export async function removeObject(path: string) {
  await createAdminClient().storage.from(SIGNING_BUCKET).remove([path]).catch(() => undefined);
}
