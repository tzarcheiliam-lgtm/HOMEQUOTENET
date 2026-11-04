'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { RefreshCw, X, Loader2, CheckCircle2, AlertTriangle, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { NICHES, CUSTOM_NICHE_SLUG, resolveNiche } from '@/lib/prospecting/catalog';
import {
  CSLB_PORTAL_URL,
  classLabel,
  cslbClassesFor,
  licensesFromTable,
  qualifyCslb,
  type CslbLicense,
} from '@/lib/prospecting/cslb';
import { browserInflateRaw, readSpreadsheet, SpreadsheetError } from '@/lib/prospecting/spreadsheet';
import {
  callerIdsForSelection,
  type CallerOption,
  type NamedCallerSelection,
} from '@/lib/calls/callers';

/**
 * "Refresh Prospects": pick a niche, a source, who gets them and how many,
 * then watch real businesses get sourced, checked against the whole prospect
 * history and added to the call list.
 *
 * Sources:
 * - Google Maps: searched square by square over a map grid, continuing where
 *   the last run stopped (/api/calls/refresh).
 * - CSLB license list: the admin downloads the free state license export and
 *   picks the file here. It is read in the browser, so only the license rows
 *   are uploaded (/api/calls/import-cslb).
 *
 * Progress arrives as a newline-delimited JSON stream, so each stage shows the
 * moment the server reaches it rather than after everything is done.
 */

type Phase = 'form' | 'running' | 'done' | 'not_configured' | 'error';
type Source = 'google' | 'cslb';

interface Summary {
  added: number;
  duplicates: number;
  unqualified: number;
  remaining?: number;
  exhausted?: boolean;
}

interface LoadedFile {
  name: string;
  licenses: CslbLicense[];
}

async function gzipJson(value: unknown): Promise<{ body: BodyInit; gzipped: boolean }> {
  const json = JSON.stringify(value);
  if (typeof CompressionStream === 'undefined') return { body: json, gzipped: false };
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return { body: await new Response(stream).blob(), gzipped: true };
}

