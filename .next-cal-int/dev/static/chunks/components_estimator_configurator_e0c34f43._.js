(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/estimator/configurator/state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SELECTION_PARAMS",
    ()=>SELECTION_PARAMS,
    "compactRange",
    ()=>compactRange,
    "costBreakdown",
    ()=>costBreakdown,
    "deltaLabel",
    ()=>deltaLabel,
    "designUrl",
    ()=>designUrl,
    "fromLabel",
    ()=>fromLabel,
    "hasSavedDesign",
    ()=>hasSavedDesign,
    "money",
    ()=>money,
    "moneyRange",
    ()=>moneyRange,
    "notPictured",
    ()=>notPictured,
    "reduceSelection",
    ()=>reduceSelection,
    "stepFromHash",
    ()=>stepFromHash,
    "toastFor",
    ()=>toastFor,
    "viewAfter",
    ()=>viewAfter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
;
/*
 * Pure state for the one-page configurator (no React): what a click does to the
 * selection, the money formats, the cost breakdown and the "Save your design"
 * URL. The component (configurator.tsx) only wires these to the page, so the
 * behaviour is unit-tested without a DOM (tests/estimator-configurator-ui.test.tsx).
 */ /* ------------------------------------------------------------------ */ /* Money                                                               */ /* ------------------------------------------------------------------ */ const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});
