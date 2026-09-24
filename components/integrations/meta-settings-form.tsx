'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateMetaIntegration,
  type IntegrationState,
} from '@/lib/actions/integrations';
import type { Integration } from '@/lib/types';

export function MetaSettingsForm({ integration }: { integration: Integration }) {
  const [state, action, pending] = useActionState<IntegrationState, FormData>(
    updateMetaIntegration,
    undefined
  );
  const config = integration.config as Record<string, any>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={integration.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="verify_token">Webhook verify token</Label>
          <Input
            id="verify_token"
            name="verify_token"
            defaultValue={integration.secret ?? ''}
            placeholder="Choose any string; paste the same in Meta"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="page_id">Facebook Page ID</Label>
          <Input
            id="page_id"
            name="page_id"
            defaultValue={config?.page_id ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="page_access_token">Page access token</Label>
          <Input
            id="page_access_token"
            name="page_access_token"
            type="password"
            placeholder={
              config?.page_access_token ? '•••••••• (saved)' : 'Paste token'
            }
          />
          <p className="text-xs text-muted-foreground">
            Fetches lead field data via Graph API. Blank keeps the saved token.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app_secret">App secret</Label>
          <Input
            id="app_secret"
            name="app_secret"
            type="password"
            placeholder={config?.app_secret ? '•••••••• (saved)' : 'Meta app secret'}
          />
          <p className="text-xs text-muted-foreground">
            Verifies webhook signatures (required for live leads). Blank keeps the
            saved secret.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_enabled"
          defaultChecked={integration.is_enabled}
          className="size-4 accent-primary"
        />
        Enable this integration (accept incoming leads)
      </label>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-emerald-600">{state.success}</p>
        )}
      </div>
    </form>
  );
}
