import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { smsConfigured } from '@/lib/sms/config';
import { SMS_STATUS_LABELS } from '@/lib/sms/labels';
import { setSmsEnabled } from '@/lib/actions/sms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SmsSettingsForm } from '@/components/texting/settings-form';
import { SmsBotForm } from '@/components/texting/bot-form';
import { MAX_EXTRA_INSTRUCTIONS } from '@/lib/sms/agent';
import { SENDER_HOUSE } from '@/lib/sms/rules';
import { RemindersForm, type ReminderFormValue } from '@/components/texting/reminders-form';
import { reminderConfig } from '@/lib/sms/reminder-config';
import { FOLLOW_UP_STEPS, MEETING_STEPS } from '@/lib/sms/reminder-plan';

/** Merged settings for the switches, but only the CUSTOM wording in the text boxes (blank = the standard text). */
function reminderFormValue(raw: unknown): ReminderFormValue {
  const cfg = reminderConfig(raw);
  const r = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const custom = <K extends string>(t: unknown, keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, typeof r(t)[k] === 'string' ? (r(t)[k] as string) : ''])) as Record<K, string>;
  const raw_ = r(raw);
  return {
    contractor: { enabled: cfg.contractor.enabled, host: String(r(raw_.contractor).host ?? ''), brand: String(r(raw_.contractor).brand ?? ''), templates: custom(r(raw_.contractor).templates, MEETING_STEPS) },
    homeowner: { enabled: cfg.homeowner.enabled, templates: custom(r(raw_.homeowner).templates, MEETING_STEPS) },
    followups: { enabled: cfg.followups.enabled, days: cfg.followups.days, keepGoing: cfg.followups.keepGoing, everyDays: cfg.followups.everyDays, templates: custom(r(raw_.followups).templates, FOLLOW_UP_STEPS) },
    unconfirmedAlert: cfg.unconfirmedAlert,
    recovery: cfg.recovery,
  };
}

