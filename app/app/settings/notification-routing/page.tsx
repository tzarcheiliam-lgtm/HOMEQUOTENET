import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resetRoutingRule, saveRoutingRule } from '@/lib/actions/notification-routing';
import {
  ALLOWED_AUDIENCES,
  AUDIENCE_LABELS,
  DEFAULT_ROUTING,
  NOTIFICATION_TYPES,
  type RoutingRule,
} from '@/lib/notifications/types';

export const metadata = { title: 'Notification routing · HomeQuote Network' };

export default async function NotificationRoutingPage() {
  await requireRole(['admin']);
  const supabase = await createClient();
  const [{ data: rules }, { data: staff }] = await Promise.all([
    supabase.from('notification_routing_rules').select('*'),
    // Only HomeQuote staff are ever selectable. Contractor users (of any company) are never listed.
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'setter', 'caller'])
      .eq('is_active', true)
      .order('full_name'),
  ]);
  const saved = new Map((rules ?? []).map((r: RoutingRule & { type: string }) => [r.type, r]));
  const people = (staff ?? []) as { id: string; full_name: string | null; email: string | null; role: string }[];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notification routing"
        description="Choose exactly who each alert goes to. “Assigned” means the person tied to that specific lead, appointment or prospect — never everyone with a role. Contractors only ever receive alerts for their own company."
        backHref="/app/settings/notifications"
        backLabel="Notification settings"
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {NOTIFICATION_TYPES.map((t) => {
          const rule = saved.get(t.id) ?? DEFAULT_ROUTING[t.id];
          const isCustom = saved.has(t.id);
          const chosen = new Set(rule.specific_user_ids ?? []);
          return (
            <Card key={t.id} className="p-4">
              <form action={saveRoutingRule} className="space-y-3">
                <input type="hidden" name="type" value={t.id} />
                <div>
                  <h2 className="text-base font-semibold">{t.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t.description} {isCustom ? '' : '(default routing)'}
                  </p>
                </div>
                <fieldset className="grid gap-1 sm:grid-cols-2">
                  <legend className="sr-only">Recipients</legend>
                  {ALLOWED_AUDIENCES[t.id].map((a) => (
                    <label key={a} className="flex min-h-11 items-center gap-3 text-sm">
                      <input type="checkbox" name={a} defaultChecked={rule[a]} className="size-5" />
                      {AUDIENCE_LABELS[a]}
                    </label>
                  ))}
                </fieldset>
                <details className="rounded-lg border">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
                    Specific team members{chosen.size ? ` (${chosen.size})` : ''}
                  </summary>
                  <div className="grid gap-1 border-t p-2 sm:grid-cols-2">
                    {people.map((p) => (
                      <label key={p.id} className="flex min-h-11 items-center gap-3 px-1 text-sm">
                        <input type="checkbox" name="specific_user_ids" value={p.id} defaultChecked={chosen.has(p.id)} className="size-5" />
                        <span className="min-w-0 truncate">
                          {p.full_name || p.email} <span className="text-muted-foreground">· {p.role}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save</Button>
                  {isCustom ? (
                    <Button type="submit" formAction={resetRoutingRule} variant="outline">
                      Reset to default
                    </Button>
                  ) : null}
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
