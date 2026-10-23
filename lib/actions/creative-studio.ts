'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseEmbedCode } from '@/lib/creative-studio/embed';

export type AddEmbedState = { ok: true } | { ok: false; error: string } | undefined;

/** Admin: save a pasted embed code (stored as its https iframe src only). */
export async function addCreativeEmbed(_prev: AddEmbedState, formData: FormData): Promise<AddEmbedState> {
  const profile = await requireRole(['admin']);
  const parsed = parseEmbedCode(String(formData.get('code') ?? ''));
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const title = String(formData.get('title') ?? '').trim() || parsed.embed.suggestedTitle;
  const kind = String(formData.get('kind') ?? '').trim() || (parsed.embed.isAgent ? 'Assistant' : 'Video');
  const description = String(formData.get('description') ?? '').trim();
  if (title.length > 80) return { ok: false, error: 'The name is too long (80 characters max).' };
  if (kind.length > 40) return { ok: false, error: 'The type is too long (40 characters max).' };
  if (description.length > 600) return { ok: false, error: 'The description is too long (600 characters max).' };

  const db = createAdminClient();
  const { error } = await db.from('creative_studio_embeds').insert({
    title, kind, description: description || null, src: parsed.embed.src, is_agent: parsed.embed.isAgent, created_by: profile.id,
  });
  if (error) return { ok: false, error: 'The embed couldn’t be saved. Try again.' };
  revalidatePath('/app/creative-studio');
  return { ok: true };
}

/** Admin: remove an embed that was added on the page (the built-in ones live in content/creative-studio.ts). */
export async function removeCreativeEmbed(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient().from('creative_studio_embeds').delete().eq('id', id);
  revalidatePath('/app/creative-studio');
}
