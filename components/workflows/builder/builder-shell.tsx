'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Cloud, CloudOff, History, Loader2, MoreHorizontal, Pause, Play, Plus, Redo2, Rocket, Settings2, Undo2, Wand2, FlaskConical,
} from 'lucide-react';
import type { BuilderLookups, GraphWorkflowDetail } from '@/lib/data/workflow-graph';
import { Button } from '@/components/ui/button';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { checkConnection, nodeDisplayName, semanticGraph, handlesFor, type GraphNodeType } from '@/lib/workflows/graph';
import { GraphCanvas } from './graph-canvas';
import { MobileSteps } from './mobile-steps';
import { StepLibrary } from './step-library';
import { NodeConfigPanel } from './config/node-config-panel';
import { SettingsPanel } from './panels/settings-panel';
import { IssuesPanel } from './panels/issues-panel';
import { TestPanel } from './panels/test-panel';
import { PublishDialog } from './panels/publish-dialog';
import { LifecycleDialog, type LifecycleKind } from './panels/lifecycle-dialog';
import { useAutosave } from './use-autosave';
import { useGraphEditor } from './use-graph-editor';

type Tab = 'step' | 'workflow' | 'issues' | 'test' | 'versions';
type AddRequest = { kind: 'after'; nodeId: string; handle: string } | { kind: 'edge'; edgeId: string };

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
/** null on the server / first paint, so desktop and phone never flash each other's layout. */
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(subscribe, () => window.matchMedia('(min-width: 1024px)').matches, () => null as unknown as boolean);
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  published: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-800',
};

