'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createUser, inviteUser, type TeamState } from '@/lib/actions/team';
import { ROLE_LABELS } from '@/lib/nav';
import type { UserRole } from '@/lib/types';
import type { ContractorOption } from '@/lib/data/contractors';

export function UserForm({
  mode,
  contractors,
}: {
  mode: 'create' | 'invite';
  contractors: ContractorOption[];
}) {
  const action = mode === 'create' ? createUser : inviteUser;
  const [state, formAction, pending] = useActionState<TeamState, FormData>(
    action,
    undefined
  );
  const [role, setRole] = useState<UserRole>('setter');

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {(['admin', 'setter', 'contractor'] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>

        {role === 'contractor' && (
          <div className="space-y-1.5">
            <Label htmlFor="contractor_id">Contractor company</Label>
            <Select id="contractor_id" name="contractor_id" defaultValue="">
              <option value="" disabled>
                Select a company
              </option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="off"
              placeholder="At least 8 characters"
              required
            />
            <p className="text-xs text-muted-foreground">
              Share this with the user; they can change it after signing in.
            </p>
          </div>
        )}
      </div>

      {mode === 'create' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activate"
            defaultChecked
            className="size-4 accent-primary"
          />
          Activate immediately (they can sign in right away)
        </label>
      )}

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Working…'
            : mode === 'create'
              ? 'Create user'
              : 'Send invitation'}
        </Button>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}
