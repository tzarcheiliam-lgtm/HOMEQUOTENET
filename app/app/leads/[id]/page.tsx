import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Archive, ArchiveRestore, Trash2, ChevronDown } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { getLead, listAssignableCompanyUsers } from '@/lib/data/leads';
import { listContractorOptions } from '@/lib/data/contractors';
import {
  archiveLead,
  unarchiveLead,
  deleteLead,
  deleteAttachment,
} from '@/lib/actions/leads';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  QUALIFICATION_STATUS_LABELS,
  leadStatusVariant,
  qualificationVariant,
} from '@/lib/leads/constants';
import { displayValue, formatLeadAge, humanizeToken } from '@/lib/leads/display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusSelect } from '@/components/leads/status-select';
import { QualificationForm } from '@/components/leads/qualification-form';
import { ContactForm } from '@/components/leads/contact-form';
import { NoteForm } from '@/components/leads/note-form';
import { AttachmentForm } from '@/components/leads/attachment-form';
import { AssignmentManager } from '@/components/leads/assignment-manager';
import { ActivityTimeline } from '@/components/leads/activity-timeline';
import { LeadDistributionPanel } from '@/components/leads/lead-distribution-panel';
import { ContactCard } from '@/components/leads/contact-card';
import { ProjectSummaryCard } from '@/components/leads/project-summary-card';
import { CallTextActions } from '@/components/leads/lead-quick-actions';
import { getLeadDistribution, listRecipients } from '@/lib/data/lead-distribution';
import { isContractorOwner } from '@/lib/permissions';

