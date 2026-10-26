import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import type { NavItem } from '@/lib/nav';

/** A menu link: Next's client navigation for app pages, a plain new-tab link for items marked `newTab`. */
export function NavLink({ item, ...props }: { item: NavItem } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  if (item.newTab) return <a href={item.href} target="_blank" rel="noopener" {...props} />;
  return <Link href={item.href} {...props} />;
}
