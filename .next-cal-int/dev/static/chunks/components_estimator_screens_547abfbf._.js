(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/estimator/screens/reveal-styles.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Motion for the unlock and the reveal (class prefix `er-`): the price landing
 * after its count-up, the realistic photo "developing" over the design, the
 * photo dissolving in from the pool outward, one ripple burst, and the
 * compare handle gliding in once. Transform and opacity only, except the one
 * clip-path reveal. Everything stops under prefers-reduced-motion (the burst
 * is not drawn at all). Rendering <RevealStyles /> more than once is harmless.
 */ __turbopack_context__.s([
    "BURST_MS",
    ()=>BURST_MS,
    "COUNT_DELAY_MS",
    ()=>COUNT_DELAY_MS,
    "COUNT_MS",
    ()=>COUNT_MS,
    "GLIDE_DELAY_MS",
    ()=>GLIDE_DELAY_MS,
    "GLIDE_MS",
    ()=>GLIDE_MS,
    "PHOTO_PANEL_DELAY_MS",
    ()=>PHOTO_PANEL_DELAY_MS,
    "REVEAL_CSS",
    ()=>REVEAL_CSS,
    "REVEAL_MS",
    ()=>REVEAL_MS,
    "RevealStyles",
    ()=>RevealStyles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const OUT = 'cubic-bezier(.22,1,.36,1)'; // ease-out-quint: things arriving
const MOVE = 'cubic-bezier(.65,0,.35,1)'; // ease-in-out-cubic: things moving on screen
const REVEAL_MS = 1100;
const GLIDE_DELAY_MS = REVEAL_MS + 350;
const GLIDE_MS = 900;
const BURST_MS = 1700;
const COUNT_DELAY_MS = 350;
const COUNT_MS = 800;
const PHOTO_PANEL_DELAY_MS = COUNT_DELAY_MS + COUNT_MS + 400;
const REVEAL_CSS = `
.er-land{animation:er-land .5s ${OUT} both}
@keyframes er-land{0%{transform:scale(1)}35%{transform:scale(1.035)}100%{transform:scale(1)}}
.er-sweep{position:absolute;inset:0 -100%;background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.22) 50%,transparent 58%);animation:er-sweep 3s ${MOVE} infinite;will-change:transform}
@keyframes er-sweep{from{transform:translateX(-33%)}to{transform:translateX(33%)}}
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
.er-land,.er-sweep,.er-in,.er-line,.er-reveal{animation:none}
.er-sweep{display:none}
.er-bar,.er-glide .er-handle,.er-glide .er-before{transition:none}
.er-burst{display:none}
}
`;
function RevealStyles() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
        children: REVEAL_CSS
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/reveal-styles.tsx",
        lineNumber: 57,
        columnNumber: 10
    }, this);
}
_c = RevealStyles;
var _c;
__turbopack_context__.k.register(_c, "RevealStyles");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/design-result.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DESIGN_FILE_NAME",
    ()=>DESIGN_FILE_NAME,
    "DEVELOPING_LINE",
    ()=>DEVELOPING_LINE,
    "DesignList",
    ()=>DesignList,
    "DevelopingPhoto",
    ()=>DevelopingPhoto,
    "PHOTO_CAPTION",
    ()=>PHOTO_CAPTION,
    "PhotoReveal",
    ()=>PhotoReveal,
    "ResultScene",
    ()=>ResultScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$left$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsLeftRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevrons-left-right.js [app-client] (ecmascript) <export default as ChevronsLeftRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/share-2.js [app-client] (ecmascript) <export default as Share2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/render-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builder.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/pool.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builder-render.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/scene-panel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/reveal-styles.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
const DESIGN_FILE_NAME = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_COPY"].designFile;
/** Quiet text action under the picture ("Save my design"). */ const quietButton = 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[var(--hq-accent-bright)] transition-colors hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-wait disabled:opacity-60';
const glowButton = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] px-4 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:bg-[var(--hq-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
/** Round icon button on the photo (close, open full size). 44px tap target around a 36px circle. */ const photoButton = "relative inline-flex size-9 items-center justify-center rounded-full bg-[#06122b]/80 text-white transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-[#06122b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white";
const PHOTO_CAPTION = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_COPY"].photoCaption;
function DesignList({ items }) {
    _s();
    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    if (!items.length) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-labelledby": id,
        className: "rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)]/40 p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                id: id,
                className: "text-sm font-semibold text-[var(--hq-text)]",
                children: "Your design"
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                className: "mt-2 divide-y divide-[var(--hq-line)] text-sm",
                children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-baseline justify-between gap-4 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "shrink-0 text-[var(--hq-text-muted)]",
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 51,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "text-right font-medium text-[var(--hq-text)]",
                                children: item.value
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 52,
                                columnNumber: 13
                            }, this)
                        ]
                    }, item.label, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 50,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
