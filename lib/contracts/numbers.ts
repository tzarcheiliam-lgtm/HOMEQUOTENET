/** Display number for an agreement, e.g. HQ-C-00042. Pure (safe in client components). */
export const contractNumber = (n: number | null) => (n == null ? '' : `HQ-C-${String(n).padStart(5, '0')}`);
