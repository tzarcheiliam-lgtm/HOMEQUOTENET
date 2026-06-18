'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  simulateMetaLead,
  type IntegrationState,
} from '@/lib/actions/integrations';

// Sends a synthetic Meta lead through the real intake pipeline — no ad spend.
export function SimulateLeadForm({
  integrationId,
}: {
  integrationId: string;
}) {
  const [state, action, pending] = useActionState<IntegrationState, FormData>(
    simulateMetaLead,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="integration_id" value={integrationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue="Test Lead" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="platform">Platform</Label>
          <Select id="platform" name="platform" defaultValue="facebook">
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="lead@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="(555) 010-0000" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign">Campaign</Label>
          <Input id="campaign" name="campaign" placeholder="Spring Fencing" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ad_set">Ad set</Label>
          <Input id="ad_set" name="ad_set" />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send test lead'}
        </Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-emerald-600">{state.success}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: send the same email or phone twice to verify duplicate detection.
      </p>
    </form>
  );
}
