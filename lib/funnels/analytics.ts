export type FunnelCounts = { event: string; step_id: string; total: number }[];
export function conversion(current: number, previous: number): string {
  return previous > 0 ? `${(current / previous * 100).toFixed(1)}%` : '—';
}