_s(DesignList, "WhsuKpSQZEWeFcB7gWlfDRQktoQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = DesignList;
/* ------------------------------------------------------------------ */ /* Realistic photo                                                     */ /* ------------------------------------------------------------------ */ /** Render tokens whose photo already started on its own: a remount never spends a second render. */ const autoStarted = new Set();
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
/** How long the finished photo may take to download before the attempt counts as failed (a stalled phone network). */ const PRELOAD_TIMEOUT_MS = 45_000;
function preloadImage(url) {
    return new Promise((resolve, reject)=>{
        const img = new Image();
        const timer = setTimeout(()=>{
            img.src = '';
            reject(new Error('image took too long'));
        }, PRELOAD_TIMEOUT_MS);
        img.onload = ()=>{
            clearTimeout(timer);
            resolve();
        };
        img.onerror = ()=>{
            clearTimeout(timer);
            reject(new Error('image could not be loaded'));
        };
        img.src = url;
    });
}
function prefersReducedMotion() {
    return ("TURBOPACK compile-time value", "object") !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
/**
 * The realistic photo for this lead. When the lead response carried a
 * renderToken it starts by itself, once (the snapshot waits
 * AUTO_RENDER_DELAY_MS so the price count-up stays smooth; the developing
 * overlay waits for the price to land, see ResultScene). `auto` is true while the current attempt is that automatic one:
 * its failures stay quiet. `start` is the manual retry.
 */ function useRealisticPhoto(slug, renderToken, capture, help) {
    _s1();
    const [phase, setPhase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useRealisticPhoto.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldAutoRender"])(renderToken, autoStarted) ? {
                kind: 'preparing'
            } : {
                kind: 'idle'
            }
    }["useRealisticPhoto.useState"]);
    const [auto, setAuto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useRealisticPhoto.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldAutoRender"])(renderToken, autoStarted)
    }["useRealisticPhoto.useState"]);
    // When this attempt started (the developing clock ticks inside DevelopingPhoto, not here).
    const [since, setSince] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const busy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const alive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealisticPhoto.useEffect": ()=>{
            alive.current = true;
            return ({
                "useRealisticPhoto.useEffect": ()=>{
                    alive.current = false;
                }
            })["useRealisticPhoto.useEffect"];
        }
    }["useRealisticPhoto.useEffect"], []);
    const run = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealisticPhoto.useCallback[run]": async (automatic)=>{
            if (!renderToken || busy.current) return;
            busy.current = true;
            const t0 = Date.now();
            setAuto(automatic);
            setSince(t0);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runRenderSession"])({
                    capture: {
                        "useRealisticPhoto.useCallback[run]": async ()=>{
                            if (automatic) await sleep(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AUTO_RENDER_DELAY_MS"]);
                            return capture();
                        }
                    }["useRealisticPhoto.useCallback[run]"],
                    start: {
                        "useRealisticPhoto.useCallback[run]": (png)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startRender"])(slug, renderToken, png)
                    }["useRealisticPhoto.useCallback[run]"],
                    check: {
                        "useRealisticPhoto.useCallback[run]": (taskId)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["checkRender"])(slug, renderToken, taskId)
                    }["useRealisticPhoto.useCallback[run]"],
                    preload: preloadImage,
                    sleep,
                    now: Date.now,
                    cancelled: {
                        "useRealisticPhoto.useCallback[run]": ()=>!alive.current
                    }["useRealisticPhoto.useCallback[run]"]
                }, setPhase, {
                    help
                });
            } finally{
                busy.current = false;
            }
        }
    }["useRealisticPhoto.useCallback[run]"], [
        slug,
        renderToken,
        capture,
        help
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealisticPhoto.useEffect": ()=>{
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldAutoRender"])(renderToken, autoStarted)) return;
            autoStarted.add(renderToken);
            void run(true);
        }
    }["useRealisticPhoto.useEffect"], [
        renderToken,
        run
    ]);
    return {
        phase,
        auto,
        start: ()=>void run(false),
        since
    };
}
_s1(useRealisticPhoto, "cxRqXuL6GWz7x8CK7Rnsr4vSBAQ=");
const DEVELOPING_LINE = 'Making your realistic photo';
function DevelopingPhoto({ preparing, since }) {
    _s2();
    // Only ever drawn on the client, after the result appears, so reading the clock here is safe.
    const [now, setNow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "DevelopingPhoto.useState": ()=>Date.now()
    }["DevelopingPhoto.useState"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DevelopingPhoto.useEffect": ()=>{
            const i = setInterval({
                "DevelopingPhoto.useEffect.i": ()=>setNow(Date.now())
            }["DevelopingPhoto.useEffect.i"], 1000);
            return ({
                "DevelopingPhoto.useEffect": ()=>clearInterval(i)
            })["DevelopingPhoto.useEffect"];
        }
    }["DevelopingPhoto.useEffect"], []);
    const elapsedMs = since ? Math.max(0, now - since) : 0;
    const percent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["renderProgress"])(elapsedMs);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-developing": "",
        className: "pointer-events-none absolute inset-0 overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "er-sweep"
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 179,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "er-in absolute bottom-3.5 left-2.5 inline-flex h-8 max-w-[calc(100%-1.25rem)] items-center gap-2 rounded-full bg-[#06122b]/85 pr-3 pl-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] sm:bottom-4 sm:left-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                        className: "size-3.5 shrink-0 text-[#ffd666]"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 181,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "truncate",
                        children: [
                            preparing ? 'Getting your design ready' : 'Making your photo',
                            "…"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 182,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "shrink-0 font-medium text-white/70 tabular-nums",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatElapsed"])(elapsedMs)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 183,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 180,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "absolute inset-x-0 bottom-0 h-1 bg-[#06122b]/35",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "er-bar h-full w-full bg-[linear-gradient(90deg,var(--es-aqua,#2ec5d3),#b9f6ff)]",
                    style: {
                        transform: `translateX(${percent - 100}%)`
                    }
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/design-result.tsx",
                    lineNumber: 186,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 185,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 178,
        columnNumber: 5
    }, this);
}
_s2(DevelopingPhoto, "2IU6yg86GfAIPaiHfn+vZjj7R4s=");
_c1 = DevelopingPhoto;
/** The one celebration: three rings spreading like a drop in the pool, and a few sparkles. Decorative. */ function RippleBurst() {
    const sparks = [
        0,
        45,
        90,
        135,
        180,
        225,
        270,
        315
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "er-burst pointer-events-none absolute inset-0 overflow-hidden",
        "aria-hidden": "true",
        children: [
            [
                0,
                170,
                340
            ].map((delay)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "er-ring",
                    style: {
                        animationDelay: `${250 + delay}ms`
                    }
                }, delay, false, {
                    fileName: "[project]/components/estimator/screens/design-result.tsx",
                    lineNumber: 201,
                    columnNumber: 9
                }, this)),
            sparks.map((angle, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    viewBox: "0 0 16 16",
                    className: "er-spark",
                    style: {
                        '--a': `${angle + 22}deg`,
                        '--d': `${-(70 + i % 3 * 22)}px`,
                        animationDelay: `${330 + i % 2 * 90}ms`
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M8 0c.6 4.2 3.2 6.9 8 8-4.8 1.1-7.4 3.8-8 8-.6-4.2-3.2-6.9-8-8 4.8-1.1 7.4-3.8 8-8z",
                        fill: "currentColor"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 210,
                        columnNumber: 11
                    }, this)
                }, angle, false, {
                    fileName: "[project]/components/estimator/screens/design-result.tsx",
                    lineNumber: 204,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 199,
        columnNumber: 5
    }, this);
}
_c2 = RippleBurst;
function PhotoReveal({ before, after, celebrate, onClose, subject = 'pool', photoLabel = 'Realistic photo' }) {
    _s3();
    const [motion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "PhotoReveal.useState": ()=>celebrate && !prefersReducedMotion()
    }["PhotoReveal.useState"]);
    const [pos, setPos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(motion ? 0 : 50);
    const [gliding, setGliding] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [burst, setBurst] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(motion);
    const touched = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PhotoReveal.useEffect": ()=>{
            if (!motion) return;
            const timers = [
                setTimeout({
                    "PhotoReveal.useEffect": ()=>{
                        if (touched.current) return;
                        setGliding(true);
                        setPos(50);
                    }
                }["PhotoReveal.useEffect"], __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GLIDE_DELAY_MS"]),
                setTimeout({
                    "PhotoReveal.useEffect": ()=>setGliding(false)
                }["PhotoReveal.useEffect"], __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GLIDE_DELAY_MS"] + __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GLIDE_MS"] + 60),
                setTimeout({
                    "PhotoReveal.useEffect": ()=>setBurst(false)
                }["PhotoReveal.useEffect"], __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BURST_MS"])
            ];
            return ({
                "PhotoReveal.useEffect": ()=>timers.forEach(clearTimeout)
            })["PhotoReveal.useEffect"];
        }
    }["PhotoReveal.useEffect"], [
        motion
    ]);
    const compare = pos > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-photo-reveal": "",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('absolute inset-0 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-[-4px] has-[input:focus-visible]:outline-white', gliding && 'er-glide'),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: after,
                alt: `AI-rendered realistic photo of your ${subject} design`,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('absolute inset-0 size-full object-cover', motion && 'er-reveal')
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 273,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "er-before absolute inset-0",
                style: {
                    clipPath: `inset(0 ${100 - pos}% 0 0)`
                },
                "aria-hidden": "true",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: before,
                    alt: "",
                    className: "absolute inset-0 size-full object-cover"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/design-result.tsx",
                    lineNumber: 276,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 274,
                columnNumber: 7
            }, this),
            burst ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RippleBurst, {}, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 278,
                columnNumber: 16
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('er-handle pointer-events-none absolute inset-y-0 left-0 w-full', compare ? 'opacity-100' : 'opacity-0'),
                style: {
                    transform: `translateX(${pos}%)`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 285,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute top-1/2 left-0 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#06122b] shadow-[0_6px_18px_rgba(0,0,0,0.45)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$left$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsLeftRight$3e$__["ChevronsLeftRight"], {
                            className: "size-5",
                            strokeWidth: 2.4
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/screens/design-result.tsx",
                            lineNumber: 287,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 286,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 280,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(pillClass, 'bottom-2.5 left-2.5 transition-opacity duration-300', compare ? 'opacity-100' : 'opacity-0'),
                "aria-hidden": "true",
                children: "Your design"
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 292,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(pillClass, 'right-2.5 bottom-2.5', motion && 'er-in'),
                style: motion ? {
                    animationDelay: '700ms'
                } : undefined,
                "aria-hidden": "true",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                        className: "size-3.5 text-[#ffd666]"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 296,
                        columnNumber: 9
                    }, this),
                    photoLabel
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 295,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "range",
                min: 0,
                max: 100,
                value: pos,
                onChange: (e)=>{
                    touched.current = true;
                    setGliding(false);
                    setPos(Number(e.target.value));
                },
                "aria-label": "Compare your design with its realistic photo",
                "aria-valuetext": `${pos}% design, ${100 - pos}% realistic photo`,
                // pan-y: a vertical swipe that starts on the picture still scrolls the page (iOS).
                className: "absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 300,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-2.5 right-2.5 flex gap-2 sm:top-3 sm:right-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: after,
                        target: "_blank",
                        rel: "noopener",
                        "aria-label": "Open the full-size photo",
                        className: photoButton,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                            className: "size-4",
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/screens/design-result.tsx",
                            lineNumber: 317,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 316,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onClose,
                        "aria-label": "Back to the illustration",
                        className: photoButton,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "size-4",
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/screens/design-result.tsx",
                            lineNumber: 320,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 319,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 315,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 264,
        columnNumber: 5
    }, this);
}
_s3(PhotoReveal, "sHtjv8hi2pzqhi0BzMxmm6Zon+g=");
_c3 = PhotoReveal;
const pillClass = 'pointer-events-none absolute inline-flex h-7 items-center gap-1.5 rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white';
/* ------------------------------------------------------------------ */ /* Share                                                               */ /* ------------------------------------------------------------------ */ let shareEnvCache = null;
const noSubscribe = ()=>()=>{};
/** What this browser can share, read once (stable object for useSyncExternalStore). */ function readShareEnv() {
    if (shareEnvCache) return shareEnvCache;
    let canShareFiles = false;
    try {
        canShareFiles = typeof navigator.canShare === 'function' && typeof File !== 'undefined' && navigator.canShare({
            files: [
                new File([
                    ''
                ], 'probe.png', {
                    type: 'image/png'
                })
            ]
        });
    } catch  {
        canShareFiles = false;
    }
    shareEnvCache = {
        canShareFiles,
        canShare: typeof navigator.share === 'function',
        canCopy: typeof navigator.clipboard?.writeText === 'function'
    };
    return shareEnvCache;
}
async function dataUrlFile(dataUrl, name) {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([
        blob
    ], name, {
        type: blob.type || 'image/png'
    });
}
/** The photo as a file, when its host allows reading it from here; null otherwise. */ async function photoFile(url, name) {
    try {
        const res = await fetch(url, {
            mode: 'cors'
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return blob.type.startsWith('image/') ? new File([
            blob
        ], name, {
            type: blob.type
        }) : null;
    } catch  {
        return null;
    }
}
function ResultScene({ template, builder: builderProp, answers, dimensions, night, onNightChange, slug, renderToken, designItems = [], onPhotoProgress }) {
    _s4();
    const builder = builderProp ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["builderFor"])(template);
    const { copy } = builder;
    const frame = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // The scene in the frame as a PNG (the adapter knows whether it is an SVG or a canvas).
    const snapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ResultScene.useCallback[snapshot]": ()=>{
            const el = frame.current;
            return el ? builder.rasterize(el) : Promise.reject(new Error('scene not found'));
        }
    }["ResultScene.useCallback[snapshot]"], [
        builder
    ]);
    // Latest night value for the async snapshot (the prop changes under it once switched to day).
    const nightRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(night);
    nightRef.current = night;
    // The render prompt asks for daylight, so a night/evening snapshot would not match: switch to day for the
    // snapshot, then back to the view they chose.
    const capture = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ResultScene.useCallback[capture]": async ()=>{
            const wasNight = nightRef.current;
            if (wasNight) {
                onNightChange(false);
                // Let React commit the day picture; the fading-out night layer is dropped from the snapshot.
                await sleep(120);
            }
            try {
                return await snapshot();
            } finally{
                if (wasNight) onNightChange(true);
            }
        }
    }["ResultScene.useCallback[capture]"], [
        snapshot,
        onNightChange
    ]);
    const { phase, auto, start, since } = useRealisticPhoto(slug, renderToken, capture, copy);
    // The reveal is one moment at a time: the price counts up first, then the photo's progress appears.
    const [priceSettled, setPriceSettled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ResultScene.useEffect": ()=>{
            const t = setTimeout({
                "ResultScene.useEffect.t": ()=>setPriceSettled(true)
            }["ResultScene.useEffect.t"], prefersReducedMotion() ? 0 : __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHOTO_PANEL_DELAY_MS"]);
            return ({
                "ResultScene.useEffect": ()=>clearTimeout(t)
            })["ResultScene.useEffect"];
        }
    }["ResultScene.useEffect"], []);
    const [showRender, setShowRender] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sharing, setSharing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [note, setNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const shareEnv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(noSubscribe, readShareEnv, {
        "ResultScene.useSyncExternalStore[shareEnv]": ()=>null
    }["ResultScene.useSyncExternalStore[shareEnv]"]);
    const working = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["renderWorking"])(phase);
    const done = phase.kind === 'done' ? phase : null;
    const progress = working ? 'pending' : done ? 'done' : 'none';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ResultScene.useEffect": ()=>{
            onPhotoProgress?.(progress);
        }
    }["ResultScene.useEffect"], [
        progress,
        onPhotoProgress
    ]);
    // The celebration plays once: reopening the photo after closing it just shows it.
    const [reopened, setReopened] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const save = async ()=>{
        if (saving) return;
        setSaving(true);
        setNote(null);
        try {
            const url = await snapshot();
            const a = document.createElement('a');
            a.href = url;
            a.download = copy.designFile;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch  {
            setNote({
                text: 'Sorry, we could not save the image on this device. A screenshot works too.',
                tone: 'warn'
            });
        } finally{
            setSaving(false);
        }
    };
    // The picture to share, made ahead when possible: a share sheet has to open
    // while the tap still counts, and fetching or drawing can take a moment.
    const shareFile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const shareKey = done ? done.imageUrl : 'design';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ResultScene.useEffect": ()=>{
            if (!done || !shareEnv?.canShareFiles || shareFile.current?.key === done.imageUrl) return;
            let cancelled = false;
            void photoFile(done.imageUrl, copy.photoFile).then({
                "ResultScene.useEffect": (file)=>{
                    if (file && !cancelled) shareFile.current = {
                        key: done.imageUrl,
                        file
                    };
                }
            }["ResultScene.useEffect"]);
            return ({
                "ResultScene.useEffect": ()=>{
                    cancelled = true;
                }
            })["ResultScene.useEffect"];
        }
    }["ResultScene.useEffect"], [
        done,
        shareEnv,
        copy
    ]);
    const plan = shareEnv ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$render$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sharePlan"])(shareEnv, Boolean(done)) : null;
    const share = async ()=>{
        if (sharing || !plan) return;
        setSharing(true);
        setNote(null);
        const title = copy.shareTitle;
        const text = done ? copy.sharePhotoText : copy.shareDesignText;
        try {
            if (plan === 'files') {
                let file = shareFile.current?.key === shareKey ? shareFile.current.file : null;
                let fresh = false;
                if (!file) {
                    fresh = true;
                    if (done) file = await photoFile(done.imageUrl, copy.photoFile);
                    else file = await dataUrlFile(await snapshot(), copy.designFile);
                    if (file) shareFile.current = {
                        key: shareKey,
                        file
                    };
                }
                if (file && navigator.canShare?.({
                    files: [
                        file
                    ]
                })) {
                    try {
                        await navigator.share({
                            files: [
                                file
                            ],
                            title,
                            text
                        });
                    } catch (e) {
                        // Making the picture took long enough that the tap no longer counts: it is ready now.
                        if (fresh && e?.name === 'NotAllowedError') setNote({
                            text: 'Your picture is ready. Tap Share again to send it.',
                            tone: 'muted'
                        });
                        else throw e;
                    }
                    return;
                }
                if (done && typeof navigator.share === 'function') {
                    await navigator.share({
                        title,
                        text,
                        url: done.imageUrl
                    });
                    return;
                }
                throw new Error('nothing to share');
            }
            if (plan === 'link' && done) {
                await navigator.share({
                    title,
                    text,
                    url: done.imageUrl
                });
                return;
            }
            if (plan === 'copy' && done) {
                await navigator.clipboard.writeText(done.imageUrl);
                setNote({
                    text: 'Link to your realistic photo copied.',
                    tone: 'muted'
                });
            }
        } catch (e) {
            if (e?.name !== 'AbortError') setNote({
                text: 'Sharing did not work on this device. Save my design works too.',
                tone: 'warn'
            });
        } finally{
            setSharing(false);
        }
    };
    // Closing the comparison removes its close button: keep keyboard focus on the button that brings it back.
    const reopenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const closedByUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"])({
        "ResultScene.useLayoutEffect": ()=>{
            if (done && !showRender && closedByUser.current) {
                closedByUser.current = false;
                reopenRef.current?.focus({
                    preventScroll: true
                });
            }
        }
    }["ResultScene.useLayoutEffect"], [
        done,
        showRender
    ]);
    const overlay = working ? priceSettled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DevelopingPhoto, {
        preparing: phase.kind === 'preparing',
        since: since
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 554,
        columnNumber: 20
    }, this) : null : done && showRender ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PhotoReveal, {
        before: done.before,
        after: done.imageUrl,
        celebrate: !reopened,
        subject: copy.subject,
        photoLabel: copy.photoLabel,
        onClose: ()=>{
            closedByUser.current = true;
            setShowRender(false);
        }
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 556,
        columnNumber: 5
    }, this) : null;
    // A retry only when another try can help: after a failure, or (rarely) a token that never started.
    const canRetry = Boolean(renderToken) && (phase.kind === 'failed' || phase.kind === 'idle');
    // A failure is explained only when they asked for this attempt; the automatic one fails quietly.
    const loud = !auto && (phase.kind === 'failed' || phase.kind === 'off');
    // One status line, always there with room for two lines, so nothing below it jumps.
    const status = note ? note : loud && (phase.kind === 'failed' || phase.kind === 'off') ? {
        text: phase.message,
        tone: phase.kind === 'failed' ? 'warn' : 'muted'
    } : working && priceSettled ? {
        text: `${DEVELOPING_LINE}. It usually takes 20 to 60 seconds, and your price is ready now.`,
        tone: 'muted'
    } : done ? {
        text: 'Your realistic photo is ready. Drag the handle to compare it with your design.',
        tone: 'muted'
    } : {
        text: 'Save a picture of your design to keep or share.',
        tone: 'dim'
    };
    const footer = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RevealStyles"], {}, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 587,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: save,
                        disabled: saving,
                        className: quietButton,
                        children: [
                            saving ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "size-4 animate-spin motion-reduce:animate-none",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 590,
                                columnNumber: 21
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 590,
                                columnNumber: 113
                            }, this),
                            saving ? 'Saving…' : 'Save my design'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 589,
                        columnNumber: 9
                    }, this),
                    plan ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>void share(),
                        disabled: sharing,
                        className: quietButton,
                        children: [
                            sharing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "size-4 animate-spin motion-reduce:animate-none",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 595,
                                columnNumber: 24
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__["Share2"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 595,
                                columnNumber: 116
                            }, this),
                            "Share"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 594,
                        columnNumber: 11
                    }, this) : null,
                    done && !showRender ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        ref: reopenRef,
                        type: "button",
                        onClick: ()=>{
                            setReopened(true);
                            setShowRender(true);
                        },
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(glowButton, 'ml-auto'),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 609,
                                columnNumber: 13
                            }, this),
                            "Show realistic photo"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 600,
                        columnNumber: 11
                    }, this) : canRetry ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: start,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(glowButton, 'ml-auto'),
                        children: [
                            loud ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 614,
                                columnNumber: 21
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/design-result.tsx",
                                lineNumber: 614,
                                columnNumber: 75
                            }, this),
                            loud ? 'Try again' : 'Make my realistic photo'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/design-result.tsx",
                        lineNumber: 613,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 588,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                "aria-live": "polite",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('min-h-10 text-xs leading-5 text-pretty', status.tone === 'warn' ? 'text-[var(--hq-warn)]' : status.tone === 'muted' ? 'text-[var(--hq-text-muted)]' : 'text-[var(--hq-text-dim)]'),
                children: status.text
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 619,
                columnNumber: 7
            }, this),
            designItems.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hidden pt-3 lg:block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DesignList, {
                    items: designItems
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/design-result.tsx",
                    lineNumber: 631,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/design-result.tsx",
                lineNumber: 630,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 586,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScenePanel"], {
        template: template,
        builder: builder,
        answers: answers,
        dimensions: dimensions,
        night: night,
        onNightChange: onNightChange,
        variant: "result",
        frameRef: frame,
        overlay: overlay,
        hideLighting: working || Boolean(done && showRender),
        caption: done && showRender ? copy.photoCaption : undefined,
        footer: footer
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/design-result.tsx",
        lineNumber: 638,
        columnNumber: 5
    }, this);
}
_s4(ResultScene, "3PuKBYwrS9H/gO2tL96gwwK+lo8=", false, function() {
    return [
        useRealisticPhoto,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
_c4 = ResultScene;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "DesignList");
__turbopack_context__.k.register(_c1, "DevelopingPhoto");
__turbopack_context__.k.register(_c2, "RippleBurst");
__turbopack_context__.k.register(_c3, "PhotoReveal");
__turbopack_context__.k.register(_c4, "ResultScene");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/looks-screen.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LooksScreen",
    ()=>LooksScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function LooksScreen({ gallery, liked, onToggle }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuestionFieldset"], {
        legend: "Which look do you like?",
        help: "Pick any you like, or skip this. It helps us understand your taste and does not change your price.",
        hideLegend: true,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-2 gap-3 @md:grid-cols-3",
            children: gallery.map((img)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChoiceTile"], {
                    type: "checkbox",
                    name: `${uid}-looks`,
                    value: img.src,
                    checked: liked.includes(img.src),
                    onChange: ()=>onToggle(img.src),
                    label: img.caption ?? img.alt,
                    visual: // eslint-disable-next-line @next/next/no-img-element
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: img.thumb ?? img.src,
                        alt: "",
                        loading: "lazy",
                        decoding: "async",
                        className: "h-full w-full object-cover"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/looks-screen.tsx",
                        lineNumber: 36,
                        columnNumber: 15
                    }, void 0)
                }, img.src, false, {
                    fileName: "[project]/components/estimator/screens/looks-screen.tsx",
                    lineNumber: 26,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/components/estimator/screens/looks-screen.tsx",
            lineNumber: 24,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/looks-screen.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_s(LooksScreen, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = LooksScreen;
var _c;
__turbopack_context__.k.register(_c, "LooksScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/lead-screens.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ContactScreen",
    ()=>ContactScreen,
    "ZipScreen",
    ()=>ZipScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function ZipScreen({ state, onChange, errors, preview }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            preview,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-7",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                        label: "Property ZIP code",
                        error: errors.zip,
                        hint: "5 digits",
                        className: "max-w-xs",
                        children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                ...p,
                                type: "text",
                                inputMode: "numeric",
                                autoComplete: "postal-code",
                                maxLength: 5,
                                pattern: "[0-9]{5}",
                                value: state.zip,
                                onChange: (e)=>onChange({
                                        zip: e.target.value.replace(/\D/g, '').slice(0, 5)
                                    }),
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["inputClass"]
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 28,
                                columnNumber: 13
                            }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuestionFieldset"], {
                        legend: "Do you own the home?",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-3",
                                children: [
                                    [
                                        'yes',
                                        'Yes'
                                    ],
                                    [
                                        'no',
                                        'No'
                                    ]
                                ].map(([id, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChoiceTile"], {
                                        type: "radio",
                                        name: `${uid}-owner`,
                                        value: id,
                                        checked: state.homeowner === id,
                                        onChange: ()=>onChange({
                                                homeowner: id
                                            }),
                                        label: label
                                    }, id, false, {
                                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                        lineNumber: 50,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            errors.homeowner ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-sm text-[var(--hq-bad)]",
                                children: errors.homeowner
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 61,
                                columnNumber: 31
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuestionFieldset"], {
                        legend: "When would you like to start?",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-3 sm:grid-cols-2",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LEAD_TIMELINES"].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChoiceTile"], {
                                        type: "radio",
                                        name: `${uid}-timeline`,
                                        value: t.id,
                                        checked: state.timeline === t.id,
                                        onChange: ()=>onChange({
                                                timeline: t.id
                                            }),
                                        label: t.label
                                    }, t.id, false, {
                                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            errors.timeline ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-sm text-[var(--hq-bad)]",
                                children: errors.timeline
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 78,
                                columnNumber: 30
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(ZipScreen, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = ZipScreen;
function ContactScreen({ contractor, contact, onChange, measurement, onMeasurementChange, errors, preview }) {
    _s1();
    const consentId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const consentErrorId = `${consentId}-e`;
    const textField = (key, label, inputProps)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
            label: label,
            error: errors[key],
            children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    ...p,
                    ...inputProps,
                    value: contact[key],
                    onChange: (e)=>onChange({
                            [key]: e.target.value
                        }),
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["inputClass"]
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                    lineNumber: 115,
                    columnNumber: 15
                }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/screens/lead-screens.tsx",
            lineNumber: 114,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            preview,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-4 sm:grid-cols-2",
                        children: [
                            textField('firstName', 'First name', {
                                type: 'text',
                                autoComplete: 'given-name'
                            }),
                            textField('lastName', 'Last name', {
                                type: 'text',
                                autoComplete: 'family-name'
                            }),
                            textField('email', 'Email', {
                                type: 'email',
                                autoComplete: 'email',
                                inputMode: 'email'
                            }),
                            textField('phone', 'Mobile phone', {
                                type: 'tel',
                                autoComplete: 'tel',
                                inputMode: 'tel'
                            })
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                        label: "Anything else we should know? (optional)",
                        error: errors.note,
                        hint: `${contact.note.length}/${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTE_MAX_LENGTH"]}`,
                        children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                ...p,
                                rows: 3,
                                maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NOTE_MAX_LENGTH"],
                                value: contact.note,
                                onChange: (e)=>onChange({
                                        note: e.target.value
                                    }),
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["textareaClass"]
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 135,
                                columnNumber: 13
                            }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        hidden: true,
                        inert: true,
                        className: "hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            children: [
                                "Leave this empty",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    name: "contact_url_2",
                                    tabIndex: -1,
                                    autoComplete: "off",
                                    value: contact.website,
                                    onChange: (e)=>onChange({
                                            website: e.target.value
                                        })
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                    lineNumber: 150,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                            lineNumber: 148,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 147,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: contact.consent,
                                        onChange: (e)=>onChange({
                                                consent: e.target.checked
                                            }),
                                        "aria-invalid": Boolean(errors.consent),
                                        "aria-describedby": errors.consent ? consentErrorId : undefined,
                                        className: "mt-1 size-4 shrink-0 accent-[var(--hq-accent)]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                        lineNumber: 163,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimatorConsentText"])(contractor.contractorName),
                                            ' ',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/privacy",
                                                target: "_blank",
                                                rel: "noreferrer",
                                                className: "underline underline-offset-2",
                                                children: "Privacy policy"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                                lineNumber: 173,
                                                columnNumber: 15
                                            }, this),
                                            ' · ',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/terms",
                                                target: "_blank",
                                                rel: "noreferrer",
                                                className: "underline underline-offset-2",
                                                children: "Terms"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                                lineNumber: 177,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                        lineNumber: 171,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 162,
                                columnNumber: 11
                            }, this),
                            errors.consent ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: consentErrorId,
                                className: "mt-1 text-sm text-[var(--hq-bad)]",
                                children: errors.consent
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 183,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 161,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex cursor-pointer items-start gap-3 text-xs leading-5 text-[var(--hq-text-muted)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: measurement,
                                onChange: (e)=>onMeasurementChange(e.target.checked),
                                className: "mt-0.5 size-4 shrink-0 accent-[var(--hq-accent)]"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 190,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Allow optional advertising measurement"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                                lineNumber: 196,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                        lineNumber: 189,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/lead-screens.tsx",
                lineNumber: 121,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/lead-screens.tsx",
        lineNumber: 119,
        columnNumber: 5
    }, this);
}
_s1(ContactScreen, "7Dxlzf24Fq8tusl6fxqfz252VHI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = ContactScreen;
var _c, _c1;
__turbopack_context__.k.register(_c, "ZipScreen");
__turbopack_context__.k.register(_c1, "ContactScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/package-screen.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PackageScreen",
    ()=>PackageScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
const cardClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4 text-sm hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]', __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pressable"]);
function PackageScreen({ template, question, answers, onPick, canCustomize, onCustomize, onPreview }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(question, answers)[0];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
                className: "min-w-0 border-0 p-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                        className: "sr-only",
                        children: question.label
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 @xl:grid-cols-2",
                        children: question.options.map((o)=>{
                            const pkg = template.packages.find((p)=>p.id === o.id);
                            const custom = o.id === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"];
                            const labelId = `${uid}-${o.id}-l`;
                            const descId = `${uid}-${o.id}-d`;
                            const preview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["previewHandlers"])(onPreview ? (on)=>onPreview(on ? o.id : null) : undefined);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(cardClass, custom && '@xl:col-span-2'),
                                ...preview.label,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "flex items-start",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "radio",
                                                name: `${uid}-package`,
                                                value: o.id,
                                                checked: picked === o.id,
                                                onChange: ()=>onPick(o.id),
                                                ...preview.input,
                                                "aria-labelledby": labelId,
                                                "aria-describedby": descId,
                                                // The corner badge is the card's one selected mark.
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hiddenInput"]
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                lineNumber: 55,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "min-w-0 flex-1 pr-8",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "flex flex-wrap items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                id: labelId,
                                                                className: "text-base font-semibold text-[var(--hq-text)]",
                                                                children: pkg?.label ?? o.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                                lineNumber: 69,
                                                                columnNumber: 23
                                                            }, this),
                                                            pkg?.popular ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "rounded-full bg-[var(--hq-cta)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hq-cta-ink)]",
                                                                children: "Most popular"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                                lineNumber: 73,
                                                                columnNumber: 25
                                                            }, this) : null
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                        lineNumber: 68,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        id: descId,
                                                        className: "mt-1 block leading-6 text-[var(--hq-text-muted)]",
                                                        children: pkg?.description ?? o.note ?? (custom ? 'Choose exactly what you want included.' : '')
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                        lineNumber: 78,
                                                        columnNumber: 21
                                                    }, this),
                                                    pkg?.includes.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                        className: "mt-2 space-y-1 text-[var(--hq-text)]",
                                                        children: pkg.includes.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                className: "flex gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        "aria-hidden": "true",
                                                                        className: "text-[var(--hq-good)]",
                                                                        children: "✓"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                                        lineNumber: 85,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: item
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                                        lineNumber: 88,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, item, true, {
                                                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                                lineNumber: 84,
                                                                columnNumber: 27
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                        lineNumber: 82,
                                                        columnNumber: 23
                                                    }, this) : null
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                                lineNumber: 67,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                        lineNumber: 54,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckBadge"], {
                                        className: "absolute right-3 top-3"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                        lineNumber: 95,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, o.id, true, {
                                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                                lineNumber: 53,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/package-screen.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this),
            canCustomize && picked && picked !== __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: onCustomize,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["linkButton"],
                    children: "Customize this package"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/package-screen.tsx",
                    lineNumber: 103,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/package-screen.tsx",
                lineNumber: 102,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/package-screen.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(PackageScreen, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = PackageScreen;
var _c;
__turbopack_context__.k.register(_c, "PackageScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/question-screen.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QuestionScreen",
    ()=>QuestionScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$pool$2d$shapes$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/pool-shapes.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/materials.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/swatches.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
/**
 * What an option shows above its label: a shape drawing, a photo (a real job,
 * or a labelled style idea), the trade's own material sample (bathroom tile,
 * paint, fixture finish), a crop of the real pool material (the texture the
 * live picture paints, a finish shown under water), or the drawn swatch for
 * anything else.
 */ function visualFor(q, o, tradeVisual) {
    if (q.role === 'shape') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$pool$2d$shapes$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PoolShapeIcon"], {
        shape: o.id,
        className: "h-full w-full"
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/question-screen.tsx",
        lineNumber: 24,
        columnNumber: 34
    }, this);
    if (o.image) {
        // Plain img: contractor photos are public paths of unknown size, and the card crops them to a fixed height.
        // eslint-disable-next-line @next/next/no-img-element
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
            src: o.image,
            alt: "",
            loading: "lazy",
            className: "h-full w-full object-cover"
        }, void 0, false, {
            fileName: "[project]/components/estimator/screens/question-screen.tsx",
            lineNumber: 28,
            columnNumber: 12
        }, this);
    }
    const own = tradeVisual?.(q.id, o.id);
    if (own) return own;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionMaterial"])(q.id, o.id)) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MaterialSample"], {
        questionId: q.id,
        optionId: o.id,
        swatch: o.swatch,
        className: "h-full w-full"
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/question-screen.tsx",
        lineNumber: 32,
        columnNumber: 42
    }, this);
    if (o.swatch) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Swatch"], {
        id: o.swatch,
        className: "h-full w-full"
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/question-screen.tsx",
        lineNumber: 33,
        columnNumber: 24
    }, this);
    if (o.id === 'unsure') {
        // "Help me choose": a strip of every material on offer, so the row of pictures stays even.
        const others = q.options.map((x)=>x.id).filter((id)=>id !== o.id);
        if (others.filter((id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionMaterial"])(q.id, id)).length >= 2) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MaterialSampler"], {
            questionId: q.id,
            optionIds: others,
            className: "h-full w-full"
        }, void 0, false, {
            fileName: "[project]/components/estimator/screens/question-screen.tsx",
            lineNumber: 37,
            columnNumber: 77
        }, this);
    }
    return undefined;
}
function QuestionScreen({ screen, answers, onPick, showPrices, onPreview, optionVisual }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const single = screen.questions.length === 1;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-7",
        children: screen.questions.map((q)=>{
            const picks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers);
            const hasVisual = q.role === 'shape' || q.options.some((o)=>o.swatch || o.image || (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionMaterial"])(q.id, o.id) || optionVisual?.(q.id, o.id));
            // Container queries (the form card is an @container), so tiles fit both the full-width
            // card and the narrower question column beside the live picture (~500 px: two across,
            // so labels like "Resurface existing" never break mid-word).
            const columns = hasVisual ? 'grid-cols-2 @xl:grid-cols-3' : q.role === 'project' || q.options.length <= 3 ? '@md:grid-cols-2' : 'grid-cols-1 @md:grid-cols-2';
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuestionFieldset"], {
                legend: q.label,
                help: q.help ?? (q.kind === 'multi' ? 'Pick all that apply.' : undefined),
                hideLegend: single && q.label === screen.title,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('grid gap-3', columns, q.role === 'shape' && '@xl:grid-cols-4'),
                    children: q.options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChoiceTile"], {
                            type: q.kind === 'single' ? 'radio' : 'checkbox',
                            name: `${uid}-${q.id}`,
                            value: o.id,
                            checked: picks.includes(o.id),
                            onChange: ()=>onPick(q, o.id),
                            label: o.label,
                            note: o.note,
                            hint: showPrices ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionPriceHint"])(o.price, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"]) : undefined,
                            visual: visualFor(q, o, optionVisual),
                            onPreview: onPreview ? (on)=>onPreview(q, on ? o.id : null) : undefined
                        }, o.id, false, {
                            fileName: "[project]/components/estimator/screens/question-screen.tsx",
                            lineNumber: 89,
                            columnNumber: 17
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/estimator/screens/question-screen.tsx",
                    lineNumber: 87,
                    columnNumber: 13
                }, this)
            }, q.id, false, {
                fileName: "[project]/components/estimator/screens/question-screen.tsx",
                lineNumber: 81,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/question-screen.tsx",
        lineNumber: 67,
        columnNumber: 5
    }, this);
}
_s(QuestionScreen, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = QuestionScreen;
var _c;
__turbopack_context__.k.register(_c, "QuestionScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/result-screen.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ResultScreen",
    ()=>ResultScreen,
    "countUpRange",
    ()=>countUpRange,
    "roundLine",
    ()=>roundLine
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/pool.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/reveal-styles.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
/** The line-by-line breakdown; `rounded` (live builder) shows each line rounded like the total. */ function lineList(lines, rounded) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('divide-y divide-[var(--hq-line)] text-sm', rounded ? 'border-t border-[var(--hq-line)]' : 'mt-5 border-y border-[var(--hq-line)]'),
        children: lines.map((line)=>{
            const qty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["describeQuantity"])(line.unit, line.quantity);
            const [low, high] = rounded ? roundLine(line.low, line.high) : [
                line.low,
                line.high
            ];
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-baseline justify-between gap-4 py-2.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                        className: "text-[var(--hq-text)]",
                        children: [
                            line.label,
                            qty ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-xs text-[var(--hq-text-muted)]",
                                children: qty
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 29,
                                columnNumber: 22
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 27,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                        className: "shrink-0 font-medium text-[var(--hq-text)] tabular-nums",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(low, high)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 31,
                        columnNumber: 13
                    }, this)
                ]
            }, `${line.questionId}.${line.optionId}`, true, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 26,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
