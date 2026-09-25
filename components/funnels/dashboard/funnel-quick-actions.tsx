'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setFunnelStatusAction, duplicateFunnelAction } from '@/lib/actions/funnel-builder';
import type { FunnelStatus } from '@/lib/funnels/builder';

/** Three-dot secondary-actions menu for a funnel card — keeps the card itself to Edit + Analytics. */
export function FunnelQuickActions({ id, slug, status, isDemo }: { id: string; slug: string; status: FunnelStatus; isDemo: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8" aria-label="More actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild><Link href={`/estimate/${slug}`} target="_blank">Preview</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`/app/funnels/${id}/analytics`}>Analytics</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => {
          e.preventDefault();
          void navigator.clipboard.writeText(`${location.origin}/estimate/${slug}`);
          setCopied(true); setTimeout(() => setCopied(false), 1500);
        }}>{copied ? 'Copied!' : 'Copy link'}</DropdownMenuItem>
        {!isDemo && <>
          <DropdownMenuSeparator />
          <form action={duplicateFunnelAction}>
            <input type="hidden" name="id" value={id} />
            <DropdownMenuItem asChild><button type="submit" className="w-full text-left">Duplicate</button></DropdownMenuItem>
          </form>
          {status !== 'published' && (
            <form action={setFunnelStatusAction}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="published" />
              <DropdownMenuItem asChild><button type="submit" className="w-full text-left">Publish</button></DropdownMenuItem>
            </form>
          )}
          {status === 'published' && (
            <form action={setFunnelStatusAction}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="draft" />
              <DropdownMenuItem asChild><button type="submit" className="w-full text-left">Unpublish</button></DropdownMenuItem>
            </form>
          )}
          {status !== 'archived' ? (
            <form action={setFunnelStatusAction} onSubmit={(e) => {
              if (!confirm('Archive this funnel? It stops accepting new visitors. Existing leads and reporting are kept, and it can be restored to draft anytime.')) e.preventDefault();
            }}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="archived" />
              <DropdownMenuItem asChild><button type="submit" className="w-full text-left text-destructive">Archive</button></DropdownMenuItem>
            </form>
          ) : (
            <form action={setFunnelStatusAction}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="draft" />
              <DropdownMenuItem asChild><button type="submit" className="w-full text-left">Restore to draft</button></DropdownMenuItem>
            </form>
          )}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
