'use client';

import { useState, useTransition } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { setCustomerDocSettingsAction } from '@/lib/actions/contracts';

type DocType = 'agreement' | 'work_order' | 'proposal' | 'contract';
const LABELS: Record<DocType, string> = {
  agreement: 'HomeQuote ↔ contractor agreement (not for customers)',
  proposal: 'Customer proposal',
  work_order: 'Customer work order',
  contract: 'Customer contract',
};

/**
 * Admin-only. Decides whether this template may be used for documents issued to homeowners (by the assistant or contractors),
 * for which states, and approves the CURRENT published version. Re-publishing new wording clears the approval.
 */
export function TemplateDocPanel({ id, status, latestVersionNo, initial }: {
  id: string; status: string; latestVersionNo: number;
  initial: { docType: DocType; jurisdictions: string[]; approvedVersion: number | null };
}) {
  const [docType, setDocType] = useState<DocType>(initial.docType);
  const [states, setStates] = useState(initial.jurisdictions.join(', '));
  const [approved, setApproved] = useState<number | null>(initial.approvedVersion);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = (approve: boolean) => start(async () => {
    setMessage(null);
    const res = await setCustomerDocSettingsAction(id, { docType, jurisdictions: states.split(/[\s,]+/).filter(Boolean), approve });
    if (res.ok) {
      setApproved(res.approvedVersion);
      setMessage({ ok: true, text: approve ? `Version ${res.approvedVersion} approved for customer documents.` : 'Saved.' });
    } else setMessage({ ok: false, text: res.error });
  });

  const isCustomer = docType !== 'agreement';
  const current = approved !== null && approved === latestVersionNo;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold">Customer documents &amp; assistant</h3>
          {isCustomer && (current
            ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Approved · v{approved}</span>
            : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Not approved{approved !== null ? ` (v${approved} approved, latest is v${latestVersionNo})` : ''}</span>)}
        </div>
        <p className="text-xs text-muted-foreground">
          Only templates you approve here can be used to create work orders, proposals and contracts for homeowners. The wording is used exactly as published; the assistant cannot change it or write legal terms.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document type</Label>
            <Select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
              {(Object.keys(LABELS) as DocType[]).map((k) => <option key={k} value={k}>{LABELS[k]}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-states">States this wording is approved for</Label>
            <Input id="doc-states" value={states} onChange={(e) => setStates(e.target.value)} placeholder="CA, TX (leave blank for any)" disabled={!isCustomer} />
          </div>
        </div>
        {docType === 'contract' && <p className="text-xs text-amber-800">Contracts must list at least one state. The assistant only offers this template for homeowners in those states.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => save(false)}>Save settings</Button>
          {isCustomer && (
            <Button type="button" size="sm" disabled={pending || status !== 'published'} onClick={() => save(true)} title={status !== 'published' ? 'Publish the template first' : undefined}>
              Approve version {latestVersionNo || '—'} for customers
            </Button>
          )}
          {message && <span role="status" className={`text-xs ${message.ok ? 'text-emerald-700' : 'text-destructive'}`}>{message.text}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
