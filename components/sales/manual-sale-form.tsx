'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { addManualSale } from '@/lib/actions/outcomes';
import type { ContractorOption } from '@/lib/data/contractors';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ManualSaleForm({ contractors }: { contractors: ContractorOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addManualSale, undefined);
  const handled = useRef(state);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state !== handled.current && state?.success) setOpen(false);
    handled.current = state;
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Add sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add a sale</DialogTitle>
        <DialogDescription>Record a sale that did not come through a lead assignment.</DialogDescription>
        <form action={action} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-amount">Sale amount ($)</Label>
              <Input id="ms-amount" name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-date">Sale date</Label>
              <Input id="ms-date" name="sale_date" type="date" defaultValue={today} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-customer">Customer name</Label>
            <Input id="ms-customer" name="customer_name" maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-contractor">Contractor (optional)</Label>
            <Select id="ms-contractor" name="contractor_id" defaultValue="">
              <option value="">None</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-vertical">Vertical (optional)</Label>
              <Input id="ms-vertical" name="vertical_label" maxLength={80} placeholder="e.g. Pool Installation" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-source">Source (optional)</Label>
              <Input id="ms-source" name="source_label" maxLength={80} placeholder="e.g. Referral" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-commission">Commission ($, optional)</Label>
              <Input id="ms-commission" name="commission_amount" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-status">Status</Label>
              <Select id="ms-status" name="sale_status" defaultValue="won">
                <option value="won">Won</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-notes">Notes (optional)</Label>
            <Textarea id="ms-notes" name="notes" maxLength={2000} />
          </div>
          {state?.error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save sale'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
