'use client';

import { useState, useTransition } from 'react';
import { sendTestEmailTemplate } from '@/lib/actions/email-templates';
import { Button } from '@/components/ui/button';

export function SendTestButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const state = await sendTestEmailTemplate(templateId);
            setResult(state?.ok ? state.message : state?.error ?? 'Something went wrong');
          })
        }
      >
        {pending ? 'Sending…' : 'Send test to myself'}
      </Button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  );
}
