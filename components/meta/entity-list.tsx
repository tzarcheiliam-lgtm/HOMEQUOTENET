import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { EntityRow, Level } from '@/lib/data/meta-ads';
import { int, money, STATUS_TONE } from './format';

const child: Record<Level, string> = { campaign: 'ad sets', adset: 'ads', ad: 'leads', lead: '' };

/** Table on md+, stacked cards on phones. `href` builds the drill-down link for a row. */
export function EntityList({ rows, level, href, showSpend }: { rows: EntityRow[]; level: Level; href: (r: EntityRow) => string; showSpend: boolean }) {
  const cost = (v: number | null, r: EntityRow) => (v == null ? '—' : money(v, r.currency));
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={href(r)} className="block">
              <Card className="gap-2 p-4 active:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">{r.name}</p>
                  <Badge variant={STATUS_TONE[r.effectiveStatus ?? ''] ?? 'secondary'}>{(r.effectiveStatus ?? 'unknown').replaceAll('_', ' ').toLowerCase()}</Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  {showSpend && <div><dt className="text-xs text-muted-foreground">Spend</dt><dd className="tabular-nums">{r.meta ? money(r.meta.spend, r.currency) : '—'}</dd></div>}
                  <div><dt className="text-xs text-muted-foreground">Meta leads</dt><dd className="tabular-nums">{int(r.metaLeads)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">HQN leads</dt><dd className="tabular-nums">{int(r.hqn.leads)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Qualified</dt><dd className="tabular-nums">{int(r.hqn.qualified)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Booked</dt><dd className="tabular-nums">{int(r.hqn.appointments)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Won</dt><dd className="tabular-nums">{int(r.hqn.won)}</dd></div>
                </dl>
                <p className="text-xs text-muted-foreground">View {child[level]} →</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium" rowSpan={2}>{level === 'campaign' ? 'Campaign' : level === 'adset' ? 'Ad set' : 'Ad'}</th>
              <th className="px-4 py-1.5 text-center font-medium" colSpan={showSpend ? 4 : 2}>Meta-reported</th>
              <th className="border-l px-4 py-1.5 text-center font-medium" colSpan={showSpend ? 7 : 4}>HQN first-party (leads acquired in period)</th>
            </tr>
            <tr>
              {showSpend && <><th className="px-4 py-2 text-right font-medium">Spend</th><th className="px-4 py-2 text-right font-medium">Link clicks</th></>}
              <th className="px-4 py-2 text-right font-medium">Leads</th>
              {showSpend && <th className="px-4 py-2 text-right font-medium">Impr.</th>}
              {!showSpend && <th className="px-4 py-2 text-right font-medium">Status</th>}
              <th className="border-l px-4 py-2 text-right font-medium">Leads</th>
              <th className="px-4 py-2 text-right font-medium">Qualified</th>
              <th className="px-4 py-2 text-right font-medium">Booked</th>
              <th className="px-4 py-2 text-right font-medium">Won</th>
              {showSpend && <><th className="px-4 py-2 text-right font-medium">Cost/lead</th><th className="px-4 py-2 text-right font-medium">Cost/qual.</th><th className="px-4 py-2 text-right font-medium">Cost/won</th></>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="max-w-[22rem] px-4 py-3">
                  <Link href={href(r)} className="font-medium hover:underline">{r.name}</Link>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={STATUS_TONE[r.effectiveStatus ?? ''] ?? 'secondary'}>{(r.effectiveStatus ?? 'unknown').replaceAll('_', ' ').toLowerCase()}</Badge>
                    {r.objective && <span>{r.objective.replace('OUTCOME_', '').toLowerCase()}</span>}
                    {r.optimizationGoal && <span>optimizes for {r.optimizationGoal.replaceAll('_', ' ').toLowerCase()}</span>}
                  </p>
                </td>
                {showSpend && <><td className="px-4 py-3 text-right tabular-nums">{r.meta ? money(r.meta.spend, r.currency) : '—'}</td><td className="px-4 py-3 text-right tabular-nums">{int(r.meta?.linkClicks)}</td></>}
                <td className="px-4 py-3 text-right tabular-nums">{int(r.metaLeads)}</td>
                {showSpend && <td className="px-4 py-3 text-right tabular-nums">{int(r.meta?.impressions)}</td>}
                {!showSpend && <td className="px-4 py-3 text-right text-xs text-muted-foreground">{(r.status ?? '').toLowerCase()}</td>}
                <td className="border-l px-4 py-3 text-right tabular-nums">{int(r.hqn.leads)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{int(r.hqn.qualified)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{int(r.hqn.appointments)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{int(r.hqn.won)}</td>
                {showSpend && <><td className="px-4 py-3 text-right tabular-nums">{cost(r.costs?.perLead ?? null, r)}</td><td className="px-4 py-3 text-right tabular-nums">{cost(r.costs?.perQualified ?? null, r)}</td><td className="px-4 py-3 text-right tabular-nums">{cost(r.costs?.perWon ?? null, r)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
