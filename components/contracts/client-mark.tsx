/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

/** A client's logo in a fixed box (never stretched), or a tidy initials tile when there is no logo. */
export function ClientMark({ name, url, size = 36, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white', className)} style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={`${name} logo`} className="max-h-full max-w-full object-contain p-1" loading="lazy" />
      ) : (
        <span aria-hidden="true" className="select-none font-semibold text-slate-700" style={{ fontSize: Math.max(10, size * 0.38) }}>{initialsOf(name)}</span>
      )}
    </span>
  );
}
