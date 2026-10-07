'use client';

import { FieldBox } from '@/components/signing/field-box';
import { PdfPageView, usePdf } from '@/components/signing/pdf-view';
import type { UiField, UiPage } from '@/lib/signing/view';

/** Locked, read-only view of a sent request: the original PDF with the field layout (and who each field belongs to). */
export function ReadOnlyViewer({ pdfUrl, pages, fields, signerNames, done }: { pdfUrl: string; pages: UiPage[]; fields: UiField[]; signerNames: string[]; done: Record<string, string> }) {
  const { doc, error } = usePdf(pdfUrl);
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {pages.map((meta, i) => (
        <div key={i} className="mx-auto w-full max-w-[820px]">
          <p className="mb-1 text-xs text-muted-foreground">Page {i + 1}</p>
          <PdfPageView doc={doc} pageNumber={i + 1} meta={meta}>
            {fields.filter((f) => f.page === i + 1).map((f) => (
              <FieldBox key={f.key} field={{ ...f, reviewed: true }} signerLabel={f.recipient_index ? signerNames[f.recipient_index - 1] : 'Sender'} dim={!done[f.key]}>
                {done[f.key] && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-50/70 text-[10px] font-medium text-emerald-800">✓ filled</div>}
              </FieldBox>
            ))}
          </PdfPageView>
        </div>
      ))}
    </div>
  );
}
