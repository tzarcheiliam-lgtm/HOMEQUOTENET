import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { CREATIVE_AGENT, CREATIVE_TOOLS, agentSrc, embedSrc } from '@/content/creative-studio';
import type { StudioItem } from '@/components/creative-studio/studio-view';

/** Built-in entries first (in file order), then the ones an admin added on the page (oldest first). */
export async function getStudioItems(): Promise<{ tools: StudioItem[]; agents: StudioItem[] }> {
  const tools: StudioItem[] = CREATIVE_TOOLS.map((t) => ({ key: t.slug, title: t.title, kind: t.kind, description: t.description, src: embedSrc(t.embedId) }));
  const agents: StudioItem[] = CREATIVE_AGENT
    ? [{ key: 'builtin-agent', title: CREATIVE_AGENT.title, kind: 'Assistant', description: CREATIVE_AGENT.description, src: agentSrc(CREATIVE_AGENT.agentId) }]
    : [];
  const supabase = await createClient();
  const { data } = await supabase.from('creative_studio_embeds').select('id, title, kind, description, src, is_agent').order('created_at');
  for (const r of data ?? []) {
    const item: StudioItem = { key: r.id, title: r.title, kind: r.kind, description: r.description ?? '', src: r.src, removableId: r.id };
    (r.is_agent ? agents : tools).push(item);
  }
  return { tools, agents };
}
