'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LeadPicker, type PickedLead } from '@/components/signing/lead-picker';
import { createFromTemplateAction } from '@/lib/actions/signing';

export function UseTemplateForm({ templateId, defaultTitle, roles, companyId }: { templateId: string; defaultTitle: string; roles: string[]; companyId: string | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [people, setPeople] = useState(roles.map(() => ({ name: '', email: '' })));
  const [lead, setLead] = useState<PickedLead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = title.trim() && people.every((p) => p.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email.trim()));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await createFromTemplateAction(templateId, { title, leadId: lead?.id ?? null, recipients: people.map((p) => ({ name: p.name.trim(), email: p.email.trim() })) });
      if (!r.ok) return setError(r.error);
      router.push(`/app/documents/${r.versionId}`);
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Card><CardContent className="space-y-4 p-5">
        <div className="space-y-1.5"><Label htmlFor="title">Document title *</Label><Input id="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="space-y-3"><p className="text-sm font-medium">Who signs</p>
          {roles.map((role, i) => (
            <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2"><p className="text-xs font-medium text-muted-foreground sm:col-span-2">{i + 1}. {role}</p>
              <Input aria-label={`${role} full name`} placeholder="Full name" maxLength={200} value={people[i].name} onChange={(e) => setPeople((ps) => ps.map((p, k) => (k === i ? { ...p, name: e.target.value } : p)))} />
              <Input aria-label={`${role} email`} type="email" inputMode="email" placeholder="Email" maxLength={254} value={people[i].email} onChange={(e) => setPeople((ps) => ps.map((p, k) => (k === i ? { ...p, email: e.target.value } : p)))} /></div>))}
        </div>
        <LeadPicker contractorId={companyId} value={lead} onChange={setLead} />
      </CardContent></Card>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" size="lg" disabled={!ready || pending} className="max-lg:w-full">{pending ? <Loader2 className="size-4 animate-spin" /> : null} Create draft</Button>
      <p className="text-xs text-muted-foreground">The draft opens in the editor. You still review every page and confirm before anything is sent.</p>
    </form>
  );
}
