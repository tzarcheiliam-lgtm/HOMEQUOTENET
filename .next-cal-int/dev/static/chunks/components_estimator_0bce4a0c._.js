(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/estimator/shell/facts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "contractorFacts",
    ()=>contractorFacts,
    "telHref",
    ()=>telHref
]);
/**
 * Trust facts the branded estimator page shows (header, hero trust row).
 * Only facts the business has published: Pool Masters LA's come from its
 * brochure (V3): "Licensed & insured", "Serving Southern California since
 * 2010", "Complimentary on-site estimates". HomeQuote Network is a matching
 * network, not a contractor, so its facts are about the service only (no
 * license, years or reviews of its own). Nothing here is invented; a business
 * without facts simply shows no trust row.
 *
 * A config's own `facts` win (ContractorEstimatorConfig.facts); this table is
 * the fallback for callers that only have a slug.
 */ const FACTS = {
    'pool-masters': [
        'Licensed & insured',
        'Serving SoCal since 2010',
        'Free on-site estimate'
    ],
    'bathroom-remodel': [
        'Free in-home consultation',
        'No obligation',
        'Free to use'
    ]
};
function contractorFacts(source) {
    if (typeof source !== 'string' && Array.isArray(source.facts)) return source.facts;
    const slug = typeof source === 'string' ? source : source.slug;
    return Object.hasOwn(FACTS, slug) ? FACTS[slug] : [];
}
function telHref(phone) {
    const digits = (phone ?? '').replace(/\D/g, '');
    if (digits.length === 10) return `tel:+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
    return digits.length >= 7 && digits.length <= 15 ? `tel:+${digits}` : null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/shell/estimator-hero.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EstimatorHero",
    ()=>EstimatorHero,
    "heroCopy",
    ()=>heroCopy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
;
;
function heroCopy(rendersEnabled) {
    return rendersEnabled ? {
        headline: 'Design your pool. Get a realistic photo and a ballpark price.',
        subline: 'About 2 minutes. Watch it build with every pick, then unlock the photo of your design and its price range.'
    } : {
        headline: 'Design your pool and get a ballpark price',
        subline: 'About 2 minutes. Watch it build with every pick, then unlock your price range.'
    };
}
function EstimatorHero({ rendersEnabled, facts = [], copy: copyProp, factsLabel = 'About this contractor' }) {
    const copy = copyProp ?? heroCopy(rendersEnabled);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative mx-auto w-full max-w-7xl px-5 pt-3 sm:px-8 sm:pt-8 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:pt-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0 lg:max-w-[44rem]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-balance text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-[2.6rem]",
                        children: copy.headline
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 max-w-xl text-pretty text-sm leading-6 text-[var(--hq-text-muted)] sm:mt-3 sm:text-base sm:leading-7",
                        children: copy.subline
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            facts.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                "aria-label": factsLabel,
                className: "mt-4 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--hq-text)] sm:flex lg:mt-0 lg:shrink-0 lg:flex-col lg:pb-1",
                children: facts.map((fact)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "inline-flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                className: "grid size-[18px] place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)]/15 text-[var(--es-aqua,#2ec5d3)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    className: "size-3",
                                    strokeWidth: 3
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                                    lineNumber: 53,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                                lineNumber: 52,
                                columnNumber: 15
                            }, this),
                            fact
                        ]
                    }, fact, true, {
                        fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                        lineNumber: 51,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                lineNumber: 49,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_c = EstimatorHero;
var _c;
__turbopack_context__.k.register(_c, "EstimatorHero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/shell/reward-tracker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RewardTracker",
    ()=>RewardTracker,
    "newlyDone",
    ()=>newlyDone,
    "rewardState",
    ()=>rewardState,
    "rewardText",
    ()=>rewardText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function rewardState(step) {
    return step.done ? 'done' : step.locked ? 'locked' : 'active';
}
function rewardText(step) {
    const state = rewardState(step);
    return `${step.label}, ${state === 'done' ? 'done' : state === 'locked' ? 'locked' : 'in progress'}`;
}
function newlyDone(previous, next, quiet = []) {
    const before = new Set(previous.filter((s)=>s.done).map((s)=>s.id));
    return next.filter((s)=>s.done && !before.has(s.id) && !quiet.includes(s.id)).map((s)=>s.label);
}
const CSS = `
.es-tick{animation:es-tick .46s cubic-bezier(.34,1.7,.64,1) both}
@keyframes es-tick{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.es-tick{animation:none}}
`;
function RewardTracker({ steps, className, label = 'What you get', quiet }) {
    _s();
    const previous = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [announcement, setAnnouncement] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RewardTracker.useEffect": ()=>{
            if (previous.current) {
                const earned = newlyDone(previous.current, steps, quiet);
                if (earned.length) setAnnouncement(`${earned.join(' and ')} unlocked`);
            }
            previous.current = steps;
        }
    }["RewardTracker.useEffect"], [
        steps,
        quiet
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('min-w-0', className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                "aria-label": label,
                className: "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-5",
                children: steps.map((step, i)=>{
                    const state = rewardState(step);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        "data-state": state,
                        className: "inline-flex items-center gap-1.5",
                        children: [
                            i > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                "aria-hidden": "true",
                                className: "size-3.5 text-[var(--hq-text-dim)]",
                                strokeWidth: 2.5
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                lineNumber: 79,
                                columnNumber: 24
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5', state === 'done' && 'bg-[var(--es-aqua,#2ec5d3)]/12 text-[var(--hq-text)]', state === 'active' && 'text-[var(--hq-text)]', state === 'locked' && 'text-[var(--hq-text-dim)]'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        className: "grid size-5 shrink-0 place-items-center",
                                        children: state === 'done' ? // Keyed on the state so a step that becomes done remounts and pops.
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "es-tick grid size-5 place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)] text-[var(--hq-navy)]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                className: "size-3",
                                                strokeWidth: 3.2
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                                lineNumber: 92,
                                                columnNumber: 23
                                            }, this)
                                        }, "done", false, {
                                            fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                            lineNumber: 91,
                                            columnNumber: 21
                                        }, this) : state === 'locked' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "grid size-5 place-items-center rounded-full border border-[var(--hq-line-strong)]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                                className: "size-2.5",
                                                strokeWidth: 2.8
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                                lineNumber: 96,
                                                columnNumber: 23
                                            }, this)
                                        }, "locked", false, {
                                            fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                            lineNumber: 95,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "size-3.5 rounded-full border-2 border-[var(--es-aqua,#2ec5d3)]"
                                        }, "active", false, {
                                            fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                            lineNumber: 99,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                        lineNumber: 88,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        className: "whitespace-nowrap font-medium",
                                        children: step.label
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                        lineNumber: 102,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sr-only",
                                        children: rewardText(step)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                        lineNumber: 105,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                                lineNumber: 80,
                                columnNumber: 15
                            }, this)
                        ]
                    }, step.id, true, {
                        fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                        lineNumber: 78,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                "aria-live": "polite",
                className: "sr-only",
                children: announcement
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
                lineNumber: 111,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/shell/reward-tracker.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(RewardTracker, "hAWyI8f3fw+bACEQl9dwd1R6vT8=");
_c = RewardTracker;
var _c;
__turbopack_context__.k.register(_c, "RewardTracker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/shell/stage-stepper.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StageStepper",
    ()=>StageStepper,
    "stageStates",
    ()=>stageStates,
    "stageSummary",
    ()=>stageSummary
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
function stageStates(stages, current) {
    const at = stages.findIndex((s)=>s.id === current);
    return stages.map((_, i)=>at < 0 ? 'upcoming' : i < at ? 'done' : i === at ? 'current' : 'upcoming');
}
function stageSummary(stages, current) {
    const at = stages.findIndex((s)=>s.id === current);
    return at < 0 ? '' : `${stages[at].label}, stage ${at + 1} of ${stages.length}`;
}
const EASE = 'ease-[cubic-bezier(.65,0,.35,1)]';
function StageStepper({ stages, current, fraction = 1, className, label = 'Progress' }) {
    // Never empty (the current stage has started) and never more than full.
    const part = Math.min(1, Math.max(0.2, Number.isFinite(fraction) ? fraction : 1));
    const states = stageStates(stages, current);
    const summary = stageSummary(stages, current);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "group",
        "aria-label": label,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('min-w-0', className),
        children: [
            summary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "sr-only",
                children: summary
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                lineNumber: 52,
                columnNumber: 18
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                className: "grid gap-1.5",
                style: {
                    gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(0, 1fr))`
                },
                children: stages.map((stage, i)=>{
                    const state = states[i];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        "data-state": state,
                        "aria-current": state === 'current' ? 'step' : undefined,
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                className: "block h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('block h-full w-full origin-left rounded-full transition-[transform,background-color] duration-500 motion-reduce:transition-none', EASE, state === 'done' ? 'bg-[var(--es-aqua,#2ec5d3)]' : 'bg-[var(--hq-text)]'),
                                    // One property for every state (an inline transform), so moving between states always glides.
                                    style: {
                                        transform: `scaleX(${state === 'done' ? 1 : state === 'upcoming' ? 0 : Math.round(part * 1000) / 1000})`
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                    lineNumber: 59,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                lineNumber: 58,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-1.5 flex min-w-0 items-center gap-1 text-xs leading-4', state === 'current' ? 'text-[var(--hq-text)]' : state === 'done' ? 'text-[var(--hq-text-muted)]' : 'text-[var(--hq-text-dim)]'),
                                children: [
                                    stage.prize && state !== 'done' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                        "aria-hidden": "true",
                                        className: "size-3 shrink-0",
                                        strokeWidth: 2.6
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                        lineNumber: 75,
                                        columnNumber: 52
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "truncate",
                                        children: stage.label
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                        lineNumber: 76,
                                        columnNumber: 17
                                    }, this),
                                    state === 'done' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sr-only",
                                        children: " (done)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                        lineNumber: 77,
                                        columnNumber: 37
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                                lineNumber: 69,
                                columnNumber: 15
                            }, this)
                        ]
                    }, stage.id, true, {
                        fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                        lineNumber: 57,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/shell/stage-stepper.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_c = StageStepper;
var _c;
__turbopack_context__.k.register(_c, "StageStepper");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builder.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Pure helpers behind the live pool builder (the scene beside the questions):
 * hover/focus previews, the "Baja shelf added" change chips, the plain-words
 * design summary and description, and the photoreal render's progress copy.
 * No React and no DOM, so they are unit-tested directly
 * (tests/estimator-builder-ui.test.tsx).
 */ __turbopack_context__.s([
    "RENDER_TYPICAL_MS",
    ()=>RENDER_TYPICAL_MS,
    "addedOptions",
    ()=>addedOptions,
    "answerChanges",
    ()=>answerChanges,
    "chipText",
    ()=>chipText,
    "designSummary",
    ()=>designSummary,
    "formatFeet",
    ()=>formatFeet,
    "isVisualQuestion",
    ()=>isVisualQuestion,
    "optionLabeler",
    ()=>optionLabeler,
    "optionPhrase",
    ()=>optionPhrase,
    "previewAnswers",
    ()=>previewAnswers,
    "renderProgress",
    ()=>renderProgress,
    "renderStartProblem",
    ()=>renderStartProblem,
    "sceneChanges",
    ()=>sceneChanges,
    "sceneDescription",
    ()=>sceneDescription,
    "scrollDelta",
    ()=>scrollDelta
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/render-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
;
;
;
function optionLabeler(template) {
    const labels = new Map();
    for (const q of template.questions)for (const o of q.options)labels.set(`${q.id}.${o.id}`, o.label);
    return (questionId, optionId)=>labels.get(`${questionId}.${optionId}`);
}
/** "fire_pit" -> "Fire pit": last resort when a template has no label for an id. */ function humanize(id) {
    const words = id.replace(/[_-]+/g, ' ').trim();
    return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : id;
}
/** Lower-cases the first letter unless the word looks like an acronym ("LED"). */ function lower(text) {
    return /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}
const SHAPE_PHRASE = {
    rectangle: 'Rectangle pool',
    l_shape: 'L-shaped pool',
    freeform: 'Freeform pool'
};
/** Deck phrases read better hand-written ("Paver deck", not "Pavers deck"). */ const DECK_PHRASE = {
    pavers: 'Paver deck',
    concrete: 'Concrete deck',
    porcelain: 'Porcelain deck',
    resurface: 'Resurfaced deck'
};
/** SceneSpec flag -> the template option it comes from, plus a fallback name. */ const FEATURES = [
    {
        key: 'baja',
        optionId: 'baja',
        name: 'Baja shelf'
    },
    {
        key: 'spa',
        optionId: 'spa',
        name: 'Spa'
    },
    {
        key: 'waterBowls',
        optionId: 'water',
        name: 'Water bowls'
    },
    {
        key: 'fireBowls',
        optionId: 'fire',
        name: 'Fire bowls'
    },
    {
        key: 'lights',
        optionId: 'lighting',
        name: 'LED pool lights'
    }
];
const EXTRAS = [
    {
        key: 'kitchen',
        optionId: 'kitchen',
        name: 'Outdoor kitchen'
    },
    {
        key: 'patioCover',
        optionId: 'patio_cover',
        name: 'Patio cover'
    },
    {
        key: 'turfPlanting',
        optionId: 'turf_planting',
        name: 'Turf and planting'
    },
    {
        key: 'firePit',
        optionId: 'fire_pit',
        name: 'Fire pit'
    }
];
function formatFeet(lengthFt, widthFt) {
    const n = (v)=>String(Math.round(v * 10) / 10);
    return `${n(lengthFt)} × ${n(widthFt)} ft`;
}
/** "Not sure / help me choose" picks, said plainly ("Preview: Not sure pool" reads broken). */ const UNSURE_PHRASE = {
    shape: 'Simple rectangle for now',
    size: 'Typical-size pool',
    surface: 'Finish to pick together',
    tile: 'Tile to pick together',
    coping: 'Coping to pick together',
    deck: 'Deck to pick together'
};
/** What an undecided material is called in "We'll help you pick a finish". */ const MATERIAL_NOUN = {
    surface: 'finish',
    tile: 'waterline tile',
    coping: 'coping',
    deck: 'deck'
};
function optionPhrase(questionId, optionId, label) {
    if (optionId === 'unsure' && UNSURE_PHRASE[questionId]) return UNSURE_PHRASE[questionId];
    const name = label(questionId, optionId) ?? humanize(optionId);
    switch(questionId){
        case 'shape':
            return SHAPE_PHRASE[optionId] ?? `${name} pool`;
        case 'size':
            return `${name} pool`;
        case 'surface':
            return `${name} finish`;
        case 'tile':
            return `${name} waterline tile`;
        case 'coping':
            return `${name} coping`;
        case 'deck':
            return DECK_PHRASE[optionId] ?? `${name} deck`;
        case 'deckSize':
            return `${name} deck area`;
        case 'package':
            return `${name} package`;
        default:
            return name;
    }
}
/* ------------------------------------------------------------------ */ /* Hover / focus preview                                               */ /* ------------------------------------------------------------------ */ /** Questions whose options change the picture (the rest, like equipment or cracks, never preview). */ const VISUAL_IDS = new Set([
    'shape',
    'size',
    'package',
    'surface',
    'tile',
    'coping',
    'deck',
    'deckSize',
    'features',
    'extras'
]);
const VISUAL_ROLES = new Set([
    'shape',
    'size',
    'package',
    'deckSize'
]);
function isVisualQuestion(q) {
    return VISUAL_IDS.has(q.id) || q.role !== undefined && VISUAL_ROLES.has(q.role);
}
function previewAnswers(template, answers, q, optionId, isVisual = isVisualQuestion) {
    if (!isVisual(q) || !q.options.some((o)=>o.id === optionId)) return null;
    const current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers);
    if (current.includes(optionId)) return null;
    if (q.role === 'package') return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyPackage"])(template, answers, optionId);
    if (q.kind === 'single') return {
        ...answers,
        [q.id]: [
            optionId
        ]
    };
    return {
        ...answers,
        [q.id]: [
            ...current,
            optionId
        ]
    };
}
function sceneChanges(prev, next, label = ()=>undefined, unsure = new Set()) {
    const added = [];
    const removed = [];
    for (const f of FEATURES){
        if (prev.features[f.key] === next.features[f.key]) continue;
        const name = label('features', f.optionId) ?? f.name;
        (next.features[f.key] ? added : removed).push(next.features[f.key] ? `${name} added` : `${name} removed`);
    }
    for (const x of EXTRAS){
        if (prev.extras[x.key] === next.extras[x.key]) continue;
        const name = label('extras', x.optionId) ?? x.name;
        (next.extras[x.key] ? added : removed).push(next.extras[x.key] ? `${name} added` : `${name} removed`);
    }
    const materials = [];
    for (const id of [
        'surface',
        'tile',
        'coping',
        'deck'
    ]){
        const value = next[id];
        if (value && value !== prev[id]) materials.push(optionPhrase(id, value, label));
        else if (!value && prev[id] && unsure.has(id)) materials.push(`We’ll help you pick a ${MATERIAL_NOUN[id]}`);
    }
    if (next.deckSize !== 'none' && next.deckSize !== prev.deckSize && !(next.deck && next.deck !== prev.deck)) {
        materials.push(optionPhrase('deckSize', next.deckSize, label));
    }
    const form = [];
    if (next.shape !== prev.shape) form.push(SHAPE_PHRASE[next.shape]);
    if (Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05) {
        form.push(`${formatFeet(next.lengthFt, next.widthFt)} pool`);
    }
    return [
        ...added,
        ...materials,
        ...form,
        ...removed
    ];
}
function answerChanges(template, prev, next, label = ()=>undefined, trade = {}) {
    const phrase = trade.phrase ?? optionPhrase;
    const isVisual = trade.isVisual ?? isVisualQuestion;
    let pkg = null;
    const added = [];
    for (const q of template.questions){
        const before = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, prev);
        const after = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, next);
        if (q.role === 'package') {
            const id = after[0];
            if (id && id !== before[0] && id !== __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]) pkg = `${phrase('package', id, label)} applied`;
            continue;
        }
        if (q.kind !== 'multi' || isVisual(q)) continue;
        for (const id of after)if (!before.includes(id)) added.push(`${label(q.id, id) ?? humanize(id)} added to your plan`);
    }
    return {
        package: pkg,
        added
    };
}
function addedOptions(prev, next) {
    return [
        ...FEATURES.filter((f)=>next.features[f.key] && !prev.features[f.key]).map((f)=>({
                questionId: 'features',
                optionId: f.optionId
            })),
        ...EXTRAS.filter((x)=>next.extras[x.key] && !prev.extras[x.key]).map((x)=>({
                questionId: 'extras',
                optionId: x.optionId
            }))
    ];
}
function chipText(messages, max = 2) {
    if (messages.length === 0) return '';
    const head = messages.slice(0, max).join(' · ');
    return messages.length > max ? `${head} +${messages.length - max} more` : head;
}
function designSummary(scene, label = ()=>undefined) {
    const items = [];
    const shape = {
        rectangle: 'Rectangle',
        l_shape: 'L-shape',
        freeform: 'Freeform'
    }[scene.shape];
    items.push({
        label: 'Pool',
        value: `${shape}, about ${formatFeet(scene.lengthFt, scene.widthFt)}`
    });
    const name = (q, id)=>label(q, id) ?? humanize(id);
    if (scene.surface) items.push({
        label: 'Pool surface',
        value: name('surface', scene.surface)
    });
    if (scene.tile) items.push({
        label: 'Waterline tile',
        value: name('tile', scene.tile)
    });
    if (scene.coping) items.push({
        label: 'Coping',
        value: name('coping', scene.coping)
    });
    if (scene.deck) {
        const size = scene.deckSize !== 'none' ? `, ${lower(name('deckSize', scene.deckSize))}` : '';
        items.push({
            label: 'Deck',
            value: `${name('deck', scene.deck)}${size}`
        });
    }
    const features = FEATURES.filter((f)=>scene.features[f.key]).map((f)=>label('features', f.optionId) ?? f.name);
    if (features.length) items.push({
        label: 'Features',
        value: features.join(', ')
    });
    const extras = EXTRAS.filter((x)=>scene.extras[x.key]).map((x)=>label('extras', x.optionId) ?? x.name);
    if (extras.length) items.push({
        label: 'Backyard',
        value: extras.join(', ')
    });
    return items;
}
/** "a, b and c". */ function listWords(words) {
    if (words.length <= 1) return words.join('');
    return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
function sceneDescription(scene, label = ()=>undefined) {
    const shape = {
        rectangle: 'rectangular',
        l_shape: 'L-shaped',
        freeform: 'freeform'
    }[scene.shape];
    const parts = [];
    if (scene.surface) parts.push(`a ${lower(optionPhrase('surface', scene.surface, label))}`);
    if (scene.tile) parts.push(lower(optionPhrase('tile', scene.tile, label)));
    if (scene.coping) parts.push(lower(optionPhrase('coping', scene.coping, label)));
    if (scene.deck) parts.push(`a ${lower(optionPhrase('deck', scene.deck, label))}`);
    let text = `Top-down illustration of a ${formatFeet(scene.lengthFt, scene.widthFt)} ${shape} pool`;
    if (parts.length) text += ` with ${listWords(parts)}`;
    text += '.';
    const features = FEATURES.filter((f)=>scene.features[f.key]).map((f)=>lower(label('features', f.optionId) ?? f.name));
    const extras = EXTRAS.filter((x)=>scene.extras[x.key]).map((x)=>lower(label('extras', x.optionId) ?? x.name));
    if (features.length) text += ` Features: ${listWords(features)}.`;
    if (extras.length) text += ` Backyard: ${listWords(extras)}.`;
    return text;
}
function scrollDelta(targetTop, viewportHeight, topOffset) {
    if (targetTop >= topOffset && targetTop <= viewportHeight * 0.6) return null;
    return Math.round(targetTop - topOffset);
}
const RENDER_TYPICAL_MS = 40_000;
;
function renderProgress(elapsedMs) {
    if (!(elapsedMs > 0)) return 3;
    const p = 95 * (1 - Math.exp(-elapsedMs / (RENDER_TYPICAL_MS * 0.6)));
    return Math.max(3, Math.min(95, Math.round(p)));
}
const POOL_HELP = {
    helper: 'Your designer',
    visit: 'free on-site visit'
};
function renderStartProblem(result, help = POOL_HELP) {
    const walk = `${help.helper} will walk you through the look at the ${help.visit}.`;
    switch(result.reason){
        case 'disabled':
            return {
                message: `Realistic previews are not available right now. ${walk}`,
                retry: false
            };
        case 'limit':
            return {
                message: `You have reached the number of realistic previews for now. ${help.helper} can show you more at the ${help.visit}.`,
                retry: false
            };
        case 'invalid':
            // Expired session (401), a picture too big (413) or unreadable (422): clicking again cannot fix these.
            return {
                message: result.message ? `${result.message.replace(/\s+$/, '')} ${walk}` : `This design session has ended. ${walk}`,
                retry: false
            };
        default:
            return {
                message: 'We could not create the realistic preview just now. Please try again.',
                retry: true
            };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/swatches.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BathSample",
    ()=>BathSample,
    "MaterialSample",
    ()=>MaterialSample,
    "MaterialSampler",
    ()=>MaterialSampler,
    "SWATCH_IDS",
    ()=>SWATCH_IDS,
    "Swatch",
    ()=>Swatch,
    "hasBathSample",
    ()=>hasBathSample
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/textures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/materials.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const SWATCH_IDS = [
    'plaster',
    'quartz',
    'pebble',
    'tile_porcelain',
    'tile_glass',
    'stone',
    'concrete',
    'travertine',
    'pavers',
    'porcelain_deck',
    'deck_resurface'
];
const SIZE = 48;
/** Small deterministic PRNG so speckles are identical on server and client. */ function rng(seed) {
    let a = seed;
    return ()=>{
        a = a + 0x6d2b79f5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function scatter(seed, count, rMin, rMax, colors) {
    const rand = rng(seed);
    return Array.from({
        length: count
    }, ()=>({
            x: Math.round(rand() * SIZE * 10) / 10,
            y: Math.round(rand() * SIZE * 10) / 10,
            r: Math.round((rMin + rand() * (rMax - rMin)) * 100) / 100,
            fill: colors[Math.floor(rand() * colors.length)]
        }));
}
const QUARTZ_DOTS = scatter(11, 110, 0.35, 1.1, [
    '#ffffff',
    '#ffffff',
    '#9ccbe8',
    '#7fb4d8',
    '#b9dcf0'
]);
const PEBBLE_DOTS = scatter(23, 46, 2, 3.4, [
    '#3f7cae',
    '#86b8dc',
    '#2f6a9b',
    '#a9cbe5',
    '#5b9ac8'
]);
const CONCRETE_DOTS = scatter(37, 120, 0.3, 0.8, [
    '#d6d8da',
    '#8e9195',
    '#e4e5e6',
    '#a2a5a8'
]);
const DECK_DOTS = scatter(41, 70, 0.3, 0.7, [
    '#b9b0a2',
    '#efe9df',
    '#c8bfb0'
]);
const GLASS_CELLS = (()=>{
    const rand = rng(53);
    const palette = [
        '#2b8fc4',
        '#3aa8d0',
        '#1f7aa8',
        '#38b2b0',
        '#4cc4c0',
        '#5ab8e0',
        '#2a9aa4'
    ];
    const cells = [];
    for(let row = 0; row < 8; row++)for(let col = 0; col < 8; col++)cells.push({
        x: col * 6,
        y: row * 6,
        fill: palette[Math.floor(rand() * palette.length)]
    });
    return cells;
})();
/** Hand-placed irregular flagstones (clockwise polygons covering the tile). */ const STONES = [
    {
        points: '0,0 17,0 15,13 3,15 0,10',
        fill: '#b9b2a8'
    },
    {
        points: '17,0 33,0 36,11 28,17 15,13',
        fill: '#a8a095'
    },
    {
        points: '33,0 48,0 48,14 36,11',
        fill: '#bcb5ab'
    },
    {
        points: '0,10 3,15 15,13 17,26 6,30 0,28',
        fill: '#a49c91'
    },
    {
        points: '15,13 28,17 36,11 48,14 46,28 31,30 17,26',
        fill: '#b3aca1'
    },
    {
        points: '0,28 6,30 17,26 19,38 8,42 0,40',
        fill: '#bab3a9'
    },
    {
        points: '17,26 31,30 46,28 48,28 48,40 33,44 19,38',
        fill: '#a69e93'
    },
    {
        points: '0,40 8,42 19,38 33,44 30,48 0,48',
        fill: '#aea79c'
    },
    {
        points: '33,44 48,40 48,48 30,48',
        fill: '#bdb6ac'
    }
];
const TRAVERTINE_VEINS = [
    'M-2 9 C10 4 18 14 30 8 S44 12 50 6',
    'M-2 22 C8 18 20 27 31 21 S45 24 50 19',
    'M-2 36 C12 31 19 41 32 35 S44 40 50 33',
    'M-2 46 C9 42 22 49 34 44 S46 47 50 43'
];
function Content({ id, uid }) {
    switch(id){
        case 'plaster':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                            id: `${uid}g`,
                            x1: "0",
                            y1: "0",
                            x2: "1",
                            y2: "1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0",
                                    stopColor: "#fbfcfd"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 87,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "1",
                                    stopColor: "#e6edf4"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 88,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 86,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 85,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}g)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: "14",
                        cy: "16",
                        rx: "12",
                        ry: "7",
                        fill: "#dbe5ee",
                        fillOpacity: "0.35"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 92,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: "34",
                        cy: "34",
                        rx: "13",
                        ry: "8",
                        fill: "#ffffff",
                        fillOpacity: "0.5"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 93,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'quartz':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#cde5f4"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 99,
                        columnNumber: 11
                    }, this),
                    QUARTZ_DOTS.map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: d.x,
                            cy: d.y,
                            r: d.r,
                            fill: d.fill
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 101,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true);
        case 'pebble':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#4a86b8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 108,
                        columnNumber: 11
                    }, this),
                    PEBBLE_DOTS.map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: d.x,
                            cy: d.y,
                            rx: d.r,
                            ry: d.r * 0.8,
                            fill: d.fill,
                            stroke: "#2f6a9b",
                            strokeOpacity: "0.5",
                            strokeWidth: "0.4"
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 110,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true);
        case 'tile_porcelain':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
                            id: `${uid}p`,
                            width: "16",
                            height: "16",
                            patternUnits: "userSpaceOnUse",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    width: "16",
                                    height: "16",
                                    fill: "#b4bcc6"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 119,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "0.75",
                                    y: "0.75",
                                    width: "14.5",
                                    height: "14.5",
                                    rx: "0.6",
                                    fill: "#eef1f4"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 120,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "0.75",
                                    y: "0.75",
                                    width: "14.5",
                                    height: "7",
                                    rx: "0.6",
                                    fill: "#ffffff",
                                    fillOpacity: "0.5"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 121,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 118,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 117,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}p)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 124,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'tile_glass':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                            id: `${uid}g`,
                            x1: "0",
                            y1: "0",
                            x2: "1",
                            y2: "1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0",
                                    stopColor: "#ffffff",
                                    stopOpacity: "0.5"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 132,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0.45",
                                    stopColor: "#ffffff",
                                    stopOpacity: "0"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 133,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "1",
                                    stopColor: "#ffffff",
                                    stopOpacity: "0.12"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 134,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 131,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 130,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#14566f"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this),
                    GLASS_CELLS.map((c, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: c.x + 0.5,
                            y: c.y + 0.5,
                            width: "5",
                            height: "5",
                            rx: "0.8",
                            fill: c.fill
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 139,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}g)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 141,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'stone':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#7d766c"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 147,
                        columnNumber: 11
                    }, this),
                    STONES.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                            points: s.points,
                            fill: s.fill,
                            stroke: "#7d766c",
                            strokeWidth: "1.2",
                            strokeLinejoin: "round"
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 149,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true);
        case 'concrete':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#b3b6b9"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 156,
                        columnNumber: 11
                    }, this),
                    CONCRETE_DOTS.map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: d.x,
                            cy: d.y,
                            r: d.r,
                            fill: d.fill,
                            fillOpacity: "0.7"
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 158,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M0 24 H48",
                        stroke: "#8e9195",
                        strokeOpacity: "0.55",
                        strokeWidth: "0.8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 160,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'travertine':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: "#e6d8bd"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 166,
                        columnNumber: 11
                    }, this),
                    TRAVERTINE_VEINS.map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: d,
                            fill: "none",
                            stroke: i % 2 ? '#f3eada' : '#c9b78f',
                            strokeOpacity: "0.8",
                            strokeWidth: i % 2 ? 2.4 : 1.2,
                            strokeLinecap: "round"
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 168,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "30",
                        r: "0.9",
                        fill: "#b9a67c",
                        fillOpacity: "0.8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "36",
                        cy: "14",
                        r: "0.7",
                        fill: "#b9a67c",
                        fillOpacity: "0.8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 171,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "28",
                        cy: "40",
                        r: "0.8",
                        fill: "#b9a67c",
                        fillOpacity: "0.8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'pavers':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
                            id: `${uid}p`,
                            width: "24",
                            height: "24",
                            patternUnits: "userSpaceOnUse",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    width: "24",
                                    height: "24",
                                    fill: "#8f867b"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 180,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "0.7",
                                    y: "0.7",
                                    width: "22.6",
                                    height: "10.6",
                                    rx: "0.8",
                                    fill: "#cdc3b5"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 181,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "-11.3",
                                    y: "12.7",
                                    width: "22.6",
                                    height: "10.6",
                                    rx: "0.8",
                                    fill: "#c2b7a8"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 182,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "12.7",
                                    y: "12.7",
                                    width: "22.6",
                                    height: "10.6",
                                    rx: "0.8",
                                    fill: "#d3c9bb"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 183,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 179,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 178,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}p)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 186,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        case 'porcelain_deck':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
                            id: `${uid}p`,
                            width: "24",
                            height: "24",
                            patternUnits: "userSpaceOnUse",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    width: "24",
                                    height: "24",
                                    fill: "#c3beb5"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 194,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "0.9",
                                    y: "0.9",
                                    width: "22.2",
                                    height: "22.2",
                                    rx: "0.6",
                                    fill: "#e9e6e0"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 195,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M3 20 L20 3",
                                    stroke: "#ffffff",
                                    strokeOpacity: "0.5",
                                    strokeWidth: "1.4"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 196,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 193,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 192,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}p)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 199,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
        default:
            // deck_resurface: light, lightly textured coating
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
                            id: `${uid}p`,
                            width: "6",
                            height: "6",
                            patternUnits: "userSpaceOnUse",
                            patternTransform: "rotate(35)",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    width: "6",
                                    height: "6",
                                    fill: "#ddd6ca"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 208,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    width: "6",
                                    height: "1.2",
                                    fill: "#cfc7ba",
                                    fillOpacity: "0.7"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/swatches.tsx",
                                    lineNumber: 209,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 207,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 206,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        fill: `url(#${uid}p)`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 212,
                        columnNumber: 11
                    }, this),
                    DECK_DOTS.map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: d.x,
                            cy: d.y,
                            r: d.r,
                            fill: d.fill,
                            fillOpacity: "0.8"
                        }, i, false, {
                            fileName: "[project]/components/estimator/swatches.tsx",
                            lineNumber: 214,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true);
    }
}
_c = Content;
function Swatch({ id, className }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!SWATCH_IDS.includes(id)) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: `0 0 ${SIZE} ${SIZE}`,
        width: "100%",
        height: "100%",
        preserveAspectRatio: "xMidYMid slice",
        className: className,
        "aria-hidden": "true",
        focusable: "false",
        "data-swatch": id,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                    id: `${uid}c`,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: SIZE,
                        height: SIZE,
                        rx: "8"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/swatches.tsx",
                        lineNumber: 238,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 237,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/swatches.tsx",
                lineNumber: 236,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                clipPath: `url(#${uid}c)`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Content, {
                    id: id,
                    uid: uid
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 242,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/swatches.tsx",
                lineNumber: 241,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "0.5",
                y: "0.5",
                width: SIZE - 1,
                height: SIZE - 1,
                rx: "7.5",
                fill: "none",
                stroke: "#ffffff",
                strokeOpacity: "0.28"
            }, void 0, false, {
                fileName: "[project]/components/estimator/swatches.tsx",
                lineNumber: 244,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/swatches.tsx",
        lineNumber: 226,
        columnNumber: 5
    }, this);
}
_s(Swatch, "xfMyHNFebGjSN1/YPqrD8z5EdLc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = Swatch;
const pct = (n)=>`${Math.round(n * 1000) / 10}%`;
function MaterialSample({ questionId, optionId, swatch, className }) {
    const material = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionMaterial"])(questionId, optionId);
    if (!material) return swatch ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Swatch, {
        id: swatch,
        className: className
    }, void 0, false, {
        fileName: "[project]/components/estimator/swatches.tsx",
        lineNumber: 272,
        columnNumber: 34
    }, this) : null;
    const tex = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TEXTURES"][material.texture];
    const tile = (texture, viewFt)=>texture.src ? {
            backgroundImage: `url(${texture.src})`,
            backgroundSize: `${pct(texture.realFt / viewFt)} auto`,
            backgroundPosition: 'center'
        } : {};
    const water = material.water;
    const caustics = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TEXTURES"].water_caustics;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        "data-material": material.texture,
        "data-swatch": swatch,
        className: `relative block overflow-hidden ${className ?? ''}`,
        style: {
            backgroundColor: tex.fallback,
            ...tile(tex, material.viewFt)
        },
        children: water ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute inset-0",
                    style: {
                        backgroundColor: water.tint,
                        opacity: water.tintOpacity * 0.72
                    }
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 289,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute inset-0",
                    style: {
                        backgroundImage: `linear-gradient(160deg, rgba(255,255,255,.22) 0%, transparent 38%, transparent 55%, ${water.deep} 130%)`
                    }
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 290,
                    columnNumber: 11
                }, this),
                caustics.src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute inset-0 opacity-35",
                    style: tile(caustics, material.viewFt * 1.6)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 291,
                    columnNumber: 27
                }, this) : null,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute inset-0",
                    style: {
                        backgroundImage: 'radial-gradient(22% 16% at 74% 26%, rgba(255,255,255,.55), transparent)'
                    }
                }, void 0, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 292,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true) : // Low sun from the top left, as in the scene.
        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "absolute inset-0",
            style: {
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.16), transparent 42%, rgba(0,0,0,.14))'
            }
        }, void 0, false, {
            fileName: "[project]/components/estimator/swatches.tsx",
            lineNumber: 296,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/swatches.tsx",
        lineNumber: 279,
        columnNumber: 5
    }, this);
}
_c2 = MaterialSample;
function MaterialSampler({ questionId, optionIds, className }) {
    const ids = optionIds.filter((id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optionMaterial"])(questionId, id));
    if (ids.length < 2) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        "data-material-sampler": "",
        className: `block ${className ?? ''}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "flex size-full gap-0.5 bg-[var(--hq-bg)]",
            children: ids.map((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MaterialSample, {
                    questionId: questionId,
                    optionId: id,
                    className: "h-full min-w-0 flex-1"
                }, id, false, {
                    fileName: "[project]/components/estimator/swatches.tsx",
                    lineNumber: 314,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/components/estimator/swatches.tsx",
            lineNumber: 312,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/swatches.tsx",
        lineNumber: 311,
        columnNumber: 5
    }, this);
}
_c3 = MaterialSampler;
/* ------------------------------------------------------------------ */ /* Bathroom materials                                                  */ /* ------------------------------------------------------------------ */ /** How many feet of each bathroom material a tile shows (a few tiles across, a wall of paint). */ const BATH_VIEW_FT = {
    showerTile: 2.5,
    floor: 4,
    paint: 4,
    counter: 2.5,
    vanityFinish: 2.5
};
function hasBathSample(questionId, optionId) {
    return Boolean((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathOptionTexture"])(questionId, optionId)) || questionId === 'metal' && Object.hasOwn(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"], optionId);
}
function BathSample({ questionId, optionId, className }) {
    if (questionId === 'metal') {
        if (!Object.hasOwn(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"], optionId)) return null;
        const color = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"][optionId];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            "aria-hidden": "true",
            "data-bath-metal": optionId,
            className: `relative block overflow-hidden ${className ?? ''}`,
            style: {
                backgroundColor: '#e9e6e0'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute inset-x-[14%] top-1/2 h-[38%] -translate-y-1/2 rounded-full shadow-[0_6px_14px_-6px_rgba(0,0,0,0.55)]",
                style: {
                    backgroundColor: color,
                    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0) 45%, rgba(0,0,0,.22))'
                }
            }, void 0, false, {
                fileName: "[project]/components/estimator/swatches.tsx",
                lineNumber: 347,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/swatches.tsx",
            lineNumber: 345,
            columnNumber: 7
        }, this);
    }
    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathOptionTexture"])(questionId, optionId);
    if (!id) return null;
    const tex = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_TEXTURES"][id];
    const viewFt = BATH_VIEW_FT[questionId] ?? 3;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        "data-material": id,
        className: `relative block overflow-hidden ${className ?? ''}`,
        style: {
            backgroundColor: tex.fallback,
            ...tex.src ? {
                backgroundImage: `url(${tex.src})`,
                backgroundSize: `${pct(Math.min(1, tex.realFt / viewFt))} auto`,
                backgroundPosition: 'center'
            } : {}
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "absolute inset-0",
            style: {
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.18), transparent 45%, rgba(0,0,0,.12))'
            }
        }, void 0, false, {
            fileName: "[project]/components/estimator/swatches.tsx",
            lineNumber: 369,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/swatches.tsx",
        lineNumber: 359,
        columnNumber: 5
    }, this);
}
_c4 = BathSample;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "Content");
__turbopack_context__.k.register(_c1, "Swatch");
__turbopack_context__.k.register(_c2, "MaterialSample");
__turbopack_context__.k.register(_c3, "MaterialSampler");
__turbopack_context__.k.register(_c4, "BathSample");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builders/bath-words.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure words for the live bathroom builder: option phrases, the change chips,
 * the "Your design" list and the picture's accessible description. No React,
 * no DOM. The bath builder agents may refine wording; keep the signatures.
 */ __turbopack_context__.s([
    "BATH_VISUAL_IDS",
    ()=>BATH_VISUAL_IDS,
    "bathAddedOptions",
    ()=>bathAddedOptions,
    "bathChangeMessages",
    ()=>bathChangeMessages,
    "bathDescription",
    ()=>bathDescription,
    "bathDesignSummary",
    ()=>bathDesignSummary,
    "bathHighlights",
    ()=>bathHighlights,
    "bathIsBefore",
    ()=>bathIsBefore,
    "bathIsVisual",
    ()=>bathIsVisual,
    "bathOptionPhrase",
    ()=>bathOptionPhrase,
    "bathResultHeading",
    ()=>bathResultHeading
]);
function humanize(id) {
    const words = id.replace(/[_-]+/g, ' ').trim();
    return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : id;
}
function lower(text) {
    return /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}
function listWords(words) {
    if (words.length <= 1) return words.join('');
    return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
const EXTRAS = [
    {
        key: 'niche',
        optionId: 'niche',
        name: 'Shower niche'
    },
    {
        key: 'bench',
        optionId: 'bench',
        name: 'Shower bench'
    },
    {
        key: 'ledMirror',
        optionId: 'led_mirror',
        name: 'LED mirror'
    },
    {
        key: 'heatedFloor',
        optionId: 'heated_floor',
        name: 'Heated floor'
    },
    {
        key: 'rainHead',
        optionId: 'rain_head',
        name: 'Rain shower head'
    }
];
/** Scope items: what the chip calls each one once it is ticked. */ const RENEW = [
    {
        key: 'bathing',
        name: 'New shower or tub'
    },
    {
        key: 'vanity',
        name: 'New vanity'
    },
    {
        key: 'floor',
        name: 'New floor'
    },
    {
        key: 'walls',
        name: 'Fresh walls'
    }
];
/** Material spec fields and the question each comes from. */ const MATERIALS = [
    [
        'showerTile',
        'showerTile'
    ],
    [
        'vanityFinish',
        'vanityFinish'
    ],
    [
        'counter',
        'counter'
    ],
    [
        'floor',
        'floor'
    ],
    [
        'paint',
        'paint'
    ],
    [
        'metal',
        'metal'
    ]
];
const BATH_VISUAL_IDS = new Set([
    'project',
    'size',
    'package',
    'bathing',
    'showerTile',
    'vanity',
    'vanityFinish',
    'counter',
    'floor',
    'paint',
    'metal',
    'extras'
]);
function bathIsVisual(q) {
    return BATH_VISUAL_IDS.has(q.id) || q.role === 'size' || q.role === 'package';
}
function bathOptionPhrase(questionId, optionId, label) {
    // "Preview: Not sure bathroom" reads broken.
    if (questionId === 'size' && optionId === 'unsure') return 'Typical-size bathroom';
    const name = label(questionId, optionId) ?? humanize(optionId);
    switch(questionId){
        case 'size':
            return `${name} bathroom`;
        case 'showerTile':
            return `${name} shower tile`;
        case 'vanityFinish':
            return `${name} cabinet`;
        case 'counter':
            return `${name} counter`;
        case 'floor':
            return `${name} floor`;
        case 'paint':
            return `${name} walls`;
        case 'metal':
            return `${name} fixtures`;
        case 'package':
            return `${name} package`;
        default:
            return name;
    }
}
function bathChangeMessages(prev, next, label = ()=>undefined) {
    const added = [];
    const removed = [];
    for (const x of EXTRAS){
        if (prev.extras[x.key] === next.extras[x.key]) continue;
        const name = label('extras', x.optionId) ?? x.name;
        if (next.extras[x.key]) added.push(`${name} added`);
        else removed.push(`${name} removed`);
    }
    for (const r of RENEW){
        const was = Boolean(prev.renew?.[r.key]);
        const now = Boolean(next.renew?.[r.key]);
        if (now && !was) added.push(`${r.name} added to your remodel`);
        else if (was && !now) removed.push(`${r.name} removed`);
    }
    const layout = [];
    if (next.bathing !== prev.bathing) {
        // Back to "keep" (or unpicked) still says so, so the last layout's chip never lingers.
        if (next.bathing !== 'existing') layout.push(bathOptionPhrase('bathing', next.bathing, label));
        else if (next.renew?.bathing) layout.push('Keeping your current tub/shower');
    }
    if (next.vanity && next.vanity !== prev.vanity) layout.push(bathOptionPhrase('vanity', next.vanity, label));
    const materials = [];
    for (const [field, questionId] of MATERIALS){
        const value = next[field];
        if (value && value !== prev[field]) materials.push(bathOptionPhrase(questionId, value, label));
    }
    const form = [];
    if (Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05) {
        form.push(`${formatFt(next.lengthFt)} × ${formatFt(next.widthFt)} ft bathroom`);
    }
    return [
        ...added,
        ...layout,
        ...materials,
        ...form,
        ...removed
    ];
}
function formatFt(n) {
    return String(Math.round(n * 10) / 10);
}
/** "a" or "an" before a spoken number: an 8, an 11, an 18 (and 80-89, 800...). */ function articleFor(n) {
    const whole = String(Math.round(n * 10) / 10).split('.')[0];
    return whole.startsWith('8') || whole === '11' || whole === '18' ? 'an' : 'a';
}
/** Room size as the lead and the template notes say it: length x width. */ function roomSize(scene) {
    return `${formatFt(scene.lengthFt)} × ${formatFt(scene.widthFt)} ft`;
}
function bathDesignSummary(scene, label = ()=>undefined) {
    const name = (q, id)=>label(q, id) ?? humanize(id);
    const items = [
        {
            label: 'Bathroom',
            value: `About ${roomSize(scene)}`
        }
    ];
    if (scene.bathing !== 'existing') items.push({
        label: 'Shower/tub',
        value: name('bathing', scene.bathing)
    });
    if (scene.showerTile) items.push({
        label: 'Shower tile',
        value: name('showerTile', scene.showerTile)
    });
    if (scene.vanity) {
        const finish = scene.vanityFinish ? `, ${lower(name('vanityFinish', scene.vanityFinish))}` : '';
        items.push({
            label: 'Vanity',
            value: `${name('vanity', scene.vanity)}${finish}`
        });
    }
    if (scene.counter) items.push({
        label: 'Counter',
        value: name('counter', scene.counter)
    });
    if (scene.floor) items.push({
        label: 'Floor',
        value: name('floor', scene.floor)
    });
    if (scene.paint) items.push({
        label: 'Walls',
        value: name('paint', scene.paint)
    });
    if (scene.metal) items.push({
        label: 'Fixtures',
        value: name('metal', scene.metal)
    });
    const extras = EXTRAS.filter((x)=>scene.extras[x.key]).map((x)=>label('extras', x.optionId) ?? x.name);
    if (extras.length) items.push({
        label: 'Upgrades',
        value: extras.join(', ')
    });
    return items;
}
function bathDescription(scene, label = ()=>undefined) {
    const parts = [];
    if (scene.bathing !== 'existing') parts.push(`a ${lower(bathOptionPhrase('bathing', scene.bathing, label))}`);
    if (scene.showerTile) parts.push(lower(bathOptionPhrase('showerTile', scene.showerTile, label)));
    if (scene.vanity) parts.push(`a ${lower(bathOptionPhrase('vanity', scene.vanity, label))}`);
    if (scene.counter) parts.push(lower(bathOptionPhrase('counter', scene.counter, label)));
    if (scene.floor) parts.push(lower(bathOptionPhrase('floor', scene.floor, label)));
    if (scene.paint) parts.push(lower(bathOptionPhrase('paint', scene.paint, label)));
    if (scene.metal) parts.push(lower(bathOptionPhrase('metal', scene.metal, label)));
    let text = `Illustration of ${articleFor(scene.lengthFt)} ${roomSize(scene)} bathroom`;
    if (parts.length) text += ` with ${listWords(parts)}`;
    text += '.';
    const extras = EXTRAS.filter((x)=>scene.extras[x.key]).map((x)=>lower(label('extras', x.optionId) ?? x.name));
    if (extras.length) text += ` Upgrades: ${listWords(extras)}.`;
    return text;
}
function bathAddedOptions(prev, next) {
    const added = EXTRAS.filter((x)=>next.extras[x.key] && !prev.extras[x.key]).map((x)=>({
            questionId: 'extras',
            optionId: x.optionId
        }));
    if (next.bathing !== prev.bathing && next.bathing !== 'existing') added.unshift({
        questionId: 'bathing',
        optionId: next.bathing
    });
    if (next.vanity && next.vanity !== prev.vanity) added.push({
        questionId: 'vanity',
        optionId: next.vanity
    });
    return added;
}
/** What the result heading calls their bathroom, from the picture they made. */ function bathNoun(scene) {
    if (scene.bathing === 'walk_in') return 'walk-in shower bathroom';
    if (scene.bathing === 'tub_and_shower') return 'spa-style bathroom';
    if (scene.project === 'refresh') return 'refreshed bathroom';
    return 'new bathroom';
}
function bathResultHeading(firstName, scene) {
    const noun = bathNoun(scene);
    const name = firstName.trim();
    return name ? `${name}, here’s your ${noun}` : `Here’s your ${noun}`;
}
function bathHighlights(prev, next) {
    const areas = new Set();
    for (const r of RENEW)if (next.renew?.[r.key] && !prev.renew?.[r.key]) areas.add(r.key);
    if (next.bathing !== prev.bathing && next.bathing !== 'existing') areas.add('bathing');
    if (next.vanity && next.vanity !== prev.vanity) areas.add('vanity');
    return [
        ...areas
    ];
}
function bathIsBefore(scene) {
    const renewed = scene.renew ? Object.values(scene.renew).some(Boolean) : false;
    const extras = Object.values(scene.extras).some(Boolean);
    return scene.bathing === 'existing' && !renewed && !extras && !scene.vanity && [
        scene.showerTile,
        scene.floor,
        scene.paint,
        scene.vanityFinish,
        scene.counter,
        scene.metal
    ].every((v)=>!v);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builders/meta.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TRADE_META",
    ()=>TRADE_META,
    "resolveExampleMedia",
    ()=>resolveExampleMedia,
    "tradeMeta",
    ()=>tradeMeta
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/hero-images.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/estimator-hero.tsx [app-client] (ecmascript)");
;
;
const TRADE_META = {
    pool: {
        hero: {
            withRenders: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["heroCopy"])(true),
            withoutRenders: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["heroCopy"])(false)
        },
        exampleImages: {
            illustration: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HERO_IMAGES"].illustration,
            photo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HERO_IMAGES"].photo,
            designAlt: 'Example design made in this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit',
            photoAlt: 'The same example design as a realistic photo, made from the design picture'
        },
        exampleVideo: null,
        description: (noun, name)=>`Design your ${noun} with ${name}, watch it come to life and get a ballpark price range, then book a free on-site consultation. A ballpark, not a quote.`,
        shareImage: {
            url: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HERO_IMAGES"].illustration,
            alt: 'A pool design made in this builder'
        }
    },
    bathroom: {
        hero: {
            withRenders: {
                headline: 'Design your new bathroom. Get a realistic photo and a ballpark price.',
                subline: 'About 2 minutes. Watch it change with every pick, then unlock an AI-rendered photo of your design and its price range.'
            },
            withoutRenders: {
                headline: 'Design your bathroom and get a ballpark price',
                subline: 'About 2 minutes. Watch it change with every pick, then unlock your price range.'
            }
        },
        exampleImages: {
            illustration: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].illustration,
            photo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].photo,
            designAlt: 'Example design made in this builder: a large bathroom with a marble walk-in shower and bench, a freestanding tub, a floating green vanity and brushed gold fixtures',
            photoAlt: 'The same example design as an AI-rendered realistic photo, made from the design picture',
            // A network with no jobs of its own: the photo half always says it is AI-rendered.
            photoLabel: 'AI-rendered photo',
            caption: 'Example: a design made here, and the AI-rendered photo made from it. Not a real job.'
        },
        exampleVideo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_HERO_VIDEO"],
        // A network, not a contractor: it connects them with a licensed local contractor.
        description: (noun)=>`Design your ${noun}, watch it come to life and get a ballpark price range, then get connected with a licensed local bathroom contractor for a free in-home consultation. A ballpark, not a quote.`,
        shareImage: {
            url: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].illustration,
            alt: 'A bathroom design made in this builder'
        }
    }
};
function tradeMeta(trade) {
    return Object.hasOwn(TRADE_META, trade) ? TRADE_META[trade] : null;
}
function resolveExampleMedia(meta, exists = ()=>true) {
    const pair = meta.exampleImages;
    if (pair && exists(pair.illustration) && exists(pair.photo)) return {
        kind: 'compare',
        ...pair
    };
    const video = meta.exampleVideo;
    if (video && exists(video.poster)) {
        const mp4 = video.mp4 && exists(video.mp4) ? video.mp4 : undefined;
        const webm = video.webm && exists(video.webm) ? video.webm : undefined;
        return {
            kind: 'video',
            ...video,
            mp4,
            webm
        };
    }
    return null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builders/bath.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATH_BUILDER",
    ()=>BATH_BUILDER,
    "BATH_COPY",
    ()=>BATH_COPY
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/geometry.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/rasterize.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$scene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/scene.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$bath$2d$scene$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/bath-scene.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/swatches.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/bath-words.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-client] (ecmascript)");
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
;
/** The shower tile close-up looks at the shower wall; the other finishes at the vanity. */ const SHOWER_CLOSE_UPS = new Set([
    'showerTile'
]);
/** "What changes" flash over a renewed area (classes `bh-*`): a quick lift and a soft rim of light. */ const HIGHLIGHT_CSS = `
.bh-area{position:absolute;pointer-events:none;border-radius:10px;opacity:0;background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 2px rgba(255,255,255,.9),0 0 28px rgba(255,255,255,.5);animation:bh-flash 680ms ease-out both}
@keyframes bh-flash{0%{opacity:0;transform:scale(.985)}25%{opacity:1;transform:none}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.bh-area{display:none}}
`;
const pct = (v, of)=>`${(v / of * 100).toFixed(2)}%`;
function BathHighlights({ scene, items }) {
    _s();
    const boxes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BathHighlights.useMemo[boxes]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathAreaBoxes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathLayout"])(scene))
    }["BathHighlights.useMemo[boxes]"], [
        scene
    ]);
    const areas = items.filter((i)=>typeof i === 'string' && i in boxes);
    if (areas.length === 0) return null;
    const { width: W, height: H } = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_SCENE"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "pointer-events-none absolute inset-0 overflow-hidden",
        "aria-hidden": "true",
        "data-bath-highlights": areas.join(' '),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: HIGHLIGHT_CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            areas.map((area, i)=>{
                const b = boxes[area];
                const style = {
                    left: pct(Math.max(0, b.x), W),
                    top: pct(Math.max(0, b.y), H),
                    width: pct(Math.min(W, b.x + b.w) - Math.max(0, b.x), W),
                    height: pct(Math.min(H, b.y + b.h) - Math.max(0, b.y), H),
                    animationDelay: `${Math.min(i * 60, 120)}ms`
                };
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "bh-area",
                    style: style
                }, area, false, {
                    fileName: "[project]/components/estimator/builders/bath.tsx",
                    lineNumber: 54,
                    columnNumber: 16
                }, this);
            })
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/builders/bath.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_s(BathHighlights, "B2aQ6cpA/sMBJTX67MshorIF8M4=");
_c = BathHighlights;
function BathTradeScene({ scene, mode, label, focus, focusOn, still, leaving, covered, highlight, className }) {
    const close = focus === 'close';
    const picture = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$bath$2d$scene$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BathScene"], {
        scene: scene,
        mood: mode === 'evening' ? 'evening' : 'day',
        label: label,
        focus: close ? 'close' : 'overview',
        target: focusOn && SHOWER_CLOSE_UPS.has(focusOn) ? 'shower' : 'vanity',
        still: still || leaving,
        decorative: leaving || covered,
        className: leaving ? 'absolute inset-0 block size-full' : className
    }, void 0, false, {
        fileName: "[project]/components/estimator/builders/bath.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
    // The example leaving fades out as a whole (the canvas scene has no fade of its own).
    if (leaving) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `eb-leave ${className ?? ''}`,
        children: picture
    }, void 0, false, {
        fileName: "[project]/components/estimator/builders/bath.tsx",
        lineNumber: 75,
        columnNumber: 23
    }, this);
    // The plain "before" room says what it is; highlights land on the overview only (the boxes are unzoomed).
    const before = !still && !covered && (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathIsBefore"])(scene);
    const flash = highlight && !close && !still ? highlight : null;
    if (!before && !flash) return picture;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className ?? 'relative',
        children: [
            picture,
            flash ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BathHighlights, {
                scene: scene,
                items: flash.items
            }, flash.key, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 83,
                columnNumber: 16
            }, this) : null,
            before ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute right-2.5 top-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/70 px-3 text-[11px] font-semibold text-white shadow-sm sm:right-3 sm:top-3 sm:h-8 sm:text-xs",
                children: "Your bathroom today"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 85,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/builders/bath.tsx",
        lineNumber: 81,
        columnNumber: 5
    }, this);
}
_c1 = BathTradeScene;
/**
 * "Keep my current tub/shower" has no photo: a small drawing of a plain
 * existing tub-shower alcove keeps the row of option pictures even.
 * Decorative (the tile's label says what it is).
 */ function KeepCurrentThumb() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: "0 0 120 80",
        preserveAspectRatio: "xMidYMid slice",
        "aria-hidden": "true",
        "data-keep-thumb": "",
        className: "h-full w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: "120",
                height: "80",
                fill: "#e9e4da"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                y: "62",
                width: "120",
                height: "18",
                fill: "#d8cfbf"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "18",
                y: "10",
                width: "64",
                height: "52",
                fill: "#e4dccb"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M18 23H82M18 36H82M18 49H82M34 10V62M50 10V62M66 10V62",
                stroke: "#cfc4b0",
                strokeWidth: "0.8"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "18",
                y: "47",
                width: "64",
                height: "17",
                rx: "1.5",
                fill: "#f6f4ef"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "18",
                y: "47",
                width: "64",
                height: "2.5",
                fill: "#ffffff"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 111,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M50 16v4",
                stroke: "#b9bcbf",
                strokeWidth: "1.4"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "50",
                cy: "21",
                rx: "3.2",
                ry: "1.6",
                fill: "#c3c6c9"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "50",
                cy: "35",
                r: "2.4",
                fill: "#c3c6c9"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16 8H84",
                stroke: "#b9bcbf",
                strokeWidth: "1.2"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M17 8.5h17v46c-3 1-14 1-17 0z",
                fill: "#efe8dc"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M21 9v45M25.5 9v45.5M30 9v45",
                stroke: "#ddd3c3",
                strokeWidth: "1"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "82",
                y: "6",
                width: "6",
                height: "58",
                fill: "#efebe3"
            }, void 0, false, {
                fileName: "[project]/components/estimator/builders/bath.tsx",
                lineNumber: 121,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/builders/bath.tsx",
        lineNumber: 103,
        columnNumber: 5
    }, this);
}
_c2 = KeepCurrentThumb;
const BATH_COPY = {
    subject: 'bathroom',
    stageLabel: 'Bathroom',
    sceneCaption: 'Illustration — final details are confirmed at your free in-home consultation',
    sceneCaptionShort: 'Illustration — final details confirmed in person',
    photoCaption: 'AI-rendered photo of your design, not a finished job. Final details are confirmed at your free in-home consultation.',
    // A network with no jobs of its own: the photo always says it is AI-rendered.
    photoLabel: 'AI-rendered photo',
    chipPhotoNote: 'Style idea (AI-generated)',
    hiddenNote: 'Your bathroom picture is hidden.',
    visit: 'free in-home consultation',
    helper: 'Your contractor',
    bookLabel: 'Book your free in-home consultation',
    siteVisitHeading: 'Confirmed in person at your free consultation',
    priceOnSite: 'Priced in person at your free consultation',
    // The network acts first (the funnel's thank-you page): a project specialist calls, then the match.
    contactLine: (name)=>`A ${name} project specialist will call you shortly to talk through your design and next steps, including a free in-home consultation with a licensed local bathroom contractor.`,
    // Still plainly an example (compliance), but says what the figures are instead of calling them placeholders.
    examplePriceNote: 'Example prices: a typical Southern California range for a design like this, not yet confirmed by a local contractor.',
    designFile: 'my-bathroom-design.png',
    photoFile: 'my-bathroom-photo.jpg',
    shareTitle: 'My bathroom design',
    shareDesignText: 'My new bathroom design.',
    sharePhotoText: 'A realistic photo of my new bathroom design.'
};
const BATH_BUILDER = {
    trade: 'bathroom',
    buildSpec: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$scene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildBathScene"],
    exampleSpec: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$scene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EXAMPLE_BATH_SCENE"],
    Scene: BathTradeScene,
    modes: [
        {
            id: 'day',
            label: 'Daylight',
            icon: 'sun'
        },
        {
            id: 'evening',
            label: 'Evening',
            icon: 'moon'
        }
    ],
    changeMessages: (prev, next, label)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathChangeMessages"])(prev, next, label),
    optionPhrase: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathOptionPhrase"],
    isVisual: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathIsVisual"],
    designSummary: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathDesignSummary"],
    describe: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathDescription"],
    closeUpIds: new Set([
        'showerTile',
        'vanityFinish',
        'counter',
        'metal'
    ]),
    highlights: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathHighlights"],
    addedOptions: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathAddedOptions"],
    unsureIds: [],
    chipAlign: 'start',
    optionVisual: (questionId, optionId)=>questionId === 'bathing' && optionId === 'keep' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KeepCurrentThumb, {}, void 0, false, {
            fileName: "[project]/components/estimator/builders/bath.tsx",
            lineNumber: 184,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0)) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasBathSample"])(questionId, optionId) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$swatches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BathSample"], {
            questionId: questionId,
            optionId: optionId,
            className: "h-full w-full"
        }, void 0, false, {
            fileName: "[project]/components/estimator/builders/bath.tsx",
            lineNumber: 186,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0)) : null,
    rasterize: (frame)=>{
        const el = frame.querySelector('[data-bath-scene] > canvas:not(.bs-prev)') ?? frame.querySelector('[data-bath-scene] svg');
        return el ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rasterizeBathScene"])(el) : Promise.reject(new Error('scene not found'));
    },
    hero: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].bathroom.hero,
    copy: BATH_COPY,
    resultHeading: (firstName, _items, spec)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2d$words$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bathResultHeading"])(firstName, spec),
    exampleImages: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].bathroom.exampleImages,
    exampleVideo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].bathroom.exampleVideo,
    renderSubject: 'bathroom'
};
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "BathHighlights");
__turbopack_context__.k.register(_c1, "BathTradeScene");
__turbopack_context__.k.register(_c2, "KeepCurrentThumb");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builders/pool.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_BUILDER",
    ()=>POOL_BUILDER,
    "POOL_COPY",
    ()=>POOL_COPY,
    "poolResultHeading",
    ()=>poolResultHeading
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$example$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/example.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/highlights.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/rasterize.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$scene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/scene.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builder.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$pool$2d$scene$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/pool-scene.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
const SHAPE_WORD = {
    Rectangle: 'rectangular',
    'L-shape': 'L-shaped',
    Freeform: 'freeform'
};
function poolResultHeading(firstName, items) {
    const shape = SHAPE_WORD[items.find((i)=>i.label === 'Pool')?.value.split(',')[0]?.trim() ?? ''];
    const pool = shape ? `${shape} pool` : 'pool';
    const name = firstName.trim();
    return name ? `${name}, here’s your ${pool}` : `Here’s your ${pool}`;
}
function PoolTradeScene({ scene, mode, label, focus, intro, still, highlight, leaving, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$pool$2d$scene$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PoolScene"], {
        scene: scene,
        night: mode === 'night',
        label: label,
        focus: focus === 'close' ? 'pool' : 'yard',
        intro: intro,
        still: still,
        // Same object the panel holds (the pool scene keys its flash on it).
        highlight: highlight,
        className: leaving ? `ps-leave ${className ?? ''}` : className
    }, void 0, false, {
        fileName: "[project]/components/estimator/builders/pool.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_c = PoolTradeScene;
const POOL_COPY = {
    subject: 'pool',
    stageLabel: 'Pool',
    sceneCaption: 'Illustration — your final design is confirmed at the on-site visit',
    sceneCaptionShort: 'Illustration — final design confirmed on site',
    photoCaption: 'AI-rendered photo of your design. Final details are confirmed at your free on-site visit.',
    chipPhotoNote: 'Like this finished job',
    hiddenNote: 'Your pool picture is hidden.',
    visit: 'free on-site visit',
    helper: 'Your designer',
    bookLabel: 'Book your free on-site consultation',
    siteVisitHeading: 'We will confirm these on site',
    priceOnSite: 'We will price this with you on site',
    contactLine: (name)=>`${name} will contact you to set up your free on-site consultation.`,
    designFile: 'my-pool-design.png',
    photoFile: 'my-pool-photo.jpg',
    shareTitle: 'My pool design',
    shareDesignText: 'My new pool design.',
    sharePhotoText: 'A realistic photo of my new pool design.'
};
const POOL_BUILDER = {
    trade: 'pool',
    buildSpec: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$scene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildScene"],
    exampleSpec: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$example$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EXAMPLE_SCENE"],
    Scene: PoolTradeScene,
    modes: [
        {
            id: 'day',
            label: 'Day',
            icon: 'sun'
        },
        {
            id: 'night',
            label: 'Night',
            icon: 'moon'
        }
    ],
    changeMessages: (prev, next, label, unsure)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sceneChanges"])(prev, next, label, unsure),
    optionPhrase: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["optionPhrase"],
    isVisual: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isVisualQuestion"],
    designSummary: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["designSummary"],
    describe: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sceneDescription"],
    closeUpIds: new Set([
        'surface',
        'tile',
        'coping'
    ]),
    highlights: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sceneHighlights"],
    addedOptions: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["addedOptions"],
    unsureIds: [
        'surface',
        'tile',
        'coping',
        'deck'
    ],
    rasterize: (frame)=>{
        const svg = frame.querySelector('svg.ps-root') ?? frame.querySelector('svg');
        return svg ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rasterizeScene"])(svg) : Promise.reject(new Error('scene not found'));
    },
    hero: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].pool.hero,
    copy: POOL_COPY,
    resultHeading: poolResultHeading,
    exampleImages: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].pool.exampleImages,
    exampleVideo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRADE_META"].pool.exampleVideo,
    renderSubject: 'backyard pool'
};
var _c;
__turbopack_context__.k.register(_c, "PoolTradeScene");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builders/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getTradeBuilder",
    ()=>getTradeBuilder
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/bath.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/pool.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-client] (ecmascript)");
;
;
;
/** The live-builder adapter per trade (kitchen slots in here). */ const BUILDERS = {
    pool: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_BUILDER"],
    bathroom: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$bath$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_BUILDER"]
};
function getTradeBuilder(trade) {
    return Object.hasOwn(BUILDERS, trade) ? BUILDERS[trade] : null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builder-progress.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure helpers for the live builder's sense of progress: the named
 * stages above the questions (Pool, Style, Details, Unlock), the rewards being
 * earned (Design, Price, Realistic photo) and the wording of the unlock step.
 * No React and no DOM, so they are unit-tested directly
 * (tests/estimator-unlock.test.tsx).
 *
 * Honesty rules: the realistic photo is only named when renders are switched
 * on (rendersEnabled), and nothing here ever carries a price.
 */ __turbopack_context__.s([
    "PHOTO_REWARD_LABEL",
    ()=>PHOTO_REWARD_LABEL,
    "flowStages",
    ()=>flowStages,
    "rewardSteps",
    ()=>rewardSteps,
    "stageFraction",
    ()=>stageFraction,
    "unlockCopy",
    ()=>unlockCopy
]);
/** Short enough that four fit side by side on a 390 px phone. */ const STAGE_LABEL = {
    pool: 'Pool',
    style: 'Style',
    details: 'Details',
    unlock: 'Unlock'
};
const ORDER = [
    'pool',
    'style',
    'details',
    'unlock'
];
const POOL_ROLES = new Set([
    'project',
    'shape',
    'size'
]);
/** Finishes and features are part of the look, so "Build my own" adds screens to Style instead of new stages. */ const STYLE_IDS = new Set([
    'surface',
    'tile',
    'coping',
    'deck',
    'deckSize',
    'features',
    'equipment'
]);
const DETAIL_IDS = new Set([
    'extras',
    'cracks',
    'access',
    'hillside'
]);
/** The stage a screen belongs to on its own merits, or undefined (it then joins the stage before it). */ function ownStage(screen) {
    if (screen.kind === 'zip' || screen.kind === 'contact') return 'unlock';
    // "Which look do you like?" is inspiration for the style, wherever it sits in the path.
    if (screen.kind === 'looks') return 'style';
    if (screen.kind !== 'questions') return undefined;
    if (screen.group === 'package' || screen.group === 'scope') return 'style';
    const has = (set)=>screen.questions.some((q)=>set.has(q.id) || q.role !== undefined && set.has(q.role));
    if (has(POOL_ROLES)) return 'pool';
    if (has(STYLE_IDS)) return 'style';
    if (has(DETAIL_IDS) || screen.id === 'property') return 'details';
    return undefined;
}
function flowStages(screens, firstLabel = STAGE_LABEL.pool) {
    const labels = {
        ...STAGE_LABEL,
        pool: firstLabel
    };
    const stages = [];
    const stageOf = {};
    let current;
    for (const screen of screens){
        const own = ownStage(screen);
        const next = own && (!current || ORDER.indexOf(own) > ORDER.indexOf(current)) ? own : current ?? own ?? 'pool';
        if (next !== current) {
            current = next;
            stages.push(next === 'unlock' ? {
                id: next,
                label: labels[next],
                prize: true
            } : {
                id: next,
                label: labels[next]
            });
        }
        stageOf[screen.id] = current;
    }
    return {
        stages,
        stageOf
    };
}
function stageFraction(screens, stageOf, screenId) {
    const stage = stageOf[screenId];
    if (!stage) return 0;
    const inStage = screens.filter((s)=>stageOf[s.id] === stage);
    const at = inStage.findIndex((s)=>s.id === screenId);
    return at < 0 ? 0 : (at + 1) / inStage.length;
}
const PHOTO_REWARD_LABEL = 'Realistic photo';
function rewardSteps(phase, rendersEnabled, photo = 'none') {
    const steps = [
        {
            id: 'design',
            label: 'Design',
            done: phase !== 'design'
        },
        {
            id: 'price',
            label: 'Price',
            done: phase === 'result',
            locked: phase !== 'result'
        }
    ];
    if (phase !== 'result') {
        if (rendersEnabled) steps.push({
            id: 'photo',
            label: PHOTO_REWARD_LABEL,
            done: false,
            locked: true
        });
    } else if (photo !== 'none') {
        steps.push({
            id: 'photo',
            label: PHOTO_REWARD_LABEL,
            done: photo === 'done'
        });
    }
    return steps;
}
function unlockCopy(rendersEnabled, subject = 'pool') {
    return rendersEnabled ? {
        zipTitle: 'Unlock your realistic photo and price',
        contactTitle: 'One last step to unlock your photo and price',
        promise: `Your design is ready. Unlock your ballpark price now, and a realistic photo of your ${subject} about a minute later.`,
        submit: 'Unlock my photo and price',
        submitting: 'Crunching numbers…'
    } : {
        zipTitle: 'Unlock your price',
        contactTitle: 'One last step to unlock your price',
        promise: 'Your design is ready. Unlock your ballpark price range to see what it could cost.',
        submit: 'Unlock my price',
        submitting: 'Crunching numbers…'
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/motion.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Motion for the live pool builder: screen slides, the change chip, the frame
 * glow when the picture changes, the render shimmer and the photoreal reveal.
 * Class names are prefixed `eb-`; every instance carries the same rules, so
 * rendering <BuilderStyles /> more than once is harmless. Everything stops
 * under prefers-reduced-motion (the chip then simply appears and disappears).
 */ __turbopack_context__.s([
    "BUILDER_CSS",
    ()=>BUILDER_CSS,
    "BuilderStyles",
    ()=>BuilderStyles,
    "CHIP_MS",
    ()=>CHIP_MS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const EASE = 'cubic-bezier(.22,.8,.24,1)';
const CHIP_MS = 2600;
const BUILDER_CSS = `
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
function BuilderStyles() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
        children: BUILDER_CSS
    }, void 0, false, {
        fileName: "[project]/components/estimator/motion.tsx",
        lineNumber: 39,
        columnNumber: 10
    }, this);
}
_c = BuilderStyles;
var _c;
__turbopack_context__.k.register(_c, "BuilderStyles");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/builder-render.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure logic behind the result's realistic photo: the render session
 * (capture the design, start the render, poll, preload the image) with its
 * I/O injected so it runs in tests without a browser, when to start it on its
 * own, the "developing" clock, and how Share works on this device.
 * No React and no DOM (tests/estimator-unlock.test.tsx).
 */ __turbopack_context__.s([
    "AUTO_RENDER_DELAY_MS",
    ()=>AUTO_RENDER_DELAY_MS,
    "RENDER_MESSAGES",
    ()=>RENDER_MESSAGES,
    "formatElapsed",
    ()=>formatElapsed,
    "renderWorking",
    ()=>renderWorking,
    "runRenderSession",
    ()=>runRenderSession,
    "sharePlan",
    ()=>sharePlan,
    "shouldAutoRender",
    ()=>shouldAutoRender
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builder.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/render-client.ts [app-client] (ecmascript)");
;
const RENDER_MESSAGES = {
    capture: 'We could not capture your design for the realistic photo. Please try again.',
    slow: 'The realistic photo is taking longer than it should. Please try again in a minute.',
    load: 'We could not load the realistic photo. Please try again.',
    finish: 'We could not finish the realistic photo. Please try again.'
};
async function runRenderSession(deps, onPhase, /** `help`: who shows the look in person, for the "cannot make a photo" messages (pool wording by default). */ opts = {}) {
    const pollMs = opts.pollMs ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_POLL_MS"];
    const timeoutMs = opts.timeoutMs ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_TIMEOUT_MS"];
    const stopped = {
        kind: 'idle'
    };
    const emit = (phase)=>{
        if (deps.cancelled()) return stopped;
        onPhase(phase);
        return phase;
    };
    const failed = (message)=>emit({
            kind: 'failed',
            message
        });
    emit({
        kind: 'preparing'
    });
    let png;
    try {
        png = await deps.capture();
    } catch  {
        return failed(RENDER_MESSAGES.capture);
    }
    if (deps.cancelled()) return stopped;
    const res = await deps.start(png).catch(()=>({
            ok: false,
            reason: 'error',
            message: ''
        }));
    if (!res.ok) {
        const problem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["renderStartProblem"])(res, opts.help);
        return problem.retry ? failed(problem.message) : emit({
            kind: 'off',
            message: problem.message
        });
    }
    const startedAt = deps.now();
    emit({
        kind: 'running',
        taskId: res.taskId,
        before: png,
        startedAt
    });
    for(;;){
        await deps.sleep(pollMs);
        if (deps.cancelled()) return stopped;
        if (deps.now() - startedAt > timeoutMs) return failed(RENDER_MESSAGES.slow);
        let status;
        try {
            status = await deps.check(res.taskId);
        } catch  {
            continue; // a dropped check is retried; the timeout above still applies
        }
        if (deps.cancelled()) return stopped;
        if (status.status === 'failed') return failed(RENDER_MESSAGES.finish);
        if (status.status === 'done') {
            try {
                await deps.preload(status.imageUrl);
            } catch  {
                return failed(RENDER_MESSAGES.load);
            }
            return emit({
                kind: 'done',
                before: png,
                imageUrl: status.imageUrl
            });
        }
    }
}
function shouldAutoRender(renderToken, alreadyStarted) {
    return Boolean(renderToken) && !alreadyStarted.has(renderToken);
}
const AUTO_RENDER_DELAY_MS = 1600;
function renderWorking(phase) {
    return phase.kind === 'preparing' || phase.kind === 'running';
}
function formatElapsed(ms) {
    const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function sharePlan(env, hasPhoto) {
    if (env.canShareFiles) return 'files';
    if (hasPhoto && env.canShare) return 'link';
    if (hasPhoto && env.canCopy) return 'copy';
    return null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/ui.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CheckBadge",
    ()=>CheckBadge,
    "ChoiceTile",
    ()=>ChoiceTile,
    "Field",
    ()=>Field,
    "QuestionFieldset",
    ()=>QuestionFieldset,
    "card",
    ()=>card,
    "eyebrow",
    ()=>eyebrow,
    "hiddenInput",
    ()=>hiddenInput,
    "inputClass",
    ()=>inputClass,
    "linkButton",
    ()=>linkButton,
    "pressable",
    ()=>pressable,
    "previewHandlers",
    ()=>previewHandlers,
    "primaryButton",
    ()=>primaryButton,
    "secondaryButton",
    ()=>secondaryButton,
    "textareaClass",
    ()=>textareaClass
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
const card = 'rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/60 p-4 sm:p-6';
const eyebrow = 'text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]';
const inputClass = 'h-11 w-full rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-3 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] aria-[invalid=true]:border-[var(--hq-bad)]';
const textareaClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(inputClass, 'h-auto min-h-24 py-2.5 leading-6');
const primaryButton = 'inline-flex h-12 items-center justify-center rounded-full bg-[var(--hq-cta)] px-7 text-sm font-semibold text-[var(--hq-cta-ink)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-not-allowed disabled:bg-[var(--hq-surface-2)] disabled:text-[var(--hq-text-dim)] disabled:hover:bg-[var(--hq-surface-2)]';
const secondaryButton = 'inline-flex h-12 items-center justify-center rounded-full border border-[var(--hq-line-strong)] px-6 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:border-[var(--hq-accent-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
const linkButton = 'inline-flex min-h-11 items-center text-sm font-medium text-[var(--hq-accent-bright)] underline underline-offset-4 hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
const pressable = 'touch-manipulation [transition:scale_380ms_cubic-bezier(.34,1.56,.64,1),border-color_150ms_ease,background-color_150ms_ease] active:scale-[.97] active:[transition:scale_90ms_ease-out,border-color_150ms_ease,background-color_150ms_ease] motion-reduce:transition-none! motion-reduce:scale-100!';
const tile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-3.5 text-sm hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]', pressable);
function CheckBadge({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        "data-check-badge": "",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('pointer-events-none grid size-7 place-items-center rounded-full bg-[#06122b]/45 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.75),0_2px_8px_rgba(0,0,0,0.3)]', className),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "grid size-7 place-items-center rounded-full bg-[var(--hq-accent-bright)] text-[var(--hq-bg)] opacity-0 shadow-[0_0_0_2px_var(--hq-bg),0_4px_12px_rgba(0,0,0,0.35)] [scale:.4] [transition:opacity_120ms_ease-out,scale_120ms_ease-out] group-has-[:checked]:opacity-100 group-has-[:checked]:[scale:1] group-has-[:checked]:[transition:opacity_140ms_ease-out,scale_420ms_cubic-bezier(.34,1.8,.64,1)] motion-reduce:transition-none!",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                className: "size-4",
                strokeWidth: 3
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 57,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/ui.tsx",
            lineNumber: 56,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/ui.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_c = CheckBadge;
const hiddenInput = 'peer sr-only';
function previewHandlers(onPreview) {
    if (!onPreview) return {
        label: {},
        input: {}
    };
    return {
        label: {
            onPointerMove: (e)=>{
                if (e.pointerType === 'touch' || e.currentTarget.dataset.preview === 'on') return;
                // Layout shifts under a still cursor can produce moves of zero distance.
                if (e.movementX === 0 && e.movementY === 0) return;
                e.currentTarget.dataset.preview = 'on';
                onPreview(true);
            },
            onPointerLeave: (e)=>{
                if (e.pointerType === 'touch' || e.currentTarget.dataset.preview !== 'on') return;
                delete e.currentTarget.dataset.preview;
                onPreview(false);
            }
        },
        input: {
            onFocus: (e)=>{
                let keyboard = false;
                try {
                    keyboard = e.currentTarget.matches(':focus-visible');
                } catch  {
                // Very old browsers: no :focus-visible, no focus preview.
                }
                if (keyboard) onPreview(true);
            },
            onBlur: ()=>onPreview(false)
        }
    };
}
function ChoiceTile({ type, name, value, checked, onChange, label, note, hint, visual, onPreview, className, children }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const describedBy = note || hint ? `${uid}-d` : undefined;
    const preview = previewHandlers(onPreview);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(tile, className),
        ...preview.label,
        children: [
            visual ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative block",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "relative block h-24 overflow-hidden rounded-lg after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:h-28 [&>*]:block [&>*]:h-full [&>*]:w-full [&>img]:object-cover",
                        children: visual
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/ui.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CheckBadge, {
                        className: "absolute right-2 top-2"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/ui.tsx",
                        lineNumber: 151,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 146,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-start', !visual && 'gap-3'),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: type,
                        name: name,
                        value: value,
                        checked: checked,
                        onChange: onChange,
                        ...preview.input,
                        "aria-labelledby": `${uid}-l`,
                        "aria-describedby": describedBy,
                        // With a picture the badge on it is the one selected mark; without one the native control is.
                        className: visual ? hiddenInput : 'mt-0.5 size-4 shrink-0 accent-[var(--hq-accent)]'
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/ui.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                id: `${uid}-l`,
                                className: "block font-medium text-[var(--hq-text)]",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/ui.tsx",
                                lineNumber: 168,
                                columnNumber: 11
                            }, this),
                            note || hint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                id: describedBy,
                                className: "mt-0.5 block text-xs leading-5 text-[var(--hq-text-muted)]",
                                children: [
                                    note,
                                    note && hint ? ' · ' : null,
                                    hint
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/ui.tsx",
                                lineNumber: 172,
                                columnNumber: 13
                            }, this) : null,
                            children
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/ui.tsx",
                        lineNumber: 167,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 154,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/ui.tsx",
        lineNumber: 144,
        columnNumber: 5
    }, this);
}
_s(ChoiceTile, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = ChoiceTile;
function QuestionFieldset({ legend, help, hideLegend, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        className: "min-w-0 border-0 p-0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mb-1 text-base font-semibold text-[var(--hq-text)]', hideLegend && 'sr-only'),
                children: legend
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 199,
                columnNumber: 7
            }, this),
            help ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 text-sm leading-6 text-[var(--hq-text-muted)]",
                children: help
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 200,
                columnNumber: 15
            }, this) : null,
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/ui.tsx",
        lineNumber: 198,
        columnNumber: 5
    }, this);
}
_c2 = QuestionFieldset;
function Field({ label, error, hint, children, className }) {
    _s1();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const describedBy = [
        error ? `${uid}-e` : null,
        hint ? `${uid}-h` : null
    ].filter(Boolean).join(' ') || undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: uid,
                className: "mb-1.5 block text-sm font-medium text-[var(--hq-text)]",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, this),
            children({
                id: uid,
                'aria-invalid': Boolean(error),
                'aria-describedby': describedBy
            }),
            hint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: `${uid}-h`,
                className: "mt-1 text-xs text-[var(--hq-text-dim)]",
                children: hint
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 230,
                columnNumber: 9
            }, this) : null,
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: `${uid}-e`,
                className: "mt-1 text-sm text-[var(--hq-bad)]",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/estimator/ui.tsx",
                lineNumber: 235,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/ui.tsx",
        lineNumber: 224,
        columnNumber: 5
    }, this);
}
_s1(Field, "achrtUaX/b4xMvRVM6ki6UkSEHs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c3 = Field;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "CheckBadge");
__turbopack_context__.k.register(_c1, "ChoiceTile");
__turbopack_context__.k.register(_c2, "QuestionFieldset");
__turbopack_context__.k.register(_c3, "Field");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure flow logic for the homeowner estimator: which screens exist, in what
 * order, when a screen counts as answered, how a pick changes the state and how
 * the lead request is built. No React and no DOM, so it is unit-tested directly
 * (tests/estimator-screens.test.tsx).
 */ __turbopack_context__.s([
    "CONTACT_SCREEN_ID",
    ()=>CONTACT_SCREEN_ID,
    "LOOKS_SCREEN_ID",
    ()=>LOOKS_SCREEN_ID,
    "NOTE_MAX_LENGTH",
    ()=>NOTE_MAX_LENGTH,
    "ZIP_SCREEN_ID",
    ()=>ZIP_SCREEN_ID,
    "buildLeadRequest",
    ()=>buildLeadRequest,
    "contactErrors",
    ()=>contactErrors,
    "customizeTargetId",
    ()=>customizeTargetId,
    "describeQuantity",
    ()=>describeQuantity,
    "detailsHidden",
    ()=>detailsHidden,
    "flowScreens",
    ()=>flowScreens,
    "initialFlowState",
    ()=>initialFlowState,
    "isValidZip",
    ()=>isValidZip,
    "nextScreenId",
    ()=>nextScreenId,
    "optionPriceHint",
    ()=>optionPriceHint,
    "parseDimensions",
    ()=>parseDimensions,
    "pickOption",
    ()=>pickOption,
    "pickedPackage",
    ()=>pickedPackage,
    "prevScreenId",
    ()=>prevScreenId,
    "questionsAnswered",
    ()=>questionsAnswered,
    "safeHttpUrl",
    ()=>safeHttpUrl,
    "screenComplete",
    ()=>screenComplete,
    "screenForErrorKey",
    ()=>screenForErrorKey,
    "visibleAnswers",
    ()=>visibleAnswers,
    "zipScreenComplete",
    ()=>zipScreenComplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
;
;
;
const NOTE_MAX_LENGTH = 1000;
function initialFlowState(answers = {}, measurement = false) {
    return {
        answers,
        customize: false,
        knowDimensions: false,
        dimensions: {
            length: '',
            width: '',
            depth: ''
        },
        likedLooks: [],
        zip: '',
        homeowner: '',
        timeline: '',
        contact: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            consent: false,
            website: '',
            note: ''
        },
        measurement
    };
}
const LOOKS_SCREEN_ID = 'looks';
const ZIP_SCREEN_ID = 'zip';
const CONTACT_SCREEN_ID = 'contact';
function pickedPackage(template, answers) {
    const q = template.questions.find((x)=>x.role === 'package');
    return q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers)[0] : undefined;
}
function detailsHidden(template, answers, customize) {
    if (!template.questions.some((q)=>q.role === 'package')) return false;
    if (customize) return false;
    return pickedPackage(template, answers) !== __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"];
}
/** Ids of the scope question's detail questions (anything it shows, directly or through another). */ function detailQuestionIds(template) {
    const scope = template.questions.find((q)=>q.role === 'scope');
    const ids = new Set();
    if (!scope) return ids;
    for (const q of template.questions){
        const parent = q.showWhen?.questionId;
        if (parent && (parent === scope.id || ids.has(parent))) ids.add(q.id);
    }
    return ids;
}
function flowScreens(template, answers, opts) {
    const details = detailQuestionIds(template);
    const hideDetails = detailsHidden(template, answers, opts.customize);
    const groupOf = (q)=>q.role === 'package' ? 'package' : q.role === 'scope' ? 'scope' : details.has(q.id) ? 'detail' : 'other';
    const order = [];
    const byScreen = new Map();
    for (const q of (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, answers)){
        const id = q.screen ?? q.id;
        if (!byScreen.has(id)) {
            byScreen.set(id, []);
            order.push(id);
        }
        byScreen.get(id).push(q);
    }
    const screens = [];
    for (const id of order){
        const questions = byScreen.get(id);
        const groups = questions.map(groupOf);
        const group = groups.includes('package') ? 'package' : groups.includes('scope') ? 'scope' : groups.every((g)=>g === 'detail') ? 'detail' : 'other';
        if (hideDetails && (group === 'scope' || group === 'detail')) continue;
        const title = questions.find((q)=>q.screenTitle)?.screenTitle ?? questions[0].label;
        screens.push({
            id,
            kind: 'questions',
            group,
            title,
            questions
        });
    }
    if (opts.hasGallery) {
        screens.push({
            id: LOOKS_SCREEN_ID,
            kind: 'looks',
            group: 'other',
            title: 'Which look do you like?',
            questions: []
        });
    }
    screens.push({
        id: ZIP_SCREEN_ID,
        kind: 'zip',
        group: 'other',
        title: 'About you and your home',
        questions: []
    });
    screens.push({
        id: CONTACT_SCREEN_ID,
        kind: 'contact',
        group: 'other',
        title: 'Where should we send your estimate?',
        questions: []
    });
    return screens;
}
function customizeTargetId(template, answers, hasGallery) {
    const screens = flowScreens(template, answers, {
        customize: true,
        hasGallery
    });
    return (screens.find((s)=>s.group === 'scope') ?? screens.find((s)=>s.group === 'detail'))?.id;
}
function nextScreenId(screens, currentId) {
    const i = screens.findIndex((s)=>s.id === currentId);
    return i === -1 ? undefined : screens[i + 1]?.id;
}
function prevScreenId(screens, currentId) {
    const i = screens.findIndex((s)=>s.id === currentId);
    return i > 0 ? screens[i - 1].id : undefined;
}
function pickOption(template, state, q, optionId) {
    if (q.role === 'package') {
        return {
            ...state,
            answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyPackage"])(template, state.answers, optionId),
            customize: false
        };
    }
    if (q.kind === 'single') {
        return {
            ...state,
            answers: {
                ...state.answers,
                [q.id]: [
                    optionId
                ]
            }
        };
    }
    const current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, state.answers);
    const next = current.includes(optionId) ? current.filter((id)=>id !== optionId) : [
        ...current,
        optionId
    ];
    return {
        ...state,
        answers: {
            ...state.answers,
            [q.id]: next
        }
    };
}
function visibleAnswers(template, answers) {
    const out = {};
    for (const q of (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, answers)){
        const picks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers);
        if (picks.length) out[q.id] = picks;
    }
    return out;
}
function questionsAnswered(screen, answers) {
    return screen.questions.length > 0 && screen.questions.every((q)=>q.optional || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers).length > 0);
}
/* ------------------------------------------------------------------ */ /* Dimensions                                                          */ /* ------------------------------------------------------------------ */ function toNumber(raw) {
    const t = raw.trim();
    return t === '' ? Number.NaN : Number(t);
}
function inRange(n, min, max) {
    return Number.isFinite(n) && n >= min && n <= max;
}
function parseDimensions(template, input, enabled) {
    if (!enabled) return {};
    const lim = template.geometry.limits;
    const length = toNumber(input.length);
    const width = toNumber(input.width);
    const typedAny = [
        input.length,
        input.width,
        input.depth
    ].some((v)=>v.trim() !== '');
    if (!typedAny) return {};
    if (!Number.isFinite(length) || !Number.isFinite(width)) {
        return {
            hint: 'Enter both a length and a width to use your own dimensions. Until then we use the size you picked.'
        };
    }
    if (!inRange(length, lim.minFt, lim.maxLengthFt) || !inRange(width, lim.minFt, lim.maxWidthFt)) {
        return {
            hint: `Length should be ${lim.minFt} to ${lim.maxLengthFt} ft and width ${lim.minFt} to ${lim.maxWidthFt} ft. We will use the size you picked instead.`
        };
    }
    const dimensions = {
        lengthFt: length,
        widthFt: width
    };
    if (input.depth.trim() === '') return {
        dimensions
    };
    const depth = toNumber(input.depth);
    if (inRange(depth, lim.minDepthFt, lim.maxDepthFt)) {
        dimensions.avgDepthFt = depth;
        return {
            dimensions
        };
    }
    return {
        dimensions,
        hint: `Average depth should be ${lim.minDepthFt} to ${lim.maxDepthFt} ft. We will use a typical depth.`
    };
}
function isValidZip(zip) {
    return /^\d{5}$/.test(zip.trim());
}
function zipScreenComplete(state) {
    return isValidZip(state.zip) && state.homeowner !== '' && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LEAD_TIMELINES"].some((t)=>t.id === state.timeline);
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function contactErrors(contact) {
    const errors = {};
    if (!contact.firstName.trim()) errors.firstName = 'Enter your first name.';
    if (!contact.lastName.trim()) errors.lastName = 'Enter your last name.';
    if (!EMAIL.test(contact.email.trim())) errors.email = 'Enter a valid email address.';
    if (contact.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit phone number.';
    if (!contact.consent) errors.consent = 'Please agree to be contacted so we can send your estimate.';
    if (contact.note.length > NOTE_MAX_LENGTH) errors.note = `Keep this under ${NOTE_MAX_LENGTH} characters.`;
    return errors;
}
function screenForErrorKey(key) {
    if (key === 'zip' || key === 'homeowner' || key === 'timeline') return ZIP_SCREEN_ID;
    if ([
        'firstName',
        'lastName',
        'email',
        'phone',
        'consent',
        'note',
        'website',
        'form'
    ].includes(key)) return CONTACT_SCREEN_ID;
    return undefined;
}
function screenComplete(screen, state) {
    switch(screen.kind){
        case 'questions':
            return questionsAnswered(screen, state.answers);
        case 'zip':
            return zipScreenComplete(state);
        default:
            // Looks are skippable; contact is validated on submit so errors can be explained.
            return true;
    }
}
function buildLeadRequest(template, state, tracking, /** The consent wording shown on the contact screen (estimatorConsentText). */ consentText = '') {
    const { dimensions } = parseDimensions(template, state.dimensions, state.knowDimensions);
    const note = state.contact.note.trim();
    const request = {
        answers: visibleAnswers(template, state.answers),
        zip: state.zip.trim(),
        homeowner: state.homeowner === 'no' ? 'no' : 'yes',
        timeline: state.timeline || 'researching',
        contact: {
            firstName: state.contact.firstName.trim(),
            lastName: state.contact.lastName.trim(),
            email: state.contact.email.trim(),
            phone: state.contact.phone.trim(),
            consent: state.contact.consent,
            website: state.contact.website
        },
        consentText,
        measurement: state.measurement
    };
    if (dimensions) request.dimensions = dimensions;
    if (state.likedLooks.length) request.likedLooks = [
        ...state.likedLooks
    ];
    if (note) request.note = note.slice(0, NOTE_MAX_LENGTH);
    if (tracking) request.tracking = tracking;
    return request;
}
function describeQuantity(unit, quantity) {
    const n = quantity.toLocaleString('en-US');
    switch(unit){
        case 'perimeter_lf':
        case 'linear_ft':
            return `${n} linear ft`;
        case 'interior_sqft':
        case 'deck_sqft':
        case 'floor_sqft':
            return `about ${n} sq ft`;
        case 'each':
            return n;
        default:
            return '';
    }
}
const UNIT_SUFFIX = {
    interior_sqft: ' per sq ft',
    deck_sqft: ' per sq ft',
    floor_sqft: ' per sq ft',
    perimeter_lf: ' per linear ft',
    linear_ft: ' per linear ft',
    each: ' each',
    flat: ''
};
function optionPriceHint(price, formatRange) {
    if (!price || !Number.isFinite(price.low) || !Number.isFinite(price.high)) return undefined;
    return `${price.unit === 'flat' ? '+' : ''}${formatRange(price.low, price.high)}${UNIT_SUFFIX[price.unit]}`;
}
function safeHttpUrl(url) {
    if (!url) return undefined;
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
    } catch  {
        return undefined;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/pool-shapes.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PoolShapeIcon",
    ()=>PoolShapeIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
;
/*
 * Top-down pool drawings for the shape question. Decorative only (the tile
 * text carries the label), so every drawing is aria-hidden. Colours are fixed
 * and tuned for the dark marketing theme: light coping outline, blue water.
 */ const COPING = 'var(--hq-text-muted, #b6c3de)';
const WATER = '#2fa4e7';
const WATER_DEEP = '#1b78b8';
const DRAWINGS = {
    rectangle: {
        outline: 'M12 18 H108 V62 H12 Z',
        ripples: [
            'M24 32 q6 -4 12 0 t12 0',
            'M58 46 q6 -4 12 0 t12 0'
        ]
    },
    l_shape: {
        outline: 'M14 14 H76 V34 H106 V66 H14 Z',
        ripples: [
            'M24 26 q6 -4 12 0 t12 0',
            'M46 52 q6 -4 12 0 t12 0'
        ]
    },
    freeform: {
        outline: 'M16 42 C14 24 34 14 54 20 C70 25 80 13 98 19 C114 26 112 46 98 54 C84 62 70 54 56 62 C38 70 18 62 16 42 Z',
        ripples: [
            'M30 36 q6 -4 12 0 t12 0',
            'M70 38 q6 -4 12 0 t10 0'
        ]
    }
};
function PoolShapeIcon({ shape, className }) {
    if (shape === 'unsure') {
        // Rounded, dashed outline: "not sure yet", with a question mark.
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            viewBox: "0 0 120 80",
            className: className,
            "aria-hidden": "true",
            focusable: "false",
            "data-shape": shape,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: "12",
                    y: "14",
                    width: "96",
                    height: "52",
                    rx: "22",
                    fill: WATER,
                    fillOpacity: "0.14",
                    stroke: COPING,
                    strokeWidth: "3.5",
                    strokeDasharray: "7 6",
                    strokeLinecap: "round"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/pool-shapes.tsx",
                    lineNumber: 40,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M52 34 a8 8 0 1 1 11.5 7.2 c-2.4 1.3 -3.5 2.8 -3.5 5.6",
                    fill: "none",
                    stroke: COPING,
                    strokeWidth: "4",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/pool-shapes.tsx",
                    lineNumber: 41,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "60",
                    cy: "55",
                    r: "2.6",
                    fill: COPING
                }, void 0, false, {
                    fileName: "[project]/components/estimator/pool-shapes.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/pool-shapes.tsx",
            lineNumber: 39,
            columnNumber: 7
        }, this);
    }
    const d = DRAWINGS[shape];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: "0 0 120 80",
        className: className,
        "aria-hidden": "true",
        focusable: "false",
        "data-shape": shape,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: d.outline,
                fill: WATER,
                stroke: COPING,
                strokeWidth: "5",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/pool-shapes.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: d.outline,
                fill: "none",
                stroke: WATER_DEEP,
                strokeOpacity: "0.5",
                strokeWidth: "1.5",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/pool-shapes.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            d.ripples.map((r)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: r,
                    fill: "none",
                    stroke: "#ffffff",
                    strokeOpacity: "0.55",
                    strokeWidth: "2",
                    strokeLinecap: "round"
                }, r, false, {
                    fileName: "[project]/components/estimator/pool-shapes.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/pool-shapes.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_c = PoolShapeIcon;
var _c;
__turbopack_context__.k.register(_c, "PoolShapeIcon");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/summary.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LiveSummary",
    ()=>LiveSummary
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function LiveSummary({ template, answers, dimensions, embedded, className }) {
    _s();
    const estimate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "LiveSummary.useMemo[estimate]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
                answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleAnswers"])(template, answers),
                dimensions
            })
    }["LiveSummary.useMemo[estimate]"], [
        template,
        answers,
        dimensions
    ]);
    const hasRange = estimate.low !== null && estimate.high !== null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        "aria-label": "Your estimate so far",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('border-[var(--hq-line-strong)] bg-[var(--hq-bg-raised)] p-4', embedded ? 'mt-6 rounded-xl border' : 'fixed inset-x-0 bottom-0 z-20 border-t shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:static lg:top-6 lg:mt-0 lg:self-start lg:rounded-2xl lg:border lg:shadow-none lg:sticky', className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]",
                children: "Your ballpark so far"
            }, void 0, false, {
                fileName: "[project]/components/estimator/summary.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-2xl font-semibold tracking-tight text-[var(--hq-text)] lg:text-3xl",
                "aria-live": "polite",
                "aria-atomic": "true",
                children: hasRange ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(estimate.low, estimate.high) : 'Pick options to see a range'
            }, void 0, false, {
                fileName: "[project]/components/estimator/summary.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-0.5 text-xs text-[var(--hq-text-muted)]",
                children: [
                    "Ballpark, not a quote",
                    hasRange && estimate.status === 'incomplete' ? '. It may change as you answer.' : ''
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/summary.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            estimate.lines.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                className: "mt-3 hidden divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] text-xs lg:block",
                children: estimate.lines.map((line)=>{
                    const qty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["describeQuantity"])(line.unit, line.quantity);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-baseline justify-between gap-3 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "text-[var(--hq-text-muted)]",
                                children: [
                                    line.label,
                                    qty ? ` · ${qty}` : ''
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/summary.tsx",
                                lineNumber: 57,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "shrink-0 font-medium text-[var(--hq-text)]",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(line.low, line.high)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/summary.tsx",
                                lineNumber: 61,
                                columnNumber: 17
                            }, this)
                        ]
                    }, `${line.questionId}.${line.optionId}`, true, {
                        fileName: "[project]/components/estimator/summary.tsx",
                        lineNumber: 56,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/estimator/summary.tsx",
                lineNumber: 52,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/summary.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_s(LiveSummary, "kN24QJmgqSl5rq5533dqJfkk68o=");
_c = LiveSummary;
var _c;
__turbopack_context__.k.register(_c, "LiveSummary");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/estimator-flow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EstimatorFlow",
    ()=>EstimatorFlow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builder.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builders/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builder-progress.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$motion$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/motion.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/scene-panel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$design$2d$result$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/design-result.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$looks$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/looks-screen.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$lead$2d$screens$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/lead-screens.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$package$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/package-screen.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$question$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/question-screen.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$result$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/result-screen.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$size$2d$dimensions$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/size-dimensions.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$unlock$2d$preview$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/screens/unlock-preview.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$reward$2d$tracker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/reward-tracker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$stage$2d$stepper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/stage-stepper.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/summary.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/ui.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/use-estimator-flow.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
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
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
/** Error keys that belong to a field; anything else is shown as a general message. */ const FIELD_KEYS = new Set([
    'zip',
    'homeowner',
    'timeline',
    'firstName',
    'lastName',
    'email',
    'phone',
    'consent',
    'note',
    'website'
]);
/**
 * The page URL (with its UTM / click-id query, which attribution reads) and, only
 * when the visitor allowed advertising measurement, the Meta browser ids.
 */ function readTracking(measurement) {
    try {
        const pageUrl = window.location.href.slice(0, 4000);
        if (!measurement) return {
            pageUrl
        };
        const cookie = (name)=>document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
        return {
            fbp: cookie('_fbp'),
            fbc: cookie('_fbc'),
            eventId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined,
            pageUrl
        };
    } catch  {
        return undefined;
    }
}
/**
 * Scroll the builder's top (the picture, with the result card under it) to
 * just under the site header and resolve when the scroll has finished, or at
 * once when it is already there or motion is reduced. Never waits long.
 */ function scrollToReveal(section) {
    if (!section || ("TURBOPACK compile-time value", "object") === 'undefined') return Promise.resolve();
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const delta = section.getBoundingClientRect().top - margin;
    if (Math.abs(delta) < 4) return Promise.resolve();
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return new Promise((resolve)=>{
        let done = false;
        const finish = ()=>{
            if (done) return;
            done = true;
            window.removeEventListener('scrollend', finish);
            clearTimeout(timer);
            resolve();
        };
        // scrollend where supported; a time cap everywhere else (a smooth scroll this long takes about half a second).
        const timer = setTimeout(finish, smooth ? 650 : 0);
        if (smooth) window.addEventListener('scrollend', finish, {
            once: true
        });
        section.scrollIntoView({
            block: 'start',
            behavior: smooth ? 'smooth' : 'auto'
        });
    });
}
/**
 * Switch the browser's scroll anchoring off for the whole page for a moment:
 * when the form is swapped for the (taller) result, anchoring would keep
 * whatever it picked (often the footer) in place and nudge the page down
 * for a frame. Restored shortly after.
 */ function holdScrollAnchoring() {
    const root = document.documentElement;
    const before = root.style.overflowAnchor;
    root.style.overflowAnchor = 'none';
    setTimeout(()=>{
        root.style.overflowAnchor = before;
    }, 1500);
}
/** The photo's arrival is announced by the picture's own status line; the tracker stays quiet about it. */ const QUIET_REWARDS = [
    'photo'
];
/** Hover-intent delays: a quick sweep across tiles does not flicker the picture. */ const PREVIEW_IN_MS = 70;
const PREVIEW_OUT_MS = 140;
function EstimatorFlow({ template, contractor, embedded = false, rendersEnabled = false, example, seed }) {
    _s();
    const gallery = contractor.gallery?.filter((g)=>g.src) ?? [];
    const hasGallery = gallery.length > 0;
    const immediate = contractor.revealRange === 'immediately';
    // The trade's adapter (everything that differs between pool and bathroom); null = the plain flow.
    const trade = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getTradeBuilder"])(template.trade);
    const builder = trade !== null;
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "EstimatorFlow.useState": ()=>({
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initialFlowState"])(seed?.answers, contractor.adMeasurement === 'opt_out'),
                ...seed?.state
            })
    }["EstimatorFlow.useState"]);
    const [screenId, setScreenId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(seed?.screenId);
    const [result, setResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(seed?.result ?? null);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [night, setNight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // How the realistic photo is doing on the result (reported by ResultScene, for the reward tracker).
    const [photo, setPhoto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "EstimatorFlow.useState": ()=>rendersEnabled && seed?.result?.renderToken ? 'pending' : 'none'
    }["EstimatorFlow.useState"]);
    const [preview, setPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const previewTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const submittingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const headingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const formRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sectionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const pinRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const progressRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mounted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const [focusErrorTick, setFocusErrorTick] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const formId = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])()}-questions`;
    const screens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[screens]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["flowScreens"])(template, state.answers, {
                customize: state.customize,
                hasGallery
            })
    }["EstimatorFlow.useMemo[screens]"], [
        template,
        state.answers,
        state.customize,
        hasGallery
    ]);
    const index = Math.max(0, screens.findIndex((s)=>s.id === screenId));
    const current = screens[index];
    const dims = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[dims]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseDimensions"])(template, state.dimensions, state.knowDimensions)
    }["EstimatorFlow.useMemo[dims]"], [
        template,
        state.dimensions,
        state.knowDimensions
    ]);
    const labeler = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[labeler]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["optionLabeler"])(template)
    }["EstimatorFlow.useMemo[labeler]"], [
        template
    ]);
    // Phones pin the picture over the questions; on the ZIP and contact screens it scrolls away
    // instead, so the on-screen keyboard never hides the field being typed in (WCAG 2.4.11).
    const pinned = builder && !result && (current.kind === 'questions' || current.kind === 'looks');
    const focusOn = trade && current.kind === 'questions' ? current.questions.find((q)=>trade.closeUpIds.has(q.id))?.id : undefined;
    const focus = focusOn ? 'close' : 'overview';
    // Move focus to the new heading when the screen changes (not on first paint). With the live
    // builder the browser's own focus scroll would tuck the heading under the pinned picture, so
    // scroll the new screen (or, for the result, the finished design) just below whatever is pinned.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EstimatorFlow.useEffect": ()=>{
            if (!mounted.current) {
                mounted.current = true;
                return;
            }
            const heading = headingRef.current;
            if (!heading) return;
            if (!builder) {
                heading.focus();
                return;
            }
            heading.focus({
                preventScroll: true
            });
            const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            if (result) {
                // The reveal: submit() already scrolled here before showing the result; this only covers a result
                // that appears some other way. Never a second smooth scroll (scroll-margin clears the site header).
                const section = sectionRef.current;
                if (section && Math.abs(section.getBoundingClientRect().top - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0)) > 4) {
                    section.scrollIntoView({
                        block: 'start',
                        behavior: 'auto'
                    });
                }
                return;
            }
            const form = formRef.current;
            const pin = pinRef.current;
            if (!form) return;
            const formBox = form.getBoundingClientRect();
            const pinBox = pin?.getBoundingClientRect();
            const stacked = pinBox ? pinBox.right > formBox.left && pinBox.left < formBox.right : false;
            // Side by side (desktop) the progress above the form stays in view too. Phones spend that room on the
            // question, except on the unlock screens (nothing pinned), where seeing "Design done" is the point.
            const targetBox = (!stacked || !pinned) && progressRef.current ? progressRef.current.getBoundingClientRect() : formBox;
            // The site header (top-16 / sm:top-20 below; none in the embed).
            let offset = embedded ? 0 : window.matchMedia?.('(min-width: 640px)').matches ? 80 : 64;
            if (pin && pinBox && pinned) {
                // Stacked (phones): clear the whole pinned picture. Side by side: clear only its sticky top (the site header).
                offset = stacked ? pinBox.bottom : parseFloat(getComputedStyle(pin).top) || offset;
            }
            const delta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["scrollDelta"])(targetBox.top, window.innerHeight, offset + 12);
            if (delta !== null) window.scrollBy({
                top: delta,
                behavior: smooth ? 'smooth' : 'auto'
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on screen changes only; pinned/embedded follow from them
        }
    }["EstimatorFlow.useEffect"], [
        current.id,
        result,
        builder
    ]);
    // The page header's "Start my design" link means nothing once the design is done: the flow marks the page.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EstimatorFlow.useEffect": ()=>{
            if (!result) return;
            const root = document.documentElement;
            root.setAttribute('data-estimator-done', '');
            return ({
                "EstimatorFlow.useEffect": ()=>root.removeAttribute('data-estimator-done')
            })["EstimatorFlow.useEffect"];
        }
    }["EstimatorFlow.useEffect"], [
        result
    ]);
    // After a failed submit, focus the first invalid field.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EstimatorFlow.useEffect": ()=>{
            if (focusErrorTick === 0) return;
            formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
        }
    }["EstimatorFlow.useEffect"], [
        focusErrorTick
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EstimatorFlow.useEffect": ()=>({
                "EstimatorFlow.useEffect": ()=>clearTimeout(previewTimer.current)
            })["EstimatorFlow.useEffect"]
    }["EstimatorFlow.useEffect"], []);
    /* ---- Live preview (hover / keyboard focus) ---- */ const endPreview = ()=>{
        clearTimeout(previewTimer.current);
        setPreview(null);
    };
    const requestPreview = (q, optionId)=>{
        if (!trade || !trade.isVisual(q)) return;
        clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(()=>setPreview(optionId ? {
                q,
                optionId
            } : null), optionId ? PREVIEW_IN_MS : PREVIEW_OUT_MS);
    };
    const ghost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[ghost]": ()=>{
            if (!preview || !trade) return null;
            const answers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["previewAnswers"])(template, state.answers, preview.q, preview.optionId, trade.isVisual);
            if (!answers) return null;
            const label = trade.optionPhrase(preview.q.role === 'package' ? 'package' : preview.q.id, preview.optionId, labeler);
            return {
                answers,
                label
            };
        }
    }["EstimatorFlow.useMemo[ghost]"], [
        preview,
        template,
        state.answers,
        labeler,
        trade
    ]);
    const update = (patch, clear = [])=>{
        setState((s)=>({
                ...s,
                ...patch
            }));
        if (clear.length) {
            setErrors((e)=>{
                const next = {
                    ...e
                };
                for (const key of clear)delete next[key];
                return next;
            });
        }
    };
    const onPick = (q, optionId)=>{
        // The pick is now the real answer: drop the ghost so the change chip shows it.
        endPreview();
        setState((s)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pickOption"])(template, s, q, optionId));
    };
    const goTo = (id)=>{
        if (!id) return;
        endPreview();
        setErrors({});
        setScreenId(id);
    };
    const submit = async ()=>{
        if (submittingRef.current) return;
        const local = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["contactErrors"])(state.contact);
        if (Object.keys(local).length) {
            setErrors(local);
            setFocusErrorTick((n)=>n + 1);
            return;
        }
        submittingRef.current = true;
        setSubmitting(true);
        setErrors({});
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitEstimatorLead"])(contractor.slug, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildLeadRequest"])(template, state, readTracking(state.measurement), (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimatorConsentText"])(contractor.contractorName)));
        // The live builder scrolls once, to where the reveal happens, BEFORE swapping the form for the result:
        // the price then counts up in a page that is standing still, and nothing on screen jumps.
        if (res.ok && builder) {
            await scrollToReveal(sectionRef.current);
            holdScrollAnchoring();
        }
        submittingRef.current = false;
        setSubmitting(false);
        if (res.ok) {
            setResult(res);
            return;
        }
        setErrors(res.errors);
        // A rejected ZIP, homeowner or timeline lives on the earlier screen.
        const owners = Object.keys(res.errors).map(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenForErrorKey"]);
        const target = owners.includes('contact') ? 'contact' : owners.find(Boolean);
        if (target && target !== current.id) setScreenId(target);
        setFocusErrorTick((n)=>n + 1);
    };
    const onSubmit = (e)=>{
        e.preventDefault();
        if (current.kind === 'contact') void submit();
        else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenComplete"])(current, state)) goTo((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nextScreenId"])(screens, current.id));
    };
    /* ---- Package helpers ---- */ const packageQ = template.questions.find((q)=>q.role === 'package');
    const hidden = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["detailsHidden"])(template, state.answers, state.customize);
    const readyPackage = hidden && ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pickedPackage"])(template, state.answers) ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]) !== __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"];
    const customize = ()=>{
        const next = {
            ...state,
            customize: true
        };
        setState(next);
        goTo((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["customizeTargetId"])(template, next.answers, hasGallery));
    };
    const generalErrors = Object.entries(errors).filter(([key])=>!FIELD_KEYS.has(key)).map(([, message])=>message);
    const fieldErrorCount = Object.keys(errors).filter((k)=>FIELD_KEYS.has(k)).length;
    const backId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["prevScreenId"])(screens, current.id);
    // The live builder keeps the price for the end and makes the lead screens the "unlock" step
    // (with revealRange "immediately" the range is live all along, so there is nothing to unlock).
    const unlocking = builder && !immediate;
    const unlock = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unlockCopy"])(rendersEnabled, trade?.copy.subject);
    const nextLabel = current.kind === 'contact' ? unlocking ? submitting ? unlock.submitting : unlock.submit : submitting ? 'Sending…' : 'See my estimate' : current.kind === 'looks' && state.likedLooks.length === 0 ? 'Skip' : 'Next';
    // The live builder names the unlock step for what it gives them.
    const heading = unlocking && current.kind === 'zip' ? unlock.zipTitle : unlocking && current.kind === 'contact' ? unlock.contactTitle : current.title;
    const showSummary = immediate && !result;
    // The screen count grows as answers reveal detail screens, so show the step without a
    // total and keep the bar from sliding backwards while moving forward.
    const stepText = `Step ${index + 1}`;
    const rawPercent = Math.round((index + 1) / screens.length * 100);
    const progress = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        index,
        percent: rawPercent
    });
    if (progress.current.index !== index) {
        progress.current = {
            index,
            percent: index > progress.current.index ? Math.max(progress.current.percent, rawPercent) : rawPercent
        };
    }
    const percent = Math.min(100, progress.current.percent);
    // Live builder: named stages and the rewards being earned.
    const { stages, stageOf } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["flowStages"])(screens, trade?.copy.stageLabel)
    }["EstimatorFlow.useMemo"], [
        screens,
        trade
    ]);
    const stagePart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stageFraction"])(screens, stageOf, current.id);
    const flowPhase = result ? 'result' : current.kind === 'zip' || current.kind === 'contact' ? 'unlock' : 'design';
    const rewards = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[rewards]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2d$progress$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rewardSteps"])(flowPhase, rendersEnabled, photo)
    }["EstimatorFlow.useMemo[rewards]"], [
        flowPhase,
        rendersEnabled,
        photo
    ]);
    const examplePrices = !template.pricesConfirmed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "shrink-0 rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5 text-xs text-[var(--hq-text-muted)]",
        children: "Example prices"
    }, void 0, false, {
        fileName: "[project]/components/estimator/estimator-flow.tsx",
        lineNumber: 388,
        columnNumber: 5
    }, this) : null;
    // Slide direction of the screen change, fixed when the index changes (so a re-render never replays it).
    const slide = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        index,
        className: 'eb-fwd'
    });
    if (slide.current.index !== index) slide.current = {
        index,
        className: index > slide.current.index ? 'eb-fwd' : 'eb-back'
    };
    // The finished design (result only): its spec names the heading, its summary is the "Your design" list.
    const resultSpec = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[resultSpec]": ()=>trade && result ? trade.buildSpec(template, {
                answers: state.answers,
                dimensions: dims.dimensions
            }) : null
    }["EstimatorFlow.useMemo[resultSpec]"], [
        trade,
        result,
        template,
        state.answers,
        dims.dimensions
    ]);
    const designItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstimatorFlow.useMemo[designItems]": ()=>trade && resultSpec !== null ? trade.designSummary(resultSpec, labeler) : []
    }["EstimatorFlow.useMemo[designItems]"], [
        trade,
        resultSpec,
        labeler
    ]);
    const unlockPreview = unlocking ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$unlock$2d$preview$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UnlockPreview"], {
        template: template,
        builder: trade ?? undefined,
        answers: state.answers,
        dimensions: dims.dimensions,
        rendersEnabled: rendersEnabled,
        promise: unlock.promise
    }, void 0, false, {
        fileName: "[project]/components/estimator/estimator-flow.tsx",
        lineNumber: 402,
        columnNumber: 5
    }, this) : undefined;
    /* ---- Layout ---- */ const container = builder ? 'max-w-7xl lg:grid lg:grid-cols-[minmax(0,57fr)_minmax(0,43fr)] lg:items-start lg:gap-8 xl:gap-10' : showSummary && !embedded ? 'max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8' : 'max-w-2xl';
    // Phones: the picture is pinned under the site header (top of the frame when embedded), full
    // bleed, capped at ~42% of the screen height. Desktop: sticky in the left column.
    const scenePin = embedded ? 'sticky top-0 z-30 -mx-3 px-3 sm:-mx-5 sm:px-5 [--eb-max-h:36svh] lg:top-3' : 'sticky top-16 z-30 -mx-5 px-5 sm:top-20 sm:-mx-8 sm:px-8 [--eb-max-h:42svh] lg:top-24';
    const sceneColumn = result ? 'mb-6 lg:mb-0' : pinned ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(scenePin, 'border-b border-[var(--hq-line)] bg-[var(--hq-bg)] pt-2 pb-1 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:[--eb-max-h:4000px]') : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(embedded ? 'lg:sticky lg:top-3' : 'lg:sticky lg:top-24', '[--eb-max-h:30svh] lg:[--eb-max-h:4000px]');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        ref: sectionRef,
        "aria-label": template.title,
        "data-estimator": template.trade,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('hq text-[var(--hq-text)]', builder && !embedded && 'scroll-mt-20 sm:scroll-mt-24', // The builder places the page itself (one scroll before the reveal); the browser's scroll anchoring
        // would otherwise nudge it again when the form is swapped for the result.
        builder && '[overflow-anchor:none]', embedded ? 'px-3 py-4 sm:px-5' : builder ? 'py-2 sm:py-4' : 'px-4 py-8 sm:py-12', showSummary && !embedded && 'pb-40 lg:pb-12'),
        children: [
            builder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$motion$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BuilderStyles"], {}, void 0, false, {
                fileName: "[project]/components/estimator/estimator-flow.tsx",
                lineNumber: 448,
                columnNumber: 18
            }, this) : null,
            builder && !result ? // Keyboard users skip the picture's controls straight to the questions.
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: `#${formId}`,
                className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-[var(--hq-cta)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--hq-cta-ink)]",
                children: "Skip to the questions"
            }, void 0, false, {
                fileName: "[project]/components/estimator/estimator-flow.tsx",
                lineNumber: 451,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mx-auto', container),
                children: [
                    builder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: pinRef,
                        className: sceneColumn,
                        children: result ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$design$2d$result$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResultScene"], {
                            template: template,
                            builder: trade ?? undefined,
                            answers: state.answers,
                            dimensions: dims.dimensions,
                            night: night,
                            onNightChange: setNight,
                            slug: contractor.slug,
                            // Only start a photo when this page promised one (the copy follows rendersEnabled too).
                            renderToken: rendersEnabled ? result.renderToken : undefined,
                            designItems: designItems,
                            onPhotoProgress: setPhoto
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/estimator-flow.tsx",
                            lineNumber: 462,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$scene$2d$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScenePanel"], {
                            template: template,
                            builder: trade ?? undefined,
                            answers: state.answers,
                            dimensions: dims.dimensions,
                            preview: ghost,
                            night: night,
                            onNightChange: setNight,
                            focus: focus,
                            focusOn: focusOn,
                            stepKey: current.id,
                            examplePhoto: rendersEnabled,
                            example: example
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/estimator-flow.tsx",
                            lineNumber: 476,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                        lineNumber: 460,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('min-w-0', builder && !result && 'pt-5 lg:pt-0'),
                        children: [
                            builder ? unlocking && flowPhase !== 'design' || !result && examplePrices ? // One progress indicator at a time: the stage bar while designing, then the rewards (Design done,
                            // Price and the photo to unlock) from the unlock screens to the result, where Price ticks over.
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                ref: progressRef,
                                className: "mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
                                children: [
                                    unlocking && flowPhase !== 'design' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$reward$2d$tracker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RewardTracker"], {
                                        steps: rewards,
                                        label: "What you get",
                                        quiet: QUIET_REWARDS
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 501,
                                        columnNumber: 56
                                    }, this) : null,
                                    result ? null : examplePrices
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                lineNumber: 500,
                                columnNumber: 15
                            }, this) : null : result ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                ref: progressRef,
                                className: "mb-5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between gap-3 text-xs text-[var(--hq-text-muted)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: stepText
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 508,
                                                columnNumber: 17
                                            }, this),
                                            !template.pricesConfirmed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5",
                                                children: "Example prices"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 510,
                                                columnNumber: 19
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 507,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        role: "progressbar",
                                        "aria-label": "Estimator progress",
                                        "aria-valuemin": 0,
                                        "aria-valuemax": 100,
                                        "aria-valuenow": percent,
                                        "aria-valuetext": stepText,
                                        className: "mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-full rounded-full bg-[var(--hq-accent-bright)] transition-[width] duration-300 motion-reduce:transition-none",
                                            style: {
                                                width: `${percent}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/estimator-flow.tsx",
                                            lineNumber: 522,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 513,
                                        columnNumber: 15
                                    }, this),
                                    !immediate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-xs text-[var(--hq-text-dim)]",
                                        children: "Your price range appears at the end."
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 527,
                                        columnNumber: 29
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                lineNumber: 506,
                                columnNumber: 13
                            }, this),
                            result ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["card"], builder && 'eb-rise'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        ref: headingRef,
                                        tabIndex: -1,
                                        className: "mb-4 text-2xl font-semibold tracking-tight text-balance focus:outline-none",
                                        children: trade ? trade.resultHeading(state.contact.firstName, designItems, resultSpec) : 'Your ballpark estimate'
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 533,
                                        columnNumber: 15
                                    }, this),
                                    !template.pricesConfirmed && !builder ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mb-4 inline-block rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5 text-xs text-[var(--hq-text-muted)]",
                                        children: "Example prices"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 538,
                                        columnNumber: 17
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$result$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResultScreen"], {
                                        template: template,
                                        contractor: contractor,
                                        result: result,
                                        firstName: state.contact.firstName.trim() || undefined,
                                        embedded: embedded,
                                        builder: builder,
                                        copy: trade?.copy,
                                        design: designItems.length ? // Desktop shows the list under the picture instead (ResultScene).
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "lg:hidden",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$design$2d$result$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DesignList"], {
                                                items: designItems
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 554,
                                                columnNumber: 23
                                            }, void 0)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/estimator-flow.tsx",
                                            lineNumber: 553,
                                            columnNumber: 21
                                        }, void 0) : undefined
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 542,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                lineNumber: 532,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                ref: formRef,
                                id: formId,
                                tabIndex: -1,
                                onSubmit: onSubmit,
                                noValidate: true,
                                // Focused fields scroll clear of the site header (and the pinned picture is off on these screens).
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["card"], '@container overflow-hidden focus:outline-none [&_input]:scroll-mt-28 [&_textarea]:scroll-mt-28 [&_select]:scroll-mt-28'),
                                children: [
                                    builder && !(unlocking && flowPhase === 'unlock') ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$stage$2d$stepper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StageStepper"], {
                                        stages: stages,
                                        current: stageOf[current.id],
                                        fraction: stagePart,
                                        label: "Your progress",
                                        className: "mb-5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 571,
                                        columnNumber: 17
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: builder ? slide.current.className : undefined,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                ref: headingRef,
                                                tabIndex: -1,
                                                className: "mb-5 text-2xl font-semibold tracking-tight text-balance focus:outline-none",
                                                children: heading
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 574,
                                                columnNumber: 17
                                            }, this),
                                            current.kind === 'questions' && current.group === 'package' && packageQ ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$package$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PackageScreen"], {
                                                template: template,
                                                question: current.questions.find((q)=>q.role === 'package') ?? packageQ,
                                                answers: state.answers,
                                                onPick: (id)=>onPick(packageQ, id),
                                                canCustomize: readyPackage,
                                                onCustomize: customize,
                                                onPreview: builder ? (id)=>requestPreview(packageQ, id) : undefined
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 579,
                                                columnNumber: 19
                                            }, this) : current.kind === 'questions' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$question$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuestionScreen"], {
                                                        screen: current,
                                                        answers: state.answers,
                                                        onPick: onPick,
                                                        showPrices: immediate,
                                                        onPreview: builder ? requestPreview : undefined,
                                                        optionVisual: trade?.optionVisual
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                        lineNumber: 590,
                                                        columnNumber: 21
                                                    }, this),
                                                    current.questions.some((q)=>q.role === 'size') ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$size$2d$dimensions$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SizeDimensions"], {
                                                        template: template,
                                                        enabled: state.knowDimensions,
                                                        onToggle: (on)=>update({
                                                                knowDimensions: on
                                                            }),
                                                        value: state.dimensions,
                                                        onChange: (dimensions)=>update({
                                                                dimensions
                                                            }),
                                                        hint: dims.hint,
                                                        using: Boolean(dims.dimensions)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                        lineNumber: 599,
                                                        columnNumber: 23
                                                    }, this) : null
                                                ]
                                            }, void 0, true) : current.kind === 'looks' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$looks$2d$screen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LooksScreen"], {
                                                gallery: gallery,
                                                liked: state.likedLooks,
                                                onToggle: (src)=>update({
                                                        likedLooks: state.likedLooks.includes(src) ? state.likedLooks.filter((x)=>x !== src) : [
                                                            ...state.likedLooks,
                                                            src
                                                        ]
                                                    })
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 611,
                                                columnNumber: 19
                                            }, this) : current.kind === 'zip' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$lead$2d$screens$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZipScreen"], {
                                                state: state,
                                                errors: errors,
                                                onChange: (patch)=>update(patch, Object.keys(patch)),
                                                preview: unlockPreview
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 619,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$screens$2f$lead$2d$screens$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ContactScreen"], {
                                                preview: unlockPreview,
                                                contractor: contractor,
                                                contact: state.contact,
                                                errors: errors,
                                                onChange: (patch)=>update({
                                                        contact: {
                                                            ...state.contact,
                                                            ...patch
                                                        }
                                                    }, Object.keys(patch)),
                                                measurement: state.measurement,
                                                onMeasurementChange: (measurement)=>update({
                                                        measurement
                                                    })
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 621,
                                                columnNumber: 19
                                            }, this),
                                            readyPackage && current.kind === 'questions' && current.group === 'other' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "mt-4",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: customize,
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["linkButton"],
                                                    children: "Customize this package"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                    lineNumber: 634,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 633,
                                                columnNumber: 19
                                            }, this) : null
                                        ]
                                    }, current.id, true, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 573,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        role: "alert",
                                        "aria-live": "assertive",
                                        className: "empty:hidden",
                                        children: [
                                            fieldErrorCount > 0 && current.kind === 'contact' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "mt-4 text-sm text-[var(--hq-bad)]",
                                                children: "Please fix the highlighted fields."
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 643,
                                                columnNumber: 19
                                            }, this) : null,
                                            generalErrors.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-4 text-sm text-[var(--hq-bad)]",
                                                    children: message
                                                }, message, false, {
                                                    fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                    lineNumber: 646,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 641,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-6 flex items-center justify-between gap-3",
                                        children: [
                                            backId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>goTo(backId),
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["secondaryButton"], 'shrink-0 max-sm:px-4'),
                                                children: "Back"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 654,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 658,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "submit",
                                                disabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$use$2d$estimator$2d$flow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenComplete"])(current, state) || submitting,
                                                "aria-busy": submitting || undefined,
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryButton"], 'min-w-0 whitespace-nowrap max-sm:px-5', // Sending keeps the brand color (not the grey "not ready yet" look) and shows it is working.
                                                submitting && 'gap-2 disabled:cursor-wait disabled:bg-[var(--hq-cta)] disabled:text-[var(--hq-cta-ink)] disabled:hover:bg-[var(--hq-cta)]'),
                                                children: [
                                                    submitting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                        className: "size-4 animate-spin motion-reduce:animate-none",
                                                        "aria-hidden": "true"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                        lineNumber: 671,
                                                        columnNumber: 33
                                                    }, this) : null,
                                                    nextLabel
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                                lineNumber: 660,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                                        lineNumber: 652,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                lineNumber: 561,
                                columnNumber: 13
                            }, this),
                            builder && showSummary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LiveSummary"], {
                                template: template,
                                answers: state.answers,
                                dimensions: dims.dimensions,
                                embedded: embedded,
                                className: "lg:static lg:mt-6"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/estimator-flow.tsx",
                                lineNumber: 679,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, result ? 'result' : 'flow', true, {
                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                        lineNumber: 495,
                        columnNumber: 9
                    }, this),
                    !builder && showSummary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LiveSummary"], {
                        template: template,
                        answers: state.answers,
                        dimensions: dims.dimensions,
                        embedded: embedded
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/estimator-flow.tsx",
                        lineNumber: 689,
                        columnNumber: 36
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/estimator-flow.tsx",
                lineNumber: 458,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/estimator-flow.tsx",
        lineNumber: 434,
        columnNumber: 5
    }, this);
}
_s(EstimatorFlow, "SIooyRJ0v0ZmVF8kNNmCoB0i40E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = EstimatorFlow;
var _c;
__turbopack_context__.k.register(_c, "EstimatorFlow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/estimator.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Estimator",
    ()=>Estimator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/estimator-flow.tsx [app-client] (ecmascript)");
'use client';
;
;
function Estimator({ template, contractor, embedded, rendersEnabled = false, example }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EstimatorFlow"], {
        template: template,
        contractor: contractor,
        embedded: embedded,
        rendersEnabled: rendersEnabled,
        example: example
    }, void 0, false, {
        fileName: "[project]/components/estimator/estimator.tsx",
        lineNumber: 33,
        columnNumber: 10
    }, this);
}
_c = Estimator;
var _c;
__turbopack_context__.k.register(_c, "Estimator");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/landing-bits.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnnouncementBar",
    ()=>AnnouncementBar,
    "HeaderMenu",
    ()=>HeaderMenu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
/*
 * The landing page's two small interactive pieces: the dismissible
 * announcement bar and the header menu. Everything else on the landing is
 * server-rendered.
 */ const DISMISS_KEY = 'hq-funnel-announcement';
function AnnouncementBar({ text, badge }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnnouncementBar.useEffect": ()=>{
            try {
                if (window.sessionStorage.getItem(DISMISS_KEY) === text) setOpen(false);
            } catch  {
            // Blocked storage: keep it visible.
            }
        }
    }["AnnouncementBar.useEffect"], [
        text
    ]);
    if (!open) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative bg-[#0a0a0a] text-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mx-auto flex min-h-[36px] max-w-[1120px] items-center justify-center gap-2 py-[7px] pl-4 pr-12 text-center text-[13px] leading-[18px] tracking-[-0.005em] sm:text-[14px]",
                children: [
                    badge ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "shrink-0 rounded-[4px] bg-white px-[5px] py-px text-[11px] font-semibold leading-[15px] tracking-[0.02em] text-[#0a0a0a]",
                        children: badge
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-pretty",
                        children: text
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-label": "Dismiss announcement",
                onClick: ()=>{
                    setOpen(false);
                    try {
                        window.sessionStorage.setItem(DISMISS_KEY, text);
                    } catch  {
                    // Fine: it is hidden for this page view.
                    }
                },
                className: "absolute right-0 top-1/2 flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center text-white/85 transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white motion-reduce:transition-none",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    "aria-hidden": "true",
                    className: "size-[18px]",
                    strokeWidth: 1.6
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                    lineNumber: 47,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
_s(AnnouncementBar, "5swwslfKOPgwwZeTkoqeSpghmqY=");
_c = AnnouncementBar;
function HeaderMenu({ links, tel, phone }) {
    _s1();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const root = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const button = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HeaderMenu.useEffect": ()=>{
            if (!open) return;
            const onKey = {
                "HeaderMenu.useEffect.onKey": (e)=>{
                    if (e.key === 'Escape') {
                        setOpen(false);
                        button.current?.focus();
                    }
                }
            }["HeaderMenu.useEffect.onKey"];
            const onDown = {
                "HeaderMenu.useEffect.onDown": (e)=>{
                    if (!root.current?.contains(e.target)) setOpen(false);
                }
            }["HeaderMenu.useEffect.onDown"];
            window.addEventListener('keydown', onKey);
            window.addEventListener('pointerdown', onDown);
            return ({
                "HeaderMenu.useEffect": ()=>{
                    window.removeEventListener('keydown', onKey);
                    window.removeEventListener('pointerdown', onDown);
                }
            })["HeaderMenu.useEffect"];
        }
    }["HeaderMenu.useEffect"], [
        open
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: root,
        className: "lg:hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                ref: button,
                type: "button",
                "aria-label": open ? 'Close menu' : 'Open menu',
                "aria-expanded": open,
                "aria-controls": id,
                onClick: ()=>setOpen((o)=>!o),
                className: "-mr-2 flex size-11 touch-manipulation items-center justify-center rounded-[8px] text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]",
                children: open ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    "aria-hidden": "true",
                    className: "size-[22px]",
                    strokeWidth: 1.6
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                    lineNumber: 92,
                    columnNumber: 17
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                    "aria-hidden": "true",
                    className: "size-[24px]",
                    strokeWidth: 1.6
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                    lineNumber: 92,
                    columnNumber: 86
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            open ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                id: id,
                "aria-label": "Menu",
                className: "fn-pop absolute inset-x-0 top-[calc(100%+8px)] z-30 rounded-[12px] border border-black/[0.06] bg-white p-2 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_rgb(0_0_0/0.12)]",
                children: [
                    links.map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: l.href,
                            onClick: ()=>setOpen(false),
                            className: "flex h-12 items-center rounded-[8px] px-3 text-[17px] font-medium text-[#0a0a0a] active:bg-black/[0.04]",
                            children: l.label
                        }, l.href, false, {
                            fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                            lineNumber: 101,
                            columnNumber: 13
                        }, this)),
                    tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: tel,
                        className: "flex h-12 items-center gap-2.5 rounded-[8px] px-3 text-[17px] font-medium text-[var(--fn-blue)] active:bg-black/[0.04]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                "aria-hidden": "true",
                                className: "size-[17px]",
                                strokeWidth: 2
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                                lineNumber: 112,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "tabular-nums",
                                children: [
                                    "Call ",
                                    phone
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                                lineNumber: 113,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                        lineNumber: 111,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
                lineNumber: 95,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/landing-bits.tsx",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
_s1(HeaderMenu, "9NtWjRVPNcmwS2m4Iw1sSwXIVHo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = HeaderMenu;
var _c, _c1;
__turbopack_context__.k.register(_c, "AnnouncementBar");
__turbopack_context__.k.register(_c1, "HeaderMenu");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_estimator_0bce4a0c._.js.map