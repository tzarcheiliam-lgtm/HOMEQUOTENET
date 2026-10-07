import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Archive, ArchiveRestore, Trash2, ChevronDown, MessageSquare, Mail, StickyNote } from 'lucide-react';
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
import { LeadActionBar } from '@/components/leads/lead-action-bar';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { sheetRowClass } from '@/components/mobile/mobile-card';
import { telHref } from '@/lib/leads/lead-emails';
import { getLeadDistribution, listRecipients } from '@/lib/data/lead-distribution';
import { canManageSigning, isContractorOwner } from '@/lib/permissions';
import { DocumentsPanel } from '@/components/signing/documents-panel';
import { OutcomeHistory } from '@/components/leads/outcome-history';

export const metadata = { title: 'Lead · HomeQuote Network' };

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value || '—'}</span>
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
  const tel = lead.phone ? telHref(lead.phone) : null;
  const destination = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ');
  const directionsHref =
    lead.address || (lead.city && lead.zip)
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      : null;

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        title={name}
        description={[serviceSummary, locationSummary].filter(Boolean).join('  ·  ')}
        backHref="/app/leads"
        backLabel="Leads"
      >
        {isStaff ? (
          <div className="max-lg:hidden">
            <StatusSelect leadId={lead.id} status={lead.status} />
          </div>
        ) : null}
        <Badge
          variant={leadStatusVariant(lead.status)}
          className={isStaff ? 'lg:hidden' : undefined}
        >
          {LEAD_STATUS_LABELS[lead.status]}
        </Badge>
        <Badge variant={qualificationVariant(lead.qualification_status)}>
          {QUALIFICATION_STATUS_LABELS[lead.qualification_status]}
        </Badge>
        {lead.archived_at && <Badge variant="muted">Archived</Badge>}
        {age && (
          <span className="text-xs text-muted-foreground">Received {age} ago</span>
        )}

        <div className="hidden lg:block">
          <CallTextActions phone={lead.phone} size="sm" />
        </div>

        {isStaff && (
          <div className="contents max-lg:hidden">
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
              <ConfirmAction
                action={deleteLead}
                fields={{ id: lead.id }}
                triggerLabel={
                  <>
                    <Trash2 className="size-4" /> Delete
                  </>
                }
                triggerVariant="destructive-outline"
                title="Delete this lead?"
                description="This permanently removes the lead and its history. This cannot be undone."
                confirmLabel="Delete lead"
                destructive
              />
            )}
          </div>
        )}
      </PageHeader>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-5">
        {/* Left: lead info. On phones the column wrappers dissolve (contents)
            and the cards are re-ordered so what a call needs comes first. */}
        <div className="contents lg:col-span-1 lg:block lg:space-y-6">
          <div className="order-1 lg:order-none">
          <ContactCard
            phone={lead.phone}
            email={lead.email}
            address={lead.address}
            city={lead.city}
            state={lead.state}
            zip={lead.zip}
          />
          </div>

          <div className="order-2 lg:order-none">
          <ProjectSummaryCard
            verticalName={lead.vertical?.name}
            subServiceName={lead.sub_service?.name}
            budgetRange={lead.budget_range}
            timeline={lead.timeline}
            zip={lead.zip}
            description={lead.project_description}
          />
          </div>

          {/* Attribution — internal HomeQuote routing detail, staff only */}
          {isStaff && (
            <Card className="order-[8] lg:order-none">
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
                  <Row label="Placement" value={lead.placement} />
                  <Row label="UTM source" value={lead.utm_source} />
                  <Row label="UTM medium" value={lead.utm_medium} />
                  <Row label="UTM campaign" value={lead.utm_campaign} />
                  <Row label="UTM content" value={lead.utm_content} />
                  <Row label="UTM term" value={lead.utm_term} />
                  <Row label="Landing page" value={lead.landing_page_url} />
                  {lead.service_area_valid !== null && (
                    <Row
                      label="Service area"
                      value={
                        <Badge variant={lead.service_area_valid ? 'success' : 'warning'}>
                          {lead.service_area_valid ? 'Valid' : 'Outside service area'}
                        </Badge>
                      }
                    />
                  )}
                </CardContent>
              </details>
            </Card>
          )}

          {/* Consent (TCPA) — staff only; contractors don't need this detail */}
          {isStaff && (
            <Card className="order-[9] lg:order-none">
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
            <Card className="order-[10] lg:order-none">
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
        <div className="contents lg:col-span-2 lg:block lg:space-y-6">
          {/* Qualification — a clear 2-step workflow for staff */}
          <Card className="order-3 lg:order-none">
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

          <OutcomeHistory leadId={lead.id} isAdmin={isAdmin} />

          {/* Review & send: new leads go to the HomeQuote team first; a
              person qualifies them, then chooses who receives them. */}
          {isStaff && distribution && (
            <Card className="order-4 lg:order-none">
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
          <Card id="assignments" className="order-5 scroll-mt-20 lg:order-none">
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

          {canManageSigning(profile) && <DocumentsPanel leadId={lead.id} className="order-[7] lg:order-none" />}

          {/* Notes & activity */}
          <Card id="notes" className="order-6 scroll-mt-20 lg:order-none">
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
          <Card className="order-7 lg:order-none">
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
                        className="min-w-0 break-words py-2 text-primary hover:underline"
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
                        <Button type="submit" variant="ghost" size="icon" aria-label={`Delete attachment ${att.name}`}>
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

      {/* Phone action bar: Call · Directions · Status · More */}
      <LeadActionBar
        leadId={lead.id}
        status={lead.status}
        tel={tel}
        directionsHref={directionsHref}
        canChangeStatus={isStaff}
        more={
          <>
            {tel ? (
              <a href={tel.replace('tel:', 'sms:')} className={sheetRowClass}>
                <MessageSquare className="size-4" aria-hidden="true" /> Text homeowner
              </a>
            ) : null}
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className={sheetRowClass}>
                <Mail className="size-4" aria-hidden="true" /> Email homeowner
              </a>
            ) : null}
            <a href="#notes" className={sheetRowClass}>
              <StickyNote className="size-4" aria-hidden="true" /> Add a note
            </a>
            {isStaff ? (
              <>
                <Link href={`/app/leads/${lead.id}/edit`} className={sheetRowClass}>
                  <Pencil className="size-4" aria-hidden="true" /> Edit lead
                </Link>
                <form action={lead.archived_at ? unarchiveLead : archiveLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <button type="submit" className={sheetRowClass}>
                    {lead.archived_at ? (
                      <ArchiveRestore className="size-4" aria-hidden="true" />
                    ) : (
                      <Archive className="size-4" aria-hidden="true" />
                    )}
                    {lead.archived_at ? 'Restore lead' : 'Archive lead'}
                  </button>
                </form>
              </>
            ) : null}
            {isAdmin ? (
              <ConfirmAction
                action={deleteLead}
                fields={{ id: lead.id }}
                triggerLabel={
                  <>
                    <Trash2 className="size-4" aria-hidden="true" /> Delete lead
                  </>
                }
                triggerVariant="outline"
                triggerClassName="h-12 w-full justify-start rounded-xl px-4 text-destructive"
                title="Delete this lead?"
                description="This permanently removes the lead and its history. This cannot be undone."
                confirmLabel="Delete lead"
                destructive
              />
            ) : null}
          </>
        }
      />
    </div>
  );
}
