'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { PdfPageView, usePdf } from '@/components/signing/pdf-view';
import type { ValidationIssue } from '@/lib/contracts/validate';

type Loaded = { ok: true; base64: string; pageCount: number; issues?: ValidationIssue[] } | { ok: false; error: string };

/** Shows the real generated PDF (the same bytes that would be sent), page by page. */
export function PdfPreview({ load, refreshKey, onLoaded }: { load: () => Promise<Loaded>; refreshKey: number; onLoaded?: (r: { issues: ValidationIssue[] }) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    setState('loading');
    load().then((r) => {
      if (cancelled) return;
      if (!r.ok) { setError(r.error); setState('error'); return; }
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      made = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setUrl(made); setPages(r.pageCount); setState('ready');
      onLoaded?.({ issues: r.issues ?? [] });
    }).catch(() => { if (!cancelled) { setError('The preview could not be generated.'); setState('error'); } });
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const { doc, error: viewError } = usePdf(state === 'ready' ? url : null);
  if (state === 'loading') return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" /> Generating the PDF…</div>;
  if (state === 'error') return <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}</div>;
  return (
    <div className="space-y-4">
      {viewError && <p className="text-sm text-destructive">{viewError}</p>}
      {Array.from({ length: pages }, (_, i) => (
        <div key={i} className="mx-auto w-full max-w-[820px]">
          <p className="mb-1 text-xs text-muted-foreground">Page {i + 1} of {pages}</p>
          <PdfPageView doc={doc} pageNumber={i + 1} meta={{ w: 612, h: 792, rotation: 0 }} />
        </div>
      ))}
    </div>
  );
}
