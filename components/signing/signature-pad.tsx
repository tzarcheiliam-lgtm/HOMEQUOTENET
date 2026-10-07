'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INK = '#0b1b4d';
export const SCRIPT_FONT = '"Dancing Script", "Segoe Script", "Snell Roundhand", "Brush Script MT", cursive';

/** Crops transparent margins and returns a PNG data (base64, no prefix) at a bounded size. */
function trimToPng(src: HTMLCanvasElement, maxW: number): string | null {
  const ctx = src.getContext('2d')!;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0, any = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { any = true; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!any) return null;
  const pad = Math.round(Math.max(width, height) * 0.01) + 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const scale = Math.min(1, maxW / w);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * scale)); out.height = Math.max(1, Math.round(h * scale));
  out.getContext('2d')!.drawImage(src, x0, y0, w, h, 0, 0, out.width, out.height);
  return out.toDataURL('image/png').split(',')[1] ?? null;
}

export interface SignatureValue { method: 'drawn' | 'typed'; typedText: string | null; png: string }

export function SignaturePad({ kind, defaultText, onChange }: { kind: 'signature' | 'initials'; defaultText: string; onChange: (v: SignatureValue | null) => void }) {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const g = c.getContext('2d')!; g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = kind === 'initials' ? 3 : 2.6;
  }, [tab, kind]);

  const pos = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent) => { e.preventDefault(); canvas.current!.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e); const g = canvas.current!.getContext('2d')!; g.beginPath(); g.arc(last.current.x, last.current.y, 0.8, 0, 7); g.fill(); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e); const g = canvas.current!.getContext('2d')!;
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    g.beginPath(); g.moveTo(last.current.x, last.current.y); g.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y); g.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return; drawing.current = false; last.current = null;
    const png = trimToPng(canvas.current!, 700);
    setHasInk(!!png); onChange(png ? { method: 'drawn', typedText: null, png } : null);
  };
  const clear = () => { const c = canvas.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setHasInk(false); onChange(null); };

  const renderTyped = useCallback(async (text: string) => {
    if (!text.trim()) return onChange(null);
    try { await document.fonts.load(`64px "Dancing Script"`, text); } catch { /* fallback fonts apply */ }
    const c = document.createElement('canvas'); c.width = 1400; c.height = 360;
    const g = c.getContext('2d')!; g.fillStyle = INK; g.textBaseline = 'middle';
    let size = 200; g.font = `${size}px ${SCRIPT_FONT}`;
    while (g.measureText(text).width > c.width - 80 && size > 40) { size -= 6; g.font = `${size}px ${SCRIPT_FONT}`; }
    g.fillText(text, 40, c.height / 2);
    const png = trimToPng(c, 700);
    onChange(png ? { method: 'typed', typedText: text.trim(), png } : null);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm" role="tablist">
        {(['draw', 'type'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => { setTab(t); onChange(null); setHasInk(false); if (t === 'type' && typed) void renderTyped(typed); }} className={`rounded px-3 py-2 font-medium ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>{t === 'draw' ? 'Draw' : 'Type'}</button>
        ))}
      </div>
      {tab === 'draw' ? (
        <div className="space-y-2">
          <div className="relative rounded-md border-2 border-dashed bg-white">
            <canvas ref={canvas} className="block h-44 w-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label={`Draw your ${kind} here`} />
            {!hasInk && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">Draw your {kind} here</span>}
            <span className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-zinc-300" />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clear}><Eraser className="size-4" /> Clear</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input value={typed} maxLength={80} placeholder={kind === 'initials' ? 'Type your initials' : 'Type your full name'} onChange={(e) => { setTyped(e.target.value); void renderTyped(e.target.value); }} autoComplete="off" />
          {defaultText && !typed && <Button type="button" variant="outline" size="sm" onClick={() => { setTyped(defaultText); void renderTyped(defaultText); }}>Use “{defaultText}”</Button>}
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-white px-3 text-center" style={{ fontFamily: SCRIPT_FONT, color: INK, fontSize: 44 }}>{typed || <span className="font-sans text-sm text-zinc-400">Your {kind} preview</span>}</div>
        </div>
      )}
    </div>
  );
}
