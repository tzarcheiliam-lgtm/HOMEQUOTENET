import type { FunnelStatus } from '@/lib/funnels/builder';

export type FunnelCardData = {
  id: string; slug: string; status: FunnelStatus; isDemo: boolean;
  clientName: string; industry: string;
  contractorId: string | null; contractorName: string | null;
  createdAt: string; updatedAt: string;
  starts: number; leads: number; bookings: number; needsQualification: number;
  /** leads / starts * 100, or null when there are no starts yet. */
  conversionRate: number | null;
};

export type FunnelGroup = { key: string; label: string; rows: FunnelCardData[] };
