import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { nextLeadToCall } from '@/lib/data/leads';

export const metadata = { title: 'Next lead · HomeQuote Network' };

/** "Next lead" from the setter HUD: the least recently contacted open lead. */
export default async function NextLeadPage() {
  await requireRole(['admin', 'setter']);
  const id = await nextLeadToCall();
  redirect(id ? `/app/leads/${id}` : '/app/leads?done=1');
}
