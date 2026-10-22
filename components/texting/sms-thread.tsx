import { setConversationOwner } from '@/lib/actions/sms';
import { Button } from '@/components/ui/button';
import { SMS_STATUS_LABELS } from '@/lib/sms/labels';

export interface ThreadMessage { id: string; direction: 'in' | 'out'; body: string; status: string; ai: boolean; created_at: string; error: string | null }
export interface ThreadConversation { id: string; status: string; mode: string | null; qualification: string; call_time_preference: string | null; summary: string | null; sender_name: string }

/** The text conversation with a lead, with take-over / hand-back controls. Server-rendered. */
export function SmsThread({ conversation, messages }: { conversation: ThreadConversation; messages: ThreadMessage[] }) {
  const person = conversation.status === 'paused' || conversation.status === 'handoff';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border px-2 py-0.5">{SMS_STATUS_LABELS[conversation.status] ?? conversation.status}</span>
        {conversation.mode && <span className="rounded-full border px-2 py-0.5">Prefers {conversation.mode}</span>}
        <span className="rounded-full border px-2 py-0.5">Qualification: {conversation.qualification}</span>
        {conversation.call_time_preference && <span className="rounded-full border px-2 py-0.5">Best time: {conversation.call_time_preference}</span>}
      </div>
      {conversation.summary && <p className="text-sm text-muted-foreground">{conversation.summary}</p>}
      <ol className="space-y-2">
        {messages.map((m) => (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.direction === 'out' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className="mt-1 text-[10px] opacity-70">
              {new Date(m.created_at).toLocaleString()} · {m.direction === 'out' ? (m.ai ? 'assistant' : 'automatic') : 'lead'}{m.direction === 'out' && m.status !== 'sent' ? ` · ${m.status}${m.error ? `: ${m.error}` : ''}` : ''}
            </p>
          </li>
        ))}
      </ol>
      {conversation.status !== 'opted_out' && (
        <form action={setConversationOwner}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input type="hidden" name="owner" value={person ? 'assistant' : 'person'} />
          <Button type="submit" size="sm" variant="outline">{person ? 'Hand back to the assistant' : 'Take over (stop the assistant)'}</Button>
        </form>
      )}
      <p className="text-xs text-muted-foreground">Replies you send yourself from the Messages app on the Mac are not tracked here.</p>
    </div>
  );
}
