import { redirect } from 'next/navigation';
import { requireCallWorkspace } from '@/lib/auth';
import { nextProspectIdFor } from '@/lib/data/prospects';

export const metadata = { title: 'Power hour · HomeQuote Network' };

// No prospect has this id, so nothing is excluded from the queue.
const NONE = '00000000-0000-0000-0000-000000000000';

/**
 * Power hour starts here: straight to the first prospect due in My list
 * (due callbacks first, then fewest attempts). Save-and-next carries the
 * caller on from there; the HUD keeps the session clock.
 */
export default async function DialPage() {
  const me = await requireCallWorkspace();
  const id = await nextProspectIdFor(me, NONE);
  redirect(id ? `/app/calls/${id}` : '/app/calls?view=mine&done=1');
}
