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
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/render-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Browser side of the optional photoreal render: the finished top-down design
 * (a PNG of the live scene) goes to POST /api/estimator/[slug]/render, which
 * asks kie.ai for a photorealistic aerial image; the screen polls GET
 * /api/estimator/[slug]/render/[taskId]. Only after the contact step: the
 * lead response carries a short-lived renderToken. Off when the server has
 * no KIE_API_KEY (the start call answers { ok: false, reason: 'disabled' }).
 * Neither call throws: every failure maps to the union types below.
 */ __turbopack_context__.s([
    "CHECK_TIMEOUT_MS",
    ()=>CHECK_TIMEOUT_MS,
    "MAX_UPLOAD_DATA_URL_CHARS",
    ()=>MAX_UPLOAD_DATA_URL_CHARS,
    "RENDER_POLL_MS",
    ()=>RENDER_POLL_MS,
    "RENDER_TIMEOUT_MS",
    ()=>RENDER_TIMEOUT_MS,
    "START_TIMEOUT_MS",
    ()=>START_TIMEOUT_MS,
    "checkRender",
    ()=>checkRender,
    "fitForUpload",
    ()=>fitForUpload,
    "startRender",
    ()=>startRender
]);
const RENDER_POLL_MS = 4000;
const RENDER_TIMEOUT_MS = 4 * 60 * 1000;
const MAX_UPLOAD_DATA_URL_CHARS = 4_000_000;
const OFFLINE = 'Could not reach the server. Check your connection and try again.';
const START_TIMEOUT_MS = 60_000;
const CHECK_TIMEOUT_MS = 15_000;
/** An AbortSignal that fires after `ms` (AbortSignal.timeout is missing on older Safari). */ function timeoutSignal(ms) {
    if (typeof AbortController === 'undefined') return undefined;
    const controller = new AbortController();
    setTimeout(()=>controller.abort(), ms);
    return controller.signal;
}
const GENERIC = 'Something went wrong. Please try again.';
function loadImage(src) {
    return new Promise((resolve, reject)=>{
        const img = new Image();
        img.onload = ()=>resolve(img);
        img.onerror = ()=>reject(new Error('Image could not be read'));
        img.src = src;
    });
}
async function fitForUpload(dataUrl, maxChars = MAX_UPLOAD_DATA_URL_CHARS) {
    if (dataUrl.length <= maxChars || typeof document === 'undefined') return dataUrl;
    try {
        const img = await loadImage(dataUrl);
        for (const [scale, quality] of [
            [
                1,
                0.9
            ],
            [
                1,
                0.8
            ],
            [
                0.75,
                0.85
            ],
            [
                0.5,
                0.85
            ]
        ]){
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.naturalWidth * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) break;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const jpeg = canvas.toDataURL('image/jpeg', quality);
            if (jpeg.length <= maxChars) return jpeg;
        }
    } catch  {}
    return dataUrl;
}
function isRenderStart(value) {
    if (!value || typeof value !== 'object') return false;
    const v = value;
    return v.ok === true ? typeof v.taskId === 'string' : v.ok === false && typeof v.reason === 'string' && typeof v.message === 'string';
}
function isRenderStatus(value) {
    if (!value || typeof value !== 'object') return false;
    const v = value;
    if (v.status === 'running') return true;
    if (v.status === 'done') return typeof v.imageUrl === 'string';
    return v.status === 'failed' && typeof v.message === 'string';
}
async function startRender(slug, renderToken, pngDataUrl) {
    try {
        const image = await fitForUpload(pngDataUrl);
        const res = await fetch(`/api/estimator/${encodeURIComponent(slug)}/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                renderToken,
                image
            }),
            signal: timeoutSignal(START_TIMEOUT_MS)
        });
        const data = await res.json().catch(()=>null);
        if (isRenderStart(data)) return data;
        if (res.status === 413) return {
            ok: false,
            reason: 'invalid',
            message: 'That picture is too large to send.'
        };
        return {
            ok: false,
            reason: 'error',
            message: GENERIC
        };
    } catch  {
        return {
            ok: false,
            reason: 'error',
            message: OFFLINE
        };
    }
}
async function checkRender(slug, renderToken, taskId) {
    try {
        const res = await fetch(`/api/estimator/${encodeURIComponent(slug)}/render/${encodeURIComponent(taskId)}`, // A header, not ?token=: query strings end up in hosting and proxy access logs.
        // A check that times out reads as 'running' (below); the session's overall timeout still applies.
        {
            cache: 'no-store',
            headers: {
                'x-render-token': renderToken
            },
            signal: timeoutSignal(CHECK_TIMEOUT_MS)
        });
        const data = await res.json().catch(()=>null);
        if (isRenderStatus(data)) return data;
        return res.status >= 500 ? {
            status: 'running'
        } : {
            status: 'failed',
            message: GENERIC
        };
    } catch  {
        return {
            status: 'running'
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/bath/textures.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATH_DEFAULT_METAL",
    ()=>BATH_DEFAULT_METAL,
    "BATH_DEFAULT_TEXTURES",
    ()=>BATH_DEFAULT_TEXTURES,
    "BATH_METAL_COLORS",
    ()=>BATH_METAL_COLORS,
    "BATH_SPRITES",
    ()=>BATH_SPRITES,
    "BATH_SPRITE_DIR",
    ()=>BATH_SPRITE_DIR,
    "BATH_TEXTURES",
    ()=>BATH_TEXTURES,
    "BATH_TEXTURE_DIR",
    ()=>BATH_TEXTURE_DIR,
    "bathOptionTexture",
    ()=>bathOptionTexture
]);
const BATH_TEXTURE_DIR = '/estimator/scene/bath/textures/';
const BATH_SPRITE_DIR = '/estimator/scene/bath/sprites/';
const tex = (id)=>`${BATH_TEXTURE_DIR}${id}.webp`;
const sprite = (id)=>`${BATH_SPRITE_DIR}${id}.webp`;
const BATH_TEXTURES = {
    // 3 x 6" subway in running bond: 3 tiles across, 6 courses.
    tile_subway: {
        src: tex('tile_subway'),
        realFt: 1.5,
        fallback: '#ebebe5'
    },
    // 24 x 48" slabs, 2 across (joints every 2 ft; the slab ends sit off-frame).
    tile_large_porcelain: {
        src: tex('tile_large_porcelain'),
        realFt: 4,
        fallback: '#d4cec2'
    },
    // 4 x 4" handmade squares, about 6 x 6.
    tile_zellige: {
        src: tex('tile_zellige'),
        realFt: 2,
        fallback: '#a6baa7'
    },
    tile_marble: {
        src: tex('tile_marble'),
        realFt: 4,
        fallback: '#e0dedb'
    },
    // One 12" tile, joints through the middle.
    tile_plain: {
        src: tex('tile_plain'),
        realFt: 1,
        fallback: '#e6e4d9'
    },
    // 8 x 48" wood-look planks.
    floor_porcelain_wood: {
        src: tex('floor_porcelain_wood'),
        realFt: 6,
        fallback: '#b59571'
    },
    // One 24" tile, joints through the middle.
    floor_large_stone: {
        src: tex('floor_large_stone'),
        realFt: 2,
        fallback: '#c2bdb1'
    },
    // 2" hex.
    floor_hex_mosaic: {
        src: tex('floor_hex_mosaic'),
        realFt: 1.5,
        fallback: '#ecebe5'
    },
    floor_lvp: {
        src: tex('floor_lvp'),
        realFt: 6,
        fallback: '#a48664'
    },
    // tile_plain recoloured beige: one 12" tile.
    floor_plain: {
        src: tex('floor_plain'),
        realFt: 1,
        fallback: '#d6cfc1'
    },
    // Procedural paint (fine stipple, no colour drift) in each generated colour: scripts/generate-bath-assets.mjs touchup.
    paint_soft_white: {
        src: tex('paint_soft_white'),
        realFt: 4,
        fallback: '#f0eee6'
    },
    paint_greige: {
        src: tex('paint_greige'),
        realFt: 4,
        fallback: '#d2c9b9'
    },
    paint_sage: {
        src: tex('paint_sage'),
        realFt: 4,
        fallback: '#b3bea4'
    },
    paint_navy: {
        src: tex('paint_navy'),
        realFt: 4,
        fallback: '#2d3a52'
    },
    counter_quartz_white: {
        src: tex('counter_quartz_white'),
        realFt: 2.5,
        fallback: '#efeeec'
    },
    counter_marble_look: {
        src: tex('counter_marble_look'),
        realFt: 2.4,
        fallback: '#ebe9e4'
    },
    // Procedural smooth trowelled concrete (touchup).
    counter_concrete: {
        src: tex('counter_concrete'),
        realFt: 3,
        fallback: '#999793'
    },
    vanity_white: {
        src: tex('vanity_white'),
        realFt: 3,
        fallback: '#efeee9'
    },
    vanity_wood: {
        src: tex('vanity_wood'),
        realFt: 3,
        fallback: '#b38b63'
    },
    // Recolour of the white satin finish.
    vanity_navy_green: {
        src: tex('vanity_navy_green'),
        realFt: 3,
        fallback: '#2e494b'
    },
    vanity_black: {
        src: tex('vanity_black'),
        realFt: 3,
        fallback: '#29282b'
    }
};
const BATH_SPRITES = {
    // Apron-front 60" tub (front face only).
    tub_alcove: {
        src: sprite('tub_alcove'),
        widthFt: 5,
        heightFt: 1.54
    },
    tub_freestanding: {
        src: sprite('tub_freestanding'),
        widthFt: 5.5,
        heightFt: 2.13
    },
    // Procedural frameless panel, clamps on the left edge.
    shower_glass: {
        src: sprite('shower_glass'),
        widthFt: 3,
        heightFt: 6.5
    },
    // Wall arm + head, seen face-on.
    shower_head: {
        src: sprite('shower_head'),
        widthFt: 0.6,
        heightFt: 0.84
    },
    // 12" disc on a ceiling drop arm (arm included).
    rain_head: {
        src: sprite('rain_head'),
        widthFt: 1,
        heightFt: 0.81
    },
    toilet: {
        src: sprite('toilet'),
        widthFt: 1.12,
        heightFt: 2.6
    },
    // 36" shaker with a 4" backsplash on the white quartz top.
    vanity_single: {
        src: sprite('vanity_single'),
        widthFt: 3,
        heightFt: 3.39
    },
    // 72"-style double, drawn a little low: kept to the image's proportions.
    vanity_double: {
        src: sprite('vanity_double'),
        widthFt: 6.5,
        heightFt: 2.26
    },
    vanity_floating: {
        src: sprite('vanity_floating'),
        widthFt: 4,
        heightFt: 1.43
    },
    mirror: {
        src: sprite('mirror'),
        widthFt: 2.2,
        heightFt: 3.19
    },
    mirror_led: {
        src: sprite('mirror_led'),
        widthFt: 2.4,
        heightFt: 3.39
    },
    sconce: {
        src: sprite('sconce'),
        widthFt: 0.69,
        heightFt: 1.2
    },
    // Side elevation, spout pointing right (flip with scaleX(-1) for the other way).
    faucet_chrome: {
        src: sprite('faucet_chrome'),
        widthFt: 0.47,
        heightFt: 0.7
    },
    faucet_matte_black: {
        src: sprite('faucet_matte_black'),
        widthFt: 0.47,
        heightFt: 0.7
    },
    faucet_brushed_gold: {
        src: sprite('faucet_brushed_gold'),
        widthFt: 0.47,
        heightFt: 0.7
    },
    faucet_brushed_nickel: {
        src: sprite('faucet_brushed_nickel'),
        widthFt: 0.47,
        heightFt: 0.7
    },
    // White towel on a chrome bar.
    towel: {
        src: sprite('towel'),
        widthFt: 1.6,
        heightFt: 1.93
    },
    plant: {
        src: sprite('plant'),
        widthFt: 0.93,
        heightFt: 2
    }
};
const BATH_METAL_COLORS = {
    chrome: '#c9ced3',
    matte_black: '#2a2a2c',
    brushed_gold: '#c2a26a',
    brushed_nickel: '#a9a8a2'
};
const BATH_DEFAULT_METAL = 'chrome';
/** Template option -> its texture, for the picture and for material samples on option cards. */ const OPTION_TEXTURES = {
    showerTile: {
        subway: 'tile_subway',
        large_porcelain: 'tile_large_porcelain',
        zellige: 'tile_zellige',
        marble: 'tile_marble'
    },
    floor: {
        porcelain_wood: 'floor_porcelain_wood',
        large_stone: 'floor_large_stone',
        hex_mosaic: 'floor_hex_mosaic',
        lvp: 'floor_lvp'
    },
    paint: {
        soft_white: 'paint_soft_white',
        greige: 'paint_greige',
        sage: 'paint_sage',
        navy: 'paint_navy'
    },
    counter: {
        quartz_white: 'counter_quartz_white',
        marble_look: 'counter_marble_look',
        concrete: 'counter_concrete'
    },
    vanityFinish: {
        white: 'vanity_white',
        wood: 'vanity_wood',
        navy_green: 'vanity_navy_green',
        black: 'vanity_black'
    }
};
const BATH_DEFAULT_TEXTURES = {
    showerTile: 'tile_plain',
    floor: 'floor_plain',
    paint: 'paint_soft_white',
    counter: 'counter_quartz_white',
    vanityFinish: 'vanity_white'
};
function bathOptionTexture(questionId, optionId) {
    return OPTION_TEXTURES[questionId]?.[optionId] ?? null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/bath/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Live bathroom scene: the shared contract.
 *
 * The estimator turns the homeowner's answers into a BathSceneSpec (pure, see
 * scene.ts) and <BathScene> draws it as one layered picture of THEIR bathroom
 * that updates instantly on every pick. Textures and sprites are pre-generated
 * image files (kie.ai or procedural, see textures.ts); nothing is generated
 * while a visitor clicks. No photo from the web is ever used.
 *
 * Change these types deliberately: scene.ts, textures.ts, the BathScene
 * renderer, the bath builder adapter and the photoreal render build on them.
 */ /** Scene canvas, in SVG/canvas units: 3:2, the same frame, PNG export and render aspect as the pool. */ __turbopack_context__.s([
    "BATH_SCENE",
    ()=>BATH_SCENE,
    "BATH_SPRITE_IDS",
    ()=>BATH_SPRITE_IDS,
    "BATH_TEXTURE_IDS",
    ()=>BATH_TEXTURE_IDS
]);
const BATH_SCENE = {
    width: 1200,
    height: 800
};
const BATH_TEXTURE_IDS = [
    // Shower walls.
    'tile_subway',
    'tile_large_porcelain',
    'tile_zellige',
    'tile_marble',
    // Neutral default wall tile (nothing chosen / keep current).
    'tile_plain',
    // Floor.
    'floor_porcelain_wood',
    'floor_large_stone',
    'floor_hex_mosaic',
    'floor_lvp',
    // Neutral default floor.
    'floor_plain',
    // Painted wall, with a faint roller texture (one per colour).
    'paint_soft_white',
    'paint_greige',
    'paint_sage',
    'paint_navy',
    // Countertop.
    'counter_quartz_white',
    'counter_marble_look',
    'counter_concrete',
    // Vanity cabinet fronts.
    'vanity_white',
    'vanity_wood',
    'vanity_navy_green',
    'vanity_black'
];
const BATH_SPRITE_IDS = [
    'tub_alcove',
    'tub_freestanding',
    'shower_glass',
    'shower_head',
    'rain_head',
    'toilet',
    'vanity_single',
    'vanity_double',
    'vanity_floating',
    'mirror',
    'mirror_led',
    'sconce',
    'faucet_chrome',
    'faucet_matte_black',
    'faucet_brushed_gold',
    'faucet_brushed_nickel',
    'towel',
    'plant'
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/bath/geometry.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATH_CEILING_FT",
    ()=>BATH_CEILING_FT,
    "BATH_EYE_FT",
    ()=>BATH_EYE_FT,
    "bathAreaBoxes",
    ()=>bathAreaBoxes,
    "bathFocusPoint",
    ()=>bathFocusPoint,
    "bathLayout",
    ()=>bathLayout,
    "ceilingDepthAt",
    ()=>ceilingDepthAt,
    "fitCamera",
    ()=>fitCamera,
    "floorDepthAt",
    ()=>floorDepthAt,
    "frameEdgeDepths",
    ()=>frameEdgeDepths,
    "layoutNumbers",
    ()=>layoutNumbers,
    "project",
    ()=>project,
    "scaleAt",
    ()=>scaleAt,
    "wallDepthAt",
    ()=>wallDepthAt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/types.ts [app-client] (ecmascript)");
;
;
const BATH_CEILING_FT = 8;
const BATH_EYE_FT = 4.6;
/** Horizon (vanishing point) height in the frame. */ const VP_Y_FRAC = 0.4;
/** Widest lens used (px focal length at the 1200 px frame, ~81 deg horizontal). */ const FOCAL_MAX = 700;
const FOCAL_MIN = 320;
/** Back wall scale cap (px per ft) and how much of the frame width it may take. */ const SCALE_MAX = 60;
const BACK_WALL_FRAC = 0.74;
/** Drawn room limits (typed dimensions beyond these still draw a sensible room). */ const ROOM_W_MAX = 20;
const ROOM_D_MAX = 16;
/** Floor space right of a freestanding tub for its filler. */ const FILLER_ROOM = 0.45;
/** Beside a freestanding tub the separate shower stays shallow, so the tub never overlaps its glass. */ const SEPARATE_SHOWER_DEPTH = 3;
const FREESTANDING_DEPTH = 2.5;
const FREESTANDING_WALL_GAP = 0.35;
function project(cam, x, y, z) {
    return {
        x: cam.vpX + cam.f * (x - cam.camX) / z,
        y: cam.vpY - cam.f * (y - cam.eye) / z
    };
}
function scaleAt(cam, z) {
    return cam.f / z;
}
function floorDepthAt(cam, frameY) {
    return cam.f * cam.eye / Math.max(1e-6, frameY - cam.vpY);
}
function ceilingDepthAt(cam, frameY) {
    return cam.f * (cam.ceiling - cam.eye) / Math.max(1e-6, cam.vpY - frameY);
}
function wallDepthAt(cam, side, frameX) {
    const dx = side === 'left' ? cam.camX : cam.roomW - cam.camX;
    return cam.f * dx / Math.max(1e-6, side === 'left' ? cam.vpX - frameX : frameX - cam.vpX);
}
function frameEdgeDepths(cam) {
    return {
        floor: floorDepthAt(cam, cam.frameH),
        ceiling: ceilingDepthAt(cam, 0),
        left: wallDepthAt(cam, 'left', 0),
        right: wallDepthAt(cam, 'right', cam.frameW)
    };
}
const VANITY_W = {
    // small, medium, large
    single: [
        2.5,
        3,
        3.5
    ],
    double: [
        5,
        6,
        6.5
    ],
    floating: [
        3,
        4,
        5
    ]
};
const SIZE_INDEX = {
    small: 0,
    medium: 1,
    large: 2
};
function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}
function finiteOr(v, fallback) {
    return Number.isFinite(v) && v > 0 ? v : fallback;
}
function fitCamera(roomW, roomD) {
    const frameW = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_SCENE"].width;
    const frameH = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_SCENE"].height;
    const eye = BATH_EYE_FT;
    const ceiling = BATH_CEILING_FT;
    const vpX = frameW / 2;
    const vpY = frameH * VP_Y_FRAC;
    const camX = roomW / 2;
    const s = Math.min(SCALE_MAX, BACK_WALL_FRAC * frameW / roomW);
    // Each surface leaves the frame at depth f * m; the room front (zBack - D)
    // must be nearer than all of them: f / s - D <= f * m.
    const m = Math.min(camX / vpX, eye / (frameH - vpY), (ceiling - eye) / vpY);
    const gap = 1 / s - m;
    const fit = gap > 0 ? 0.97 * roomD / gap : FOCAL_MAX;
    const f = clamp(fit, FOCAL_MIN, FOCAL_MAX);
    const zBack = f / s;
    return {
        f,
        s,
        eye,
        camX,
        vpX,
        vpY,
        zBack,
        zFront: zBack - roomD,
        roomW,
        roomD,
        ceiling,
        frameW,
        frameH
    };
}
function bathLayout(spec) {
    const size = SIZE_INDEX[spec.room] ?? 1;
    const defaults = [
        [
            8,
            5
        ],
        [
            10,
            8
        ],
        [
            14,
            12
        ]
    ];
    const [dl, dw] = defaults[size];
    const a = finiteOr(spec.lengthFt, dl);
    const b = finiteOr(spec.widthFt, dw);
    // Look across the long wall: it holds the vanity and the bathing zone.
    const wallW = clamp(Math.max(a, b), 5, ROOM_W_MAX);
    const roomD = clamp(Math.min(a, b), 4.5, ROOM_D_MAX);
    const bathing = spec.bathing;
    const separate = bathing === 'tub_and_shower';
    const walkIn = bathing === 'walk_in' || separate;
    const alcoveTub = bathing === 'tub_shower' || bathing === 'existing';
    // Widths along the back wall.
    const showerW = walkIn ? (separate ? [
        3.2,
        3.6,
        4
    ] : [
        3.4,
        4,
        5
    ])[size] : 0;
    const showerDepth = walkIn ? separate ? SEPARATE_SHOWER_DEPTH : [
        3,
        3.2,
        3.6
    ][size] : 0;
    const alcoveW = alcoveTub ? 5 : 0;
    const partitionW = alcoveTub ? 0.35 : 0;
    const tubW = separate ? [
        4.6,
        5,
        5.3
    ][size] : 0;
    const tubGap = separate ? 0.45 : 0;
    const vanityKind = spec.vanity ?? 'single';
    const vanityW = VANITY_W[vanityKind][size];
    const toiletW = 2.2;
    const rightGap = 0.35;
    const minGap = 0.25;
    const bathingW = showerW + alcoveW + partitionW + (separate ? tubGap + tubW + tubGap + FILLER_ROOM : 0);
    const core = bathingW + minGap + vanityW + rightGap;
    // The toilet always comes along: a narrow room is drawn wider rather than drop it.
    // A freestanding tub stands in front of the shower's glass return: it moves right until the picture
    // shows it clear of the glass (the camera depends on the room width, so fit twice).
    let tubShift = 0;
    let needed = core + toiletW;
    let roomW = Math.max(wallW, needed);
    for(let i = 0; separate && i < 3; i++){
        const cam = fitCamera(roomW, roomD);
        const zf = cam.zBack - FREESTANDING_WALL_GAP - FREESTANDING_DEPTH + 0.3;
        const clearX = cam.camX + (showerW - cam.camX) * zf / cam.zBack + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BATH_SPRITES"].tub_freestanding.widthFt / 2 * (zf / (zf - 0.3)) + 0.1;
        const cx = showerW + tubGap + tubShift + tubW / 2;
        if (cx >= clearX) break;
        tubShift += clearX - cx;
        needed = core + tubShift + toiletW;
        roomW = Math.max(wallW, needed);
    }
    const camera = fitCamera(roomW, roomD);
    const C = BATH_CEILING_FT;
    // Bathing zone.
    let shower = null;
    let alcove = null;
    let freestanding = null;
    let niche = null;
    let bench = null;
    let showerHead = null;
    let valve = null;
    let cursor = 0;
    if (walkIn) {
        shower = {
            x0: 0,
            x1: showerW,
            depth: showerDepth,
            tileTop: C,
            glass: true,
            curb: separate ? 0.15 : 0.12
        };
        const mid = showerW / 2;
        if (spec.extras.niche) niche = {
            x0: mid - 0.75,
            x1: mid + 0.75,
            y0: 4.45,
            y1: 5.45
        };
        if (spec.extras.bench) bench = {
            x1: 1.25,
            height: 1.5,
            zFromBack0: 0,
            zFromBack1: showerDepth - 0.35
        };
        showerHead = spec.extras.rainHead ? {
            x: mid,
            y: 7.25,
            kind: 'rain'
        } : {
            x: mid + 0.2,
            y: 6.6,
            kind: 'wall'
        };
        valve = {
            x: mid + 0.2,
            y: 3.6
        };
        cursor = showerW;
        if (separate) {
            const cx = cursor + tubGap + tubShift + tubW / 2;
            freestanding = {
                cx,
                width: tubW,
                depth: FREESTANDING_DEPTH,
                height: 1.95,
                zFront: camera.zBack - FREESTANDING_WALL_GAP - FREESTANDING_DEPTH
            };
            // Room on the right for the floor-mounted filler.
            cursor = cx + tubW / 2 + tubGap + FILLER_ROOM;
        }
    } else {
        const glass = spec.glass;
        alcove = {
            x0: 0,
            x1: alcoveW,
            depth: 2.55,
            rim: 1.75,
            tileTop: bathing === 'existing' ? 6.6 : 7.4,
            partition: {
                x0: alcoveW,
                x1: alcoveW + partitionW
            },
            glass
        };
        if (spec.extras.niche) niche = {
            x0: 1.6,
            x1: 3.0,
            y0: 3.4,
            y1: 4.4
        };
        showerHead = spec.extras.rainHead ? {
            x: 2.5,
            y: 7.2,
            kind: 'rain'
        } : {
            x: 2.5,
            y: 6.4,
            kind: 'wall'
        };
        valve = {
            x: 2.5,
            y: 2.8
        };
        cursor = alcoveW + partitionW;
    }
    // Vanity on the right, with spare wall split between the middle and the right corner.
    const slack = roomW - needed;
    const vanityX1 = roomW - rightGap - Math.min(slack * 0.3, 1.6);
    const vanityX0 = vanityX1 - vanityW;
    const toilet = {
        cx: (cursor + vanityX0) / 2
    };
    const floating = vanityKind === 'floating';
    const vanity = {
        kind: vanityKind,
        x0: vanityX0,
        x1: vanityX1,
        depth: 1.75,
        bottom: floating ? 0.95 : 0,
        top: floating ? 2.75 : 2.83,
        sinks: vanityKind === 'double' ? [
            vanityX0 + vanityW * 0.27,
            vanityX1 - vanityW * 0.27
        ] : [
            (vanityX0 + vanityX1) / 2
        ]
    };
    // Mirrors over each sink; sconces either side (shared in the middle of a double).
    const perSink = vanityW / vanity.sinks.length;
    const mirrorW = Math.min(spec.extras.ledMirror ? 2.5 : 2.2, perSink * 0.72);
    const mirrorY0 = vanity.top + 1.0;
    const mirrorY1 = Math.min(C - 0.75, mirrorY0 + (spec.extras.ledMirror ? 3.0 : 2.8));
    const mirrors = vanity.sinks.map((cx)=>({
            x0: cx - mirrorW / 2,
            x1: cx + mirrorW / 2,
            y0: mirrorY0,
            y1: mirrorY1
        }));
    const sconceY = Math.min(C - 1.2, mirrorY0 + 1.65);
    const sconceXs = [
        mirrors[0].x0 - 0.42
    ];
    for(let i = 1; i < mirrors.length; i++)sconceXs.push((mirrors[i - 1].x1 + mirrors[i].x0) / 2);
    sconceXs.push(mirrors[mirrors.length - 1].x1 + 0.42);
    const bathingRight = shower ? shower.x1 : alcove ? alcove.partition?.x1 ?? alcove.x1 : 0;
    const sconces = sconceXs.filter((x)=>x > bathingRight + 0.3 && x < roomW - 0.25).map((x)=>({
            x,
            y: sconceY
        }));
    // Window: over a freestanding tub, otherwise on the right wall near the back.
    const right = frameEdgeDepths(camera).right;
    const winLen = Math.min(2.6, Math.max(1.2, camera.zBack - right - 1.2));
    const window = freestanding ? {
        wall: 'back',
        rect: {
            x0: freestanding.cx - 1.5,
            x1: freestanding.cx + 1.5,
            y0: 4.3,
            y1: 7.2
        }
    } : {
        wall: 'right',
        z0: camera.zBack - 0.7 - winLen,
        z1: camera.zBack - 0.7,
        y0: 4.2,
        y1: 6.9
    };
    // Towel: on a hook between the bathing zone and the vanity when there is wall for it.
    const towelGapX0 = bathingRight + 0.2;
    const towelGapX1 = toilet.cx - 1.15 - 0.2;
    // (A freestanding tub has its towel draped over the rim instead.)
    const towel = !freestanding && towelGapX1 - towelGapX0 >= 1.5 ? {
        x: (towelGapX0 + towelGapX1) / 2,
        y: 5.6
    } : null;
    // Plant near the camera in the front-right corner, where the floor shows.
    const edges = frameEdgeDepths(camera);
    const plantZ = Math.max(edges.floor + 0.9, camera.zFront + 0.9, camera.zBack - roomD + 1);
    const plantVisibleRight = camera.camX + (camera.frameW - camera.vpX) * plantZ / camera.f;
    const plantX = Math.min(roomW - 0.7, plantVisibleRight - 0.45);
    const plant = plantZ < camera.zBack - vanity.depth - 1.2 && plantX > vanityX0 ? {
        x: plantX,
        z: plantZ
    } : null;
    // Ceiling cans: one over the shower or tub (its evening downlight), one over the vanity, one over a freestanding tub.
    const canZ = camera.zBack - Math.min(2.2, roomD * 0.3);
    const bathX = shower ? (shower.x0 + shower.x1) / 2 : alcove ? (alcove.x0 + alcove.x1) / 2 : roomW * 0.3;
    const bathDepth = shower?.depth ?? alcove?.depth ?? 2.4;
    const cans = [
        {
            x: bathX,
            z: camera.zBack - bathDepth / 2
        },
        ...freestanding ? [
            {
                x: freestanding.cx,
                z: canZ
            }
        ] : [],
        {
            x: (vanityX0 + vanityX1) / 2,
            z: canZ
        }
    ];
    return {
        camera,
        shower,
        alcove,
        freestanding,
        toilet,
        vanity,
        mirrors,
        sconces,
        window,
        niche,
        bench,
        showerHead,
        valve,
        towel,
        plant,
        cans
    };
}
function bathAreaBoxes(L) {
    const cam = L.camera;
    const zb = cam.zBack;
    const box = (a, b)=>({
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y)
        });
    const bathRight = L.freestanding ? L.freestanding.cx + L.freestanding.width / 2 + 0.4 : L.shower ? L.shower.x1 : L.alcove?.partition?.x1 ?? L.alcove?.x1 ?? 4;
    const bathNear = zb - Math.max(L.shower?.depth ?? 0, L.alcove?.depth ?? 0, L.freestanding ? zb - L.freestanding.zFront : 0);
    const v = L.vanity;
    return {
        bathing: box(project(cam, 0, BATH_CEILING_FT - 0.3, zb), project(cam, bathRight, 0, bathNear)),
        vanity: box(project(cam, v.x0 - 0.1, (L.mirrors[0]?.y1 ?? v.top + 3) + 0.2, zb), project(cam, v.x1 + 0.1, 0, zb - v.depth)),
        floor: box(project(cam, 0, 0, zb), {
            x: cam.frameW,
            y: cam.frameH
        }),
        walls: box(project(cam, 0, BATH_CEILING_FT, zb), project(cam, cam.roomW, 0, zb))
    };
}
function bathFocusPoint(L, target) {
    const cam = L.camera;
    if (target === 'shower') {
        const x0 = L.shower?.x0 ?? L.alcove?.x0 ?? 0;
        const x1 = L.shower?.x1 ?? L.alcove?.x1 ?? 4;
        const p = project(cam, (x0 + x1) / 2, 4.6, cam.zBack);
        return {
            x: p.x + 30,
            y: p.y
        };
    }
    const v = L.vanity;
    const p = project(cam, (v.x0 + v.x1) / 2, v.top + 0.9, cam.zBack);
    return {
        x: p.x - 60,
        y: p.y
    };
}
function layoutNumbers(value, out = []) {
    if (typeof value === 'number') out.push(value);
    else if (Array.isArray(value)) value.forEach((v)=>layoutNumbers(v, out));
    else if (value && typeof value === 'object') Object.values(value).forEach((v)=>layoutNumbers(v, out));
    return out;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/rasterize.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Turn the live <PoolScene> SVG into a PNG data URL, for the photoreal render
 * and the "save my design" download. Browser only (canvas), but the pieces
 * that do not need a DOM are exported and tested in node.
 *
 * An SVG drawn into a canvas through an <img> cannot load anything outside
 * itself, so every texture/sprite <image> is fetched (same origin only) and
 * inlined as a data URL first. Animations are frozen and outgoing crossfade
 * layers dropped so the snapshot is the settled design, not a mid-fade frame.
 */ __turbopack_context__.s([
    "FREEZE_CSS",
    ()=>FREEZE_CSS,
    "bytesToBase64",
    ()=>bytesToBase64,
    "fetchAsDataUrl",
    ()=>fetchAsDataUrl,
    "imageMime",
    ()=>imageMime,
    "inlinableUrl",
    ()=>inlinableUrl,
    "inlineImageHrefs",
    ()=>inlineImageHrefs,
    "rasterSize",
    ()=>rasterSize,
    "rasterizeScene",
    ()=>rasterizeScene
]);
const XLINK_NS = 'http://www.w3.org/1999/xlink';
function rasterSize(width) {
    const w = Math.min(4096, Math.max(64, Math.round(Number.isFinite(width) ? width : 1536)));
    return {
        width: w,
        height: Math.round(w * 2 / 3)
    };
}
function inlinableUrl(href, base) {
    const value = href?.trim();
    if (!value || value.startsWith('#') || value.startsWith('data:')) return null;
    if (value.startsWith('blob:')) return value;
    try {
        const url = new URL(value, base);
        const origin = new URL(base).origin;
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin ? url.href : null;
    } catch  {
        return null;
    }
}
const MIME_BY_EXT = {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    avif: 'image/avif'
};
function imageMime(url, header) {
    const type = header?.split(';')[0]?.trim().toLowerCase();
    if (type && type.startsWith('image/')) return type;
    const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
    return ext && MIME_BY_EXT[ext] || 'application/octet-stream';
}
function bytesToBase64(bytes) {
    let binary = '';
    const CHUNK = 0x8000;
    for(let i = 0; i < bytes.length; i += CHUNK){
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}
/** Fetched data URLs by absolute URL; a failed fetch is forgotten so the next snapshot retries it. */ const dataUrlCache = new Map();
async function fetchAsDataUrl(url, fetcher = fetch) {
    const cached = dataUrlCache.get(url);
    if (cached) return cached;
    const pending = (async ()=>{
        const res = await fetcher(url, {
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error(`Image ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        return `data:${imageMime(url, res.headers.get('content-type'))};base64,${bytesToBase64(bytes)}`;
    })();
    dataUrlCache.set(url, pending);
    pending.catch(()=>dataUrlCache.delete(url));
    return pending;
}
async function inlineImageHrefs(targets, base, load = (url)=>fetchAsDataUrl(url)) {
    await Promise.all(targets.map(async (el)=>{
        const href = el.getAttribute('href') ?? el.getAttributeNS?.(XLINK_NS, 'href') ?? el.getAttribute('xlink:href');
        if (!href || href.startsWith('data:') || href.startsWith('#')) return;
        const url = inlinableUrl(href, base);
        let data = null;
        if (url) {
            try {
                data = await load(url);
            } catch  {
                data = null;
            }
        }
        el.removeAttributeNS?.(XLINK_NS, 'href');
        el.removeAttribute('xlink:href');
        if (data) el.setAttribute('href', data);
        else el.removeAttribute('href');
    }));
}
const FREEZE_CSS = '*{animation:none!important;transition:none!important}';
function loadImage(src) {
    return new Promise((resolve, reject)=>{
        const img = new Image();
        img.decoding = 'async';
        img.onload = ()=>resolve(img);
        img.onerror = ()=>reject(new Error('The design could not be drawn.'));
        img.src = src;
    });
}
async function drawToPng(src, width, height) {
    const img = await loadImage(src);
    try {
        await img.decode();
    } catch  {}
    // Safari can paint nested data-URL images a frame late; give it one.
    await new Promise((r)=>setTimeout(r, 30));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot draw the design.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
}
async function rasterizeScene(svg, width = 1536) {
    if (typeof document === 'undefined') throw new Error('rasterizeScene runs in the browser.');
    const size = rasterSize(width);
    try {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('xmlns:xlink', XLINK_NS);
        clone.setAttribute('width', String(size.width));
        clone.setAttribute('height', String(size.height));
        clone.removeAttribute('class');
        clone.removeAttribute('style');
        // Outgoing crossfade layers would show at full opacity once animations stop.
        clone.querySelectorAll('.ps-fade-out').forEach((el)=>el.remove());
        const freeze = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        freeze.textContent = FREEZE_CSS;
        clone.appendChild(freeze);
        await inlineImageHrefs(Array.from(clone.querySelectorAll('image, feImage')), document.baseURI);
        const markup = new XMLSerializer().serializeToString(clone);
        const blobUrl = URL.createObjectURL(new Blob([
            markup
        ], {
            type: 'image/svg+xml;charset=utf-8'
        }));
        try {
            return await drawToPng(blobUrl, size.width, size.height);
        } catch  {
            // Some engines refuse blob-URL SVGs in a canvas; a data URL is the slower, safer route.
            return await drawToPng(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, size.width, size.height);
        } finally{
            URL.revokeObjectURL(blobUrl);
        }
    } catch (error) {
        throw error instanceof Error ? error : new Error('The design could not be drawn.');
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/bath/rasterize.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bathRasterSize",
    ()=>bathRasterSize,
    "rasterizeBathScene",
    ()=>rasterizeBathScene,
    "registerBathPainter",
    ()=>registerBathPainter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/rasterize.ts [app-client] (ecmascript)");
;
const painters = new WeakMap();
function registerBathPainter(canvas, painter) {
    painters.set(canvas, painter);
    return ()=>{
        if (painters.get(canvas) === painter) painters.delete(canvas);
    };
}
const bathRasterSize = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rasterSize"];
function isCanvas(el) {
    return !!el && typeof el.getContext === 'function' && typeof el.toDataURL === 'function';
}
async function rasterizeBathScene(el, width = 1536) {
    if (typeof document === 'undefined') throw new Error('rasterizeBathScene runs in the browser.');
    if (!isCanvas(el)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rasterizeScene"])(el, width);
    const size = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$rasterize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rasterSize"])(width);
    try {
        const painter = painters.get(el);
        let source = el;
        if (painter) source = await painter(size.width, size.height);
        if (source.width === size.width && source.height === size.height) return source.toDataURL('image/png');
        const out = document.createElement('canvas');
        out.width = size.width;
        out.height = size.height;
        const ctx = out.getContext('2d');
        if (!ctx) throw new Error('This browser cannot draw the design.');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, size.width, size.height);
        return out.toDataURL('image/png');
    } catch (error) {
        throw error instanceof Error ? error : new Error('The design could not be drawn.');
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/bath/scene.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXAMPLE_BATH_SCENE",
    ()=>EXAMPLE_BATH_SCENE,
    "buildBathScene",
    ()=>buildBathScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/geometry.ts [app-client] (ecmascript)");
;
;
const BATHING = [
    'walk_in',
    'tub_shower',
    'tub_and_shower'
];
const VANITIES = [
    'single',
    'double',
    'floating'
];
const PROJECTS = [
    'refresh',
    'full',
    'tub_to_shower'
];
function buildBathScene(template, input) {
    const answers = input.answers ?? {};
    const visible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, answers);
    const byId = new Map(visible.map((q)=>[
            q.id,
            q
        ]));
    const byRole = (role)=>visible.find((q)=>q.role === role);
    const picks = (q)=>q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers) : [];
    const material = (id)=>picks(byId.get(id))[0] ?? null;
    const geometry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["poolGeometry"])(template, {
        answers,
        dimensions: input.dimensions
    });
    const presetMedium = template.geometry.sizes.medium;
    const lengthFt = geometry.lengthFt > 0 ? geometry.lengthFt : presetMedium?.lengthFt ?? 10;
    const widthFt = geometry.widthFt > 0 ? geometry.widthFt : presetMedium?.widthFt ?? 8;
    const room = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sizeClassFor"])(template, geometry);
    const projectPick = picks(byRole('project'))[0];
    const project = PROJECTS.includes(projectPick) ? projectPick : 'full';
    const bathingPick = material('bathing');
    const bathing = BATHING.includes(bathingPick) ? bathingPick : !bathingPick && project === 'tub_to_shower' ? 'walk_in' : 'existing';
    const vanityPick = material('vanity');
    const extras = new Set(picks(byId.get('extras')));
    const scope = new Set(picks(byRole('scope')));
    return {
        project,
        room,
        lengthFt,
        widthFt,
        bathing,
        showerTile: material('showerTile'),
        glass: bathing === 'walk_in' || bathing === 'tub_and_shower',
        floor: material('floor'),
        paint: material('paint'),
        vanity: VANITIES.includes(vanityPick) ? vanityPick : null,
        vanityFinish: material('vanityFinish'),
        counter: material('counter'),
        metal: material('metal'),
        extras: {
            niche: extras.has('niche'),
            bench: extras.has('bench'),
            ledMirror: extras.has('led_mirror'),
            heatedFloor: extras.has('heated_floor'),
            rainHead: extras.has('rain_head')
        },
        renew: {
            bathing: scope.has('bathing'),
            vanity: scope.has('vanity'),
            floor: scope.has('floor'),
            walls: scope.has('walls')
        }
    };
}
const EXAMPLE_BATH_SCENE = {
    project: 'full',
    room: 'large',
    lengthFt: 14,
    widthFt: 12,
    bathing: 'tub_and_shower',
    showerTile: 'marble',
    glass: true,
    floor: 'large_stone',
    paint: 'soft_white',
    vanity: 'floating',
    vanityFinish: 'navy_green',
    counter: 'marble_look',
    metal: 'brushed_gold',
    extras: {
        niche: true,
        bench: true,
        ledMirror: true,
        heatedFloor: true,
        rainHead: true
    },
    renew: {
        bathing: true,
        vanity: true,
        floor: true,
        walls: true
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/textures.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SPRITES",
    ()=>SPRITES,
    "TEXTURES",
    ()=>TEXTURES
]);
/**
 * Texture and sprite manifest for the live pool scene. src null = not
 * generated yet: the renderer uses `fallback` (textures) or its vector
 * drawing (sprites). Files live in public/estimator/scene/ and are made by
 * scripts/generate-scene-textures.mjs (kie.ai nano-banana-2 + seamless
 * post-processing; water_caustics is procedural, white light in the alpha
 * channel). Files are exported at about twice their largest on-screen size
 * (256 px for small tiles, 384-512 px for decks and lawns) so phones decode
 * little. Each fallback is the file's own mean colour, so the loading state
 * matches the finished picture.
 */ const T = '/estimator/scene/textures/';
const S = '/estimator/scene/sprites/';
const TEXTURES = {
    floor_plaster: {
        src: `${T}floor_plaster.webp`,
        realFt: 6,
        fallback: '#eff0ef'
    },
    floor_quartz: {
        src: `${T}floor_quartz.webp`,
        realFt: 6,
        fallback: '#cadde7'
    },
    // Pebbles about half an inch across.
    floor_pebble: {
        src: `${T}floor_pebble.webp`,
        realFt: 2.5,
        fallback: '#8b979d'
    },
    water_caustics: {
        src: `${T}water_caustics.webp`,
        realFt: 8,
        fallback: 'transparent'
    },
    // Tiles: 4 x 6" porcelain, 12 x 2" glass mosaic, 4 x 6" slate per image.
    tile_porcelain: {
        src: `${T}tile_porcelain.webp`,
        realFt: 2,
        fallback: '#295d71'
    },
    tile_glass: {
        src: `${T}tile_glass.webp`,
        realFt: 2,
        fallback: '#4b9bb8'
    },
    tile_stone: {
        src: `${T}tile_stone.webp`,
        realFt: 2,
        fallback: '#5c5f60'
    },
    // Coping: 2 x 2 square 16" pieces per image.
    coping_concrete: {
        src: `${T}coping_concrete.webp`,
        realFt: 2.67,
        fallback: '#e7e5e0'
    },
    coping_travertine: {
        src: `${T}coping_travertine.webp`,
        realFt: 2.67,
        fallback: '#e7dcc8'
    },
    coping_stone: {
        src: `${T}coping_stone.webp`,
        realFt: 2.67,
        fallback: '#b7b1a4'
    },
    // Large-format 18 x 36" pavers, 3 across and 6 rows.
    deck_pavers: {
        src: `${T}deck_pavers.webp`,
        realFt: 9,
        fallback: '#d3c4ad'
    },
    deck_concrete: {
        src: `${T}deck_concrete.webp`,
        realFt: 8,
        fallback: '#cac8c1'
    },
    // 24 x 48" porcelain slabs, 2 across and 4 down.
    deck_porcelain: {
        src: `${T}deck_porcelain.webp`,
        realFt: 8,
        fallback: '#d9d4ca'
    },
    deck_resurface: {
        src: `${T}deck_resurface.webp`,
        realFt: 8,
        fallback: '#ded2bd'
    },
    // Both graded toward the darker olive turf of the drone photos.
    lawn_grass: {
        src: `${T}lawn_grass.webp`,
        realFt: 8,
        fallback: '#62743c'
    },
    lawn_turf: {
        src: `${T}lawn_turf.webp`,
        realFt: 8,
        fallback: '#5b6936'
    },
    planting_bed: {
        src: `${T}planting_bed.webp`,
        realFt: 6,
        fallback: '#554334'
    },
    gravel_dg: {
        src: `${T}gravel_dg.webp`,
        realFt: 5,
        fallback: '#c8ab7b'
    },
    roof_shingle: {
        src: `${T}roof_shingle.webp`,
        realFt: 10,
        fallback: '#56595e'
    },
    // Ipe boards 6" wide, running horizontally (12 per image).
    wood_slats: {
        src: `${T}wood_slats.webp`,
        realFt: 6,
        fallback: '#966342'
    },
    counter_stone: {
        src: `${T}counter_stone.webp`,
        realFt: 4,
        fallback: '#cec8bd'
    },
    firepit_stone: {
        src: `${T}firepit_stone.webp`,
        realFt: 4,
        fallback: '#958f85'
    }
};
const SPRITES = {
    // Head of the lounger at the top of the image.
    lounger: {
        src: `${S}lounger.webp`,
        widthFt: 2.2,
        heightFt: 6.5
    },
    umbrella: {
        src: `${S}umbrella.webp`,
        widthFt: 9,
        heightFt: 9
    },
    olive_tree: {
        src: `${S}olive_tree.webp`,
        widthFt: 8,
        heightFt: 8
    },
    shrub: {
        src: `${S}shrub.webp`,
        widthFt: 3,
        heightFt: 3
    },
    fire_bowl: {
        src: `${S}fire_bowl.webp`,
        widthFt: 3,
        heightFt: 3
    },
    water_bowl: {
        src: `${S}water_bowl.webp`,
        widthFt: 3,
        heightFt: 3
    },
    // Long side horizontal; the front (cabinet) edge is the bottom of the image.
    outdoor_kitchen: {
        src: `${S}outdoor_kitchen.webp`,
        widthFt: 12,
        heightFt: 4.15
    },
    fire_pit: {
        src: `${S}fire_pit.webp`,
        widthFt: 5,
        heightFt: 5
    },
    patio_set: {
        src: `${S}patio_set.webp`,
        widthFt: 9,
        heightFt: 6.4
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/example.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXAMPLE_SCENE",
    ()=>EXAMPLE_SCENE,
    "hasAnyPick",
    ()=>hasAnyPick
]);
const EXAMPLE_SCENE = {
    project: 'backyard',
    shape: 'rectangle',
    lengthFt: 34,
    widthFt: 15,
    surface: 'quartz',
    tile: 'glass',
    coping: 'travertine',
    deck: 'porcelain',
    deckSize: 'medium',
    features: {
        baja: true,
        spa: true,
        waterBowls: false,
        fireBowls: true,
        lights: true
    },
    extras: {
        kitchen: false,
        patioCover: true,
        turfPlanting: true,
        firePit: true
    }
};
function hasAnyPick(answers, dimensionsTyped = false) {
    return dimensionsTyped || Object.values(answers).some((picks)=>Array.isArray(picks) && picks.length > 0);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/highlights.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HIGHLIGHT_MS",
    ()=>HIGHLIGHT_MS,
    "MAX_HIGHLIGHTS",
    ()=>MAX_HIGHLIGHTS,
    "sceneHighlights",
    ()=>sceneHighlights,
    "sparkleSpots",
    ()=>sparkleSpots
]);
const HIGHLIGHT_MS = 700;
const MAX_HIGHLIGHTS = 4;
const FEATURE_TARGETS = [
    [
        'spa',
        'spa'
    ],
    [
        'baja',
        'baja'
    ],
    [
        'fireBowls',
        'fireBowls'
    ],
    [
        'waterBowls',
        'waterBowls'
    ],
    [
        'lights',
        'lights'
    ]
];
const EXTRA_TARGETS = [
    [
        'kitchen',
        'kitchen'
    ],
    [
        'patioCover',
        'patioCover'
    ],
    [
        'firePit',
        'firePit'
    ],
    [
        'turfPlanting',
        'turfPlanting'
    ]
];
function sceneHighlights(prev, next) {
    const out = [];
    for (const [key, target] of FEATURE_TARGETS)if (next.features[key] && !prev.features[key]) out.push({
        kind: 'sparkle',
        target
    });
    for (const [key, target] of EXTRA_TARGETS)if (next.extras[key] && !prev.extras[key]) out.push({
        kind: 'sparkle',
        target
    });
    if (next.surface && next.surface !== prev.surface) out.push({
        kind: 'water'
    });
    if (next.tile && next.tile !== prev.tile) out.push({
        kind: 'tile'
    });
    if (next.coping && next.coping !== prev.coping) out.push({
        kind: 'coping'
    });
    if (next.deck && next.deck !== prev.deck || next.deckSize !== 'none' && next.deckSize !== prev.deckSize) out.push({
        kind: 'deck'
    });
    const resized = Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05;
    if (next.shape !== prev.shape || resized) out.push({
        kind: 'pool'
    });
    return out.slice(0, MAX_HIGHLIGHTS);
}
const center = (r)=>({
        x: r.x + r.w / 2,
        y: r.y + r.h / 2
    });
