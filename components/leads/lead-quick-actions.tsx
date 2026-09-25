'use client';

import { useState } from 'react';
import { Phone, MessageSquare, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { telHref } from '@/lib/leads/lead-emails';

/** Call/Text buttons — the primary "do something now" actions on a lead. */
export function CallTextActions({
  phone,
  size = 'sm',
  className,
}: {
  phone: string | null | undefined;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const href = phone ? telHref(phone) : null;
  if (!href) return null;
  const smsHref = href.replace('tel:', 'sms:');

  return (
    <div className={cn('flex gap-2', className)}>
      <Button asChild size={size} variant="default">
        <a href={href} onClick={(e) => e.stopPropagation()}>
          <Phone className="size-4" /> Call
        </a>
      </Button>
      <Button asChild size={size} variant="outline">
        <a href={smsHref} onClick={(e) => e.stopPropagation()}>
          <MessageSquare className="size-4" /> Text
        </a>
      </Button>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** A single contact row (phone/email/address) with an action + copy button. */
export function ContactLine({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {href ? (
            <a href={href} className="truncate text-sm font-medium text-foreground hover:underline">
              {value}
            </a>
          ) : (
            <p className="truncate text-sm font-medium">{value}</p>
          )}
        </div>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  );
}
