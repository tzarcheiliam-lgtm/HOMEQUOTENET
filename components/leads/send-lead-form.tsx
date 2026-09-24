'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sendLeadToRecipients, type DistributionState } from '@/lib/actions/lead-distribution';

export interface SendRecipientOption {
  id: string;
  name: string;
  company: string | null;
  kind: 'team_member' | 'contractor';
  /** When this person last received this lead, if ever. */
  lastSentAt: string | null;
}

const GROUPS: { kind: SendRecipientOption['kind']; label: string }[] = [
  { kind: 'contractor', label: 'Contractors' },
  { kind: 'team_member', label: 'HomeQuote team' },
];

export function SendLeadForm({
  leadId,
  recipients,
  canSend,
}: {
  leadId: string;
  recipients: SendRecipientOption[];
  canSend: boolean;
}) {
  const [state, formAction, pending] = useActionState<DistributionState, FormData>(
    sendLeadToRecipients,
    undefined
  );
  const [resend, setResend] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anySent = recipients.some((r) => r.lastSentAt);
  // Already-sent people are locked until "Send again" is on, and don't count.
  const count = recipients.filter((r) => selected.has(r.id) && !(r.lastSentAt && !resend)).length;

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active recipients yet.{' '}
        <Link href="/app/lead-recipients" className="font-medium text-foreground underline underline-offset-4">
          Add the people leads can be sent to
        </Link>
        .
      </p>
    );
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <fieldset disabled={!canSend || pending} className="space-y-4 disabled:opacity-60">
        {GROUPS.map((group) => {
          const list = recipients.filter((r) => r.kind === group.kind);
          if (list.length === 0) return null;
          return (
            <div key={group.kind} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{group.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((r) => {
                  const locked = !!r.lastSentAt && !resend;
                  return (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:disabled]:cursor-not-allowed"
                    >
                      <input
                        type="checkbox"
                        name="recipient_ids"
                        value={r.id}
                        disabled={locked}
                        checked={selected.has(r.id) && !locked}
                        onChange={() => toggle(r.id)}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{r.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.company || (r.kind === 'team_member' ? 'HomeQuote' : 'Contractor')}
                        </span>
                        {r.lastSentAt && (
                          <Badge variant="muted" className="mt-1">
                            Sent {new Date(r.lastSentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Badge>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {anySent && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="resend"
              checked={resend}
              onChange={(e) => setResend(e.target.checked)}
              className="size-4 accent-primary"
            />
            Send again to people who already received this lead
          </label>
        )}
        <Button type="submit" disabled={!canSend || pending || count === 0}>
          <Send className="size-4" />
          {pending ? 'Sending…' : count > 1 ? `Send lead to ${count} people` : 'Send lead'}
        </Button>
      </fieldset>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">
          {state.message}
          {state.warning ? <span className="block text-muted-foreground">{state.warning}</span> : null}
        </p>
      )}
    </form>
  );
}
