(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/lib/leads/normalize.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Contact normalization shared by the intake pipeline and dedupe. Mirrors the
// SQL `to_e164` / lower(trim(email)) logic in migration 0005 so app-side lookups
// match the stored normalized columns.
/** Normalize a phone number to E.164 (US default). Returns null if empty. */ __turbopack_context__.s([
    "normalizeEmail",
    ()=>normalizeEmail,
    "normalizePhone",
    ()=>normalizePhone,
    "parseUsPhone",
    ()=>parseUsPhone
]);
function normalizePhone(input) {
    if (!input) return null;
    const digits = String(input).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`; // best effort for international / other lengths
}
function parseUsPhone(input) {
    const raw = String(input ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return {
        ok: false,
        reason: 'empty'
    };
    if (raw.startsWith('+') && !digits.startsWith('1')) return {
        ok: false,
        reason: 'not_us'
    };
    const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (ten.length !== 10) return {
        ok: false,
        reason: 'invalid_length'
    };
    // NANP: area code and exchange start 2-9; N11 codes are service codes, not areas.
    if (!/^[2-9]/.test(ten) || /^[2-9]11/.test(ten)) return {
        ok: false,
        reason: 'invalid_area_code'
    };
    if (!/^[2-9]/.test(ten.slice(3))) return {
        ok: false,
        reason: 'invalid_exchange'
    };
    if (ten.slice(3, 6) === '555' && ten.slice(6, 8) === '01') return {
        ok: false,
        reason: 'fictional'
    };
    return {
        ok: true,
        e164: `+1${ten}`
    };
}
function normalizeEmail(input) {
    if (!input) return null;
    const e = String(input).trim().toLowerCase();
    return e === '' ? null : e;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/contractor-funnel/schema.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CAPACITY_OPTIONS",
    ()=>CAPACITY_OPTIONS,
    "DEFAULT_RULES",
    ()=>DEFAULT_RULES,
    "MAX_TEXT",
    ()=>MAX_TEXT,
    "NATIVE_SALES_CALENDAR_URL",
    ()=>NATIVE_SALES_CALENDAR_URL,
    "PROJECT_VALUE_OPTIONS",
    ()=>PROJECT_VALUE_OPTIONS,
    "REASON_LABELS",
    ()=>REASON_LABELS,
    "ROLE_OPTIONS",
    ()=>ROLE_OPTIONS,
    "SERVICE_OPTIONS",
    ()=>SERVICE_OPTIONS,
    "SOURCE_OPTIONS",
    ()=>SOURCE_OPTIONS,
    "TIMELINE_OPTIONS",
    ()=>TIMELINE_OPTIONS,
    "answersSchema",
    ()=>answersSchema,
    "attributionSchema",
    ()=>attributionSchema,
    "contactSchema",
    ()=>contactSchema,
    "inquirySchema",
    ()=>inquirySchema,
    "isMeasurementEvent",
    ()=>isMeasurementEvent,
    "mergeRules",
    ()=>mergeRules,
    "qualifyContractor",
    ()=>qualifyContractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$leads$2f$normalize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/leads/normalize.ts [app-client] (ecmascript)");
;
;
const SERVICE_OPTIONS = [
    {
        value: 'pools',
        label: 'Pools'
    },
    {
        value: 'roofing',
        label: 'Roofing'
    },
    {
        value: 'remodeling_gc',
        label: 'Residential remodeling / general contracting'
    },
    {
        value: 'fencing',
        label: 'Fencing and gates'
    },
    {
        value: 'hvac',
        label: 'HVAC installation / replacement'
    },
    {
        value: 'other',
        label: 'Something else'
    }
];
const ROLE_OPTIONS = [
    {
        value: 'owner',
        label: 'Owner'
    },
    {
        value: 'partner',
        label: 'Partner'
    },
    {
        value: 'marketing_sales',
        label: 'I run marketing or sales'
    },
    {
        value: 'other',
        label: 'Other'
    }
];
const PROJECT_VALUE_OPTIONS = [
    {
        value: 'under_5k',
        label: 'Under $5,000'
    },
    {
        value: '5k_15k',
        label: '$5,000 – $15,000'
    },
    {
        value: '15k_50k',
        label: '$15,000 – $50,000'
    },
    {
        value: '50k_plus',
        label: '$50,000 or more'
    },
    {
        value: 'varies',
        label: 'It varies'
    }
];
const CAPACITY_OPTIONS = [
    {
        value: 'none',
        label: 'No capacity right now'
    },
    {
        value: '1_5',
        label: '1 – 5 appointments'
    },
    {
        value: '6_15',
        label: '6 – 15 appointments'
    },
    {
        value: '16_30',
        label: '16 – 30 appointments'
    },
    {
        value: '30_plus',
        label: 'More than 30 appointments'
    }
];
const SOURCE_OPTIONS = [
    {
        value: 'referrals',
        label: 'Referrals'
    },
    {
        value: 'meta_ads',
        label: 'Meta (Facebook / Instagram) ads'
    },
    {
        value: 'google_ads',
        label: 'Google ads'
    },
    {
        value: 'lead_platforms',
        label: 'Lead platforms'
    },
    {
        value: 'organic_search',
        label: 'Organic search'
    },
    {
        value: 'other',
        label: 'Something else'
    }
];
const TIMELINE_OPTIONS = [
    {
        value: 'now',
        label: 'As soon as possible'
    },
    {
        value: 'within_30_days',
        label: 'Within 30 days'
    },
    {
        value: 'within_90_days',
        label: 'Within 90 days'
    },
    {
        value: 'researching',
        label: 'Just researching'
    }
];
const values = (o)=>o.map((x)=>x.value);
const MAX_TEXT = 300;
const answersSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    services: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(SERVICE_OPTIONS))).min(1, 'Choose at least one.').max(6),
    serviceOtherText: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(120).optional(),
    serviceArea: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(2, 'Tell us where you work, such as a city, county or ZIP code.').max(MAX_TEXT),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(ROLE_OPTIONS), {
        errorMap: ()=>({
                message: 'Choose your role.'
            })
    }),
    projectValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(PROJECT_VALUE_OPTIONS), {
        errorMap: ()=>({
                message: 'Choose a range.'
            })
    }),
    capacity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(CAPACITY_OPTIONS), {
        errorMap: ()=>({
                message: 'Choose a range.'
            })
    }),
    sources: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(SOURCE_OPTIONS))).min(1, 'Choose at least one.').max(6),
    timeline: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(values(TIMELINE_OPTIONS), {
        errorMap: ()=>({
                message: 'Choose when you would want to start.'
            })
    })
});
const website = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(200).optional().transform((v, ctx)=>{
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
        const u = new URL(withScheme);
        if (!u.hostname.includes('.')) throw new Error('host');
        return u.toString();
    } catch  {
        ctx.addIssue({
            code: 'custom',
            message: 'Enter a valid website, or leave this blank.'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].NEVER;
    }
});
const contactSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(2, 'Enter your name.').max(100),
    company: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(2, 'Enter your company name.').max(150),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().toLowerCase().email('Enter a valid business email.').max(200),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().transform((v, ctx)=>{
        const r = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$leads$2f$normalize$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseUsPhone"])(v);
        if (!r.ok) {
            ctx.addIssue({
                code: 'custom',
                message: 'Enter a valid US phone number.'
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].NEVER;
        }
        return r.e164;
    }),
    website,
    /** Required: permission to contact them about this inquiry. */ contactConsent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(true, {
        errorMap: ()=>({
                message: 'Please confirm so we can contact you about your inquiry.'
            })
    }),
    /** Optional and separate: general marketing email. */ marketingConsent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false)
});
const attributionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500)).default({}).transform((rec)=>{
    const allowed = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'campaign_id',
        'campaign_name',
        'adset_id',
        'adset_name',
        'ad_id',
        'ad_name',
        'placement',
        'site_source_name',
        'landing_page_url',
        'referrer'
    ];
    return Object.fromEntries(Object.entries(rec).filter(([k])=>allowed.includes(k)).slice(0, 20));
});
const inquirySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    submissionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    answers: answersSchema,
    contact: contactSchema,
    attribution: attributionSchema,
    /** Visitor's advertising-measurement choice at submit time. */ measurement: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    /** Spam signals; never persisted. */ honeypot: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    startedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional()
});
const DEFAULT_RULES = {
    reviewIfRoleOther: true,
    reviewIfNoCapacity: true,
    reviewIfResearching: true,
    reviewIfOnlyOtherServices: true
};
function mergeRules(stored) {
    const out = {
        ...DEFAULT_RULES
    };
    if (stored && typeof stored === 'object') {
        for (const k of Object.keys(DEFAULT_RULES)){
            const v = stored[k];
            if (typeof v === 'boolean') out[k] = v;
        }
    }
    return out;
}
function qualifyContractor(answers, rules = DEFAULT_RULES) {
    const reasons = [];
    if (rules.reviewIfOnlyOtherServices && answers.services.every((s)=>s === 'other')) reasons.push('only_other_services');
    if (rules.reviewIfRoleOther && answers.role === 'other') reasons.push('role_other');
    if (rules.reviewIfNoCapacity && answers.capacity === 'none') reasons.push('no_capacity');
    if (rules.reviewIfResearching && answers.timeline === 'researching') reasons.push('researching_only');
    return {
        status: reasons.length ? 'needs_review' : 'qualified',
        reasons
    };
}
const REASON_LABELS = {
    only_other_services: 'Only “something else” selected for services',
    role_other: 'Role is “Other”',
    no_capacity: 'No appointment capacity right now',
    researching_only: 'Only researching'
};
const NATIVE_SALES_CALENDAR_URL = '/app/calendar';
function isMeasurementEvent(e) {
    return [
        'CtaClick',
        'QualificationComplete',
        'Lead',
        'Schedule'
    ].includes(e);
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
"[project]/components/booking/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Wire types for the public booking API (app/api/booking/**) shared by the
 * route handlers and the homeowner UI (SlotPicker, BookingFlow, the manage
 * page). Pure: no I/O, safe on both sides. Every time is a UTC ISO string;
 * the UI formats it in the viewer's zone and always shows that zone.
 */ __turbopack_context__.s([
    "contractorFunnelGrant",
    ()=>contractorFunnelGrant
]);
function contractorFunnelGrant(submissionId, token) {
    return `hqc1.${submissionId}.${token}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/contractor-funnel/attribution.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AttributionCapture",
    ()=>AttributionCapture,
    "loadAttribution",
    ()=>loadAttribution,
    "storeAttribution",
    ()=>storeAttribution
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
/**
 * Campaign attribution (UTMs, Meta URL-parameter macros, fbclid, referrer) is
 * captured on whichever page the visitor lands on and kept in sessionStorage,
 * so it survives the hop from the landing page into the funnel. It never holds
 * contact data.
 */ const KEY = 'hqn-contractor-attribution';
function device() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}
function storeAttribution() {
    try {
        const fresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["captureAttribution"])(location.href, document.referrer, device());
        const hasCampaign = Object.keys(fresh).some((k)=>k.startsWith('utm_') || k.endsWith('_id') || k === 'fbclid');
        const previous = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
        // First touch wins; a later internal page view (no campaign params) never overwrites it.
        if (!previous || hasCampaign) sessionStorage.setItem(KEY, JSON.stringify(fresh));
    } catch  {}
}
function loadAttribution() {
    storeAttribution();
    try {
        const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
        return stored && typeof stored === 'object' ? stored : {};
    } catch  {
        return {};
    }
}
function AttributionCapture() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AttributionCapture.useEffect": ()=>{
            storeAttribution();
        }
    }["AttributionCapture.useEffect"], []);
    return null;
}
_s(AttributionCapture, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = AttributionCapture;
var _c;
__turbopack_context__.k.register(_c, "AttributionCapture");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/contractor-funnel/tracking.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MeasurementToggle",
    ()=>MeasurementToggle,
    "TrackedCta",
    ()=>TrackedCta,
    "readMeasurementChoice",
    ()=>readMeasurementChoice,
    "trackContractor",
    ()=>trackContractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const STANDARD = new Set([
    'Lead',
    'Schedule'
]);
const KEY = 'hqn-contractor-measurement';
const emitted = new Set();
function readMeasurementChoice() {
    try {
        return localStorage.getItem(KEY) === 'yes';
    } catch  {
        return false;
    }
}
function writeMeasurementChoice(on) {
    try {
        localStorage.setItem(KEY, on ? 'yes' : 'no');
    } catch  {}
}
function trackContractor(event, eventId, pixelId) {
    if (emitted.has(eventId)) return;
    emitted.add(eventId);
    if (pixelId && readMeasurementChoice()) {
        if (!window.fbq) {
            const pixel = (...args)=>pixel.callMethod ? pixel.callMethod(...args) : pixel.queue.push(args);
            pixel.queue = [];
            pixel.push = pixel;
            pixel.loaded = true;
            pixel.version = '2.0';
            window.fbq = pixel;
            window._fbq = pixel;
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://connect.facebook.net/en_US/fbevents.js';
            document.head.appendChild(script);
        }
        window.hqnPixels ??= new Set();
        if (!window.hqnPixels.has(pixelId)) {
            window.fbq('init', pixelId);
            window.hqnPixels.add(pixelId);
            window.fbq('trackSingle', pixelId, 'PageView');
        }
        window.fbq(STANDARD.has(event) ? 'trackSingle' : 'trackSingleCustom', pixelId, event, {
            content_name: 'contractor_funnel'
        }, {
            eventID: eventId
        });
    }
    window.dispatchEvent(new CustomEvent('hqn:contractor', {
        detail: {
            event,
            eventId
        }
    }));
}
function MeasurementToggle({ pixelId, onChange }) {
    _s();
    const [on, setOn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MeasurementToggle.useEffect": ()=>{
            setOn(readMeasurementChoice());
        }
    }["MeasurementToggle.useEffect"], []);
    if (!pixelId) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--hq-text-muted)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "checkbox",
                className: "size-4 accent-[var(--hq-accent)]",
                checked: on,
                onChange: (e)=>{
                    setOn(e.target.checked);
                    writeMeasurementChoice(e.target.checked);
                    onChange?.(e.target.checked);
                }
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/tracking.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            "Allow optional advertising measurement"
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/tracking.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_s(MeasurementToggle, "CC006q69CTX/QT11CuGeUsnU7ys=");
_c = MeasurementToggle;
function TrackedCta({ href, pixelId, location, className, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        className: className,
        onClick: ()=>trackContractor('CtaClick', `cta:${location}:${Date.now()}`, pixelId),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/contractor-funnel/tracking.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
_c1 = TrackedCta;
var _c, _c1;
__turbopack_context__.k.register(_c, "MeasurementToggle");
__turbopack_context__.k.register(_c1, "TrackedCta");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/contractor-funnel/funnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ContractorFunnel",
    ()=>ContractorFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-check.js [app-client] (ecmascript) <export default as CalendarCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contractor-funnel/schema.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$attribution$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/contractor-funnel/attribution.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/contractor-funnel/tracking.tsx [app-client] (ecmascript)");
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
;
;
const STEPS = [
    'services',
    'area',
    'role',
    'value',
    'capacity',
    'sources',
    'timeline',
    'contact'
];
const DRAFT_KEY = 'hqn-contractor-draft';
const emptyContact = {
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    contactConsent: false,
    marketingConsent: false
};
const TITLES = {
    services: {
        q: 'What services does your business provide?',
        hint: 'Select all that apply.'
    },
    area: {
        q: 'Where do you serve homeowners?',
        hint: 'Cities, counties or ZIP codes all work.'
    },
    role: {
        q: 'What is your role?'
    },
    value: {
        q: 'What is your typical project value?'
    },
    capacity: {
        q: 'How many additional homeowner appointments could your team handle each month?'
    },
    sources: {
        q: 'How do you currently get customers?',
        hint: 'Select all that apply.'
    },
    timeline: {
        q: 'When would you want to start?'
    },
    contact: {
        q: 'Where should we reach you?'
    }
};
function newId() {
    return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c)=>(Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
}
function ContractorFunnel({ pixelId, fallbackContactEmail }) {
    _s();
    const [stepIndex, setStepIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [contact, setContact] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(emptyContact);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [submitError, setSubmitError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [outcome, setOutcome] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [hydrated, setHydrated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const submissionId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])('');
    const startedAt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const headingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const honeypot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Restore non-contact answers (never contact details) after an accidental refresh.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ContractorFunnel.useEffect": ()=>{
            startedAt.current = Date.now();
            submissionId.current = newId();
            try {
                const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
                if (saved?.draft) setDraft(saved.draft);
                if (typeof saved?.stepIndex === 'number') setStepIndex(Math.min(saved.stepIndex, STEPS.length - 1));
                if (typeof saved?.submissionId === 'string') submissionId.current = saved.submissionId;
            } catch  {}
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$attribution$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAttribution"])();
            setHydrated(true);
        }
    }["ContractorFunnel.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ContractorFunnel.useEffect": ()=>{
            if (!hydrated || outcome) return;
            try {
                sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
                    draft,
                    stepIndex,
                    submissionId: submissionId.current
                }));
            } catch  {}
        }
    }["ContractorFunnel.useEffect"], [
        draft,
        stepIndex,
        hydrated,
        outcome
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ContractorFunnel.useEffect": ()=>{
            headingRef.current?.focus({
                preventScroll: false
            });
        }
    }["ContractorFunnel.useEffect"], [
        stepIndex,
        outcome
    ]);
    const step = STEPS[stepIndex];
    const validateStep = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ContractorFunnel.useCallback[validateStep]": ()=>{
            const e = {};
            const pick = {
                "ContractorFunnel.useCallback[validateStep].pick": (field)=>{
                    const r = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["answersSchema"].shape[field].safeParse(draft[field]);
                    if (!r.success) e[field] = r.error.issues[0]?.message ?? 'Please answer this question.';
                }
            }["ContractorFunnel.useCallback[validateStep].pick"];
            if (step === 'services') {
                pick('services');
                if (draft.services?.includes('other') && !draft.serviceOtherText?.trim()) e.serviceOtherText = 'Tell us briefly what you do.';
            }
            if (step === 'area') pick('serviceArea');
            if (step === 'role') pick('role');
            if (step === 'value') pick('projectValue');
            if (step === 'capacity') pick('capacity');
            if (step === 'sources') pick('sources');
            if (step === 'timeline') pick('timeline');
            setErrors(e);
            return Object.keys(e).length === 0;
        }
    }["ContractorFunnel.useCallback[validateStep]"], [
        draft,
        step
    ]);
    const next = ()=>{
        if (!validateStep()) return;
        if (step === 'timeline') (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackContractor"])('QualificationComplete', `${submissionId.current}:QualificationComplete`, pixelId);
        setStepIndex((i)=>Math.min(i + 1, STEPS.length - 1));
    };
    const back = ()=>{
        setErrors({});
        setSubmitError(null);
        setStepIndex((i)=>Math.max(0, i - 1));
    };
    const submit = async (ev)=>{
        ev.preventDefault();
        if (submitting) return; // Duplicate-submit guard (the server is idempotent too).
        const parsedAnswers = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["answersSchema"].safeParse(draft);
        const parsedContact = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["contactSchema"].safeParse(contact);
        if (!parsedContact.success || !parsedAnswers.success) {
            const e = {};
            if (!parsedContact.success) for (const i of parsedContact.error.issues)e[String(i.path[0])] ??= i.message;
            setErrors(e);
            if (!parsedAnswers.success) setSubmitError('Some earlier answers are missing. Use Back to complete them.');
            return;
        }
        setErrors({});
        setSubmitError(null);
        setSubmitting(true);
        try {
            const res = await fetch('/api/contractor-funnel/inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    submissionId: submissionId.current,
                    answers: parsedAnswers.data,
                    contact: {
                        ...contact,
                        website: contact.website
                    },
                    attribution: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$attribution$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAttribution"])(),
                    measurement: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readMeasurementChoice"])(),
                    honeypot: honeypot.current?.value ?? '',
                    startedAt: startedAt.current
                })
            });
            const data = await res.json().catch(()=>({}));
            if (res.status === 422 && data.fieldErrors) {
                const fe = {};
                for (const [k, v] of Object.entries(data.fieldErrors))fe[k.replace(/^contact\./, '')] = v;
                setErrors(fe);
                setSubmitError(data.error ?? 'Please check your details and try again.');
                return;
            }
            if (!res.ok) {
                setSubmitError(data.error ?? 'We could not save your details just now. Please try again in a moment.');
                return;
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackContractor"])('Lead', `${submissionId.current}:Lead`, pixelId);
            try {
                sessionStorage.removeItem(DRAFT_KEY);
            } catch  {}
            setOutcome(data);
        } catch  {
            setSubmitError('We could not reach our server. Check your connection and try again. Your answers are still here.');
        } finally{
            setSubmitting(false);
        }
    };
    const progress = outcome ? 100 : Math.round(stepIndex / STEPS.length * 100);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto w-full max-w-xl px-5 pb-16 pt-6 sm:pt-12",
        children: [
            !outcome && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-2 flex items-center justify-between text-sm text-[var(--hq-text-muted)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "Step ",
                                    stepIndex + 1,
                                    " of ",
                                    STEPS.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 169,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "About 2 minutes"
                            }, void 0, false, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 170,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 168,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "progressbar",
                        "aria-label": "Progress",
                        "aria-valuemin": 0,
                        "aria-valuemax": STEPS.length,
                        "aria-valuenow": stepIndex + 1,
                        className: "h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-full rounded-full bg-[var(--hq-accent)] transition-[width] duration-300 motion-reduce:transition-none",
                            style: {
                                width: `${progress + 100 / STEPS.length}%`
                            }
                        }, void 0, false, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 176,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 167,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hq-card p-6 sm:p-8",
                children: outcome ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Result, {
                    outcome: outcome,
                    contact: contact,
                    submissionId: submissionId.current,
                    pixelId: pixelId,
                    headingRef: headingRef,
                    fallbackContactEmail: fallbackContactEmail
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 183,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: step === 'contact' ? submit : (e)=>{
                        e.preventDefault();
                        next();
                    },
                    noValidate: true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            ref: headingRef,
                            tabIndex: -1,
                            className: "text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-[1.75rem]",
                            children: TITLES[step].q
                        }, void 0, false, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 186,
                            columnNumber: 13
                        }, this),
                        TITLES[step].hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-2 text-sm text-[var(--hq-text-muted)]",
                            children: TITLES[step].hint
                        }, void 0, false, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 189,
                            columnNumber: 35
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-6 space-y-3",
                            children: [
                                step === 'services' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                            legend: TITLES.services.q,
                                            multi: true,
                                            options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SERVICE_OPTIONS"],
                                            value: draft.services ?? [],
                                            onChange: (v)=>setDraft((d)=>({
                                                        ...d,
                                                        services: v
                                                    })),
                                            error: errors.services
                                        }, void 0, false, {
                                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                            lineNumber: 194,
                                            columnNumber: 19
                                        }, this),
                                        draft.services?.includes('other') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                            id: "c-other",
                                            label: "What do you do?",
                                            error: errors.serviceOtherText,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                id: "c-other",
                                                className: inputCls,
                                                value: draft.serviceOtherText ?? '',
                                                maxLength: 120,
                                                onChange: (e)=>setDraft((d)=>({
                                                            ...d,
                                                            serviceOtherText: e.target.value
                                                        }))
                                            }, void 0, false, {
                                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                                lineNumber: 197,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                            lineNumber: 196,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true),
                                step === 'area' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                    id: "c-area",
                                    label: "Cities, counties or ZIP codes",
                                    error: errors.serviceArea,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                        id: "c-area",
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(inputCls, 'min-h-28 py-3'),
                                        value: draft.serviceArea ?? '',
                                        maxLength: 300,
                                        placeholder: "e.g. Encino, Sherman Oaks, Ventura County, 91436",
                                        autoComplete: "off",
                                        onChange: (e)=>setDraft((d)=>({
                                                    ...d,
                                                    serviceArea: e.target.value
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                        lineNumber: 204,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 203,
                                    columnNumber: 17
                                }, this),
                                step === 'role' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                    legend: TITLES.role.q,
                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE_OPTIONS"],
                                    value: draft.role ?? '',
                                    onChange: (v)=>setDraft((d)=>({
                                                ...d,
                                                role: v
                                            })),
                                    error: errors.role
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 208,
                                    columnNumber: 35
                                }, this),
                                step === 'value' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                    legend: TITLES.value.q,
                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROJECT_VALUE_OPTIONS"],
                                    value: draft.projectValue ?? '',
                                    onChange: (v)=>setDraft((d)=>({
                                                ...d,
                                                projectValue: v
                                            })),
                                    error: errors.projectValue
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 209,
                                    columnNumber: 36
                                }, this),
                                step === 'capacity' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                    legend: TITLES.capacity.q,
                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CAPACITY_OPTIONS"],
                                    value: draft.capacity ?? '',
                                    onChange: (v)=>setDraft((d)=>({
                                                ...d,
                                                capacity: v
                                            })),
                                    error: errors.capacity
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 210,
                                    columnNumber: 39
                                }, this),
                                step === 'sources' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                    legend: TITLES.sources.q,
                                    multi: true,
                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SOURCE_OPTIONS"],
                                    value: draft.sources ?? [],
                                    onChange: (v)=>setDraft((d)=>({
                                                ...d,
                                                sources: v
                                            })),
                                    error: errors.sources
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 211,
                                    columnNumber: 38
                                }, this),
                                step === 'timeline' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OptionGroup, {
                                    legend: TITLES.timeline.q,
                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contractor$2d$funnel$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIMELINE_OPTIONS"],
                                    value: draft.timeline ?? '',
                                    onChange: (v)=>setDraft((d)=>({
                                                ...d,
                                                timeline: v
                                            })),
                                    error: errors.timeline
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 212,
                                    columnNumber: 39
                                }, this),
                                step === 'contact' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ContactFields, {
                                    contact: contact,
                                    setContact: setContact,
                                    errors: errors,
                                    honeypot: honeypot
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 214,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 191,
                            columnNumber: 13
                        }, this),
                        submitError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            role: "alert",
                            className: "mt-5 rounded-xl border border-[var(--hq-bad)]/50 bg-[var(--hq-bad)]/10 px-4 py-3 text-sm leading-6 text-[var(--hq-text)]",
                            children: submitError
                        }, void 0, false, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 219,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-8 flex items-center gap-3",
                            children: [
                                stepIndex > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: back,
                                    disabled: submitting,
                                    className: "inline-flex h-12 items-center gap-2 rounded-full border border-[var(--hq-line-strong)] px-5 text-sm font-semibold text-[var(--hq-text)] hover:bg-[var(--hq-surface-2)] disabled:opacity-60",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                            className: "size-4",
                                            "aria-hidden": "true"
                                        }, void 0, false, {
                                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                            lineNumber: 227,
                                            columnNumber: 19
                                        }, this),
                                        " Back"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 226,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    disabled: submitting || !hydrated,
                                    className: "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--hq-cta)] px-6 text-[15px] font-semibold text-[var(--hq-cta-ink)] hover:bg-[var(--hq-cta-hover)] disabled:opacity-60",
                                    children: submitting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                className: "size-4 animate-spin",
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                                lineNumber: 231,
                                                columnNumber: 34
                                            }, this),
                                            " Saving…"
                                        ]
                                    }, void 0, true) : step === 'contact' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            submitError ? 'Try again' : 'Check my fit',
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                className: "size-4",
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                                lineNumber: 231,
                                                columnNumber: 180
                                            }, this)
                                        ]
                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            "Continue ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                className: "size-4",
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                                lineNumber: 231,
                                                columnNumber: 251
                                            }, this)
                                        ]
                                    }, void 0, true)
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 230,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 224,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 185,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 181,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 flex flex-col gap-1 text-xs text-[var(--hq-text-dim)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeasurementToggle"], {
                        pixelId: pixelId
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 239,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "flex items-start gap-2 leading-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                className: "mt-0.5 size-3.5 shrink-0",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 240,
                                columnNumber: 57
                            }, this),
                            " Your answers go to the HomeQuote Network team only. No sales results are promised or implied."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 240,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 238,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/funnel.tsx",
        lineNumber: 165,
        columnNumber: 5
    }, this);
}
_s(ContractorFunnel, "WDmnIgbrKHuyea5Est5Ei00NG64=");
_c = ContractorFunnel;
/* ---- Inputs ---------------------------------------------------------------- */ const inputCls = 'block w-full min-h-12 rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] px-4 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus:border-[var(--hq-accent-bright)] focus:outline-none focus:ring-2 focus:ring-[var(--hq-accent)]/40';
function Field({ label, error, optional, children, id }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                className: "mb-1.5 block text-sm font-medium text-[var(--hq-text)]",
                children: [
                    label,
                    " ",
                    optional && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-normal text-[var(--hq-text-dim)]",
                        children: "(optional)"
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 254,
                        columnNumber: 30
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 253,
                columnNumber: 7
            }, this),
            children,
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "mt-1.5 text-sm text-[var(--hq-bad)]",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 257,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/funnel.tsx",
        lineNumber: 252,
        columnNumber: 5
    }, this);
}
_c1 = Field;
function OptionGroup({ legend, options, value, onChange, multi, error }) {
    _s1();
    const selected = Array.isArray(value) ? value : [
        value
    ];
    const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                className: "sr-only",
                children: legend
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 269,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2.5",
                children: options.map((o)=>{
                    const on = selected.includes(o.value);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--hq-accent)]/60', on ? 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] text-[var(--hq-text)]' : 'border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-text)] hover:border-[var(--hq-text-dim)]'),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: multi ? 'checkbox' : 'radio',
                                name: name,
                                value: o.value,
                                checked: on,
                                className: "sr-only",
                                onChange: ()=>onChange(multi ? on ? selected.filter((s)=>s !== o.value) : [
                                        ...selected,
                                        o.value
                                    ] : o.value)
                            }, void 0, false, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 278,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex size-5 shrink-0 items-center justify-center border-2', multi ? 'rounded-md' : 'rounded-full', on ? 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent)]' : 'border-[var(--hq-text-dim)]'),
                                children: on && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('block bg-white', multi ? 'size-2 rounded-sm' : 'size-2 rounded-full')
                                }, void 0, false, {
                                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                    lineNumber: 283,
                                    columnNumber: 24
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 282,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: o.label
                            }, void 0, false, {
                                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                                lineNumber: 285,
                                columnNumber: 15
                            }, this)
                        ]
                    }, o.value, true, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 274,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 270,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "mt-2 text-sm text-[var(--hq-bad)]",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 290,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/funnel.tsx",
        lineNumber: 268,
        columnNumber: 5
    }, this);
}
_s1(OptionGroup, "vmOhoenGZdt1Gpb7VzIj5LWsBiE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c2 = OptionGroup;
function ContactFields({ contact, setContact, errors, honeypot }) {
    const set = (k, v)=>setContact((c)=>({
                ...c,
                [k]: v
            }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                id: "c-name",
                label: "Your name",
                error: errors.name,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "c-name",
                    className: inputCls,
                    autoComplete: "name",
                    value: contact.name,
                    onChange: (e)=>set('name', e.target.value)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 302,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 301,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                id: "c-company",
                label: "Company",
                error: errors.company,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "c-company",
                    className: inputCls,
                    autoComplete: "organization",
                    value: contact.company,
                    onChange: (e)=>set('company', e.target.value)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 305,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                id: "c-email",
                label: "Business email",
                error: errors.email,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "c-email",
                    type: "email",
                    inputMode: "email",
                    className: inputCls,
                    autoComplete: "email",
                    value: contact.email,
                    onChange: (e)=>set('email', e.target.value)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 308,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                id: "c-phone",
                label: "Phone",
                error: errors.phone,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "c-phone",
                    type: "tel",
                    inputMode: "tel",
                    className: inputCls,
                    autoComplete: "tel",
                    value: contact.phone,
                    onChange: (e)=>set('phone', e.target.value)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 311,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 310,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                id: "c-website",
                label: "Website",
                optional: true,
                error: errors.website,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "c-website",
                    inputMode: "url",
                    className: inputCls,
                    autoComplete: "url",
                    placeholder: "yourcompany.com",
                    value: contact.website,
                    onChange: (e)=>set('website', e.target.value)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 314,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 313,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "absolute -left-[9999px] h-0 w-0 overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    children: [
                        "Leave this field blank",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            ref: honeypot,
                            name: "company_url",
                            tabIndex: -1,
                            autoComplete: "off"
                        }, void 0, false, {
                            fileName: "[project]/components/contractor-funnel/funnel.tsx",
                            lineNumber: 319,
                            columnNumber: 38
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 319,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 318,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 px-4 py-3 text-sm leading-6 text-[var(--hq-text-muted)]",
                children: [
                    "HomeQuote Network uses these details only to review your answers, contact you about this inquiry and, if you are a fit, to set up a call. We do not sell them. See our ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: "/privacy",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[var(--hq-accent-bright)] underline",
                        children: "Privacy Policy"
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 324,
                        columnNumber: 17
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 322,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        className: "mt-1 size-5 shrink-0 accent-[var(--hq-accent)]",
                        checked: contact.contactConsent,
                        onChange: (e)=>set('contactConsent', e.target.checked),
                        "aria-describedby": errors.contactConsent ? 'c-consent-err' : undefined
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 327,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "I agree that HomeQuote Network may contact me by phone, email or text about this inquiry. Message and data rates may apply. Reply STOP to opt out."
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 328,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 326,
                columnNumber: 7
            }, this),
            errors.contactConsent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: "c-consent-err",
                role: "alert",
                className: "text-sm text-[var(--hq-bad)]",
                children: errors.contactConsent
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 330,
                columnNumber: 33
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        className: "mt-1 size-5 shrink-0 accent-[var(--hq-accent)]",
                        checked: contact.marketingConsent,
                        onChange: (e)=>set('marketingConsent', e.target.checked)
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 332,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Optional: also send me occasional HomeQuote Network updates and offers by email. You can unsubscribe at any time."
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 333,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 331,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c3 = ContactFields;
function Result({ outcome, contact, submissionId, pixelId, headingRef, fallbackContactEmail }) {
    _s2();
    const [booking, setBooking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [bookingVerified, setBookingVerified] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [calendarSlow, setCalendarSlow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [nativeBooked, setNativeBooked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const calendarSeen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const cal = outcome.calendar;
    const embedSrc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Result.useMemo[embedSrc]": ()=>{
            if (!cal || cal.provider !== 'calendly') return null;
            try {
                // Name/email go only to the Calendly iframe (prefill); the visible page URL and our analytics never carry them.
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calendlyEmbedUrl"])(cal.url, location.hostname, {
                    name: contact.name,
                    email: contact.email
                }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$attribution$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAttribution"])());
            } catch  {
                return null;
            }
        }
    }["Result.useMemo[embedSrc]"], [
        cal,
        contact.name,
        contact.email
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Result.useEffect": ()=>{
            if (!embedSrc) return;
            const timer = setTimeout({
                "Result.useEffect.timer": ()=>{
                    if (!calendarSeen.current) setCalendarSlow(true);
                }
            }["Result.useEffect.timer"], 12000);
            const onMessage = {
                "Result.useEffect.onMessage": async (event)=>{
                    if (event.origin !== 'https://calendly.com') return;
                    const type = event.data?.event;
                    if (typeof type !== 'string' || !type.startsWith('calendly.')) return;
                    calendarSeen.current = true;
                    setCalendarSlow(false);
                    if (type !== 'calendly.event_scheduled') return;
                    const eventUri = event.data?.payload?.event?.uri;
                    const inviteeUri = event.data?.payload?.invitee?.uri;
                    if (typeof eventUri !== 'string' || typeof inviteeUri !== 'string' || !outcome.token) return;
                    setBooking('saving');
                    try {
                        const res = await fetch('/api/contractor-funnel/booking', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                submissionId,
                                token: outcome.token,
                                eventUri,
                                inviteeUri
                            })
                        });
                        const data = await res.json().catch({
                            "Result.useEffect.onMessage": ()=>({})
                        }["Result.useEffect.onMessage"]);
                        if (res.ok) {
                            setBookingVerified(data.status === 'confirmed');
                            setBooking('booked');
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackContractor"])('Schedule', `${submissionId}:Schedule`, pixelId);
                        } else setBooking('record_failed');
                    } catch  {
                        setBooking('record_failed');
                    }
                }
            }["Result.useEffect.onMessage"];
            window.addEventListener('message', onMessage);
            return ({
                "Result.useEffect": ()=>{
                    clearTimeout(timer);
                    window.removeEventListener('message', onMessage);
                }
            })["Result.useEffect"];
        }
    }["Result.useEffect"], [
        embedSrc,
        outcome.token,
        submissionId,
        pixelId
    ]);
    if (outcome.status === 'needs_review') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                    className: "mx-auto size-10 text-[var(--hq-good)]",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 394,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    ref: headingRef,
                    tabIndex: -1,
                    className: "mt-4 text-2xl font-semibold tracking-tight outline-none",
                    children: "Thanks, we have your details."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 395,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]",
                    children: "We’ll review your answers and contact you. We haven’t booked a call yet, and a reply is not guaranteed to mean an appointment is available in your area."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 396,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/contractor-funnel/funnel.tsx",
            lineNumber: 393,
            columnNumber: 7
        }, this);
    }
    if (booking === 'booked') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__["CalendarCheck"], {
                    className: "mx-auto size-10 text-[var(--hq-good)]",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 406,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    ref: headingRef,
                    tabIndex: -1,
                    className: "mt-4 text-2xl font-semibold tracking-tight outline-none",
                    children: "Your call is booked."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 407,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]",
                    children: bookingVerified ? 'We checked the booking with our calendar. Look for the calendar invitation in your email.' : 'The calendar reported your booking. Look for the calendar invitation in your email. If it does not arrive, reply to us at the address below.'
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 408,
                    columnNumber: 9
                }, this),
                !bookingVerified && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-2 text-sm text-[var(--hq-text-dim)]",
                    children: fallbackContactEmail
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 413,
                    columnNumber: 30
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/contractor-funnel/funnel.tsx",
            lineNumber: 405,
            columnNumber: 7
        }, this);
    }
    // HomeQuote's own sales calendar: pick a time right here, recorded on our side with the submission's grant.
    if (cal?.provider === 'homequote' && outcome.token) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            "data-contractor-booking": "homequote",
            className: "bk-on-dark",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    ref: headingRef,
                    tabIndex: -1,
                    className: "text-balance text-2xl font-semibold tracking-tight outline-none",
                    children: nativeBooked ? 'Your call is booked.' : 'Your details are saved. Pick a time for your call.'
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 422,
                    columnNumber: 9
                }, this),
                !nativeBooked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-2 text-sm leading-6 text-[var(--hq-text-muted)]",
                    children: "A free 30-minute call with HomeQuote. Times show in your time zone."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 426,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingFlow"], {
                        grant: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["contractorFunnelGrant"])(submissionId, outcome.token),
                        heading: null,
                        headingLevel: 2,
                        onBooked: ()=>{
                            setNativeBooked(true);
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$contractor$2d$funnel$2f$tracking$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackContractor"])('Schedule', `${submissionId}:Schedule`, pixelId);
                        }
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 429,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 428,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/contractor-funnel/funnel.tsx",
            lineNumber: 421,
            columnNumber: 7
        }, this);
    }
    if (!cal || cal.provider === 'homequote') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                    className: "mx-auto size-10 text-[var(--hq-good)]",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 446,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    ref: headingRef,
                    tabIndex: -1,
                    className: "mt-4 text-2xl font-semibold tracking-tight outline-none",
                    children: "Thanks, we have your details."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 447,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]",
                    children: "You look like a good fit to talk. Online booking isn’t available right now, so we’ll contact you to schedule your call. Nothing is booked yet."
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 448,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/contractor-funnel/funnel.tsx",
            lineNumber: 445,
            columnNumber: 7
        }, this);
    }
    const slow = calendarSlow && booking === 'idle';
    const fallbackLink = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: cal.url,
        target: "_blank",
        rel: "noopener noreferrer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold', embedSrc && !slow ? 'border border-[var(--hq-line-strong)] text-[var(--hq-text-muted)] hover:bg-[var(--hq-surface-2)]' : 'bg-[var(--hq-cta)] text-[var(--hq-cta-ink)] hover:bg-[var(--hq-cta-hover)]'),
        children: [
            embedSrc ? 'Calendar not loading? Open it in a new tab' : 'Open booking calendar',
            " ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                className: "size-4",
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 459,
                columnNumber: 91
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/funnel.tsx",
        lineNumber: 457,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                ref: headingRef,
                tabIndex: -1,
                className: "text-balance text-2xl font-semibold tracking-tight outline-none",
                children: "Your details are saved. Pick a time for your call."
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 465,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm leading-6 text-[var(--hq-text-muted)]",
                children: embedSrc ? 'Choose a time below. Nothing is scheduled until the calendar confirms it.' : 'Open the calendar to choose a time. This page can’t see bookings made there, so you’ll get your confirmation by email from the calendar.'
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 466,
                columnNumber: 7
            }, this),
            slow && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        role: "alert",
                        className: "mt-4 rounded-xl border border-[var(--hq-warn)]/50 bg-[var(--hq-warn)]/10 px-4 py-3 text-sm leading-6",
                        children: "The calendar is taking a while to load. You can open it in a new tab instead. Your details are already saved."
                    }, void 0, false, {
                        fileName: "[project]/components/contractor-funnel/funnel.tsx",
                        lineNumber: 472,
                        columnNumber: 11
                    }, this),
                    fallbackLink
                ]
            }, void 0, true),
            embedSrc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 overflow-hidden rounded-xl border border-[var(--hq-line-strong)] bg-white",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                    title: "Book a call with HomeQuote Network",
                    src: embedSrc,
                    className: "h-[640px] w-full sm:h-[700px]",
                    referrerPolicy: "strict-origin-when-cross-origin"
                }, void 0, false, {
                    fileName: "[project]/components/contractor-funnel/funnel.tsx",
                    lineNumber: 480,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 479,
                columnNumber: 9
            }, this),
            booking === 'saving' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                className: "mt-3 text-sm text-[var(--hq-text-muted)]",
                children: "Checking your booking…"
            }, void 0, false, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 483,
                columnNumber: 32
            }, this),
            booking === 'record_failed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "mt-3 rounded-xl border border-[var(--hq-warn)]/50 bg-[var(--hq-warn)]/10 px-4 py-3 text-sm leading-6",
                children: [
                    "The calendar showed a booking, but we couldn’t record it on our side. Check your email for the calendar’s confirmation, and email ",
                    fallbackContactEmail,
                    " if you don’t see one."
                ]
            }, void 0, true, {
                fileName: "[project]/components/contractor-funnel/funnel.tsx",
                lineNumber: 485,
                columnNumber: 9
            }, this),
            !slow && fallbackLink
        ]
    }, void 0, true, {
        fileName: "[project]/components/contractor-funnel/funnel.tsx",
        lineNumber: 464,
        columnNumber: 5
    }, this);
}
_s2(Result, "+rUsYvtnektjJLb99111V3C9roE=");
_c4 = Result;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "ContractorFunnel");
__turbopack_context__.k.register(_c1, "Field");
__turbopack_context__.k.register(_c2, "OptionGroup");
__turbopack_context__.k.register(_c3, "ContactFields");
__turbopack_context__.k.register(_c4, "Result");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_3b15406d._.js.map