'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Rocket, XCircle } from 'lucide-react';
import { publishGraphAction, validateGraphForPublishAction } from '@/lib/actions/workflow-graph';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import type { GraphIssue } from '@/lib/workflows/graph';

/**
 * Publish = a full server-side readiness check (permissions, settings, branches, integrations),
 * then a NEW immutable version. Leads already in the workflow keep running on the version they started on.
 */
export function PublishDialog({
  open, onOpenChange, workflowId, currentVersion, flushSave, getRevision, onPublished,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workflowId: string;
  currentVersion: number | null;
  flushSave: () => Promise<boolean>;
  getRevision: () => number;
  onPublished: (version: number) => void;
}) {
  const [phase, setPhase] = useState<'checking' | 'ready' | 'publishing'>('checking');
  const [issues, setIssues] = useState<GraphIssue[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPhase('checking'); setError(null); setIssues([]);
    (async () => {
      const saved = await flushSave();
      if (!alive) return;
      if (!saved) { setError('Your latest changes could not be saved yet. Try again in a moment.'); setPhase('ready'); return; }
      const r = await validateGraphForPublishAction(workflowId);
      if (!alive) return;
      setIssues(r.issues ?? []);
      if (!r.issues && r.message) setError(r.message);
      setPhase('ready');
    })();
    return () => { alive = false; };
  }, [open, workflowId, flushSave]);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const publish = async () => {
    setPhase('publishing'); setError(null);
    const r = await publishGraphAction({ workflowId, expectedRevision: getRevision(), note: note.trim() || undefined });
    if (r.ok && r.data) { toast(`Published as version ${r.data.version}.`); onPublished(r.data.version); onOpenChange(false); return; }
    setIssues(r.issues ?? issues);
    setError(r.message ?? 'Could not publish.');
    setPhase('ready');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2"><Rocket className="size-5" aria-hidden /> {currentVersion ? `Publish version ${currentVersion + 1}` : 'Publish workflow'}</DialogTitle>
        <DialogDescription>
          {currentVersion ? `Version ${currentVersion} stays live until this publishes. Leads already in the workflow finish on the version they started on.` : 'Nothing runs until you publish.'} Only events that happen after publishing enroll leads — existing leads are never back-filled.
        </DialogDescription>
        <div className="mt-4 space-y-3" aria-live="polite">
          {phase === 'checking' && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Checking permissions, settings, branches and integrations…</p>}
          {phase !== 'checking' && errors.length === 0 && !error && <p className="flex items-center gap-2 rounded-md bg-emerald-50 p-2.5 text-sm text-emerald-900"><CheckCircle2 className="size-4" aria-hidden /> Ready to publish.</p>}
          {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-900">{error}</p>}
          {errors.length > 0 && <ul className="space-y-1.5">{errors.map((i, n) => <li key={n} className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/70 p-2 text-sm"><XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />{i.message}</li>)}</ul>}
          {warnings.length > 0 && <ul className="space-y-1.5">{warnings.map((i, n) => <li key={n} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />{i.message}</li>)}</ul>}
          <div className="space-y-1.5"><Label htmlFor="pub-note">What changed? (optional)</Label><Textarea id="pub-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={publish} disabled={phase !== 'ready' || errors.length > 0}>{phase === 'publishing' ? 'Publishing…' : 'Publish'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
