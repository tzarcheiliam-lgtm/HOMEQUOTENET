import {
  ArrowRightLeft, Bell, CalendarClock, Flag, GitBranch, Hourglass, ListTodo, Mail, MessageSquare, PhoneCall, StickyNote, Timer, UserCheck, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNodeType, NodeCategory } from '@/lib/workflows/graph';
import { NODE_TYPES } from '@/lib/workflows/graph';

const ICONS: Record<string, LucideIcon> = {
  Zap, Mail, MessageSquare, PhoneCall, ListTodo, StickyNote, ArrowRightLeft, UserCheck, Bell, Timer, CalendarClock, Hourglass, GitBranch, Flag,
};

export function NodeIcon({ type, className }: { type: GraphNodeType; className?: string }) {
  const Icon = ICONS[NODE_TYPES[type].icon] ?? Zap;
  return <Icon className={className} aria-hidden />;
}

/** Category colours: restrained, one hue per purpose. */
export const CATEGORY_STYLE: Record<NodeCategory, { chip: string; bar: string }> = {
  start: { chip: 'bg-primary text-primary-foreground', bar: 'bg-primary' },
  contact: { chip: 'bg-sky-100 text-sky-800', bar: 'bg-sky-500' },
  records: { chip: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
  timing: { chip: 'bg-amber-50 text-amber-800', bar: 'bg-amber-400' },
  logic: { chip: 'bg-indigo-50 text-indigo-800', bar: 'bg-indigo-400' },
  finish: { chip: 'bg-zinc-800 text-zinc-50', bar: 'bg-zinc-700' },
};
