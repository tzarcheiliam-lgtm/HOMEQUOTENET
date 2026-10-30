/**
 * What the read-only shared design page (/estimator/<slug>/my-design) shows,
 * from the picks alone: one row per shown step (its pick and photo), the main
 * design photo (also the page's og:image), the recap line and, only when the
 * link is signed (verified by the page on the server), the ballpark range.
 * Pure: the page and the tests use it.
 */
import { formatRange } from '@/lib/estimator/engine';
import { designNoun } from '@/lib/estimator/share';
import { activeSteps, estimateFunnel, funnelPhoto, normalizeFunnelSelection } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { EstimatorTemplate } from '@/lib/estimator/types';

export interface SharedPick {
  stepId: string;
  title: string;
  subtitle: string;
  photo: { src: string; srcSm?: string; alt: string };
}

export interface SharedDesignView {
  picks: SharedPick[];
  main: { src: string; srcSm?: string; alt: string };
  /** "Classic · Luxe · Zero-edge spa" */
  recap: string;
  /** "$85,000 – $110,000", only for a signed link. */
  range: string | null;
  /** "pool" / "bathroom" */
  noun: string;
}

export function sharedDesignView(spec: FunnelSpec, template: EstimatorTemplate, raw: FunnelSelection, verified: boolean): SharedDesignView {
  const selection = normalizeFunnelSelection(spec, raw);
  const steps = activeSteps(spec, selection);
  const picks: SharedPick[] = steps.map((s) => {
    const o = s.options.find((x) => x.id === selection[s.id]) ?? s.options[0];
    const p = funnelPhoto(spec, s.id, selection);
    return { stepId: s.id, title: o.title, subtitle: o.subtitle, photo: { src: p.src, srcSm: p.srcSm, alt: p.alt } };
  });
  // The last main (not follow-up) step pictures the whole design.
  const mainStep = [...steps].reverse().find((s) => !s.showWhen) ?? steps.at(-1);
  const main = picks.find((p) => p.stepId === mainStep?.id)?.photo ?? picks[0]?.photo ?? { src: spec.landing.heroPhoto.src, srcSm: spec.landing.heroPhoto.srcSm, alt: spec.landing.heroAlt };
  const recap = steps.map((s) => {
    const o = s.options.find((x) => x.id === selection[s.id]);
    return o ? o.short ?? o.title : '';
  }).filter(Boolean).join(' · ');
  let range: string | null = null;
  if (verified) {
    const total = estimateFunnel(spec, template, selection).total;
    range = total && total.high > 0 ? formatRange(total.low, total.high) : null;
  }
  return { picks, main, recap, range, noun: designNoun(template.trade) };
}
