(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/estimator/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Instant estimator: the shared contract.
 *
 * Every estimator file (engine, catalog, templates, screens, lead route,
 * contractor settings) builds on these types. Change them deliberately: a
 * change here ripples through all of lib/estimator, components/estimator and
 * app/api/estimator.
 *
 * Everything is plain JSON-shaped data so a template, and later each
 * contractor's saved copy, can be stored as JSON.
 */ __turbopack_context__.s([
    "CUSTOM_PACKAGE_ID",
    ()=>CUSTOM_PACKAGE_ID,
    "DEFAULT_LIMITS",
    ()=>DEFAULT_LIMITS,
    "POOL_SHAPES",
    ()=>POOL_SHAPES,
    "POOL_SIZES",
    ()=>POOL_SIZES
]);
const CUSTOM_PACKAGE_ID = 'custom';
const POOL_SHAPES = [
    'rectangle',
    'l_shape',
    'freeform',
    'unsure'
];
const POOL_SIZES = [
    'small',
    'medium',
    'large',
    'unsure'
];
const DEFAULT_LIMITS = {
    maxSingleOptions: 4,
    maxMultiOptions: 5
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/geometry.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "poolGeometry",
    ()=>poolGeometry,
    "sizeClassFor",
    ()=>sizeClassFor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
;
;
/** A finite number of at least 0, else 0. Keeps NaN/Infinity/negatives out of every product below. */ function nonNegative(n) {
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}
function within(n, min, max) {
    return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}
function poolGeometry(template, input) {
    const g = template.geometry;
    const answerFor = (role)=>{
        const q = template.questions.find((x)=>x.role === role);
        return q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, input.answers)[0] : undefined;
    };
    const shapeAnswer = answerFor('shape');
    const sizeAnswer = answerFor('size');
    const shape = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_SHAPES"].includes(shapeAnswer) ? shapeAnswer : 'unsure';
    const size = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_SIZES"].includes(sizeAnswer) ? sizeAnswer : 'unsure';
    const preset = g.sizes[size === 'unsure' ? 'medium' : size];
    const typed = input.dimensions;
    const useTyped = !!typed && within(typed.lengthFt, g.limits.minFt, g.limits.maxLengthFt) && within(typed.widthFt, g.limits.minFt, g.limits.maxWidthFt);
    const lengthFt = nonNegative(useTyped ? typed.lengthFt : preset?.lengthFt);
    const widthFt = nonNegative(useTyped ? typed.widthFt : preset?.widthFt);
    const avgDepthFt = nonNegative(useTyped && within(typed.avgDepthFt, g.limits.minDepthFt, g.limits.maxDepthFt) ? typed.avgDepthFt : g.avgDepthFt);
    const factors = g.shapes[shape];
    const areaFactor = nonNegative(factors?.areaFactor);
    const perimeterFactor = nonNegative(factors?.perimeterFactor);
    const surfaceAreaSqft = lengthFt * widthFt * areaFactor;
    const perimeterFt = 2 * (lengthFt + widthFt) * perimeterFactor;
    const deckQ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, input.answers).find((q)=>q.role === 'deckSize');
    const deckAnswer = deckQ ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(deckQ, input.answers)[0] : undefined;
    const deckSqft = deckAnswer && Object.hasOwn(g.deckSizes, deckAnswer) ? nonNegative(g.deckSizes[deckAnswer]) : 0;
    return {
        shape,
        size,
        lengthFt,
        widthFt,
        avgDepthFt,
        surfaceAreaSqft,
        perimeterFt,
        interiorSqft: surfaceAreaSqft + perimeterFt * avgDepthFt,
        deckSqft,
        source: useTyped ? 'dimensions' : 'preset'
    };
}
function sizeClassFor(template, geometry) {
    if (geometry.source === 'preset' && geometry.size !== 'unsure') return geometry.size;
    const area = Math.max(1e-6, geometry.lengthFt * geometry.widthFt);
    let best = 'medium';
    let bestGap = Infinity;
    for (const size of [
        'small',
        'medium',
        'large'
    ]){
        const preset = template.geometry.sizes[size];
        if (!preset) continue;
        const gap = Math.abs(Math.log(area / Math.max(1e-6, preset.lengthFt * preset.widthFt)));
        if (gap < bestGap) {
            best = size;
            bestGap = gap;
        }
    }
    return best;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/engine.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyPackage",
    ()=>applyPackage,
    "computeEstimate",
    ()=>computeEstimate,
    "formatRange",
    ()=>formatRange,
    "formatUsd",
    ()=>formatUsd,
    "picksFor",
    ()=>picksFor,
    "validateTemplate",
    ()=>validateTemplate,
    "visibleQuestions",
    ()=>visibleQuestions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/geometry.ts [app-client] (ecmascript)");
;
;
function picksFor(q, answers) {
    const raw = answers[q.id];
    const valid = (Array.isArray(raw) ? raw : []).filter((id)=>q.options.some((o)=>o.id === id));
    const unique = [
        ...new Set(valid)
    ];
    return q.kind === 'single' ? unique.slice(0, 1) : unique;
}
function visibleQuestions(template, answers) {
    const shown = new Set();
    return template.questions.filter((q)=>{
        if (q.showWhen) {
            const parent = template.questions.find((p)=>p.id === q.showWhen.questionId);
            if (!parent || !shown.has(parent.id)) return false;
            if (!q.showWhen.anyOf.some((id)=>picksFor(parent, answers).includes(id))) return false;
        }
        shown.add(q.id);
        return true;
    });
}
function applyPackage(template, answers, packageId) {
    const next = {};
    for (const [id, picks] of Object.entries(answers))next[id] = [
        ...picks
    ];
    const packageQ = template.questions.find((q)=>q.role === 'package');
    if (packageId === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]) {
        if (packageQ) next[packageQ.id] = [
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]
        ];
        return next;
    }
    const pkg = template.packages.find((p)=>p.id === packageId);
    if (!pkg) return next;
    for (const [id, picks] of Object.entries(pkg.answers))next[id] = [
        ...picks
    ];
    if (packageQ) next[packageQ.id] = [
        pkg.id
    ];
    return next;
}
/** Cents-level rounding so decimal unit prices cannot push a round-up over a step. */ function cents(n) {
    return Math.round(n * 100) / 100;
}
function computeEstimate(template, input) {
    const geometry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["poolGeometry"])(template, input);
    const questions = visibleQuestions(template, input.answers);
    const lines = [];
    const unanswered = [];
    const siteVisitItems = [];
    const seenSiteVisit = new Set();
    const deferred = [];
    const quantityFor = (unit, defaultQuantity)=>{
        switch(unit){
            case 'interior_sqft':
                return Math.round(geometry.interiorSqft);
            case 'perimeter_lf':
                return Math.round(geometry.perimeterFt);
            case 'deck_sqft':
                return Math.round(geometry.deckSqft);
            case 'floor_sqft':
                return Math.round(geometry.lengthFt * geometry.widthFt);
            case 'flat':
                return 1;
            default:
                return Math.max(0, Math.round(defaultQuantity ?? 1));
        }
    };
    for (const q of questions){
        const picks = picksFor(q, input.answers);
        if (picks.length === 0 && !q.optional) unanswered.push(q.id);
        for (const id of picks){
            const opt = q.options.find((o)=>o.id === id);
            // "Not sure" on size needs no measuring visit once the homeowner typed valid dimensions.
            const measured = q.role === 'size' && geometry.source === 'dimensions';
            const conditions = opt.siteVisitWhen ? [
                opt.siteVisitWhen
            ].flat() : [];
            const applies = conditions.length === 0 || conditions.some((when)=>{
                const whenQ = questions.find((x)=>x.id === when.questionId);
                if (!whenQ) return false;
                const whenPicks = whenQ.role === 'size' && geometry.source === 'dimensions' ? [
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sizeClassFor"])(template, geometry)
                ] : picksFor(whenQ, input.answers);
                return whenPicks.some((p)=>when.anyOf.includes(p));
            });
            if (opt.siteVisit && applies && !measured && !seenSiteVisit.has(opt.siteVisit)) {
                seenSiteVisit.add(opt.siteVisit);
                siteVisitItems.push({
                    questionId: q.id,
                    label: opt.siteVisit
                });
            }
            if (q.role === 'package' || q.role === 'scope') continue;
            const price = opt.price;
            if (!price || !Number.isFinite(price.low) || !Number.isFinite(price.high)) continue;
            const quantity = quantityFor(price.unit, price.quantity);
            if (quantity <= 0) {
                if (price.unit === 'deck_sqft') deferred.push(q.id);
                continue;
            }
            lines.push({
                questionId: q.id,
                optionId: id,
                label: q.summaryLabel ? `${q.summaryLabel}: ${opt.label}` : opt.label,
                unit: price.unit,
                quantity,
                low: cents(price.low * quantity),
                high: cents(price.high * quantity)
            });
        }
    }
    // A deck line waiting on a deck area is normally covered by the unanswered
    // deck-size question; only flag the deck question itself when nothing else is.
    const deckSizeWaiting = questions.some((q)=>q.role === 'deckSize' && unanswered.includes(q.id));
    if (!deckSizeWaiting) {
        for (const id of deferred)if (!unanswered.includes(id)) unanswered.push(id);
    }
    let low = null;
    let high = null;
    if (lines.length) {
        const step = Number.isFinite(template.roundTo) && template.roundTo > 0 ? template.roundTo : 0;
        const floor = Number.isFinite(template.minimumJob) ? Math.max(0, template.minimumJob) : 0;
        const sumLow = Math.max(floor, cents(lines.reduce((t, l)=>t + l.low, 0)));
        const sumHigh = Math.max(floor, cents(lines.reduce((t, l)=>t + l.high, 0)));
        low = Math.max(floor, step ? Math.floor(sumLow / step) * step : sumLow);
        high = Math.max(floor, step ? Math.ceil(sumHigh / step) * step : sumHigh);
        // Always a range, never one figure that reads like a quote (e.g. both ends at the minimum job).
        if (high <= low) high = low + (step || Math.max(1, Math.ceil(low * 0.1)));
    }
    const status = unanswered.length ? 'incomplete' : siteVisitItems.length ? 'site_visit' : 'ready';
    return {
        geometry,
        lines,
        low,
        high,
        siteVisitItems,
        unanswered,
        status
    };
}
/* ------------------------------------------------------------------ */ /* Template validation                                                 */ /* ------------------------------------------------------------------ */ const PRICE_UNITS = [
    'interior_sqft',
    'perimeter_lf',
    'deck_sqft',
    'floor_sqft',
    'linear_ft',
    'each',
    'flat'
];
const ROLES = [
    'project',
    'shape',
    'size',
    'package',
    'scope',
    'deckSize'
];
function validateTemplate(template) {
    const problems = [];
    const qs = template.questions;
    // Duplicate ids.
    const seenQ = new Set();
    for (const q of qs){
        if (seenQ.has(q.id)) problems.push(`Duplicate question id "${q.id}".`);
        seenQ.add(q.id);
        const seenO = new Set();
        for (const o of q.options){
            if (seenO.has(o.id)) problems.push(`Question "${q.id}" has duplicate option id "${o.id}".`);
            seenO.add(o.id);
        }
    }
    // showWhen must point at an earlier question and one of its options.
    qs.forEach((q, index)=>{
        if (!q.showWhen) return;
        const parentIndex = qs.findIndex((p)=>p.id === q.showWhen.questionId);
        if (parentIndex === -1) {
            problems.push(`Question "${q.id}" is shown by unknown question "${q.showWhen.questionId}".`);
            return;
        }
        if (parentIndex >= index) {
            problems.push(`Question "${q.id}" is shown by "${q.showWhen.questionId}", which does not come before it.`);
        }
        const parent = qs[parentIndex];
        for (const optionId of q.showWhen.anyOf){
            if (!parent.options.some((o)=>o.id === optionId)) {
                problems.push(`Question "${q.id}" is shown by unknown option "${parent.id}.${optionId}".`);
            }
        }
    });
    // siteVisitWhen must point at a question and one of its options.
    for (const q of qs){
        for (const o of q.options){
            for (const when of o.siteVisitWhen ? [
                o.siteVisitWhen
            ].flat() : []){
                const target = qs.find((x)=>x.id === when.questionId);
                if (!target) {
                    problems.push(`Option "${q.id}.${o.id}" has siteVisitWhen on unknown question "${when.questionId}".`);
                    continue;
                }
                for (const id of when.anyOf){
                    if (!target.options.some((x)=>x.id === id)) problems.push(`Option "${q.id}.${o.id}" has siteVisitWhen on unknown option "${target.id}.${id}".`);
                }
            }
        }
    }
    // Prices.
    for (const q of qs){
        for (const o of q.options){
            const p = o.price;
            if (!p) continue;
            const where = `Option "${q.id}.${o.id}"`;
            if (!PRICE_UNITS.includes(p.unit)) problems.push(`${where} has unknown price unit "${String(p.unit)}".`);
            if (!Number.isFinite(p.low) || !Number.isFinite(p.high)) {
                problems.push(`${where} has a price that is not a finite number.`);
            } else {
                if (p.low < 0) problems.push(`${where} has a negative low price.`);
                if (p.high < p.low) problems.push(`${where} has a high price below its low price.`);
            }
            if (p.quantity !== undefined && !(Number.isFinite(p.quantity) && p.quantity > 0)) {
                problems.push(`${where} has a quantity that is not above zero.`);
            }
        }
    }
    // Roles: at most once each.
    for (const role of ROLES){
        const withRole = qs.filter((q)=>q.role === role);
        if (withRole.length > 1) {
            problems.push(`Role "${role}" is used by more than one question (${withRole.map((q)=>`"${q.id}"`).join(', ')}).`);
        }
    }
    const byRole = (role)=>qs.find((q)=>q.role === role);
    const shapeQ = byRole('shape');
    if (shapeQ) {
        for (const o of shapeQ.options){
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_SHAPES"].includes(o.id)) {
                problems.push(`Shape option "${o.id}" is not a valid pool shape.`);
            }
        }
    }
    const sizeQ = byRole('size');
    if (sizeQ) {
        for (const o of sizeQ.options){
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POOL_SIZES"].includes(o.id)) {
                problems.push(`Size option "${o.id}" is not a valid pool size.`);
            }
        }
    }
    const packageQ = byRole('package');
    if (packageQ) {
        const allowed = new Set([
            ...template.packages.map((p)=>p.id),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]
        ]);
        for (const o of packageQ.options){
            if (!allowed.has(o.id)) problems.push(`Package option "${o.id}" does not match any package.`);
        }
    }
    const deckSizeQ = byRole('deckSize');
    if (deckSizeQ) {
        for (const o of deckSizeQ.options){
            if (!Object.hasOwn(template.geometry.deckSizes, o.id)) {
                problems.push(`Deck size option "${o.id}" has no area in geometry.deckSizes.`);
            }
        }
    }
    if (!deckSizeQ) {
        for (const q of qs){
            if (q.options.some((o)=>o.price?.unit === 'deck_sqft')) {
                problems.push(`Question "${q.id}" prices by deck area but the template has no deckSize question.`);
            }
        }
    }
    // Keep it short.
    const { maxSingleOptions, maxMultiOptions } = template.limits;
    for (const q of qs){
        const max = q.kind === 'single' ? maxSingleOptions : maxMultiOptions;
        if (q.options.length > max) {
            problems.push(`Question "${q.id}" has ${q.options.length} options; a ${q.kind} question allows at most ${max}.`);
        }
    }
    // Packages.
    const seenP = new Set();
    for (const pkg of template.packages){
        if (seenP.has(pkg.id)) problems.push(`Duplicate package id "${pkg.id}".`);
        seenP.add(pkg.id);
        for (const [questionId, picks] of Object.entries(pkg.answers)){
            const q = qs.find((x)=>x.id === questionId);
            if (!q) {
                problems.push(`Package "${pkg.id}" answers unknown question "${questionId}".`);
                continue;
            }
            for (const optionId of picks){
                if (!q.options.some((o)=>o.id === optionId)) {
                    problems.push(`Package "${pkg.id}" picks unknown option "${questionId}.${optionId}".`);
                }
            }
        }
    }
    for (const key of [
        'minimumJob',
        'roundTo'
    ]){
        const n = template[key];
        if (!Number.isFinite(n) || n < 0) problems.push(`${key} must be a number of at least 0.`);
    }
    return problems;
}
const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
});
function formatUsd(amount) {
    return Number.isFinite(amount) ? usd.format(Math.round(amount)) : '—';
}
function formatRange(low, high) {
    return low === high ? formatUsd(low) : `${formatUsd(low)} – ${formatUsd(high)}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELTA_STEP",
    ()=>DELTA_STEP,
    "bundleQuote",
    ()=>bundleQuote,
    "configuratorSpecFor",
    ()=>configuratorSpecFor,
    "decodeSelection",
    ()=>decodeSelection,
    "defaultSelection",
    ()=>defaultSelection,
    "effectivePicks",
    ()=>effectivePicks,
    "encodeSelection",
    ()=>encodeSelection,
    "estimateSelection",
    ()=>estimateSelection,
    "isLockedByBundle",
    ()=>isLockedByBundle,
    "normalizeSelection",
    ()=>normalizeSelection,
    "photoFor",
    ()=>photoFor,
    "photoKeys",
    ()=>photoKeys,
    "photoSrc",
    ()=>photoSrc,
    "rowDelta",
    ()=>rowDelta,
    "selectedRows",
    ()=>selectedRows,
    "selectionToAnswers",
    ()=>selectionToAnswers,
    "viewForRow",
    ()=>viewForRow,
    "viewShowsRow",
    ()=>viewShowsRow,
    "viewsShowingRow",
    ()=>viewsShowingRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
;
/*
 * Pure helpers for the one-page configurator: selection -> template answers ->
 * computeEstimate, row price deltas, the Go Luxe bundle, the photo matrix and
 * the shareable "Save your design" URL. No React, server- and client-safe.
 */ function groupOf(spec, rowId) {
    return spec.groups.find((g)=>g.rows.some((r)=>r.id === rowId));
}
function includedRow(group) {
    return (group.rows.find((r)=>r.included) ?? group.rows[0]).id;
}
function defaultSelection(spec) {
    const picks = {};
    for (const g of spec.groups)picks[g.id] = g.kind === 'single' ? [
        includedRow(g)
    ] : [];
    return {
        model: spec.defaultModel,
        picks,
        luxe: false
    };
}
function normalizeSelection(spec, selection) {
    const model = spec.models.some((m)=>m.id === selection.model) ? selection.model : spec.defaultModel;
    const picks = {};
    for (const g of spec.groups){
        const raw = selection.picks?.[g.id] ?? [];
        const valid = [
            ...new Set(raw.filter((id)=>g.rows.some((r)=>r.id === id)))
        ];
        picks[g.id] = g.kind === 'single' ? [
            valid[0] ?? includedRow(g)
        ] : valid;
    }
    return {
        model,
        picks,
        luxe: Boolean(selection.luxe && spec.bundle)
    };
}
function effectivePicks(spec, selection) {
    const sel = normalizeSelection(spec, selection);
    const picks = {};
    for (const g of spec.groups)picks[g.id] = [
        ...sel.picks[g.id]
    ];
    if (sel.luxe && spec.bundle) {
        for (const rowId of spec.bundle.rows){
            const g = groupOf(spec, rowId);
            if (!g) continue;
            picks[g.id] = g.kind === 'single' ? [
                rowId
            ] : [
                ...new Set([
                    ...picks[g.id],
                    rowId
                ])
            ];
        }
    }
    return picks;
}
function selectedRows(spec, selection) {
    return new Set(Object.values(effectivePicks(spec, selection)).flat());
}
function isLockedByBundle(spec, selection, rowId) {
    if (!selection.luxe || !spec.bundle) return false;
    const g = groupOf(spec, rowId);
    if (!g) return false;
    // In a single group every row is locked (the bundle row is forced); in a multi group only the bundle's rows.
    return g.kind === 'single' ? g.rows.some((r)=>spec.bundle.rows.includes(r.id)) : spec.bundle.rows.includes(rowId);
}
function selectionToAnswers(spec, selection, extra) {
    const sel = normalizeSelection(spec, selection);
    const picks = effectivePicks(spec, sel);
    const out = {};
    const replace = (a)=>{
        for (const [q, ids] of Object.entries(a))out[q] = [
            ...ids
        ];
    };
    replace(spec.baseAnswers);
    replace(spec.models.find((m)=>m.id === sel.model).answers);
    for (const g of spec.groups){
        if (g.kind !== 'single') continue;
        const row = g.rows.find((r)=>r.id === picks[g.id][0]);
        replace(row.answers);
    }
    for (const g of spec.groups){
        if (g.kind !== 'multi') continue;
        for (const rowId of picks[g.id]){
            const row = g.rows.find((r)=>r.id === rowId);
            for (const [q, ids] of Object.entries(row.answers))out[q] = [
                ...new Set([
                    ...ids,
                    ...out[q] ?? []
                ])
            ];
        }
    }
    if (extra) replace(extra);
    return out;
}
/** Unrounded sum of the estimate's lines. */ function lineSum(e) {
    return e.lines.reduce((t, l)=>({
            low: t.low + l.low,
            high: t.high + l.high
        }), {
        low: 0,
        high: 0
    });
}
function roundRange(r, step) {
    if (!(step > 0)) return {
        low: Math.round(r.low),
        high: Math.round(r.high)
    };
    return {
        low: Math.floor(r.low / step) * step,
        high: Math.ceil(r.high / step) * step
    };
}
const DELTA_STEP = 100;
function estimateSelection(spec, template, selection, extra) {
    const sel = normalizeSelection(spec, selection);
    const estimate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, sel, extra)
    });
    const sum = lineSum(estimate);
    const bundleSaving = sel.luxe && spec.bundle ? bundleQuote(spec, template, sel.model).saving : null;
    const step = template.roundTo > 0 ? template.roundTo : 0;
    const floor = Math.max(0, template.minimumJob || 0);
    const low = Math.max(floor, sum.low - (bundleSaving?.low ?? 0));
    const high = Math.max(floor, sum.high - (bundleSaving?.high ?? 0));
    const total = roundRange({
        low,
        high
    }, step);
    total.low = Math.max(floor, total.low);
    if (total.high <= total.low) total.high = total.low + (step || Math.max(1, Math.ceil(total.low * 0.1)));
    return {
        estimate,
        total,
        bundleSaving
    };
}
function rowDelta(spec, template, selection, rowId) {
    const g = groupOf(spec, rowId);
    if (!g) return {
        low: 0,
        high: 0
    };
    const base = normalizeSelection(spec, {
        ...selection,
        luxe: false
    });
    const without = structuredClone(base);
    const withRow = structuredClone(base);
    if (g.kind === 'single') {
        without.picks[g.id] = [
            includedRow(g)
        ];
        withRow.picks[g.id] = [
            rowId
        ];
    } else {
        without.picks[g.id] = without.picks[g.id].filter((id)=>id !== rowId);
        withRow.picks[g.id] = [
            ...without.picks[g.id],
            rowId
        ];
    }
    const a = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, without)
    }));
    const b = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, withRow)
    }));
    return roundRange({
        low: Math.max(0, b.low - a.low),
        high: Math.max(0, b.high - a.high)
    }, DELTA_STEP);
}
function bundleQuote(spec, template, modelId) {
    if (!spec.bundle) return {
        full: {
            low: 0,
            high: 0
        },
        price: {
            low: 0,
            high: 0
        },
        saving: {
            low: 0,
            high: 0
        }
    };
    const base = {
        ...defaultSelection(spec),
        model: modelId
    };
    const a = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, base)
    }));
    const b = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, {
            ...base,
            luxe: true
        })
    }));
    const fullRaw = {
        low: b.low - a.low,
        high: b.high - a.high
    };
    const pct = Math.min(Math.max(spec.bundle.discountPct, 0), 1);
    const saving = roundRange({
        low: fullRaw.low * pct,
        high: fullRaw.high * pct
    }, DELTA_STEP);
    // Saving rounds out (low down, high up) and the price is what is left, so price + saving = full.
    const full = roundRange(fullRaw, DELTA_STEP);
    return {
        full,
        price: {
            low: full.low - saving.low,
            high: full.high - saving.high
        },
        saving
    };
}
function viewShowsRow(spec, viewId, rowId) {
    const view = spec.views.find((v)=>v.id === viewId);
    return Boolean(view?.dimensions.some((d)=>d.options.some((o)=>o.rows.includes(rowId) || o.allOf?.includes(rowId))));
}
function viewsShowingRow(spec, rowId) {
    return spec.views.filter((v)=>viewShowsRow(spec, v.id, rowId)).map((v)=>v.id);
}
function viewForRow(spec, rowId, currentView) {
    const showing = viewsShowingRow(spec, rowId);
    if (!showing.length) return undefined;
    if (currentView && showing.includes(currentView)) return currentView;
    const g = groupOf(spec, rowId);
    const preferred = g?.rows.find((r)=>r.id === rowId)?.view ?? g?.view;
    return preferred && showing.includes(preferred) ? preferred : showing[0];
}
function keyOf(viewId, tokens) {
    return [
        viewId,
        ...tokens.filter(Boolean)
    ].join('-');
}
function photoFor(spec, viewId, selection) {
    const view = spec.views.find((v)=>v.id === viewId) ?? spec.views[0];
    const rows = selectedRows(spec, selection);
    const tokens = view.dimensions.map((d)=>{
        const hit = d.options.find((o)=>(o.rows.length === 0 || o.rows.some((r)=>rows.has(r))) && (!o.allOf?.length || o.allOf.every((r)=>rows.has(r))));
        return hit?.token ?? '';
    });
    return keyOf(view.id, tokens);
}
function photoKeys(spec, viewId) {
    const views = viewId ? spec.views.filter((v)=>v.id === viewId) : spec.views;
    return views.flatMap((v)=>v.dimensions.reduce((acc, d)=>acc.flatMap((t)=>d.options.map((o)=>[
                        ...t,
                        o.token
                    ])), [
            []
        ]).map((tokens)=>keyOf(v.id, tokens)));
}
function photoSrc(spec, key) {
    const photo = spec.photos[key];
    if (photo) return photo;
    const view = spec.views.find((v)=>key === v.id || key.startsWith(`${v.id}-`)) ?? spec.views[0];
    return view.fallback;
}
function encodeSelection(spec, selection) {
    const sel = normalizeSelection(spec, selection);
    const rows = [];
    for (const g of spec.groups){
        for (const id of sel.picks[g.id])if (!(g.kind === 'single' && id === includedRow(g))) rows.push(id);
    }
    const params = new URLSearchParams({
        m: sel.model
    });
    if (rows.length) params.set('o', rows.join(','));
    if (sel.luxe) params.set('lx', '1');
    return params.toString().replace(/%2C/g, ',');
}
function decodeSelection(spec, query) {
    const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
    const sel = defaultSelection(spec);
    const model = params.get('m');
    if (model) sel.model = model;
    for (const id of (params.get('o') ?? '').split(',').map((s)=>s.trim()).filter(Boolean)){
        const g = groupOf(spec, id);
        if (!g) continue;
        sel.picks[g.id] = g.kind === 'single' ? [
            id
        ] : [
            ...sel.picks[g.id],
            id
        ];
    }
    sel.luxe = params.get('lx') === '1';
    return normalizeSelection(spec, sel);
}
function configuratorSpecFor(contractor) {
    if (contractor.experience !== 'configurator' || !contractor.configurator) return null;
    return contractor.revealRange === 'immediately' ? contractor.configurator : null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allFunnelSelections",
    ()=>allFunnelSelections,
    "answeredSteps",
    ()=>answeredSteps,
    "decodeFunnelSelection",
    ()=>decodeFunnelSelection,
    "defaultFunnelSelection",
    ()=>defaultFunnelSelection,
    "encodeFunnelSelection",
    ()=>encodeFunnelSelection,
    "estimateFunnel",
    ()=>estimateFunnel,
    "funnelAnswers",
    ()=>funnelAnswers,
    "funnelPhoto",
    ()=>funnelPhoto,
    "funnelSpecFor",
    ()=>funnelSpecFor,
    "normalizeFunnelSelection",
    ()=>normalizeFunnelSelection,
    "photoKey",
    ()=>photoKey,
    "pickedOptions",
    ()=>pickedOptions,
    "pickedTitles",
    ()=>pickedTitles,
    "smallVariant",
    ()=>smallVariant,
    "stepOptionPhotos",
    ()=>stepOptionPhotos,
    "toConfiguratorSelection",
    ()=>toConfiguratorSelection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
;
;
/*
 * Pure helpers for the simple mobile funnel: default selection, selection ->
 * template answers (reusing the configurator mapping when the spec has one),
 * the estimate, the photo per step and the URL / sessionStorage encoding.
 * No React, server- and client-safe.
 */ function stepOf(spec, stepId) {
    return spec.steps.find((s)=>s.id === stepId);
}
function defaultOptionOf(step) {
    return (step.options.find((o)=>o.id === step.defaultOption) ?? step.options[0]).id;
}
function defaultFunnelSelection(spec) {
    return Object.fromEntries(spec.steps.map((s)=>[
            s.id,
            defaultOptionOf(s)
        ]));
}
function normalizeFunnelSelection(spec, raw) {
    const obj = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const s of spec.steps){
        const v = obj[s.id];
        out[s.id] = typeof v === 'string' && s.options.some((o)=>o.id === v) ? v : defaultOptionOf(s);
    }
    return out;
}
function pickedOptions(spec, selection) {
    const sel = normalizeFunnelSelection(spec, selection);
    return spec.steps.map((s)=>s.options.find((o)=>o.id === sel[s.id]));
}
function pickedTitles(spec, selection) {
    return pickedOptions(spec, selection).map((o)=>o.title);
}
function toConfiguratorSelection(spec, selection) {
    const cfg = spec.configurator;
    if (!cfg) return null;
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultSelection"])(cfg);
    for (const o of pickedOptions(spec, selection)){
        if (o.model) sel.model = o.model;
        for (const rowId of o.rows ?? []){
            const g = cfg.groups.find((gr)=>gr.rows.some((r)=>r.id === rowId));
            if (!g) continue;
            sel.picks[g.id] = g.kind === 'single' ? [
                rowId
            ] : [
                ...new Set([
                    ...sel.picks[g.id],
                    rowId
                ])
            ];
        }
    }
    return {
        ...sel,
        luxe: false
    };
}
/** Option `answers` of every pick, laid over each other in step order (each replaces the questions it names). */ function overlayAnswers(spec, selection) {
    const out = {};
    for (const o of pickedOptions(spec, selection))for (const [q, ids] of Object.entries(o.answers ?? {}))out[q] = [
        ...ids
    ];
    return Object.keys(out).length ? out : undefined;
}
function funnelAnswers(spec, selection) {
    const overlay = overlayAnswers(spec, selection);
    const cfgSel = toConfiguratorSelection(spec, selection);
    if (spec.configurator && cfgSel) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectionToAnswers"])(spec.configurator, cfgSel, overlay);
    const out = {};
    for (const [q, ids] of Object.entries(spec.baseAnswers ?? {}))out[q] = [
        ...ids
    ];
    for (const [q, ids] of Object.entries(overlay ?? {}))out[q] = [
        ...ids
    ];
    return out;
}
function estimateFunnel(spec, template, selection) {
    const cfgSel = toConfiguratorSelection(spec, selection);
    if (spec.configurator && cfgSel) {
        const { estimate, total } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimateSelection"])(spec.configurator, template, cfgSel, overlayAnswers(spec, selection));
        return {
            estimate,
            total
        };
    }
    const estimate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: funnelAnswers(spec, selection)
    });
    return {
        estimate,
        total: estimate.low !== null && estimate.high !== null ? {
            low: estimate.low,
            high: estimate.high
        } : null
    };
}
function smallVariant(src) {
    return /\/configurator\/[^/]+\.webp$/.test(src) && !src.endsWith('-sm.webp') ? src.replace(/\.webp$/, '-sm.webp') : undefined;
}
function photoKey(spec, stepId, selection) {
    const step = stepOf(spec, stepId) ?? spec.steps[0];
    const sel = normalizeFunnelSelection(spec, selection);
    if (step.photo.kind === 'option') return `${step.id}-${sel[step.id]}`;
    const cfg = spec.configurator;
    const cfgSel = toConfiguratorSelection(spec, sel);
    if (!cfg || !cfgSel) return step.photo.view;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoFor"])(cfg, step.photo.view, cfgSel);
}
function funnelPhoto(spec, stepId, selection) {
    const step = stepOf(spec, stepId) ?? spec.steps[0];
    const sel = normalizeFunnelSelection(spec, selection);
    const rule = step.photo;
    if (rule.kind === 'option') return rule.photos[sel[step.id]] ?? Object.values(rule.photos)[0];
    const cfg = spec.configurator;
    const view = cfg?.views.find((v)=>v.id === rule.view);
    if (!cfg || !view) return {
        src: spec.landing.heroPhoto.src,
        srcSm: spec.landing.heroPhoto.srcSm,
        alt: spec.landing.heroAlt
    };
    const photo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoSrc"])(cfg, photoKey(spec, step.id, sel));
    return {
        src: photo.src,
        srcSm: smallVariant(photo.src),
        alt: photo.alt,
        fallback: {
            src: view.fallback.src,
            alt: view.fallback.alt
        }
    };
}
function stepOptionPhotos(spec, stepId, selection) {
    const step = stepOf(spec, stepId) ?? spec.steps[0];
    const sel = normalizeFunnelSelection(spec, selection);
    return Object.fromEntries(step.options.map((o)=>[
            o.id,
            funnelPhoto(spec, step.id, {
                ...sel,
                [step.id]: o.id
            })
        ]));
}
function allFunnelSelections(spec) {
    return spec.steps.reduce((acc, s)=>acc.flatMap((sel)=>s.options.map((o)=>({
                    ...sel,
                    [s.id]: o.id
                }))), [
        {}
    ]);
}
function encodeFunnelSelection(spec, selection) {
    const sel = normalizeFunnelSelection(spec, selection);
    return new URLSearchParams(spec.steps.map((s)=>[
            s.id,
            sel[s.id]
        ])).toString();
}
function decodeFunnelSelection(spec, query) {
    if (typeof query === 'string' || query instanceof URLSearchParams) {
        const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
        return normalizeFunnelSelection(spec, Object.fromEntries(spec.steps.map((s)=>[
                s.id,
                params.get(s.id) ?? undefined
            ])));
    }
    return normalizeFunnelSelection(spec, query);
}
function answeredSteps(spec, query) {
    const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
    return spec.steps.filter((s)=>s.options.some((o)=>o.id === params.get(s.id))).map((s)=>s.id);
}
function funnelSpecFor(contractor) {
    return contractor.experience === 'funnel' && contractor.funnel ? contractor.funnel : null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
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
"[project]/components/estimator/funnel/chrome.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelFooter",
    ()=>FunnelFooter,
    "FunnelLogo",
    ()=>FunnelLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-client] (ecmascript)");
;
;
;
;
function FunnelLogo({ contractor, height, priority = false }) {
    if (!contractor.logoUrl) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[18px] font-semibold tracking-[-0.02em] text-[var(--fn-ink)]",
            children: contractor.contractorName
        }, void 0, false, {
            fileName: "[project]/components/estimator/funnel/chrome.tsx",
            lineNumber: 17,
            columnNumber: 12
        }, this);
    }
    const width = Math.round(height * 2.38);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        src: contractor.logoUrl,
        alt: contractor.contractorName,
        width: width,
        height: height,
        priority: priority,
        sizes: `${width}px`,
        className: "block object-contain object-left",
        style: {
            width,
            height
        }
    }, void 0, false, {
        fileName: "[project]/components/estimator/funnel/chrome.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = FunnelLogo;
function FunnelFooter({ contractor, note }) {
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "border-t border-[var(--fn-hair)] text-[var(--fn-muted)]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-[1120px] px-5 pb-8 pt-6 sm:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] leading-[20px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "© ",
                                new Date().getFullYear(),
                                " ",
                                contractor.contractorName
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 47,
                            columnNumber: 11
                        }, this),
                        tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: tel,
                            className: "tabular-nums underline-offset-4 hover:text-[var(--fn-ink)] hover:underline",
                            children: contractor.phone
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 51,
                            columnNumber: 13
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/privacy",
                            className: "underline-offset-4 hover:text-[var(--fn-ink)] hover:underline",
                            children: "Privacy"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/terms",
                            className: "underline-offset-4 hover:text-[var(--fn-ink)] hover:underline",
                            children: "Terms"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/chrome.tsx",
                    lineNumber: 46,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-3 max-w-[640px] text-pretty text-[12px] leading-[17px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "tabular-nums",
                            children: contractor.licenseLabel
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 63,
                            columnNumber: 11
                        }, this),
                        note ? ` · ${note}` : ''
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/chrome.tsx",
                    lineNumber: 62,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/funnel/chrome.tsx",
            lineNumber: 45,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/funnel/chrome.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
_c1 = FunnelFooter;
var _c, _c1;
__turbopack_context__.k.register(_c, "FunnelLogo");
__turbopack_context__.k.register(_c1, "FunnelFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/location/us-zip.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * US ZIP code → state validation, without a third-party API.
 *
 * Deliberately NOT "starts with 9": that would also accept Nevada POBox/APO
 * ranges and non-CA territories. Instead this uses the standard USPS ZIP3
 * (first three digits) → state assignment, which is how the National ZIP
 * Code and Post Office Directory partitions the country. California's
 * assigned ZIP3 block is a contiguous 900–961 with no overlap into a
 * neighboring state at the ZIP3 level (Nevada is 889–898, Oregon is 970–979,
 * Arizona is 850–865, Hawaii is 967–968). This is the same granularity the
 * funnel system already uses for its radius-style `serviceArea.zipPrefixes`
 * (lib/funnels/schema.ts `inServiceArea`), so this module stays consistent
 * with the rest of the app's location model instead of introducing a new one.
 *
 * Limitation: ZIP3-level accuracy cannot confirm a specific 5-digit ZIP is an
 * actually-assigned, deliverable code (e.g. "90000" would pass the state
 * check even though it isn't a real ZIP) — only that, if it's real, it's a
 * California ZIP. Combined with the 5-digit format check below, this rejects
 * every malformed input and every valid ZIP outside California, which is
 * what the Pool Masters service-area gate needs. A full ZIP5 deliverability
 * dataset can be layered in later (see HOMEQUOTE_CONTEXT.md) if stricter
 * validation is ever needed.
 */ __turbopack_context__.s([
    "isCaliforniaZip",
    ()=>isCaliforniaZip,
    "normalizeZip5",
    ()=>normalizeZip5,
    "usZipState",
    ()=>usZipState
]);
const CA_ZIP3_MIN = 900;
const CA_ZIP3_MAX = 961;
function normalizeZip5(raw) {
    const trimmed = (raw ?? '').trim();
    const match = /^(\d{5})(-\d{4})?$/.exec(trimmed);
    return match ? match[1] : null;
}
function usZipState(raw) {
    const zip = normalizeZip5(raw);
    if (!zip) return null;
    const zip3 = Number(zip.slice(0, 3));
    return zip3 >= CA_ZIP3_MIN && zip3 <= CA_ZIP3_MAX ? 'CA' : null;
}
function isCaliforniaZip(raw) {
    return usZipState(raw) === 'CA';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/funnels/schema.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_CALENDAR_PROVIDER",
    ()=>DEFAULT_CALENDAR_PROVIDER,
    "DEFAULT_PLACEHOLDERS",
    ()=>DEFAULT_PLACEHOLDERS,
    "FUNNEL_SCREENS",
    ()=>FUNNEL_SCREENS,
    "MAX_ANSWER_LENGTH",
    ()=>MAX_ANSWER_LENGTH,
    "QUESTION_TYPES",
    ()=>QUESTION_TYPES,
    "TEXT_QUESTION_TYPES",
    ()=>TEXT_QUESTION_TYPES,
    "calendlyEmbedUrl",
    ()=>calendlyEmbedUrl,
    "calendlyUri",
    ()=>calendlyUri,
    "captureAttribution",
    ()=>captureAttribution,
    "conditionSchema",
    ()=>conditionSchema,
    "consentText",
    ()=>consentText,
    "contactSchema",
    ()=>contactSchema,
    "funnelSchema",
    ()=>funnelSchema,
    "hasCalendarStep",
    ()=>hasCalendarStep,
    "inServiceArea",
    ()=>inServiceArea,
    "isAnswered",
    ()=>isAnswered,
    "isRequired",
    ()=>isRequired,
    "isTextQuestion",
    ()=>isTextQuestion,
    "matches",
    ()=>matches,
    "qualify",
    ()=>qualify,
    "questionSchema",
    ()=>questionSchema,
    "resolveStep",
    ()=>resolveStep,
    "sanitizeAnswers",
    ()=>sanitizeAnswers,
    "serviceAreaValid",
    ()=>serviceAreaValid,
    "usesNativeCalendar",
    ()=>usesNativeCalendar,
    "validateAnswer",
    ()=>validateAnswer,
    "visibleQuestions",
    ()=>visibleQuestions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$location$2f$us$2d$zip$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/location/us-zip.ts [app-client] (ecmascript)");
;
;
const key = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^[a-z][a-z0-9_]{0,49}$/);
const text = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(300);
const httpsUrl = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().refine((value)=>new URL(value).protocol === 'https:', 'Use HTTPS');
const readableColor = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^#[0-9a-fA-F]{6}$/).refine((value)=>{
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return false;
    const c = [
        1,
        3,
        5
    ].map((i)=>parseInt(value.slice(i, i + 2), 16) / 255).map((v)=>v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 1.05 / (c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 + 0.05) >= 4.8;
}, 'Choose a darker brand color with accessible contrast');
const conditionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    question: key,
    operator: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'equals',
        'in',
        'not_equals'
    ]),
    values: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100)).min(1).max(100)
});
const TEXT_QUESTION_TYPES = [
    'short_text',
    'long_text',
    'address',
    'number',
    'email',
    'phone'
];
const QUESTION_TYPES = [
    'choice',
    'zip',
    ...TEXT_QUESTION_TYPES
];
const questionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: key,
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(QUESTION_TYPES),
    headline: text,
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(300).optional(),
    // Typed questions only. `required` is unset on every existing question and means "required".
    placeholder: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(120).optional(),
    required: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
    // featured: visually emphasized card (e.g. high-ticket services). Order is the array order.
    options: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^[a-z0-9_]{1,50}$/),
        label: text,
        detail: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(120).optional(),
        featured: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional()
    })).max(20).default([]),
    showWhen: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(conditionSchema).max(10).default([])
});
const usPhone = (v)=>/^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(v.replace(/\D/g, ''));
const funnelSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    version: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(1),
    clientName: text,
    clientLogo: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((v)=>/^\/(?!\/)/.test(v) || httpsUrl.safeParse(v).success).optional(),
    primaryColor: readableColor.default('#0038B8'),
    secondaryColor: readableColor.default('#0A1B3D'),
    industry: text,
    // zipPrefixes (3 digits) cover whole regions without listing every ZIP.
    // strictStates (optional, default none = unrestricted, unchanged for every existing funnel):
    // a hard state-level gate, independent of and broader than zipPrefixes/zipCodes. When set,
    // a project ZIP outside these states fails qualify() outright (see serviceAreaValid below) —
    // used by Pool Masters to reject out-of-state leads even though its own zipPrefixes (a tighter
    // LA/Ventura radius) only ever matched in-state ZIPs anyway. Two-letter USPS state codes.
    serviceArea: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        label: text,
        zipCodes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{5}$/)).max(10000).default([]),
        zipPrefixes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{3}$/)).max(1000).default([]),
        strictStates: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'CA'
        ])).max(10).default([])
    }),
    questions: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(questionSchema).min(1).max(30),
    qualificationRules: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(conditionSchema).max(30).default([]),
    qualifiedMessage: text.default('Great — it looks like we may be able to help.'),
    reviewMessage: text.default('Let’s take a closer look at your project.'),
    unqualifiedAction: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'review',
        'stop'
    ]).default('review'),
    calendarUrl: httpsUrl.optional(),
    calendarId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional(),
    // homequote: HomeQuote's own calendar (lib/booking): a funnel tied to a contractor books
    // that contractor's calendar, a network funnel the HomeQuote team's; no URL, the calendar
    // step is always on. ghl: embedded GHL calendar confirmed by a server callback. calendly:
    // Calendly inline embed, prefilled with name/email, booking reported by the embed. The
    // default stays 'ghl' so stored configs without the key keep their meaning (GHL with a
    // calendarUrl, or no calendar step without one); new calendar steps use 'homequote'.
    calendarProvider: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'homequote',
        'ghl',
        'calendly'
    ]).default('ghl'),
    calendarHeadline: text.optional(),
    thankYouPage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        headline: text,
        message: text
    }),
    // Optional. When a phone is set, the thank-you screen offers a "Save to contacts" button (vCard)
    // so the homeowner recognises the business's call. Unset keeps the screen unchanged.
    contactCard: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().refine((v)=>usPhone(v), 'Enter a valid US phone number'),
        email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().email().max(254).optional(),
        website: httpsUrl.optional()
    }).optional(),
    // Optional link-preview / <title> overrides. Unset keeps the HomeQuote defaults.
    seo: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(70).optional(),
        description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(200).optional()
    }).optional(),
    // opt_in (default): the pixel stays off until the visitor ticks the footer box.
    // opt_out: it runs on visit and the same box, pre-ticked, turns it off.
    trackingPixels: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        metaPixelId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{5,30}$/).optional(),
        consentMode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'opt_in',
            'opt_out'
        ]).default('opt_in')
    }).default({
        consentMode: 'opt_in'
    }),
    trust: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        rating: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1).max(5).optional(),
        reviewCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional(),
        license: text.optional(),
        financing: text.optional(),
        warranty: text.optional(),
        yearsInBusiness: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional(),
        testimonial: text.optional(),
        projectPhoto: httpsUrl.optional()
    }).default({})
}).superRefine((config, ctx)=>{
    const ids = new Set();
    config.questions.forEach((q, index)=>{
        if ([
            'qualification',
            'contact',
            'calendar',
            'thanks'
        ].includes(q.id)) ctx.addIssue({
            code: 'custom',
            message: 'Question ID is reserved for a funnel screen'
        });
        if (ids.has(q.id)) ctx.addIssue({
            code: 'custom',
            message: 'Question IDs must be unique'
        });
        if (q.type === 'choice' && !q.options.length) ctx.addIssue({
            code: 'custom',
            message: 'Choice questions need options'
        });
        if (new Set(q.options.map((o)=>o.value)).size !== q.options.length) ctx.addIssue({
            code: 'custom',
            message: 'Option values must be unique'
        });
        for (const c of q.showWhen){
            if (!config.questions.slice(0, index).some((previous)=>previous.id === c.question)) ctx.addIssue({
                code: 'custom',
                message: 'Branches must refer to earlier questions'
            });
        }
        ids.add(q.id);
    });
    if (config.questions.filter((q)=>q.type === 'zip').length !== 1) ctx.addIssue({
        code: 'custom',
        message: 'Include exactly one ZIP question'
    });
    for (const c of config.qualificationRules)if (!ids.has(c.question)) ctx.addIssue({
        code: 'custom',
        message: 'Qualification question does not exist'
    });
    if (config.calendarProvider === 'ghl' && !!config.calendarUrl !== !!config.calendarId) ctx.addIssue({
        code: 'custom',
        message: 'Set calendarUrl and calendarId together'
    });
    if (config.calendarProvider === 'calendly' && config.calendarUrl && new URL(config.calendarUrl).hostname !== 'calendly.com') ctx.addIssue({
        code: 'custom',
        message: 'Calendly URLs must be on calendly.com'
    });
});
const DEFAULT_CALENDAR_PROVIDER = 'homequote';
const usesNativeCalendar = (config)=>config.calendarProvider === 'homequote';
const hasCalendarStep = (config)=>usesNativeCalendar(config) || !!config.calendarUrl;
const contactSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    firstName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Enter your first name').max(80),
    lastName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Enter your last name').max(80),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().email('Enter a valid email address').max(254),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().refine(usPhone, 'Enter a valid US phone number'),
    consent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(true, {
        errorMap: ()=>({
                message: 'Please agree to be contacted about your project'
            })
    }),
    website: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(0).default('')
});
function matches(condition, answers) {
    const value = answers[condition.question];
    if (!value) return false;
    return condition.operator === 'not_equals' ? !condition.values.includes(value) : condition.values.includes(value);
}
function visibleQuestions(config, answers) {
    return config.questions.filter((q)=>q.showWhen.every((c)=>matches(c, answers)));
}
const FUNNEL_SCREENS = [
    'qualification',
    'contact',
    'calendar',
    'thanks'
];
function resolveStep(config, answers, step) {
    if (FUNNEL_SCREENS.includes(step)) return step;
    const visible = visibleQuestions(config, answers);
    if (visible.some((q)=>q.id === step)) return step;
    return visible.find((q)=>!isAnswered(answers, q.id))?.id ?? 'qualification';
}
const isTextQuestion = (q)=>TEXT_QUESTION_TYPES.includes(q.type);
const isRequired = (q)=>q.required !== false;
const isAnswered = (answers, id)=>answers[id] !== undefined;
const DEFAULT_PLACEHOLDERS = {
    short_text: 'Type your answer',
    long_text: 'Tell us a little more…',
    address: '123 Main St, Los Angeles, CA 90001',
    number: 'e.g. 1500',
    email: 'name@example.com',
    phone: '(555) 123-4567'
};
const MAX_LENGTH = {
    short_text: 200,
    long_text: 2000,
    address: 300,
    number: 20,
    email: 254,
    phone: 30
};
const MAX_ANSWER_LENGTH = 2000;
const MISSING = {
    short_text: 'Enter your answer to continue.',
    long_text: 'Enter your answer to continue.',
    address: 'Enter the property address to continue.',
    number: 'Enter a number to continue.',
    email: 'Enter your email address to continue.',
    phone: 'Enter your phone number to continue.'
};
function validateAnswer(q, raw) {
    const input = typeof raw === 'string' ? raw : '';
    if (q.type === 'choice') return q.options.some((o)=>o.value === input) ? {
        ok: true,
        value: input
    } : {
        ok: false,
        error: 'Choose one of the options.'
    };
    if (q.type === 'zip') return /^\d{5}$/.test(input) ? {
        ok: true,
        value: input
    } : {
        ok: false,
        error: 'Enter a valid five-digit ZIP code.'
    };
    const type = q.type;
    // Control characters never belong in an answer; only long text keeps line breaks.
    const value = (type === 'long_text' ? input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : input.replace(/[\u0000-\u001F\u007F]+/g, ' ')).trim();
    if (!value) return isRequired(q) ? {
        ok: false,
        error: MISSING[type]
    } : {
        ok: true,
        value: ''
    };
    if (value.length > MAX_LENGTH[type]) return {
        ok: false,
        error: `Please keep this under ${MAX_LENGTH[type]} characters.`
    };
    if (type === 'email') return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email().safeParse(value).success ? {
        ok: true,
        value: value.toLowerCase()
    } : {
        ok: false,
        error: 'Enter a valid email address.'
    };
    if (type === 'phone') return usPhone(value) ? {
        ok: true,
        value
    } : {
        ok: false,
        error: 'Enter a valid US phone number.'
    };
    if (type === 'number') {
        const numeric = value.replace(/[,\s]/g, '');
        return /^-?\d+(\.\d+)?$/.test(numeric) ? {
            ok: true,
            value: numeric
        } : {
            ok: false,
            error: 'Enter a valid number.'
        };
    }
    return {
        ok: true,
        value
    };
}
function sanitizeAnswers(config, input) {
    const result = {};
    for (const q of config.questions){
        if (!q.showWhen.every((c)=>matches(c, result))) continue;
        if (input[q.id] === undefined) continue;
        const checked = validateAnswer(q, input[q.id]);
        if (checked.ok) result[q.id] = checked.value;
    }
    return result;
}
function qualify(config, answers) {
    if (visibleQuestions(config, answers).some((q)=>!isAnswered(answers, q.id))) return null;
    const zip = answers[config.questions.find((q)=>q.type === 'zip').id];
    return inServiceArea(config, zip) && serviceAreaValid(config, zip) && config.qualificationRules.every((rule)=>matches(rule, answers));
}
function inServiceArea(config, zip) {
    // No ZIP list at all = no restriction (targeting is done in the ad platform), so every ZIP passes.
    if (!config.serviceArea.zipCodes.length && !config.serviceArea.zipPrefixes.length) return true;
    return config.serviceArea.zipCodes.includes(zip) || config.serviceArea.zipPrefixes.some((prefix)=>zip.startsWith(prefix));
}
function serviceAreaValid(config, zip) {
    // Defensive: a config object from an older cached response (e.g. mid-deploy) may
    // predate this field entirely, since it's additive and not every call site re-parses.
    const strictStates = config.serviceArea.strictStates ?? [];
    if (!strictStates.length) return true;
    const state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$location$2f$us$2d$zip$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usZipState"])(zip);
    return !!state && strictStates.includes(state);
}
function consentText(config) {
    // A HomeQuote-branded (house) funnel can share the request with partner contractors.
    const recipients = config.clientName === 'HomeQuote Network' ? 'HomeQuote Network and the contractor partners it matches me with' : `HomeQuote Network and ${config.clientName}`;
    return `I agree that ${recipients} may call, text, or email me about my project, including using automated technology. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.`;
}
// Meta's dynamic URL parameter macros (verified current as of this writing: {{campaign.id}},
// {{campaign.name}}, {{adset.id}}, {{adset.name}}, {{ad.id}}, {{ad.name}}, {{placement}},
// {{site_source_name}}) are configured in Ads Manager to append these plain query params —
// captured here alongside the existing utm_*/fbclid/gclid set, never invented client-side.
const ATTRIBUTION_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'placement',
    'site_source_name'
];
function captureAttribution(url, referrer, device) {
    const parsed = new URL(url);
    const result = {
        landing_page_url: `${parsed.origin}${parsed.pathname}`,
        device_type: device
    };
    for (const k of ATTRIBUTION_PARAMS){
        const value = parsed.searchParams.get(k);
        if (value) result[k] = value.slice(0, 500);
    }
    try {
        const r = new URL(referrer);
        result.referrer = `${r.origin}${r.pathname}`;
    } catch  {}
    return result;
}
function calendlyEmbedUrl(base, host, prefill, attribution = {}) {
    const url = new URL(base);
    url.searchParams.set('embed_domain', host);
    url.searchParams.set('embed_type', 'Inline');
    url.searchParams.set('hide_gdpr_banner', '1');
    if (prefill?.name) url.searchParams.set('name', prefill.name);
    if (prefill?.email) url.searchParams.set('email', prefill.email);
    for (const key of [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content'
    ])if (attribution[key]) url.searchParams.set(key, attribution[key]);
    return url.toString();
}
const calendlyUri = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(300).regex(/^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]+(\/invitees\/[A-Za-z0-9-]+)?$/);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/address-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Browser side of the funnel's "Home address" field: the contract with
 * POST /api/estimator/[slug]/address/{autocomplete,details} (server proxies
 * for Google Places API (New); the key never reaches the browser), and the
 * ZIP rules the contact step uses.
 *
 * The ZIP gates the service area, so it comes from the picked Google place
 * when there is one (and the text was not edited since), else from the typed
 * address ("12 Elm St, Calabasas, CA 91302").
 */ /** One Google suggestion, as the dropdown shows it. */ __turbopack_context__.s([
    "ADDRESS_MAX",
    ()=>ADDRESS_MAX,
    "AUTOCOMPLETE_INPUT_MAX",
    ()=>AUTOCOMPLETE_INPUT_MAX,
    "AUTOCOMPLETE_MIN",
    ()=>AUTOCOMPLETE_MIN,
    "addressZip",
    ()=>addressZip,
    "currentPlace",
    ()=>currentPlace,
    "extractZip",
    ()=>extractZip,
    "fetchAddressDetails",
    ()=>fetchAddressDetails,
    "fetchAddressSuggestions",
    ()=>fetchAddressSuggestions,
    "newSessionToken",
    ()=>newSessionToken
]);
const ADDRESS_MAX = 300;
const AUTOCOMPLETE_MIN = 3;
const AUTOCOMPLETE_INPUT_MAX = 200;
function extractZip(address) {
    const text = address.trim().replace(/(?:^|[\s,]+)(?:USA|US|United States)\.?$/i, '');
    const end = /(?:^|[\s,])(\d{5})(?:-\d{4})?$/.exec(text);
    // A lone number is a street number, not a ZIP ("12345").
    if (end && /[A-Za-z]/.test(text)) return end[1];
    const afterState = /\b[A-Za-z]{2}\.?\s+(\d{5})(?:-\d{4})?\b/.exec(text);
    return afterState && afterState.index > 0 ? afterState[1] : null;
}
function addressZip(address, place) {
    if (place && place.zip && place.address.trim() === address.trim()) return place.zip;
    return extractZip(address);
}
function currentPlace(address, place) {
    return place && place.address.trim() === address.trim() ? place : null;
}
function newSessionToken() {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch  {
    /* fall through */ }
    return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`.slice(0, 36);
}
async function post(url, body, signal, fetcher) {
    try {
        const res = await fetcher(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            credentials: 'same-origin',
            signal
        });
        const data = await res.json().catch(()=>null);
        if (data && typeof data === 'object' && 'ok' in data) return data;
        return {
            ok: false,
            reason: 'error'
        };
    } catch  {
        return {
            ok: false,
            reason: 'error'
        };
    }
}
function fetchAddressSuggestions(slug, input, sessionToken, opts = {}) {
    return post(`/api/estimator/${encodeURIComponent(slug)}/address/autocomplete`, {
        input: input.slice(0, AUTOCOMPLETE_INPUT_MAX),
        sessionToken
    }, opts.signal, opts.fetch ?? fetch);
}
function fetchAddressDetails(slug, placeId, sessionToken, opts = {}) {
    return post(`/api/estimator/${encodeURIComponent(slug)}/address/details`, {
        placeId,
        sessionToken
    }, opts.signal, opts.fetch ?? fetch);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ADDRESS_NEEDS_ZIP",
    ()=>ADDRESS_NEEDS_ZIP,
    "FUNNEL_FIELD_ORDER",
    ()=>FUNNEL_FIELD_ORDER,
    "LEAD_FIELD_ORDER",
    ()=>LEAD_FIELD_ORDER,
    "LEAD_TIMELINES",
    ()=>LEAD_TIMELINES,
    "describeConfiguratorDesign",
    ()=>describeConfiguratorDesign,
    "describeFunnelDesign",
    ()=>describeFunnelDesign,
    "estimatorConsentText",
    ()=>estimatorConsentText,
    "funnelContactErrors",
    ()=>funnelContactErrors,
    "funnelErrorKey",
    ()=>funnelErrorKey,
    "leadFieldErrors",
    ()=>leadFieldErrors,
    "newSubmissionId",
    ()=>newSubmissionId,
    "normalizeZip",
    ()=>normalizeZip,
    "splitFullName",
    ()=>splitFullName,
    "submitEstimatorLead",
    ()=>submitEstimatorLead,
    "usPhoneDigits",
    ()=>usPhoneDigits
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/address-client.ts [app-client] (ecmascript)");
;
;
;
;
const LEAD_TIMELINES = [
    {
        id: 'asap',
        label: 'As soon as possible'
    },
    {
        id: '1_3_months',
        label: 'Within 1–3 months'
    },
    {
        id: '3_6_months',
        label: 'Within 3–6 months'
    },
    {
        id: 'researching',
        label: 'Just researching'
    }
];
function estimatorConsentText(funnelClientName) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["consentText"])({
        clientName: funnelClientName
    });
}
function usPhoneDigits(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : null;
}
function normalizeZip(value) {
    const m = /^\s*(\d{5})(?:[\s-]?\d{4})?\s*$/.exec(value);
    return m ? m[1] : null;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEAD_FIELD_ORDER = [
    'firstName',
    'lastName',
    'phone',
    'email',
    'zip',
    'homeowner',
    'consent'
];
function leadFieldErrors(input) {
    const errors = {};
    if (!input.firstName.trim()) errors.firstName = 'Enter your first name.';
    else if (input.firstName.trim().length > 80) errors.firstName = 'Use 80 characters or fewer.';
    if (!input.lastName.trim()) errors.lastName = 'Enter your last name.';
    else if (input.lastName.trim().length > 80) errors.lastName = 'Use 80 characters or fewer.';
    const phoneDigits = input.phone.replace(/\D/g, '');
    if (!phoneDigits) errors.phone = 'Enter your phone number so we can reach you.';
    else if (phoneDigits.length < 10) errors.phone = `That number has ${phoneDigits.length} digits. Enter all 10, like (818) 555-0142.`;
    else if (!usPhoneDigits(input.phone)) {
        errors.phone = phoneDigits.length > 11 || phoneDigits.length === 11 && !phoneDigits.startsWith('1') ? 'Enter a US number: 10 digits, like (818) 555-0142.' : 'Check the number: US area codes and exchanges never start with 0 or 1.';
    }
    const email = input.email.trim();
    if (!email) errors.email = 'Enter your email address.';
    else if (!EMAIL.test(email) || email.length > 254) errors.email = 'Check your email address, e.g. name@example.com.';
    if (!input.zip.trim()) errors.zip = 'Enter the ZIP code of the property.';
    else if (!normalizeZip(input.zip)) errors.zip = 'Enter a 5-digit ZIP code, like 91302.';
    if (!input.homeowner) errors.homeowner = 'Tell us whether you own the home.';
    if (!input.consent) errors.consent = 'Please tick the box so we can contact you about your design.';
    return errors;
}
function splitFullName(value) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;
    return {
        firstName: words[0],
        lastName: words.slice(1).join(' ')
    };
}
const FUNNEL_FIELD_ORDER = [
    'name',
    'email',
    'phone',
    'address',
    'homeowner',
    'consent'
];
const ADDRESS_NEEDS_ZIP = 'Add your ZIP code to the address';
function funnelContactErrors(input, /**
   * consentOnSubmit: the consent wording sits under the button and tapping it is the
   * agreement (no checkbox), so there is no box to tick.
   */ opts = {}) {
    const { consentOnSubmit = false } = opts;
    const split = splitFullName(input.name);
    const zip = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addressZip"])(input.address, input.place) ?? '';
    const errors = leadFieldErrors({
        ...input,
        zip,
        firstName: split?.firstName ?? input.name.trim(),
        lastName: split?.lastName ?? ''
    });
    const out = {};
    if (!input.name.trim()) out.name = 'Enter your name.';
    else if (!split) out.name = 'Enter your first and last name, like Jane Smith.';
    else if (errors.firstName || errors.lastName) out.name = 'Use 80 characters or fewer for each name.';
    for (const key of [
        'email',
        'phone'
    ])if (errors[key]) out[key] = errors[key];
    const address = input.address.trim();
    if (!address) out.address = 'Enter the address of the home.';
    else if (address.length > 300) out.address = 'Use 300 characters or fewer.';
    else if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentPlace"])(input.address, input.place) && !/[A-Za-z]/.test(address)) out.address = 'Enter the street address, like 12 Elm St, Calabasas, CA 91302.';
    else if (!zip) out.address = ADDRESS_NEEDS_ZIP;
    if (errors.homeowner) out.homeowner = 'Tell us whether this pool is at your home.';
    if (!consentOnSubmit && errors.consent) out.consent = errors.consent;
    return out;
}
const funnelErrorKey = (key)=>key === 'firstName' || key === 'lastName' ? 'name' : key === 'zip' || key === 'addressDetails' ? 'address' : key;
function describeFunnelDesign(spec, selection) {
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, selection);
    const picked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pickedOptions"])(spec, sel);
    return spec.steps.map((s, i)=>`${s.label.replace(/[.?!]$/, '')}: ${picked[i].title} (${picked[i].subtitle})`);
}
function describeConfiguratorDesign(spec, selection) {
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSelection"])(spec, selection);
    const model = spec.models.find((m)=>m.id === sel.model);
    const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedRows"])(spec, sel);
    const bundle = sel.luxe && spec.bundle ? new Set(spec.bundle.rows) : null;
    const lines = [
        `Size: ${model.name}, ${model.dimensions}`
    ];
    if (bundle && spec.bundle) lines.push(`${spec.bundle.label}: yes (bundle of ${spec.bundle.includes.length || spec.bundle.rows.length} upgrades)`);
    for (const g of spec.groups){
        const picked = g.rows.filter((r)=>rows.has(r.id));
        const words = picked.map((r)=>`${r.label}${r.included ? ' (included)' : ''}${bundle?.has(r.id) ? ` (${spec.bundle.label})` : ''}`);
        lines.push(`${g.title}: ${words.length ? words.join(', ') : 'None'}`);
    }
    return lines;
}
function newSubmissionId() {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch  {
    /* fall through */ }
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
/** Message for a reply that carried no JSON (a proxy page, a crash, a cut connection). */ function statusMessage(status) {
    if (status === 413) return 'That request was too large to send. Shorten your note and try again.';
    if (status === 429) return 'Too many requests from this connection in the last hour. Please try again later, or call us.';
    if (status === 403) return 'Your browser blocked this request. Reload the page and try again.';
    if (status >= 500) return 'Our server had a problem saving that. Your details are still here: please try again.';
    return 'Something went wrong sending your request. Your details are still here: please try again.';
}
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
async function attempt(url, body, fetcher, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(()=>controller.abort(), timeoutMs) : undefined;
    try {
        const res = await fetcher(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body,
            credentials: 'same-origin',
            signal: controller?.signal
        });
        const data = await res.json().catch(()=>null);
        if (data && typeof data === 'object' && 'ok' in data) return {
            kind: 'reply',
            data
        };
        // A gateway error without our JSON is as good as no answer: worth the one retry.
        if (res.status === 502 || res.status === 504) return {
            kind: 'network'
        };
        return {
            kind: 'reply',
            data: {
                ok: false,
                errors: {
                    form: statusMessage(res.status)
                }
            }
        };
    } catch (error) {
        return {
            kind: controller?.signal.aborted || error?.name === 'AbortError' ? 'timeout' : 'network'
        };
    } finally{
        clearTimeout(timer);
    }
}
async function submitEstimatorLead(slug, request, options = {}) {
    const fetcher = options.fetch ?? fetch;
    const url = `/api/estimator/${encodeURIComponent(slug)}/lead`;
    const body = JSON.stringify({
        ...request,
        submissionId: request.submissionId ?? newSubmissionId()
    });
    // Longer than the route's maxDuration (60 s): a slow first save is answered, not raced by the retry.
    const timeoutMs = options.timeoutMs ?? 65_000;
    let result = await attempt(url, body, fetcher, timeoutMs);
    if (result.kind !== 'reply') {
        await sleep(options.retryDelayMs ?? 900);
        result = await attempt(url, body, fetcher, timeoutMs);
    }
    if (result.kind === 'reply') return result.data;
    return {
        ok: false,
        errors: {
            form: result.kind === 'timeout' ? 'This is taking too long, probably a slow connection. Your details are still here: please try again.' : 'We couldn’t reach our server. Check your connection, then try again. Your details are still here.'
        }
    };
}
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
"[project]/components/estimator/funnel/contact/address-field.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AddressField",
    ()=>AddressField
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/address-client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
/**
 * The contact step's "Home address" field with Google address suggestions
 * (Buildoly's dropdown: white, 1px #d0d0d0, 8px radius, 48px rows) through our
 * own proxy routes, so the key never reaches the browser. ARIA combobox +
 * listbox: arrows move, Return picks, Escape / leaving the field closes.
 * Picking a suggestion fills the full formatted address and keeps the place
 * (ZIP, city, state, lat/lng); typing again drops it (the typed ZIP then counts).
 *
 * Without a key on the server (preview, local) the first request answers
 * 'disabled' and this is a plain address input from then on: iOS / browser
 * autofill (autocomplete="street-address") still works. The list overlays the
 * page (no layout shift) and, on a phone, the field scrolls to the top when
 * focused so the keyboard never covers the list.
 */ const DEBOUNCE_MS = 200;