/** Where the roll starts, as a share of the final figures (close enough that the digit count rarely changes). */ const COUNT_FROM = 0.45;
// Server markup has no layout effects; the browser runs the count-up before first paint.
const useIsoLayoutEffect = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"];
function roundLine(low, high) {
    return [
        Math.floor(low / 100) * 100,
        Math.max(Math.ceil(high / 100) * 100, Math.floor(low / 100) * 100)
    ];
}
/** Ease-out-quint: fast at first, then a long settle, so the last digits land gently. */ function easeOutQuint(p) {
    return 1 - (1 - p) ** 5;
}
function countUpRange(low, high, t) {
    if (t >= 1) return [
        low,
        high
    ];
    const k = COUNT_FROM + (1 - COUNT_FROM) * easeOutQuint(Math.max(0, t));
    const at = (v)=>Math.round(v * k / 500) * 500;
    return [
        at(low),
        at(high)
    ];
}
/**
 * The builder's reveal: rolls the range up to its value once by writing the
 * text straight into `ref` (no React render per frame), then reports `landed`
 * so the figure can settle with a small pop. The server markup and reduced
 * motion show the real value at once.
 */ function useCountUp(ref, low, high, enabled) {
    _s();
    const [landed, setLanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    useIsoLayoutEffect({
        "useCountUp.useIsoLayoutEffect": ()=>{
            const el = ref.current;
            if (!enabled || !el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
            const show = {
                "useCountUp.useIsoLayoutEffect.show": (t)=>{
                    const [a, b] = countUpRange(low, high, t);
                    el.textContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(a, b);
                }
            }["useCountUp.useIsoLayoutEffect.show"];
            show(0);
            let frame = 0;
            let start = 0;
            const tick = {
                "useCountUp.useIsoLayoutEffect.tick": (now)=>{
                    if (!start) start = now + __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["COUNT_DELAY_MS"];
                    const p = Math.min(1, Math.max(0, (now - start) / __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["COUNT_MS"]));
                    show(p);
                    if (p < 1) frame = requestAnimationFrame(tick);
                    else setLanded(true);
                }
            }["useCountUp.useIsoLayoutEffect.tick"];
            frame = requestAnimationFrame(tick);
            return ({
                "useCountUp.useIsoLayoutEffect": ()=>{
                    cancelAnimationFrame(frame);
                    show(1);
                }
            })["useCountUp.useIsoLayoutEffect"];
        }
    }["useCountUp.useIsoLayoutEffect"], [
        ref,
        enabled,
        low,
        high
    ]);
    return landed;
}
_s(useCountUp, "jDW5NYD46hvOlTvMz0u1HVzpBAs=", false, function() {
    return [
        useIsoLayoutEffect
    ];
});
function ResultScreen({ template, contractor, result, firstName, embedded, design, builder, copy }) {
    _s1();
    const rangeId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const words = copy ?? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_COPY"];
    const { estimate, qualified } = result;
    const hasRange = estimate.low !== null && estimate.high !== null;
    const bookingUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeHttpUrl"])(result.calendarUrl ?? contractor.calendarUrl);
    const rollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const landed = useCountUp(rollRef, estimate.low ?? 0, estimate.high ?? 0, Boolean(builder && hasRange));
    const booking = qualified ? result.bookingTicket ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingFlow"], {
        grant: result.bookingTicket,
        heading: null
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 144,
        columnNumber: 7
    }, this) : bookingUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: bookingUrl,
        target: embedded ? '_top' : undefined,
        rel: "noopener",
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryButton"]} w-full sm:w-auto`,
        children: words.bookLabel
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 146,
        columnNumber: 7
    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        role: "status",
        className: "text-sm text-[var(--hq-text)]",
        children: words.contactLine(contractor.contractorName)
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 155,
        columnNumber: 7
    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        role: "status",
        className: "rounded-xl border border-[var(--hq-line-strong)] p-4 text-sm leading-6 text-[var(--hq-text)]",
        children: "Thank you. Our team will review your details and reach out to you directly."
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 160,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-5",
        children: [
            builder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$reveal$2d$styles$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RevealStyles"], {}, void 0, false, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 166,
                columnNumber: 18
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["card"],
                "aria-labelledby": rangeId,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["eyebrow"],
                        children: builder ? 'Your ballpark price' : firstName ? `${firstName}, your ballpark range` : 'Your ballpark range'
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 168,
                        columnNumber: 9
                    }, this),
                    hasRange ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        id: rangeId,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-3 grid origin-left text-4xl font-semibold tracking-tight text-[var(--hq-text)] tabular-nums sm:text-5xl', landed && 'er-land'),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(estimate.low, estimate.high)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 180,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                className: "invisible col-start-1 row-start-1",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(estimate.low, estimate.high)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 182,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                ref: rollRef,
                                "aria-hidden": "true",
                                className: "col-start-1 row-start-1",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(estimate.low, estimate.high)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 185,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        id: rangeId,
                        className: "mt-3 text-2xl font-semibold text-[var(--hq-text)]",
                        children: words.priceOnSite
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 190,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-sm font-semibold text-[var(--hq-text)]",
                        children: "Ballpark, not a quote"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 194,
                        columnNumber: 9
                    }, this),
                    !template.pricesConfirmed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-sm text-[var(--hq-text-muted)]",
                        children: words.examplePriceNote ?? 'Example prices: these figures are placeholders until pricing is confirmed.'
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 196,
                        columnNumber: 11
                    }, this) : null,
                    builder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5",
                        children: booking
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 202,
                        columnNumber: 20
                    }, this) : null,
                    estimate.lines.length ? builder ? // The live builder keeps the moment on the total: the breakdown is one tap away.
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
                        className: "group mt-5 border-t border-[var(--hq-line)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                                className: "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold text-[var(--hq-accent-bright)] hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] [&::-webkit-details-marker]:hidden",
                                children: [
                                    "See what’s included (",
                                    estimate.lines.length,
                                    " ",
                                    estimate.lines.length === 1 ? 'item' : 'items',
                                    ")",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        "aria-hidden": "true",
                                        className: "size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                        lineNumber: 210,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 208,
                                columnNumber: 15
                            }, this),
                            lineList(estimate.lines, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 207,
                        columnNumber: 13
                    }, this) : lineList(estimate.lines, false) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            design,
            estimate.siteVisitItems.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "rounded-xl border border-[var(--hq-warn)]/60 bg-[var(--hq-warn)]/10 p-4 text-sm leading-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "font-semibold text-[var(--hq-text)]",
                        children: words.siteVisitHeading
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 224,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-2 list-disc space-y-0.5 pl-5 text-[var(--hq-text)]",
                        children: estimate.siteVisitItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: item.label
                            }, item.label, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 227,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 225,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 223,
                columnNumber: 9
            }, this) : null,
            template.notIncluded.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "text-sm leading-6 text-[var(--hq-text-muted)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "font-semibold text-[var(--hq-text)]",
                        children: "Not included"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 235,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-1 list-disc space-y-0.5 pl-5",
                        children: template.notIncluded.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: item
                            }, item, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 238,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 236,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 234,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2 text-xs leading-5 text-[var(--hq-text-dim)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: template.disclaimer
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 245,
                        columnNumber: 9
                    }, this),
                    builder && contractor.financingDisclosure ? // One paragraph: the disclosure already says who lends; the note only adds where to ask.
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            contractor.financingDisclosure,
                            contractor.financingNote ? ' Ask about financing at your free on-site estimate.' : ''
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 248,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            contractor.financingNote ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: contractor.financingNote
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 251,
                                columnNumber: 41
                            }, this) : null,
                            contractor.financingDisclosure ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: contractor.financingDisclosure
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                                lineNumber: 252,
                                columnNumber: 47
                            }, this) : null
                        ]
                    }, void 0, true),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            contractor.contractorName,
                            " · ",
                            contractor.licenseLabel
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/result-screen.tsx",
                        lineNumber: 255,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/result-screen.tsx",
                lineNumber: 244,
                columnNumber: 7
            }, this),
            builder ? null : booking
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/result-screen.tsx",
        lineNumber: 165,
        columnNumber: 5
    }, this);
}
_s1(ResultScreen, "7RROrsKgdeOBSxU/IJGSop4VZqI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"],
        useCountUp
    ];
});
_c = ResultScreen;
var _c;
__turbopack_context__.k.register(_c, "ResultScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/size-dimensions.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SizeDimensions",
    ()=>SizeDimensions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function SizeDimensions({ template, enabled, onToggle, value, onChange, hint, using = false }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const boxRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const opened = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(enabled);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SizeDimensions.useEffect": ()=>{
            if (enabled && !opened.current) {
                const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                boxRef.current?.scrollIntoView({
                    block: 'nearest',
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
            opened.current = enabled;
        }
    }["SizeDimensions.useEffect"], [
        enabled
    ]);
    const lim = template.geometry.limits;
    const depth = lim.maxDepthFt > 0;
    // Tabular figures: the digits do not jiggle as the picture resizes with each keystroke.
    const numberInput = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["inputClass"], 'tabular-nums');
    const set = (key)=>(e)=>onChange({
                ...value,
                [key]: e.target.value
            });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-6 border-t border-[var(--hq-line)] pt-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--hq-text)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        checked: enabled,
                        onChange: (e)=>onToggle(e.target.checked),
                        "aria-controls": `${uid}-dims`,
                        className: "size-4 shrink-0 accent-[var(--hq-accent)]"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    "I know my dimensions"
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: `${uid}-dims`,
                ref: boxRef,
                hidden: !enabled,
                className: "scroll-mb-6",
                children: enabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-2 grid gap-3', depth ? 'grid-cols-3' : 'grid-cols-2'),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                                    label: "Length (ft)",
                                    children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            ...p,
                                            type: "number",
                                            inputMode: "decimal",
                                            min: lim.minFt,
                                            max: lim.maxLengthFt,
                                            step: "any",
                                            value: value.length,
                                            onChange: set('length'),
                                            className: numberInput
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                            lineNumber: 68,
                                            columnNumber: 19
                                        }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                    lineNumber: 66,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                                    label: "Width (ft)",
                                    children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            ...p,
                                            type: "number",
                                            inputMode: "decimal",
                                            min: lim.minFt,
                                            max: lim.maxWidthFt,
                                            step: "any",
                                            value: value.width,
                                            onChange: set('width'),
                                            className: numberInput
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                            lineNumber: 73,
                                            columnNumber: 19
                                        }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                    lineNumber: 71,
                                    columnNumber: 15
                                }, this),
                                depth ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                                    label: "Avg depth (ft)",
                                    hint: "Optional",
                                    children: (p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            ...p,
                                            type: "number",
                                            inputMode: "decimal",
                                            min: lim.minDepthFt,
                                            max: lim.maxDepthFt,
                                            step: "any",
                                            value: value.depth,
                                            onChange: set('depth'),
                                            className: numberInput
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                            lineNumber: 79,
                                            columnNumber: 21
                                        }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                                    lineNumber: 77,
                                    columnNumber: 17
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                            lineNumber: 65,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            role: "status",
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-2 min-h-5 text-sm', hint ? 'text-[var(--hq-warn)]' : 'text-[var(--hq-text-muted)]'),
                            children: hint ?? (using ? 'Using your measurements instead of the size above.' : '')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                            lineNumber: 84,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true) : null
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/size-dimensions.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_s(SizeDimensions, "eFuIKUvqQPH43ufJY1OnMktfaiA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = SizeDimensions;
var _c;
__turbopack_context__.k.register(_c, "SizeDimensions");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/screens/unlock-preview.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UnlockPreview",
    ()=>UnlockPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builder-progress.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/scene-panel.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
/**
 * A frosted bar standing in for hidden figures. Deliberately no digits and no
 * "$": the price is not on this device until the contact step is sent.
 */ function Placeholder({ width }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "block h-5 rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,.34),rgba(255,255,255,.16))] blur-[1.5px] sm:h-6",
        style: {
            width
        }
    }, void 0, false, {
        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = Placeholder;
const CSS = `
.eu-shine{animation:eu-shine 3.2s cubic-bezier(.65,0,.35,1) 1s infinite}
@keyframes eu-shine{0%{transform:translateX(-60%);opacity:0}25%{opacity:1}60%,100%{transform:translateX(160%);opacity:0}}
@media (prefers-reduced-motion:reduce){.eu-shine{animation:none;opacity:0}}
`;
const row = 'flex items-center gap-1.5 text-xs font-semibold sm:text-sm';
const UnlockPreview = /*#__PURE__*/ _s((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(_c1 = _s(function UnlockPreview({ template, builder: builderProp, answers, dimensions, rendersEnabled, promise }) {
    _s();
    const builder = builderProp ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["builderFor"])(template);
    const { Scene } = builder;
    const scene = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UnlockPreview.UnlockPreview.useMemo[scene]": ()=>builder.buildSpec(template, {
                answers,
                dimensions
            })
    }["UnlockPreview.UnlockPreview.useMemo[scene]"], [
        builder,
        template,
        answers,
        dimensions
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-unlock-preview": "",
        className: "mb-6",
        children: [
            rendersEnabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                lineNumber: 63,
                columnNumber: 25
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative flex items-stretch gap-3.5 overflow-hidden rounded-[18px] border border-[var(--es-aqua,#2ec5d3)]/30 bg-[#06122b]/55 p-2.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        "aria-hidden": "true",
                        className: "relative aspect-[3/2] w-[44%] max-w-52 shrink-0 self-center overflow-hidden rounded-[10px] bg-[#d8d2c3] outline-1 -outline-offset-1 outline-white/10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Scene, {
                                scene: scene,
                                mode: builder.modes[0].id,
                                label: "",
                                still: true,
                                className: "absolute inset-0 block size-full"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this),
                            rendersEnabled ? // The photo still to come: the right half "developing" (a frost with one slow shine), not their design hidden.
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute inset-y-0 right-0 w-1/2 overflow-hidden bg-[linear-gradient(90deg,rgba(226,240,255,0.35),rgba(226,240,255,0.72))] shadow-[inset_1px_0_0_rgba(255,255,255,0.9)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "eu-shine absolute inset-y-0 -left-1/2 w-full bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.75)_50%,transparent_70%)]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 70,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "absolute inset-0 grid place-items-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "grid size-8 place-items-center rounded-full bg-[#06122b]/80 text-white ring-1 ring-white/30",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                className: "size-4 text-[#ffd666]",
                                                strokeWidth: 2.2
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 73,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                            lineNumber: 72,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 71,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                lineNumber: 69,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "flex min-w-0 flex-1 flex-col justify-center gap-2.5 py-1 pr-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: `${row} text-[var(--hq-text)]`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            "aria-hidden": "true",
                                            className: "grid size-4 shrink-0 place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)] text-[var(--hq-navy)]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                className: "size-2.5",
                                                strokeWidth: 3.4
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 84,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                            lineNumber: 83,
                                            columnNumber: 15
                                        }, this),
                                        "Your design",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sr-only",
                                            children: ", ready"
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                            lineNumber: 86,
                                            columnNumber: 26
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            "aria-hidden": "true",
                                            className: "font-medium text-[var(--hq-text-muted)]",
                                            children: "ready"
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                            lineNumber: 87,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                    lineNumber: 82,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: `${row} text-[var(--hq-text-muted)]`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                                "aria-hidden": "true",
                                                className: "size-3.5 shrink-0 text-[var(--es-aqua,#2ec5d3)]",
                                                strokeWidth: 2.8
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 92,
                                                columnNumber: 15
                                            }, this),
                                            "Ballpark price",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "sr-only",
                                                children: ", unlocks when you finish"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 93,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 91,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        className: "mt-1.5 flex items-center gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Placeholder, {
                                                width: "42%"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 96,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "h-0.5 w-2.5 shrink-0 rounded-full bg-white/30"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 97,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Placeholder, {
                                                width: "48%"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 98,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 95,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                lineNumber: 90,
                                columnNumber: 11
                            }, this),
                            rendersEnabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: `${row} text-[var(--hq-text-muted)]`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                                "aria-hidden": "true",
                                                className: "size-3.5 shrink-0 text-[var(--es-aqua,#2ec5d3)]",
                                                strokeWidth: 2.8
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                                lineNumber: 104,
                                                columnNumber: 17
                                            }, this),
                                            __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHOTO_REWARD_LABEL"]
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 103,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 pl-5 text-[11px] leading-4 text-[var(--hq-text-dim)] sm:text-xs",
                                        children: "Ready about a minute after you unlock"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                        lineNumber: 107,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                                lineNumber: 102,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-sm leading-6 text-pretty text-[var(--hq-text-muted)]",
                children: promise
            }, void 0, false, {
                fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
                lineNumber: 112,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/screens/unlock-preview.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}, "xwAz6KX+6tZu5CFTKLiO8FUPcXM=")), "xwAz6KX+6tZu5CFTKLiO8FUPcXM=");
_c2 = UnlockPreview;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Placeholder");
__turbopack_context__.k.register(_c1, "UnlockPreview$memo");
__turbopack_context__.k.register(_c2, "UnlockPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_estimator_screens_547abfbf._.js.map