const money = (n)=>usd.format(Math.round(n));
const moneyRange = (r)=>r.low === r.high ? money(r.low) : `${money(r.low)} – ${money(r.high)}`;
/** 1800 -> "1.8k", 18000 -> "18k", 120000 -> "120k". Deltas are rounded to $100, so one decimal is exact. */ function kilo(n) {
    if (n < 1000) return String(Math.round(n));
    const k = n / 1000;
    return `${k >= 100 ? Math.round(k) : Number(k.toFixed(1))}k`;
}
function compactRange(r) {
    const lo = `$${kilo(r.low)}`;
    return r.low === r.high ? lo : `${lo}–${kilo(r.high)}`;
}
const deltaLabel = (r)=>`+${money(r.low)}`;
const fromLabel = (r)=>`from ${money(r.low)}`;
function reduceSelection(spec, current, action) {
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, current);
    switch(action.type){
        case 'replace':
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, action.selection);
        case 'model':
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, {
                ...sel,
                model: action.model
            });
        case 'luxe':
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, {
                ...sel,
                luxe: action.on
            });
        case 'row':
            {
                const group = spec.groups.find((g)=>g.rows.some((r)=>r.id === action.rowId));
                if (!group || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isLockedByBundle"])(spec, sel, action.rowId)) return sel;
                const picks = {
                    ...sel.picks
                };
                if (group.kind === 'single') {
                    picks[group.id] = [
                        action.rowId
                    ];
                } else {
                    const has = picks[group.id].includes(action.rowId);
                    const on = action.on ?? !has;
                    picks[group.id] = on ? has ? picks[group.id] : [
                        ...picks[group.id],
                        action.rowId
                    ] : picks[group.id].filter((id)=>id !== action.rowId);
                }
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, {
                    ...sel,
                    picks
                });
            }
    }
}
function viewAfter(spec, action, currentView) {
    if (action.type === 'row') {
        const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewForRow"])(spec, action.rowId, currentView);
        return next === currentView ? undefined : next;
    }
    if (action.type === 'luxe' && action.on && spec.bundle) {
        // Stay when the current view shows any of the bundle; else the first view that does.
        if (currentView && spec.bundle.rows.some((id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewsShowingRow"])(spec, id).includes(currentView))) return undefined;
        const first = spec.bundle.rows.map((id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewForRow"])(spec, id)).find(Boolean);
        return first === currentView ? undefined : first;
    }
    return undefined;
}
const notPictured = (spec, rowId)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewsShowingRow"])(spec, rowId).length === 0;
function toastFor(spec, before, after, action) {
    if (action.type === 'luxe') return action.on && spec.bundle ? `${spec.bundle.label} applied` : null;
    if (action.type === 'model') {
        const m = spec.models.find((x)=>x.id === after.model);
        return m && before.model !== after.model ? `${m.name} · ${m.dimensions}` : null;
    }
    if (action.type !== 'row') return null;
    const group = spec.groups.find((g)=>g.rows.some((r)=>r.id === action.rowId));
    const row = group?.rows.find((r)=>r.id === action.rowId);
    if (!group || !row) return null;
    const was = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, before).has(row.id);
    const is = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, after).has(row.id);
    if (was === is) return null;
    const hidden = notPictured(spec, row.id) ? ' · priced, not pictured' : '';
    if (group.kind === 'single') return `${row.label}${hidden}`;
    return `${row.label} ${is ? 'added' : 'removed'}${is ? hidden : ''}`;
}
const add = (a, b)=>({
        low: a.low + b.low,
        high: a.high + b.high
    });
function costBreakdown(spec, template, selection) {
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, selection);
    const model = spec.models.find((m)=>m.id === sel.model);
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimateSelection"])(spec, template, {
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultSelection"])(spec),
        model: sel.model
    }).total;
    const luxe = sel.luxe && spec.bundle ? {
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bundleQuote"])(spec, template, sel.model),
        label: spec.bundle.label
    } : null;
    const upgrades = [];
    const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, sel);
    for (const g of spec.groups){
        for (const r of g.rows){
            if (!rows.has(r.id) || r.included || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isLockedByBundle"])(spec, sel, r.id)) continue;
            upgrades.push({
                rowId: r.id,
                group: g.title,
                label: r.label,
                range: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rowDelta"])(spec, template, sel, r.id)
            });
        }
    }
    const upgradesTotal = upgrades.reduce((t, u)=>add(t, u.range), {
        low: 0,
        high: 0
    });
    const quote = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimateSelection"])(spec, template, sel);
    return {
        modelLabel: `${model.name} · ${model.dimensions}`,
        base,
        luxe,
        upgrades,
        upgradesTotal,
        total: quote.total,
        quote
    };
}
const SELECTION_PARAMS = [
    'm',
    'o',
    'lx'
];
function designUrl(spec, href, selection) {
    const url = new URL(href);
    const params = new URLSearchParams(url.search);
    for (const k of SELECTION_PARAMS)params.delete(k);
    const own = new URLSearchParams((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encodeSelection"])(spec, selection));
    for (const [k, v] of own)params.set(k, v);
    const query = params.toString().replace(/%2C/g, ',');
    return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}
function hasSavedDesign(search) {
    const params = new URLSearchParams(search.replace(/^\?/, ''));
    return SELECTION_PARAMS.some((k)=>params.has(k));
}
function stepFromHash(hash) {
    const h = hash.replace(/^#/, '');
    return h === 'summary' || h === 'book' ? h : 'design';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/cost.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BreakdownLines",
    ()=>BreakdownLines,
    "CostSummary",
    ()=>CostSummary,
    "TotalBar",
    ()=>TotalBar,
    "useTweenedRange",
    ()=>useTweenedRange
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
/* ------------------------------------------------------------------ */ /* Count-up                                                            */ /* ------------------------------------------------------------------ */ const STEP = 100;
function useTweenedRange(target, duration = 450) {
    _s();
    const [shown, setShown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(target);
    const from = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(target);
    const frame = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTweenedRange.useEffect": ()=>{
            const start = from.current;
            if (start.low === target.low && start.high === target.high) return;
            const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduce) {
                from.current = target;
                setShown(target);
                return;
            }
            const t0 = performance.now();
            const tick = {
                "useTweenedRange.useEffect.tick": (now)=>{
                    const p = Math.min(1, (now - t0) / duration);
                    const e = 1 - Math.pow(1 - p, 3);
                    const cur = {
                        low: Math.round((start.low + (target.low - start.low) * e) / STEP) * STEP,
                        high: Math.round((start.high + (target.high - start.high) * e) / STEP) * STEP
                    };
                    from.current = p < 1 ? cur : target;
                    setShown(p < 1 ? cur : target);
                    if (p < 1) frame.current = requestAnimationFrame(tick);
                }
            }["useTweenedRange.useEffect.tick"];
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(tick);
            return ({
                "useTweenedRange.useEffect": ()=>cancelAnimationFrame(frame.current)
            })["useTweenedRange.useEffect"];
        }
    }["useTweenedRange.useEffect"], [
        target.low,
        target.high,
        duration
    ]); // eslint-disable-line react-hooks/exhaustive-deps -- target is compared by value
    return shown;
}
_s(useTweenedRange, "Fto8WjavpCjwjM2dtoo6onMQgto=");
/* ------------------------------------------------------------------ */ /* Breakdown lines                                                     */ /* ------------------------------------------------------------------ */ const plus = (r)=>`+${(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(r)}`;
function BreakdownLines({ breakdown, siteNote, listUpgrades = true }) {
    const { luxe, upgrades } = breakdown;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
        className: "text-[14px] text-[#111]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Line, {
                term: `${breakdown.modelLabel}`,
                sub: "Base design: everything marked Included",
                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(breakdown.base)
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 61,
                columnNumber: 7
            }, this),
            luxe ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Line, {
                term: `${luxe.label} package`,
                sub: `Saves about ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(luxe.saving)}`,
                value: plus(luxe.price)
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 62,
                columnNumber: 15
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Line, {
                term: "Your upgrades",
                sub: upgrades.length ? undefined : 'None yet',
                value: upgrades.length ? plus(breakdown.upgradesTotal) : '$0'
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            listUpgrades && upgrades.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "-mt-1 mb-2 space-y-1 border-l border-[#e4e0d8] pl-3 text-[13px] text-[#5f5a52]",
                children: upgrades.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex justify-between gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "min-w-0",
                                children: u.label
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 72,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "shrink-0 tabular-nums",
                                children: plus(u.range)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 73,
                                columnNumber: 15
                            }, this)
                        ]
                    }, u.rowId, true, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 71,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 69,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Line, {
                term: "Site-specific work",
                sub: "Access, soil, permits and anything we can only see in person",
                value: siteNote,
                muted: true
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/cost.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, this);
}
_c = BreakdownLines;
function Line({ term, sub, value, muted }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-start justify-between gap-4 py-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                className: "min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block font-medium",
                        children: term
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    sub ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block text-[12.5px] leading-[18px] text-[#6d675d]",
                        children: sub
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 88,
                        columnNumber: 16
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                className: `max-w-[55%] shrink-0 text-right tabular-nums ${muted ? 'text-[13px] text-[#5f5a52]' : ''}`,
                children: value
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 90,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/cost.tsx",
        lineNumber: 85,
        columnNumber: 5
    }, this);
}
_c1 = Line;
function TotalBar({ breakdown, open, onOpen, onContinue, continueLabel = 'Continue', examplePrices }) {
    _s1();
    const shown = useTweenedRange(breakdown.total);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "sticky bottom-0 z-30 border-t border-[#e4e0d8] bg-white shadow-[0_-12px_32px_-24px_rgba(0,0,0,.35)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "cfg-breakdown",
                hidden: !open,
                className: "max-h-[calc(100dvh-3.5rem-20vh-6rem)] overflow-y-auto overscroll-contain border-b border-[#efece6] px-5 pb-3 pt-4 sm:px-6 lg:max-h-[min(60vh,520px)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d675d]",
                        children: "Cost breakdown"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BreakdownLines, {
                        breakdown: breakdown,
                        siteNote: "At your free on-site visit"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-[12px] leading-[18px] text-[#6d675d]",
                        children: [
                            "Ballpark, not a quote.",
                            examplePrices ? ' Example prices.' : '',
                            " Lines are rounded; the total is priced from your whole design."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-expanded": open,
                        "aria-controls": "cfg-breakdown",
                        onClick: ()=>onOpen(!open),
                        className: "group/total min-w-0 touch-manipulation rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cfg-accent)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block whitespace-nowrap text-[clamp(18px,5vw,22px)] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-[#111]",
                                "aria-hidden": "true",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(shown)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mt-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#6d675d] group-hover/total:text-[#111]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sr-only",
                                        children: [
                                            open ? 'Hide' : 'Show',
                                            " the cost breakdown. "
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                                        lineNumber: 141,
                                        columnNumber: 13
                                    }, this),
                                    "Your estimate",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        className: "inline-flex size-5 items-center justify-center rounded-full border border-[#d9d4ca]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                            className: `size-3 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/configurator/cost.tsx",
                                            lineNumber: 144,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                                        lineNumber: 143,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 140,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onContinue,
                        className: "ml-auto inline-flex h-12 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-[var(--cfg-accent)] px-4 text-[15px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] active:scale-[.98] motion-reduce:transition-none sm:px-6",
                        children: continueLabel
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "sr-only",
                "aria-live": "polite",
                "aria-atomic": "true",
                children: [
                    "Your estimate: ",
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(breakdown.total)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/cost.tsx",
        lineNumber: 116,
        columnNumber: 5
    }, this);
}
_s1(TotalBar, "1HpBKnaKdwesbW7t1bS8QV+HGyI=", false, function() {
    return [
        useTweenedRange
    ];
});
_c2 = TotalBar;
function CostSummary({ breakdown, examplePrices, onContinue, onBack, contractorName }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "px-5 pb-10 pt-6 sm:px-6 lg:pt-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onBack,
                className: "text-[13px] font-medium text-[#4a463f] underline underline-offset-4 hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]",
                children: "← Back to edit"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 183,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                id: "cfg-summary-title",
                tabIndex: -1,
                className: "mt-4 text-[26px] font-semibold tracking-[-0.02em] text-[#111] outline-none",
                children: "Cost summary"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 rounded-2xl border border-[#e4e0d8] bg-white px-5 pb-5 pt-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BreakdownLines, {
                        breakdown: breakdown,
                        siteNote: "Confirmed at your free on-site visit"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 194,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-[#111] pt-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[19px] font-semibold text-[#111]",
                                children: "Total estimate*"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 196,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "whitespace-nowrap text-right text-[22px] font-semibold tracking-[-0.01em] tabular-nums text-[#111]",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(breakdown.total)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/cost.tsx",
                                lineNumber: 197,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 195,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-3 text-pretty text-[12.5px] leading-[19px] text-[#5f5a52]",
                        children: [
                            "*Ballpark, not a quote. ",
                            examplePrices ? `Example prices, not yet confirmed by ${contractorName}. ` : '',
                            "Excludes site-specific work and permit fees. Your firm, all-in price is confirmed at your free on-site visit."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/cost.tsx",
                        lineNumber: 199,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 193,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onContinue,
                className: "mt-5 inline-flex h-13 w-full touch-manipulation items-center justify-center rounded-xl bg-[var(--cfg-accent)] py-3.5 text-[16px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] active:scale-[.99] motion-reduce:transition-none",
                children: "Book my free consultation"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 204,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-center text-[13px] text-[#6d675d]",
                children: "Free on-site visit, no obligation. You’ll pick a time next."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/cost.tsx",
                lineNumber: 211,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/cost.tsx",
        lineNumber: 182,
        columnNumber: 5
    }, this);
}
_c3 = CostSummary;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "BreakdownLines");
__turbopack_context__.k.register(_c1, "Line");
__turbopack_context__.k.register(_c2, "TotalBar");
__turbopack_context__.k.register(_c3, "CostSummary");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/options.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LuxeCard",
    ()=>LuxeCard,
    "ModelPicker",
    ()=>ModelPicker,
    "OptionGroupCard",
    ()=>OptionGroupCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/state.ts [app-client] (ecmascript)");
'use client';
;
;
;
/*
 * The option column's cards: size, Go Luxe and the option groups. Native
 * radios and checkboxes inside fieldset/legend (arrow keys move within a
 * radio group, Space toggles a checkbox), styled to look like Buildoly's rows.
 */ const card = 'rounded-2xl border border-[#e4e0d8] bg-white';
const focusRing = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--cfg-accent)]';
function ModelPicker({ models, value, totals, onChange }) {
    const current = models.find((m)=>m.id === value);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                className: "mb-1 text-[15px] font-semibold text-[#111]",
                children: "Your pool’s size"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 text-[12.5px] leading-[18px] text-[#5f5a52]",
                children: "Pick the closest; we measure it at the free site visit."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-3 gap-2",
                children: models.map((m)=>{
                    const on = m.id === value;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: `relative flex cursor-pointer flex-col rounded-2xl border bg-white px-2.5 pb-2.5 pt-2.5 transition-[border-color,box-shadow] sm:px-3 sm:pt-3 duration-150 motion-reduce:transition-none ${focusRing} ${on ? 'border-[#111] shadow-[0_0_0_1px_#111]' : 'border-[#e4e0d8] hover:border-[#bdb7ab]'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "radio",
                                name: "cfg-model",
                                value: m.id,
                                checked: on,
                                onChange: ()=>onChange(m.id),
                                className: "sr-only"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PoolGlyph, {
                                model: m,
                                models: models,
                                on: on
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 49,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mt-2 text-[15px] font-semibold leading-5 text-[#111]",
                                children: m.name
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 50,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] tabular-nums text-[#5f5a52]",
                                children: m.dimensions
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 51,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mt-1 whitespace-nowrap text-[11.5px] tabular-nums text-[#5f5a52] sm:text-[12px]",
                                children: totals[m.id] ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fromLabel"])(totals[m.id]) : ''
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 52,
                                columnNumber: 15
                            }, this)
                        ]
                    }, m.id, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 42,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            current ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2.5 hidden text-[13px] text-[#5f5a52] sm:block",
                children: [
                    current.tagline,
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 57,
                columnNumber: 18
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/options.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_c = ModelPicker;
/** A tiny to-scale rectangle so the three sizes read at a glance. */ function PoolGlyph({ model, models, on }) {
    const dims = (m)=>m.dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [
            1,
            1
        ];
    const maxW = Math.max(...models.map((m)=>dims(m)[0]));
    const [w, h] = dims(model);
    const scale = 44 / maxW;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        className: "flex h-7 items-end",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: `block rounded-[3px] border transition-colors duration-150 motion-reduce:transition-none ${on ? 'border-[var(--cfg-accent)] bg-[#cfe3f3]' : 'border-[#bdb7ab] bg-[#eef3f6]'}`,
            style: {
                width: Math.round(w * scale),
                height: Math.round(h * scale)
            }
        }, void 0, false, {
            fileName: "[project]/components/estimator/configurator/options.tsx",
            lineNumber: 70,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/configurator/options.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
_c1 = PoolGlyph;
function LuxeCard({ bundle, quote, on, onChange, examplePrices }) {
    const count = bundle.includes.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-labelledby": "cfg-luxe-title",
        className: `rounded-2xl border p-5 transition-colors duration-200 motion-reduce:transition-none ${on ? 'border-[#111] bg-[#111] text-white' : 'border-[var(--cfg-accent-line)] bg-[var(--cfg-accent-tint)] text-[#111]'}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "cfg-luxe-title",
                        className: "min-w-0 flex-1 text-[18px] font-semibold leading-6",
                        children: bundle.label
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        role: "switch",
                        "aria-checked": on,
                        "aria-labelledby": "cfg-luxe-title",
                        onClick: ()=>onChange(!on),
                        className: `relative inline-flex h-7 w-12 shrink-0 touch-manipulation items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${on ? 'bg-white focus-visible:outline-white' : 'bg-[#cfcac0] focus-visible:outline-[var(--cfg-accent)]'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            "aria-hidden": "true",
                            className: `absolute left-0.5 size-6 rounded-full shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${on ? 'translate-x-5 bg-[#111]' : 'translate-x-0 bg-white'}`
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/options.tsx",
                            lineNumber: 118,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `mt-1 text-pretty text-[14px] leading-5 ${on ? 'text-white/80' : 'text-[#4a463f]'}`,
                children: [
                    "Our ",
                    count,
                    " signature upgrades in one package, for less than adding them one by one."
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `text-[12px] ${on ? 'text-white/80' : 'text-[#5f5a52]'}`,
                        children: "from"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `text-[22px] font-semibold tracking-[-0.01em] ${on ? 'text-white' : 'text-[var(--cfg-accent)]'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Package price: "
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 132,
                                columnNumber: 11
                            }, this),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deltaLabel"])(quote.price)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 131,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `text-[14px] line-through ${on ? 'text-white/70' : 'text-[#5f5a52]'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "instead of "
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 136,
                                columnNumber: 11
                            }, this),
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["money"])(quote.full.low)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 135,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `rounded-full px-2 py-0.5 text-[12px] font-semibold ${on ? 'bg-white text-[#111]' : 'bg-[#111] text-white'}`,
                        children: [
                            "Save ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["money"])(quote.saving.low),
                            "+"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 139,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            examplePrices ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `mt-1.5 text-[12px] ${on ? 'text-white/75' : 'text-[#5f5a52]'}`,
                children: "Example prices and saving, confirmed at your site visit."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 144,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
                className: "group mt-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                        className: `inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden ${on ? 'text-white/80 focus-visible:outline-white' : 'text-[#4a463f] focus-visible:outline-[var(--cfg-accent)]'}`,
                        children: [
                            "What’s included",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                "aria-hidden": "true",
                                className: "size-3.5 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 153,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 147,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: `mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] ${on ? 'text-white/85' : 'text-[#4a463f]'}`,
                        children: bundle.includes.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex items-center gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                        "aria-hidden": "true",
                                        className: `size-3.5 shrink-0 ${on ? 'text-white' : 'text-[var(--cfg-accent)]'}`,
                                        strokeWidth: 2.5
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/options.tsx",
                                        lineNumber: 158,
                                        columnNumber: 15
                                    }, this),
                                    item
                                ]
                            }, item, true, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/options.tsx",
        lineNumber: 98,
        columnNumber: 5
    }, this);
}
_c2 = LuxeCard;
function OptionGroupCard({ group, rows, onRow }) {
    const single = group.kind === 'single';
    const allLocked = rows.every((r)=>r.locked);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        className: `${card} px-4 pb-1.5 pt-3.5 sm:px-5 ${single && allLocked ? 'bg-[#faf9f6]' : ''}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                className: "float-left w-full",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block text-[15px] font-semibold text-[#111]",
                        children: group.title
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 200,
                        columnNumber: 9
                    }, this),
                    group.note ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mt-0.5 block text-[13px] text-[#5f5a52]",
                        children: group.note
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 201,
                        columnNumber: 23
                    }, this) : null,
                    !single ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "sr-only",
                        children: " (pick any)"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 202,
                        columnNumber: 20
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 199,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "clear-both pt-1.5",
                children: rows.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: `group/row relative flex min-h-[52px] items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-[#efece6]' : ''} ${r.locked ? 'cursor-default' : 'cursor-pointer'} ${focusRing} rounded-sm`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: single ? 'radio' : 'checkbox',
                                name: single ? `cfg-${group.id}` : undefined,
                                value: r.id,
                                checked: r.checked,
                                disabled: r.locked,
                                onChange: (e)=>onRow(r.id, e.currentTarget.checked),
                                className: "sr-only"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 212,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mark, {
                                single: single,
                                checked: r.checked,
                                locked: r.locked
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 221,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "min-w-0 flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `block text-[15px] leading-5 ${r.checked ? 'font-semibold' : 'font-normal'} ${r.locked && !r.checked ? 'text-[#8f897e]' : 'text-[#111]'}`,
                                        children: r.label
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/options.tsx",
                                        lineNumber: 223,
                                        columnNumber: 15
                                    }, this),
                                    r.note || r.notPictured ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `block text-[12.5px] leading-[18px] ${r.locked && !r.checked ? 'text-[#8f897e]' : 'text-[#6d675d]'}`,
                                        children: [
                                            r.note,
                                            r.notPictured ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "whitespace-nowrap",
                                                children: [
                                                    r.note ? ' · ' : '',
                                                    "Not pictured"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                                lineNumber: 229,
                                                columnNumber: 36
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/configurator/options.tsx",
                                        lineNumber: 227,
                                        columnNumber: 17
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 222,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `shrink-0 text-right tabular-nums ${r.locked && r.checked ? 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5f5a52]' : r.included ? 'text-[13px] text-[#6d675d]' : `text-[14px] ${r.locked ? 'text-[#8f897e]' : 'text-[#111]'}`}`,
                                children: [
                                    !r.included && !(r.locked && r.checked) && r.price.startsWith('+') ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "mr-1 text-[11.5px] font-normal text-[#6d675d]",
                                        children: "from"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/options.tsx",
                                        lineNumber: 243,
                                        columnNumber: 17
                                    }, this) : null,
                                    r.price
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/options.tsx",
                                lineNumber: 233,
                                columnNumber: 13
                            }, this)
                        ]
                    }, r.id, true, {
                        fileName: "[project]/components/estimator/configurator/options.tsx",
                        lineNumber: 206,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 204,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/options.tsx",
        lineNumber: 198,
        columnNumber: 5
    }, this);
}
_c3 = OptionGroupCard;
/** The radio dot / checkbox tick drawn for the visually hidden input. */ function Mark({ single, checked, locked }) {
    const base = 'flex size-5 shrink-0 items-center justify-center border transition-colors duration-150 motion-reduce:transition-none';
    const tone = checked ? locked ? 'border-[#6d675d] bg-white' : 'border-[#111] bg-white' : locked ? 'border-[#ddd8cf] bg-[#f6f4f0]' : 'border-[#bdb7ab] bg-white group-hover/row:border-[#7a746a]';
    if (single) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            "aria-hidden": "true",
            className: `${base} ${tone} rounded-full`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `size-2.5 rounded-full transition-transform duration-150 motion-reduce:transition-none ${checked ? 'scale-100' : 'scale-0'} ${locked ? 'bg-[#6d675d]' : 'bg-[#111]'}`
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/options.tsx",
                lineNumber: 261,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/configurator/options.tsx",
            lineNumber: 260,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": "true",
        className: `${base} rounded-md ${checked ? locked ? 'border-[#6d675d] bg-[#6d675d]' : 'border-[#111] bg-[#111]' : tone}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
            className: `size-3.5 text-white transition-opacity duration-150 motion-reduce:transition-none ${checked ? 'opacity-100' : 'opacity-0'}`,
            strokeWidth: 3
        }, void 0, false, {
            fileName: "[project]/components/estimator/configurator/options.tsx",
            lineNumber: 267,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/configurator/options.tsx",
        lineNumber: 266,
        columnNumber: 5
    }, this);
}
_c4 = Mark;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "ModelPicker");
__turbopack_context__.k.register(_c1, "PoolGlyph");
__turbopack_context__.k.register(_c2, "LuxeCard");
__turbopack_context__.k.register(_c3, "OptionGroupCard");
__turbopack_context__.k.register(_c4, "Mark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/photo-stage.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PhotoStage",
    ()=>PhotoStage,
    "STAGE_SIZES",
    ()=>STAGE_SIZES,
    "SizePlan",
    ()=>SizePlan,
    "canWarmPhotos",
    ()=>canWarmPhotos,
    "preloadPhoto",
    ()=>preloadPhoto
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
/* eslint-disable @next/next/no-img-element -- pre-rendered variants swap in place with a crossfade; next/image would re-layout and re-request on every swap. */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-client] (ecmascript) <export default as ChevronUp>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const STAGE_SIZES = '(min-width: 1024px) 135vh, 100vw';
/* ------------------------------------------------------------------ */ /* Preloading                                                          */ /* ------------------------------------------------------------------ */ /** src -> settled load (true: decoded and ready, false: failed). Shared by every stage on the page. */ const loads = new Map();
function preloadPhoto(photo) {
    if (("TURBOPACK compile-time value", "object") === 'undefined' || typeof Image === 'undefined') return Promise.resolve(true);
    const id = `${photo.src}|${photo.srcSet ?? ''}`;
    const known = loads.get(id);
    if (known) return known;
    const p = new Promise((resolve)=>{
        const img = new Image();
        img.decoding = 'async';
        if (photo.srcSet) {
            img.sizes = STAGE_SIZES;
            img.srcset = photo.srcSet;
        }
        img.onload = ()=>{
            if (typeof img.decode === 'function') img.decode().then(()=>resolve(true), ()=>resolve(true));
            else resolve(true);
        };
        img.onerror = ()=>resolve(false);
        img.src = photo.src;
    });
    loads.set(id, p);
    return p;
}
function canWarmPhotos() {
    if (typeof navigator === 'undefined') return true;
    const c = navigator.connection;
    if (!c) return true;
    return !c.saveData && !/(^|-)(2g|3g)$/.test(c.effectiveType ?? '');
}
function whenIdle(fn) {
    const w = window;
    if (w.requestIdleCallback) {
        const id = w.requestIdleCallback(fn, {
            timeout: 2500
        });
        return ()=>w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(fn, 600);
    return ()=>window.clearTimeout(id);
}
const prefersReducedMotion = ()=>("TURBOPACK compile-time value", "object") !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function PhotoStage({ spec, view, onView, photo, next, idle, toast, caption, model, models, collapsed, onCollapsed }) {
    _s();
    const [layers, setLayers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "PhotoStage.useState": ()=>[
                {
                    ...photo,
                    id: 0
                }
            ]
    }["PhotoStage.useState"]);
    const seq = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const wanted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(photo.src);
    // Swap to the new photo once it is decoded (the latest request wins).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PhotoStage.useEffect": ()=>{
            wanted.current = `${photo.src}|${photo.srcSet ?? ''}`;
            const top = layers[layers.length - 1];
            if (top && top.src === photo.src && top.srcSet === photo.srcSet) {
                if (top.alt !== photo.alt || top.key !== photo.key) setLayers({
                    "PhotoStage.useEffect": (ls)=>ls.map({
                            "PhotoStage.useEffect": (l, i)=>i === ls.length - 1 ? {
                                    ...l,
                                    alt: photo.alt,
                                    key: photo.key
                                } : l
                        }["PhotoStage.useEffect"])
                }["PhotoStage.useEffect"]);
                return;
            }
            let live = true;
            const target = photo;
            preloadPhoto(target).then({
                "PhotoStage.useEffect": (ok)=>{
                    if (!live || wanted.current !== `${target.src}|${target.srcSet ?? ''}`) return;
                    const shown = ok ? target : {
                        ...target,
                        src: target.fallback,
                        srcSet: undefined,
                        isFallback: true
                    };
                    const id = ++seq.current;
                    setLayers({
                        "PhotoStage.useEffect": (ls)=>prefersReducedMotion() ? [
                                {
                                    ...shown,
                                    id
                                }
                            ] : [
                                ...ls.slice(-1),
                                {
                                    ...shown,
                                    id
                                }
                            ]
                    }["PhotoStage.useEffect"]);
                }
            }["PhotoStage.useEffect"]);
            return ({
                "PhotoStage.useEffect": ()=>{
                    live = false;
                }
            })["PhotoStage.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps -- layers is read for the no-op check only
        }
    }["PhotoStage.useEffect"], [
        photo.src,
        photo.srcSet,
        photo.alt,
        photo.key
    ]);
    // Warm the other views now; the one-click neighbours when idle, and only on a good connection.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PhotoStage.useEffect": ()=>{
            if (!canWarmPhotos()) return;
            for (const p of next)void preloadPhoto(p);
            return whenIdle({
                "PhotoStage.useEffect": ()=>{
                    for (const p of idle)void preloadPhoto(p);
                }
            }["PhotoStage.useEffect"]);
        }
    }["PhotoStage.useEffect"], [
        next,
        idle
    ]);
    const top = layers[layers.length - 1];
    const showCaption = !top.isFallback && !top.failed;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "es-cfg-stage relative isolate h-full w-full overflow-hidden bg-[#e9e6df]",
        children: [
            layers.map((l, i)=>{
                const isTop = i === layers.length - 1;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: l.src,
                    srcSet: l.srcSet,
                    sizes: l.srcSet ? STAGE_SIZES : undefined,
                    alt: isTop ? l.alt : '',
                    "aria-hidden": isTop ? undefined : true,
                    decoding: "async",
                    draggable: false,
                    className: `absolute inset-0 h-full w-full select-none object-cover ${isTop && l.id !== 0 ? 'es-cfg-fade' : ''}`,
                    onAnimationEnd: isTop ? ()=>setLayers((ls)=>ls.slice(-1)) : undefined,
                    onError: ()=>setLayers((ls)=>ls.map((x)=>x.id === l.id && x.src !== x.fallback ? {
                                    ...x,
                                    src: x.fallback,
                                    srcSet: undefined,
                                    failed: true
                                } : x))
                }, l.id, false, {
                    fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                    lineNumber: 149,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "group",
                "aria-label": "Photo view",
                className: "absolute inset-x-0 top-2.5 flex justify-center gap-1.5 px-3 sm:top-5",
                children: spec.views.map((v)=>{
                    const active = v.id === view;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-pressed": active,
                        onClick: ()=>onView(v.id),
                        className: `h-8 touch-manipulation rounded-full px-3.5 text-[13px] font-medium backdrop-blur-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${active ? 'bg-[#111] text-white' : 'bg-white/85 text-[#111] hover:bg-white'}`,
                        children: v.label
                    }, v.id, false, {
                        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                        lineNumber: 175,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 171,
                columnNumber: 7
            }, this),
            model ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SizePlan, {
                model: model,
                models: models,
                caption: showCaption ? caption : null,
                hiddenOnPhone: collapsed
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 190,
                columnNumber: 16
            }, this) : null,
            toast ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "es-cfg-toast pointer-events-none absolute inset-x-0 top-12 flex justify-center px-4 sm:top-16",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "rounded-full bg-white/95 px-4 py-2 text-center text-[13px] font-medium text-[#111] shadow-[0_6px_24px_-8px_rgba(0,0,0,.45)]",
                    children: toast.text
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                    lineNumber: 194,
                    columnNumber: 11
                }, this)
            }, toast.id, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 193,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>onCollapsed(!collapsed),
                "aria-expanded": !collapsed,
                "aria-label": collapsed ? 'Show a bigger photo' : 'Make the photo smaller',
                className: "absolute bottom-2 right-2.5 inline-flex size-9 touch-manipulation items-center justify-center rounded-full bg-white/90 text-[#111] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden",
                children: collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                    "aria-hidden": "true",
                    className: "size-4"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                    lineNumber: 205,
                    columnNumber: 22
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                    "aria-hidden": "true",
                    className: "size-4"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                    lineNumber: 205,
                    columnNumber: 78
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
        lineNumber: 145,
        columnNumber: 5
    }, this);
}
_s(PhotoStage, "6Biu0y8GyhcYCV/AZXyaZNwl9ro=");
_c = PhotoStage;
const dims = (m)=>m.dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [
        1,
        1
    ];
function SizePlan({ model, models, caption, hiddenOnPhone = false }) {
    const maxW = Math.max(...models.map((m)=>dims(m)[0]));
    const maxH = Math.max(...models.map((m)=>dims(m)[1]));
    const box = {
        w: 64,
        h: 34
    };
    const scale = Math.min((box.w - 4) / maxW, (box.h - 4) / maxH);
    const rect = (m)=>{
        const [w, h] = dims(m);
        return {
            width: w * scale,
            height: h * scale,
            x: (box.w - w * scale) / 2,
            y: (box.h - h * scale) / 2
        };
    };
    const on = rect(model);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `pointer-events-none absolute bottom-2 left-2.5 items-center gap-2 rounded-lg bg-white/92 py-1 pl-1.5 pr-2.5 shadow-[0_4px_18px_-8px_rgba(0,0,0,.4)] backdrop-blur-sm sm:bottom-4 sm:left-4 sm:gap-2.5 sm:rounded-xl sm:py-1.5 sm:pl-2 sm:pr-3 ${hiddenOnPhone ? 'hidden lg:flex' : 'flex'}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                "aria-hidden": "true",
                viewBox: `0 0 ${box.w} ${box.h}`,
                className: "h-[22px] w-[42px] shrink-0 sm:h-[34px] sm:w-[64px]",
                children: [
                    models.map((m)=>{
                        const r = rect(m);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: r.x,
                            y: r.y,
                            width: r.width,
                            height: r.height,
                            rx: 1.5,
                            fill: "none",
                            stroke: "#b9b3a9",
                            strokeDasharray: "2 2",
                            strokeWidth: 1
                        }, m.id, false, {
                            fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                            lineNumber: 247,
                            columnNumber: 18
                        }, this);
                    }),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: on.x,
                        y: on.y,
                        width: on.width,
                        height: on.height,
                        rx: 1.5,
                        fill: "#4f9fd6",
                        stroke: "#26389a",
                        strokeWidth: 1.2,
                        className: "transition-all duration-300 ease-out motion-reduce:transition-none"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                        lineNumber: 249,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 244,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "min-w-0 leading-tight",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block text-[12px] font-semibold text-[#111] sm:text-[12.5px]",
                        children: [
                            model.name,
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-normal tabular-nums text-[#4a463f]",
                                children: [
                                    "· ",
                                    model.dimensions
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                                lineNumber: 263,
                                columnNumber: 24
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                        lineNumber: 262,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block text-[10px] text-[#5f5a52] sm:text-[10.5px]",
                        children: caption ? `To scale · ${caption}` : 'Your size, to scale'
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
                lineNumber: 261,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/photo-stage.tsx",
        lineNumber: 239,
        columnNumber: 5
    }, this);
}
_c1 = SizePlan;
var _c, _c1;
__turbopack_context__.k.register(_c, "PhotoStage");
__turbopack_context__.k.register(_c1, "SizePlan");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/photos.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FULL_W",
    ()=>FULL_W,
    "SMALL_W",
    ()=>SMALL_W,
    "currentPhotos",
    ()=>currentPhotos,
    "smallSrc",
    ()=>smallSrc,
    "stagePhoto",
    ()=>stagePhoto,
    "viewPhotos",
    ()=>viewPhotos
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
;
const smallSrc = (src)=>src.replace(/\.webp$/, '-sm.webp');
const SMALL_W = 1200;
const FULL_W = 1800;
function stagePhoto(spec, key, manifest) {
    const view = spec.views.find((v)=>key === v.id || key.startsWith(`${v.id}-`)) ?? spec.views[0];
    const fallback = view.fallback.src;
    const real = {
        key,
        src: fallback,
        alt: view.fallback.alt,
        fallback,
        isFallback: true
    };
    if (!spec.photos[key]) return real;
    const { src, alt } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoSrc"])(spec, key);
    if (!manifest) return {
        key,
        src,
        alt,
        fallback,
        isFallback: false
    };
    const files = manifest[key];
    if (!files?.full) return real;
    return {
        key,
        src,
        alt,
        fallback,
        isFallback: false,
        srcSet: files.sm ? `${smallSrc(src)} ${SMALL_W}w, ${src} ${FULL_W}w` : undefined
    };
}
function currentPhotos(spec, selection, manifest) {
    return spec.views.map((v)=>({
            view: v.id,
            label: v.label,
            ...stagePhoto(spec, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, v.id, selection), manifest)
        }));
}
function viewPhotos(spec, viewId, manifest) {
    const seen = new Set();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoKeys"])(spec, viewId).map((k)=>stagePhoto(spec, k, manifest)).filter((p)=>seen.has(p.src) ? false : (seen.add(p.src), true));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/result.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* eslint-disable @next/next/no-img-element -- small lazy thumbnails of files in public/ */ /* The step-3 result page is result/result-page.tsx; this file keeps the design column's project strip. */ __turbopack_context__.s([
    "ProjectStrip",
    ()=>ProjectStrip
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function ProjectStrip({ gallery, title, className = '' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-label": title,
        className: className,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "text-[15px] font-semibold text-[#111]",
                children: title
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result.tsx",
                lineNumber: 11,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[12.5px] text-[#6d675d]",
                children: "Real photos of finished jobs."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "es-cfg-strip -mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2",
                children: gallery.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "w-[150px] shrink-0 snap-start",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e6df]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: g.thumb ?? g.src,
                                    alt: g.alt,
                                    loading: "lazy",
                                    decoding: "async",
                                    sizes: "150px",
                                    className: "absolute inset-0 h-full w-full object-cover"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/result.tsx",
                                    lineNumber: 17,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result.tsx",
                                lineNumber: 16,
                                columnNumber: 13
                            }, this),
                            g.caption ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1.5 text-[12px] leading-4 text-[#5f5a52]",
                                children: g.caption
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result.tsx",
                                lineNumber: 19,
                                columnNumber: 26
                            }, this) : null
                        ]
                    }, g.src, true, {
                        fileName: "[project]/components/estimator/configurator/result.tsx",
                        lineNumber: 15,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = ProjectStrip;
var _c;
__turbopack_context__.k.register(_c, "ProjectStrip");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/result/booking-state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BOOKING_FIELDS",
    ()=>BOOKING_FIELDS,
    "bookingRequest",
    ()=>bookingRequest,
    "calendarFrameUrl",
    ()=>calendarFrameUrl,
    "designHighlights",
    ()=>designHighlights,
    "emptyBookingFields",
    ()=>emptyBookingFields,
    "firstInvalidField",
    ()=>firstInvalidField,
    "generalErrors",
    ()=>generalErrors,
    "tidyPhone",
    ()=>tidyPhone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
;
;
;
const emptyBookingFields = ()=>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        zip: '',
        homeowner: '',
        consent: false,
        website: ''
    });