/** The routes said there is nothing to ask (no key / blocked / over the limit): stop asking for this page view. */ const STOP = new Set([
    'disabled',
    'forbidden',
    'not_found',
    'limit'
]);
function AddressField({ slug, id, label, value, onChange, onBlur, onKeyDown, invalid, describedBy, className, enterKeyHint = 'next', labelClassName }) {
    _s();
    const listId = `${id}-list`;
    const [suggestions, setSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [active, setActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [off, setOff] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const seq = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const abort = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Only typing asks Google; a picked address (or a restored draft) does not.
    const typed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const focused = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // A pick is being resolved: leaving the field now must not flag the half-filled text.
    const resolving = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const blurTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AddressField.useEffect": ()=>{
            if (off || !typed.current) return;
            const input = value.trim();
            if (input.length < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AUTOCOMPLETE_MIN"]) {
                abort.current?.abort();
                setSuggestions([]);
                setOpen(false);
                return;
            }
            const t = window.setTimeout({
                "AddressField.useEffect.t": async ()=>{
                    abort.current?.abort();
                    const controller = new AbortController();
                    abort.current = controller;
                    const n = ++seq.current;
                    token.current ??= (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["newSessionToken"])();
                    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchAddressSuggestions"])(slug, input, token.current, {
                        signal: controller.signal
                    });
                    if (n !== seq.current) return;
                    if (!res.ok) {
                        if (STOP.has(res.reason)) setOff(true);
                        setSuggestions([]);
                        setOpen(false);
                        return;
                    }
                    setSuggestions(res.suggestions);
                    setActive(-1);
                    setOpen(focused.current && typed.current && res.suggestions.length > 0);
                }
            }["AddressField.useEffect.t"], DEBOUNCE_MS);
            return ({
                "AddressField.useEffect": ()=>window.clearTimeout(t)
            })["AddressField.useEffect"];
        }
    }["AddressField.useEffect"], [
        value,
        slug,
        off
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AddressField.useEffect": ()=>({
                "AddressField.useEffect": ()=>{
                    abort.current?.abort();
                    window.clearTimeout(blurTimer.current);
                }
            })["AddressField.useEffect"]
    }["AddressField.useEffect"], []);
    const close = ()=>{
        setOpen(false);
        setActive(-1);
    };
    const pick = async (s)=>{
        const shown = [
            s.main,
            s.secondary
        ].filter(Boolean).join(', ').slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ADDRESS_MAX"]);
        typed.current = false;
        seq.current++;
        abort.current?.abort();
        close();
        setSuggestions([]);
        onChange(shown, null);
        const session = token.current ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["newSessionToken"])();
        // The pick ends this billing session; the next search starts a new one.
        token.current = null;
        resolving.current = true;
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchAddressDetails"])(slug, s.placeId, session);
        resolving.current = false;
        // Only if the field still shows what we filled in (they may have kept typing).
        if (!res.ok || inputRef.current?.value !== shown) {
            if (!focused.current) onBlur?.();
            return;
        }
        const place = {
            address: res.address,
            zip: res.zip,
            city: res.city,
            state: res.state,
            lat: res.lat,
            lng: res.lng
        };
        onChange(res.address, place);
    };
    const onKey = (e)=>{
        if (open && suggestions.length) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a)=>(a + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a)=>a <= 0 ? suggestions.length - 1 : a - 1);
                return;
            }
            if (e.key === 'Enter' && active >= 0) {
                e.preventDefault();
                void pick(suggestions[active]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
                return;
            }
        } else if (e.key === 'ArrowDown' && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive(0);
            return;
        }
        onKeyDown?.(e);
    };
    const showList = open && !off && suggestions.length > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                id: id,
                "data-field": "address",
                "data-text": "",
                name: "address",
                type: "text",
                role: "combobox",
                "aria-autocomplete": "list",
                "aria-expanded": showList,
                "aria-controls": listId,
                "aria-activedescendant": showList && active >= 0 ? `${listId}-${active}` : undefined,
                "aria-invalid": invalid || undefined,
                "aria-describedby": describedBy,
                autoComplete: "street-address",
                autoCapitalize: "words",
                autoCorrect: "off",
                spellCheck: false,
                enterKeyHint: enterKeyHint,
                maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ADDRESS_MAX"],
                placeholder: " ",
                value: value,
                onChange: (e)=>{
                    typed.current = true;
                    onChange(e.target.value, null);
                },
                onFocus: (e)=>{
                    focused.current = true;
                    window.clearTimeout(blurTimer.current);
                    // Never reopen old suggestions on focus (e.g. focus moved here by an error): the next keystroke asks again.
                    // Phones: lift the field to the top so the keyboard never covers the list.
                    const el = e.currentTarget;
                    try {
                        if (window.matchMedia('(pointer: coarse)').matches) {
                            window.setTimeout(()=>el.scrollIntoView({
                                    block: 'start',
                                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
                                }), 300);
                        }
                    } catch  {
                    /* old browsers: no scroll */ }
                },
                onBlur: ()=>{
                    focused.current = false;
                    // Leaving the field drops any search still on its way (it must not pop open later).
                    typed.current = false;
                    seq.current++;
                    abort.current?.abort();
                    // A short delay: a tap on a suggestion that still blurred the field (some touch browsers) lands first.
                    window.clearTimeout(blurTimer.current);
                    blurTimer.current = window.setTimeout(()=>{
                        if (focused.current) return;
                        close();
                        setSuggestions([]);
                        if (!resolving.current) onBlur?.();
                    }, 120);
                },
                onKeyDown: onKey,
                className: `${className} scroll-mt-3`
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                className: labelClassName,
                children: label
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                lineNumber: 226,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: showList ? 'absolute inset-x-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[8px] border border-[#d0d0d0] bg-white shadow-[0_8px_24px_rgb(0_0_0/0.12)]' : 'hidden',
                "data-address-list": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        id: listId,
                        role: "listbox",
                        "aria-label": "Address suggestions",
                        children: showList ? suggestions.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                id: `${listId}-${i}`,
                                role: "option",
                                "aria-selected": i === active,
                                // Keep the focus in the field (no blur before the pick), for mouse and touch alike.
                                onPointerDown: (e)=>e.preventDefault(),
                                onMouseDown: (e)=>e.preventDefault(),
                                onClick: ()=>void pick(s),
                                onMouseEnter: ()=>setActive(i),
                                className: `flex h-12 cursor-pointer touch-manipulation flex-col justify-center border-b border-[#ececec] px-[15px] last:border-b-0 ${i === active ? 'bg-[#f2f4f7]' : 'bg-white'}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "truncate text-[15px] leading-[19px] text-[var(--fn-ink)]",
                                        children: s.main
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                                        lineNumber: 248,
                                        columnNumber: 19
                                    }, this),
                                    s.secondary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "truncate text-[13px] leading-[17px] text-[var(--fn-muted)]",
                                        children: s.secondary
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                                        lineNumber: 249,
                                        columnNumber: 34
                                    }, this) : null
                                ]
                            }, s.placeId, true, {
                                fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                                lineNumber: 236,
                                columnNumber: 17
                            }, this)) : null
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                        lineNumber: 233,
                        columnNumber: 9
                    }, this),
                    showList ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "border-t border-[#ececec] px-[15px] py-1.5 text-right text-[11px] leading-[14px] text-[var(--fn-muted)]",
                        "aria-hidden": "true",
                        children: "Powered by Google"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                        lineNumber: 255,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                lineNumber: 229,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "sr-only",
                "aria-live": "polite",
                children: showList ? `${suggestions.length} address${suggestions.length === 1 ? '' : 'es'} found. Use the arrow keys to choose.` : ''
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
                lineNumber: 260,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/contact/address-field.tsx",
        lineNumber: 167,
        columnNumber: 5
    }, this);
}
_s(AddressField, "wI5Yqv90jK3AGn6gOwTAln9kk1Q=");
_c = AddressField;
var _c;
__turbopack_context__.k.register(_c, "AddressField");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/contact/state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearContactDraft",
    ()=>clearContactDraft,
    "emptyFunnelFields",
    ()=>emptyFunnelFields,
    "firstInvalid",
    ()=>firstInvalid,
    "formErrors",
    ()=>formErrors,
    "funnelLeadRequest",
    ()=>funnelLeadRequest,
    "loadContactDraft",
    ()=>loadContactDraft,
    "placeErrors",
    ()=>placeErrors,
    "saveContactDraft",
    ()=>saveContactDraft
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/address-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
;
;
;
const emptyFunnelFields = ()=>({
        name: '',
        email: '',
        phone: '',
        address: '',
        place: null,
        homeowner: '',
        consent: false,
        website: ''
    });
const FIELD_KEYS = new Set(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FUNNEL_FIELD_ORDER"]);
function placeErrors(errors) {
    const out = {};
    for (const [key, message] of Object.entries(errors)){
        const k = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelErrorKey"])(key);
        if (!out[k]) out[k] = message;
    }
    return out;
}
function firstInvalid(errors) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FUNNEL_FIELD_ORDER"].find((k)=>errors[k]) ?? null;
}
function formErrors(errors) {
    return Object.entries(errors).filter(([k])=>!FIELD_KEYS.has(k)).map(([, m])=>m);
}
function funnelLeadRequest(input) {
    const { spec, fields } = input;
    const selection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, input.selection);
    const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["splitFullName"])(fields.name) ?? {
        firstName: fields.name.trim(),
        lastName: ''
    };
    const address = fields.address.trim();
    const place = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentPlace"])(fields.address, fields.place);
    return {
        answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelAnswers"])(spec, selection),
        funnel: selection,
        // From the picked Google place, else the typed address (the form checked there is one).
        zip: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$address$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addressZip"])(fields.address, fields.place) ?? '',
        address: address.slice(0, 300),
        ...place ? {
            addressDetails: {
                verified: true,
                ...place.city ? {
                    city: place.city
                } : {},
                ...place.state ? {
                    state: place.state
                } : {},
                ...place.lat !== null && place.lng !== null ? {
                    lat: place.lat,
                    lng: place.lng
                } : {}
            }
        } : {},
        // Always the visitor's own answer (the form requires it; an empty one is refused by the server, never assumed).
        homeowner: fields.homeowner,
        contact: {
            firstName: name.firstName,
            lastName: name.lastName,
            email: fields.email.trim(),
            phone: fields.phone.trim(),
            // Agree-on-submit: the wording sits under the button, so sending is the agreement.
            consent: input.consentOnSubmit ? true : fields.consent,
            website: fields.website
        },
        consentText: input.consentText,
        measurement: input.measurement
    };
}
/* ------------------------------------------------------------------ */ /* sessionStorage (per tab; every access guarded)                      */ /* ------------------------------------------------------------------ */ const draftKey = (slug)=>`hq-funnel-contact:${slug}`;
function read(key) {
    try {
        const raw = window.sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch  {
        return null;
    }
}
function write(key, value) {
    try {
        if (value === null) window.sessionStorage.removeItem(key);
        else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch  {
    /* private mode or full: the page still works */ }
}
const str = (v, max)=>typeof v === 'string' ? v.slice(0, max) : '';
function loadContactDraft(slug) {
    const d = read(draftKey(slug));
    if (!d || typeof d !== 'object') return null;
    const o = d;
    return {
        name: str(o.name, 200),
        email: str(o.email, 254),
        phone: str(o.phone, 30),
        address: str(o.address, 300),
        place: readPlace(o.place),
        homeowner: o.homeowner === 'yes' || o.homeowner === 'no' ? o.homeowner : ''
    };
}
function readPlace(v) {
    if (!v || typeof v !== 'object') return null;
    const p = v;
    const num = (n, max)=>typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max ? n : null;
    const address = str(p.address, 300);
    if (!address) return null;
    return {
        address,
        zip: typeof p.zip === 'string' && /^\d{5}$/.test(p.zip) ? p.zip : null,
        city: str(p.city, 80) || null,
        state: typeof p.state === 'string' && /^[A-Z]{2}$/.test(p.state) ? p.state : null,
        lat: num(p.lat, 90),
        lng: num(p.lng, 180)
    };
}
function saveContactDraft(slug, fields) {
    const { name, email, phone, address, place, homeowner } = fields;
    write(draftKey(slug), {
        name,
        email,
        phone,
        address,
        place,
        homeowner
    });
}
const clearContactDraft = (slug)=>write(draftKey(slug), null);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/contact/funnel-contact.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelContactScreen",
    ()=>FunnelContactScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/booking-state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/lead-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$address$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/contact/address-field.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/contact/state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
/**
 * The funnel's contact step: "Your estimate is ready. / Where should we send it?"
 * Buildoly's shape: name, email, phone, home address (Google suggestions via
 * ./address-field; its ZIP gates the service area), then "Are you the
 * homeowner?" (Yes / No: the lead's homeowner answer, always
 * asked, never assumed), then the button, with the consent wording in small
 * print right under it: tapping the button is the agreement (agree-on-submit;
 * the lead route still checks the exact wording). Then the lead POST with the picks.
 * The server prices the picks and answers with the estimate; onSuccess hands it
 * to the shell (onDone), which stores it and opens the booking screen.
 *
 * Built so the first submit goes through: one specific message at a time (the
 * first field to fix gets it and the focus; a field is also checked when left),
 * Return moves to the next field and only the last one submits, everything typed is kept (and survives a reload), one
 * automatic retry on a network error with the same submission id (never two
 * leads), the button locked while sending, a changed consent wording shown in place.
 *
 * Draws only its content column from the heading down (props: ../screens.ts);
 * the shell draws "LAST STEP", the back arrow, the gutters and the footer, and
 * moves focus to the heading (headingId).
 */ /** Page URL (UTMs for attribution) and, only with measurement allowed, the Meta browser ids. */ function readTracking(measurement) {
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
const fieldBase = 'peer block h-14 w-full rounded-[8px] border bg-white px-[15px] pb-[7px] pt-[23px] text-[16px] leading-[22px] text-[var(--fn-ink)] outline-none transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none';
const fieldOk = 'border-[var(--fn-line)] focus:border-[var(--fn-blue)] focus:shadow-[0_0_0_1px_var(--fn-blue)]';
const fieldBad = 'border-[#c4281c] focus:shadow-[0_0_0_1px_#c4281c]';
function FunnelContactScreen({ slug, spec, selection, contractor, headingId, onDone, onOpenSent }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const step = spec.contactStep;
    const rules = {
        consentOnSubmit: true
    };
    const [fields, setFields] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emptyFunnelFields"]);
    // The latest fields for checks that run after an await (a resolved address pick).
    const fieldsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(fields);
    fieldsRef.current = fields;
    // Pre-ticked unless the contractor is set to opt_in (the owner's call); the visitor can still untick it.
    const [measurement, setMeasurement] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(contractor.adMeasurement !== 'opt_in');
    const [consentWording, setConsentWording] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "FunnelContactScreen.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimatorConsentText"])(contractor.contractorName)
    }["FunnelContactScreen.useState"]);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [sending, setSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [focusTick, setFocusTick] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const sendingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const formRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Saving the draft starts only after it was restored, so the empty first render never overwrites it.
    const [ready, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // One id per picks + details: a retry (ours or theirs) of the same submission is answered once.
    const submission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Restore a draft after mount (no hydration mismatch; fixed-height fields, so nothing moves).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelContactScreen.useEffect": ()=>{
            const draft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadContactDraft"])(slug);
            if (draft) setFields({
                "FunnelContactScreen.useEffect": (f)=>({
                        ...f,
                        ...draft
                    })
            }["FunnelContactScreen.useEffect"]);
            setReady(true);
        }
    }["FunnelContactScreen.useEffect"], [
        slug
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelContactScreen.useEffect": ()=>{
            if (ready) (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveContactDraft"])(slug, fields);
        }
    }["FunnelContactScreen.useEffect"], [
        slug,
        fields,
        ready
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelContactScreen.useEffect": ()=>{
            if (!focusTick) return;
            const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["firstInvalid"])(errors);
            const el = key ? formRef.current?.querySelector(`[data-field="${key}"]`) : formRef.current?.querySelector('[data-form-error]');
            el?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only after a submit attempt
        }
    }["FunnelContactScreen.useEffect"], [
        focusTick
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
        const local = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelContactErrors"])(fields, rules);
        const first = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["firstInvalid"])(local);
        if (first) {
            // One message at a time, on the field that gets the focus: never a wall of red.
            setErrors({
                [first]: local[first]
            });
            setFocusTick((n)=>n + 1);
            return;
        }
        sendingRef.current = true;
        setSending(true);
        setErrors({});
        const draft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelLeadRequest"])({
            spec,
            selection,
            fields,
            consentText: consentWording,
            measurement,
            consentOnSubmit: true
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
            setReady(false);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearContactDraft"])(slug);
            onDone({
                estimate: res.estimate,
                qualified: res.qualified,
                calendarUrl: res.calendarUrl,
                ...res.bookingTicket ? {
                    bookingTicket: res.bookingTicket
                } : {},
                contact: {
                    firstName: draft.contact.firstName,
                    lastName: draft.contact.lastName,
                    email: draft.contact.email
                },
                selection: draft.funnel,
                saved: res.saved,
                homeowner: draft.homeowner
            });
            return;
        }
        if (res.consentText) {
            // The wording changed since the page loaded: show the new one; the next tap agrees to it.
            setConsentWording(res.consentText);
        }
        setErrors((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["placeErrors"])(res.errors));
        setFocusTick((n)=>n + 1);
    };
    /** Leaving a field that has something in it checks just that field (an empty one waits for the submit). */ const check = (key, value)=>{
        if (!value.trim()) return;
        const message = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$lead$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelContactErrors"])({
            ...fieldsRef.current,
            [key]: value
        }, rules)[key];
        setErrors((e)=>{
            if ((e[key] ?? undefined) === message) return e;
            const next = {
                ...e
            };
            if (message) next[key] = message;
            else delete next[key];
            return next;
        });
    };
    /** The keyboard says "Next": go to the next field instead of submitting the form (after the last one, close the keyboard). */ const onEnter = (e)=>{
        if (e.key !== 'Enter' || e.currentTarget.enterKeyHint !== 'next') return;
        e.preventDefault();
        const inputs = Array.from(formRef.current?.querySelectorAll('input[data-text]') ?? []);
        const next = inputs[inputs.indexOf(e.currentTarget) + 1];
        if (next) next.focus();
        else e.currentTarget.blur();
    };
    const general = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formErrors"])(errors);
    const err = (key)=>errors[key];
    const labelClass = 'pointer-events-none absolute left-[16px] top-[17px] origin-left text-[16px] leading-[22px] text-[var(--fn-muted)] transition-transform duration-150 ease-out peer-focus:-translate-y-[10px] peer-focus:scale-[0.75] peer-[:not(:placeholder-shown)]:-translate-y-[10px] peer-[:not(:placeholder-shown)]:scale-[0.75] motion-reduce:transition-none';
    const text = (key, label, extra)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            id: `${uid}-${key}`,
                            "data-field": key,
                            "data-text": "",
                            name: key,
                            value: fields[key],
                            placeholder: " ",
                            onChange: (e)=>set(key, e.target.value),
                            onKeyDown: onEnter,
                            onBlur: ()=>{
                                if (key === 'phone') {
                                    const tidy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tidyPhone"])(fields.phone);
                                    if (tidy !== fields.phone) set('phone', tidy);
                                    check('phone', tidy);
                                } else check(key, fields[key]);
                            },
                            enterKeyHint: "next",
                            "aria-invalid": err(key) ? true : undefined,
                            "aria-describedby": err(key) ? `${uid}-${key}-e` : undefined,
                            className: `${fieldBase} ${err(key) ? fieldBad : fieldOk}`,
                            ...extra
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                            lineNumber: 187,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            htmlFor: `${uid}-${key}`,
                            className: labelClass,
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                            lineNumber: 209,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                    lineNumber: 186,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                    id: `${uid}-${key}-e`,
                    children: err(key)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                    lineNumber: 213,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
            lineNumber: 185,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full",
        "data-funnel-contact": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                id: headingId,
                tabIndex: -1,
                className: "fn-h1 outline-none",
                children: [
                    step.headline,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block text-pretty text-[var(--fn-muted-strong)]",
                        children: step.subline
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 221,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                lineNumber: 219,
                columnNumber: 7
            }, this),
            onOpenSent ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onOpenSent,
                className: "mt-5 flex w-full touch-manipulation items-center justify-between gap-3 rounded-[8px] bg-white px-[15px] py-3 text-left text-[15px] leading-5 text-[var(--fn-text)] shadow-[0_0_0_1px_var(--fn-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-focus)]",
                "data-funnel-sent": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "You’ve already sent this design."
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 231,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "inline-flex shrink-0 items-center gap-1 font-medium text-[color:var(--fn-blue-ink)]",
                        children: [
                            "See your estimate ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                "aria-hidden": "true",
                                className: "size-4"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 233,
                                columnNumber: 31
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 232,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                lineNumber: 225,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                ref: formRef,
                onSubmit: submit,
                noValidate: true,
                className: "mt-6",
                "data-funnel-contact-form": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3",
                        children: [
                            text('name', 'Name', {
                                type: 'text',
                                autoComplete: 'name',
                                autoCapitalize: 'words',
                                maxLength: 160
                            }),
                            text('email', 'Email', {
                                type: 'email',
                                autoComplete: 'email',
                                inputMode: 'email',
                                autoCapitalize: 'none',
                                autoCorrect: 'off',
                                spellCheck: false,
                                maxLength: 254
                            }),
                            text('phone', 'Phone number', {
                                type: 'tel',
                                autoComplete: 'tel',
                                inputMode: 'tel',
                                maxLength: 30
                            }),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$address$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AddressField"], {
                                        slug: slug,
                                        id: `${uid}-address`,
                                        label: "Home address",
                                        value: fields.address,
                                        onChange: (value, place)=>{
                                            setFields((f)=>({
                                                    ...f,
                                                    address: value,
                                                    place
                                                }));
                                            if (errors.address) {
                                                setErrors((e)=>{
                                                    const next = {
                                                        ...e
                                                    };
                                                    delete next.address;
                                                    return next;
                                                });
                                            }
                                        },
                                        onBlur: ()=>check('address', fieldsRef.current.address),
                                        onKeyDown: onEnter,
                                        invalid: !!err('address'),
                                        describedBy: err('address') ? `${uid}-address-e` : undefined,
                                        // The last text field: "Go" once the ownership question is answered, else Return just closes the keyboard.
                                        enterKeyHint: fields.homeowner ? 'go' : 'next',
                                        className: `${fieldBase} ${err('address') ? fieldBad : fieldOk}`,
                                        labelClassName: labelClass
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                        lineNumber: 252,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                                        id: `${uid}-address-e`,
                                        children: err('address')
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                        lineNumber: 276,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 251,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 239,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
                        className: "mt-4",
                        "aria-describedby": err('homeowner') ? `${uid}-homeowner-e` : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                                className: "text-[15px] font-medium leading-5 text-[var(--fn-ink)]",
                                children: step.homeowner.label
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 281,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 grid grid-cols-2 gap-2",
                                children: [
                                    [
                                        'yes',
                                        step.homeowner.yes
                                    ],
                                    [
                                        'no',
                                        step.homeowner.no
                                    ]
                                ].map(([value, label], i)=>{
                                    const on = fields.homeowner === value;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        "data-selected": on || undefined,
                                        "data-homeowner": value,
                                        // The error border inline: .es-fn .fn-option's own border outranks a utility class.
                                        style: err('homeowner') && !on ? {
                                            borderColor: '#c4281c'
                                        } : undefined,
                                        className: "fn-option flex h-12 items-center justify-center px-2 text-center text-[15px] font-medium leading-5 text-[var(--fn-ink)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "radio",
                                                name: `${slug}-homeowner`,
                                                value: value,
                                                checked: on,
                                                onChange: ()=>set('homeowner', value),
                                                "data-field": i === 0 ? 'homeowner' : undefined,
                                                className: "sr-only"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                                lineNumber: 299,
                                                columnNumber: 19
                                            }, this),
                                            label
                                        ]
                                    }, value, true, {
                                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                        lineNumber: 291,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 282,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldError, {
                                id: `${uid}-homeowner-e`,
                                children: err('homeowner')
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 313,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 280,
                        columnNumber: 9
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
                                    fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                    lineNumber: 320,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                            lineNumber: 318,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 317,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "alert",
                        "aria-live": "assertive",
                        className: "mt-4 empty:mt-0",
                        children: general.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                "data-form-error": "",
                                tabIndex: -1,
                                className: "rounded-[8px] border border-[#f1c9c4] bg-[#fdf3f2] px-[15px] py-3 text-[14px] leading-5 text-[#8a1c12] outline-none",
                                children: message
                            }, message, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 326,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 324,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        disabled: sending,
                        "aria-busy": sending || undefined,
                        "aria-describedby": `${uid}-consent`,
                        className: "fn-btn mt-5 h-12 w-full gap-2 px-4 text-[17px] disabled:cursor-wait lg:h-[52px] lg:text-[18px]",
                        children: [
                            sending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                "aria-hidden": "true",
                                className: "size-[18px] animate-spin motion-reduce:animate-none"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 344,
                                columnNumber: 22
                            }, this) : null,
                            sending ? 'Getting your estimate…' : step.cta
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 337,
                        columnNumber: 9
                    }, this),
                    step.trustLine ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-3 text-[14px] leading-5 text-[var(--fn-muted)]",
                        children: step.trustLine
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 347,
                        columnNumber: 27
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        id: `${uid}-consent`,
                        className: "mt-4 text-[12px] leading-[17px] text-[var(--fn-muted)]",
                        "data-funnel-consent": "",
                        children: [
                            "By tapping “",
                            step.cta,
                            "”: ",
                            consentWording
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 350,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "-ml-2 mt-0.5 flex flex-wrap items-center text-[12px] leading-[17px] text-[var(--fn-muted)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/privacy",
                                target: "_blank",
                                rel: "noreferrer",
                                className: "inline-flex min-h-8 items-center px-2 underline underline-offset-2",
                                children: "Privacy"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 354,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                children: "·"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 357,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/terms",
                                target: "_blank",
                                rel: "noreferrer",
                                className: "inline-flex min-h-8 items-center px-2 underline underline-offset-2",
                                children: "Terms"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 358,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                children: "·"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 361,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "inline-flex min-h-8 cursor-pointer touch-manipulation items-center gap-1.5 px-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: measurement,
                                        onChange: (e)=>setMeasurement(e.target.checked),
                                        className: "size-3.5 shrink-0 accent-[color:var(--fn-blue)]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                        lineNumber: 363,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Allow optional ad measurement"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                        lineNumber: 369,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                                lineNumber: 362,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                        lineNumber: 353,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
                lineNumber: 238,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
        lineNumber: 218,
        columnNumber: 5
    }, this);
}
_s(FunnelContactScreen, "Yq9G73cE22hnmMreTzZ7vLRpo8o=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = FunnelContactScreen;
function FieldError({ id, children, className = '' }) {
    if (!children) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        id: id,
        className: `mt-1.5 text-[13.5px] font-medium leading-[18px] text-[#c4281c] ${className}`,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/estimator/funnel/contact/funnel-contact.tsx",
        lineNumber: 380,
        columnNumber: 5
    }, this);
}
_c1 = FieldError;
var _c, _c1;
__turbopack_context__.k.register(_c, "FunnelContactScreen");
__turbopack_context__.k.register(_c1, "FieldError");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/booking/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Display helpers for booking times. Hosts see the calendar's zone; homeowners
 * see their browser's zone. Always show the zone so nobody guesses.
 */ __turbopack_context__.s([
    "formatDayHeading",
    ()=>formatDayHeading,
    "formatForHomeowner",
    ()=>formatForHomeowner,
    "formatForHost",
    ()=>formatForHost,
    "formatRange",
    ()=>formatRange,
    "formatSlot",
    ()=>formatSlot,
    "formatTime",
    ()=>formatTime,
    "safeTimeZone",
    ()=>safeTimeZone,
    "zoneAbbreviation",
    ()=>zoneAbbreviation
]);
const cache = new Map();
function fmt(timeZone, opts) {
    const key = `${timeZone}|${JSON.stringify(opts)}`;
    let f = cache.get(key);
    if (!f) {
        f = new Intl.DateTimeFormat('en-US', {
            timeZone,
            ...opts
        });
        cache.set(key, f);
    }
    return f;
}
function safeTimeZone(timeZone, fallback = 'America/Los_Angeles') {
    if (!timeZone) return fallback;
    try {
        new Intl.DateTimeFormat('en-US', {
            timeZone
        });
        return timeZone;
    } catch  {
        return fallback;
    }
}
function zoneAbbreviation(ms, timeZone) {
    const part = fmt(timeZone, {
        timeZoneName: 'short'
    }).formatToParts(new Date(ms)).find((p)=>p.type === 'timeZoneName');
    return part?.value ?? timeZone;
}
function formatTime(ms, timeZone) {
    return fmt(timeZone, {
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(ms));
}
function formatDayHeading(ms, timeZone) {
    return fmt(timeZone, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    }).format(new Date(ms));
}
function formatSlot(ms, timeZone) {
    const day = fmt(timeZone, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).format(new Date(ms));
    return `${day} · ${formatTime(ms, timeZone)} ${zoneAbbreviation(ms, timeZone)}`;
}
function formatRange(startMs, endMs, timeZone) {
    return `${formatTime(startMs, timeZone)} – ${formatTime(endMs, timeZone)} ${zoneAbbreviation(startMs, timeZone)}`;
}
function formatForHost(ms, calendarTimeZone) {
    return formatSlot(ms, safeTimeZone(calendarTimeZone));
}
function formatForHomeowner(ms, inviteeTimeZone, calendarTimeZone) {
    return formatSlot(ms, safeTimeZone(inviteeTimeZone, safeTimeZone(calendarTimeZone)));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/calendar-links.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * "Add to calendar" for a booked call: the event text and Google's prefilled
 * add-event link. Pure (no I/O), shared by the confirmation UI and the .ics
 * route so both describe the call the same way.
 */ __turbopack_context__.s([
    "callDetails",
    ()=>callDetails,
    "callTitle",
    ()=>callTitle,
    "capitalize",
    ()=>capitalize,
    "googleCalendarLink",
    ()=>googleCalendarLink
]);
const stamp = (ms)=>new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function callTitle(b) {
    const how = b.meetingType === 'video' ? 'Video call' : b.meetingType === 'in_person' ? 'Meeting' : 'Phone call';
    return `${how} with ${b.hostName}`;
}
function callDetails(b, manageAbsoluteUrl) {
    const how = b.meetingType === 'video' ? b.videoLink ? `Join the video call: ${b.videoLink}` : 'We will send the video link before the call.' : `${capitalize(b.hostName)} will call you${b.phoneHint ? ` at the number ending ${b.phoneHint}` : ''}.`;
    return [
        `${b.durationMinutes}-minute call. ${how}`,
        manageAbsoluteUrl ? `Reschedule or cancel: ${manageAbsoluteUrl}` : null
    ].filter(Boolean).join('\n');
}
function googleCalendarLink(b, origin) {
    const q = new URLSearchParams({
        action: 'TEMPLATE',
        text: callTitle(b),
        dates: `${stamp(Date.parse(b.startsAt))}/${stamp(Date.parse(b.endsAt))}`,
        details: callDetails(b, b.manageUrl ? `${origin}${b.manageUrl}` : null),
        location: b.meetingType === 'video' && b.videoLink ? b.videoLink : 'Phone call'
    });
    return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
const capitalize = (s)=>s ? s[0].toUpperCase() + s.slice(1) : s;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/call-summary.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AddToCalendar",
    ()=>AddToCalendar,
    "CallHow",
    ()=>CallHow,
    "CallTime",
    ()=>CallTime,
    "ViewHeading",
    ()=>ViewHeading
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-plus.js [app-client] (ecmascript) <export default as CalendarPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/video.js [app-client] (ecmascript) <export default as Video>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$calendar$2d$links$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/calendar-links.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function CallTime({ startsAt, endsAt, timeZone, struck = false }) {
    const start = Date.parse(startsAt);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: struck ? 'text-[var(--bk-muted)] line-through decoration-1' : undefined,
        "data-booking-time": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "block text-[22px] font-[550] leading-[28px] tracking-[-0.015em] text-inherit",
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDayHeading"])(start, timeZone)
            }, void 0, false, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "mt-0.5 block text-[17px] leading-[24px] tabular-nums text-[var(--bk-text)]",
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(start, Date.parse(endsAt), timeZone)
            }, void 0, false, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/call-summary.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c = CallTime;
function CallHow({ meetingType, hostName, durationMinutes, phoneHint, videoLink }) {
    const video = meetingType === 'video';
    const Icon = video ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__["Video"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "bk-copy flex gap-3 text-[15.5px] leading-[23px] text-[var(--bk-text)]",
        "data-booking-how": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                "aria-hidden": true,
                className: "mt-[3px] size-[17px] shrink-0 text-[var(--bk-muted)]",
                strokeWidth: 2
            }, void 0, false, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: [
                    "A ",
                    durationMinutes,
                    "-minute ",
                    video ? 'video' : 'phone',
                    " call with ",
                    hostName,
                    ".",
                    ' ',
                    video ? videoLink ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            "Join at ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                className: "font-medium text-[var(--bk-accent-ink)] underline underline-offset-2",
                                href: videoLink,
                                rel: "noreferrer",
                                target: "_blank",
                                children: videoLink.replace(/^https:\/\//, '')
                            }, void 0, false, {
                                fileName: "[project]/components/booking/call-summary.tsx",
                                lineNumber: 38,
                                columnNumber: 35
                            }, this),
                            "."
                        ]
                    }, void 0, true) : 'You’ll get the video link before the call.' : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$calendar$2d$links$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["capitalize"])(pronoun(hostName)),
                            " will call you",
                            phoneHint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    " at the number ending ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "tabular-nums",
                                        children: phoneHint
                                    }, void 0, false, {
                                        fileName: "[project]/components/booking/call-summary.tsx",
                                        lineNumber: 39,
                                        columnNumber: 97
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            "."
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/call-summary.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c1 = CallHow;
/** "a HomeQuote project specialist" -> "we"; a company -> "they". */ const pronoun = (hostName)=>/^a /.test(hostName) || hostName === 'HomeQuote' ? 'we' : 'they';
function AddToCalendar({ booking }) {
    _s();
    const [origin, setOrigin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AddToCalendar.useEffect": ()=>setOrigin(window.location.origin)
    }["AddToCalendar.useEffect"], []);
    if (!booking.icsUrl || booking.status !== 'scheduled') return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-2.5",
        "data-booking-add-to-calendar": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "bk-secondary w-full",
                href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$calendar$2d$links$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["googleCalendarLink"])(booking, origin),
                target: "_blank",
                rel: "noreferrer",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__["CalendarPlus"], {
                        "aria-hidden": true,
                        className: "size-[17px]",
                        strokeWidth: 2
                    }, void 0, false, {
                        fileName: "[project]/components/booking/call-summary.tsx",
                        lineNumber: 56,
                        columnNumber: 9
                    }, this),
                    "Add to Google Calendar"
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "bk-secondary w-full",
                href: booking.icsUrl,
                download: "call.ics",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__["CalendarPlus"], {
                        "aria-hidden": true,
                        className: "size-[17px]",
                        strokeWidth: 2
                    }, void 0, false, {
                        fileName: "[project]/components/booking/call-summary.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    "Add to Apple or Outlook"
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/call-summary.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/call-summary.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
_s(AddToCalendar, "iZsSUaLaA5Z8uTZkJMG/7SFVfeI=");
_c2 = AddToCalendar;
function ViewHeading({ children, level = 2, headingRef, id }) {
    const H = `h${level}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(H, {
        ref: headingRef,
        id: id,
        tabIndex: -1,
        className: "bk-heading text-[clamp(24px,6.6vw,28px)] font-[550] leading-[1.15] tracking-[-0.02em] text-[var(--bk-ink)] outline-none",
        children: children
    }, void 0, false, {
        fileName: "[project]/components/booking/call-summary.tsx",
        lineNumber: 71,
        columnNumber: 5
    }, this);
}
_c3 = ViewHeading;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "CallTime");
__turbopack_context__.k.register(_c1, "CallHow");
__turbopack_context__.k.register(_c2, "AddToCalendar");
__turbopack_context__.k.register(_c3, "ViewHeading");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/flow-state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The booking flow as a pure reducer (BookingFlow drives it; tests drive it
 * directly). pick -> confirm -> booking -> booked, with a way back to pick when
 * the time was taken meanwhile, and a side path to "request a callback".
 * Selecting a time is optimistic: the confirm view shows at once, with no
 * request until the homeowner confirms.
 */ __turbopack_context__.s([
    "flowReducer",
    ()=>flowReducer,
    "initialFlow",
    ()=>initialFlow,
    "nextIndex",
    ()=>nextIndex
]);
const initialFlow = {
    view: 'loading',
    calendar: null,
    slots: [],
    selected: null,
    booking: null,
    contact: {
        firstName: null,
        phoneHint: null
    },
    message: null,
    callbackRequested: false,
    focusKey: 0
};
function flowReducer(s, a) {
    const moved = (next)=>({
            ...s,
            ...next,
            focusKey: s.focusKey + 1
        });
    switch(a.type){
        case 'loaded':
            {
                // A refresh after booking shows the confirmation, not the picker. A reload that
                // follows "pick another time" keeps its message and moves focus to the picker.
                const view = a.booked ? 'booked' : a.callbackRequested ? 'callback_sent' : 'pick';
                const base = {
                    calendar: a.calendar,
                    slots: a.slots,
                    booking: a.booked ?? s.booking,
                    contact: a.contact,
                    callbackRequested: a.callbackRequested,
                    view
                };
                if (s.view === 'loading' && s.focusKey === 0) return {
                    ...s,
                    ...base,
                    message: a.message ?? null
                };
                return {
                    ...s,
                    ...base,
                    message: a.message ?? s.message
                };
            }
        case 'load_failed':
            return {
                ...s,
                view: 'unavailable',
                message: a.message
            };
        case 'select':
            if (s.view !== 'pick' || !s.slots.some((x)=>x.start === a.start)) return s;
            return moved({
                view: 'confirm',
                selected: a.start,
                message: null
            });
        case 'back':
            return s.view === 'confirm' || s.view === 'callback' ? moved({
                view: 'pick',
                message: null
            }) : s;
        case 'submit':
            return s.view === 'confirm' && s.selected ? {
                ...s,
                view: 'booking',
                message: null
            } : s;
        case 'booked':
            return moved({
                view: 'booked',
                booking: a.booking,
                message: null
            });
        case 'pick_another':
            return moved({
                view: 'pick',
                slots: s.slots.filter((x)=>x.start !== s.selected),
                selected: null,
                message: a.message
            });
        case 'failed':
            return {
                ...s,
                view: s.view === 'booking' ? 'confirm' : s.view,
                message: a.message
            };
        case 'open_callback':
            return s.view === 'pick' ? moved({
                view: 'callback',
                message: null
            }) : s;
        case 'callback_sent':
            return moved({
                view: 'callback_sent',
                callbackRequested: true,
                message: null
            });
    }
}
function nextIndex(key, index, count) {
    if (count <= 0) return null;
    switch(key){
        case 'ArrowDown':
        case 'ArrowRight':
            return Math.min(count - 1, index + 1);
        case 'ArrowUp':
        case 'ArrowLeft':
            return Math.max(0, index - 1);
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/availability/time.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Time-zone helpers for availability. Everything internal is UTC milliseconds; local wall-clock is only for rules. */ __turbopack_context__.s([
    "addDays",
    ()=>addDays,
    "isValidTimeZone",
    ()=>isValidTimeZone,
    "localParts",
    ()=>localParts,
    "pad",
    ()=>pad,
    "parseWallTime",
    ()=>parseWallTime,
    "weekdayOfDate",
    ()=>weekdayOfDate,
    "zonedToUtc",
    ()=>zonedToUtc
]);
const dtfCache = new Map();
function dtf(timeZone) {
    let f = dtfCache.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        dtfCache.set(timeZone, f);
    }
    return f;
}
function isValidTimeZone(timeZone) {
    try {
        new Intl.DateTimeFormat('en-US', {
            timeZone
        });
        return true;
    } catch  {
        return false;
    }
}
function partsOf(ms, timeZone) {
    const out = {};
    for (const p of dtf(timeZone).formatToParts(new Date(ms))){
        if (p.type !== 'literal') out[p.type] = Number(p.value);
    }
    return out;
}
function pad(n, w = 2) {
    return String(n).padStart(w, '0');
}
function localParts(ms, timeZone) {
    const p = partsOf(ms, timeZone);
    const date = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
    return {
        date,
        weekday: weekdayOfDate(date),
        minuteOfDay: p.hour * 60 + p.minute
    };
}
function weekdayOfDate(date) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function addDays(date, days) {
    const [y, m, d] = date.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
function zonedToUtc(date, minuteOfDay, timeZone) {
    const [y, m, d] = date.split('-').map(Number);
    const hh = Math.floor(minuteOfDay / 60);
    const mm = minuteOfDay % 60;
    const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
    // Candidate offsets around the instant; pick one whose local rendering matches.
    const offsets = new Set();
    for (const probe of [
        naive - 36e5 * 14,
        naive,
        naive + 36e5 * 14
    ]){
        const p = partsOf(probe, timeZone);
        offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(probe / 1000) * 1000);
    }
    const candidates = [
        ...offsets
    ].map((off)=>naive - off).sort((a, b)=>a - b);
    for (const c of candidates){
        const p = partsOf(c, timeZone);
        if (p.year === y && p.month === m && p.day === d && p.hour * 60 + p.minute === minuteOfDay) return c;
    }
    // Non-existent local time (DST gap): use the earlier offset so the result lands after the gap.
    return candidates[0] !== undefined ? candidates[candidates.length - 1] : naive;
}
function parseWallTime(value, timeZone) {
    const v = value.trim();
    if (/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) {
        const t = new Date(v).getTime();
        return Number.isNaN(t) ? null : t;
    }
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
    if (!m) return null;
    const hh = Number(m[2]);
    const mm = Number(m[3]);
    if (hh > 23 || mm > 59) return null;
    const [y, mo, d] = m[1].split('-').map(Number);
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
    return zonedToUtc(m[1], hh * 60 + mm, timeZone);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/availability/slots.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SETTINGS",
    ()=>DEFAULT_SETTINGS,
    "DEFAULT_WEEKLY_RULES",
    ()=>DEFAULT_WEEKLY_RULES,
    "REASON_LABELS",
    ()=>REASON_LABELS,
    "bookableSlots",
    ()=>bookableSlots,
    "exceptionAppliesOn",
    ()=>exceptionAppliesOn,
    "mergeIntervals",
    ()=>mergeIntervals,
    "overlaps",
    ()=>overlaps,
    "unavailableIntervals",
    ()=>unavailableIntervals,
    "unavailableReason",
    ()=>unavailableReason
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
;
const DEFAULT_SETTINGS = {
    timezone: 'America/Los_Angeles',
    weeklyScheduleEnabled: false,
    minNoticeHours: 0,
    bufferMinutes: 0,
    maxAppointmentsPerDay: null,
    defaultDurationMinutes: 60
};
const DEFAULT_WEEKLY_RULES = [
    {
        weekday: 0,
        startMinute: 9 * 60,
        endMinute: 19 * 60
    },
    {
        weekday: 1,
        startMinute: 9 * 60,
        endMinute: 18 * 60 + 30
    },
    {
        weekday: 2,
        startMinute: 9 * 60,
        endMinute: 18 * 60 + 30
    },
    {
        weekday: 3,
        startMinute: 9 * 60,
        endMinute: 18 * 60 + 30
    },
    {
        weekday: 4,
        startMinute: 9 * 60,
        endMinute: 18 * 60 + 30
    },
    {
        weekday: 5,
        startMinute: 9 * 60,
        endMinute: 15 * 60
    }
];
const REASON_LABELS = {
    too_soon: 'inside the contractor’s minimum notice period',
    blocked_time: 'a time the contractor blocked off',
    outside_hours: 'outside the contractor’s available hours',
    conflict: 'too close to another appointment',
    daily_cap: 'over the contractor’s daily appointment limit',
    calendar_busy: 'busy on the contractor’s connected calendar'
};
function mergeIntervals(list) {
    const sorted = list.filter((i)=>i.endMs > i.startMs).sort((a, b)=>a.startMs - b.startMs);
    const out = [];
    for (const i of sorted){
        const last = out[out.length - 1];
        if (last && i.startMs <= last.endMs) last.endMs = Math.max(last.endMs, i.endMs);
        else out.push({
            ...i
        });
    }
    return out;
}
function overlaps(a, b) {
    return a.startMs < b.endMs && b.startMs < a.endMs;
}
/** True when `[startMs, endMs)` is fully inside one of the merged intervals. */ function covered(target, merged) {
    return merged.some((i)=>i.startMs <= target.startMs && i.endMs >= target.endMs);
}
function exceptionAppliesOn(e, date) {
    if (date >= e.dateStart && date <= e.dateEnd) return true;
    if (e.repeatWeekly && date > e.dateStart && (!e.repeatUntil || date <= e.repeatUntil)) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["weekdayOfDate"])(date) === (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["weekdayOfDate"])(e.dateStart);
    }
    return false;
}
function dayInterval(date, startMinute, endMinute, tz) {
    if (startMinute === null || endMinute === null) {
        return {
            startMs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(date, 0, tz),
            endMs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, 1), 0, tz)
        };
    }
    const startMs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(date, startMinute, tz);
    const endMs = endMinute >= 1440 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, 1), 0, tz) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(date, endMinute, tz);
    return {
        startMs,
        endMs
    };
}
/** Local calendar dates touched by [startMs, endMs), padded by a day each side. */ function datesAround(startMs, endMs, tz) {
    const first = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(startMs, tz).date, -1);
    const last = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(Math.max(startMs, endMs - 1), tz).date, 1);
    const out = [];
    for(let d = first; d <= last; d = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(d, 1))out.push(d);
    return out;
}
/** Blocked and extra-available UTC intervals across the given dates. */ function exceptionIntervals(ctx, dates) {
    const tz = ctx.settings.timezone;
    const blocked = [];
    const extra = [];
    for (const date of dates){
        for (const e of ctx.exceptions){
            if (!exceptionAppliesOn(e, date)) continue;
            const iv = dayInterval(date, e.startMinute, e.endMinute, tz);
            (e.kind === 'blocked' ? blocked : extra).push(iv);
        }
    }
    return {
        blocked: mergeIntervals(blocked),
        extra: mergeIntervals(extra)
    };
}
function weeklyIntervals(ctx, dates) {
    const tz = ctx.settings.timezone;
    const out = [];
    for (const date of dates){
        const wd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["weekdayOfDate"])(date);
        for (const r of ctx.rules){
            if (r.weekday === wd) out.push(dayInterval(date, r.startMinute, r.endMinute, tz));
        }
    }
    return out;
}
function unavailableReason(ctx, startMs, durationMinutes, excludeAppointmentId) {
    const { settings } = ctx;
    const tz = settings.timezone;
    const durationMs = (durationMinutes ?? settings.defaultDurationMinutes) * 60_000;
    const target = {
        startMs,
        endMs: startMs + durationMs
    };
    if (settings.minNoticeHours > 0 && startMs < ctx.nowMs + settings.minNoticeHours * 3_600_000) {
        return 'too_soon';
    }
    const dates = datesAround(target.startMs, target.endMs, tz);
    const { blocked, extra } = exceptionIntervals(ctx, dates);
    if (blocked.some((b)=>overlaps(b, target))) return 'blocked_time';
    if (settings.weeklyScheduleEnabled) {
        const allowed = mergeIntervals([
            ...weeklyIntervals(ctx, dates),
            ...extra
        ]);
        if (!covered(target, allowed)) return 'outside_hours';
    }
    const bufferMs = settings.bufferMinutes * 60_000;
    const others = ctx.appointments.filter((a)=>!excludeAppointmentId || a.id !== excludeAppointmentId);
    if (others.some((a)=>a.startMs < target.endMs + bufferMs && target.startMs < a.endMs + bufferMs)) {
        return 'conflict';
    }
    if (settings.maxAppointmentsPerDay !== null) {
        const day = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(startMs, tz).date;
        const sameDay = others.filter((a)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(a.startMs, tz).date === day).length;
        if (sameDay >= settings.maxAppointmentsPerDay) return 'daily_cap';
    }
    if (ctx.externalBusy.some((b)=>overlaps(b, target))) return 'calendar_busy';
    return null;
}
function bookableSlots(ctx, fromMs, toMs, opts = {}) {
    const step = (opts.stepMinutes ?? 30) * 60_000;
    const duration = (opts.durationMinutes ?? ctx.settings.defaultDurationMinutes) * 60_000;
    const out = [];
    const first = Math.ceil(fromMs / step) * step;
    for(let t = first; t + duration <= toMs; t += step){
        if (unavailableReason(ctx, t, opts.durationMinutes) === null) out.push({
            startMs: t,
            endMs: t + duration
        });
    }
    return out;
}
function unavailableIntervals(ctx, fromMs, toMs) {
    const tz = ctx.settings.timezone;
    const dates = datesAround(fromMs, toMs, tz);
    const { blocked, extra } = exceptionIntervals(ctx, dates);
    const out = [
        ...blocked
    ];
    if (ctx.settings.weeklyScheduleEnabled) {
        const allowed = mergeIntervals([
            ...weeklyIntervals(ctx, dates),
            ...extra
        ]);
        let cursor = fromMs;
        for (const a of allowed){
            if (a.endMs <= cursor) continue;
            if (a.startMs > cursor) out.push({
                startMs: cursor,
                endMs: Math.min(a.startMs, toMs)
            });
            cursor = Math.max(cursor, a.endMs);
            if (cursor >= toMs) break;
        }
        if (cursor < toMs) out.push({
            startMs: cursor,
            endMs: toMs
        });
    }
    const bufferMs = ctx.settings.bufferMinutes * 60_000;
    for (const a of ctx.appointments)out.push({
        startMs: a.startMs - bufferMs,
        endMs: a.endMs + bufferMs
    });
    for (const b of ctx.externalBusy)out.push(b);
    return mergeIntervals(out.map((i)=>({
            startMs: Math.max(i.startMs, fromMs),
            endMs: Math.min(i.endMs, toMs)
        })));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/booking/slots.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure slot computation for booking calendars. Mirrors the SQL re-check in
 * booking_slot_problem (migration 0068) and reuses the DST-safe availability
 * engine in lib/availability (rules, exceptions, buffer, daily cap, external busy).
 * The SQL check is the authority at booking time; this only decides what to offer.
 */ __turbopack_context__.s([
    "availabilityContext",
    ()=>availabilityContext,
    "calendarSlots",
    ()=>calendarSlots,
    "groupSlotsByDay",
    ()=>groupSlotsByDay,
    "slotProblem",
    ()=>slotProblem
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$slots$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/slots.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
;
;
function availabilityContext(s, excludeId) {
    return {
        settings: {
            timezone: s.calendar.timezone,
            weeklyScheduleEnabled: true,
            // unavailableReason wants hours; fractional hours are fine (it multiplies by 3.6e6).
            minNoticeHours: s.calendar.minNoticeMinutes / 60,
            bufferMinutes: s.calendar.bufferMinutes,
            maxAppointmentsPerDay: s.calendar.maxPerDay,
            defaultDurationMinutes: s.calendar.durationMinutes
        },
        rules: s.rules.map((r)=>({
                weekday: r.weekday,
                startMinute: r.startMinute,
                endMinute: r.endMinute
            })),
        exceptions: s.exceptions.map((e)=>({
                ...e,
                note: e.note ?? null
            })),
        appointments: s.busy.filter((b)=>!excludeId || b.id !== excludeId).map((b)=>({
                id: b.id,
                startMs: b.startMs,
                endMs: b.endMs
            })),
        externalBusy: s.externalBusy,
        nowMs: s.nowMs
    };
}
function slotProblem(s, startMs, opts = {}) {
    const cal = s.calendar;
    if (!cal.active) return 'calendar_inactive';
    if (!Number.isFinite(startMs)) return 'invalid_time';
    const durationMs = (opts.durationMinutes ?? cal.durationMinutes) * 60_000;
    const endMs = startMs + durationMs;
    const others = s.busy.filter((b)=>!opts.excludeId || b.id !== opts.excludeId);
    if (opts.override) {
        return others.some((b)=>b.startMs < endMs && startMs < b.endMs) ? 'slot_taken' : null;
    }
    if (startMs < s.nowMs + cal.minNoticeMinutes * 60_000) return 'too_soon';
    if (startMs > s.nowMs + cal.horizonDays * 86_400_000) return 'too_far';
    // A call sits inside one local day (ending exactly at midnight is fine).
    const startLocal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(startMs, cal.timezone);
    const endLocal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(endMs, cal.timezone);
    if (endLocal.date !== startLocal.date && !(endLocal.date === (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(startLocal.date, 1) && endLocal.minuteOfDay === 0)) {
        return 'outside_hours';
    }
    const reason = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$slots$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unavailableReason"])(availabilityContext(s, opts.excludeId), startMs, durationMs / 60_000);
    if (reason === null) return null;
    return reason === 'conflict' ? 'slot_taken' : reason;
}
function calendarSlots(s, fromMs, toMs, opts = {}) {
    const cal = s.calendar;
    if (!cal.active) return [];
    const tz = cal.timezone;
    const durationMs = cal.durationMinutes * 60_000;
    const lo = Math.max(fromMs, s.nowMs + cal.minNoticeMinutes * 60_000);
    const hi = Math.min(toMs, s.nowMs + cal.horizonDays * 86_400_000 + durationMs);
    if (hi <= lo) return [];
    const step = Math.max(5, cal.slotStepMinutes);
    const out = [];
    const seen = new Set();
    const lastDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(hi, tz).date;
    for(let date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(lo, tz).date; date <= lastDate; date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, 1)){
        for(let m = 0; m + cal.durationMinutes <= 1440; m += step){
            const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(date, m, tz);
            // Skip wall times that do not exist (spring-forward gap) and repeats (fall-back overlap).
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(t, tz).minuteOfDay !== m || seen.has(t)) continue;
            if (t < lo || t + durationMs > hi) continue;
            seen.add(t);
            if (slotProblem(s, t, {
                excludeId: opts.excludeId
            }) === null) out.push({
                startMs: t,
                endMs: t + durationMs
            });
        }
    }
    return out.sort((a, b)=>a.startMs - b.startMs);
}
function groupSlotsByDay(slots, timeZone) {
    const days = new Map();
    for (const slot of [
        ...slots
    ].sort((a, b)=>a.startMs - b.startMs)){
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(slot.startMs, timeZone).date;
        const list = days.get(date);
        if (list) list.push(slot);
        else days.set(date, [
            slot
        ]);
    }
    return [
        ...days.entries()
    ].map(([date, list])=>({
            date,
            slots: list
        }));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/zone.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sameClock",
    ()=>sameClock,
    "useViewerTimeZone",
    ()=>useViewerTimeZone,
    "zoneCity",
    ()=>zoneCity,
    "zoneLabel",
    ()=>zoneLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function useViewerTimeZone(fallback) {
    _s();
    const [zone, setZone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useViewerTimeZone.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeTimeZone"])(fallback)
    }["useViewerTimeZone.useState"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useViewerTimeZone.useEffect": ()=>{
            try {
                const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (browser) setZone((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeTimeZone"])(browser, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeTimeZone"])(fallback)));
            } catch  {
            /* keep the fallback */ }
        }
    }["useViewerTimeZone.useEffect"], [
        fallback
    ]);
    return zone;
}
_s(useViewerTimeZone, "izd4lFfcl1qyft4R4yDKcFKXbPc=");
function zoneLabel(ms, timeZone) {
    const abbr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneAbbreviation"])(ms, timeZone);
    let generic = '';
    try {
        generic = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longGeneric'
        }).formatToParts(new Date(ms)).find((p)=>p.type === 'timeZoneName')?.value ?? '';
    } catch  {
        generic = '';
    }
    if (!generic || generic === abbr) return abbr || timeZone;
    return abbr && !/^GMT[+-]/.test(abbr) ? `${generic} (${abbr})` : generic;
}
const zoneCity = (timeZone)=>timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
function sameClock(a, b, ms = Date.now()) {
    if (a === b) return true;
    const f = (tz)=>new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            day: 'numeric',
            hourCycle: 'h23'
        }).format(new Date(ms));
    try {
        return f(a) === f(b);
    } catch  {
        return false;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/slot-picker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SlotPicker",
    ()=>SlotPicker,
    "SlotPickerSkeleton",
    ()=>SlotPickerSkeleton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$slots$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/slots.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$flow$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/flow-state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone.ts [app-client] (ecmascript)");
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
const MORE_DAYS = 3;
function SlotPicker({ slots, timeZone, zoneChoices = [], onTimeZoneChange, selected = null, current = null, onSelect, headingLevel = 3, initialDays = 3, perDay = 6, disabled = false }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const [dayCount, setDayCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialDays);
    const [openDays, setOpenDays] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "SlotPicker.useState": ()=>new Set()
    }["SlotPicker.useState"]);
    const lists = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const withCurrent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SlotPicker.useMemo[withCurrent]": ()=>{
            const list = slots.map({
                "SlotPicker.useMemo[withCurrent].list": (s)=>({
                        startMs: Date.parse(s.start),
                        endMs: Date.parse(s.end)
                    })
            }["SlotPicker.useMemo[withCurrent].list"]);
            if (current && !list.some({
                "SlotPicker.useMemo[withCurrent]": (s)=>s.startMs === Date.parse(current)
            }["SlotPicker.useMemo[withCurrent]"])) list.push({
                startMs: Date.parse(current),
                endMs: Date.parse(current)
            });
            return list;
        }
    }["SlotPicker.useMemo[withCurrent]"], [
        slots,
        current
    ]);
    const days = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SlotPicker.useMemo[days]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$slots$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupSlotsByDay"])(withCurrent, timeZone)
    }["SlotPicker.useMemo[days]"], [
        withCurrent,
        timeZone
    ]);
    const shown = days.slice(0, dayCount);
    const H = `h${headingLevel}`;
    const firstMs = withCurrent[0]?.startMs ?? Date.now();
    const switchTo = zoneChoices.find((z)=>z !== timeZone && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sameClock"])(z, timeZone, firstMs)) ?? null;
    /** After revealing more, focus the first new time (the button that was pressed may be gone). */ function focusLater(selector, index) {
        requestAnimationFrame(()=>{
            const root = rootRef.current?.querySelector(selector);
            root?.querySelectorAll('[role="option"]:not([aria-disabled="true"])')[index]?.focus();
        });
    }
    function onKeyDown(e, date) {
        const list = lists.current.get(date);
        if (!list) return;
        const options = Array.from(list.querySelectorAll('[role="option"]'));
        const at = options.indexOf(document.activeElement);
        const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$flow$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nextIndex"])(e.key, Math.max(0, at), options.length);
        if (next === null) return;
        e.preventDefault();
        options.forEach((o, i)=>o.tabIndex = i === next ? 0 : -1);
        options[next]?.focus();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: rootRef,
        className: "bk",
        "data-booking-slot-picker": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "bk-copy text-[14.5px] leading-[21px] text-[var(--bk-muted)]",
                "data-booking-zone": "",
                children: [
                    "Times are in ",
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneLabel"])(firstMs, timeZone),
                    ".",
                    switchTo && onTimeZoneChange ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            ' ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "bk-link -my-3 align-baseline",
                                onClick: ()=>onTimeZoneChange(switchTo),
                                children: [
                                    "Show ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneCity"])(switchTo),
                                    " time"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 93,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/slot-picker.tsx",
                lineNumber: 88,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 flex flex-col gap-7",
                children: shown.map((day, dayIndex)=>{
                    const headingId = `${uid}-d${dayIndex}`;
                    const open = openDays.has(day.date);
                    const visible = open ? day.slots : day.slots.slice(0, perDay);
                    const hidden = day.slots.length - visible.length;
                    const focusStart = visible.find((s)=>s.startMs === Date.parse(selected ?? ''))?.startMs ?? visible.find((s)=>!isCurrent(s.startMs, current))?.startMs;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        "aria-labelledby": headingId,
                        "data-booking-day": day.date,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(H, {
                                id: headingId,
                                className: "bk-heading text-[20px] font-[550] leading-[26px] tracking-[-0.012em] text-[var(--bk-ink)]",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDayHeading"])(day.slots[0].startMs, timeZone)
                            }, void 0, false, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 110,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                ref: (el)=>{
                                    lists.current.set(day.date, el);
                                },
                                role: "listbox",
                                "aria-labelledby": headingId,
                                "aria-disabled": disabled || undefined,
                                className: "mt-3 flex flex-col gap-2.5",
                                onKeyDown: (e)=>onKeyDown(e, day.date),
                                children: visible.map((slot)=>{
                                    const start = new Date(slot.startMs).toISOString();
                                    const isCur = isCurrent(slot.startMs, current);
                                    const isSel = !isCur && selected !== null && Date.parse(selected) === slot.startMs;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        role: "option",
                                        "aria-selected": isSel,
                                        "aria-disabled": isCur || disabled || undefined,
                                        tabIndex: slot.startMs === focusStart ? 0 : -1,
                                        className: "bk-slot",
                                        "data-slot-start": start,
                                        onClick: ()=>{
                                            if (!isCur && !disabled) onSelect(start);
                                        },
                                        children: [
                                            isSel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                "aria-hidden": true,
                                                className: "size-[18px] -ml-1",
                                                strokeWidth: 2.4
                                            }, void 0, false, {
                                                fileName: "[project]/components/booking/slot-picker.tsx",
                                                lineNumber: 137,
                                                columnNumber: 32
                                            }, this) : null,
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTime"])(slot.startMs, timeZone)
                                            }, void 0, false, {
                                                fileName: "[project]/components/booking/slot-picker.tsx",
                                                lineNumber: 138,
                                                columnNumber: 23
                                            }, this),
                                            isCur ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[14px] font-normal",
                                                children: "(your current time)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/booking/slot-picker.tsx",
                                                lineNumber: 139,
                                                columnNumber: 32
                                            }, this) : null
                                        ]
                                    }, slot.startMs, true, {
                                        fileName: "[project]/components/booking/slot-picker.tsx",
                                        lineNumber: 126,
                                        columnNumber: 21
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 113,
                                columnNumber: 15
                            }, this),
                            hidden > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "bk-link mt-1",
                                onClick: ()=>{
                                    setOpenDays((prev)=>new Set(prev).add(day.date));
                                    focusLater(`[data-booking-day="${day.date}"]`, perDay);
                                },
                                children: [
                                    hidden,
                                    " more ",
                                    hidden === 1 ? 'time' : 'times',
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        "aria-hidden": true,
                                        className: "size-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/booking/slot-picker.tsx",
                                        lineNumber: 154,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 145,
                                columnNumber: 17
                            }, this) : null
                        ]
                    }, day.date, true, {
                        fileName: "[project]/components/booking/slot-picker.tsx",
                        lineNumber: 109,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/booking/slot-picker.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            days.length > shown.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: "bk-secondary mt-7 w-full",
                onClick: ()=>{
                    const next = days[shown.length];
                    setDayCount((n)=>n + MORE_DAYS);
                    // The button stays while more days remain; once it goes, focus would be lost.
                    if (next && days.length <= shown.length + MORE_DAYS) focusLater(`[data-booking-day="${next.date}"]`, 0);
                },
                children: "Show more days"
            }, void 0, false, {
                fileName: "[project]/components/booking/slot-picker.tsx",
                lineNumber: 163,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/slot-picker.tsx",
        lineNumber: 87,
        columnNumber: 5
    }, this);
}
_s(SlotPicker, "Pfikl9ylx7a3ScogK3v1xFFVeQQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = SlotPicker;
const isCurrent = (ms, current)=>current !== null && Date.parse(current) === ms;
function SlotPickerSkeleton({ days = 2, perDay = 4 }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bk",
        "aria-hidden": true,
        "data-booking-skeleton": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bk-skeleton h-[21px] w-[62%]"
            }, void 0, false, {
                fileName: "[project]/components/booking/slot-picker.tsx",
                lineNumber: 185,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 flex flex-col gap-7",
                children: Array.from({
                    length: days
                }, (_, d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bk-skeleton h-[26px] w-[58%]"
                            }, void 0, false, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3 flex flex-col gap-2.5",
                                children: Array.from({
                                    length: perDay
                                }, (_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bk-skeleton h-14 w-full"
                                    }, i, false, {
                                        fileName: "[project]/components/booking/slot-picker.tsx",
                                        lineNumber: 191,
                                        columnNumber: 57
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/booking/slot-picker.tsx",
                                lineNumber: 190,
                                columnNumber: 13
                            }, this)
                        ]
                    }, d, true, {
                        fileName: "[project]/components/booking/slot-picker.tsx",
                        lineNumber: 188,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/booking/slot-picker.tsx",
                lineNumber: 186,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/slot-picker.tsx",
        lineNumber: 184,
        columnNumber: 5
    }, this);
}
_c1 = SlotPickerSkeleton;
var _c, _c1;
__turbopack_context__.k.register(_c, "SlotPicker");
__turbopack_context__.k.register(_c1, "SlotPickerSkeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BookedView",
    ()=>BookedView,
    "BookingFlow",
    ()=>BookingFlow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CircleCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/call-summary.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$flow$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/flow-state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/slot-picker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone.ts [app-client] (ecmascript)");
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
const UNAVAILABLE = 'Booking is temporarily unavailable. Please try again in a moment.';
async function call(url, init) {
    const res = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        cache: 'no-store'
    });
    try {
        return await res.json();
    } catch  {
        return {
            ok: false,
            error: 'unavailable',
            message: UNAVAILABLE
        };
    }
}
function BookingFlow({ grant, heading = 'Book your free call', intro = null, headingLevel = 2, onBooked, allowCallback = true, apiBase = '/api/booking' }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const [s, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$flow$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["flowReducer"], __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$flow$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initialFlow"]);
    const viewerZone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useViewerTimeZone"])(s.calendar?.timeZone ?? 'America/Los_Angeles');
    const [zone, setZone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const shownZone = zone ?? viewerZone;
    const headingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [note, setNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [sending, setSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const load = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BookingFlow.useCallback[load]": async (message)=>{
            try {
                const r = await call(`${apiBase}/slots`, {
                    headers: {
                        'X-Booking-Grant': grant
                    }
                });
                if (r.ok) dispatch({
                    type: 'loaded',
                    calendar: r.calendar,
                    slots: r.slots,
                    booked: r.booked,
                    callbackRequested: r.callbackRequested,
                    contact: r.contact,
                    message
                });
                else dispatch({
                    type: 'load_failed',
                    message: r.message
                });
            } catch  {
                dispatch({
                    type: 'load_failed',
                    message: UNAVAILABLE
                });
            }
        }
    }["BookingFlow.useCallback[load]"], [
        apiBase,
        grant
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingFlow.useEffect": ()=>{
            void load();
        }
    }["BookingFlow.useEffect"], [
        load
    ]);
    // Focus follows the homeowner's own actions only (never the first load inside a funnel).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingFlow.useEffect": ()=>{
            if (s.focusKey > 0) headingRef.current?.focus({
                preventScroll: false
            });
        }
    }["BookingFlow.useEffect"], [
        s.focusKey
    ]);
    async function confirm() {
        if (!s.selected) return;
        dispatch({
            type: 'submit'
        });
        try {
            const r = await call(`${apiBase}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant,
                    startsAt: s.selected,
                    timeZone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeTimeZone"])(viewerZone)
                })
            });
            if (r.ok) {
                dispatch({
                    type: 'booked',
                    booking: r.booking
                });
                onBooked?.(r.booking, r.metaEventId);
            } else if (r.error === 'already_booked' && r.booking) {
                dispatch({
                    type: 'booked',
                    booking: r.booking
                });
            } else if (r.pickAnother) {
                dispatch({
                    type: 'pick_another',
                    message: r.message
                });
                void load(r.message);
            } else {
                dispatch({
                    type: 'failed',
                    message: r.message || UNAVAILABLE
                });
            }
        } catch  {
            dispatch({
                type: 'failed',
                message: UNAVAILABLE
            });
        }
    }
    async function sendCallback() {
        setSending(true);
        try {
            const r = await call(`${apiBase}/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant,
                    note: note.trim() || undefined
                })
            });
            if (r.ok) dispatch({
                type: 'callback_sent'
            });
            else dispatch({
                type: 'failed',
                message: r.message
            });
        } catch  {
            dispatch({
                type: 'failed',
                message: UNAVAILABLE
            });
        } finally{
            setSending(false);
        }
    }
    const cal = s.calendar;
    const dayLevel = Math.min(4, headingLevel + 1);
    const zoneChoices = cal ? [
        viewerZone,
        cal.timeZone
    ] : [];
    const alert = s.message && s.view !== 'unavailable' ? s.message : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bk",
        "data-booking-flow": "",
        "data-view": s.view,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "status",
                "aria-live": "polite",
                className: "sr-only",
                children: s.view === 'booking' ? 'Booking your call…' : s.view === 'booked' && s.booking ? `You’re booked for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDayHeading"])(Date.parse(s.booking.startsAt), shownZone)}.` : s.view === 'callback_sent' ? 'Callback requested.' : ''
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            (s.view === 'loading' || s.view === 'pick' || s.view === 'unavailable') && heading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewHeading"], {
                level: headingLevel,
                headingRef: headingRef,
                children: heading
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 133,
                columnNumber: 9
            }, this) : null,
            (s.view === 'loading' || s.view === 'pick') && intro ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "bk-copy mt-3 text-[17px] leading-[25px] text-[var(--bk-text)]",
                children: intro
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 136,
                columnNumber: 9
            }, this) : null,
            alert ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "bk-copy mt-4 rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07]",
                "data-booking-message": "",
                children: alert
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 140,
                columnNumber: 9
            }, this) : null,
            s.view === 'loading' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: heading || intro ? 'mt-6' : '',
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotPickerSkeleton"], {}, void 0, false, {
                    fileName: "[project]/components/booking/booking-flow.tsx",
                    lineNumber: 145,
                    columnNumber: 79
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 145,
                columnNumber: 31
            }, this) : null,
            s.view === 'unavailable' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        role: "alert",
                        className: "bk-copy text-[16px] leading-[24px] text-[var(--bk-text)]",
                        children: s.message
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 149,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "bk-secondary mt-4 w-full",
                        onClick: ()=>void load(),
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 150,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 148,
                columnNumber: 9
            }, this) : null,
            s.view === 'pick' && cal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: heading || intro ? 'mt-6' : '',
                children: [
                    !heading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        ref: headingRef,
                        tabIndex: -1,
                        className: "sr-only",
                        children: "Pick a time"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 156,
                        columnNumber: 23
                    }, this) : null,
                    s.slots.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotPicker"], {
                        slots: s.slots,
                        timeZone: shownZone,
                        zoneChoices: zoneChoices,
                        onTimeZoneChange: setZone,
                        selected: s.selected,
                        onSelect: (start)=>dispatch({
                                type: 'select',
                                start
                            }),
                        headingLevel: dayLevel
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 158,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "bk-copy text-[16px] leading-[24px] text-[var(--bk-text)]",
                        "data-booking-empty": "",
                        children: [
                            "There are no open times in the next two weeks.",
                            allowCallback ? ' Ask for a call and we’ll find a time with you.' : ''
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 168,
                        columnNumber: 13
                    }, this),
                    allowCallback ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "bk-link mt-5",
                        onClick: ()=>dispatch({
                                type: 'open_callback'
                            }),
                        "data-booking-callback-open": "",
                        children: "None of these times work?"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 173,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 155,
                columnNumber: 9
            }, this) : null,
            (s.view === 'confirm' || s.view === 'booking') && cal && s.selected ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bk-enter",
                "data-booking-confirm": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewHeading"], {
                        level: headingLevel,
                        headingRef: headingRef,
                        children: "Confirm your call"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CallTime"], {
                            startsAt: s.selected,
                            endsAt: new Date(Date.parse(s.selected) + cal.durationMinutes * 60_000).toISOString(),
                            timeZone: shownZone
                        }, void 0, false, {
                            fileName: "[project]/components/booking/booking-flow.tsx",
                            lineNumber: 184,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 183,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CallHow"], {
                            meetingType: cal.meetingType,
                            hostName: cal.hostName,
                            durationMinutes: cal.durationMinutes,
                            phoneHint: s.contact.phoneHint
                        }, void 0, false, {
                            fileName: "[project]/components/booking/booking-flow.tsx",
                            lineNumber: 187,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 186,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "bk-slot mt-6",
                        onClick: ()=>void confirm(),
                        "aria-disabled": s.view === 'booking' || undefined,
                        disabled: s.view === 'booking',
                        children: s.view === 'booking' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    "aria-hidden": true,
                                    className: "size-[18px] motion-safe:animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/components/booking/booking-flow.tsx",
                                    lineNumber: 196,
                                    columnNumber: 39
                                }, this),
                                "Booking your call…"
                            ]
                        }, void 0, true) : 'Confirm call'
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 189,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "bk-link mt-2 w-full justify-center",
                        onClick: ()=>dispatch({
                                type: 'back'
                            }),
                        disabled: s.view === 'booking',
                        children: "Pick another time"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 181,
                columnNumber: 9
            }, this) : null,
            s.view === 'booked' && s.booking ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BookedView, {
                booking: s.booking,
                timeZone: shownZone,
                headingLevel: headingLevel,
                headingRef: headingRef
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 205,
                columnNumber: 9
            }, this) : null,
            s.view === 'callback' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                className: "bk-enter",
                onSubmit: (e)=>{
                    e.preventDefault();
                    void sendCallback();
                },
                "data-booking-callback": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewHeading"], {
                        level: headingLevel,
                        headingRef: headingRef,
                        children: "Ask for a call instead"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 210,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]",
                        children: [
                            "We’ll call you",
                            s.contact.phoneHint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    " at the number ending ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "tabular-nums",
                                        children: s.contact.phoneHint
                                    }, void 0, false, {
                                        fileName: "[project]/components/booking/booking-flow.tsx",
                                        lineNumber: 212,
                                        columnNumber: 74
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            " to find a time that works."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 211,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: `${uid}-note`,
                        className: "mt-5 block text-[15px] font-medium leading-[22px] text-[var(--bk-ink)]",
                        children: [
                            "Best time to reach you ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-normal text-[var(--bk-muted)]",
                                children: "(optional)"
                            }, void 0, false, {
                                fileName: "[project]/components/booking/booking-flow.tsx",
                                lineNumber: 215,
                                columnNumber: 36
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 214,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        id: `${uid}-note`,
                        value: note,
                        onChange: (e)=>setNote(e.target.value),
                        maxLength: 300,
                        placeholder: "Weekday evenings, after 5",
                        autoComplete: "off",
                        className: "mt-2 h-12 w-full rounded-[8px] bg-white px-3.5 text-[16px] text-[var(--bk-ink)] shadow-[inset_0_0_0_1px_var(--bk-hair)] outline-none placeholder:text-[var(--bk-muted)] focus-visible:shadow-[inset_0_0_0_1px_var(--bk-accent),0_0_0_3px_var(--bk-focus)]"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 217,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        className: "bk-slot mt-5",
                        disabled: sending,
                        "aria-disabled": sending || undefined,
                        children: sending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    "aria-hidden": true,
                                    className: "size-[18px] motion-safe:animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/components/booking/booking-flow.tsx",
                                    lineNumber: 227,
                                    columnNumber: 26
                                }, this),
                                "Sending…"
                            ]
                        }, void 0, true) : 'Request a callback'
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 226,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "bk-link mt-2 w-full justify-center",
                        onClick: ()=>dispatch({
                                type: 'back'
                            }),
                        children: "Back to the times"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 229,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 209,
                columnNumber: 9
            }, this) : null,
            s.view === 'callback_sent' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bk-enter",
                "data-booking-callback-sent": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewHeading"], {
                        level: headingLevel,
                        headingRef: headingRef,
                        children: "We’ll call you"
                    }, void 0, false, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 237,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]",
                        children: [
                            "Thanks",
                            s.contact.firstName ? `, ${s.contact.firstName}` : '',
                            ". Someone will call you",
                            s.contact.phoneHint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    " at the number ending ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "tabular-nums",
                                        children: s.contact.phoneHint
                                    }, void 0, false, {
                                        fileName: "[project]/components/booking/booking-flow.tsx",
                                        lineNumber: 239,
                                        columnNumber: 144
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            " to set up a time."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/booking/booking-flow.tsx",
                        lineNumber: 238,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 236,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/booking-flow.tsx",
        lineNumber: 126,
        columnNumber: 5
    }, this);
}
_s(BookingFlow, "A0hxsaz6nDYKoIFxkIQfvBzEcd4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useViewerTimeZone"]
    ];
});
_c = BookingFlow;
function BookedView({ booking, timeZone, headingLevel = 2, headingRef }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bk-enter",
        "data-booking-booked": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheck$3e$__["CircleCheck"], {
                "aria-hidden": true,
                className: "mb-3 size-8 text-[var(--bk-accent)]",
                strokeWidth: 1.8
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 253,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewHeading"], {
                level: headingLevel,
                headingRef: headingRef,
                children: [
                    "You’re booked",
                    booking.firstName ? `, ${booking.firstName}` : ''
                ]
            }, void 0, true, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 254,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CallTime"], {
                    startsAt: booking.startsAt,
                    endsAt: booking.endsAt,
                    timeZone: timeZone
                }, void 0, false, {
                    fileName: "[project]/components/booking/booking-flow.tsx",
                    lineNumber: 258,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 257,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CallHow"], {
                    meetingType: booking.meetingType,
                    hostName: booking.hostName,
                    durationMinutes: booking.durationMinutes,
                    phoneHint: booking.phoneHint,
                    videoLink: booking.videoLink
                }, void 0, false, {
                    fileName: "[project]/components/booking/booking-flow.tsx",
                    lineNumber: 261,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 260,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "bk-copy mt-3 text-[15px] leading-[22px] text-[var(--bk-muted)]",
                children: "We’ll text and email you the details, and send a reminder before the call."
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 263,
                columnNumber: 7
            }, this),
            booking.icsUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$call$2d$summary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AddToCalendar"], {
                    booking: booking
                }, void 0, false, {
                    fileName: "[project]/components/booking/booking-flow.tsx",
                    lineNumber: 266,
                    columnNumber: 47
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 266,
                columnNumber: 25
            }, this) : null,
            booking.manageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "bk-link mt-3",
                href: booking.manageUrl,
                "data-booking-manage": "",
                children: "Reschedule or cancel"
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 268,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "bk-copy mt-4 text-[15px] leading-[22px] text-[var(--bk-muted)]",
                children: "Need to change it? Use the link in your confirmation text or email."
            }, void 0, false, {
                fileName: "[project]/components/booking/booking-flow.tsx",
                lineNumber: 270,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/booking/booking-flow.tsx",
        lineNumber: 252,
        columnNumber: 5
    }, this);
}
_c1 = BookedView;
var _c, _c1;
__turbopack_context__.k.register(_c, "BookingFlow");
__turbopack_context__.k.register(_c1, "BookedView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/booking/state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bookingFrameUrl",
    ()=>bookingFrameUrl,
    "priceEyebrow",
    ()=>priceEyebrow,
    "priceRange",
    ()=>priceRange,
    "readCalendlyMessage",
    ()=>readCalendlyMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/result/booking-state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)");
