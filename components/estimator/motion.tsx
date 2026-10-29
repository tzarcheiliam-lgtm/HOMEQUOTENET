/**
 * Motion for the live pool builder: screen slides, the change chip, the frame
 * glow when the picture changes, the render shimmer and the photoreal reveal.
 * Class names are prefixed `eb-`; every instance carries the same rules, so
 * rendering <BuilderStyles /> more than once is harmless. Everything stops
 * under prefers-reduced-motion (the chip then simply appears and disappears).
 */

const EASE = 'cubic-bezier(.22,.8,.24,1)';

/** How long a change chip stays on the picture (keep in sync with eb-chip). */
export const CHIP_MS = 2600;

export const BUILDER_CSS = `
.eb-fwd{animation:eb-in-r .34s ${EASE} both}
.eb-back{animation:eb-in-l .34s ${EASE} both}
@keyframes eb-in-r{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes eb-in-l{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.eb-rise{animation:eb-rise .5s ${EASE} both}
@keyframes eb-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.eb-chip{animation:eb-chip ${CHIP_MS}ms ease both}
@keyframes eb-chip{0%{opacity:0;transform:translateY(10px) scale(.96)}9%{opacity:1;transform:none}84%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-4px)}}
.eb-glow{animation:eb-glow 1s ease-out both}
@keyframes eb-glow{from{box-shadow:inset 0 0 0 3px rgba(255,255,255,.9),inset 0 0 48px rgba(255,255,255,.35)}to{box-shadow:inset 0 0 0 3px rgba(255,255,255,0),inset 0 0 48px rgba(255,255,255,0)}}
.eb-badge{animation:eb-badge .18s ease-out both}
@keyframes eb-badge{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.eb-shimmer{background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);background-size:220% 100%;animation:eb-shimmer 1.8s linear infinite}
@keyframes eb-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
.eb-reveal{animation:eb-reveal .9s ${EASE} both}
@keyframes eb-reveal{from{opacity:0;transform:scale(1.03);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
.eb-bar{transition:width .6s ${EASE}}
.eb-leave{animation:eb-leave .4s ease-out both}
@keyframes eb-leave{from{opacity:1}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.eb-leave{animation:none;opacity:0}}
@media (prefers-reduced-motion:reduce){.eb-fwd,.eb-back,.eb-rise,.eb-chip,.eb-glow,.eb-badge,.eb-shimmer,.eb-reveal{animation:none!important}.eb-bar{transition:none!important}}
`;

export function BuilderStyles() {
  return <style>{BUILDER_CSS}</style>;
}
