'use client';

import { useActionState, useEffect, useState } from 'react';
import { CircleCheck, LoaderCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addCreativeEmbed, type AddEmbedState } from '@/lib/actions/creative-studio';

/** Admin: paste an embed code, name it, and it appears on the page right away. */
export function AddEmbedDialog({ kinds }: { kinds: string[] }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0); // a fresh form each time it opens
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setSession((n) => n + 1); }}>
      <DialogTrigger asChild>
        <Button><Plus aria-hidden className="size-4" /> Add embed</Button>
      </DialogTrigger>
      <DialogContent>
        <EmbedForm key={session} kinds={kinds} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EmbedForm({ kinds, onDone }: { kinds: string[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<AddEmbedState, FormData>(addCreativeEmbed, undefined);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <div>
        <DialogTitle>Add embed</DialogTitle>
        <DialogDescription>Paste the embed code (or just its link), give it a name, and it shows up on this page.</DialogDescription>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ce-code">Embed code</Label>
        <Textarea id="ce-code" name="code" required rows={5} placeholder={'<iframe src="https://muapi.ai/embed/…"></iframe>'} className="font-mono text-xs" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ce-title">Name</Label>
          <Input id="ce-title" name="title" maxLength={80} placeholder="e.g. Kling 3 Image to Video" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-kind">Type</Label>
          <Input id="ce-kind" name="kind" maxLength={40} list="ce-kinds" placeholder="Video, Image, Image to Video…" />
          <datalist id="ce-kinds">{kinds.map((k) => <option key={k} value={k} />)}</datalist>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ce-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="ce-desc" name="description" rows={2} maxLength={600} />
      </div>
      <p className="text-xs text-muted-foreground">Assistant embeds (links with /embed/agent/) are placed at the top of the page automatically.</p>
      {state && !state.ok && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CircleCheck className="size-4" /> Added.</p>}
      <div className="flex justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={pending}>{pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Plus aria-hidden className="size-4" />} Add</Button>
      </div>
    </form>
  );
}