export const metadata = { title: 'Lead · HomeQuote Network' };

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;

  const detail = await getLead(id);
  if (!detail) notFound();

  const { lead, assignments, activities, attachments } = detail;
  const isStaff = profile.role === 'admin' || profile.role === 'setter';
  const isAdmin = profile.role === 'admin';
  const canAssignUsers = isAdmin || isContractorOwner(profile);

  const [contractors, distribution, recipients] = isStaff
    ? await Promise.all([
        listContractorOptions(),
        getLeadDistribution(lead.id, lead.qualified_by),
        listRecipients({ activeOnly: true }),
      ])
    : [[], null, []];
  const companyUsers = canAssignUsers ? await listAssignableCompanyUsers() : [];

  const name =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    lead.phone ||
    'Unnamed lead';

  const serviceSummary =
    [lead.vertical?.name, lead.sub_service?.name].filter(Boolean).join(' · ') ||
    undefined;
  const locationSummary = [lead.zip, lead.city].filter(Boolean).join(' · ') || undefined;
  const age = formatLeadAge(lead.created_at);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <PageHeader
        title={name}
        description={[serviceSummary, locationSummary].filter(Boolean).join('  ·  ')}
        backHref="/app/leads"
        backLabel="Leads"
      >
        {isStaff ? (
          <StatusSelect leadId={lead.id} status={lead.status} />
        ) : (
          <Badge variant={leadStatusVariant(lead.status)}>
            {LEAD_STATUS_LABELS[lead.status]}
          </Badge>
        )}
        <Badge variant={qualificationVariant(lead.qualification_status)}>
          {QUALIFICATION_STATUS_LABELS[lead.qualification_status]}
        </Badge>
        {lead.archived_at && <Badge variant="muted">Archived</Badge>}
        {age && (
          <span className="text-xs text-muted-foreground">Received {age} ago</span>
        )}

        <div className="hidden md:block">
          <CallTextActions phone={lead.phone} size="sm" />
        </div>

        {isStaff && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/leads/${lead.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            {lead.archived_at ? (
              <form action={unarchiveLead}>
                <input type="hidden" name="id" value={lead.id} />
                <Button type="submit" variant="outline" size="sm">
                  <ArchiveRestore className="size-4" /> Restore
                </Button>
              </form>
            ) : (
              <form action={archiveLead}>
                <input type="hidden" name="id" value={lead.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Archive className="size-4" /> Archive
                </Button>
              </form>
            )}
            {isAdmin && (
              <form action={deleteLead}>
                <input type="hidden" name="id" value={lead.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 className="size-4" /> Delete
                </Button>
              </form>
            )}
          </>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: lead info */}
        <div className="space-y-6 lg:col-span-1">
          <ContactCard
            phone={lead.phone}
            email={lead.email}
            address={lead.address}
            city={lead.city}
            state={lead.state}
            zip={lead.zip}
          />

          <ProjectSummaryCard
            verticalName={lead.vertical?.name}
            subServiceName={lead.sub_service?.name}
            budgetRange={lead.budget_range}
            timeline={lead.timeline}
            zip={lead.zip}
            description={lead.project_description}
          />

          {/* Attribution — internal HomeQuote routing detail, staff only */}
          {isStaff && (
            <Card>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  Attribution
                  <ChevronDown className="size-4 text-muted-foreground transition-transform [details[open]_&]:rotate-180" />
                </summary>
                <CardContent className="pt-4">
                  <Row
                    label="Source"
                    value={
                      lead.source
                        ? LEAD_SOURCE_LABELS[lead.source] ?? lead.source
                        : null
                    }
                  />
                  <Row label="Campaign" value={lead.campaign} />
                  <Row label="Ad set" value={lead.ad_set} />
                  <Row label="Ad name" value={lead.ad_name} />
                  <Row label="UTM source" value={lead.utm_source} />
                  <Row label="UTM medium" value={lead.utm_medium} />
                  <Row label="UTM campaign" value={lead.utm_campaign} />
                </CardContent>
              </details>
            </Card>
          )}

          {/* Consent (TCPA) — staff only; contractors don't need this detail */}
          {isStaff && (
            <Card>
              <CardHeader>
                <CardTitle>Consent</CardTitle>
              </CardHeader>
              <CardContent>
                <Row
                  label="Consent to contact"
                  value={
                    <Badge variant={lead.consent_granted ? 'success' : 'muted'}>
                      {lead.consent_granted ? 'Granted' : 'Not on file'}
                    </Badge>
                  }
                />
                <Row
                  label="When"
                  value={
                    lead.consent_at
                      ? new Date(lead.consent_at).toLocaleString()
                      : null
                  }
                />
                <Row label="Source" value={lead.consent_source} />
                <Row label="Disclosure" value={lead.consent_disclosure} />
              </CardContent>
            </Card>
          )}

          {/* Economics — admin only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Economics</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Lead cost" value={money(lead.lead_cost)} />
                <Row
                  label="Est. job value"
                  value={money(lead.estimated_job_value)}
                />
                <Row label="Actual revenue" value={money(lead.actual_revenue)} />
                <Row label="Commission" value={money(lead.commission)} />
                <Row label="Profit" value={money(lead.profit)} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: workflow */}
        <div className="space-y-6 lg:col-span-2">
          {/* Qualification — a clear 2-step workflow for staff */}
          <Card>
            <CardHeader>
              <CardTitle>Qualification</CardTitle>
            </CardHeader>
            <CardContent>
              {isStaff ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                        1
                      </span>
                      Review the lead
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                        2
                      </span>
                      Confirm qualification
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                        3
                      </span>
                      Send below
                    </span>
                  </div>
                  <QualificationForm lead={lead} />
                </div>
              ) : (
                <div>
                  <Row
                    label="Qualified"
                    value={lead.qualified ? 'Yes' : 'No'}
                  />
                  <Row label="Budget" value={displayValue(lead.budget_range && humanizeToken(lead.budget_range))} />
                  <Row label="Timeline" value={displayValue(lead.timeline && humanizeToken(lead.timeline))} />
                  <Row label="Urgency" value={displayValue(lead.urgency && humanizeToken(lead.urgency))} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review & send: new leads go to the HomeQuote team first; a
              person qualifies them, then chooses who receives them. */}
          {isStaff && distribution && (
            <Card>
              <CardHeader>
                <CardTitle>Review &amp; send</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadDistributionPanel
                  lead={lead}
                  distribution={distribution}
                  recipients={recipients}
                  isAdmin={isAdmin}
                />
              </CardContent>
            </Card>
          )}

          {/* Assignment / distribution */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isStaff ? 'Contractor assignments' : 'Your assignment'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentManager
                leadId={lead.id}
                assignments={assignments}
                contractors={contractors}
                canManage={isAdmin}
                canUnassign={isAdmin}
                isAdmin={isAdmin}
                companyUsers={companyUsers}
                canAssignUsers={canAssignUsers}
              />
            </CardContent>
          </Card>

          {/* Notes & activity */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ContactForm leadId={lead.id} />
              <NoteForm leadId={lead.id} canChooseVisibility={isStaff} />
              <div className="border-t pt-4">
                <ActivityTimeline activities={activities} />
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AttachmentForm leadId={lead.id} />
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {att.name}
                      </a>
                      <form action={deleteAttachment}>
                        <input
                          type="hidden"
                          name="attachment_id"
                          value={att.id}
                        />
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky mobile action bar */}
      {lead.phone && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-background/95 p-3 backdrop-blur md:hidden">
          <CallTextActions phone={lead.phone} size="default" className="flex-1 [&>*]:flex-1" />
        </div>
      )}
    </div>
  );
}
