import { Check } from 'lucide-react';

/**
 * Hero copy. Leads with what they leave with; the realistic photo is only
 * promised when the server can actually make one (rendersEnabled). The photo
 * is shown, not just named: with renders on the builder's own frame opens on
 * an example design beside its realistic photo (ExampleCompare).
 */
export function heroCopy(rendersEnabled: boolean): { headline: string; subline: string } {
  return rendersEnabled
    ? {
        headline: 'Design your pool. Get a realistic photo and a ballpark price.',
        subline: 'About 2 minutes. Watch it build with every pick, then unlock the photo of your design and its price range.',
      }
    : {
        headline: 'Design your pool and get a ballpark price',
        subline: 'About 2 minutes. Watch it build with every pick, then unlock your price range.',
      };
}

/**
 * Compact hero above the live builder: the outcome as the headline, one line
 * of how it works, and the business's facts (tablet and up; phones carry the
 * license in the header). No pictures of its own: the builder's frame right
 * under it is the picture, so a phone shows the first question on the first
 * screen. Nothing here changes after the result, so it never contradicts it.
 * `copy` is the trade's (TradeBuilder.hero, already picked for rendersEnabled);
 * the pool's heroCopy when omitted.
 */
export function EstimatorHero({
  rendersEnabled,
  facts = [],
  copy: copyProp,
  factsLabel = 'About this contractor',
}: {
  rendersEnabled: boolean;
  facts?: readonly string[];
  copy?: { headline: string; subline: string };
  factsLabel?: string;
}) {
  const copy = copyProp ?? heroCopy(rendersEnabled);
  return (
    <div className="relative mx-auto w-full max-w-7xl px-5 pt-3 sm:px-8 sm:pt-8 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:pt-10">
      <div className="min-w-0 lg:max-w-[44rem]">
        <h1 className="text-balance text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-[2.6rem]">{copy.headline}</h1>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-[var(--hq-text-muted)] sm:mt-3 sm:text-base sm:leading-7">{copy.subline}</p>
      </div>
      {facts.length ? (
        <ul aria-label={factsLabel} className="mt-4 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--hq-text)] sm:flex lg:mt-0 lg:shrink-0 lg:flex-col lg:pb-1">
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
  );
}
