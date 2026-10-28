import { Check } from 'lucide-react';
import { BeforeAfterStrip } from './before-after-strip';

/**
 * Hero copy. Promises the two rewards the visitor works toward; the realistic
 * photo is only promised when the server can actually make one (rendersEnabled).
 */
export function heroCopy(rendersEnabled: boolean): { headline: string; subline: string } {
  return {
    headline: 'Design your dream pool in 2 minutes',
    subline: rendersEnabled
      ? 'Watch it come to life with every pick, then get a realistic photo and your ballpark price.'
      : 'Watch it come to life with every pick, then get your ballpark price range.',
  };
}

/**
 * Compact hero above the live builder: headline, one line of what you get,
 * the contractor's facts (tablet and up; phones carry the license in the
 * header) and the design -> photo / price strip. Kept short so the first
 * question is still on screen on a 390 x 844 phone.
 */
export function EstimatorHero({ rendersEnabled, facts = [] }: { rendersEnabled: boolean; facts?: readonly string[] }) {
  const copy = heroCopy(rendersEnabled);
  return (
    <div className="relative mx-auto w-full max-w-7xl px-5 pt-3 sm:px-8 sm:pt-8 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:pt-10">
      <div className="min-w-0 lg:max-w-[40rem]">
        <h1 className="text-balance text-[1.7rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-4xl lg:text-[2.6rem]">
          {copy.headline}
        </h1>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-[var(--hq-text-muted)] sm:mt-3 sm:text-base sm:leading-7">{copy.subline}</p>
        {facts.length ? (
          <ul aria-label="About this contractor" className="mt-4 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--hq-text)] sm:flex">
            {facts.map((fact) => (
              <li key={fact} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="grid size-[18px] place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)]/15 text-[var(--es-aqua,#2ec5d3)]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {fact}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <BeforeAfterStrip rendersEnabled={rendersEnabled} className="mt-3 sm:mt-6 lg:mt-0 lg:shrink-0" />
    </div>
  );
}
