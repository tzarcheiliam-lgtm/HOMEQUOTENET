'use client';

import { PenLine, Type, Calendar, TextCursor, CheckSquare, TextCursorInput } from 'lucide-react';
import { FIELD_TYPE_LABELS, type FieldType } from '@/lib/signing/constants';
import { colorFor, type UiField } from '@/lib/signing/view';

export const FIELD_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  signature: PenLine, initials: Type, name: TextCursorInput, date: Calendar, text: TextCursor, checkbox: CheckSquare,
};

/** A positioned field marker (sender editor, review and read-only views). */
export function FieldBox({ field, selected, signerLabel, onPointerDown, onResizeDown, dim, children }: {
  field: Pick<UiField, 'type' | 'x' | 'y' | 'w' | 'h' | 'recipient_index' | 'needs_review' | 'reviewed' | 'required' | 'label' | 'prefill_value'>;
  selected?: boolean; signerLabel?: string; dim?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void; onResizeDown?: (e: React.PointerEvent) => void; children?: React.ReactNode;
}) {
  const c = colorFor(field.recipient_index);
  const uncertain = field.needs_review && !field.reviewed;
  const Icon = FIELD_ICONS[field.type];
  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute touch-none ${onPointerDown ? 'cursor-move' : ''} ${dim ? 'opacity-60' : ''}`}
      style={{
        left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%`,
        background: c.fill, border: `${selected ? 2 : 1.5}px ${uncertain ? 'dashed' : 'solid'} ${uncertain ? '#d97706' : c.stroke}`,
        borderRadius: 3, boxShadow: selected ? `0 0 0 3px ${c.stroke}33` : undefined,
      }}
      data-field-type={field.type}
    >
      <div className="pointer-events-none absolute -top-[15px] left-[-1px] flex max-w-[220%] items-center gap-0.5 whitespace-nowrap rounded-t px-1 text-[9px] font-medium leading-[14px] text-white" style={{ background: uncertain ? '#d97706' : c.stroke }}>
        <Icon className="size-2.5" />
        <span className="truncate">{field.label || FIELD_TYPE_LABELS[field.type]}{signerLabel ? ` · ${signerLabel}` : ''}{field.prefill_value ? ' · pre-filled' : field.required ? '' : ' · optional'}{uncertain ? ' · check' : ''}</span>
      </div>
      {field.prefill_value ? <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-1 text-[10px] text-zinc-700">{field.prefill_value}</div> : null}
      {children}
      {onResizeDown && selected ? (
        <span onPointerDown={onResizeDown} className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize touch-none rounded-full border-2 border-white shadow" style={{ background: c.stroke }} aria-label="Resize" />
      ) : null}
    </div>
  );
}