export function BuilderShell({ detail, lookups, canEdit, isAdmin }: { detail: GraphWorkflowDetail; lookups: BuilderLookups; canEdit: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const readOnly = !canEdit || !!detail.archivedAt;
  const editor = useGraphEditor(detail.draft.graph, { contractorId: detail.contractorId });
  const { graph, issues } = editor;

  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description ?? '');
  const [status, setStatus] = useState(detail.status);
  const [version, setVersion] = useState(detail.publishedVersion);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('workflow');
  const [sheet, setSheet] = useState<Tab | null>(null); // phone: which full-screen sheet is open
  const [addReq, setAddReq] = useState<AddRequest | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<LifecycleKind | null>(null);

  const autosave = useAutosave({ workflowId: detail.id, initialRevision: detail.draft.revision, snapshot: { graph, name, description }, enabled: !readOnly });
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;
  const selected = selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;

  const differsFromPublished = useMemo(
    () => (detail.published ? semanticGraph(graph) !== semanticGraph(detail.published.graph) : false),
    [graph, detail.published]
  );

  // Keyboard: undo / redo / save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void autosave.saveNow(); return; }
      if (typing || !mod || readOnly) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) editor.redo(); else editor.undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); editor.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, autosave, readOnly]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) { setTab('step'); if (desktop === false) setSheet('step'); }
  }, [desktop]);

  const requestAddAfter = useCallback((nodeId: string, handle: string) => setAddReq({ kind: 'after', nodeId, handle }), []);
  const requestInsert = useCallback((edgeId: string) => setAddReq({ kind: 'edge', edgeId }), []);

  const addContext = useMemo(() => {
    if (!addReq) return undefined;
    if (addReq.kind === 'edge') return 'Insert a step on this connection.';
    const node = graph.nodes.find((n) => n.id === addReq.nodeId);
    const h = node ? handlesFor(node.type, node.config).find((x) => x.id === addReq.handle) : null;
    return node ? `After “${nodeDisplayName(node)}”${h && h.id !== 'next' ? ` → ${h.label}` : ''}` : undefined;
  }, [addReq, graph.nodes]);

  const existingTargets = useMemo(() => {
    if (!addReq || addReq.kind !== 'after') return [];
    return graph.nodes
      .filter((n) => n.type !== 'trigger' && checkConnection(graph, { source: addReq.nodeId, sourceHandle: addReq.handle, target: n.id }).ok)
      .map((n) => ({ id: n.id, label: nodeDisplayName(n) }));
  }, [addReq, graph]);

  const pick = (type: GraphNodeType) => {
    if (!addReq) return;
    const id = addReq.kind === 'after' ? editor.addAfter(addReq.nodeId, addReq.handle, type) : editor.insertOnEdge(addReq.edgeId, type);
    setAddReq(null);
    if (id) select(id);
  };

  const addFromToolbar = () => {
    // Default spot: after the selected step's first open output, else the first open output anywhere.
    const candidates = [selected, ...graph.nodes].filter(Boolean) as typeof graph.nodes;
    for (const n of candidates) {
      const open = handlesFor(n.type, n.config).find((h) => !graph.edges.some((e) => e.source === n.id && e.sourceHandle === h.id));
      if (open) { setAddReq({ kind: 'after', nodeId: n.id, handle: open.id }); return; }
    }
    toast('Every path already continues. Use the + on a connection to insert a step in between.', 'error');
  };

  const saveLabel = (() => {
    switch (autosave.status) {
      case 'saving': return { icon: <Loader2 className="size-3.5 animate-spin" aria-hidden />, text: 'Saving…', tone: 'text-muted-foreground' };
      case 'unsaved': return { icon: <Cloud className="size-3.5" aria-hidden />, text: 'Unsaved changes', tone: 'text-amber-700' };
      case 'error': return { icon: <CloudOff className="size-3.5" aria-hidden />, text: 'Couldn’t save — retrying', tone: 'text-rose-700' };
      case 'conflict': return { icon: <CloudOff className="size-3.5" aria-hidden />, text: 'Changed elsewhere', tone: 'text-rose-700' };
      default: return { icon: <CheckCircle2 className="size-3.5" aria-hidden />, text: autosave.savedAt ? `Draft saved ${autosave.savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Draft saved', tone: 'text-emerald-700' };
    }
  })();

  const statusText = status === 'published' ? `Published${version ? ` · v${version}` : ''}${differsFromPublished ? ' · unpublished changes' : ''}` : status === 'paused' ? `Paused${version ? ` · v${version}` : ''}` : 'Draft';

  const stepPanel = selected ? (
    <NodeConfigPanel
      key={selected.id}
      node={selected}
      graph={graph}
      issues={issues.filter((i) => i.nodeId === selected.id)}
      lookups={lookups}
      contractorId={detail.contractorId}
      readOnly={readOnly}
      onPatch={(patch) => editor.patchNode(selected.id, patch)}
      onDuplicate={() => { const id = editor.duplicate(selected.id); if (id) select(id); }}
      onDelete={() => { editor.remove(selected.id); setSelectedId(null); setSheet(null); }}
      onClose={() => { setSelectedId(null); setSheet(null); }}
    />
  ) : (
    <div className="p-6 text-sm text-muted-foreground">Select a step to edit it. {desktop ? 'Drag from a step’s bottom dot to connect, or use the + buttons to add steps.' : 'Tap any step to edit it, or use Add step.'}</div>
  );

  const settingsPanel = (
    <SettingsPanel graph={graph} description={description} onDescription={setDescription} onSettings={editor.settings} readOnly={readOnly} contractorName={detail.contractorName} status={{ label: status === 'published' ? 'Published' : status === 'paused' ? 'Paused' : 'Draft', version }} />
  );
  const issuesPanel = <IssuesPanel issues={issues} graph={graph} onSelectNode={(id) => { select(id); }} />;
  const testPanel = (
    <TestPanel workflowId={detail.id} graph={graph} isAdmin={isAdmin} recipients={lookups.recipients} beforeRun={autosave.saveNow} onSelectNode={(id) => select(id)} />
  );
  const versionsPanel = (
    <div className="space-y-3 p-4">
      <p className="text-xs text-muted-foreground">Every publish creates a new, unchangeable version. Leads already in the workflow finish on the version they started on; new leads use the latest.</p>
      {detail.versions.length === 0 && <p className="text-sm">Not published yet.</p>}
      <ul className="space-y-2">{detail.versions.map((v) => (
        <li key={v.version} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">Version {v.version}{v.version === version ? ' (live)' : ''}</span><time className="text-xs text-muted-foreground">{new Date(v.publishedAt).toLocaleString()}</time></div>{v.note && <p className="mt-1 text-muted-foreground">{v.note}</p>}</li>
      ))}</ul>
      <Link href={`/app/workflows/${detail.id}/runs`} className="inline-block text-sm font-medium text-primary underline">View run history</Link>
    </div>
  );

  const panelFor = (t: Tab) => (t === 'step' ? stepPanel : t === 'workflow' ? settingsPanel : t === 'issues' ? issuesPanel : t === 'test' ? testPanel : versionsPanel);
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'step', label: 'Step' }, { id: 'workflow', label: 'Workflow' }, { id: 'issues', label: 'Issues', badge: issues.length }, { id: 'test', label: 'Test' }, { id: 'versions', label: 'Versions' },
  ];

  const publishButton = !readOnly && (
    <Button onClick={() => setPublishOpen(true)} className="gap-2" data-testid="publish-button">
      <Rocket /> <span className="hidden sm:inline">{version ? (differsFromPublished ? 'Publish changes' : 'Publish') : 'Publish'}</span><span className="sm:hidden">Publish</span>
    </Button>
  );

  return (
    <div className="flex flex-col gap-3" data-testid="builder-shell">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-2.5 sm:gap-2 lg:gap-3 lg:p-3">
        <Link href="/app/workflows" aria-label="Back to automations" className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:size-9"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] lg:basis-48">
          <Input value={name} maxLength={120} disabled={readOnly} onChange={(e) => setName(e.target.value)} aria-label="Workflow name" className="h-10 border-transparent bg-transparent px-2 text-base font-semibold shadow-none hover:border-input focus-visible:border-ring lg:h-9" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 text-xs">
            <span className={cn('rounded-full px-2 py-0.5 font-semibold', STATUS_BADGE[status])} data-testid="status-badge">{statusText}</span>
            <span className="text-muted-foreground">{detail.contractorName ?? 'HomeQuote network'}</span>
            {!readOnly && <span className={cn('inline-flex items-center gap-1', saveLabel.tone)} role="status" data-testid="save-indicator">{saveLabel.icon}{saveLabel.text}</span>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="max-sm:size-10" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 /></Button>
            <Button variant="ghost" size="icon" className="max-sm:size-10" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 /></Button>
            <Button variant="ghost" size="icon" onClick={editor.layout} className="hidden lg:inline-flex" aria-label="Tidy layout" title="Tidy layout"><Wand2 /></Button>
          </div>
        )}
        <button type="button" onClick={() => { setTab('issues'); if (desktop === false) setSheet('issues'); }} className={cn('inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium lg:h-9', errors ? 'border-rose-300 bg-rose-50 text-rose-800' : warnings ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')} data-testid="issues-button">
          {errors || warnings ? <AlertTriangle className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
          <span className="sm:hidden">{errors || warnings || 'OK'}</span>
          <span className="hidden sm:inline">{errors ? `${errors} to fix` : warnings ? `${warnings} to review` : 'Looks good'}</span>
        </button>
        {!readOnly && <Button variant="outline" onClick={addFromToolbar} className="gap-1.5 max-sm:size-10 max-sm:px-0" aria-label="Add step"><Plus /> <span className="hidden sm:inline">Add step</span></Button>}
        {!readOnly && <Button variant="outline" className="hidden gap-1.5 lg:inline-flex" onClick={() => setTab('test')}><FlaskConical /> Test</Button>}
        {publishButton}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="max-sm:size-10" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem asChild><Link href={`/app/workflows/${detail.id}/runs`}><History className="size-4" /> Run history</Link></DropdownMenuItem>
            {desktop === false && <DropdownMenuItem onSelect={() => setSheet('workflow')}><Settings2 className="size-4" /> Workflow settings</DropdownMenuItem>}
            {desktop === false && <DropdownMenuItem onSelect={() => setSheet('test')}><FlaskConical className="size-4" /> Test</DropdownMenuItem>}
            {desktop === false && <DropdownMenuItem onSelect={() => setSheet('versions')}><History className="size-4" /> Versions</DropdownMenuItem>}
            {!readOnly && status === 'published' && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setLifecycle('pause')}><Pause className="size-4" /> Pause workflow</DropdownMenuItem></>}
            {!readOnly && status === 'paused' && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setLifecycle('resume')}><Play className="size-4" /> Resume workflow</DropdownMenuItem></>}
            {!readOnly && <DropdownMenuItem onSelect={() => setLifecycle('archive')} className="text-rose-700"><ChevronDown className="size-4 rotate-90" /> Archive</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {readOnly && <p role="note" className="rounded-lg border bg-muted/50 p-3 text-sm">{detail.archivedAt ? 'This workflow is archived.' : 'You can view this workflow and its runs. Ask a company owner or HomeQuote admin to change it.'}</p>}
      {status === 'published' && differsFromPublished && !readOnly && <p role="note" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Version {version} is live. You’re editing a <strong>draft</strong> — your changes go live only when you publish. Leads already in the workflow finish on the version they started on.</p>}
      {status === 'paused' && <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This workflow is paused: no new leads are enrolled and waiting runs are held.{!readOnly && <> <button className="font-semibold underline" onClick={() => setLifecycle('resume')}>Resume</button></>}</p>}
      {autosave.status === 'conflict' && <p role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{autosave.message ?? 'This workflow was changed in another window.'}<Button size="sm" onClick={() => window.location.reload()}>Reload latest</Button></p>}
      {autosave.status === 'error' && autosave.message && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{autosave.message}</p>}

      {/* Workspace */}
      {desktop === null && <div className="h-[60dvh] animate-pulse rounded-xl border bg-muted/40" aria-hidden />}
      {desktop === true && (
        <div className="flex overflow-hidden rounded-xl border bg-slate-50" style={{ height: 'calc(100dvh - 15rem)', minHeight: 520 }}>
          <div className="relative min-w-0 flex-1">
            <GraphCanvas
              graph={graph}
              issues={issues}
              selectedNodeId={selectedId}
              onSelectNode={select}
              readOnly={readOnly}
              onMove={editor.move}
              onConnect={editor.connect}
              onRequestAddAfter={requestAddAfter}
              onRequestInsertOnEdge={requestInsert}
              onDeleteNodes={(ids) => { ids.forEach((id) => editor.remove(id)); setSelectedId(null); }}
              onDeleteEdges={(ids) => ids.forEach((id) => editor.removeEdge(id))}
              onNotice={(m) => toast(m, 'error')}
            />
          </div>
          <aside className="flex w-[400px] shrink-0 flex-col border-l bg-card" aria-label="Details">
            <div role="tablist" className="flex shrink-0 border-b">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn('relative flex-1 px-1 py-2.5 text-xs font-semibold transition', tab === t.id ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>
                  {t.label}{t.badge ? <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{t.badge}</span> : null}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel">{panelFor(tab)}</div>
          </aside>
        </div>
      )}
      {desktop === false && (
        <div className="rounded-xl border bg-slate-50" data-testid="mobile-workspace">
          <MobileSteps graph={graph} issues={issues} selectedNodeId={selectedId} onSelect={select} onAdd={requestAddAfter} readOnly={readOnly} />
        </div>
      )}

      {/* Phone: full-screen sheets (no precision pointing needed) */}
      {desktop === false && (
        <DialogPrimitive.Root open={sheet !== null} onOpenChange={(o) => { if (!o) { setSheet(null); setSelectedId(null); } }}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Content className="fixed inset-0 z-[70] flex flex-col bg-background outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none" aria-describedby={undefined}>
              <div className="flex shrink-0 items-center gap-1 border-b px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                <DialogPrimitive.Close className="flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><ArrowLeft className="size-5" aria-hidden /> {sheet === 'step' ? 'Steps' : 'Back'}</DialogPrimitive.Close>
                <DialogPrimitive.Title className="min-w-0 flex-1 truncate pr-2 text-center text-base font-semibold">{sheet === 'step' ? (selected ? nodeDisplayName(selected) : 'Step') : sheet === 'workflow' ? 'Workflow settings' : sheet === 'issues' ? 'Issues' : sheet === 'test' ? 'Test' : 'Versions'}</DialogPrimitive.Title>
                <span className="w-16" aria-hidden />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{sheet ? panelFor(sheet) : null}</div>
              <div className="shrink-0 border-t bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"><Button className="w-full" onClick={() => { setSheet(null); setSelectedId(null); }}>Done</Button></div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}

      <StepLibrary
        open={addReq !== null}
        onOpenChange={(o) => { if (!o) setAddReq(null); }}
        onPick={pick}
        context={addContext}
        existingTargets={existingTargets}
        onPickExisting={(target) => {
          if (addReq?.kind !== 'after') return;
          const err = editor.connect({ source: addReq.nodeId, sourceHandle: addReq.handle, target });
          if (err) toast(err, 'error');
          setAddReq(null);
        }}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        workflowId={detail.id}
        currentVersion={version}
        flushSave={autosave.saveNow}
        getRevision={autosave.revision}
        onPublished={(v) => { setVersion(v); setStatus((s) => (s === 'paused' ? 'paused' : 'published')); router.refresh(); }}
      />
      <LifecycleDialog
        kind={lifecycle}
        workflowId={detail.id}
        onOpenChange={(o) => { if (!o) setLifecycle(null); }}
        onDone={(k) => { if (k === 'pause') setStatus('paused'); if (k === 'resume') setStatus('published'); if (k === 'archive') router.push('/app/workflows'); else router.refresh(); }}
      />
    </div>
  );
}
