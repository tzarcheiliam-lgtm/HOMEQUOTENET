/**
 * Motion for the unlock and the reveal (class prefix `er-`): the price landing
 * after its count-up, the realistic photo "developing" over the design, the
 * photo dissolving in from the pool outward, one ripple burst, and the
 * compare handle gliding in once. Transform and opacity only, except the one
 * clip-path reveal. Everything stops under prefers-reduced-motion (the burst
 * is not drawn at all). Rendering <RevealStyles /> more than once is harmless.
 */

const OUT = 'cubic-bezier(.22,1,.36,1)'; // ease-out-quint: things arriving
const MOVE = 'cubic-bezier(.65,0,.35,1)'; // ease-in-out-cubic: things moving on screen

/** How long the photo takes to dissolve in; the burst and the handle glide are timed from it. */
export const REVEAL_MS = 1100;
/** When the compare handle starts gliding in (after the dissolve), and how long it takes. */
export const GLIDE_DELAY_MS = REVEAL_MS + 350;
export const GLIDE_MS = 900;
/** The burst is removed after this. */
export const BURST_MS = 1700;

export const REVEAL_CSS = `
.er-land{animation:er-land .5s ${OUT} both}
@keyframes er-land{0%{transform:scale(1)}35%{transform:scale(1.035)}100%{transform:scale(1)}}
.er-sweep{position:absolute;inset:0 -100%;background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.2) 50%,transparent 58%);animation:er-sweep 2.6s ${MOVE} infinite;will-change:transform}
@keyframes er-sweep{from{transform:translateX(-33%)}to{transform:translateX(33%)}}
.er-veil{animation:er-breathe 3.4s ease-in-out infinite alternate}
@keyframes er-breathe{from{opacity:.7}to{opacity:1}}
.er-in{animation:er-in .4s ${OUT} both}
@keyframes er-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.er-line{animation:er-line .35s ${OUT} both}
@keyframes er-line{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.er-bar{transform-origin:left center;transition:transform .7s ${OUT}}
.er-reveal{animation:er-reveal ${REVEAL_MS}ms ${OUT} both}
@keyframes er-reveal{from{clip-path:circle(0% at 50% 56%);transform:scale(1.05)}to{clip-path:circle(80% at 50% 56%);transform:none}}
.er-ring{position:absolute;left:50%;top:56%;width:34%;aspect-ratio:1;border-radius:9999px;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 18px rgba(46,197,211,.55),inset 0 0 12px rgba(46,197,211,.35);opacity:0;animation:er-ring 1.2s ${OUT} both}
@keyframes er-ring{0%{opacity:0;transform:translate(-50%,-50%) scale(.12)}18%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}}
.er-spark{position:absolute;left:50%;top:56%;width:16px;height:16px;margin:-8px 0 0 -8px;color:#fff;opacity:0;animation:er-spark 1s ${OUT} both}
@keyframes er-spark{0%{opacity:0;transform:rotate(var(--a)) translateY(0) scale(.3)}25%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(var(--d)) scale(1)}}
.er-glide .er-handle,.er-glide .er-before{transition:transform ${GLIDE_MS}ms ${MOVE},clip-path ${GLIDE_MS}ms ${MOVE}}
@media (prefers-reduced-motion:reduce){
.er-land,.er-sweep,.er-veil,.er-in,.er-line,.er-reveal{animation:none}
.er-sweep{display:none}
.er-bar,.er-glide .er-handle,.er-glide .er-before{transition:none}
.er-burst{display:none}
}
`;

export function RevealStyles() {
  return <style>{REVEAL_CSS}</style>;
}