/** Spread at most `max` points evenly over a list (first and last included). */ function pick(list, max) {
    if (list.length <= max) return [
        ...list
    ];
    if (max <= 1) return list.length ? [
        list[Math.floor(list.length / 2)]
    ] : [];
    return Array.from({
        length: max
    }, (_, i)=>list[Math.round(i * (list.length - 1) / (max - 1))]);
}
function sparkleSpots(layout, target) {
    const objects = (kind)=>layout.objects.filter((o)=>o.kind === kind).map((o)=>center(o.box));
    switch(target){
        case 'spa':
            return layout.spa ? [
                center(layout.spa.box)
            ] : [];
        case 'baja':
            return layout.baja ? [
                center(layout.baja.box)
            ] : [];
        case 'fireBowls':
            return pick(layout.bowls.filter((b)=>b.kind === 'fire').map((b)=>({
                    x: b.cx,
                    y: b.cy
                })), 3);
        case 'waterBowls':
            return pick(layout.bowls.filter((b)=>b.kind === 'water').map((b)=>({
                    x: b.cx,
                    y: b.cy
                })), 3);
        case 'lights':
            return pick(layout.lights, 3);
        case 'kitchen':
            return objects('kitchen').slice(0, 1);
        case 'patioCover':
            return objects('patio_cover').slice(0, 1);
        case 'firePit':
            return objects('fire_pit').slice(0, 1);
        case 'turfPlanting':
            return pick(layout.beds.map(center), 3);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/scene.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildScene",
    ()=>buildScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/geometry.ts [app-client] (ecmascript)");
;
;
/** Choices that mean "not decided yet": the picture shows a tasteful default instead. */ const UNDECIDED = new Set([
    'unsure'
]);
const DECK_SIZES = [
    'small',
    'medium',
    'large'
];
const SHAPES = [
    'rectangle',
    'l_shape',
    'freeform'
];
function buildScene(template, input) {
    const answers = input.answers ?? {};
    const visible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, answers);
    const byId = new Map(visible.map((q)=>[
            q.id,
            q
        ]));
    const byRole = (role)=>visible.find((q)=>q.role === role);
    const picks = (q)=>q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["picksFor"])(q, answers) : [];
    const material = (id)=>{
        const pick = picks(byId.get(id))[0];
        return pick && !UNDECIDED.has(pick) ? pick : null;
    };
    const geometry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["poolGeometry"])(template, {
        answers,
        dimensions: input.dimensions
    });
    const shape = SHAPES.includes(geometry.shape) ? geometry.shape : 'rectangle';
    const presetMedium = template.geometry.sizes.medium;
    const lengthFt = geometry.lengthFt > 0 ? geometry.lengthFt : presetMedium?.lengthFt ?? 30;
    const widthFt = geometry.widthFt > 0 ? geometry.widthFt : presetMedium?.widthFt ?? 15;
    const deckSizePick = picks(byRole('deckSize'))[0];
    const deckSize = DECK_SIZES.includes(deckSizePick) ? deckSizePick : 'none';
    const features = new Set(picks(byId.get('features')));
    const extras = new Set(picks(byId.get('extras')));
    return {
        project: picks(byRole('project'))[0] === 'backyard' ? 'backyard' : 'remodel',
        shape,
        lengthFt,
        widthFt,
        surface: material('surface'),
        tile: material('tile'),
        coping: material('coping'),
        deck: material('deck'),
        deckSize,
        features: {
            baja: features.has('baja'),
            spa: features.has('spa'),
            waterBowls: features.has('water'),
            fireBowls: features.has('fire'),
            lights: features.has('lighting')
        },
        extras: {
            kitchen: extras.has('kitchen'),
            patioCover: extras.has('patio_cover'),
            turfPlanting: extras.has('turf_planting'),
            firePit: extras.has('fire_pit')
        }
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Live top-down pool scene: the shared contract.
 *
 * The estimator turns the homeowner's answers into a SceneSpec (pure, see
 * scene.ts), and <PoolScene> draws it as one layered top-down picture that
 * updates instantly on every pick. Textures and sprites are pre-generated
 * image files (see textures.ts); nothing is generated while a visitor clicks.
 *
 * Change these types deliberately: scene.ts, textures.ts, the PoolScene
 * renderer, the estimator screens and the photoreal render all build on them.
 */ /** Scene canvas, in SVG user units. 1 ft = SCENE.pxPerFt units. */ __turbopack_context__.s([
    "SCENE",
    ()=>SCENE,
    "SPRITE_IDS",
    ()=>SPRITE_IDS,
    "TEXTURE_IDS",
    ()=>TEXTURE_IDS
]);
const SCENE = {
    width: 1200,
    height: 800,
    pxPerFt: 13
};
const TEXTURE_IDS = [
    // Pool interior, seen through the water (the water layer tints them).
    'floor_plaster',
    'floor_quartz',
    'floor_pebble',
    // Grayscale caustic light pattern, blended over the water and animated.
    'water_caustics',
    // Waterline tile band.
    'tile_porcelain',
    'tile_glass',
    'tile_stone',
    // Coping ring.
    'coping_concrete',
    'coping_travertine',
    'coping_stone',
    // Deck.
    'deck_pavers',
    'deck_concrete',
    'deck_porcelain',
    'deck_resurface',
    // Yard and extras.
    'lawn_grass',
    'lawn_turf',
    'planting_bed',
    'gravel_dg',
    'roof_shingle',
    'wood_slats',
    'counter_stone',
    'firepit_stone'
];
const SPRITE_IDS = [
    'lounger',
    'umbrella',
    'olive_tree',
    'shrub',
    'fire_bowl',
    'water_bowl',
    'outdoor_kitchen',
    'fire_pit',
    'patio_set'
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/estimator/scene/geometry.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "COPING_FT",
    ()=>COPING_FT,
    "DECK_SQFT",
    ()=>DECK_SQFT,
    "FRAME",
    ()=>FRAME,
    "MAX_DRAWN_FT",
    ()=>MAX_DRAWN_FT,
    "TILE_FT",
    ()=>TILE_FT,
    "YARD",
    ()=>YARD,
    "drawnPoolSize",
    ()=>drawnPoolSize,
    "layoutScene",
    ()=>layoutScene,
    "offsetOrthogonal",
    ()=>offsetOrthogonal,
    "pointInPolygon",
    ()=>pointInPolygon,
    "poolOutlinePath",
    ()=>poolOutlinePath,
    "rectInside",
    ()=>rectInside,
    "rectsOverlap",
    ()=>rectsOverlap,
    "sceneCamera",
    ()=>sceneCamera
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-client] (ecmascript)");
;
/**
 * Yard layout for the live pool scene (pure, unit-tested).
 *
 * The picture is a straight-down drone view on the 1200 x 800 SCENE canvas at
 * 13 units per foot: the house roof along the top edge with a walk under the
 * eave, a block wall around the other three sides with a landscape strip
 * (beds or hedges) inside it, and the pool with its coping and deck right
 * off the house (the deck runs into the walk, like the Pool Masters jobs).
 * Everything else (spa, Baja shelf, bowls, lights, kitchen and patio cover
 * against the house, fire pit, loungers, trees) is placed close around that,
 * so nothing overlaps the pool or each other and the yard reads dense, not
 * like a pool floating in a field. A typed pool too big to draw at true scale
 * is scaled down uniformly (pool.scale < 1) so the largest pool plus a large
 * deck always fits. sceneCamera frames the result like a drone shot.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
const FRAME = {
    /** House roof strip along the top edge. */ roofH: 112,
    /** Concrete walk along the back of the house. */ walkH: 46,
    /** Neighbour sliver outside the block wall. */ edge: 14,
    /** Block wall thickness. */ wall: 10,
    /** Landscape strip (beds or hedges) inside the wall. */ strip: 3 * FT
};
const IN = FRAME.edge + FRAME.wall;
const YARD = {
    x: IN,
    y: FRAME.roofH,
    w: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width - 2 * IN,
    h: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].height - FRAME.roofH - IN
};
const WALK_BOTTOM = FRAME.roofH + FRAME.walkH;
const YARD_RIGHT = YARD.x + YARD.w;
const YARD_BOTTOM = YARD.y + YARD.h;
/** Where free-standing things may go: inside the landscape strips, below the walk. */ const OPEN = {
    x: YARD.x + FRAME.strip,
    y: WALK_BOTTOM,
    w: YARD.w - 2 * FRAME.strip,
    h: YARD_BOTTOM - FRAME.strip - WALK_BOTTOM
};
const MAX_DRAWN_FT = {
    length: 40,
    width: 20
};
const COPING_FT = 1.8;
const TILE_FT = 0.85;
const DECK_SQFT = {
    small: 300,
    medium: 600,
    large: 1000
};
/* ------------------------------ helpers ------------------------------ */ const right = (r)=>r.x + r.w;
const bottom = (r)=>r.y + r.h;
const r2 = (n)=>Math.round(n * 100) / 100;
function rectsOverlap(a, b, gap = 0) {
    return a.x < right(b) + gap && b.x < right(a) + gap && a.y < bottom(b) + gap && b.y < bottom(a) + gap;
}
function rectInside(inner, outer) {
    const e = 0.01;
    return inner.x >= outer.x - e && inner.y >= outer.y - e && right(inner) <= right(outer) + e && bottom(inner) <= bottom(outer) + e;
}
function union(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
        x,
        y,
        w: Math.max(right(a), right(b)) - x,
        h: Math.max(bottom(a), bottom(b)) - y
    };
}
function grow(r, by) {
    return {
        x: r.x - by,
        y: r.y - by,
        w: r.w + 2 * by,
        h: r.h + 2 * by
    };
}
const finitePositive = (n, fallback)=>typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : fallback;
function pointInPolygon(p, poly) {
    let inside = false;
    for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
/** Top (min y) or bottom (max y) of the outline at x, from its sampled points. */ function edgeYAt(outline, x, which) {
    const ys = [];
    for(let i = 0; i < outline.length; i++){
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        if (a.x <= x && b.x >= x || b.x <= x && a.x >= x) {
            const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
            ys.push(a.y + (b.y - a.y) * t);
        }
    }
    if (!ys.length) return which === 'top' ? Math.min(...outline.map((p)=>p.y)) : Math.max(...outline.map((p)=>p.y));
    return which === 'top' ? Math.min(...ys) : Math.max(...ys);
}
/* --------------------------- pool outlines --------------------------- */ /**
 * Freeform control points (unit box): an organic lagoon with one soft, wide
 * bay on the house side (no cusp: the bay's curve is many feet across), and
 * a fuller deep end on the right. Matches the shape tile's soft outline.
 */ const KIDNEY = [
    [
        0.0,
        0.5
    ],
    [
        0.04,
        0.2
    ],
    [
        0.17,
        0.04
    ],
    [
        0.34,
        0.03
    ],
    [
        0.5,
        0.13
    ],
    [
        0.66,
        0.06
    ],
    [
        0.84,
        0.02
    ],
    [
        0.97,
        0.18
    ],
    [
        1.0,
        0.5
    ],
    [
        0.95,
        0.8
    ],
    [
        0.8,
        0.97
    ],
    [
        0.55,
        1.0
    ],
    [
        0.3,
        0.97
    ],
    [
        0.1,
        0.86
    ]
];
/** Closed Catmull-Rom spline through the points as cubic segments [p1, c1, c2, p2]. */ function splineSegments(pts) {
    const n = pts.length;
    return pts.map((p1, i)=>{
        const p0 = pts[(i - 1 + n) % n];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        const c1 = {
            x: p1.x + (p2.x - p0.x) / 6,
            y: p1.y + (p2.y - p0.y) / 6
        };
        const c2 = {
            x: p2.x - (p3.x - p1.x) / 6,
            y: p2.y - (p3.y - p1.y) / 6
        };
        return [
            p1,
            c1,
            c2,
            p2
        ];
    });
}
function sampleSpline(pts, steps = 10) {
    const out = [];
    for (const [a, b, c, d] of splineSegments(pts)){
        for(let s = 0; s < steps; s++){
            const t = s / steps;
            const u = 1 - t;
            out.push({
                x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
                y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
            });
        }
    }
    return out;
}
/** Freeform control points whose sampled outline exactly fills the box. */ function kidneyPoints(box) {
    const raw = KIDNEY.map(([u, v])=>({
            x: u * box.w,
            y: v * box.h
        }));
    const s = sampleSpline(raw);
    const minX = Math.min(...s.map((p)=>p.x));
    const maxX = Math.max(...s.map((p)=>p.x));
    const minY = Math.min(...s.map((p)=>p.y));
    const maxY = Math.max(...s.map((p)=>p.y));
    return raw.map((p)=>({
            x: box.x + (p.x - minX) / (maxX - minX) * box.w,
            y: box.y + (p.y - minY) / (maxY - minY) * box.h
        }));
}
/** Rounded polygon path: each corner cut back by up to r and joined with a curve. */ function roundedPolygonPath(pts, r, dx, dy) {
    const n = pts.length;
    const parts = [];
    pts.forEach((p, i)=>{
        const prev = pts[(i - 1 + n) % n];
        const next = pts[(i + 1) % n];
        const lp = Math.hypot(prev.x - p.x, prev.y - p.y) || 1;
        const ln = Math.hypot(next.x - p.x, next.y - p.y) || 1;
        const rr = Math.min(r, lp / 2, ln / 2);
        const a = {
            x: p.x + (prev.x - p.x) / lp * rr + dx,
            y: p.y + (prev.y - p.y) / lp * rr + dy
        };
        const b = {
            x: p.x + (next.x - p.x) / ln * rr + dx,
            y: p.y + (next.y - p.y) / ln * rr + dy
        };
        parts.push(`${i === 0 ? 'M' : 'L'}${r2(a.x)} ${r2(a.y)}Q${r2(p.x + dx)} ${r2(p.y + dy)} ${r2(b.x)} ${r2(b.y)}`);
    });
    return parts.join('') + 'Z';
}
function offsetOrthogonal(pts, by) {
    const n = pts.length;
    // Signed area: positive = clockwise in screen coordinates (y down).
    let area = 0;
    for(let i = 0; i < n; i++)area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
    const sign = area > 0 ? 1 : -1;
    const normal = (a, b)=>{
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        // Outward normal of edge a->b for a clockwise (screen) polygon.
        return {
            x: sign * (b.y - a.y) / len,
            y: sign * -(b.x - a.x) / len
        };
    };
    return pts.map((p, i)=>{
        const n1 = normal(pts[(i - 1 + n) % n], p);
        const n2 = normal(p, pts[(i + 1) % n]);
        return {
            x: p.x + by * (n1.x + n2.x),
            y: p.y + by * (n1.y + n2.y)
        };
    });
}
/** Joints across the coping of an orthogonal pool: mitres at the corners, then one every ~2 ft per side. */ function copingJointsPath(inner, outer) {
    const n = inner.length;
    const parts = [];
    const seg = (a, b)=>`M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`;
    for(let i = 0; i < n; i++){
        const a = inner[i];
        const b = inner[(i + 1) % n];
        const oa = outer[i];
        parts.push(seg(a, oa));
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const count = Math.max(1, Math.round(len / (2 * FT)));
        const nx = (outer[i].x - a.x + outer[(i + 1) % n].x - b.x) / 2;
        const ny = (outer[i].y - a.y + outer[(i + 1) % n].y - b.y) / 2;
        // The shared outward offset of this side (both ends move the same way across it).
        const ax = b.x - a.x === 0 ? nx : 0;
        const ay = b.y - a.y === 0 ? ny : 0;
        for(let k = 1; k < count; k++){
            const p = {
                x: a.x + (b.x - a.x) * k / count,
                y: a.y + (b.y - a.y) * k / count
            };
            parts.push(seg(p, {
                x: p.x + ax,
                y: p.y + ay
            }));
        }
    }
    return parts.join('');
}
function polygonPath(pts) {
    return pts.map((p, i)=>`${i === 0 ? 'M' : 'L'}${r2(p.x)} ${r2(p.y)}`).join('') + 'Z';
}
function poolOutlinePath(pool, dx = 0, dy = 0) {
    if (pool.shape !== 'freeform') return roundedPolygonPath(pool.points, pool.radius, dx, dy);
    const segs = splineSegments(pool.points);
    const f = (p)=>`${r2(p.x + dx)} ${r2(p.y + dy)}`;
    return `M${f(segs[0][0])}` + segs.map(([, c1, c2, p2])=>`C${f(c1)} ${f(c2)} ${f(p2)}`).join('') + 'Z';
}
function drawnPoolSize(lengthFt, widthFt) {
    let l = Math.max(6, finitePositive(lengthFt, 30));
    let w = Math.max(6, finitePositive(widthFt, 15));
    if (w > l) [l, w] = [
        w,
        l
    ];
    const scale = Math.min(1, MAX_DRAWN_FT.length / l, MAX_DRAWN_FT.width / w);
    return {
        lengthFt: l * scale,
        widthFt: w * scale,
        scale
    };
}
/** The pool (and spa) with the water box's top-left at (x, y). */ function buildPool(spec, x, y) {
    const size = drawnPoolSize(spec.lengthFt, spec.widthFt);
    const L = size.lengthFt * FT;
    const W = size.widthFt * FT;
    const box = {
        x,
        y,
        w: L,
        h: W
    };
    // Modern pools: nearly square water corners (the coping outside them is square).
    const radius = spec.shape === 'freeform' ? 0 : Math.min(0.35 * FT, W / 10);
    const coping = COPING_FT * FT;
    const tile = TILE_FT * FT;
    // Spa: 6-8 ft, never more than 60% of the width or 30% of the length.
    const s = Math.max(1.5 * FT, Math.min(Math.max(6 * FT, Math.min(8 * FT, W * 0.5)), W * 0.6, L * 0.3));
    let points;
    let notch = null;
    let spa = null;
    if (spec.shape === 'l_shape') {
        const nw = L * 0.36;
        const nh = W * 0.46;
        notch = {
            x: x + L - nw,
            y,
            w: nw,
            h: nh
        };
        points = [
            {
                x,
                y
            },
            {
                x: x + L - nw,
                y
            },
            {
                x: x + L - nw,
                y: y + nh
            },
            {
                x: x + L,
                y: y + nh
            },
            {
                x: x + L,
                y: y + W
            },
            {
                x,
                y: y + W
            }
        ];
        if (spec.features.spa) {
            // Nested in the L's inner corner, its walls standing in for the coping there.
            const ss = Math.min(s, nw - FT, nh + tile);
            const bx = x + L - nw - tile;
            const by = y + nh + tile - ss;
            spa = {
                shape: 'square',
                box: {
                    x: bx,
                    y: by,
                    w: ss,
                    h: ss
                },
                spill: {
                    x1: bx + ss * 0.3,
                    y1: by + ss,
                    x2: bx + ss * 0.7,
                    y2: by + ss,
                    side: 'bottom'
                }
            };
        }
    } else if (spec.shape === 'freeform') {
        points = kidneyPoints(box);
    } else {
        points = [
            {
                x,
                y
            },
            {
                x: x + L,
                y
            },
            {
                x: x + L,
                y: y + W
            },
            {
                x,
                y: y + W
            }
        ];
        if (spec.features.spa) {
            // Inside the pool's far corner on the house side, spilling toward the middle.
            spa = {
                shape: 'square',
                box: {
                    x: x + L - s,
                    y,
                    w: s,
                    h: s
                },
                spill: {
                    x1: x + L - s,
                    y1: y + s * 0.3,
                    x2: x + L - s,
                    y2: y + s * 0.7,
                    side: 'left'
                }
            };
        }
    }
    const base = {
        shape: spec.shape,
        points,
        radius
    };
    const outline = spec.shape === 'freeform' ? sampleSpline(points, 12) : points;
    const outer = spec.shape === 'freeform' ? null : offsetOrthogonal(points, coping);
    const copingPath = outer ? polygonPath(outer) : null;
    const copingJoints = outer ? copingJointsPath(points, outer) : null;
    const pool = {
        ...base,
        box,
        scale: size.scale,
        path: poolOutlinePath(base),
        copingPath,
        copingJoints,
        outline,
        coping,
        tile,
        notch
    };
    if (spec.shape === 'freeform' && spec.features.spa) {
        // Round raised spa set into the lagoon's bay, standing mostly in the water.
        const cx = x + L * 0.5;
        const biteY = edgeYAt(outline, cx, 'top');
        const r = s / 2;
        const cy = biteY + r * 0.2;
        spa = {
            shape: 'round',
            box: {
                x: cx - r,
                y: cy - r,
                w: s,
                h: s
            },
            spill: {
                x1: cx - r * 0.4,
                y1: cy + r * 0.92,
                x2: cx + r * 0.4,
                y2: cy + r * 0.92,
                side: 'bottom'
            }
        };
    }
    return {
        pool,
        spa
    };
}
/* -------------------------------- deck -------------------------------- */ /** Deck margins around the core (house side widest): top 2.4k, sides k, bottom 0.7k. */ function deckMargins(core, deckSize) {
    if (deckSize === 'none') return {
        t: 4 * FT,
        s: 3 * FT,
        b: 3 * FT
    };
    const area = DECK_SQFT[deckSize] * FT * FT;
    // (w + 2k)(h + 3.1k) - w h = area  ->  6.2k^2 + (3.1w + 2h)k - area = 0
    const a = 6.2;
    const b = 3.1 * core.w + 2 * core.h;
    const k = (-b + Math.sqrt(b * b + 4 * a * area)) / (2 * a);
    return {
        t: 2.4 * k,
        s: k,
        b: 0.7 * k
    };
}
/* ------------------------------ placement ------------------------------ */ /** First candidate inside its region that clears every obstacle by `gap`. */ function firstFit(cands, taken, gap) {
    return cands.find((c)=>rectInside(c.box, c.region) && taken.every((t)=>!rectsOverlap(c.box, t, gap))) ?? null;
}
/** Positions sliding along a span in steps (centre first, then outward). */ function spread(from, to, step) {
    if (to < from) return [];
    const out = [];
    for(let v = from; v <= to + 0.01; v += step)out.push(v);
    if (out[out.length - 1] < to - 0.01) out.push(to);
    return out;
}
/** Landscape strips along the walls, cut where a placed object stands in them. */ function stripsAround(objects) {
    const s = FRAME.strip;
    const raw = [
        {
            x: YARD.x,
            y: WALK_BOTTOM,
            w: s,
            h: YARD_BOTTOM - WALK_BOTTOM
        },
        {
            x: YARD_RIGHT - s,
            y: WALK_BOTTOM,
            w: s,
            h: YARD_BOTTOM - WALK_BOTTOM
        },
        {
            x: YARD.x + s,
            y: YARD_BOTTOM - s,
            w: YARD.w - 2 * s,
            h: s
        }
    ];
    const blockers = objects.filter((o)=>o.kind !== 'olive_tree').map((o)=>o.box);
    const out = [];
    for (const strip of raw){
        const vertical = strip.h > strip.w;
        let pieces = [
            strip
        ];
        for (const b of blockers){
            pieces = pieces.flatMap((p)=>{
                if (!rectsOverlap(p, b, 6)) return [
                    p
                ];
                if (vertical) {
                    const top = {
                        ...p,
                        h: b.y - 6 - p.y
                    };
                    const bot = {
                        ...p,
                        y: bottom(b) + 6,
                        h: bottom(p) - bottom(b) - 6
                    };
                    return [
                        top,
                        bot
                    ].filter((r)=>r.h > FT);
                }
                const l = {
                    ...p,
                    w: b.x - 6 - p.x
                };
                const rr = {
                    ...p,
                    x: right(b) + 6,
                    w: right(p) - right(b) - 6
                };
                return [
                    l,
                    rr
                ].filter((r)=>r.w > FT);
            });
        }
        out.push(...pieces);
    }
    return out;
}
function layoutScene(spec) {
    // 1. Pool at the origin, to measure the core (pool + coping + spa).
    const probe = buildPool(spec, 0, 0);
    const coping = probe.pool.coping;
    let coreLocal = grow(probe.pool.box, coping);
    if (probe.spa) coreLocal = union(coreLocal, grow(probe.spa.box, spec.shape === 'freeform' ? FT * 0.5 : 0));
    // 2. Deck around the core, centred across the yard, against the house.
    const m = deckMargins(coreLocal, spec.deckSize);
    const deckW = coreLocal.w + 2 * m.s;
    const deckH = coreLocal.h + m.t + m.b;
    const minX = OPEN.x + FT;
    const maxX = right(OPEN) - FT - deckW;
    const deckX = Math.min(Math.max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 - deckW / 2, minX), Math.max(minX, maxX));
    // Right off the house: the deck runs into the walk under the eave, like every reference job.
    const joinsWalk = true;
    const deckY = WALK_BOTTOM;
    const deckBox = {
        x: deckX,
        y: deckY,
        w: deckW,
        h: deckH
    };
    // 3. The real pool, offset so its core sits inside the deck margins.
    const px = deckX + m.s - coreLocal.x;
    const py = deckY + m.t - coreLocal.y;
    const { pool, spa } = buildPool(spec, px, py);
    const core = {
        x: coreLocal.x + px,
        y: coreLocal.y + py,
        w: coreLocal.w,
        h: coreLocal.h
    };
    const { box } = pool;
    const L = box.w;
    const W = box.h;
    // 4. Baja shelf at the shallow (left) end.
    let baja = null;
    if (spec.features.baja) {
        const b = Math.min(8 * FT, L * 0.3);
        const midX = box.x + b / 2;
        const top = edgeYAt(pool.outline, midX, 'top');
        const bot = edgeYAt(pool.outline, midX, 'bottom');
        const mid = (top + bot) / 2;
        const len = Math.min(5.5 * FT, b - FT);
        const wid = 2 * FT;
        const loungers = len >= 3.5 * FT && bot - top >= 2 * wid + 2 * FT ? [
            -1,
            1
        ].map((sgn)=>({
                x: midX - len / 2,
                y: mid + sgn * (wid / 2 + 0.6 * FT) - wid / 2,
                w: len,
                h: wid
            })) : [];
        baja = {
            box: {
                x: box.x,
                y: box.y,
                w: b,
                h: W
            },
            edgeX: box.x + b,
            loungers
        };
    }
    // 5. Bowls along the house-side long edge, clear of the spa.
    const bowls = [];
    const kinds = [];
    if (spec.features.fireBowls && spec.features.waterBowls) kinds.push('fire', 'water', 'water', 'fire');
    else if (spec.features.fireBowls) kinds.push('fire', 'fire');
    else if (spec.features.waterBowls) kinds.push('water', 'water');
    if (kinds.length) {
        const n = kinds.length;
        let fractions;
        let seg;
        if (spec.shape === 'freeform') {
            seg = [
                box.x,
                right(box)
            ];
            fractions = n === 2 ? [
                0.24,
                0.86
            ] : [
                0.15,
                0.31,
                0.78,
                0.93
            ];
            if (!spec.features.spa && n === 2) fractions = [
                0.24,
                0.86
            ];
        } else {
            const end = spec.shape === 'l_shape' ? box.x + L * 0.64 : spa ? spa.box.x - FT : right(box);
            seg = [
                box.x,
                end
            ];
            fractions = n === 2 ? [
                0.27,
                0.73
            ] : [
                0.12,
                0.37,
                0.63,
                0.88
            ];
        }
        const segLen = seg[1] - seg[0];
        let spacing = Math.min(fractions[0], 1 - fractions[n - 1]) * 2;
        for(let i = 1; i < n; i++)spacing = Math.min(spacing, fractions[i] - fractions[i - 1]);
        const r = Math.min(1.5 * FT, segLen * spacing * 0.42);
        kinds.forEach((kind, i)=>{
            const cx = seg[0] + segLen * fractions[i];
            let edge = Infinity;
            for(let dx = -r; dx <= r; dx += r / 4)edge = Math.min(edge, edgeYAt(pool.outline, cx + dx, 'top'));
            const cy = edge - r - 3;
            bowls.push({
                kind,
                cx,
                cy,
                r,
                spillTo: kind === 'water' ? {
                    x: cx,
                    y: edgeYAt(pool.outline, cx, 'top') + Math.min(1.8 * FT, W * 0.15)
                } : null
            });
        });
    }
    // 6. LED lights on the far wall.
    const lights = spec.features.lights ? [
        0.42,
        0.72
    ].map((f)=>{
        const x = box.x + L * f;
        return {
            x,
            y: edgeYAt(pool.outline, x, 'bottom') - 0.55 * FT
        };
    }) : [];
    // 7. Free-standing objects, biggest first; each clears the pool core by a walkway.
    const objects = [];
    const poolZone = grow(core, FT);
    const bowlBoxes = bowls.map((b)=>({
            x: b.cx - b.r,
            y: b.cy - b.r,
            w: 2 * b.r,
            h: 2 * b.r
        }));
    const taken = ()=>[
            poolZone,
            ...bowlBoxes,
            ...objects.map((o)=>o.box)
        ];
    const yardRegion = {
        x: YARD.x,
        y: FRAME.roofH,
        w: YARD.w,
        h: YARD.h - FRAME.strip
    };
    // Kitchen and patio cover stand against the house (like the reference jobs), as near the
    // deck as they fit: candidates slide along the house wall, closest to the deck first. The side
    // walls are the fallback when the house side is full.
    const deckLeft = deckX;
    const deckRight = right(deckBox);
    const alongHouse = (w, h, prefer)=>{
        const y = FRAME.roofH + 0.25 * FT;
        const xs = spread(YARD.x + 0.25 * FT, YARD_RIGHT - 0.25 * FT - w, FT / 2);
        // Preferred side first: centred on that deck edge, sliding outward; then the other side.
        const score = (x)=>{
            const cx = x + w / 2;
            const left = Math.abs(cx - deckLeft) + (prefer === 'left' ? 0 : 0.5 * YARD.w);
            const rightScore = Math.abs(cx - deckRight) + (prefer === 'right' ? 0 : 0.5 * YARD.w);
            return Math.min(left, rightScore);
        };
        return xs.sort((a, b)=>score(a) - score(b)).map((x)=>({
                box: {
                    x,
                    y,
                    w,
                    h
                },
                region: yardRegion,
                variant: 'house'
            }));
    };
    if (spec.extras.patioCover) {
        const sizes = [
            [
                16,
                12
            ],
            [
                14,
                11
            ],
            [
                12,
                10
            ]
        ];
        const cands = sizes.flatMap(([w, h])=>{
            const bw = w * FT;
            const bh = h * FT;
            return [
                ...alongHouse(bw, bh, 'left').map((c)=>({
                        ...c,
                        variant: c.box.x + bw / 2 < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 ? 'left' : 'right'
                    })),
                {
                    box: {
                        x: YARD.x,
                        y: FRAME.roofH,
                        w: bw,
                        h: bh
                    },
                    region: yardRegion,
                    variant: 'left'
                },
                {
                    box: {
                        x: YARD_RIGHT - bw,
                        y: FRAME.roofH,
                        w: bw,
                        h: bh
                    },
                    region: yardRegion,
                    variant: 'right'
                }
            ];
        });
        const hit = firstFit(cands, taken(), FT);
        if (hit) objects.push({
            kind: 'patio_cover',
            box: hit.box,
            variant: hit.variant
        });
    }
    if (spec.extras.kitchen) {
        // Against the house: a 12 ft counter (grill, sink) with bar stools on the yard side.
        const kw = 12 * FT;
        const kh = 4.2 * FT + 2.4 * FT;
        const house = alongHouse(kw, kh, 'right');
        // Fallback: along a side wall, stools facing the yard.
        const depth = 3 * FT;
        const reach = 2.4 * FT;
        const len = Math.min(12 * FT, OPEN.h * 0.45);
        const ys = spread(WALK_BOTTOM + 0.5 * FT, bottom(OPEN) - len, FT);
        const cands = [
            ...house,
            ...ys.map((y)=>({
                    box: {
                        x: YARD_RIGHT - depth - reach,
                        y,
                        w: depth + reach,
                        h: len
                    },
                    region: yardRegion,
                    variant: 'right'
                })),
            ...ys.map((y)=>({
                    box: {
                        x: YARD.x,
                        y,
                        w: depth + reach,
                        h: len
                    },
                    region: yardRegion,
                    variant: 'left'
                }))
        ];
        const hit = firstFit(cands, taken(), FT);
        if (hit) objects.push({
            kind: 'kitchen',
            box: hit.box,
            variant: hit.variant
        });
    }
    const lawnBlock = grow(deckBox, FT);
    if (spec.extras.firePit) {
        const cands = [
            13,
            11.5,
            10
        ].flatMap((ft)=>{
            const d = ft * FT;
            const g = FT;
            const leftX = OPEN.x + g;
            const rightX = right(OPEN) - g - d;
            const lowY = bottom(OPEN) - g - d;
            const midY = deckBox.y + deckBox.h / 2 - d / 2;
            const belowY = bottom(deckBox) + 2 * g;
            // Close to the deck first (a compact yard frames better), then out to the corners.
            const besideRight = right(deckBox) + 2 * g;
            const besideLeft = deckBox.x - 2 * g - d;
            const anchors = [
                [
                    right(deckBox) - d,
                    belowY
                ],
                [
                    deckBox.x,
                    belowY
                ],
                [
                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 - d / 2,
                    belowY
                ],
                [
                    besideRight,
                    Math.max(midY, deckBox.y + deckBox.h - d)
                ],
                [
                    besideLeft,
                    Math.max(midY, deckBox.y + deckBox.h - d)
                ],
                [
                    rightX,
                    lowY
                ],
                [
                    leftX,
                    lowY
                ],
                [
                    rightX,
                    midY
                ],
                [
                    leftX,
                    midY
                ]
            ];
            return anchors.map(([x, y])=>({
                    box: {
                        x,
                        y,
                        w: d,
                        h: d
                    },
                    region: OPEN,
                    variant: 'lawn'
                }));
        });
        const hit = firstFit(cands, [
            ...taken(),
            lawnBlock
        ], FT);
        if (hit) objects.push({
            kind: 'fire_pit',
            box: hit.box,
            variant: hit.variant
        });
    }
    // Lounge set: two loungers and an umbrella. On the deck when there is room, else on the lawn.
    {
        const w = 14.4 * FT;
        const h = 7 * FT;
        const deckRegion = grow(deckBox, -0.4 * FT);
        const topY = core.y - 2 * FT - h;
        const botY = bottom(core) + 2 * FT;
        const xs = spread(deckBox.x + FT, right(deckBox) - FT - w, FT / 2);
        const onDeck = [
            topY,
            botY
        ].flatMap((y)=>xs.map((x)=>({
                    box: {
                        x,
                        y,
                        w,
                        h
                    },
                    region: deckRegion,
                    variant: 'deck'
                })));
        const deckHit = firstFit(onDeck, taken(), FT * 0.5);
        if (deckHit) objects.push({
            kind: 'lounge_set',
            box: deckHit.box,
            variant: 'deck'
        });
        else {
            const lw = 7 * FT;
            const lh = 14.4 * FT; // on the lawn the set stands upright: loungers sideways, umbrella below
            const near = (x)=>Math.abs(x + w / 2 - (deckBox.x + deckBox.w / 2));
            // Closest to the deck first: on the lawn beside it, then just past its far edge, then by the walls.
            const below = spread(OPEN.x + FT, right(OPEN) - FT - w, FT / 2).sort((a, b)=>near(a) - near(b)).map((x)=>({
                    box: {
                        x,
                        y: bottom(deckBox) + 1.5 * FT,
                        w,
                        h
                    },
                    region: OPEN,
                    variant: 'lawn_wide'
                }));
            const besideYs = spread(WALK_BOTTOM + FT, bottom(OPEN) - FT - lh, FT);
            const beside = besideYs.flatMap((y)=>[
                    {
                        box: {
                            x: right(deckBox) + 1.5 * FT,
                            y,
                            w: lw,
                            h: lh
                        },
                        region: OPEN,
                        variant: 'lawn'
                    },
                    {
                        box: {
                            x: deckBox.x - 1.5 * FT - lw,
                            y,
                            w: lw,
                            h: lh
                        },
                        region: OPEN,
                        variant: 'lawn'
                    }
                ]);
            const ys = spread(OPEN.y + FT, bottom(OPEN) - FT - lh, FT);
            const lawn = [
                ...beside,
                ...below,
                ...ys.map((y)=>({
                        box: {
                            x: OPEN.x + FT,
                            y,
                            w: lw,
                            h: lh
                        },
                        region: OPEN,
                        variant: 'lawn'
                    })),
                ...ys.map((y)=>({
                        box: {
                            x: right(OPEN) - FT - lw,
                            y,
                            w: lw,
                            h: lh
                        },
                        region: OPEN,
                        variant: 'lawn'
                    })),
                ...spread(OPEN.x + FT, right(OPEN) - FT - w, FT).map((x)=>({
                        box: {
                            x,
                            y: bottom(OPEN) - FT - h,
                            w,
                            h
                        },
                        region: OPEN,
                        variant: 'lawn_wide'
                    }))
            ];
            const hit = firstFit(lawn, [
                ...taken(),
                lawnBlock
            ], FT * 0.5);
            if (hit) objects.push({
                kind: 'lounge_set',
                box: hit.box,
                variant: hit.variant
            });
        }
    }
    // Olive trees in the landscape strips (canopies overhang the lawn and walls).
    {
        const d = 8 * FT;
        const want = spec.extras.turfPlanting ? 4 : spec.project === 'backyard' ? 3 : 2;
        const c = 0.3 * d;
        const anchors = [
            // In planters just off the deck's far corners, like the olive trees in the photos.
            {
                x: deckBox.x - d * 0.56,
                y: bottom(deckBox) - d * 0.3
            },
            {
                x: right(deckBox) + d * 0.56,
                y: bottom(deckBox) - d * 0.3
            },
            {
                x: YARD.x + c,
                y: YARD_BOTTOM - c
            },
            {
                x: YARD_RIGHT - c,
                y: YARD_BOTTOM - c
            },
            {
                x: YARD.x + c,
                y: (WALK_BOTTOM + YARD_BOTTOM) / 2
            },
            {
                x: YARD_RIGHT - c,
                y: (WALK_BOTTOM + YARD_BOTTOM) / 2 + FT * 4
            },
            {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 + 9 * FT,
                y: YARD_BOTTOM - c
            },
            {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 - 13 * FT,
                y: YARD_BOTTOM - c
            },
            {
                x: YARD.x + c,
                y: WALK_BOTTOM + d * 0.7
            },
            {
                x: YARD_RIGHT - c,
                y: WALK_BOTTOM + d * 0.7
            }
        ];
        const canvas = {
            x: 0,
            y: FRAME.roofH,
            w: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width,
            h: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].height - FRAME.roofH
        };
        for (const a of anchors){
            if (objects.filter((o)=>o.kind === 'olive_tree').length >= want) break;
            const tree = {
                box: {
                    x: a.x - d / 2,
                    y: a.y - d / 2,
                    w: d,
                    h: d
                },
                region: canvas,
                variant: 'olive'
            };
            if (firstFit([
                tree
            ], [
                ...taken(),
                deckBox
            ], FT * 0.25)) objects.push({
                kind: 'olive_tree',
                box: tree.box,
                variant: 'olive'
            });
        }
    }
    // 8. Ground details: beds, turf bands, the path to the house, night lights.
    const beds = stripsAround(objects);
    const turfBands = [];
    if (spec.extras.turfPlanting && spec.deck && spec.deckSize !== 'none') {
        const band = 0.6 * FT;
        const pitch = 5.5 * FT;
        const topH = core.y - deckBox.y;
        const botH = bottom(deckBox) - bottom(core);
        for(let x = deckBox.x + pitch; x < right(deckBox) - pitch / 2; x += pitch){
            if (topH > 2 * FT) turfBands.push({
                x,
                y: deckBox.y,
                w: band,
                h: topH
            });
            if (botH > 2 * FT) turfBands.push({
                x,
                y: bottom(core),
                w: band,
                h: botH
            });
        }
    }
    let path = null;
    const gap = deckBox.y - WALK_BOTTOM;
    if (gap > FT) {
        const pw = (spec.extras.turfPlanting ? 5 : 4) * FT;
        const x = deckBox.x + deckBox.w / 2 - pw / 2;
        if (spec.extras.turfPlanting) {
            const rects = [];
            const ph = 2 * FT;
            const n = Math.max(1, Math.floor((gap + FT) / (ph + FT)));
            const pitch = gap / n;
            for(let i = 0; i < n; i++)rects.push({
                x,
                y: WALK_BOTTOM + i * pitch + (pitch - ph) / 2,
                w: pw,
                h: Math.min(ph, pitch - 4)
            });
            path = {
                kind: 'pavers',
                rects
            };
        } else {
            path = {
                kind: 'walk',
                rects: [
                    {
                        x,
                        y: WALK_BOTTOM - 2,
                        w: pw,
                        h: gap + 4
                    }
                ]
            };
        }
    }
    const pathLights = [];
    const blocked = (p)=>objects.some((o)=>o.kind !== 'olive_tree' && rectsOverlap({
                x: p.x - 4,
                y: p.y - 4,
                w: 8,
                h: 8
            }, o.box));
    for (const bed of beds){
        const vertical = bed.h > bed.w;
        const len = vertical ? bed.h : bed.w;
        const n = Math.floor(len / (10 * FT));
        for(let i = 0; i < n; i++){
            const t = (i + 0.5) / n;
            const p = vertical ? {
                x: bed.x < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2 ? right(bed) - 5 : bed.x + 5,
                y: bed.y + bed.h * t
            } : {
                x: bed.x + bed.w * t,
                y: bed.y + 5
            };
            if (!blocked(p)) pathLights.push(p);
        }
    }
    if (path) {
        for (const r of path.rects.slice(0, 3)){
            pathLights.push({
                x: r.x - 8,
                y: r.y + r.h / 2
            }, {
                x: right(r) + 8,
                y: r.y + r.h / 2
            });
        }
    }
    const windows = [
        {
            x: deckBox.x + deckBox.w / 2 - 5 * FT,
            w: 10 * FT
        },
        {
            x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width * 0.18,
            w: 6 * FT
        },
        {
            x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width * 0.74,
            w: 7 * FT
        }
    ];
    const deckArea = (deckBox.w * deckBox.h - core.w * core.h) / (FT * FT);
    return {
        pool,
        core,
        deck: {
            box: deckBox,
            rx: spec.shape === 'freeform' ? 2 * FT : 0,
            areaSqft: deckArea,
            joinsWalk,
            turfBands
        },
        spa,
        baja,
        bowls,
        lights,
        objects,
        beds,
        path,
        pathLights,
        windows
    };
}
/** Scene units of roof always left in view at the top of a yard shot (the Day/Night switch sits there). */ const ROOF_IN_VIEW = 90;
function sceneCamera(layout, focus = 'yard') {
    const aspect = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].height;
    let box;
    let minW;
    if (focus === 'pool') {
        box = layout.core;
        for (const b of layout.bowls)box = union(box, {
            x: b.cx - b.r,
            y: b.cy - b.r,
            w: 2 * b.r,
            h: 2 * b.r
        });
        box = {
            x: box.x - 4 * FT,
            y: box.y - 7 * FT,
            w: box.w + 8 * FT,
            h: box.h + 11 * FT
        };
        minW = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width / 2;
    } else {
        box = layout.deck.box;
        // Trees stand by the walls: they may be cropped, like the edge of a real drone shot.
        for (const o of layout.objects)if (o.kind !== 'olive_tree') box = union(box, o.box);
        box = {
            x: box.x - 4 * FT,
            y: box.y,
            w: box.w + 8 * FT,
            h: box.h + 4 * FT
        };
        const top = Math.min(box.y, FRAME.roofH - ROOF_IN_VIEW);
        box = {
            ...box,
            y: top,
            h: bottom(box) - top
        };
        minW = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width * 0.68;
    }
    const w = Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width, Math.max(box.w, box.h * aspect, minW));
    const h = w / aspect;
    const clamp = (v, lo, hi)=>Math.min(Math.max(v, lo), hi);
    const x = clamp(box.x + box.w / 2 - w / 2, 0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].width - w);
    const y = clamp(focus === 'yard' ? box.y : box.y + box.h / 2 - h / 2, 0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE"].height - h);
    return {
        x: r2(x),
        y: r2(y),
        w: r2(w),
        h: r2(h)
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=lib_6e4d2376._.js.map