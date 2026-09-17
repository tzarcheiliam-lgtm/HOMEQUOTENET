import {
  Bell,
  Phone,
  CalendarCheck,
  FileText,
  CircleCheck,
  ShieldCheck,
  Send,
  Info,
} from 'lucide-react';
import { disclaimers } from '@/content/site';
import { Section, SectionHeading } from './primitives';

/**
 * SYSTEM PREVIEW.
 *
 * Every value rendered here is illustrative interface furniture, not data from
 * any client, campaign, or contractor. The section is labelled as an example in
 * three places (badge, heading lead, and footnote) and all names/locations are
 * deliberately generic placeholders.
 *
 * Do not replace these with real numbers unless the numbers are verified and
 * the contractor has given written permission — see
 * sales-assets/PROOF_ASSET_CHECKLIST.md.
 */

const flow = [
  { label: 'Homeowner Inquiry', icon: Send },
  { label: 'Lead Verification', icon: ShieldCheck },
  { label: 'Contractor Delivery', icon: Bell },
  { label: 'Fast Follow-Up', icon: Phone },
  { label: 'Estimate', icon: FileText },
  { label: 'Sale Tracking', icon: CircleCheck },
];

function ExampleBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
      <Info className="size-3" aria-hidden="true" />
      Example
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-[var(--hq-text-dim)]">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-[var(--hq-text)]">
        {value}
      </dd>
    </div>
  );
}

export function SystemPreview() {
  return (
    <Section id="system">
      <SectionHeading
        eyebrow="System preview"
        title="How a lead moves through the system."
        lead="The interface below is an example workflow that shows the stages a lead passes through and the information recorded at each one. It is a design preview, not client data or reported results."
      />

      {/*
        Pipeline flow as an even grid rather than a wrapping row. A flex row
        orphaned the last stage onto its own line at desktop and needed a
        hidden side-scroller on mobile; a grid lays out cleanly at every width.
      */}
      <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {flow.map((stage, i) => (
          <li
            key={stage.label}
            className="relative flex flex-col items-center gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 py-5 text-center"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)]">
              <stage.icon
                className="size-4 text-[var(--hq-accent-bright)]"
                aria-hidden="true"
              />
            </span>
            <span className="text-sm font-medium leading-5 text-[var(--hq-text)]">
              {stage.label}
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-[var(--hq-text-dim)]">
              {String(i + 1).padStart(2, '0')}
            </span>
          </li>
        ))}
      </ol>

      {/* Mock interface cards */}
      <div className="mt-10 grid gap-5 lg:grid-cols-12">
        {/* New lead notification */}
        <div className="hq-card p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--hq-accent-glow)] text-[var(--hq-accent-bright)]">
                <Bell className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--hq-text)]">
                  New lead delivered
                </p>
                <p className="text-xs text-[var(--hq-text-dim)]">
                  Sent to your team
                </p>
              </div>
            </div>
            <ExampleBadge />
          </div>

          {/* Both delivery formats, so the card shows the real choice on offer. */}
          <div className="mt-5 space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--hq-text-dim)]">
                Email
              </p>
              <div className="rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4">
                <p className="text-sm leading-6 text-[var(--hq-text-muted)]">
                  New pool remodeling lead in your service area. Project:{' '}
                  <span className="text-[var(--hq-text)]">
                    resurfacing and tile
                  </span>
                  . Contact details attached.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--hq-text-dim)]">
                SMS
              </p>
              <div className="rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4">
                <p className="text-sm leading-6 text-[var(--hq-text-muted)]">
                  New lead — pool resurfacing, approved area. Call now.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[var(--hq-text-dim)]">
            <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[var(--hq-good)]" />
            Email, SMS, or direct delivery into your CRM. Confirmed during
            onboarding.
          </div>
        </div>

        {/* Lead details */}
        <div className="hq-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--hq-text)]">
              Lead record
            </p>
            <ExampleBadge />
          </div>

          <dl className="mt-3 divide-y divide-[var(--hq-line)]">
            <Field label="Homeowner" value="Example Homeowner" />
            <Field label="Project category" value="Resurfacing + tile & coping" />
            <Field label="Service area" value="Approved county — Example city" />
            <Field label="Property type" value="Single-family residence" />
            <Field label="Source" value="Paid social campaign" />
            <Field label="Status" value="Delivered" />
          </dl>

          <p className="mt-4 text-xs leading-5 text-[var(--hq-text-dim)]">
            Fields shown are the record structure. Actual fields available on a
            given lead depend on the form and the campaign.
          </p>
        </div>

        {/* Status timeline */}
        <div className="hq-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--hq-text)]">
              Lead status timeline
            </p>
            <ExampleBadge />
          </div>

          <ol className="mt-5 space-y-4">
            {[
              { icon: Bell, label: 'Lead delivered', note: 'Recorded with timestamp' },
              { icon: Phone, label: 'Contact attempt', note: 'Logged by contractor' },
              { icon: CalendarCheck, label: 'Appointment set', note: 'If the homeowner books' },
              { icon: FileText, label: 'Estimate provided', note: 'Contractor-reported' },
              { icon: CircleCheck, label: 'Won / lost', note: 'Contractor-reported outcome' },
            ].map((row) => (
              <li key={row.label} className="flex items-start gap-3.5">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--hq-line)] bg-[var(--hq-surface-2)] text-[var(--hq-text-muted)]">
                  <row.icon className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--hq-text)]">
                    {row.label}
                  </p>
                  <p className="text-xs text-[var(--hq-text-dim)]">{row.note}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-5 text-xs leading-5 text-[var(--hq-text-dim)]">
            Stages after delivery depend on contractor reporting. No outcome
            shown here is promised or typical.
          </p>
        </div>

        {/* Verification card */}
        <div className="hq-card p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--hq-text)]">
              Verification checks
            </p>
            <ExampleBadge />
          </div>

          <ul className="mt-5 space-y-3">
            {[
              'Decision-maker confirmed',
              'Contact details present',
              'Inside approved service area',
              'Matches agreed project types',
              'Duplicate rules applied',
            ].map((check) => (
              <li
                key={check}
                className="flex items-center gap-3 text-sm text-[var(--hq-text-muted)]"
              >
                <CircleCheck
                  className="size-4 shrink-0 text-[var(--hq-good)]"
                  aria-hidden="true"
                />
                {check}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs leading-5 text-[var(--hq-text-dim)]">
            The exact checklist applied to your account is the standard written
            into your agreement.
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--hq-text-dim)]">
        {disclaimers.systemPreview}
      </p>
    </Section>
  );
}
