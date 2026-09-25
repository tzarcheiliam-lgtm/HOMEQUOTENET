'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ESTIMATE_STATUSES, SALE_STATUSES } from '@/lib/outcomes/constants';
import {
  addEstimate,
  addSale,
  deleteEstimate,
  deleteSale,
  type OutcomeState,
} from '@/lib/actions/outcomes';
import type { Estimate, Sale } from '@/lib/types';

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `$${Number(n).toLocaleString()}`;

function EstimateForm({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState<OutcomeState, FormData>(
    addEstimate,
    undefined
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Input name="amount" type="number" step="0.01" placeholder="Amount" className="w-32" />
      <Input name="estimate_date" type="date" className="w-auto" />
      <Select name="status" className="h-9 w-auto" defaultValue="sent">
        {ESTIMATE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Add estimate'}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function SaleForm({
  assignmentId,
  isAdmin,
}: {
  assignmentId: string;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<OutcomeState, FormData>(
    addSale,
    undefined
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Input name="amount" type="number" step="0.01" placeholder="Sale amount" className="w-32" />
      <Input name="sale_date" type="date" className="w-auto" />
      <Input name="closed_at" type="date" className="w-auto" title="Closed date" />
      <Select name="sale_status" className="h-9 w-auto" defaultValue="won">
        {SALE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      {isAdmin && (
        <Input
          name="commission_amount"
          type="number"
          step="0.01"
          placeholder="Commission override"
          className="w-40"
          title="Leave blank to auto-calculate from the pricing agreement"
        />
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Record sale'}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function OutcomesSection({
  assignmentId,
  estimates,
  sales,
  isAdmin,
}: {
  assignmentId: string;
  estimates: Estimate[];
  sales: Sale[];
  isAdmin: boolean;
}) {
  return (
    <div className="mt-3 space-y-4 border-t pt-3">
      {/* Estimates */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Estimates
        </p>
        {estimates.length > 0 && (
          <ul className="mb-2 space-y-1">
            {estimates.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {money(e.amount)}
                  <span className="text-muted-foreground">
                    {' '}
                    · {e.estimate_date} ·{' '}
                    {ESTIMATE_STATUSES.find((s) => s.value === e.status)?.label ??
                      e.status}
                  </span>
                </span>
                {isAdmin && (
                  <form action={deleteEstimate}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <EstimateForm assignmentId={assignmentId} />
      </div>

      {/* Sales */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Sales
        </p>
        {sales.length > 0 && (
          <ul className="mb-2 space-y-1">
            {sales.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {money(s.amount)}{' '}
                  <Badge variant={s.sale_status === 'won' ? 'success' : 'muted'}>
                    {SALE_STATUSES.find((x) => x.value === s.sale_status)?.label ??
                      s.sale_status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {' '}
                    · {s.sale_date}
                    {isAdmin
                      ? ` · commission ${money(s.commission_amount)}${
                          s.commission_is_override ? ' (override)' : ''
                        }`
                      : ''}
                  </span>
                </span>
                {isAdmin && (
                  <form action={deleteSale}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <SaleForm assignmentId={assignmentId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