;
;
;
function priceEyebrow(spec, selection) {
    const picks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pickedOptions"])(spec, selection).map((o)=>o.short ?? o.title);
    return spec.bookingStep.priceEyebrow.replace('{options}', picks.join(' · '));
}
function priceRange(estimate) {
    return estimate.low !== null && estimate.high !== null && estimate.high > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(estimate.low, estimate.high) : null;
}
const bookingFrameUrl = (calendarUrl, host)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$result$2f$booking$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calendarFrameUrl"])(calendarUrl, host);
function readCalendlyMessage(origin, data) {
    if (origin !== 'https://calendly.com' || !data || typeof data !== 'object') return null;
    const d = data;
    if (d.event === 'calendly.event_scheduled') return {
        kind: 'scheduled'
    };
    if (d.event === 'calendly.page_height') {
        const h = Number.parseInt(String(d.payload?.height ?? ''), 10);
        return Number.isFinite(h) && h > 0 ? {
            kind: 'height',
            height: Math.min(Math.max(h, 480), 1600)
        } : null;
    }
    return null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/booking/funnel-booking.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelBookingScreen",
    ()=>FunnelBookingScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-check.js [app-client] (ecmascript) <export default as CalendarCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/booking/state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
/**
 * The funnel's last screen: "Book your free call".
 * 1. The price card: the picks on one line, the ballpark range from the server,
 *    one sentence of ballpark wording (plus "example prices" while prices are unconfirmed) and
 *    "Financing available" with the lender disclosure behind "See details".
 *    Never a monthly payment.
 * 2. The booking card: a free 30-minute call on HomeQuote's own calendar
 *    (<BookingFlow>, the contractor's calendar, or the HomeQuote team's for a
 *    network funnel), booked and recorded server-side with the ticket the lead
 *    route returned; confirmation, reminders and the reschedule / cancel link
 *    go out automatically. Fallback (an estimator still set to an external
 *    link): the Calendly inline, sized to its content, with a button that
 *    opens it in a new tab (the only option inside the /embed iframe). An
 *    unqualified lead outside the service area is told we will call; a renter
 *    ("No" to "Are you the homeowner?") that the funnel saved for review is told the project needs
 *    a personal review (the funnel's own review wording, no promised call);
 *    when nothing was saved (result.saved false), to call us.
 * 3. "Prefer to talk now? Call (818) 643-6888".
 *
 * Draws only its content column from the heading down (props: ../screens.ts);
 * the shell draws the chrome and moves focus to the heading (headingId).
 * Inside the /embed iframe there is no nested calendar iframe, a button instead.
 */ const FRAME_START = 700;
function FunnelBookingScreen({ spec, selection, contractor, result, embedded, headingId }) {
    _s();
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const step = spec.bookingStep;
    const firstName = result.contact.firstName;
    const [details, setDetails] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [host, setHost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [frameHeight, setFrameHeight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(FRAME_START);
    const [booked, setBooked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const range = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["priceRange"])(result.estimate);
    // HomeQuote calendar (the lead route's booking ticket) first; an external link only without one.
    const ticket = result.qualified ? result.bookingTicket : undefined;
    const calendarUrl = result.qualified && !ticket ? result.calendarUrl : undefined;
    // "No" (not the homeowner): the funnel's homeowner rule did not pass (never a booking, never a promised call).
    const renter = !result.qualified && result.homeowner === 'no';
    const frame = !embedded && calendarUrl && host ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bookingFrameUrl"])(calendarUrl, host) : null;
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    const examplePrices = contractor.pricesConfirmed === false;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelBookingScreen.useEffect": ()=>{
            setHost(window.location.hostname);
        }
    }["FunnelBookingScreen.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelBookingScreen.useEffect": ()=>{
            if (!calendarUrl) return;
            const onMessage = {
                "FunnelBookingScreen.useEffect.onMessage": (e)=>{
                    const msg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readCalendlyMessage"])(e.origin, e.data);
                    if (!msg) return;
                    if (msg.kind === 'height') setFrameHeight(msg.height);
                    else setBooked(true);
                }
            }["FunnelBookingScreen.useEffect.onMessage"];
            window.addEventListener('message', onMessage);
            return ({
                "FunnelBookingScreen.useEffect": ()=>window.removeEventListener('message', onMessage)
            })["FunnelBookingScreen.useEffect"];
        }
    }["FunnelBookingScreen.useEffect"], [
        calendarUrl
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full",
        "data-funnel-booking": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                id: headingId,
                tabIndex: -1,
                className: "fn-h1 text-balance outline-none",
                children: renter ? 'Your ballpark estimate' : step.headline
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": `${uid}-price`,
                className: "mt-6 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "data-funnel-price": "",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        id: `${uid}-price`,
                        className: "text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[var(--fn-muted)]",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["priceEyebrow"])(spec, selection)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2.5 text-[clamp(26px,7.6vw,31px)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--fn-ink)] tabular-nums [text-wrap:balance]",
                        children: range ?? 'Priced at your free on-site visit'
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2.5 text-[14.5px] leading-[21px] text-[var(--fn-text)] [text-wrap:pretty]",
                        children: [
                            step.priceNote,
                            examplePrices ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[var(--fn-muted)]",
                                children: " Example prices, not yet confirmed."
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 88,
                                columnNumber: 28
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this),
                    step.financingLabel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap items-center gap-x-4 gap-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "inline-flex items-center gap-2 text-[15px] text-[var(--fn-ink)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                "aria-hidden": "true",
                                                className: "size-4 text-[color:var(--fn-blue)]",
                                                strokeWidth: 2.4
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                                lineNumber: 94,
                                                columnNumber: 17
                                            }, this),
                                            step.financingLabel
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                        lineNumber: 93,
                                        columnNumber: 15
                                    }, this),
                                    contractor.financingDisclosure ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        "aria-expanded": details,
                                        "aria-controls": `${uid}-fin`,
                                        onClick: ()=>setDetails((d)=>!d),
                                        className: "relative text-[15px] font-medium text-[color:var(--fn-blue-ink)] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fn-blue)]",
                                        children: details ? 'Hide details' : 'See details'
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                        lineNumber: 98,
                                        columnNumber: 17
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 92,
                                columnNumber: 13
                            }, this),
                            contractor.financingDisclosure ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: `${uid}-fin`,
                                hidden: !details,
                                className: "mt-2.5 text-[12.5px] leading-[18px] text-[var(--fn-muted)] motion-safe:animate-[funnel-fade_160ms_ease-out]",
                                children: contractor.financingDisclosure
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 110,
                                columnNumber: 15
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": ticket ? undefined : `${uid}-book`,
                "aria-label": ticket ? 'Book your call' : undefined,
                className: "mt-4 rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "data-funnel-calendar": ticket ? 'homequote' : '',
                children: ticket ? // Loads the open times, books under the calendar lock and shows "You're booked" (also after a refresh).
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingFlow"], {
                    grant: ticket,
                    heading: step.bookingTitle,
                    headingLevel: 2
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                    lineNumber: 131,
                    columnNumber: 11
                }, this) : booked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start gap-3 motion-safe:animate-[funnel-fade_180ms_ease-out]",
                    role: "status",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--fn-blue)] text-white",
                            "aria-hidden": "true",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__["CalendarCheck"], {
                                className: "size-4",
                                strokeWidth: 2.4
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 135,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 134,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    id: `${uid}-book`,
                                    className: "text-[19px] font-medium leading-tight text-[var(--fn-ink)]",
                                    children: [
                                        "You’re booked",
                                        firstName ? `, ${firstName}` : '',
                                        "."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                    lineNumber: 138,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]",
                                    children: [
                                        "Calendly has emailed you the details. ",
                                        contractor.contractorName,
                                        " will see you then."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                    lineNumber: 141,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 137,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                    lineNumber: 133,
                    columnNumber: 11
                }, this) : calendarUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: `${uid}-book`,
                            className: "text-[17px] font-medium leading-[24px] text-[var(--fn-ink)] [text-wrap:pretty]",
                            children: step.bookingTitle
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 148,
                            columnNumber: 13
                        }, this),
                        embedded ? null : // Height is reserved before the frame exists (no layout shift), then follows Calendly's own height;
                        // Calendly draws its own loading state inside.
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative -mx-5 mt-3 overflow-hidden",
                            style: {
                                height: frameHeight
                            },
                            children: frame ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                                title: `Pick a time with ${contractor.contractorName}`,
                                src: frame,
                                className: "relative block size-full border-0",
                                referrerPolicy: "strict-origin-when-cross-origin"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 156,
                                columnNumber: 19
                            }, this) : null
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 154,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: calendarUrl,
                            target: "_blank",
                            rel: "noopener",
                            className: embedded ? 'fn-btn mt-3 h-12 w-full px-4 text-[16px]' : 'mt-3 inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[16px] font-medium text-[var(--fn-ink)] shadow-[inset_0_0_0_1px_var(--fn-line)] transition-[background-color,scale] duration-150 ease-out active:scale-[0.985] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-focus)] motion-reduce:transition-none [@media(hover:hover)]:hover:bg-[var(--fn-bg)]',
                            children: [
                                embedded ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                    "aria-hidden": "true",
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                    lineNumber: 175,
                                    columnNumber: 34
                                }, this),
                                embedded ? 'Pick a time' : 'Open the calendar in a new tab'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 165,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true) : result.saved === false ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: `${uid}-book`,
                            className: "text-[19px] font-medium leading-tight text-[var(--fn-ink)]",
                            children: [
                                firstName ? `Thanks, ${firstName}.` : 'Thank you.',
                                " We can’t book this one online."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 181,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]",
                            children: renter ? `We book online visits with homeowners. Your details were not saved; give ${contractor.contractorName} a call and we’ll tell you what we can do.` : `It may be outside the area we serve. Give ${contractor.contractorName} a call and we’ll tell you what we can do.`
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 184,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                    lineNumber: 180,
                    columnNumber: 11
                }, this) : renter ? // Saved for review (the funnel's unqualifiedAction 'review'): no booking, no promised call.
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    "data-funnel-review": "",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: `${uid}-book`,
                            className: "text-[19px] font-medium leading-tight text-[var(--fn-ink)]",
                            children: [
                                firstName ? `Thanks, ${firstName}.` : 'Thank you.',
                                " Your project needs a personal review."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 193,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]",
                            children: [
                                "We book on-site estimates online with homeowners. Your details are saved, and the ",
                                contractor.contractorName,
                                " team will review them before we can confirm a fit."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 196,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                    lineNumber: 192,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: `${uid}-book`,
                            className: "text-[19px] font-medium leading-tight text-[var(--fn-ink)]",
                            children: [
                                firstName ? `Thanks, ${firstName}.` : 'Thank you.',
                                " Your design is with ",
                                contractor.contractorName,
                                "."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 203,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1.5 text-[15px] leading-[22px] text-[var(--fn-text)]",
                            children: "We’ll call you within one business day to talk through it and set up your free on-site estimate."
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                            lineNumber: 206,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                    lineNumber: 202,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            tel && step.callPrompt ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-5 text-[15px] leading-[22px] text-[var(--fn-text)]",
                children: [
                    step.callPrompt,
                    ' ',
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: tel,
                        className: "inline-flex items-center gap-1 font-medium text-[color:var(--fn-blue)] underline-offset-4 [@media(hover:hover)]:hover:underline",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                "aria-hidden": "true",
                                className: "size-3.5"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 215,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "tabular-nums",
                                children: contractor.phone
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                                lineNumber: 216,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                        lineNumber: 214,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                lineNumber: 212,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: '@keyframes funnel-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
                lineNumber: 221,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/booking/funnel-booking.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(FunnelBookingScreen, "wf1oeRKLu6s8l/TLqwFmmWXxY8E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = FunnelBookingScreen;
var _c;
__turbopack_context__.k.register(_c, "FunnelBookingScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/slots.tsx [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/*
 * Where the shell (./funnel.tsx) gets the contact and booking screens. Both
 * take the props in ./screens.ts and draw only their content column; the
 * shell draws the chrome, the URL and the sessionStorage copy.
 */ __turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$funnel$2d$contact$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/contact/funnel-contact.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$funnel$2d$booking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/booking/funnel-booking.tsx [app-client] (ecmascript)");
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/state.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BOOK_PARAM",
    ()=>BOOK_PARAM,
    "CONTACT_PARAM",
    ()=>CONTACT_PARAM,
    "initialFromSearch",
    ()=>initialFromSearch,
    "nextScreen",
    ()=>nextScreen,
    "parseScreen",
    ()=>parseScreen,
    "photoSrcSet",
    ()=>photoSrcSet,
    "prevScreen",
    ()=>prevScreen,
    "progress",
    ()=>progress,
    "readStored",
    ()=>readStored,
    "resolvePhoto",
    ()=>resolvePhoto,
    "resultFor",
    ()=>resultFor,
    "sameScreen",
    ()=>sameScreen,
    "screenOrder",
    ()=>screenOrder,
    "screenParam",
    ()=>screenParam,
    "screenUrl",
    ()=>screenUrl,
    "stepCta",
    ()=>stepCta,
    "stepLabel",
    ()=>stepLabel,
    "storageKey",
    ()=>storageKey,
    "writeStored",
    ()=>writeStored
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)");
;
const CONTACT_PARAM = 'contact';
const BOOK_PARAM = 'book';
function parseScreen(spec, raw) {
    if (raw === CONTACT_PARAM) return {
        kind: 'contact'
    };
    if (raw === BOOK_PARAM) return {
        kind: 'book'
    };
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= spec.steps.length) return {
        kind: 'step',
        index: n - 1
    };
    return {
        kind: 'step',
        index: 0
    };
}
function screenParam(screen) {
    if (screen.kind === 'contact') return CONTACT_PARAM;
    if (screen.kind === 'book') return BOOK_PARAM;
    return String(screen.index + 1);
}
function sameScreen(a, b) {
    return screenParam(a) === screenParam(b);
}
function screenUrl(spec, pathname, screen, selection, search = '') {
    const own = new Set([
        'step',
        ...spec.steps.map((s)=>s.id)
    ]);
    const rest = [
        ...new URLSearchParams(search.replace(/^\?/, ''))
    ].filter(([k])=>!own.has(k));
    const tail = rest.length ? `&${new URLSearchParams(rest).toString()}` : '';
    return `${pathname}?step=${screenParam(screen)}&${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encodeFunnelSelection"])(spec, selection)}${tail}`;
}
function nextScreen(spec, screen) {
    if (screen.kind === 'step') return screen.index + 1 < spec.steps.length ? {
        kind: 'step',
        index: screen.index + 1
    } : {
        kind: 'contact'
    };
    return {
        kind: 'book'
    };
}
function prevScreen(spec, screen) {
    if (screen.kind === 'contact') return {
        kind: 'step',
        index: spec.steps.length - 1
    };
    if (screen.kind === 'book') return {
        kind: 'contact'
    };
    return screen.index > 0 ? {
        kind: 'step',
        index: screen.index - 1
    } : null;
}
function screenOrder(spec, screen) {
    if (screen.kind === 'step') return screen.index;
    return screen.kind === 'contact' ? spec.steps.length : spec.steps.length + 1;
}
function stepLabel(spec, screen) {
    if (screen.kind === 'step') return `Step ${screen.index + 1} of ${spec.steps.length}`;
    if (screen.kind === 'contact') return spec.contactStep.eyebrow;
    return null;
}
function progress(spec, screen) {
    if (screen.kind === 'step') return (screen.index + 1) / (spec.steps.length + 1);
    return 1;
}
function stepCta(spec, index) {
    return spec.steps[index]?.cta ?? 'Continue';
}
const first = (v)=>Array.isArray(v) ? v[0] : v;
function initialFromSearch(spec, search) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(search ?? {})){
        const value = first(v);
        if (typeof value === 'string') params.set(k, value);
    }
    return {
        screen: parseScreen(spec, params.get('step')),
        selection: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decodeFunnelSelection"])(spec, params),
        fromUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["answeredSteps"])(spec, params).length > 0
    };
}
const storageKey = (slug)=>`hq-funnel:${slug}`;
function session() {
    try {
        return ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : window.sessionStorage;
    } catch  {
        return null;
    }
}
function readStored(spec, slug, storage = session()) {
    try {
        const raw = storage?.getItem(storageKey(slug));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.v !== 1) return null;
        const result = parsed.result && typeof parsed.result === 'object' && parsed.result.estimate ? parsed.result : undefined;
        return {
            v: 1,
            selection: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, parsed.selection),
            result
        };
    } catch  {
        return null;
    }
}
function resultFor(spec, result, selection) {
    if (!result?.selection) return null;
    const a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, result.selection);
    const b = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, selection);
    return spec.steps.every((s)=>a[s.id] === b[s.id]) ? result : null;
}
function writeStored(slug, value, storage = session()) {
    try {
        storage?.setItem(storageKey(slug), JSON.stringify(value));
    } catch  {
    // Storage full or blocked: the URL still carries the picks.
    }
}
function resolvePhoto(photo, missing) {
    if (photo.fallback && missing.has(photo.src)) return {
        ...photo.fallback,
        isFallback: true
    };
    return {
        ...photo,
        srcSm: photo.srcSm && missing.has(photo.srcSm) ? undefined : photo.srcSm,
        isFallback: false
    };
}
function photoSrcSet(photo) {
    if (!photo.srcSm) return undefined;
    const w = photo.widths ?? {
        sm: 1200,
        full: 1800
    };
    return `${photo.srcSm} ${w.sm}w, ${photo.src} ${w.full}w`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/step-photo.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StepPhoto",
    ()=>StepPhoto
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/state.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
/** The photo card is this wide: the content column (32 px gutters on phones, 560 px on desktop). */ const SIZES = '(min-width: 1024px) 560px, calc(100vw - 64px)';
function StepPhoto({ photos, selected, fit = 'cover', priority = false }) {
    _s();
    const [failed, setFailed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Several options can share one file (e.g. every size on the fallback): one layer per distinct file.
    const layers = [];
    for (const [id, raw] of photos){
        const photo = failed[raw.src] && raw.fallback ? {
            ...raw.fallback,
            isFallback: true
        } : raw;
        const hit = layers.find((l)=>l.src === photo.src);
        if (hit) hit.ids.push(id);
        else layers.push({
            src: photo.src,
            photo,
            ids: [
                id
            ]
        });
    }
    const shown = layers.find((l)=>l.ids.includes(selected)) ?? layers[0];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fn-photo relative w-full overflow-hidden rounded-[12px] bg-white",
        children: [
            layers.map((layer)=>{
                const on = layer === shown;
                const contain = fit === 'contain' && !layer.photo.isFallback;
                return(// eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP files with their own 1200 / 1800 px srcset
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: layer.photo.src,
                    srcSet: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoSrcSet"])(layer.photo),
                    sizes: SIZES,
                    alt: on ? layer.photo.alt : '',
                    "aria-hidden": on ? undefined : true,
                    loading: "eager",
                    decoding: "async",
                    // The visible layer first; the others (needed only on a tap) never compete with it.
                    fetchPriority: on ? priority ? 'high' : 'auto' : 'low',
                    draggable: false,
                    onError: ()=>{
                        if (layer.photo.isFallback) return;
                        const original = photos.find(([id])=>layer.ids.includes(id))?.[1];
                        if (original?.fallback) setFailed((f)=>({
                                ...f,
                                [original.src]: true
                            }));
                    },
                    className: `fn-layer absolute inset-0 h-full w-full select-none ${contain ? 'scale-[1.3] object-contain' : 'object-cover'} ${on ? 'opacity-100' : 'opacity-0'}`
                }, layer.src, false, {
                    fileName: "[project]/components/estimator/funnel/step-photo.tsx",
                    lineNumber: 49,
                    columnNumber: 11
                }, this));
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/step-photo.tsx",
                lineNumber: 71,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/step-photo.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_s(StepPhoto, "fJWHSUlEpqCye9CiCflYvBP6yVg=");
_c = StepPhoto;
var _c;
__turbopack_context__.k.register(_c, "StepPhoto");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/estimator/funnel/funnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Funnel",
    ()=>Funnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/chrome.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$slots$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/funnel/slots.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$funnel$2d$booking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/booking/funnel-booking.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$funnel$2d$contact$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/contact/funnel-contact.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$step$2d$photo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/step-photo.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/state.ts [app-client] (ecmascript)");
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
const HEADING_ID = 'fn-title';
function Funnel({ slug, spec, contractor, template, embedded = false, initialScreen = {
    kind: 'step',
    index: 0
}, initialSelection, fromUrl = false, missingPhotos = [], homeHref }) {
    _s();
    const [selection, setSelection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialSelection);
    const [screen, setScreen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialScreen);
    const [result, setResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [hydrated, setHydrated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [direction, setDirection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const missing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Funnel.useMemo[missing]": ()=>new Set(missingPhotos)
    }["Funnel.useMemo[missing]"], [
        missingPhotos
    ]);
    const selectionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(selection);
    selectionRef.current = selection;
    const screenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(screen);
    screenRef.current = screen;
    // The result only counts for the picks it was priced for (else the booking step is closed).
    const current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resultFor"])(spec, result, selection);
    const currentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(current);
    currentRef.current = current;
    /* ---------------- Restore once, then keep URL + storage in step ---------------- */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Funnel.useEffect": ()=>{
            const stored = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readStored"])(spec, slug);
            let sel = selectionRef.current;
            if (stored && !fromUrl) sel = stored.selection;
            const res = stored?.result ?? null;
            let scr = screenRef.current;
            // The booking step needs a lead sent for these picks; without one (new tab, cleared storage, edited URL) the contact step opens.
            if (scr.kind === 'book' && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resultFor"])(spec, res, sel)) scr = {
                kind: 'contact'
            };
            setSelection(sel);
            setResult(res);
            setScreen(scr);
            window.history.replaceState({
                ...window.history.state ?? {},
                fn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(scr)
            }, '', (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, scr, sel, window.location.search));
            setHydrated(true);
            const onPop = {
                "Funnel.useEffect.onPop": ()=>{
                    let next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseScreen"])(spec, new URLSearchParams(window.location.search).get('step'));
                    if (next.kind === 'book' && !currentRef.current) next = {
                        kind: 'contact'
                    };
                    const cur = screenRef.current;
                    setDirection((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenOrder"])(spec, next) < (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenOrder"])(spec, cur) ? 'back' : 'fwd');
                    setScreen(next);
                    // An older entry carries the picks of its time: keep the current ones.
                    window.history.replaceState(window.history.state, '', (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, next, selectionRef.current, window.location.search));
                }
            }["Funnel.useEffect.onPop"];
            window.addEventListener('popstate', onPop);
            return ({
                "Funnel.useEffect": ()=>window.removeEventListener('popstate', onPop)
            })["Funnel.useEffect"];
        }
    }["Funnel.useEffect"], [
        spec,
        slug,
        fromUrl
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Funnel.useEffect": ()=>{
            if (!hydrated) return;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writeStored"])(slug, {
                v: 1,
                selection,
                result: result ?? undefined
            });
            const url = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, screen, selection, window.location.search);
            if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
        }
    }["Funnel.useEffect"], [
        hydrated,
        slug,
        spec,
        selection,
        screen,
        result
    ]);
    // ?step=book whose picks no longer match the sent ones (or with nothing sent): back to the contact step.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Funnel.useEffect": ()=>{
            if (!hydrated || screen.kind !== 'book' || current) return;
            setScreen({
                kind: 'contact'
            });
            window.history.replaceState({
                fn: 'contact'
            }, '', (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, {
                kind: 'contact'
            }, selectionRef.current, window.location.search));
        }
    }["Funnel.useEffect"], [
        hydrated,
        screen,
        current,
        spec
    ]);
    /* ---------------- Navigation ---------------- */ const firstPaint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Funnel.useEffect": ()=>{
            if (firstPaint.current) {
                firstPaint.current = false;
                return;
            }
            // New content at the top, focus on its question (keyboard and screen-reader users land where the page changed).
            window.scrollTo({
                top: 0
            });
            document.getElementById(HEADING_ID)?.focus({
                preventScroll: true
            });
        }
    }["Funnel.useEffect"], [
        screen
    ]);
    const go = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Funnel.useCallback[go]": (next)=>{
            const cur = screenRef.current;
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sameScreen"])(cur, next)) return;
            setDirection((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenOrder"])(spec, next) < (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenOrder"])(spec, cur) ? 'back' : 'fwd');
            setScreen(next);
            const state = {
                fn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(next),
                fnFrom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(cur)
            };
            window.history.pushState(state, '', (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, next, selectionRef.current, window.location.search));
        }
    }["Funnel.useCallback[go]"], [
        spec
    ]);
    const back = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Funnel.useCallback[back]": ()=>{
            const cur = screenRef.current;
            const prev = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["prevScreen"])(spec, cur);
            if (!prev) return;
            const state = window.history.state;
            // We pushed this entry from the previous screen: the browser's Back is the same move (and keeps history tidy).
            if (state?.fn === (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(cur) && state.fnFrom === (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(prev)) {
                window.history.back();
                return;
            }
            setDirection('back');
            setScreen(prev);
            window.history.replaceState({
                fn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(prev)
            }, '', (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenUrl"])(spec, window.location.pathname, prev, selectionRef.current, window.location.search));
        }
    }["Funnel.useCallback[back]"], [
        spec
    ]);
    const onDone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Funnel.useCallback[onDone]": (res)=>{
            setResult(res);
            currentRef.current = res;
            go({
                kind: 'book'
            });
        }
    }["Funnel.useCallback[onDone]"], [
        go
    ]);
    const openSent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Funnel.useCallback[openSent]": ()=>go({
                kind: 'book'
            })
    }["Funnel.useCallback[openSent]"], [
        go
    ]);
    /* ---------------- Preload the next step's photos while this one is looked at ---------------- */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Funnel.useEffect": ()=>{
            if (!hydrated || screen.kind !== 'step') return;
            const next = spec.steps[screen.index + 1];
            if (!next) return;
            const t = window.setTimeout({
                "Funnel.useEffect.t": ()=>{
                    for (const p of Object.values((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepOptionPhotos"])(spec, next.id, selection))){
                        const shown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolvePhoto"])(p, missing);
                        const img = new window.Image();
                        img.decoding = 'async';
                        const srcset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["photoSrcSet"])(shown);
                        if (srcset) {
                            img.sizes = window.innerWidth >= 1024 ? '560px' : `${window.innerWidth - 64}px`;
                            img.srcset = srcset;
                        }
                        img.src = shown.src;
                    }
                }
            }["Funnel.useEffect.t"], 250);
            return ({
                "Funnel.useEffect": ()=>window.clearTimeout(t)
            })["Funnel.useEffect"];
        }
    }["Funnel.useEffect"], [
        hydrated,
        screen,
        spec,
        selection,
        missing
    ]);
    /* ---------------- Render ---------------- */ const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepLabel"])(spec, screen);
    const canGoBack = screen.kind !== 'book' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["prevScreen"])(spec, screen) !== null;
    const enter = direction === 'back' ? 'fn-enter-back' : direction === 'fwd' ? 'fn-enter-fwd' : '';
    // The embed layout already wraps the page in <main id="main">.
    const Main = embedded ? 'div' : 'main';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "es-fn flex min-h-[100dvh] flex-1 flex-col",
        "data-funnel-screen": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(screen),
        children: [
            embedded ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "mx-auto flex h-[46px] w-full max-w-[1120px] items-center px-5 sm:px-8 lg:h-[68px]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: homeHref ?? `/estimator/${slug}`,
                    "aria-label": `${contractor.contractorName} home`,
                    className: "-mx-1 rounded-[4px] px-1 py-1 focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "lg:hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FunnelLogo"], {
                                contractor: contractor,
                                height: 26,
                                priority: true
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 228,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/funnel.tsx",
                            lineNumber: 227,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden lg:block",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FunnelLogo"], {
                                contractor: contractor,
                                height: 32
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 231,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/funnel.tsx",
                            lineNumber: 230,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                    lineNumber: 226,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 225,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Main, {
                id: embedded ? undefined : 'main',
                className: `flex-1 ${embedded ? 'pt-3' : ''}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto w-full max-w-[624px] px-8 pb-12 lg:pb-16 lg:pt-2",
                    children: [
                        label ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StepBar, {
                            label: label,
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["progress"])(spec, screen),
                            onBack: canGoBack ? back : undefined
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/funnel.tsx",
                            lineNumber: 238,
                            columnNumber: 20
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: enter,
                            children: screen.kind === 'step' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StepScreen, {
                                spec: spec,
                                index: screen.index,
                                selection: selection,
                                missing: missing,
                                first: screen.index === 0,
                                onPick: (stepId, optionId)=>setSelection((s)=>({
                                            ...s,
                                            [stepId]: optionId
                                        })),
                                onContinue: ()=>go((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nextScreen"])(spec, screen))
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 241,
                                columnNumber: 15
                            }, this) : screen.kind === 'contact' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-h-[560px] pt-[22px] lg:pt-10",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$contact$2f$funnel$2d$contact$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FunnelContactScreen"], {
                                    slug: slug,
                                    spec: spec,
                                    contractor: contractor,
                                    template: template,
                                    selection: selection,
                                    embedded: embedded,
                                    headingId: HEADING_ID,
                                    onDone: onDone,
                                    onOpenSent: current ? openSent : undefined
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                    lineNumber: 252,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 251,
                                columnNumber: 15
                            }, this) : current ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6 lg:pt-8",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$booking$2f$funnel$2d$booking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FunnelBookingScreen"], {
                                    slug: slug,
                                    spec: spec,
                                    contractor: contractor,
                                    template: template,
                                    selection: current.selection ?? selection,
                                    result: current,
                                    embedded: embedded,
                                    headingId: HEADING_ID
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                    lineNumber: 266,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 265,
                                columnNumber: 15
                            }, this) : // Server render of ?step=book: the result is only in this browser's storage (read right after hydration).
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-h-[60vh]",
                                "aria-busy": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 279,
                                columnNumber: 15
                            }, this)
                        }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["screenParam"])(screen), false, {
                            fileName: "[project]/components/estimator/funnel/funnel.tsx",
                            lineNumber: 239,
                            columnNumber: 11
                        }, this),
                        embedded && (spec.photoNote || contractor.licenseLabel) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-8 text-[12px] leading-[17px] text-[var(--fn-muted)]",
                            children: [
                                spec.photoNote,
                                contractor.licenseLabel
                            ].filter(Boolean).join(' · ')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/funnel.tsx",
                            lineNumber: 284,
                            columnNumber: 13
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                    lineNumber: 237,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 236,
                columnNumber: 7
            }, this),
            embedded ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FunnelFooter"], {
                contractor: contractor,
                note: spec.photoNote
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 290,
                columnNumber: 26
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/funnel.tsx",
        lineNumber: 223,
        columnNumber: 5
    }, this);
}
_s(Funnel, "Vg7AYOevgOHwFYwBL/1MVtM5RP4=");
_c = Funnel;
/** "STEP 2 OF 3" over a thin progress bar, with the back arrow in the gutter. */ function StepBar({ label, value, onBack }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative pl-[26px] pt-[7px] lg:pt-3",
        children: [
            onBack ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onBack,
                "aria-label": "Back",
                className: "absolute left-[-14px] top-[2px] flex size-11 touch-manipulation items-center justify-center rounded-full text-[#3d3b37] transition-colors duration-150 hover:text-[var(--fn-ink)] focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)] motion-reduce:transition-none lg:top-[11px]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                    "aria-hidden": "true",
                    className: "size-[17px]",
                    strokeWidth: 1.6
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                    lineNumber: 306,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 300,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "fn-eyebrow",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 309,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "progressbar",
                "aria-label": "Progress",
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": Math.round(value * 100),
                className: "mt-[9px] h-1 overflow-hidden rounded-full bg-[var(--fn-track)]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "fn-bar-fill h-full w-full rounded-full bg-[var(--fn-blue)]",
                    style: {
                        transform: `scaleX(${value})`
                    }
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                    lineNumber: 318,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 310,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/funnel.tsx",
        lineNumber: 298,
        columnNumber: 5
    }, this);
}
_c1 = StepBar;
/** One question: the photo, the question, the option cards and the button. */ function StepScreen({ spec, index, selection, missing, first, onPick, onContinue }) {
    _s1();
    const step = spec.steps[index];
    const picked = selection[step.id];
    const photos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StepScreen.useMemo[photos]": ()=>Object.entries((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepOptionPhotos"])(spec, step.id, selection)).map({
                "StepScreen.useMemo[photos]": ([id, p])=>[
                        id,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolvePhoto"])(p, missing)
                    ]
            }["StepScreen.useMemo[photos]"])
    }["StepScreen.useMemo[photos]"], [
        spec,
        step.id,
        selection,
        missing
    ]);
    const onSubmit = (e)=>{
        e.preventDefault();
        onContinue();
    };
    const isView = step.photo.kind === 'view';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        onSubmit: onSubmit,
        noValidate: true,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-[19px] lg:pt-7",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$step$2d$photo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StepPhoto"], {
                    photos: photos,
                    selected: picked,
                    fit: isView ? 'cover' : 'contain',
                    priority: first
                }, void 0, false, {
                    fileName: "[project]/components/estimator/funnel/funnel.tsx",
                    lineNumber: 357,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 356,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                id: HEADING_ID,
                tabIndex: -1,
                className: "fn-h1 mt-[18px] text-balance outline-none lg:mt-7",
                children: step.label
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 364,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
                className: "mt-5 lg:mt-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                        className: "sr-only",
                        children: step.label
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/funnel.tsx",
                        lineNumber: 368,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-3",
                        children: step.options.map((o)=>{
                            const on = o.id === picked;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "fn-option px-[15px] py-[10px] lg:px-5 lg:py-[14px]",
                                "data-selected": on ? '' : undefined,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "radio",
                                        name: step.id,
                                        value: o.id,
                                        checked: on,
                                        onChange: ()=>onPick(step.id, o.id),
                                        className: "sr-only"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                        lineNumber: 374,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block text-[17px] font-[480] leading-[22px] tracking-[-0.01em] lg:text-[18px] lg:leading-[24px] text-[var(--fn-ink)]",
                                        children: o.title
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                        lineNumber: 382,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block mt-[3px] text-pretty text-[15px] leading-[20px] text-[var(--fn-muted)] lg:text-[16px] lg:leading-[22px]",
                                        children: o.subtitle
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                        lineNumber: 383,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, o.id, true, {
                                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                                lineNumber: 373,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/funnel/funnel.tsx",
                        lineNumber: 369,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 367,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "submit",
                className: "fn-btn mt-[13px] h-[47px] w-full text-[17px] lg:mt-4 lg:h-[52px] lg:text-[18px]",
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepCta"])(spec, index)
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/funnel.tsx",
                lineNumber: 389,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/funnel.tsx",
        lineNumber: 355,
        columnNumber: 5
    }, this);
}
_s1(StepScreen, "gJbcutbihXHeaKL89RecGCST2n4=");
_c2 = StepScreen;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Funnel");
__turbopack_context__.k.register(_c1, "StepBar");
__turbopack_context__.k.register(_c2, "StepScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_9676703f._.js.map