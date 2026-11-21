import { MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsThread, type ThreadConversation, type ThreadMessage } from './sms-thread';

/** Admin-only: the automatic text conversation with this lead, if one exists. */
export async function SmsPanel({ leadId, className }: { leadId: string; className?: string }) {
  const db = await createClient();
  const { data: c } = await db.from('sms_conversations').select('id,status,mode,qualification,call_time_preference,summary,sender_name').eq('lead_id', leadId).maybeSingle();
  if (!c) return null;
  // attachment_path arrives with migration 0078; before it, read the thread without it.
  const thread = (cols: string) => db.from('sms_messages').select(cols).eq('conversation_id', c.id).order('created_at', { ascending: true }).limit(100);
  const full = await thread('id,direction,body,status,ai,created_at,error,attachment_path');
  const { data: msgs } = full.error ? await thread('id,direction,body,status,ai,created_at,error') : full;
  return (
    <Card id="texts" className={`scroll-mt-20 ${className ?? ''}`}>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-4" /> Text conversation</CardTitle></CardHeader>
      <CardContent><SmsThread conversation={c as ThreadConversation} messages={(msgs ?? []) as unknown as ThreadMessage[]} /></CardContent>
    </Card>
  );
}