export const metadata = { title: 'Texting · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function TextingPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const [{ data: settings }, { data: convos }] = await Promise.all([
    db.from('sms_settings').select('*').eq('id', true).maybeSingle(),
    db.from('sms_conversations').select('*').order('updated_at', { ascending: false }).limit(60),
  ]);
  const s = settings ?? { enabled: false, stopped_at: null, bridge_last_seen_at: null, window_start_hour: 8, window_end_hour: 21, daily_cap: 200, contractor_funnels_enabled: false, bot_extra_instructions: null, house_sender_name: null, opening_template: null, first_text_delay_minutes: 0, max_ai_turns: 14, max_ai_replies_per_day: 150 };
  const seen = s.bridge_last_seen_at ? new Date(s.bridge_last_seen_at) : null;
  const bridgeUp = !!seen && Date.now() - +seen < 60_000;
  const rows = convos ?? [];
  // A conversation is with a homeowner lead, or (reminder texts) with a contractor prospect about a sales meeting.
  const leadIds = rows.map((r) => r.lead_id as string | null).filter((x): x is string => !!x);
  const prospectIds = rows.map((r) => (r as { prospect_id?: string | null }).prospect_id).filter((x): x is string => !!x);
  const [{ data: leads }, { data: prospects }] = await Promise.all([
    leadIds.length ? db.from('leads').select('id,first_name,last_name').in('id', leadIds) : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null }[] }),
    prospectIds.length ? db.from('contractor_prospects').select('id,company_name').in('id', prospectIds) : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
  ]);
  const names = new Map<string, string>([
    ...(leads ?? []).map((l) => [l.id as string, [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead'] as [string, string]),
    ...(prospects ?? []).map((p) => [p.id as string, (p.company_name as string) || 'Contractor'] as [string, string]),
  ]);
  const { count: waiting } = await db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'queued').lte('send_after', new Date().toISOString());
  const live = !!s.enabled && !s.stopped_at;

  return (
    <div className="space-y-6">
      <PageHeader title="Texting" description="New form leads get a text from your Mac right away. The assistant asks whether they want a call or to text, and qualifies them." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Automatic texting</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className={`text-lg font-semibold ${live ? 'text-emerald-600' : 'text-muted-foreground'}`}>{live ? 'ON' : 'OFF'}</p>
          <form action={setSmsEnabled}><input type="hidden" name="enabled" value={live ? 'false' : 'true'} />
            <Button type="submit" variant={live ? 'destructive' : 'default'} size="sm">{live ? 'Stop all texting' : 'Turn on'}</Button></form>
          {live && <p className="text-xs text-muted-foreground">Stopping also cancels anything waiting to send.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Mac bridge</CardTitle></CardHeader><CardContent className="space-y-1">
          <p className={`text-lg font-semibold ${bridgeUp ? 'text-emerald-600' : 'text-destructive'}`}>{bridgeUp ? 'Connected' : 'Not connected'}</p>
          <p className="text-xs text-muted-foreground">{seen ? `Last check-in ${seen.toLocaleString()}` : 'It has never checked in.'}</p>
          {!!waiting && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{waiting} text{waiting === 1 ? '' : 's'} waiting to send</p>}
          {!bridgeUp && <p className="text-xs text-muted-foreground">Texts wait in line until the Mac bridge is running. Setup: scripts/mac-sms-bridge/README.md</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Setup check</CardTitle></CardHeader><CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>Bridge secret (SMS_BRIDGE_TOKEN): <b className={smsConfigured() ? 'text-emerald-600' : 'text-destructive'}>{smsConfigured() ? 'set' : 'missing'}</b></p>
          <p>AI key (ANTHROPIC_API_KEY): <b className={process.env.ANTHROPIC_API_KEY?.trim() ? 'text-emerald-600' : 'text-destructive'}>{process.env.ANTHROPIC_API_KEY?.trim() ? 'set' : 'missing'}</b></p>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader><CardContent><SmsSettingsForm settings={s} /></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">What the assistant says</CardTitle></CardHeader><CardContent>
        <SmsBotForm instructions={s.bot_extra_instructions ?? ''} senderName={s.house_sender_name ?? ''} defaultName={SENDER_HOUSE} max={MAX_EXTRA_INSTRUCTIONS}
          template={s.opening_template ?? ''} />
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Reminders &amp; follow-ups</CardTitle></CardHeader><CardContent>
        {'reminder_config' in (settings ?? {}) ? <RemindersForm value={reminderFormValue((settings as { reminder_config?: unknown }).reminder_config)} />
          : <p className="text-sm text-muted-foreground">Run database migration 0068 to turn on reminder texts and follow-ups.</p>}
      </CardContent></Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Conversations</h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No text conversations yet. They start automatically when a new lead submits a funnel.</p> : (
          <ul className="divide-y rounded-lg border">
            {rows.map((r) => { const pid = (r as { prospect_id?: string | null }).prospect_id; return (
              <li key={r.id as string}><Link href={pid ? `/app/calls/${pid}` : `/app/leads/${r.lead_id}#texts`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-accent">
                <span><span className="font-medium">{names.get((pid ?? r.lead_id) as string)}</span> {pid && <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Contractor</span>} <span className="text-xs text-muted-foreground">as {r.sender_name as string}</span>
                  {r.summary && <span className="block max-w-xl truncate text-xs text-muted-foreground">{r.summary as string}</span>}</span>
                <span className="flex items-center gap-2 text-xs">
                  {r.qualification !== 'unknown' && <span className="rounded-full border px-2 py-0.5">{r.qualification as string}</span>}
                  <span className={`rounded-full border px-2 py-0.5 ${r.status === 'handoff' ? 'border-amber-500 text-amber-700 dark:text-amber-300' : ''}`}>{SMS_STATUS_LABELS[r.status as string] ?? (r.status as string)}</span>
                </span>
              </Link></li>
            ); })}
          </ul>
        )}
      </section>
    </div>
  );
}
