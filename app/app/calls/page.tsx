import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requireCallWorkspace } from '@/lib/auth';
import {
  getCallerDashboard,
  getSpreadOverview,
  listCallers,
  listProspectFilterOptions,
  listProspects,
  type ProspectFilters as Filters,
} from '@/lib/data/prospects';
import { CALL_VIEWS, type CallSort, type CallView } from '@/lib/calls/constants';
import { CADENCE } from '@/lib/calls/cadence';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { CallerDashboard } from '@/components/calls/caller-dashboard';
import { ViewTabs } from '@/components/calls/view-tabs';
import { ProspectFilters } from '@/components/calls/prospect-filters';
import { ProspectsTable } from '@/components/calls/prospects-table';
import { Pagination } from '@/components/calls/pagination';
import { RefreshProspectsDialog } from '@/components/calls/refresh-prospects-dialog';
import { SpreadProspectsDialog } from '@/components/calls/spread-prospects-dialog';
import type { ProspectDisposition } from '@/lib/types';
import { contextFrom, contextQuery } from '@/lib/calls/context';
import { getGoalSnapshot, getTeamBoard, type BoardRow, type GoalSnapshot } from '@/lib/data/call-stats';
import { tierFor } from '@/lib/calls/goals';
import { GoalRing } from '@/components/calls/goal/goal-ring';

export const metadata = { title: 'Calls · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

const EMPTY_HINTS: Record<CallView, string> = {
  mine: 'Nothing assigned to you is due right now. Ask an administrator to assign prospects, or check Callbacks Due.',
  liam: 'Assign prospects to Liam from All Prospects to build this list.',
  nadav: 'Assign prospects to Nadav from All Prospects to build this list.',
  all: 'Import a prospect list or add one manually to get started.',
  new: 'Every prospect has been called at least once.',
  callbacks: 'No callbacks are due. Promised callbacks appear here at their time.',
  interested: 'No one has said yes yet. Interested and follow-up outcomes land here.',
  booked: 'No sales appointments booked yet.',
  resting: `Nobody is resting. Prospects we could not reach wait here until their next try; after ${CADENCE.maxNoConnect} misses in a row they are parked.`,
  dnc: 'No contractor has asked not to be called.',
};

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const sp = await searchParams;

  // A caller asking for an admin view is quietly shown their own list.
  const requested = first(sp.view) as CallView | undefined;
  const viewDef = CALL_VIEWS.find((v) => v.value === requested);
  const view: CallView = viewDef && (isAdmin || !viewDef.adminOnly) ? viewDef.value : 'mine';

  const filters: Filters = {
    view,
    q: first(sp.q),
    caller: isAdmin ? first(sp.caller) : undefined,
    disposition: first(sp.disposition) as ProspectDisposition | undefined,
    city: first(sp.city),
    county: first(sp.county),
    service: first(sp.service),
    niche: first(sp.niche),
    callback: first(sp.callback) as Filters['callback'],
    sort: first(sp.sort) as CallSort | undefined,
    page: Number(first(sp.page) ?? '1') || 1,
  };

  const callers = await listCallers();
  const [result, options, dashboard, snapshot, board, spread] = await Promise.all([
    listProspects(filters, me, callers),
    listProspectFilterOptions(),
    isAdmin ? null : getCallerDashboard(me.id),
    // Shared with the layout's HUD (cached per request); never blocks the list.
    getGoalSnapshot(me.id).catch((): GoalSnapshot | null => null),
    isAdmin ? getTeamBoard().catch((): BoardRow[] => []) : Promise.resolve([] as BoardRow[]),
    isAdmin ? getSpreadOverview(callers).catch(() => null) : null,
  ]);

  const done = first(sp.done) === '1';
  // What this list is showing, so opening a prospect and pressing Next stays inside it.
  const listContext = contextQuery(
    contextFrom((k) => (k === 'caller' && !isAdmin ? undefined : k === 'view' ? view : first(sp[k])))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Calls' : `Welcome${me.full_name ? `, ${me.full_name.split(' ')[0]}` : ''}`}
        description={
          isAdmin
            ? 'Every contractor prospect, who holds it, and where it stands. Assign from here.'
            : 'Your call list for today. Work down it; log every call.'
        }
      >
        {isAdmin ? (
          <>
            <RefreshProspectsDialog assignees={callers} />
            {spread ? <SpreadProspectsDialog overview={spread} /> : null}
            <Link href="/app/calls/new" className={cn(buttonVariants(), 'max-lg:hidden')}>
              <Plus className="size-4" aria-hidden="true" /> Add prospect
            </Link>
          </>
        ) : null}
      </PageHeader>

      <CallsSubnav />

      {dashboard ? <CallerDashboard data={dashboard} name={me.full_name} week={snapshot?.week} /> : null}

      {isAdmin && board.length > 0 ? (
        <section aria-label="Team today" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Team today</h2>
            <Link href="/app/calls/stats" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Goals &amp; stats
            </Link>
          </div>
          <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            {board.map((r) => (
              <li key={r.id} className="shrink-0">
                <Link
                  href={`/app/calls/stats?caller=${r.id}`}
                  className="flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 hover:bg-accent"
                >
                  <GoalRing count={r.today} goal={r.goal} tier={tierFor(r.today, r.goal)} size={34} stroke={4} />
                  <span className="text-sm">
                    <span className="block font-medium leading-tight">{r.name.split(' ')[0]}</span>
                    <span className="block text-xs leading-tight text-muted-foreground tabular-nums">
                      {r.today}/{r.goal}
                      {r.streak > 0 ? ` · 🔥${r.streak}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {done ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Outcome saved. You have reached the end of your queue — nothing else is due right now.
        </p>
      ) : null}

      <ViewTabs current={view} isAdmin={isAdmin} />

      <ProspectFilters
        view={view}
        current={filters}
        callers={callers}
        isAdmin={isAdmin}
        options={options}
      />

      <ProspectsTable
        rows={result.rows}
        callers={callers}
        isAdmin={isAdmin}
        emptyHint={EMPTY_HINTS[view]}
        contextQuery={listContext}
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        params={{
          view,
          q: filters.q,
          caller: filters.caller,
          disposition: filters.disposition,
          city: filters.city,
          county: filters.county,
          service: filters.service,
          niche: filters.niche,
          callback: filters.callback,
          sort: filters.sort,
        }}
      />
    </div>
  );
}