const BOOKING_FIELDS = new Set(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LEAD_FIELD_ORDER"]);
function firstInvalidField(errors) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LEAD_FIELD_ORDER"].find((key)=>errors[key]) ?? null;
}
function generalErrors(errors) {
    return Object.entries(errors).filter(([key])=>!BOOKING_FIELDS.has(key)).map(([, message])=>message);
}
function bookingRequest(input) {
    const { fields } = input;
    return {
        answers: input.answers,
        configurator: {
            model: input.selection.model,
            picks: input.selection.picks,
            luxe: input.selection.luxe
        },
        zip: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeZip"])(fields.zip) ?? fields.zip.trim(),
        homeowner: fields.homeowner === 'no' ? 'no' : 'yes',
        contact: {
            firstName: fields.firstName.trim(),
            lastName: fields.lastName.trim(),
            email: fields.email.trim(),
            phone: fields.phone.trim(),
            consent: fields.consent,
            website: fields.website
        },
        consentText: input.consentText,
        measurement: input.measurement,
        ...input.tracking ? {
            tracking: input.tracking
        } : {},
        ...input.submissionId ? {
            submissionId: input.submissionId
        } : {}
    };
}
function designHighlights(spec, selection) {
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, selection);
    const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, sel);
    const luxe = sel.luxe && spec.bundle ? new Set(spec.bundle.rows) : new Set();
    return spec.groups.map((g)=>({
            group: g.title,
            items: g.rows.filter((r)=>rows.has(r.id)).map((r)=>({
                    label: r.label,
                    luxe: luxe.has(r.id),
                    included: Boolean(r.included)
                }))
        })).filter((h)=>h.items.length > 0);
}
function calendarFrameUrl(url, host) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== 'calendly.com') return null;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calendlyEmbedUrl"])(url, host, {
            name: parsed.searchParams.get('name') ?? '',
            email: parsed.searchParams.get('email') ?? ''
        });
    } catch  {
        return null;
    }
}
function tidyPhone(value) {
    const digits = value.replace(/\D/g, '');
    const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (ten.length !== 10 || /[^\d\s().+-]/.test(value)) return value;
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/result/booking-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConfiguratorBooking",
    ()=>ConfiguratorBooking
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-days.js [app-client] (ecmascript) <export default as CalendarDays>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/booking-state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
const prefersReducedMotion = ()=>("TURBOPACK compile-time value", "object") !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Page URL (UTMs for attribution) and, only with measurement allowed, the Meta browser ids. */ function readTracking(measurement) {
    try {
        const pageUrl = window.location.href.slice(0, 4000);
        if (!measurement) return {
            pageUrl
        };
        const cookie = (name)=>document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
        return {
            fbp: cookie('_fbp'),
            fbc: cookie('_fbc'),
            eventId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["newSubmissionId"])(),
            pageUrl
        };
    } catch  {
        return undefined;
    }
}
const input = 'block h-12 w-full rounded-xl border bg-white px-3.5 text-[16px] text-[#111] placeholder:text-[#9a948a] transition-colors duration-150 focus:outline-none focus-visible:border-[var(--cfg-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cfg-accent-line)] motion-reduce:transition-none';
const okBorder = 'border-[#d9d4ca] hover:border-[#bdb7ab]';
const badBorder = 'border-[#b42318]';
function ConfiguratorBooking({ slug, contractor, selection, answers, embedded, onSent }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const [fields, setFields] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emptyBookingFields"]);
    // Pre-ticked unless the contractor is set to opt_in (the owner's call); the homeowner can still untick it.
    const [measurement, setMeasurement] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(contractor.adMeasurement !== 'opt_in');
    const [consentWording, setConsentWording] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ConfiguratorBooking.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimatorConsentText"])(contractor.contractorName)
    }["ConfiguratorBooking.useState"]);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [sending, setSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [done, setDone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [focusTick, setFocusTick] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const sendingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const formRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const doneRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // The form's height when it turns into the thank-you, kept as a minimum so nothing below jumps.
    const [keepHeight, setKeepHeight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // One id per design + details: a retry (ours or theirs) of the same submission is answered once.
    const submission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ConfiguratorBooking.useEffect": ()=>{
            if (!focusTick) return;
            const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["firstInvalidField"])(errors);
            const el = key ? formRef.current?.querySelector(`[data-field="${key}"]`) : formRef.current?.querySelector('[data-form-error]');
            el?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only after a submit attempt
        }
    }["ConfiguratorBooking.useEffect"], [
        focusTick
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ConfiguratorBooking.useEffect": ()=>{
            if (!done) return;
            doneRef.current?.focus({
                preventScroll: true
            });
            doneRef.current?.scrollIntoView({
                block: 'start',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });
        }
    }["ConfiguratorBooking.useEffect"], [
        done
    ]);
    const set = (key, value)=>{
        setFields((f)=>({
                ...f,
                [key]: value
            }));
        if (errors[key]) {
            setErrors((e)=>{
                const next = {
                    ...e
                };
                delete next[key];
                return next;
            });
        }
    };
    const submit = async (event)=>{
        event.preventDefault();
        if (sendingRef.current) return;
        const local = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["leadFieldErrors"])(fields);
        if (Object.keys(local).length) {
            setErrors(local);
            setFocusTick((n)=>n + 1);
            return;
        }
        sendingRef.current = true;
        setSending(true);
        setErrors({});
        const draft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bookingRequest"])({
            answers,
            selection,
            fields,
            consentText: consentWording,
            measurement
        });
        const body = JSON.stringify(draft);
        if (!submission.current || submission.current.body !== body) submission.current = {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["newSubmissionId"])(),
            body
        };
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitEstimatorLead"])(slug, {
            ...draft,
            tracking: readTracking(measurement),
            submissionId: submission.current.id
        });
        sendingRef.current = false;
        setSending(false);
        if (res.ok) {
            setKeepHeight(formRef.current?.offsetHeight ?? null);
            setDone({
                qualified: res.qualified,
                calendarUrl: res.calendarUrl,
                bookingTicket: res.bookingTicket,
                firstName: fields.firstName.trim()
            });
            onSent?.();
            return;
        }
        if (res.consentText) {
            // The wording changed since the page loaded: show the new one and ask for the box again.
            setConsentWording(res.consentText);
            setFields((f)=>({
                    ...f,
                    consent: false
                }));
        }
        setErrors(res.errors);
        setFocusTick((n)=>n + 1);
    };
    if (done) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: keepHeight ? {
                minHeight: keepHeight
            } : undefined,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BookingDone, {
                done: done,
                contractor: contractor,
                embedded: embedded,
                headingRef: doneRef
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 140,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
            lineNumber: 139,
            columnNumber: 7
        }, this);
    }
    const general = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generalErrors"])(errors);
    const fieldCount = Object.keys(errors).length - general.length;
    const err = (key)=>errors[key];
    const describedBy = (key, hint)=>[
            hint ? `${uid}-${key}-h` : '',
            err(key) ? `${uid}-${key}-e` : ''
        ].filter(Boolean).join(' ') || undefined;
    const text = (key, label, extra, hint)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    htmlFor: `${uid}-${key}`,
                    className: "mb-1.5 block text-[13.5px] font-medium text-[#111]",
                    children: label
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 152,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: `${uid}-${key}`,
                    "data-field": key,
                    name: key,
                    value: fields[key],
                    onChange: (e)=>set(key, e.target.value),
                    // Only when tidying changes it: a no-op set would clear the field's error on blur, shift the layout
                    // under the pointer and swallow the click on "Book my free consultation".
                    onBlur: key === 'phone' ? ()=>{
                        const tidy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tidyPhone"])(fields.phone);
                        if (tidy !== fields.phone) set('phone', tidy);
                    } : undefined,
                    "aria-invalid": err(key) ? true : undefined,
                    "aria-describedby": describedBy(key, Boolean(hint)),
                    className: `${input} ${err(key) ? badBorder : okBorder}`,
                    ...extra
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 155,
                    columnNumber: 7
                }, this),
                hint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    id: `${uid}-${key}-h`,
                    className: "mt-1 text-[12px] text-[#6d675d]",
                    children: hint
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 177,
                    columnNumber: 9
                }, this) : null,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                    id: `${uid}-${key}-e`,
                    children: err(key)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 181,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
            lineNumber: 151,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        ref: formRef,
        onSubmit: submit,
        noValidate: true,
        "aria-describedby": `${uid}-intro`,
        className: "space-y-4",
        "data-booking-form": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: `${uid}-intro`,
                className: "sr-only",
                children: "Your design and estimate are sent with your details."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 187,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                children: [
                    text('firstName', 'First name', {
                        type: 'text',
                        autoComplete: 'given-name',
                        maxLength: 80
                    }),
                    text('lastName', 'Last name', {
                        type: 'text',
                        autoComplete: 'family-name',
                        maxLength: 80
                    })
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                children: [
                    text('phone', 'Mobile phone', {
                        type: 'tel',
                        autoComplete: 'tel',
                        inputMode: 'tel',
                        placeholder: '(818) 555-0142',
                        maxLength: 30
                    }),
                    text('email', 'Email', {
                        type: 'email',
                        autoComplete: 'email',
                        inputMode: 'email',
                        placeholder: 'you@example.com',
                        maxLength: 254,
                        spellCheck: 'false'
                    })
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 194,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                children: [
                    text('zip', 'Property ZIP code', {
                        type: 'text',
                        autoComplete: 'postal-code',
                        inputMode: 'numeric',
                        placeholder: '91302',
                        maxLength: 10
                    }),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
                        "aria-describedby": err('homeowner') ? `${uid}-homeowner-e` : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                                className: "mb-1.5 block text-[13.5px] font-medium text-[#111]",
                                children: "Do you own the home?"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 201,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `grid h-12 grid-cols-2 gap-1 rounded-xl border bg-white p-1 ${err('homeowner') ? badBorder : 'border-[#d9d4ca]'}`,
                                children: [
                                    [
                                        'yes',
                                        'Yes'
                                    ],
                                    [
                                        'no',
                                        'No'
                                    ]
                                ].map(([value, label], i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: `relative flex cursor-pointer items-center justify-center rounded-lg text-[14.5px] font-medium transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--cfg-accent)] motion-reduce:transition-none ${fields.homeowner === value ? 'bg-[#111] text-white' : 'text-[#3d3a34] hover:bg-[#f5f3ef]'}`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "radio",
                                                name: `${uid}-homeowner`,
                                                value: value,
                                                checked: fields.homeowner === value,
                                                onChange: ()=>set('homeowner', value),
                                                "data-field": i === 0 ? 'homeowner' : undefined,
                                                className: "sr-only"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                                lineNumber: 215,
                                                columnNumber: 17
                                            }, this),
                                            label
                                        ]
                                    }, value, true, {
                                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                        lineNumber: 209,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 202,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                                id: `${uid}-homeowner-e`,
                                children: err('homeowner')
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 228,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 200,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                hidden: true,
                inert: true,
                "aria-hidden": "true",
                className: "hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    children: [
                        "Leave this empty",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            name: "contact_url_2",
                            tabIndex: -1,
                            autoComplete: "off",
                            value: fields.website,
                            onChange: (e)=>set('website', e.target.value)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                            lineNumber: 236,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 234,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 233,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex cursor-pointer items-start gap-3 text-[13px] leading-[19px] text-[#4a463f]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                "data-field": "consent",
                                checked: fields.consent,
                                onChange: (e)=>set('consent', e.target.checked),
                                "aria-invalid": err('consent') ? true : undefined,
                                "aria-describedby": err('consent') ? `${uid}-consent-e` : undefined,
                                className: "mt-0.5 size-[18px] shrink-0 accent-[var(--cfg-accent)]"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 242,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    consentWording,
                                    ' ',
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "/privacy",
                                        target: "_blank",
                                        rel: "noreferrer",
                                        className: "underline underline-offset-2 hover:text-[#111]",
                                        children: "Privacy policy"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                        lineNumber: 253,
                                        columnNumber: 13
                                    }, this),
                                    ' · ',
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "/terms",
                                        target: "_blank",
                                        rel: "noreferrer",
                                        className: "underline underline-offset-2 hover:text-[#111]",
                                        children: "Terms"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                        lineNumber: 257,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 251,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 241,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                        id: `${uid}-consent-e`,
                        className: "pl-[30px]",
                        children: err('consent')
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 262,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mt-3 flex cursor-pointer items-start gap-3 text-[12px] leading-[18px] text-[#6d675d]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: measurement,
                                onChange: (e)=>setMeasurement(e.target.checked),
                                className: "mt-px size-4 shrink-0 accent-[var(--cfg-accent)]"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 266,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Allow optional advertising measurement"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 272,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 240,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                "aria-live": "assertive",
                className: "empty:hidden",
                children: [
                    fieldCount > 0 && general.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[13.5px] font-medium text-[#b42318]",
                        children: fieldCount === 1 ? 'One thing to fix above.' : `${fieldCount} things to fix above.`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 278,
                        columnNumber: 11
                    }, this) : null,
                    general.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            "data-form-error": "",
                            tabIndex: -1,
                            className: "rounded-xl border border-[#f1c9c4] bg-[#fdf3f2] px-3.5 py-3 text-[13.5px] leading-5 text-[#8a1c12] outline-none",
                            children: message
                        }, message, false, {
                            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                            lineNumber: 283,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 276,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "submit",
                disabled: sending,
                "aria-busy": sending || undefined,
                className: "inline-flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[var(--cfg-accent)] px-6 text-[16px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] disabled:cursor-wait motion-reduce:transition-none",
                children: [
                    sending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        "aria-hidden": "true",
                        className: "size-4 animate-spin motion-reduce:animate-none"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 295,
                        columnNumber: 20
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__["CalendarDays"], {
                        "aria-hidden": "true",
                        className: "size-4"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 295,
                        columnNumber: 112
                    }, this),
                    sending ? 'Sending your design…' : 'Book my free consultation'
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 289,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-center text-[12.5px] text-[#6d675d]",
                children: "Free and no obligation. We’ll call you within one business day."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 298,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
        lineNumber: 186,
        columnNumber: 5
    }, this);
}
_s(ConfiguratorBooking, "cywk+vY7kzvkkVa4btvSu536mx0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = ConfiguratorBooking;
function FieldError({ id, children, className = '' }) {
    if (!children) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        id: id,
        className: `mt-1.5 text-[12.5px] font-medium leading-[18px] text-[#b42318] ${className}`,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
        lineNumber: 306,
        columnNumber: 5
    }, this);
}
_c1 = FieldError;
/**
 * After a saved lead: thanks, the booking (the HomeQuote calendar's times; or the external
 * calendar, inline on our own page and a button in the iframe), and the phone.
 */ function BookingDone({ done, contractor, embedded, headingRef }) {
    _s1();
    const [host, setHost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingDone.useEffect": ()=>setHost(window.location.hostname)
    }["BookingDone.useEffect"], []);
    const ticket = done.qualified ? done.bookingTicket : undefined;
    const link = done.qualified && !ticket ? done.calendarUrl : undefined;
    const frame = !embedded && link && host ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calendarFrameUrl"])(link, host) : null;
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-booking-done": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-white",
                        "aria-hidden": "true",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                            className: "size-4",
                            strokeWidth: 2.6
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                            lineNumber: 337,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 336,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                ref: headingRef,
                                tabIndex: -1,
                                className: "scroll-mt-24 text-[19px] font-semibold leading-tight text-[#111] outline-none",
                                children: [
                                    done.firstName ? `Thanks, ${done.firstName}.` : 'Thank you.',
                                    " Your design is with ",
                                    contractor.contractorName,
                                    "."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 340,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1.5 text-[14.5px] leading-[22px] text-[#4a463f]",
                                children: [
                                    "We’ll call you within one business day",
                                    ticket ? ', or pick a time for a free 30-minute call now.' : link ? ', or pick a time for your free on-site consultation now.' : ' to talk through your design and next steps.'
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 343,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 339,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 335,
                columnNumber: 7
            }, this),
            ticket ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5",
                "data-booking-native": "",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingFlow"], {
                    grant: ticket,
                    heading: "Book your free call",
                    headingLevel: 3
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                    lineNumber: 352,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 351,
                columnNumber: 9
            }, this) : link ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5",
                children: [
                    frame ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-hidden rounded-xl border border-[#e4e0d8] bg-white",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                            title: `Book a free consultation with ${contractor.contractorName}`,
                            src: frame,
                            className: "block h-[680px] w-full",
                            referrerPolicy: "strict-origin-when-cross-origin",
                            loading: "lazy"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                            lineNumber: 358,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 357,
                        columnNumber: 13
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: link,
                        target: "_blank",
                        rel: "noopener",
                        className: `inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl px-6 text-[16px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none ${frame ? 'mt-3 border border-[#d9d4ca] bg-white text-[#111] hover:bg-[#f5f3ef]' : 'bg-[var(--cfg-accent)] text-white hover:bg-[var(--cfg-accent-hover)]'}`,
                        children: [
                            frame ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                "aria-hidden": "true",
                                className: "size-4"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 377,
                                columnNumber: 22
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__["CalendarDays"], {
                                "aria-hidden": "true",
                                className: "size-4"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 377,
                                columnNumber: 79
                            }, this),
                            frame ? 'Open the calendar in a new tab' : 'Pick a time'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 367,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 355,
                columnNumber: 9
            }, this) : null,
            tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-4 text-[13.5px] text-[#4a463f]",
                children: [
                    "Rather talk now?",
                    ' ',
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: tel,
                        className: "inline-flex items-center gap-1 font-medium text-[#111] underline underline-offset-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                "aria-hidden": "true",
                                className: "size-3.5"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 387,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "tabular-nums",
                                children: contractor.phone
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                                lineNumber: 388,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                        lineNumber: 386,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
                lineNumber: 384,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/booking-form.tsx",
        lineNumber: 334,
        columnNumber: 5
    }, this);
}
_s1(BookingDone, "3jQ5s649gL97MFLh66PbFYA2Jbc=");
_c2 = BookingDone;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "ConfiguratorBooking");
__turbopack_context__.k.register(_c1, "FieldError");
__turbopack_context__.k.register(_c2, "BookingDone");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/result/result-page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConfiguratorResultPage",
    ()=>ConfiguratorResultPage,
    "ProjectsStrip",
    ()=>ProjectsStrip
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
/* eslint-disable @next/next/no-img-element -- the same pre-rendered files as the stage, already in the browser cache */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$cost$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/cost.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/booking-form.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/booking-state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
const card = 'rounded-2xl border border-[#e4e0d8] bg-white';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]';
function ConfiguratorResultPage(props) {
    _s();
    const { contractor, template, spec, selection, breakdown, photos, designUrl, onBack, photoNote, projects } = props;
    const model = spec.models.find((m)=>m.id === selection.model);
    const highlights = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ConfiguratorResultPage.useMemo[highlights]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["designHighlights"])(spec, selection)
    }["ConfiguratorResultPage.useMemo[highlights]"], [
        spec,
        selection
    ]);
    const gallery = (projects?.length ? projects : contractor.gallery ?? []).filter((g)=>g.src);
    const examplePrices = !template.pricesConfirmed;
    const [sent, setSent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Picks no photo shows (priced only), named under the gallery so the photos never seem to drop them.
    const picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, selection);
    const unpictured = spec.groups.flatMap((g)=>g.rows).filter((r)=>picked.has(r.id) && (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notPictured"])(spec, r.id));
    const upgradeCount = breakdown.upgrades.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "es-cfg-rise mx-auto w-full max-w-[760px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10",
        "data-configurator-result": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onBack,
                className: `rounded text-[13px] font-medium text-[#4a463f] underline underline-offset-4 hover:text-[#111] ${focusRing}`,
                children: "← Back to edit"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ResultGallery, {
                photos: photos,
                note: `${photoNote} Each view shows the picks it can${unpictured.length ? `. Priced, not pictured: ${listOf(unpictured.map((r)=>r.label.toLowerCase()))}` : ''}.`
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f5a52]",
                children: [
                    "Your ",
                    contractor.contractorName,
                    " design"
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                id: "cfg-result-title",
                tabIndex: -1,
                className: "mt-1.5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-[#111] outline-none sm:text-[44px]",
                children: "Here’s your pool."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            model ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2.5 text-pretty text-[15.5px] leading-[23px] text-[#4a463f]",
                children: [
                    "The ",
                    model.name,
                    " (",
                    model.dimensions,
                    ")",
                    breakdown.luxe ? ` with ${breakdown.luxe.label}` : '',
                    upgradeCount ? `${breakdown.luxe ? ' and' : ' with'} ${upgradeCount} upgrade${upgradeCount === 1 ? '' : 's'}` : '',
                    ". Ballpark",
                    ' ',
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "whitespace-nowrap font-semibold tabular-nums text-[#111]",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(breakdown.total)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this),
                    examplePrices ? ' (example prices)' : '',
                    ", firm price at your free site visit."
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 60,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "cfg-design",
                className: `${card} mt-6 p-5 sm:p-6`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-baseline justify-between gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                id: "cfg-design",
                                className: "text-[17px] font-semibold text-[#111]",
                                children: "Your design"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: onBack,
                                className: `rounded text-[13px] font-medium text-[#111] underline underline-offset-4 ${focusRing}`,
                                children: "Change"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                        className: "mt-3 divide-y divide-[#efece6] text-[14px]",
                        children: [
                            model ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DesignRow, {
                                term: "Size",
                                value: `${model.name} · ${model.dimensions}`
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 80,
                                columnNumber: 20
                            }, this) : null,
                            highlights.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DesignRow, {
                                    term: h.group,
                                    value: h.items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "inline-flex items-center gap-1.5",
                                            children: [
                                                item.label,
                                                item.luxe ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 rounded-full bg-[#111] px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                            "aria-hidden": "true",
                                                            className: "size-2.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                                            lineNumber: 90,
                                                            columnNumber: 23
                                                        }, void 0),
                                                        "Luxe"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                                    lineNumber: 89,
                                                    columnNumber: 21
                                                }, void 0) : item.included ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[12px] text-[#5f5a52]",
                                                    children: "Included"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                                    lineNumber: 94,
                                                    columnNumber: 21
                                                }, void 0) : null
                                            ]
                                        }, item.label, true, {
                                            fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                            lineNumber: 86,
                                            columnNumber: 17
                                        }, void 0))
                                }, h.group, false, {
                                    fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                    lineNumber: 82,
                                    columnNumber: 13
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-[#111] pt-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[17px] font-semibold text-[#111]",
                                children: "Total estimate*"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 102,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "whitespace-nowrap text-right text-[22px] font-semibold tabular-nums tracking-[-0.01em] text-[#111] sm:text-[26px]",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moneyRange"])(breakdown.total)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 103,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2.5 flex flex-wrap items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded-full bg-[#f5f3ef] px-2.5 py-0.5 text-[12px] font-medium text-[#111]",
                                children: "Ballpark, not a quote"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this),
                            examplePrices ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded-full border border-[#d9d4ca] px-2.5 py-0.5 text-[12px] text-[#5f5a52]",
                                children: "Example prices"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 107,
                                columnNumber: 28
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2.5 text-pretty text-[12.5px] leading-[19px] text-[#5f5a52]",
                        children: [
                            "*",
                            examplePrices ? `Example prices, not yet confirmed by ${contractor.contractorName}. ` : '',
                            "Excludes site-specific work (access, soil, permits) and permit fees. Your firm, all-in price is confirmed at your free on-site visit."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
                        className: "group mt-3 border-t border-[#efece6] pt-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                                className: `inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-medium text-[#111] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden ${focusRing}`,
                                children: [
                                    "See the cost breakdown",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        "aria-hidden": "true",
                                        className: "size-3.5 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                        lineNumber: 118,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 114,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$cost$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BreakdownLines"], {
                                    breakdown: breakdown,
                                    siteNote: "Confirmed at your free on-site visit"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SaveDesign, {
                        url: designUrl
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                id: "cfg-book",
                "aria-labelledby": "cfg-next",
                className: `${card} mt-4 scroll-mt-24 p-5 sm:p-7`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cfg-accent)]",
                        children: "Next step"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "cfg-next",
                        className: "mt-1 text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[#111]",
                        children: "Book your free on-site consultation"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-pretty text-[14.5px] leading-[22px] text-[#4a463f]",
                        children: "We’ll measure, confirm materials and give you a firm price. No obligation. You pick a time right after sending this."
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, this),
                    contractor.facts?.length || contractor.licenseLabel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#3d3a34]",
                        children: [
                            ...contractor.facts ?? [],
                            contractor.licenseLabel
                        ].filter(Boolean).map((fact)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "inline-flex items-center gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                        "aria-hidden": "true",
                                        className: "size-3.5 text-[var(--cfg-accent)]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                        lineNumber: 140,
                                        columnNumber: 17
                                    }, this),
                                    fact
                                ]
                            }, fact, true, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 139,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                        className: "mt-4 grid gap-2 text-[13px] text-[#4a463f] sm:grid-cols-3",
                        children: [
                            'Send your design',
                            'Pick a time',
                            'Get your firm price on site'
                        ].map((step, i)=>{
                            const done = sent && i === 0;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex items-center gap-2 rounded-xl bg-[#f5f3ef] px-3 py-2.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums text-white ${done ? 'bg-[var(--cfg-accent)]' : 'bg-[#111]'}`,
                                        children: done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                            "aria-hidden": "true",
                                            className: "size-3",
                                            strokeWidth: 3
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                            lineNumber: 154,
                                            columnNumber: 27
                                        }, this) : i + 1
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                        lineNumber: 151,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: done ? 'line-through decoration-[#8f897e]' : undefined,
                                        children: step
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                        lineNumber: 156,
                                        columnNumber: 17
                                    }, this),
                                    done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sr-only",
                                        children: " (done)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                        lineNumber: 157,
                                        columnNumber: 25
                                    }, this) : null
                                ]
                            }, step, true, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 150,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 146,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConfiguratorBooking"], {
                            ...props,
                            onSent: ()=>setSent(true)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                            lineNumber: 163,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            contractor.financingDisclosure || contractor.financingNote ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "cfg-finance",
                className: `${card} mt-4 p-5 sm:p-6`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "cfg-finance",
                        className: "text-[16px] font-semibold text-[#111]",
                        children: "Financing available through third-party lenders"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 169,
                        columnNumber: 11
                    }, this),
                    contractor.financingNote ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1.5 text-pretty text-[14px] leading-[21px] text-[#4a463f]",
                        children: contractor.financingNote
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 172,
                        columnNumber: 39
                    }, this) : null,
                    contractor.financingDisclosure ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-pretty text-[12px] leading-[18px] text-[#6d675d]",
                        children: contractor.financingDisclosure
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 173,
                        columnNumber: 45
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 168,
                columnNumber: 9
            }, this) : null,
            gallery.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectsStrip, {
                gallery: gallery,
                title: `Recent ${contractor.contractorName} projects`
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 177,
                columnNumber: 25
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
_s(ConfiguratorResultPage, "rTCzR6OHD4lEhF/KM9aM7mC64iQ=");
_c = ConfiguratorResultPage;
/** "a, b and c". */ function listOf(items) {
    return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
function DesignRow({ term, value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                className: "shrink-0 text-[13px] text-[#6d675d]",
                children: term
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                className: "flex flex-wrap gap-x-3 gap-y-1 font-medium text-[#111] sm:justify-end sm:text-right",
                children: value
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 191,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
        lineNumber: 189,
        columnNumber: 5
    }, this);
}
_c1 = DesignRow;
/** The design in every view: one big photo, the views as thumbnails under it. */ function ResultGallery({ photos, note }) {
    _s1();
    const [shown, setShown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [broken, setBroken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const photo = photos[shown] ?? photos[0];
    const srcOf = (p)=>broken[p.key] ? p.fallback : p.src;
    if (!photo) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
        className: "mt-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#e9e6df] shadow-[0_1px_2px_rgba(17,17,17,0.06)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: srcOf(photo),
                        srcSet: broken[photo.key] ? undefined : photo.srcSet,
                        sizes: photo.srcSet ? '(min-width: 800px) 760px, 100vw' : undefined,
                        alt: photo.alt,
                        onError: ()=>setBroken((b)=>({
                                    ...b,
                                    [photo.key]: true
                                })),
                        className: "es-cfg-fade absolute inset-0 h-full w-full object-cover"
                    }, srcOf(photo), false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-[#111] backdrop-blur-sm",
                        children: photo.label
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 205,
                columnNumber: 7
            }, this),
            photos.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "group",
                "aria-label": "Views of your design",
                className: "mt-2.5 flex gap-2",
                children: photos.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-pressed": i === shown,
                        "aria-label": `${p.label} view`,
                        onClick: ()=>setShown(i),
                        className: `relative h-14 w-20 overflow-hidden rounded-lg border-2 transition-opacity duration-150 motion-reduce:transition-none sm:h-16 sm:w-24 ${focusRing} ${i === shown ? 'border-[#111]' : 'border-transparent opacity-75 hover:opacity-100'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: srcOf(p),
                            alt: "",
                            loading: "lazy",
                            className: "absolute inset-0 h-full w-full object-cover"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                            lineNumber: 230,
                            columnNumber: 15
                        }, this)
                    }, p.view, false, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 220,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 218,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                className: "mt-2 text-[12px] text-[#6d675d]",
                children: note
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 235,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
        lineNumber: 204,
        columnNumber: 5
    }, this);
}
_s1(ResultGallery, "xodTi0BhZS5C3XSEme9XhikbogM=");
_c2 = ResultGallery;
function SaveDesign({ url }) {
    _s2();
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    if (!url) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: ()=>{
            void navigator.clipboard?.writeText(url).then(()=>{
                setCopied(true);
                window.setTimeout(()=>setCopied(false), 2000);
            }, ()=>undefined);
        },
        className: `mt-4 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-[#111] underline underline-offset-4 ${focusRing}`,
        children: [
            copied ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                "aria-hidden": "true",
                className: "size-3.5"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 257,
                columnNumber: 17
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                "aria-hidden": "true",
                className: "size-3.5"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 257,
                columnNumber: 69
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-live": "polite",
                children: copied ? 'Link copied' : 'Copy a link to this design'
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 258,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
        lineNumber: 244,
        columnNumber: 5
    }, this);
}
_s2(SaveDesign, "NE86rL3vg4NVcTTWDavsT0hUBJs=");
_c3 = SaveDesign;
function ProjectsStrip({ gallery, title }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-labelledby": "cfg-projects",
        className: "mt-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                id: "cfg-projects",
                className: "text-[16px] font-semibold text-[#111]",
                children: title
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 267,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[12.5px] text-[#6d675d]",
                children: "Real photos of finished jobs."
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 270,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "es-cfg-strip -mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2",
                children: gallery.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "w-[168px] shrink-0 snap-start sm:w-[200px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e6df]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: g.thumb ?? g.src,
                                    alt: g.alt,
                                    loading: "lazy",
                                    decoding: "async",
                                    className: "absolute inset-0 h-full w-full object-cover"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                    lineNumber: 275,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 274,
                                columnNumber: 13
                            }, this),
                            g.caption ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1.5 text-[12px] leading-4 text-[#5f5a52]",
                                children: g.caption
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                                lineNumber: 277,
                                columnNumber: 26
                            }, this) : null
                        ]
                    }, g.src, true, {
                        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                        lineNumber: 273,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
                lineNumber: 271,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/result/result-page.tsx",
        lineNumber: 266,
        columnNumber: 5
    }, this);
}
_c4 = ProjectsStrip;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "ConfiguratorResultPage");
__turbopack_context__.k.register(_c1, "DesignRow");
__turbopack_context__.k.register(_c2, "ResultGallery");
__turbopack_context__.k.register(_c3, "SaveDesign");
__turbopack_context__.k.register(_c4, "ProjectsStrip");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/configurator/configurator.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Configurator",
    ()=>Configurator,
    "ConfiguratorHeader",
    ()=>ConfiguratorHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$cost$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/cost.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$options$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/options.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photo$2d$stage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/photo-stage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/photos.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$result$2d$page$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/result-page.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/state.ts [app-client] (ecmascript)");
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
const CAPTION = 'Example design · AI-assisted';
function Configurator({ spec, template, contractor, manifest = null, embedded = false, initialSelection, initialStep = 'design' }) {
    _s();
    const [selection, setSelection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "Configurator.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, initialSelection ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultSelection"])(spec))
    }["Configurator.useState"]);
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialStep);
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(spec.views[0].id);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [barOpen, setBarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Phones: the photo shrinks to a strip once the options are scrolled, and opens again for a pick it shows.
    // `pinned` is the homeowner's own choice from the chevron (wins over the automatic size).
    const [scrolled, setScrolled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [peek, setPeek] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [pinned, setPinned] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [href, setHref] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const toastSeq = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const restored = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(Boolean(initialSelection));
    // A saved design is decoded after the first paint: skip the one URL write that would show the default design.
    const skipSync = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    /* ---------------- URL <-> state ---------------- */ // Load a saved design and step from the address bar once (client only, so the server markup stays the default design).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Configurator.useEffect": ()=>{
            if (!restored.current && (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasSavedDesign"])(window.location.search)) {
                skipSync.current = true;
                setSelection((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decodeSelection"])(spec, window.location.search));
            }
            restored.current = true;
            const fromHash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepFromHash"])(window.location.hash);
            if (fromHash !== 'design') setStep(fromHash);
            const onPop = {
                "Configurator.useEffect.onPop": ()=>setStep((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepFromHash"])(window.location.hash))
            }["Configurator.useEffect.onPop"];
            window.addEventListener('popstate', onPop);
            return ({
                "Configurator.useEffect": ()=>window.removeEventListener('popstate', onPop)
            })["Configurator.useEffect"];
        }
    }["Configurator.useEffect"], [
        spec
    ]);
    // Every change rewrites the query string in place: the address bar is "Save your design".
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Configurator.useEffect": ()=>{
            if (!restored.current) return;
            if (skipSync.current) {
                skipSync.current = false;
                return;
            }
            const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["designUrl"])(spec, window.location.href, selection);
            if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, '', next);
            setHref(new URL(next, window.location.origin).toString());
        }
    }["Configurator.useEffect"], [
        spec,
        selection
    ]);
    const go = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Configurator.useCallback[go]": (next)=>{
            setStep(next);
            setBarOpen(false);
            const hash = next === 'design' ? '' : `#${next}`;
            const url = `${window.location.pathname}${window.location.search}${hash}`;
            if (next === 'design') window.history.replaceState(window.history.state, '', url);
            else window.history.pushState(window.history.state, '', url);
            // New content at the top, focus on its heading (keyboard and screen-reader users land where the page changed).
            window.requestAnimationFrame({
                "Configurator.useCallback[go]": ()=>{
                    window.scrollTo({
                        top: 0
                    });
                    const target = next === 'summary' ? 'cfg-summary-title' : next === 'book' ? 'cfg-result-title' : 'cfg-title';
                    document.getElementById(target)?.focus({
                        preventScroll: true
                    });
                }
            }["Configurator.useCallback[go]"]);
        }
    }["Configurator.useCallback[go]"], []);
    /* ---------------- Actions ---------------- */ // The latest selection, so a click computes its toast from what is on screen (not inside a state updater).
    const current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(selection);
    current.current = selection;
    const currentView = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(view);
    currentView.current = view;
    const act = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Configurator.useCallback[act]": (action)=>{
            const before = current.current;
            const after = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["reduceSelection"])(spec, before, action);
            current.current = after;
            setSelection(after);
            const text = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toastFor"])(spec, before, after, action);
            if (text) setToast({
                id: ++toastSeq.current,
                text
            });
            const nextView = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewAfter"])(spec, action, currentView.current) ?? currentView.current;
            if (nextView !== currentView.current) setView(nextView);
            // The photo changed: let it open up for a moment on phones.
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, nextView, after) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, currentView.current, before) || action.type === 'model') setPeek({
                "Configurator.useCallback[act]": (n)=>n + 1
            }["Configurator.useCallback[act]"]);
        }
    }["Configurator.useCallback[act]"], [
        spec
    ]);
    // Phones: the photo shrinks once the options are scrolled (fixed box: nothing below moves).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Configurator.useEffect": ()=>{
            const onScroll = {
                "Configurator.useEffect.onScroll": ()=>setScrolled(window.scrollY > 48)
            }["Configurator.useEffect.onScroll"];
            onScroll();
            window.addEventListener('scroll', onScroll, {
                passive: true
            });
            return ({
                "Configurator.useEffect": ()=>window.removeEventListener('scroll', onScroll)
            })["Configurator.useEffect"];
        }
    }["Configurator.useEffect"], []);
    const [peeking, setPeeking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Configurator.useEffect": ()=>{
            if (!peek) return;
            setPeeking(true);
            const t = window.setTimeout({
                "Configurator.useEffect.t": ()=>setPeeking(false)
            }["Configurator.useEffect.t"], 1800);
            return ({
                "Configurator.useEffect": ()=>window.clearTimeout(t)
            })["Configurator.useEffect"];
        }
    }["Configurator.useEffect"], [
        peek
    ]);
    const collapsed = barOpen ? true : pinned ?? (scrolled && !peeking);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Configurator.useEffect": ()=>{
            if (!toast) return;
            const t = window.setTimeout({
                "Configurator.useEffect.t": ()=>setToast({
                        "Configurator.useEffect.t": (cur)=>cur?.id === toast.id ? null : cur
                    }["Configurator.useEffect.t"])
            }["Configurator.useEffect.t"], 2000);
            return ({
                "Configurator.useEffect": ()=>window.clearTimeout(t)
            })["Configurator.useEffect"];
        }
    }["Configurator.useEffect"], [
        toast
    ]);
    /* ---------------- Prices ---------------- */ const breakdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[breakdown]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["costBreakdown"])(spec, template, selection)
    }["Configurator.useMemo[breakdown]"], [
        spec,
        template,
        selection
    ]);
    const modelTotals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[modelTotals]": ()=>Object.fromEntries(spec.models.map({
                "Configurator.useMemo[modelTotals]": (m)=>[
                        m.id,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimateSelection"])(spec, template, {
                            ...selection,
                            model: m.id
                        }).total
                    ]
            }["Configurator.useMemo[modelTotals]"]))
    }["Configurator.useMemo[modelTotals]"], [
        spec,
        template,
        selection
    ]);
    const luxeQuote = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[luxeQuote]": ()=>spec.bundle ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bundleQuote"])(spec, template, selection.model) : null
    }["Configurator.useMemo[luxeQuote]"], [
        spec,
        template,
        selection.model
    ]);
    const groupRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[groupRows]": ()=>{
            const picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, selection);
            return spec.groups.map({
                "Configurator.useMemo[groupRows]": (g)=>({
                        group: g,
                        rows: g.rows.map({
                            "Configurator.useMemo[groupRows]": (r)=>{
                                const locked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isLockedByBundle"])(spec, selection, r.id);
                                const checked = picked.has(r.id);
                                let price;
                                if (locked && checked) price = 'Luxe selected';
                                else if (r.included) price = 'Included';
                                else {
                                    const d = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rowDelta"])(spec, template, selection, r.id);
                                    price = d.low === 0 && d.high === 0 ? 'Included' : (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deltaLabel"])(d);
                                }
                                return {
                                    id: r.id,
                                    label: r.label,
                                    note: r.note,
                                    checked,
                                    locked,
                                    price,
                                    included: Boolean(r.included),
                                    notPictured: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notPictured"])(spec, r.id)
                                };
                            }
                        }["Configurator.useMemo[groupRows]"])
                    })
            }["Configurator.useMemo[groupRows]"]);
        }
    }["Configurator.useMemo[groupRows]"], [
        spec,
        template,
        selection
    ]);
    /* ---------------- Photos ---------------- */ const photo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[photo]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stagePhoto"])(spec, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, view, selection), manifest)
    }["Configurator.useMemo[photo]"], [
        spec,
        view,
        selection,
        manifest
    ]);
    const photos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[photos]": ()=>{
            const all = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentPhotos"])(spec, selection, manifest);
            const i = all.findIndex({
                "Configurator.useMemo[photos].i": (p)=>p.view === view
            }["Configurator.useMemo[photos].i"]);
            return i > 0 ? [
                all[i],
                ...all.slice(0, i),
                ...all.slice(i + 1)
            ] : all;
        }
    }["Configurator.useMemo[photos]"], [
        spec,
        selection,
        manifest,
        view
    ]);
    // Right away: the other views as they are now. When idle: this view one click away (each visual row flipped, Go Luxe).
    const nextPhotos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[nextPhotos]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentPhotos"])(spec, selection, manifest)
    }["Configurator.useMemo[nextPhotos]"], [
        spec,
        selection,
        manifest
    ]);
    const idlePhotos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Configurator.useMemo[idlePhotos]": ()=>{
            const out = [];
            const visual = new Set(spec.views.find({
                "Configurator.useMemo[idlePhotos]": (v)=>v.id === view
            }["Configurator.useMemo[idlePhotos]"])?.dimensions.flatMap({
                "Configurator.useMemo[idlePhotos]": (d)=>d.options.flatMap({
                        "Configurator.useMemo[idlePhotos]": (o)=>[
                                ...o.rows,
                                ...o.allOf ?? []
                            ]
                    }["Configurator.useMemo[idlePhotos]"])
            }["Configurator.useMemo[idlePhotos]"]) ?? []);
            for (const rowId of visual)out.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stagePhoto"])(spec, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, view, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["reduceSelection"])(spec, selection, {
                type: 'row',
                rowId
            })), manifest));
            if (spec.bundle) out.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stagePhoto"])(spec, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(spec, view, {
                ...selection,
                luxe: !selection.luxe
            }), manifest));
            const seen = new Set();
            return out.filter({
                "Configurator.useMemo[idlePhotos]": (p)=>seen.has(p.src) ? false : (seen.add(p.src), true)
            }["Configurator.useMemo[idlePhotos]"]);
        }
    }["Configurator.useMemo[idlePhotos]"], [
        spec,
        selection,
        manifest,
        view
    ]);
    const model = spec.models.find((m)=>m.id === selection.model);
    /* ---------------- Render ---------------- */ const examplePrices = !template.pricesConfirmed;
    // Real finished jobs (never AI): the spec's list, else the contractor's gallery.
    const projects = spec.projects?.length ? spec.projects : contractor.gallery ?? [];
    // The embed layout already wraps the page in <main id="main">.
    const Main = embedded ? 'div' : 'main';
    if (step === 'book') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "es-cfg flex min-h-[100dvh] flex-1 flex-col",
            "data-estimator-done": "",
            children: [
                embedded ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ConfiguratorHeader, {
                    contractor: contractor
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 234,
                    columnNumber: 28
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Main, {
                    id: embedded ? undefined : 'main',
                    className: "flex-1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$result$2d$page$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConfiguratorResultPage"], {
                        slug: contractor.slug,
                        contractor: contractor,
                        template: template,
                        spec: spec,
                        selection: selection,
                        answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectionToAnswers"])(spec, selection),
                        breakdown: breakdown,
                        photos: photos,
                        designUrl: href,
                        embedded: embedded,
                        photoNote: spec.photoNote,
                        projects: projects,
                        onBack: ()=>go('design')
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/configurator.tsx",
                        lineNumber: 236,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 235,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FinePrint, {
                    contractor: contractor,
                    examplePrices: examplePrices
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 252,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/configurator/configurator.tsx",
            lineNumber: 233,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `es-cfg flex min-h-[100dvh] flex-1 flex-col ${embedded ? 'es-cfg-embedded' : ''}`,
        children: [
            embedded ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ConfiguratorHeader, {
                contractor: contractor
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                lineNumber: 259,
                columnNumber: 26
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Main, {
                id: embedded ? undefined : 'main',
                className: "flex flex-1 flex-col lg:flex-row",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `es-cfg-photo fixed inset-x-0 ${embedded ? 'top-0' : 'top-14'} z-20 transition-[height] duration-300 ease-out motion-reduce:transition-none ${collapsed ? 'h-[20vh]' : 'h-[32vh]'} lg:sticky lg:inset-x-auto lg:z-auto lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:transition-none ${embedded ? 'lg:h-[100dvh]' : 'lg:top-16 lg:h-[calc(100dvh-4rem)]'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative h-full lg:min-h-0 lg:flex-1",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photo$2d$stage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PhotoStage"], {
                                    spec: spec,
                                    view: view,
                                    onView: setView,
                                    photo: photo,
                                    next: nextPhotos,
                                    idle: idlePhotos,
                                    toast: toast,
                                    caption: CAPTION,
                                    model: model,
                                    models: spec.models,
                                    collapsed: collapsed,
                                    onCollapsed: (c)=>setPinned(c)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                    lineNumber: 274,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                lineNumber: 273,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ViewStrip, {
                                photos: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentPhotos"])(spec, selection, manifest),
                                view: view,
                                onView: setView
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                lineNumber: 289,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/configurator/configurator.tsx",
                        lineNumber: 266,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        "aria-hidden": "true",
                        className: "h-[32vh] shrink-0 lg:hidden"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/configurator.tsx",
                        lineNumber: 291,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex w-full flex-col border-[#e4e0d8] bg-[var(--cfg-sand)] lg:w-[440px] lg:shrink-0 lg:border-l xl:w-[480px]",
                        children: step === 'summary' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$cost$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CostSummary"], {
                                breakdown: breakdown,
                                examplePrices: examplePrices,
                                contractorName: contractor.contractorName,
                                onContinue: ()=>go('book'),
                                onBack: ()=>go('design')
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                lineNumber: 297,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 296,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 space-y-3 px-4 pb-8 pt-4 sm:px-6 lg:pt-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                            className: "pb-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                    id: "cfg-title",
                                                    tabIndex: -1,
                                                    className: "text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[#111] outline-none sm:text-[32px]",
                                                    children: spec.title
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                    lineNumber: 303,
                                                    columnNumber: 19
                                                }, this),
                                                spec.intro ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1.5 hidden text-pretty text-[15px] leading-[22px] text-[#4a463f] sm:block",
                                                    children: spec.intro
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                    lineNumber: 306,
                                                    columnNumber: 33
                                                }, this) : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-[#5f5a52]",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-medium text-[#111]",
                                                            children: "Remodel pricing"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                            lineNumber: 308,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            "aria-hidden": "true",
                                                            children: "·"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                            lineNumber: 309,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-medium text-[#111]",
                                                            children: "Ballpark, not a quote"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                            lineNumber: 310,
                                                            columnNumber: 21
                                                        }, this),
                                                        examplePrices ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "rounded-full border border-[#d9d4ca] bg-white px-2.5 py-0.5",
                                                            children: "Example prices"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                            lineNumber: 311,
                                                            columnNumber: 38
                                                        }, this) : null
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                    lineNumber: 307,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                            lineNumber: 302,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$options$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ModelPicker"], {
                                                models: spec.models,
                                                value: selection.model,
                                                totals: modelTotals,
                                                onChange: (model)=>act({
                                                        type: 'model',
                                                        model
                                                    })
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                lineNumber: 316,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                            lineNumber: 315,
                                            columnNumber: 17
                                        }, this),
                                        spec.bundle && luxeQuote ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$options$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LuxeCard"], {
                                            bundle: spec.bundle,
                                            quote: luxeQuote,
                                            on: selection.luxe,
                                            examplePrices: examplePrices,
                                            onChange: (on)=>act({
                                                    type: 'luxe',
                                                    on
                                                })
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                            lineNumber: 320,
                                            columnNumber: 19
                                        }, this) : null,
                                        groupRows.map(({ group, rows })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$options$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OptionGroupCard"], {
                                                group: group,
                                                rows: rows,
                                                onRow: (rowId, on)=>act({
                                                        type: 'row',
                                                        rowId,
                                                        on
                                                    })
                                            }, group.id, false, {
                                                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                                lineNumber: 324,
                                                columnNumber: 19
                                            }, this)),
                                        projects.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProjectStrip"], {
                                            gallery: projects,
                                            title: `Recent ${contractor.contractorName} projects`,
                                            className: "pt-6"
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                            lineNumber: 328,
                                            columnNumber: 19
                                        }, this) : null
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                    lineNumber: 301,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$cost$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TotalBar"], {
                                    breakdown: breakdown,
                                    open: barOpen,
                                    onOpen: setBarOpen,
                                    onContinue: ()=>go('summary'),
                                    continueLabel: "Review my design",
                                    examplePrices: examplePrices
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                    lineNumber: 331,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/configurator.tsx",
                        lineNumber: 294,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                lineNumber: 260,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FinePrint, {
                contractor: contractor,
                examplePrices: examplePrices,
                photoNote: spec.photoNote
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                lineNumber: 343,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/configurator.tsx",
        lineNumber: 258,
        columnNumber: 5
    }, this);
}
_s(Configurator, "SJajRgn1OSIZXG4HykT+94QuMTk=");
_c = Configurator;
/** Desktop: the design in every view, small, under the photo (one click to switch). */ function ViewStrip({ photos, view, onView }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "hidden shrink-0 items-center gap-3 border-t border-[#e4e0d8] bg-white px-5 py-3 lg:flex",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mr-1 w-[118px] shrink-0 text-[12px] leading-4 text-[#5f5a52]",
                children: "Your design from every angle"
            }, void 0, false, {
                fileName: "[project]/components/estimator/configurator/configurator.tsx",
                lineNumber: 352,
                columnNumber: 7
            }, this),
            photos.map((p)=>{
                const active = p.view === view;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: ()=>onView(p.view),
                    "aria-label": `${p.label} view`,
                    "aria-pressed": active,
                    className: `group/thumb relative h-[68px] w-[102px] shrink-0 overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none ${active ? 'border-[#111]' : 'border-transparent opacity-80 hover:opacity-100'}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: p.srcSet ? p.src.replace(/\.webp$/, '-sm.webp') : p.src,
                            alt: "",
                            loading: "lazy",
                            decoding: "async",
                            className: "absolute inset-0 h-full w-full object-cover"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 367,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-medium text-[#111]",
                            children: p.label
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 368,
                            columnNumber: 13
                        }, this)
                    ]
                }, p.view, true, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 356,
                    columnNumber: 11
                }, this);
            })
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/configurator/configurator.tsx",
        lineNumber: 351,
        columnNumber: 5
    }, this);
}
_c1 = ViewStrip;
function ConfiguratorHeader({ contractor }) {
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "sticky top-0 z-40 border-b border-[#e4e0d8] bg-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-14 items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:h-16 lg:px-8",
            children: [
                contractor.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "relative block h-8 w-[76px] shrink-0 lg:h-10 lg:w-[95px]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        src: contractor.logoUrl,
                        alt: contractor.contractorName,
                        fill: true,
                        sizes: "95px",
                        className: "object-contain object-left",
                        priority: true
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/configurator/configurator.tsx",
                        lineNumber: 388,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 387,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[16px] font-semibold tracking-tight text-[#111]",
                    children: contractor.contractorName
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 391,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "hidden h-6 w-px bg-[#e4e0d8] sm:block",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 393,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "hidden text-[13px] text-[#5f5a52] sm:block",
                    children: "Pool design studio"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 394,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "ml-auto whitespace-nowrap text-[11.5px] tabular-nums text-[#6d675d] sm:text-[12.5px]",
                    children: contractor.licenseLabel
                }, void 0, false, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 395,
                    columnNumber: 9
                }, this),
                tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    href: tel,
                    "aria-label": `Call ${contractor.contractorName} at ${contractor.phone}`,
                    className: "inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-full border border-[#d9d4ca] px-3 text-[13px] font-medium text-[#111] transition-colors duration-150 hover:bg-[#f5f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] motion-reduce:transition-none sm:px-3.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                            "aria-hidden": "true",
                            className: "size-3.5",
                            strokeWidth: 2.2
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 402,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden tabular-nums sm:inline",
                            children: contractor.phone
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 403,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sm:hidden",
                            children: "Call"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 404,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 397,
                    columnNumber: 11
                }, this) : null
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/configurator/configurator.tsx",
            lineNumber: 385,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/configurator/configurator.tsx",
        lineNumber: 384,
        columnNumber: 5
    }, this);
}
_c2 = ConfiguratorHeader;
function FinePrint({ contractor, examplePrices, photoNote }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "border-t border-[#e4e0d8] bg-white text-[12px] leading-[18px] text-[#6d675d]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-3xl space-y-1",
                    children: [
                        photoNote ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: photoNote
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 425,
                            columnNumber: 24
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                "Prices are a ballpark, not a quote",
                                examplePrices ? `, and are example prices not yet confirmed by ${contractor.contractorName}` : '',
                                ". Site-specific work and your firm price are confirmed at the free on-site visit."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 426,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-medium text-[#4a463f]",
                                    children: contractor.contractorName
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                    lineNumber: 431,
                                    columnNumber: 13
                                }, this),
                                " ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "tabular-nums",
                                    children: [
                                        "(",
                                        contractor.licenseLabel,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                                    lineNumber: 431,
                                    columnNumber: 93
                                }, this),
                                contractor.serviceAreaLabel ? ` · Serving ${contractor.serviceAreaLabel}.` : ''
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 430,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 424,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex shrink-0 items-center gap-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/privacy",
                            className: "underline-offset-4 hover:text-[#111] hover:underline",
                            children: "Privacy"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 436,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/terms",
                            className: "underline-offset-4 hover:text-[#111] hover:underline",
                            children: "Terms"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 439,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Powered by Rendoly"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/configurator/configurator.tsx",
                            lineNumber: 442,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/configurator/configurator.tsx",
                    lineNumber: 435,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/configurator/configurator.tsx",
            lineNumber: 423,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/configurator/configurator.tsx",
        lineNumber: 422,
        columnNumber: 5
    }, this);
}
_c3 = FinePrint;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "Configurator");
__turbopack_context__.k.register(_c1, "ViewStrip");
__turbopack_context__.k.register(_c2, "ConfiguratorHeader");
__turbopack_context__.k.register(_c3, "FinePrint");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_estimator_configurator_e0c34f43._.js.map