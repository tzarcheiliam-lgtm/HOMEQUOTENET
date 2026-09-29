export interface FilterChip {
  key: string;
  label: string;
  /** The current list URL with this one filter removed. */
  href: string;
}

export interface ChipDef {
  key: string;
  /** Text for the chip given the raw param value, or null to omit it. */
  label: (value: string) => string | null;
}

/**
 * One removable chip per active filter, as plain links, so removing a filter
 * is a normal navigation (works without client state, keeps the URL the
 * source of truth). `carry` params (the saved view, sort) survive removal.
 */
export function buildFilterChips(
  basePath: string,
  params: Record<string, string | undefined>,
  defs: ChipDef[]
): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const def of defs) {
    const value = params[def.key];
    if (!value) continue;
    const label = def.label(value);
    if (!label) continue;
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== def.key && k !== 'page') next.set(k, v);
    }
    const qs = next.toString();
    chips.push({ key: def.key, label, href: qs ? `${basePath}?${qs}` : basePath });
  }
  return chips;
}
