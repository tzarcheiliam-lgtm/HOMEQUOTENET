'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PdfPageView, usePdf } from '@/components/signing/pdf-view';
import { contractFileAction } from '@/lib/actions/contracts';

/** Read-only viewer for a sent or signed agreement (short-lived signed URL fetched on demand). */
export function ContractPdfViewer({ contractId, kind }: { contractId: string; kind: 'original' | 'final' }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    contractFileAction(contractId, kind).then((r) => { if (cancelled) return; if (r.ok) setUrl(r.url); else setErr(r.error); });
    return () => { cancelled = true; };
  }, [contractId, kind]);
  const { doc, error } = usePdf(url);
  if (err || error) return <p className="text-sm text-destructive" role="alert">{err ?? error}</p>;
  if (!url || !doc) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" /> Loading the document…</div>;
  return (
    <div className="space-y-4">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <div key={i} className="mx-auto w-full max-w-[820px]">
          <p className="mb-1 text-xs text-muted-foreground">Page {i + 1} of {doc.numPages}</p>
          <PdfPageView doc={doc} pageNumber={i + 1} meta={{ w: 612, h: 792, rotation: 0 }} />
        </div>
      ))}
    </div>
  );
}