export function RefreshProspectsDialog({ assignees }: { assignees: CallerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [source, setSource] = useState<Source>('google');
  const [niche, setNiche] = useState(NICHES[0].slug);
  const [customNiche, setCustomNiche] = useState('');
  const [callers, setCallers] = useState<NamedCallerSelection>('both');
  const [perCaller, setPerCaller] = useState(100);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ envVar: string; provider: string } | null>(null);

  const resolved = resolveNiche(niche, customNiche);
  const classes = resolved ? cslbClassesFor(resolved) : [];
  // Re-judged whenever the niche changes, so the count always matches what would be sent.
  const fitting = useMemo(() => {
    const n = resolveNiche(niche, customNiche);
    return file && n ? file.licenses.filter((l) => qualifyCslb(l, n).ok) : [];
  }, [file, niche, customNiche]);

  // "Run again" keeps the chosen file, so the next batch from it is one click away.
  const reset = () => {
    setPhase('form');
    setMessages([]);
    setSummary(null);
    setError(null);
    setMissing(null);
  };

  const onOpenChange = (next: boolean) => {
    if (!next && phase === 'running') return; // never close mid-run
    setOpen(next);
    if (!next) {
      reset();
      setFile(null);
      setFileError(null);
    }
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(null);
    setFileError(null);
    if (!f) return;
    setReading(true);
    try {
      const table = await readSpreadsheet(new Uint8Array(await f.arrayBuffer()), browserInflateRaw);
      const { licenses, missing: cols } = licensesFromTable(table);
      if (cols.length > 0) {
        throw new SpreadsheetError(
          'This does not look like a CSLB license list (no license number / business name / phone / classification columns).'
        );
      }
      if (licenses.length === 0) throw new SpreadsheetError('The file has no license rows.');
      setFile({ name: f.name, licenses });
    } catch (err) {
      setFileError(
        err instanceof SpreadsheetError ? err.message : 'Could not read that file. Pick the .xlsx you downloaded from CSLB.'
      );
    } finally {
      setReading(false);
    }
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setPhase('running');
    setMessages([]);
    setError(null);
    try {
      const callerIds = callerIdsForSelection(assignees, callers);
      const expectedCount = callers === 'both' ? 2 : 1;
      if (callerIds.length !== expectedCount) {
        throw new Error('Liam or Nadav is not available as an active call assignee. Refresh the page and try again.');
      }
      const base = {
        nicheSlug: niche,
        customNiche: niche === CUSTOM_NICHE_SLUG ? customNiche : null,
        callerIds,
        perCaller,
      };
      let res: Response;
      if (source === 'cslb') {
        if (!file) throw new Error('Choose the CSLB file first.');
        if (fitting.length === 0) throw new Error('No license in this file fits the chosen niche in Los Angeles or Ventura County.');
        const { body, gzipped } = await gzipJson({ ...base, fileName: file.name, licenses: fitting });
        res = await fetch('/api/calls/import-cslb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', ...(gzipped ? { 'X-Body-Gzip': '1' } : {}) },
          body,
        });
      } else {
        res = await fetch('/api/calls/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base),
        });
      }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'progress') setMessages((m) => [...m, ev.message]);
          else if (ev.type === 'done') {
            setSummary({
              added: ev.added,
              duplicates: ev.duplicates,
              unqualified: ev.unqualified,
              remaining: ev.remaining,
              exhausted: ev.exhausted,
            });
            setPhase('done');
            finished = true;
            router.refresh(); // the table behind the dialog picks up the new rows
          } else if (ev.type === 'not_configured') {
            setMissing({ envVar: ev.envVar, provider: ev.provider });
            setPhase('not_configured');
            finished = true;
          } else if (ev.type === 'error') {
            setError(ev.message);
            setPhase('error');
            finished = true;
          }
        }
      }
      if (!finished) {
        setError('The connection closed before the run finished.');
        setPhase('error');
      }
    } catch (err) {
      setError((err as Error).message);
      setPhase('error');
    }
  }

  const nicheLabel =
    niche === CUSTOM_NICHE_SLUG
      ? customNiche || 'your niche'
      : (NICHES.find((n) => n.slug === niche)?.label ?? niche);

  const step = (n: number) => `${n}.`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="outline">
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh Prospects
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg focus:outline-none"
          onEscapeKeyDown={(e) => phase === 'running' && e.preventDefault()}
          onPointerDownOutside={(e) => phase === 'running' && e.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {phase === 'running'
                  ? 'Finding New Prospects…'
                  : phase === 'done'
                    ? 'Prospects Added'
                    : 'Refresh Prospects'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {phase === 'form'
                  ? 'Source real contractor businesses in Los Angeles and Ventura County and add them to the call list.'
                  : phase === 'running'
                    ? `Sourcing ${nicheLabel}. This can take a minute.`
                    : phase === 'done'
                      ? 'The new prospects are already in the table behind this dialog.'
                      : phase === 'not_configured'
                        ? 'The interface is ready; a business-data source still needs to be connected.'
                        : 'The run stopped before it could finish.'}
              </Dialog.Description>
            </div>
            {phase !== 'running' ? (
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" aria-label="Close">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            ) : null}
          </div>

          {phase === 'form' ? (
            <form onSubmit={run} className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="rp-niche">{step(1)} Choose niche</Label>
                <Select id="rp-niche" value={niche} onChange={(e) => setNiche(e.target.value)}>
                  {NICHES.map((n) => (
                    <option key={n.slug} value={n.slug}>
                      {n.label}
                    </option>
                  ))}
                  <option value={CUSTOM_NICHE_SLUG}>Other / Custom Niche</option>
                </Select>
                {niche === CUSTOM_NICHE_SLUG ? (
                  <Input
                    aria-label="Custom niche"
                    placeholder="e.g. Solar installers"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    minLength={3}
                    maxLength={80}
                    required
                    autoFocus
                  />
                ) : null}
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">{step(2)} Where to find them</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['google', 'Google Maps', 'Searches the map square by square and picks up where the last run stopped.'],
                      ['cslb', 'CSLB license list', 'Free state list of every licensed contractor. You download it, then pick the file here.'],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-md border p-3 text-sm ${
                        source === value ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="source"
                        value={value}
                        checked={source === value}
                        onChange={() => setSource(value)}
                        className="sr-only"
                      />
                      <span className="font-medium">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {source === 'cslb' ? (
                <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>
                      Open the{' '}
                      <a
                        href={CSLB_PORTAL_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-medium underline"
                      >
                        CSLB list by classification and county
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                      .
                    </li>
                    <li>
                      Classification:{' '}
                      {classes.length > 0 ? (
                        <strong>{classes.map(classLabel).join(' and ')}</strong>
                      ) : (
                        'the one that fits this niche'
                      )}
                      . Counties: <strong>Los Angeles</strong> and <strong>Ventura</strong>. Click Download.
                    </li>
                    <li>Pick the downloaded file below.</li>
                  </ol>
                  <div className="space-y-1.5">
                    <Label htmlFor="rp-file">CSLB file (.xlsx or .csv)</Label>
                    <Input
                      id="rp-file"
                      type="file"
                      accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      onChange={onFile}
                      required={!file}
                    />
                    {reading ? (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Reading the file…
                      </p>
                    ) : null}
                    {file ? (
                      <p className="flex items-start gap-2 text-xs" aria-live="polite">
                        <FileSpreadsheet className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          <span className="font-medium">{file.name}</span>:{' '}
                          <span className="tabular-nums">{file.licenses.length.toLocaleString()}</span> licenses,{' '}
                          <span className="tabular-nums font-medium">{fitting.length.toLocaleString()}</span> active with a
                          phone in Los Angeles or Ventura that fit {nicheLabel}. Ones already in your history are skipped.
                        </span>
                      </p>
                    ) : null}
                    {fileError ? (
                      <p className="text-xs text-destructive" role="alert">
                        {fileError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">{step(3)} Choose caller</legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['liam', 'Liam'],
                      ['nadav', 'Nadav'],
                      ['both', 'Both'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                        callers === value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="callers"
                        value={value}
                        checked={callers === value}
                        onChange={() => setCallers(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="rp-count">{step(4)} Number of prospects (per caller)</Label>
                <Input
                  id="rp-count"
                  type="number"
                  min={1}
                  max={250}
                  value={perCaller}
                  onChange={(e) => setPerCaller(Number(e.target.value) || 0)}
                  required
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  {callers === 'both'
                    ? `${perCaller} each for Liam and Nadav — no company goes to both.`
                    : `${perCaller} new prospects.`}{' '}
                  Anything already in your prospect history is skipped.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={source === 'cslb' && (reading || !file || fitting.length === 0)}>
                  {source === 'cslb' ? 'Add From License List' : 'Find New Prospects'}
                </Button>
              </div>
            </form>
          ) : null}

          {phase === 'running' || phase === 'done' || phase === 'not_configured' || phase === 'error' ? (
            <div className="mt-6 space-y-4">
              <ol className="space-y-1.5 text-sm" aria-live="polite">
                {messages.map((m, i) => (
                  <li key={`${i}-${m}`} className="flex items-start gap-2">
                    {phase === 'running' && i === messages.length - 1 ? (
                      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    )}
                    <span>{m}</span>
                  </li>
                ))}
                {phase === 'running' && messages.length === 0 ? (
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Starting…
                  </li>
                ) : null}
              </ol>

              {phase === 'done' && summary ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="text-2xl font-semibold tabular-nums">
                    {summary.added} new prospect{summary.added === 1 ? '' : 's'} added
                  </p>
                  <p className="mt-1 tabular-nums">{summary.duplicates} duplicates skipped</p>
                  <p className="tabular-nums">{summary.unqualified} unqualified businesses skipped</p>
                  {summary.remaining ? (
                    <p className="mt-2 tabular-nums">
                      {summary.remaining} more new licenses are left in this file. Click Run again to hand them out.
                    </p>
                  ) : null}
                  {summary.exhausted ? (
                    <p className="mt-2">
                      Google Maps has been fully searched for this niche recently. Use a CSLB license list for more.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {phase === 'not_configured' && missing ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4" aria-hidden="true" /> No business-data source connected
                  </p>
                  <p className="mt-2">
                    Nothing was added — this tool never invents companies. To source real businesses,
                    connect <strong>{missing.provider}</strong>: add the environment variable{' '}
                    <code className="rounded bg-amber-100 px-1">{missing.envVar}</code> in Vercel
                    (Project → Settings → Environment Variables, Production) and in{' '}
                    <code className="rounded bg-amber-100 px-1">.env.local</code>, then redeploy. The CSLB
                    license list works without it.
                  </p>
                </div>
              ) : null}

              {phase === 'error' && error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              {phase !== 'running' ? (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={reset}>
                    Run again
                  </Button>
                  <Dialog.Close asChild>
                    <Button type="button">Done</Button>
                  </Dialog.Close>
                </div>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
