'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { createContractAction, createTemplateAction } from '@/lib/actions/contracts';

/** Starts an agreement from a published template (optionally for a known client) and opens the wizard. */
export function UseTemplateButton({ templateId, contractorId, label = 'Use template', variant = 'default', size = 'sm', disabled }: { templateId: string; contractorId?: string | null; label?: string; variant?: 'default' | 'outline'; size?: 'sm' | 'default'; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size={size} variant={variant} disabled={pending || disabled} onClick={() => start(async () => {
      const r = await createContractAction({ templateId, contractorId: contractorId ?? null });
      if (!r.ok) return toast(r.error, 'error');
      router.push(`/app/contracts/${r.id}/edit`);
    })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />} {label}
    </Button>
  );
}

export function NewTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return toast('Give the template a name.', 'error');
      start(async () => {
        const r = await createTemplateAction({ name });
        if (!r.ok) return toast(r.error, 'error');
        router.push(`/app/contracts/templates/${r.id}`);
      });
    }}>
      <label className="sr-only" htmlFor="new-template-name">New template name</label>
      <Input id="new-template-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New template name" maxLength={120} className="w-full sm:w-64" />
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create template</Button>
    </form>
  );
}
