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
"[project]/components/ui/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Slot$3e$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript) <export * as Slot>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 font-semibold",
            destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
            outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
            secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
            // Destructive but not the primary thing on screen (remove, disable).
            "destructive-outline": "border border-destructive/40 bg-background text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/20",
            ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-11 px-4 py-2 has-[>svg]:px-3 lg:h-9",
            sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 lg:h-8",
            lg: "h-12 rounded-md px-6 has-[>svg]:px-4 lg:h-10",
            icon: "size-11 lg:size-9"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Slot$3e$__["Slot"].Slot : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "button",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/button.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
_c = Button;
;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/input.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Input",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function Input({ className, type, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        type: type,
        "data-slot": "input",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base lg:h-9 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]", "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/input.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Input;
;
var _c;
__turbopack_context__.k.register(_c, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/label.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Label",
    ()=>Label
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$label$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Label$3e$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-label/dist/index.mjs [app-client] (ecmascript) <export * as Label>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Label({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$label$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Label$3e$__["Label"].Root, {
        "data-slot": "label",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/label.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = Label;
;
var _c;
__turbopack_context__.k.register(_c, "Label");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/textarea.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Textarea",
    ()=>Textarea
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function Textarea({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
        "data-slot": "textarea",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('border-input placeholder:text-muted-foreground flex min-h-28 w-full lg:min-h-20 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]', 'aria-invalid:ring-destructive/20 aria-invalid:border-destructive', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/textarea.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
_c = Textarea;
;
var _c;
__turbopack_context__.k.register(_c, "Textarea");
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
"[project]/lib/funnels/builder.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Pure helpers for the no-code funnel builder. No server-only import: these
// run in the browser (live preview, client-side validation) and on the
// server (create/duplicate actions) from the same code.
//
// Architecture: the builder edits and validates `FunnelConfig` (lib/funnels/schema.ts)
// — the same jsonb every public funnel, save_funnel_session, funnel_report and
// GHL/Calendly delivery already run on. There is no separate funnel_steps /
// funnel_step_options / funnel_logic_rules table: a step IS a `questions[]`
// entry, an option IS `question.options[]`, branching logic IS `showWhen`.
// See docs/funnel-builder-architecture.md.
__turbopack_context__.s([
    "STEP_TYPE_PRESETS",
    ()=>STEP_TYPE_PRESETS,
    "addOption",
    ()=>addOption,
    "addQuestion",
    ()=>addQuestion,
    "blankFunnelConfig",
    ()=>blankFunnelConfig,
    "changeQuestionType",
    ()=>changeQuestionType,
    "duplicateQuestion",
    ()=>duplicateQuestion,
    "idify",
    ()=>idify,
    "moveOption",
    ()=>moveOption,
    "moveQuestion",
    ()=>moveQuestion,
    "nativeCalendarOwner",
    ()=>nativeCalendarOwner,
    "previewAdvance",
    ()=>previewAdvance,
    "previewAnswersForStep",
    ()=>previewAnswersForStep,
    "removeCalendarStep",
    ()=>removeCalendarStep,
    "removeOption",
    ()=>removeOption,
    "removeQuestion",
    ()=>removeQuestion,
    "setCalendarProvider",
    ()=>setCalendarProvider,
    "slugify",
    ()=>slugify,
    "uniqueId",
    ()=>uniqueId,
    "updateQuestion",
    ()=>updateQuestion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
;
/** Question ids and option values share this pattern (lib/funnels/schema.ts `key`/option regex). */ const ID_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const OPTION_PATTERN = /^[a-z0-9_]{1,50}$/;
function slugify(input) {
    const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'funnel';
    return /^[a-z0-9]/.test(base) ? base : `f-${base}`;
}
function idify(input, pattern = ID_PATTERN) {
    const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
    return pattern.test(base) ? base : `q_${base}`.slice(0, 50);
}
function uniqueId(base, used, pattern = ID_PATTERN) {
    let id = idify(base, pattern);
    for(let n = 2; used.has(id); n++)id = idify(`${base}_${n}`, pattern);
    return id;
}
function blankFunnelConfig(clientName, industry) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["funnelSchema"].parse({
        version: 1,
        clientName,
        industry,
        serviceArea: {
            label: 'your area',
            zipCodes: [],
            zipPrefixes: []
        },
        questions: [
            {
                id: 'service',
                type: 'choice',
                headline: 'What would you like help with?',
                options: [
                    {
                        value: 'option_1',
                        label: 'Option 1'
                    },
                    {
                        value: 'option_2',
                        label: 'Option 2'
                    }
                ]
            },
            {
                id: 'zip',
                type: 'zip',
                headline: 'Where is your project located?',
                description: 'Enter the ZIP code of the property.'
            }
        ],
        thankYouPage: {
            headline: 'You’re all set.',
            message: 'Your project details are saved. The team will be in touch shortly.'
        },
        // Qualified visitors book a free call on the HomeQuote calendar (removable in the builder).
        calendarProvider: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_CALENDAR_PROVIDER"]
    });
}
function setCalendarProvider(config, provider) {
    if (provider === 'homequote') return {
        ...config,
        calendarProvider: provider,
        calendarUrl: undefined,
        calendarId: undefined
    };
    return {
        ...config,
        calendarProvider: provider,
        ...provider === 'calendly' ? {
            calendarId: undefined
        } : {}
    };
}
function removeCalendarStep(config) {
    return {
        ...config,
        calendarProvider: 'ghl',
        calendarUrl: undefined,
        calendarId: undefined
    };
}
function nativeCalendarOwner(contractorName) {
    return contractorName ? `${contractorName}’s calendar` : 'the HomeQuote team calendar (project specialists; a contractor is matched later)';
}
const NEW_TEXT_HEADLINES = {
    short_text: 'Briefly describe your project',
    long_text: 'Tell us more about what you’d like done',
    address: 'What is the property address?',
    number: 'Enter a number',
    email: 'What is your email address?',
    phone: 'What is the best phone number to reach you?'
};
function addQuestion(config, type) {
    const used = new Set(config.questions.map((q)=>q.id));
    const id = uniqueId(type === 'choice' ? 'question' : type, used);
    const question = type === 'zip' ? {
        id,
        type: 'zip',
        headline: 'Where is your project located?',
        description: 'Enter the ZIP code of the property.',
        options: [],
        showWhen: []
    } : type === 'choice' ? {
        id,
        type: 'choice',
        headline: 'New question',
        options: [
            {
                value: 'option_1',
                label: 'Option 1'
            },
            {
                value: 'option_2',
                label: 'Option 2'
            }
        ],
        showWhen: []
    } : {
        id,
        type,
        headline: NEW_TEXT_HEADLINES[type],
        options: [],
        showWhen: [],
        required: true
    };
    return {
        ...config,
        questions: [
            ...config.questions,
            question
        ]
    };
}
function removeQuestion(config, id) {
    return {
        ...config,
        questions: config.questions.filter((q)=>q.id !== id)// A branch can't point at a question that no longer exists.
        .map((q)=>({
                ...q,
                showWhen: q.showWhen.filter((c)=>c.question !== id)
            })),
        qualificationRules: config.qualificationRules.filter((c)=>c.question !== id)
    };
}
function duplicateQuestion(config, id) {
    const index = config.questions.findIndex((q)=>q.id === id);
    if (index < 0) return config;
    const used = new Set(config.questions.map((q)=>q.id));
    const copy = {
        ...config.questions[index],
        id: uniqueId(`${id}_copy`, used),
        showWhen: [
            ...config.questions[index].showWhen
        ]
    };
    const questions = [
        ...config.questions
    ];
    questions.splice(index + 1, 0, copy);
    return {
        ...config,
        questions
    };
}
function moveQuestion(config, id, direction) {
    const index = config.questions.findIndex((q)=>q.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= config.questions.length) return config;
    const questions = [
        ...config.questions
    ];
    [questions[index], questions[target]] = [
        questions[target],
        questions[index]
    ];
    // A branch that used to be valid (pointed at an earlier question) may no
    // longer be; drop conditions that would now reference a LATER question.
    const order = new Map(questions.map((q, i)=>[
            q.id,
            i
        ]));
    return {
        ...config,
        questions: questions.map((q, i)=>({
                ...q,
                showWhen: q.showWhen.filter((c)=>(order.get(c.question) ?? -1) < i)
            }))
    };
}
function updateQuestion(config, id, patch) {
    return {
        ...config,
        questions: config.questions.map((q)=>q.id === id ? {
                ...q,
                ...patch
            } : q)
    };
}
function addOption(question) {
    const used = new Set(question.options.map((o)=>o.value));
    return {
        ...question,
        options: [
            ...question.options,
            {
                value: uniqueId(`option_${question.options.length + 1}`, used, OPTION_PATTERN),
                label: 'New option'
            }
        ]
    };
}
function removeOption(question, value) {
    return {
        ...question,
        options: question.options.filter((o)=>o.value !== value)
    };
}
function moveOption(question, value, direction) {
    const index = question.options.findIndex((o)=>o.value === value);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= question.options.length) return question;
    const options = [
        ...question.options
    ];
    [options[index], options[target]] = [
        options[target],
        options[index]
    ];
    return {
        ...question,
        options
    };
}
const STEP_TYPE_PRESETS = [
    {
        value: 'choice',
        label: 'Multiple Choice'
    },
    {
        value: 'short_text',
        label: 'Short Text'
    },
    {
        value: 'long_text',
        label: 'Long Text'
    },
    {
        value: 'address',
        label: 'Address'
    },
    {
        value: 'number',
        label: 'Number'
    },
    {
        value: 'email',
        label: 'Email'
    },
    {
        value: 'phone',
        label: 'Phone'
    },
    {
        value: 'zip',
        label: 'ZIP code (exactly one per funnel)'
    }
];
function changeQuestionType(question, type) {
    if (type === question.type) return question;
    const next = {
        ...question,
        type
    };
    if (type === 'choice' && !next.options.length) next.options = [
        {
            value: 'option_1',
            label: 'Option 1'
        },
        {
            value: 'option_2',
            label: 'Option 2'
        }
    ];
    // A placeholder written for one input kind is wrong for another.
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isTextQuestion"])(next) || next.type !== question.type) next.placeholder = undefined;
    return next;
}
function previewAdvance(config, state, body) {
    let answers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeAnswers"])(config, state.answers);
    let nextStep = state.step;
    if ('answer' in body && body.answer) {
        const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(config, answers).find((item)=>item.id === body.answer.question);
        if (!q || q.id !== state.step) return {
            error: 'That is not the current question.'
        };
        const checked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateAnswer"])(q, body.answer.value);
        if (!checked.ok) return {
            error: checked.error
        };
        answers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeAnswers"])(config, {
            ...answers,
            [q.id]: checked.value
        });
        const visible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(config, answers);
        nextStep = visible[visible.findIndex((item)=>item.id === q.id) + 1]?.id ?? 'qualification';
    } else if ('step' in body) {
        const visible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(config, answers);
        const firstMissing = visible.findIndex((q)=>!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAnswered"])(answers, q.id));
        const index = visible.findIndex((q)=>q.id === body.step);
        const qualified = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["qualify"])(config, answers);
        if (index >= 0 && (firstMissing < 0 || index <= firstMissing)) nextStep = body.step;
        else if (body.step === 'contact' && qualified !== null && !(qualified === false && config.unqualifiedAction === 'stop')) nextStep = 'contact';
        else return {
            error: 'Complete the earlier questions first.'
        };
    }
    return {
        answers,
        step: nextStep,
        qualified: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["qualify"])(config, answers)
    };
}
const SAMPLE_ANSWER = {
    zip: '90001',
    email: 'name@example.com',
    phone: '3105550123',
    number: '5',
    address: '123 Main St, Los Angeles, CA 90001'
};
function previewAnswersForStep(config, stepId) {
    const found = config.questions.findIndex((q)=>q.id === stepId);
    const upTo = found < 0 ? config.questions.length : found;
    // Conditions that must hold, gathered through the chain of questions the target depends on.
    const needed = new Map();
    const collect = (q)=>{
        for (const c of q.showWhen){
            needed.set(c.question, [
                ...needed.get(c.question) ?? [],
                c
            ]);
            const dependency = config.questions.find((x)=>x.id === c.question);
            if (dependency && !needed.has(`seen:${dependency.id}`)) {
                needed.set(`seen:${dependency.id}`, []);
                collect(dependency);
            }
        }
    };
    if (found >= 0) collect(config.questions[found]);
    let answers = {};
    for (const q of config.questions.slice(0, upTo)){
        if (!q.showWhen.every((c)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matches"])(c, answers))) continue;
        const conditions = needed.get(q.id) ?? [];
        const candidates = q.type === 'choice' ? q.options.map((o)=>o.value) : [
            ...conditions.flatMap((c)=>c.values),
            SAMPLE_ANSWER[q.type] ?? 'Sample answer'
        ];
        const fits = (v)=>conditions.every((c)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matches"])(c, {
                    [q.id]: v
                }));
        const value = candidates.find(fits) ?? candidates[0];
        if (value !== undefined) answers = {
            ...answers,
            [q.id]: value
        };
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeAnswers"])(config, answers);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/meta/niche.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Niche tagging for Meta events, so ONE Pixel can still be sliced by niche.
 *
 * Every website event we send (browser Pixel and server Conversions API) carries the same custom parameters:
 *   content_category  the niche's readable name, e.g. "Bathroom Remodeling" (a standard Meta parameter)
 *   niche             a stable key, e.g. "bathroom"
 *   content_name      the funnel slug, e.g. "bathroom-remodel"
 * In Events Manager use them to build custom conversions ("Lead where niche = bathroom"), custom audiences, and the
 * breakdown views. The niche is worked out from the funnel's industry text and slug, so a new funnel is tagged
 * automatically. Pure: no I/O.
 *
 * Not applied to the Conversions API for CRM events (instant-form and CRM stage events): Meta defines their
 * custom_data fields, so we do not add anything there.
 */ __turbopack_context__.s([
    "NICHES",
    ()=>NICHES,
    "nicheCustomData",
    ()=>nicheCustomData,
    "nicheDataFor",
    ()=>nicheDataFor,
    "nicheOf",
    ()=>nicheOf
]);
const NICHES = {
    bathroom: {
        key: 'bathroom',
        label: 'Bathroom Remodeling'
    },
    kitchen: {
        key: 'kitchen',
        label: 'Kitchen Remodeling'
    },
    kitchen_bath: {
        key: 'kitchen_bath',
        label: 'Kitchen and Bath Remodeling'
    },
    adu: {
        key: 'adu',
        label: 'ADU'
    },
    pool: {
        key: 'pool',
        label: 'Pool'
    },
    roofing: {
        key: 'roofing',
        label: 'Roofing'
    },
    hvac: {
        key: 'hvac',
        label: 'HVAC'
    },
    fencing: {
        key: 'fencing',
        label: 'Fencing'
    },
    remodeling: {
        key: 'remodeling',
        label: 'Remodeling and General Contracting'
    },
    other: {
        key: 'other',
        label: 'Other'
    }
};
function nicheOf(industry, slug) {
    const text = `${industry ?? ''} ${slug ?? ''}`.toLowerCase();
    if (/\badu\b|accessory dwelling|garage conversion/.test(text)) return NICHES.adu;
    const bath = /bath/.test(text);
    const kitchen = /kitchen/.test(text);
    if (bath && kitchen) return NICHES.kitchen_bath;
    if (bath) return NICHES.bathroom;
    if (kitchen) return NICHES.kitchen;
    if (/\bpool|\bspa\b/.test(text)) return NICHES.pool;
    if (/roof/.test(text)) return NICHES.roofing;
    if (/hvac|heating|air.?condition|furnace/.test(text)) return NICHES.hvac;
    if (/fenc|gate/.test(text)) return NICHES.fencing;
    if (/remodel|general contract|construction|home improvement|renovat|addition/.test(text)) return NICHES.remodeling;
    return NICHES.other;
}
function nicheCustomData(niche, slug) {
    const name = (slug ?? '').trim();
    return {
        content_category: niche.label,
        niche: niche.key,
        ...name ? {
            content_name: name
        } : {}
    };
}
const nicheDataFor = (industry, slug)=>nicheCustomData(nicheOf(industry, slug), slug);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/funnels/tracking.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "trackFunnel",
    ()=>trackFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$niche$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/meta/niche.ts [app-client] (ecmascript)");
'use client';
;
const emitted = new Set();
function trackFunnel(sessionId, slug, event, pixelId, industry) {
    const eventId = `${sessionId}:${event}`;
    try {
        if (localStorage.getItem(`hqn-event:${eventId}`)) return;
    } catch  {}
    if (emitted.has(eventId)) return;
    if (pixelId) {
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
        }
        window.fbq('trackSingle', pixelId, event, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$niche$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nicheDataFor"])(industry, slug), {
            eventID: eventId
        });
    }
    window.dispatchEvent(new CustomEvent('hqn:funnel', {
        detail: {
            event,
            eventId,
            funnel: slug,
            niche: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$niche$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nicheDataFor"])(industry, slug).niche
        }
    }));
    emitted.add(eventId);
    try {
        localStorage.setItem(`hqn-event:${eventId}`, '1');
    } catch  {}
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/funnels/vcard.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildContactVCard",
    ()=>buildContactVCard,
    "vcardFileName",
    ()=>vcardFileName,
    "vcardPhone",
    ()=>vcardPhone
]);
const esc = (v)=>v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
function vcardPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(national) ? `+1${national}` : null;
}
function buildContactVCard(config) {
    const card = config.contactCard;
    const tel = card?.phone ? vcardPhone(card.phone) : null;
    if (!card || !tel) return null;
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${esc(config.clientName)}`,
        `N:${esc(config.clientName)};;;;`,
        `ORG:${esc(config.clientName)}`,
        `TEL;TYPE=WORK,VOICE:${tel}`
    ];
    if (card.email) lines.push(`EMAIL;TYPE=WORK:${esc(card.email)}`);
    if (card.website) lines.push(`URL:${card.website}`);
    if (config.industry) lines.push(`NOTE:${esc(`${config.industry} – expect a call about your estimate request.`)}`);
    lines.push('END:VCARD');
    return lines.join('\r\n') + '\r\n';
}
const vcardFileName = (clientName)=>`${clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'contact'}.vcf`;
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
"[project]/components/funnels/funnel-experience.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelExperience",
    ()=>FunnelExperience
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-list.js [app-client] (ecmascript) <export default as ClipboardList>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2d$keyhole$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LockKeyhole$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock-keyhole.js [app-client] (ecmascript) <export default as LockKeyhole>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/schema.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/builder.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$tracking$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/tracking.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$vcard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/funnels/vcard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/booking-flow.tsx [app-client] (ecmascript)");
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
const STATE_NAMES = {
    CA: 'California'
};
/** Downloads (iOS/Android open it straight into Contacts) the business's vCard. */ function saveToContacts(config) {
    const vcard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$vcard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildContactVCard"])(config);
    if (!vcard) return;
    const url = URL.createObjectURL(new Blob([
        vcard
    ], {
        type: 'text/vcard;charset=utf-8'
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$vcard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["vcardFileName"])(config.clientName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function FunnelExperience({ slug, initialConfig, demo, previewMode, jumpToStep }) {
    _s();
    const [config, setConfig] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialConfig);
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [wideLogo, setWideLogo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [zip, setZip] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [checking, setChecking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [tracking, setTracking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const initialized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const heading = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const endpoint = `/api/funnels/${slug}/session`;
    // Live edits (headline/options/branding text) show immediately; the visitor's
    // place in the funnel is untouched so typing never jumps the preview back to step 1.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (previewMode) setConfig(initialConfig);
        }
    }["FunnelExperience.useEffect"], [
        previewMode,
        initialConfig
    ]);
    const start = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "FunnelExperience.useCallback[start]": async ()=>{
            if (previewMode) {
                setSession({
                    id: 'preview',
                    answers: {},
                    current_step: config.questions[0].id,
                    version: 0,
                    qualified: null,
                    contact_submitted_at: null,
                    booked_at: null,
                    attribution: {},
                    service_area_valid: null
                });
                return;
            }
            setError('');
            setBusy(true);
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: location.href,
                        referrer: document.referrer,
                        device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop'
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setConfig(data.config);
                setSession(data.session);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Please try again.');
            } finally{
                setBusy(false);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["FunnelExperience.useCallback[start]"], [
        endpoint,
        previewMode
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (!initialized.current) {
                initialized.current = true;
                void start();
            }
        }
    }["FunnelExperience.useEffect"], [
        start
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (!previewMode || !jumpToStep || !session) return;
            // Preview the happy path: qualified from 'qualification' on; a real visitor
            // only ever reaches 'calendar'/'thanks' after contact_submitted_at is set.
            const qualifiedFrom = [
                'qualification',
                'contact',
                'calendar',
                'thanks'
            ].includes(jumpToStep);
            const submitted = [
                'calendar',
                'thanks'
            ].includes(jumpToStep);
            setSession({
                "FunnelExperience.useEffect": (s)=>s && {
                        ...s,
                        current_step: jumpToStep,
                        answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["previewAnswersForStep"])(config, jumpToStep),
                        qualified: qualifiedFrom ? true : s.qualified,
                        booked_at: null,
                        contact_submitted_at: submitted ? new Date().toISOString() : null
                    }
            }["FunnelExperience.useEffect"]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["FunnelExperience.useEffect"], [
        previewMode,
        jumpToStep
    ]);
    const save = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "FunnelExperience.useCallback[save]": async (body)=>{
            if (!session || busy) return;
            if (previewMode) {
                setError('');
                if ('contact' in body) {
                    const nextStep = session.qualified && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasCalendarStep"])(config) ? 'calendar' : 'thanks';
                    setSession({
                        ...session,
                        contact_submitted_at: new Date().toISOString(),
                        current_step: nextStep
                    });
                    return;
                }
                if ('simulateBooking' in body) {
                    setSession({
                        ...session,
                        booked_at: new Date().toISOString()
                    });
                    return;
                }
                if ('calendarViewed' in body || 'calendlyBooking' in body) return;
                const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$builder$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["previewAdvance"])(config, {
                    answers: session.answers,
                    step: session.current_step,
                    qualified: session.qualified
                }, body);
                if ('error' in result) {
                    setError(result.error);
                    return;
                }
                setSession({
                    ...session,
                    answers: result.answers,
                    current_step: result.step,
                    qualified: result.qualified,
                    version: session.version + 1
                });
                return;
            }
            setBusy(true);
            setError('');
            try {
                const res = await fetch(endpoint, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...body,
                        ...'contact' in body || 'calendlyBooking' in body ? {
                            measurement: tracking
                        } : {},
                        version: session.version
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setSession(data.session);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Please try again.');
            } finally{
                setBusy(false);
            }
        }
    }["FunnelExperience.useCallback[save]"], [
        session,
        busy,
        endpoint,
        previewMode,
        config,
        tracking
    ]);
    const savedStep = session?.current_step ?? config.questions[0].id;
    // Never render a step that names a hidden or missing question (that would be a blank screen).
    const step = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStep"])(config, session?.answers ?? {}, savedStep);
    const questions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleQuestions"])(config, session?.answers ?? {});
    const index = questions.findIndex((q)=>q.id === step);
    const question = questions[index];
    const calendarStep = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasCalendarStep"])(config);
    // HomeQuote's own calendar: the booking flow renders in the page (no embed, no polling).
    const native = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usesNativeCalendar"])(config);
    const total = questions.length + 2 + (calendarStep ? 1 : 0);
    const current = index >= 0 ? index + 1 : step === 'qualification' ? questions.length + 1 : step === 'contact' ? questions.length + 2 : total;
    // Repair a saved step that no longer matches a visible question, so the next click works too.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (session && !busy && savedStep !== step && !jumpToStep) void save({
                step
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["FunnelExperience.useEffect"], [
        session?.current_step,
        step
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            setZip(session?.answers[step] ?? '');
            heading.current?.focus({
                preventScroll: true
            });
            if (step === 'qualification') {
                setChecking(true);
                const timer = setTimeout({
                    "FunnelExperience.useEffect.timer": ()=>setChecking(false)
                }["FunnelExperience.useEffect.timer"], 700);
                return ({
                    "FunnelExperience.useEffect": ()=>clearTimeout(timer)
                })["FunnelExperience.useEffect"];
            }
        // Focus only when the screen changes; never disrupt typing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["FunnelExperience.useEffect"], [
        step
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (!session?.id) return;
            const optOut = config.trackingPixels.consentMode === 'opt_out';
            try {
                const saved = localStorage.getItem(`hqn-measurement:${session.id}`);
                setTracking(saved === 'yes' || optOut && saved !== 'no');
            } catch  {
                setTracking(optOut); /* Storage blocked: fall back to the funnel's default. */ 
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["FunnelExperience.useEffect"], [
        session?.id
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (!session || !tracking || demo || previewMode) return;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$tracking$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackFunnel"])(session.id, slug, 'PageView', config.trackingPixels.metaPixelId, config.industry);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$tracking$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackFunnel"])(session.id, slug, 'ViewContent', config.trackingPixels.metaPixelId, config.industry);
            // Never a Meta "Lead" for a submission that failed this funnel's (optional) hard
            // service-area gate — null/undefined means the gate doesn't apply to this funnel.
            if (session.contact_submitted_at && session.service_area_valid !== false) (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$tracking$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackFunnel"])(session.id, slug, 'Lead', config.trackingPixels.metaPixelId, config.industry);
            if (session.booked_at) (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$tracking$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackFunnel"])(session.id, slug, 'Schedule', config.trackingPixels.metaPixelId, config.industry);
        }
    }["FunnelExperience.useEffect"], [
        session,
        tracking,
        config,
        slug,
        demo,
        previewMode
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (previewMode || !session?.contact_submitted_at || !calendarStep || step !== 'calendar') return;
            void fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    version: session.version,
                    calendarViewed: true
                })
            });
            // The external calendars confirm a booking on their own side; the native flow reports it (onBooked).
            if (native) return;
            const timer = setInterval({
                "FunnelExperience.useEffect.timer": async ()=>{
                    try {
                        const res = await fetch(endpoint);
                        if (res.ok) {
                            const data = await res.json();
                            setSession(data.session);
                        }
                    } catch  {}
                }
            }["FunnelExperience.useEffect.timer"], 10000);
            return ({
                "FunnelExperience.useEffect": ()=>clearInterval(timer)
            })["FunnelExperience.useEffect"];
        }
    }["FunnelExperience.useEffect"], [
        previewMode,
        session?.contact_submitted_at,
        session?.version,
        calendarStep,
        native,
        step,
        endpoint
    ]);
    // Calendly reports a completed booking to the embedding page via postMessage.
    // Only messages from calendly.com are accepted; the server re-checks the session.
    // Preview never loads real calendly.com, so there is nothing to listen for.
    const calendly = config.calendarProvider === 'calendly';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FunnelExperience.useEffect": ()=>{
            if (previewMode || !calendly || step !== 'calendar' || !session?.contact_submitted_at || session.booked_at) return;
            function onMessage(event) {
                if (event.origin !== 'https://calendly.com' || event.data?.event !== 'calendly.event_scheduled') return;
                const eventUri = event.data.payload?.event?.uri;
                const inviteeUri = event.data.payload?.invitee?.uri;
                if (typeof eventUri === 'string' && typeof inviteeUri === 'string') void save({
                    calendlyBooking: {
                        eventUri,
                        inviteeUri
                    }
                });
            }
            addEventListener('message', onMessage);
            return ({
                "FunnelExperience.useEffect": ()=>removeEventListener('message', onMessage)
            })["FunnelExperience.useEffect"];
        }
    }["FunnelExperience.useEffect"], [
        previewMode,
        calendly,
        step,
        session?.contact_submitted_at,
        session?.booked_at,
        save
    ]);
    // Keep the first prefill so later polls never change the iframe src (which would reload it).
    const prefill = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    if (session?.prefill && !prefill.current) prefill.current = session.prefill;
    const calendlySrc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "FunnelExperience.useMemo[calendlySrc]": ()=>calendly && config.calendarUrl && session && step === 'calendar' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calendlyEmbedUrl"])(config.calendarUrl, location.hostname, prefill.current, session.attribution) : null
    }["FunnelExperience.useMemo[calendlySrc]"], // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        calendly,
        config.calendarUrl,
        session?.id,
        step
    ]);
    function back() {
        const previous = index > 0 ? questions[index - 1].id : step === 'contact' || step === 'qualification' ? questions.at(-1).id : null;
        if (previous) void save({
            step: previous
        });
    }
    function submitContact(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const contact = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["contactSchema"].safeParse({
            firstName: form.get('firstName'),
            lastName: form.get('lastName'),
            phone: form.get('phone'),
            email: form.get('email'),
            consent: form.get('consent') === 'on',
            website: form.get('website')
        });
        if (!contact.success) {
            setError(contact.error.issues[0].message);
            return;
        }
        // Read Meta's own cookies at submit time (set by fbevents.js once the visitor opted in);
        // used server-side only, to match the browser Lead event for Conversions API dedup.
        const cookie = (name)=>document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
        const meta = tracking ? {
            fbp: cookie('_fbp'),
            fbc: cookie('_fbc')
        } : undefined;
        void save({
            contact: contact.data,
            ...meta && (meta.fbp || meta.fbc) ? {
                meta
            } : {}
        });
    }
    // A call booked on the HomeQuote calendar stays on the calendar step, which shows it (time, add to calendar, change link).
    const nativeBooked = native && step === 'calendar' && !!session?.booked_at;
    const done = !!session?.booked_at && !nativeBooked || step === 'thanks';
    // Purely a copy decision (which reviewMessage to show); the real enforcement is
    // server-side in qualify()/serviceAreaValid() — see lib/funnels/schema.ts.
    const zipQuestionId = config.questions.find((q)=>q.type === 'zip')?.id;
    // Defensive: a config snapshot from an older cached response may predate this field.
    const strictStates = config.serviceArea.strictStates ?? [];
    const outOfServiceArea = !!strictStates.length && !!zipQuestionId && !!session?.answers[zipQuestionId] && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["serviceAreaValid"])(config, session.answers[zipQuestionId]);
    const title = done ? session?.booked_at ? 'You’re on the calendar.' : config.thankYouPage.headline : nativeBooked ? 'You’re on the calendar.' : step === 'calendar' ? config.calendarHeadline ?? (native ? 'Book your free call' : 'Choose a time for your free estimate') : step === 'qualification' ? checking ? 'Checking availability in your area…' : session?.qualified ? config.qualifiedMessage : outOfServiceArea ? 'Outside our current service area' : config.reviewMessage : step === 'contact' ? 'Who should we reach out to?' : question?.headline;
    const calendarUrl = config.calendarUrl ? new URL(config.calendarUrl) : null;
    if (calendarUrl && session && !calendly) calendarUrl.searchParams.set('hqn_session_id', session.id);
    const vcard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$vcard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildContactVCard"])(config);
    // Funnels still carrying the pre-rebrand default colours render in the HomeQuote brand blue/navy; custom colours are respected.
    const primaryColor = config.primaryColor.toLowerCase() === '#196dcc' ? '#0038B8' : config.primaryColor;
    const secondaryColor = config.secondaryColor.toLowerCase() === '#042247' ? '#0A1B3D' : config.secondaryColor;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "hqn-funnel",
        style: {
            '--funnel-primary': primaryColor,
            '--funnel-secondary': secondaryColor
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "funnel-shell",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: "funnel-header",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-brand",
                            children: [
                                config.clientLogo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: config.clientLogo,
                                    alt: "",
                                    width: 44,
                                    height: 44,
                                    unoptimized: true,
                                    className: wideLogo ? 'funnel-logo-wide' : undefined,
                                    onLoad: (e)=>setWideLogo(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight * 1.3)
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 220,
                                    columnNumber: 61
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        config.clientName,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                            children: "YOUR NEXT HOME PROJECT"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 220,
                                            columnNumber: 310
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 220,
                                    columnNumber: 285
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 220,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "funnel-secure",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2d$keyhole$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LockKeyhole$3e$__["LockKeyhole"], {
                                    size: 14
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 221,
                                    columnNumber: 41
                                }, this),
                                " Private & secure"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 221,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 219,
                    columnNumber: 7
                }, this),
                demo && !previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "funnel-demo",
                    children: "Interactive demo · No contractor is contacted and no appointment is booked."
                }, void 0, false, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 223,
                    columnNumber: 32
                }, this),
                previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "funnel-demo",
                    children: "Live preview · Nothing here is saved."
                }, void 0, false, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 224,
                    columnNumber: 23
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "funnel-progress-copy",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: config.industry
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 225,
                            columnNumber: 45
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: done || nativeBooked ? 'Complete' : `${current} of ${total}`
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 225,
                            columnNumber: 75
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 225,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "funnel-progress",
                    role: "progressbar",
                    "aria-label": "Your progress",
                    "aria-valuemin": 0,
                    "aria-valuemax": total,
                    "aria-valuenow": done || nativeBooked ? total : current,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            width: `${(done || nativeBooked ? 1 : current / total) * 100}%`
                        }
                    }, void 0, false, {
                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                        lineNumber: 226,
                        columnNumber: 181
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 226,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "funnel-toolbar",
                    children: [
                        session && !session.contact_submitted_at && (index > 0 || [
                            'qualification',
                            'contact'
                        ].includes(step)) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: back,
                            disabled: busy,
                            className: "funnel-back",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                    size: 17
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 228,
                                    columnNumber: 74
                                }, this),
                                " Back"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 228,
                            columnNumber: 11
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 228,
                            columnNumber: 114
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "About a minute. Built around you."
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 229,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 227,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "funnel-screen",
                    "aria-busy": busy,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-eyebrow",
                            children: [
                                done || nativeBooked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                    size: 19
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 231,
                                    columnNumber: 65
                                }, this) : step === 'qualification' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                    size: 19
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 231,
                                    columnNumber: 121
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__["ClipboardList"], {
                                    size: 19
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 231,
                                    columnNumber: 146
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: done || nativeBooked ? 'THANK YOU' : 'A LITTLE ABOUT YOUR PROJECT'
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 231,
                                    columnNumber: 174
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 231,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            ref: heading,
                            tabIndex: -1,
                            children: title
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 232,
                            columnNumber: 9
                        }, this),
                        question?.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "funnel-description",
                            children: question.description
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 233,
                            columnNumber: 35
                        }, this),
                        !session && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "funnel-description",
                            role: "status",
                            children: busy ? 'Getting things ready…' : 'Let’s get started.'
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 234,
                            columnNumber: 22
                        }, this),
                        question?.type === 'choice' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-answers",
                            children: question.options.map((option, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: option.featured ? 'funnel-answer funnel-answer-featured' : 'funnel-answer',
                                    disabled: !session || busy,
                                    "aria-pressed": session?.answers[question.id] === option.value,
                                    onClick: ()=>void save({
                                            answer: {
                                                question: question.id,
                                                value: option.value
                                            }
                                        }),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "funnel-answer-number",
                                            children: session?.answers[question.id] === option.value ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                size: 17
                                            }, void 0, false, {
                                                fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                lineNumber: 237,
                                                columnNumber: 100
                                            }, this) : String(i + 1).padStart(2, '0')
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 237,
                                            columnNumber: 11
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                option.label,
                                                option.detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                    children: option.detail
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 238,
                                                    columnNumber: 49
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 238,
                                            columnNumber: 11
                                        }, this),
                                        option.featured && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "funnel-featured-tag",
                                            children: "Popular"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 238,
                                            columnNumber: 107
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            size: 18,
                                            className: "funnel-arrow"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 238,
                                            columnNumber: 160
                                        }, this)
                                    ]
                                }, option.value, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 235,
                                    columnNumber: 110
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 235,
                            columnNumber: 41
                        }, this),
                        question?.type === 'zip' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            className: "funnel-form",
                            onSubmit: (e)=>{
                                e.preventDefault();
                                void save({
                                    answer: {
                                        question: question.id,
                                        value: zip
                                    }
                                });
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                    htmlFor: "project-zip",
                                    children: "Project ZIP code"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 241,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-zip",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                            size: 21
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 241,
                                            columnNumber: 92
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            id: "project-zip",
                                            name: "zip",
                                            autoComplete: "postal-code",
                                            inputMode: "numeric",
                                            pattern: "[0-9]{5}",
                                            maxLength: 5,
                                            required: true,
                                            value: zip,
                                            onChange: (e)=>{
                                                setZip(e.target.value.replace(/\D/g, ''));
                                                setError('');
                                            },
                                            placeholder: "e.g. 91301"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 241,
                                            columnNumber: 112
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 241,
                                    columnNumber: 64
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "funnel-primary",
                                    type: "submit",
                                    disabled: busy || !session,
                                    children: [
                                        "Check my project ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 242,
                                            columnNumber: 105
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 242,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 240,
                            columnNumber: 38
                        }, this),
                        question && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isTextQuestion"])(question) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            className: "funnel-form",
                            noValidate: true,
                            onSubmit: (e)=>{
                                e.preventDefault();
                                const checked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateAnswer"])(question, zip);
                                if (!checked.ok) {
                                    setError(checked.error);
                                    return;
                                }
                                void save({
                                    answer: {
                                        question: question.id,
                                        value: checked.value
                                    }
                                });
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                    htmlFor: "funnel-answer",
                                    className: "sr-only",
                                    children: [
                                        question.headline,
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isRequired"])(question) ? '' : ' (optional)'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 250,
                                    columnNumber: 11
                                }, this),
                                question.type === 'long_text' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
                                    id: "funnel-answer",
                                    name: "answer",
                                    rows: 5,
                                    maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MAX_ANSWER_LENGTH"],
                                    value: zip,
                                    placeholder: question.placeholder ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_PLACEHOLDERS"].long_text,
                                    "aria-invalid": !!error,
                                    onChange: (e)=>{
                                        setZip(e.target.value);
                                        setError('');
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 252,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                    id: "funnel-answer",
                                    name: question.type === 'address' ? 'address' : 'answer',
                                    "aria-invalid": !!error,
                                    value: zip,
                                    onChange: (e)=>{
                                        setZip(e.target.value);
                                        setError('');
                                    },
                                    placeholder: question.placeholder ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_PLACEHOLDERS"][question.type],
                                    type: question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text',
                                    inputMode: question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : question.type === 'number' ? 'decimal' : undefined,
                                    autoComplete: question.type === 'address' ? 'street-address' : question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'off',
                                    autoCapitalize: question.type === 'email' ? 'none' : question.type === 'address' ? 'words' : undefined,
                                    enterKeyHint: "next",
                                    maxLength: question.type === 'address' ? 300 : question.type === 'email' ? 254 : 200
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 253,
                                    columnNumber: 15
                                }, this),
                                !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isRequired"])(question) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-optional",
                                    children: "Optional — leave blank to skip."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 260,
                                    columnNumber: 37
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "funnel-primary",
                                    type: "submit",
                                    disabled: busy || !session,
                                    children: [
                                        "Continue ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 261,
                                            columnNumber: 97
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 261,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 244,
                            columnNumber: 50
                        }, this),
                        step === 'qualification' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-result",
                            children: checking ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "funnel-checking",
                                role: "status",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 264,
                                        columnNumber: 70
                                    }, this),
                                    " Reviewing your answers and ",
                                    config.serviceArea.label
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/funnels/funnel-experience.tsx",
                                lineNumber: 264,
                                columnNumber: 23
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: session?.qualified ? 'Share your details so we can help you take the next step. Availability will be confirmed by the team.' : outOfServiceArea ? `It looks like this project is outside our current service area. We’re currently serving projects in ${strictStates.map((s)=>STATE_NAMES[s] ?? s).join(', ')}.` : 'Your project needs a personal review before we can confirm a fit.'
                                    }, void 0, false, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 265,
                                        columnNumber: 13
                                    }, this),
                                    (session?.qualified || config.unqualifiedAction === 'review') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        className: "funnel-primary",
                                        disabled: busy,
                                        onClick: ()=>void save({
                                                step: 'contact'
                                            }),
                                        children: [
                                            "Continue ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                size: 18
                                            }, void 0, false, {
                                                fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                lineNumber: 268,
                                                columnNumber: 186
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 268,
                                        columnNumber: 79
                                    }, this),
                                    !session?.qualified && config.unqualifiedAction === 'stop' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "We’re unable to offer an estimate for these details right now. You can go back to correct an answer."
                                    }, void 0, false, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 269,
                                        columnNumber: 76
                                    }, this)
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 263,
                            columnNumber: 38
                        }, this),
                        step === 'contact' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            className: "funnel-form",
                            onSubmit: submitContact,
                            onChange: ()=>setError(''),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: "Your project, your pace. Let’s talk about what’s possible."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 273,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-name-row",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                    htmlFor: "firstName",
                                                    children: "First name"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 274,
                                                    columnNumber: 49
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    id: "firstName",
                                                    name: "firstName",
                                                    autoComplete: "given-name",
                                                    maxLength: 80,
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 274,
                                                    columnNumber: 94
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 274,
                                            columnNumber: 44
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                    htmlFor: "lastName",
                                                    children: "Last name"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 275,
                                                    columnNumber: 16
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    id: "lastName",
                                                    name: "lastName",
                                                    autoComplete: "family-name",
                                                    maxLength: 80,
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 275,
                                                    columnNumber: 59
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 275,
                                            columnNumber: 11
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 274,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            htmlFor: "phone",
                                            children: "Phone number"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 276,
                                            columnNumber: 16
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            id: "phone",
                                            name: "phone",
                                            type: "tel",
                                            autoComplete: "tel",
                                            placeholder: "(555) 123-4567",
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 276,
                                            columnNumber: 59
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 276,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            htmlFor: "email",
                                            children: "Email address"
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 277,
                                            columnNumber: 16
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            id: "email",
                                            name: "email",
                                            type: "email",
                                            autoComplete: "email",
                                            maxLength: 254,
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 277,
                                            columnNumber: 60
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 277,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-honeypot",
                                    "aria-hidden": "true",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        children: [
                                            "Website",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                name: "website",
                                                tabIndex: -1,
                                                autoComplete: "off"
                                            }, void 0, false, {
                                                fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                lineNumber: 278,
                                                columnNumber: 77
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 278,
                                        columnNumber: 63
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 278,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "funnel-consent",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            name: "consent",
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 279,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$funnels$2f$schema$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["consentText"])(config),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "/privacy",
                                                    target: "_blank",
                                                    rel: "noreferrer",
                                                    children: "Privacy policy"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 122
                                                }, this),
                                                " · ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "/terms",
                                                    target: "_blank",
                                                    rel: "noreferrer",
                                                    children: "Terms"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 195
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 279,
                                            columnNumber: 94
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 279,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "submit",
                                    className: "funnel-primary",
                                    disabled: busy,
                                    children: [
                                        busy ? 'Saving your request…' : demo ? 'Preview the next step' : session?.qualified && calendarStep ? native ? 'Pick a time for my call' : 'Choose my estimate time' : 'Request my free estimate',
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 280,
                                            columnNumber: 271
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 280,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 272,
                            columnNumber: 32
                        }, this),
                        step === 'calendar' && !done && native && previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-calendar",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: "Your request is saved. Pick a time for a free 30-minute call."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 283,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-preview-calendar",
                                    children: [
                                        "The HomeQuote calendar shows open times here for a real visitor",
                                        session?.booked_at ? ' (preview: booked)' : '',
                                        "."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 284,
                                    columnNumber: 11
                                }, this),
                                !session?.booked_at && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "funnel-primary",
                                    onClick: ()=>void save({
                                            simulateBooking: true
                                        }),
                                    children: "Preview: simulate a booking"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 285,
                                    columnNumber: 35
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 282,
                            columnNumber: 67
                        }, this),
                        step === 'calendar' && !done && native && !previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-calendar funnel-calendar-native",
                            "data-funnel-native-calendar": "",
                            children: [
                                demo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: "In a published funnel, open times from the calendar show here. Nothing is booked in the demo."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 288,
                                    columnNumber: 19
                                }, this) : session?.bookingTicket ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$booking$2d$flow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingFlow"], {
                                    grant: session.bookingTicket,
                                    heading: null,
                                    headingLevel: 2,
                                    intro: session.booked_at ? null : 'Your request is saved. Pick a time for a free 30-minute call about your project.',
                                    onBooked: ()=>setSession((s)=>s && {
                                                ...s,
                                                booked_at: s.booked_at ?? new Date().toISOString()
                                            })
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 289,
                                    columnNumber: 40
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: "Your request is saved. Online booking isn’t available right now, so the team will call you to set up a time."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 292,
                                    columnNumber: 15
                                }, this),
                                nativeBooked && vcard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Save our number so you recognise us when we call."
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 293,
                                            columnNumber: 39
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            className: "funnel-primary",
                                            type: "button",
                                            onClick: ()=>saveToContacts(config),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 293,
                                                    columnNumber: 183
                                                }, this),
                                                " Save ",
                                                config.clientName,
                                                " to my contacts"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 293,
                                            columnNumber: 95
                                        }, this)
                                    ]
                                }, void 0, true)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 287,
                            columnNumber: 68
                        }, this),
                        step === 'calendar' && !done && !native && calendarUrl && previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-calendar",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: calendly ? 'Your request is saved. Pick the day and time that works for you.' : 'Pick the day and time that works for you.'
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 296,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-preview-calendar",
                                    children: [
                                        calendly ? 'Calendly' : 'GHL',
                                        " calendar embeds here for a real visitor.",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 297,
                                            columnNumber: 124
                                        }, this),
                                        calendarUrl.toString()
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 297,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "funnel-primary",
                                    onClick: ()=>void save({
                                            simulateBooking: true
                                        }),
                                    children: "Preview: simulate a booking"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 298,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Booking confirmation will appear here after the calendar confirms your appointment. If no times work, the team has your request and can follow up."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 299,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 295,
                            columnNumber: 83
                        }, this),
                        step === 'calendar' && !done && !native && calendarUrl && !previewMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-calendar",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "funnel-description",
                                    children: calendly ? 'Your request is saved. Pick the day and time that works for you.' : 'Pick the day and time that works for you.'
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 302,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                                    title: `Book an estimate with ${config.clientName}`,
                                    src: calendlySrc ?? calendarUrl.toString(),
                                    referrerPolicy: "strict-origin-when-cross-origin",
                                    allow: "payment"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 303,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Booking confirmation will appear here after the calendar confirms your appointment. If no times work, the team has your request and can follow up."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 304,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 301,
                            columnNumber: 84
                        }, this),
                        done && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-result",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "funnel-success",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                        size: 36
                                    }, void 0, false, {
                                        fileName: "[project]/components/funnels/funnel-experience.tsx",
                                        lineNumber: 306,
                                        columnNumber: 81
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 306,
                                    columnNumber: 49
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: demo ? 'You’ve completed the demo. In a published client funnel, these details reach HomeQuote and the connected CRM.' : session?.booked_at ? 'Your appointment has been confirmed. Please check your calendar confirmation for the details.' : config.thankYouPage.message
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 306,
                                    columnNumber: 113
                                }, this),
                                vcard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Save our number so you recognise us when we call about your estimate."
                                        }, void 0, false, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 307,
                                            columnNumber: 23
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            className: "funnel-primary",
                                            type: "button",
                                            onClick: ()=>saveToContacts(config),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                                    lineNumber: 307,
                                                    columnNumber: 187
                                                }, this),
                                                " Save ",
                                                config.clientName,
                                                " to my contacts"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                                            lineNumber: 307,
                                            columnNumber: 99
                                        }, this)
                                    ]
                                }, void 0, true)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 306,
                            columnNumber: 18
                        }, this),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "funnel-error",
                            role: "alert",
                            children: [
                                error,
                                !session && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>void start(),
                                    disabled: busy,
                                    children: "Try again"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 308,
                                    columnNumber: 82
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 308,
                            columnNumber: 19
                        }, this),
                        busy && session && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sr-only",
                            role: "status",
                            children: "Saving your progress"
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 309,
                            columnNumber: 29
                        }, this)
                    ]
                }, step, true, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 230,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                    className: "funnel-footer",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                    size: 16
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 311,
                                    columnNumber: 46
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Your details stay with the team helping with your project."
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 311,
                                    columnNumber: 71
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 311,
                            columnNumber: 41
                        }, this),
                        config.trust.license && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                "License: ",
                                config.trust.license
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 312,
                            columnNumber: 34
                        }, this),
                        config.trust.rating && config.trust.reviewCount && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                config.trust.rating,
                                "/5 Google rating · ",
                                config.trust.reviewCount,
                                " reviews"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 313,
                            columnNumber: 61
                        }, this),
                        config.trust.yearsInBusiness && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                config.trust.yearsInBusiness,
                                " years in business"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 314,
                            columnNumber: 42
                        }, this),
                        config.trust.financing && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: config.trust.financing
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 315,
                            columnNumber: 36
                        }, this),
                        config.trust.warranty && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: config.trust.warranty
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 315,
                            columnNumber: 94
                        }, this),
                        config.trust.testimonial && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("blockquote", {
                            children: config.trust.testimonial
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 316,
                            columnNumber: 38
                        }, this),
                        config.trust.projectPhoto && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            src: config.trust.projectPhoto,
                            alt: "Contractor project",
                            width: 480,
                            height: 280,
                            unoptimized: true,
                            className: "funnel-trust-photo"
                        }, void 0, false, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 317,
                            columnNumber: 39
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                "Powered by ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "HomeQuote Network"
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 318,
                                    columnNumber: 23
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 318,
                            columnNumber: 9
                        }, this),
                        config.trackingPixels.metaPixelId && !demo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "funnel-tracking",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "checkbox",
                                    checked: tracking,
                                    onChange: (e)=>{
                                        setTracking(e.target.checked);
                                        try {
                                            if (session) localStorage.setItem(`hqn-measurement:${session.id}`, e.target.checked ? 'yes' : 'no');
                                        } catch  {}
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                                    lineNumber: 319,
                                    columnNumber: 91
                                }, this),
                                " Allow optional advertising measurement"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/funnels/funnel-experience.tsx",
                            lineNumber: 319,
                            columnNumber: 56
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/funnels/funnel-experience.tsx",
                    lineNumber: 311,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/funnels/funnel-experience.tsx",
            lineNumber: 218,
            columnNumber: 5
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/funnels/funnel-experience.tsx",
        lineNumber: 217,
        columnNumber: 10
    }, this);
}
_s(FunnelExperience, "Z6wfkVORL8QAo1iMIq6sO7+OlqA=");
_c = FunnelExperience;
var _c;
__turbopack_context__.k.register(_c, "FunnelExperience");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_b01face9._.js.map