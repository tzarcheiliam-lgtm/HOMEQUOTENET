import type { ActionPreview, SelectCard } from '@/lib/assistant/tools';
import type { UiBlock } from '@/lib/assistant/tools';

export type { ActionPreview, SelectCard, UiBlock };

export interface ActionView {
  id: string;
  kind: string;
  status: 'proposed' | 'executing' | 'executed' | 'failed' | 'cancelled';
  preview: ActionPreview;
  result?: { href: string; label: string; message: string } | null;
  error?: string | null;
}

export interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status: 'streaming' | 'complete' | 'cancelled' | 'error';
  blocks: UiBlock[];
  actions: ActionView[];
  working?: string;
  error?: { code: string; message: string; retryText?: string; retryClientId?: string };
  clientId?: string;
}

export type ChatEvent =
  | { type: 'meta'; conversationId: string; context: { type: 'lead'; id: string; label: string } | null }
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; status: 'running' | 'done' }
  | { type: 'action'; action: { id: string; kind: string; status: string; preview: ActionPreview } }
  | { type: 'block'; block: UiBlock }
  | { type: 'done'; messageId: string | null; cancelled?: boolean; truncated?: boolean }
  | { type: 'error'; code: string; message: string };
