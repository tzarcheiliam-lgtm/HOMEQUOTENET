import type { Metadata } from 'next';
import { requireCallWorkspace } from '@/lib/auth';
import { PitchDeck } from '@/components/pitch/deck';
import { PresenterView } from '@/components/pitch/presenter';

export const metadata: Metadata = { title: 'Sales deck · HomeQuote Network' };

/**
 * The HomeQuote sales presentation for live contractor calls (admin, caller,
 * setter). Content: lib/pitch/config.ts. ?view=presenter opens the speaker-notes
 * window, which follows the deck tab.
 */
export default async function PitchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCallWorkspace();
  const sp = await searchParams;
  return sp.view === 'presenter' ? <PresenterView /> : <PitchDeck />;
}
