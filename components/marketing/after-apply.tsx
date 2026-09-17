import { Section, SectionHeading } from './primitives';

const steps = [
  {
    step: '01',
    title: 'We review the application',
    description:
      'We check your project types, service area, and capacity against what is currently available in that market.',
  },
  {
    step: '02',
    title: 'A short call',
    description:
      'About fifteen minutes. We confirm the work you want, where you want it, your minimum job size, and how your calendar works.',
  },
  {
    step: '03',
    title: 'Written terms',
    description:
      'You receive the qualification standard, the cancellation, rescheduling and no-show terms, how appointments reach your calendar, pricing, and the proposed number of appointments in writing.',
  },
  {
    step: '04',
    title: 'Agree and launch',
    description:
      'Once you approve the terms, we connect to your calendar and start the agreed test. Nothing runs before you have approved it.',
  },
];

/** Answers "What happens after a contractor applies?" */
export function AfterApplySection() {
  return (
    <Section
      id="after-apply"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]"
    >
      <SectionHeading
        eyebrow="After you apply"
        title="What happens next."
        lead="Applying does not create an agreement or an obligation. It starts a conversation about whether your market is available and whether this is a fit."
      />

      <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li key={s.step} className="border-t border-[var(--hq-line-strong)] pt-5">
            <span className="font-mono text-xs font-semibold tracking-wider text-[var(--hq-accent-bright)]">
              {s.step}
            </span>
            <h3 className="mt-3 text-base font-semibold text-[var(--hq-text)]">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
              {s.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
