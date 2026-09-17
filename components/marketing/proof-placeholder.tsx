import { ImagePlus } from 'lucide-react';
import { Section, SectionHeading, Container } from './primitives';

/**
 * PROOF-ASSET PLACEHOLDERS
 *
 * These mark the exact spots where real proof belongs: CRM screenshots, Meta
 * campaign screenshots, lead-form screenshots, calendar screenshots,
 * testimonials, and verified case-study metrics.
 *
 * Visibility rule:
 *   - Shown in development, so the slots are obvious while building.
 *   - Hidden in production by default, so prospects never see empty frames.
 *   - Set NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=true to force them on anywhere.
 *
 * When a real asset is ready, replace the <ProofSlot> with the actual content
 * and delete the slot. See sales-assets/PROOF_ASSET_CHECKLIST.md for the full
 * list and where each asset belongs.
 */
export function showPlaceholders(): boolean {
  if (process.env.NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS === 'true') return true;
  if (process.env.NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS === 'false') return false;
  return process.env.NODE_ENV === 'development';
}

export function ProofSlot({
  title,
  description,
  aspect = 'video',
}: {
  title: string;
  description: string;
  aspect?: 'video' | 'square' | 'tall';
}) {
  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === 'tall'
        ? 'aspect-[3/4]'
        : 'aspect-video';

  return (
    <div className="rounded-2xl border border-dashed border-[var(--hq-line-strong)] bg-[var(--hq-surface)]/40 p-5">
      <div
        className={`${aspectClass} flex items-center justify-center rounded-xl border border-dashed border-[var(--hq-line-strong)] bg-[var(--hq-bg)]`}
      >
        <ImagePlus
          className="size-7 text-[var(--hq-text-dim)]"
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--hq-text)]">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--hq-text-dim)]">
        {description}
      </p>
    </div>
  );
}

/** The homepage proof section. Renders nothing unless placeholders are on. */
export function ProofPlaceholderSection() {
  if (!showPlaceholders()) return null;

  return (
    <Section
      id="proof"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]"
    >
      <SectionHeading
        eyebrow="Placeholder — not public"
        title="Drop real proof assets here."
        lead="This section is visible in development only. Replace each slot with a real, permissioned asset, then delete the slot. Nothing here is shown to prospects in production."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProofSlot
          title="CRM screenshot"
          description="Real lead pipeline view with homeowner personal information redacted."
        />
        <ProofSlot
          title="Meta campaign screenshot"
          description="Ads Manager view. Redact spend if you do not want it public."
        />
        <ProofSlot
          title="Lead form screenshot"
          description="The homeowner-facing form, showing the qualifying questions asked."
        />
        <ProofSlot
          title="Lead notification"
          description="The actual SMS or email a contractor receives, with details redacted."
        />
        <ProofSlot
          title="Calendar / appointments"
          description="Booked appointment view. Redact homeowner names."
        />
        <ProofSlot
          title="Before & after project photos"
          description="Contractor-supplied, with written permission to publish."
        />
      </div>

      <div className="mt-10 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-5">
        <p className="text-sm leading-6 text-[var(--hq-text-muted)]">
          <strong className="text-[var(--hq-text)]">Rule:</strong> only add an
          asset here once it is real and you have permission to publish it. Do
          not add testimonials, logos, counters, or metrics that cannot be
          substantiated. See{' '}
          <code className="rounded bg-[var(--hq-surface-2)] px-1.5 py-0.5 text-xs">
            sales-assets/PROOF_ASSET_CHECKLIST.md
          </code>
          .
        </p>
      </div>
    </Section>
  );
}

/** Inline testimonial slot, for use once contractor feedback exists. */
export function TestimonialPlaceholder() {
  if (!showPlaceholders()) return null;

  return (
    <Container>
      <div className="my-10 rounded-2xl border border-dashed border-[var(--hq-line-strong)] bg-[var(--hq-surface)]/40 p-8 text-center">
        <p className="text-sm font-semibold text-[var(--hq-text)]">
          Placeholder — contractor testimonial
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[var(--hq-text-dim)]">
          Add a real, attributed quote from a contractor who has received leads,
          with written permission to publish their name and company. Development
          only — not shown in production.
        </p>
      </div>
    </Container>
  );
}
