import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { funnelSchema } from '@/lib/funnels/schema';
import { conversion, type FunnelCounts } from '@/lib/funnels/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata = { title: 'Funnels · HomeQuote Network' };
export default async function FunnelsPage() {
  await requireRole(['admin']);
  const db = createAdminClient();
  const { data: funnels, error } = await db.from('funnels').select('id,slug,config,is_demo,published').order('created_at');
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  return <div className="space-y-6"><PageHeader title="Lead funnels" description="Last 30 days · Unique sessions, from first question to sale." />
    {error && <Card><CardContent className="p-6">Funnel reporting is unavailable. Apply migration 0012 and check the database connection.</CardContent></Card>}
    {!error && !funnels?.length && <Card><CardContent className="p-6">No funnels published yet. Follow FUNNELS.md to publish a client configuration.</CardContent></Card>}
    {await Promise.all((funnels ?? []).map(async funnel => {
      const config = funnelSchema.parse(funnel.config);
      const { data, error: reportError } = await db.rpc('funnel_report', { p_funnel: funnel.id, p_since: since });
      if (reportError) return <Card key={funnel.id}><CardContent className="p-6">Unable to load {funnel.slug} reporting.</CardContent></Card>;
      const events = data.events as FunnelCounts;
      const count = (event: string, step = '') => events.find(e => e.event === event && e.step_id === step)?.total ?? 0;
      const stages = [
        ['Landing views', count('landing_view')], ['Started funnel', count('session_started')],
        ['Questions completed', count('step_viewed', 'qualification')], ['Contact submitted', count('contact_submitted')],
        ['Qualified leads', count('qualified')], ['Calendar viewed', count('calendar_viewed')],
        ['Appointment booked', count('appointment_booked')], ['Showed', data.showed], ['Sold', data.sold],
      ] as [string, number][];
      return <div key={funnel.id} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{config.clientName} · {config.industry}{funnel.is_demo ? ' (Demo)' : ''}</h2><Link className="text-sm underline" href={`/estimate/${funnel.slug}`} target="_blank">Open funnel ↗</Link></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><KpiCard label="Landing views" value={count('landing_view')} /><KpiCard label="Contacts" value={count('contact_submitted')} /><KpiCard label="Qualified" value={count('qualified')} /><KpiCard label="Booked" value={count('appointment_booked')} /></div>
        <Card><CardHeader><CardTitle>Conversion stages</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Stage</TableHead><TableHead>Sessions</TableHead><TableHead>From prior stage</TableHead><TableHead>From landing</TableHead></TableRow></TableHeader><TableBody>{stages.map(([label, value], i) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell>{value}</TableCell><TableCell>{i ? conversion(value, stages[i - 1][1]) : '—'}</TableCell><TableCell>{conversion(value, stages[0][1])}</TableCell></TableRow>)}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Ad clicks require a future ad-platform import; landing sessions are not ad clicks. Downstream stages can skip a prior stage (for example a sale without a recorded showing), so ratios can exceed 100%.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Question dropoff</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Viewed</TableHead><TableHead>Completed</TableHead><TableHead>Completion</TableHead><TableHead>Dropoff</TableHead></TableRow></TableHeader><TableBody>{config.questions.map(q => { const viewed = count('step_viewed', q.id); const completed = count('step_completed', q.id); return <TableRow key={q.id}><TableCell>{q.headline}{q.showWhen.length ? ' (conditional)' : ''}</TableCell><TableCell>{viewed}</TableCell><TableCell>{completed}</TableCell><TableCell>{conversion(completed, viewed)}</TableCell><TableCell>{conversion(Math.max(0, viewed - completed), viewed)}</TableCell></TableRow>; })}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Branch questions use only sessions that saw that question. Each session is counted once per event. In-progress sessions are included.</p></CardContent></Card>
        <p className="text-sm text-muted-foreground">CRM queue: {data.pending} pending · {data.failed} failed. Configure scheduled delivery retries as described in FUNNELS.md.</p>
      </div>;
    }))}
  </div>;
}
