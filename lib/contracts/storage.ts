import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/** Private bucket for logos (normalized PNG) and PDF exhibits. Server access only; the browser gets short-lived signed URLs. */
export const CONTRACT_ASSETS_BUCKET = 'contract-assets';

export async function putAsset(path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await createAdminClient().storage.from(CONTRACT_ASSETS_BUCKET).upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' });
  if (error) throw new Error('The file could not be stored.');
}
export async function getAsset(path: string): Promise<Uint8Array | null> {
  const { data, error } = await createAdminClient().storage.from(CONTRACT_ASSETS_BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
export async function removeAsset(path: string | null | undefined) {
  if (!path) return;
  await createAdminClient().storage.from(CONTRACT_ASSETS_BUCKET).remove([path]).catch(() => undefined);
}
export async function assetUrl(path: string | null | undefined, seconds = 3600): Promise<string | null> {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from(CONTRACT_ASSETS_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
