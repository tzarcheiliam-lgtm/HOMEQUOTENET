import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listEmailTemplates } from '@/lib/data/email-templates';
import {
  duplicateEmailTemplateAction,
  activateEmailTemplateAction,
  deactivateEmailTemplateAction,
  seedDefaultEmailTemplatesAction,
} from '@/lib/actions/email-templates';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Email Templates · HomeQuote Network' };

export default async function EmailTemplatesPage() {
  const profile = await requireRole(['admin', 'contractor']);
  const templates = await listEmailTemplates();
  const grouped = new Map<string, typeof templates>();
  for (const t of templates) grouped.set(t.category, [...(grouped.get(t.category) ?? []), t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description={
          profile.role === 'admin'
            ? 'A branded, reusable library your team can send manually or hook up to workflows.'
            : 'Templates HomeQuote has made available to your account.'
        }
      >
        {profile.role === 'admin' && (
          <div className="flex gap-2">
            <form action={seedDefaultEmailTemplatesAction}>
              <Button type="submit" variant="outline">
                Restore default templates
              </Button>
            </form>
            <Button asChild>
              <Link href="/app/email-templates/new">New template</Link>
            </Button>
          </div>
        )}
      </PageHeader>

      {!templates.length ? (
        <EmptyState
          title="No templates yet"
          description={
            profile.role === 'admin'
              ? 'Restore the default HomeQuote library to get started, or create a custom template.'
              : 'Check back once HomeQuote makes templates available to your account.'
          }
        />
      ) : (
        Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((t) => (
                <Card key={t.id} className={!t.isActive ? 'opacity-60' : undefined}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/app/email-templates/${t.id}`} className="truncate text-sm font-semibold hover:underline">
                          {t.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.subject}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {t.isSystem && <Badge variant="outline">System</Badge>}
                        {t.contractorVisible && <Badge variant="outline">Contractor</Badge>}
                        <Badge variant={t.isActive ? 'success' : 'muted'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                    {t.description && <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/app/email-templates/${t.id}`}>{profile.role === 'admin' ? 'Edit' : 'Preview'}</Link>
                      </Button>
                      {profile.role === 'admin' && (
                        <>
                          <form action={duplicateEmailTemplateAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Duplicate
                            </Button>
                          </form>
                          <form action={t.isActive ? deactivateEmailTemplateAction : activateEmailTemplateAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <Button type="submit" size="sm" variant="outline">
                              {t.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
