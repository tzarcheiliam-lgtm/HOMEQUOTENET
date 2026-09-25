'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { setFunnelStatusAction, duplicateFunnelAction } from '@/lib/actions/funnel-builder';
import type { FunnelStatus } from '@/lib/funnels/builder';

export function FunnelStatusActions({ id, slug, status }: { id: string; slug: string; status: FunnelStatus }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={() => {
        void navigator.clipboard.writeText(`${location.origin}/estimate/${slug}`);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      }}>{copied ? 'Copied!' : 'Copy link'}</Button>
      <form action={duplicateFunnelAction}><input type="hidden" name="id" value={id} /><Button size="sm" variant="outline" type="submit">Duplicate</Button></form>
      {status !== 'published' && (
        <form action={setFunnelStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="published" />
          <Button size="sm" type="submit">Publish</Button></form>
      )}
      {status === 'published' && (
        <form action={setFunnelStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="draft" />
          <Button size="sm" variant="outline" type="submit">Unpublish</Button></form>
      )}
      {status !== 'archived' && (
        <ConfirmAction action={setFunnelStatusAction} fields={{ id, status: 'archived' }} triggerLabel="Archive" triggerVariant="outline"
          title="Archive this funnel?" description="It stops accepting new visitors. Existing leads and reporting are kept, and it can be restored to draft anytime." confirmLabel="Archive" />
      )}
      {status === 'archived' && (
        <form action={setFunnelStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="draft" />
          <Button size="sm" variant="outline" type="submit">Restore to draft</Button></form>
      )}
    </div>
  );
}
