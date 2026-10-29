module.exports = [
"[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/app/icon.png.mjs { IMAGE => \"[project]/app/icon.png (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/icon.png.mjs { IMAGE => \"[project]/app/icon.png (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/app/apple-icon.png.mjs { IMAGE => \"[project]/app/apple-icon.png (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/apple-icon.png.mjs { IMAGE => \"[project]/app/apple-icon.png (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/app/opengraph-image--metadata.js [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/opengraph-image--metadata.js [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/app/not-found.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/not-found.tsx [app-rsc] (ecmascript)"));
}),
"[project]/app/(estimator)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/(estimator)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/components/estimator/scene/hero-images.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Hero assets, made once: a <PoolScene> of a Signature-look design rendered to
 * PNG, and the photoreal render of that same picture from the production
 * kie.ai model and prompt (lib/estimator/render.ts). 1200 x 800 WebP (the
 * builder frame's 3:2), no metadata. A plain module (not 'use client') so the
 * server page can use the paths for its share preview.
 */ __turbopack_context__.s([
    "BATH_EXAMPLE_IMAGES",
    ()=>BATH_EXAMPLE_IMAGES,
    "BATH_HERO_VIDEO",
    ()=>BATH_HERO_VIDEO,
    "HERO_IMAGES",
    ()=>HERO_IMAGES
]);
const HERO_IMAGES = {
    illustration: '/estimator/hero/pool-design-illustration.webp',
    photo: '/estimator/hero/pool-design-photo.webp'
};
const BATH_EXAMPLE_IMAGES = {
    illustration: '/estimator/hero/bath-example-design.webp',
    photo: '/estimator/hero/bath-example-photo.webp'
};
const BATH_HERO_VIDEO = {
    mp4: '/estimator/hero/bath-hero.mp4',
    webm: '/estimator/hero/bath-hero.webm',
    poster: '/estimator/hero/bath-hero.webp',
    alt: 'AI-rendered example of a remodeled bathroom with a glass walk-in shower, a floating oak vanity and a freestanding tub'
};
}),
"[project]/components/estimator/shell/estimator-hero.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EstimatorHero",
    ()=>EstimatorHero,
    "heroCopy",
    ()=>heroCopy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-rsc] (ecmascript) <export default as Check>");
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative mx-auto w-full max-w-7xl px-5 pt-3 sm:px-8 sm:pt-8 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:pt-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0 lg:max-w-[44rem]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-balance text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-[2.6rem]",
                        children: copy.headline
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/shell/estimator-hero.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
            facts.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                "aria-label": factsLabel,
                className: "mt-4 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--hq-text)] sm:flex lg:mt-0 lg:shrink-0 lg:flex-col lg:pb-1",
                children: facts.map((fact)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "inline-flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": "true",
                                className: "grid size-[18px] place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)]/15 text-[var(--es-aqua,#2ec5d3)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
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
}),
"[project]/components/estimator/builders/meta.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TRADE_META",
    ()=>TRADE_META,
    "resolveExampleMedia",
    ()=>resolveExampleMedia,
    "tradeMeta",
    ()=>tradeMeta
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/hero-images.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/estimator-hero.tsx [app-rsc] (ecmascript)");
;
;
const TRADE_META = {
    pool: {
        hero: {
            withRenders: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["heroCopy"])(true),
            withoutRenders: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["heroCopy"])(false)
        },
        exampleImages: {
            illustration: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HERO_IMAGES"].illustration,
            photo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HERO_IMAGES"].photo,
            designAlt: 'Example design made in this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit',
            photoAlt: 'The same example design as a realistic photo, made from the design picture'
        },
        exampleVideo: null,
        description: (noun, name)=>`Design your ${noun} with ${name}, watch it come to life and get a ballpark price range, then book a free on-site consultation. A ballpark, not a quote.`,
        shareImage: {
            url: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HERO_IMAGES"].illustration,
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
            illustration: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].illustration,
            photo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].photo,
            designAlt: 'Example design made in this builder: a large bathroom with a marble walk-in shower and bench, a freestanding tub, a floating green vanity and brushed gold fixtures',
            photoAlt: 'The same example design as an AI-rendered realistic photo, made from the design picture',
            // A network with no jobs of its own: the photo half always says it is AI-rendered.
            photoLabel: 'AI-rendered photo',
            caption: 'Example: a design made here, and the AI-rendered photo made from it. Not a real job.'
        },
        exampleVideo: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_HERO_VIDEO"],
        // A network, not a contractor: it connects them with a licensed local contractor.
        description: (noun)=>`Design your ${noun}, watch it come to life and get a ballpark price range, then get connected with a licensed local bathroom contractor for a free in-home consultation. A ballpark, not a quote.`,
        shareImage: {
            url: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_EXAMPLE_IMAGES"].illustration,
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
}),
"[project]/components/estimator/builders/example-files.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The example media files that ship in public/ (the design/photo pairs, the
 * bathroom clip and its poster). A fixed list, resolved when the module is
 * built, so the estimator pages decide what to show without touching the file
 * system: a page rendered in a serverless function (ISR, a preview) has no
 * public/ folder to look in, and would silently drop the examples.
 *
 * tests/estimator-example-files.test.ts checks that every path here is a real
 * file and that each trade's example pair is listed. Add a path when the file
 * is added; remove it when the file is removed.
 */ __turbopack_context__.s([
    "EXAMPLE_FILES",
    ()=>EXAMPLE_FILES,
    "exampleFileExists",
    ()=>exampleFileExists
]);
const EXAMPLE_FILES = new Set([
    '/estimator/hero/pool-design-illustration.webp',
    '/estimator/hero/pool-design-photo.webp',
    '/estimator/hero/bath-example-design.webp',
    '/estimator/hero/bath-example-photo.webp',
    '/estimator/hero/bath-hero.mp4',
    '/estimator/hero/bath-hero.webm',
    '/estimator/hero/bath-hero.webp'
]);
function exampleFileExists(path) {
    return EXAMPLE_FILES.has(path);
}
}),
"[project]/components/estimator/configurator/configurator.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Configurator",
    ()=>Configurator,
    "ConfiguratorHeader",
    ()=>ConfiguratorHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Configurator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Configurator() from the server but Configurator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/configurator/configurator.tsx <module evaluation>", "Configurator");
const ConfiguratorHeader = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ConfiguratorHeader() from the server but ConfiguratorHeader is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/configurator/configurator.tsx <module evaluation>", "ConfiguratorHeader");
}),
"[project]/components/estimator/configurator/configurator.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Configurator",
    ()=>Configurator,
    "ConfiguratorHeader",
    ()=>ConfiguratorHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Configurator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Configurator() from the server but Configurator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/configurator/configurator.tsx", "Configurator");
const ConfiguratorHeader = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ConfiguratorHeader() from the server but ConfiguratorHeader is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/configurator/configurator.tsx", "ConfiguratorHeader");
}),
"[project]/components/estimator/configurator/configurator.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$configurator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/estimator/configurator/configurator.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$configurator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/configurator.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$configurator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/lib/estimator/types.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/lib/estimator/geometry.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "poolGeometry",
    ()=>poolGeometry,
    "sizeClassFor",
    ()=>sizeClassFor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-rsc] (ecmascript)");
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
        return q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["picksFor"])(q, input.answers)[0] : undefined;
    };
    const shapeAnswer = answerFor('shape');
    const sizeAnswer = answerFor('size');
    const shape = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_SHAPES"].includes(shapeAnswer) ? shapeAnswer : 'unsure';
    const size = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_SIZES"].includes(sizeAnswer) ? sizeAnswer : 'unsure';
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
    const deckQ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["visibleQuestions"])(template, input.answers).find((q)=>q.role === 'deckSize');
    const deckAnswer = deckQ ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["picksFor"])(deckQ, input.answers)[0] : undefined;
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
}),
"[project]/lib/estimator/engine.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/geometry.ts [app-rsc] (ecmascript)");
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
    if (packageId === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]) {
        if (packageQ) next[packageQ.id] = [
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]
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
    const geometry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["poolGeometry"])(template, input);
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
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sizeClassFor"])(template, geometry)
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
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_SHAPES"].includes(o.id)) {
                problems.push(`Shape option "${o.id}" is not a valid pool shape.`);
            }
        }
    }
    const sizeQ = byRole('size');
    if (sizeQ) {
        for (const o of sizeQ.options){
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_SIZES"].includes(o.id)) {
                problems.push(`Size option "${o.id}" is not a valid pool size.`);
            }
        }
    }
    const packageQ = byRole('package');
    if (packageQ) {
        const allowed = new Set([
            ...template.packages.map((p)=>p.id),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]
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
}),
"[project]/lib/estimator/configurator/engine.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-rsc] (ecmascript)");
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
    const estimate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
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
    const a = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, without)
    }));
    const b = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
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
    const a = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
        answers: selectionToAnswers(spec, base)
    }));
    const b = lineSum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
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
}),
"[project]/components/estimator/configurator/photos.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-rsc] (ecmascript)");
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
    const { src, alt } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoSrc"])(spec, key);
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
            ...stagePhoto(spec, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoFor"])(spec, v.id, selection), manifest)
        }));
}
function viewPhotos(spec, viewId, manifest) {
    const seen = new Set();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoKeys"])(spec, viewId).map((k)=>stagePhoto(spec, k, manifest)).filter((p)=>seen.has(p.src) ? false : (seen.add(p.src), true));
}
}),
"[project]/components/estimator/configurator/photo-manifest.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "configuratorPhotoManifest",
    ()=>configuratorPhotoManifest
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/photos.ts [app-rsc] (ecmascript)");
;
;
;
function configuratorPhotoManifest(spec, publicDir = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["join"])(process.cwd(), 'public')) {
    try {
        if (!(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])(publicDir)) return null;
        const out = {};
        for (const [key, photo] of Object.entries(spec.photos)){
            const file = (src)=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["join"])(publicDir, src.replace(/^\//, '')));
            out[key] = {
                full: file(photo.src),
                sm: file((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["smallSrc"])(photo.src))
            };
        }
        return out;
    } catch  {
        return null;
    }
}
}),
"[project]/components/estimator/estimator.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Estimator",
    ()=>Estimator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Estimator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Estimator() from the server but Estimator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/estimator.tsx <module evaluation>", "Estimator");
}),
"[project]/components/estimator/estimator.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Estimator",
    ()=>Estimator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Estimator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Estimator() from the server but Estimator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/estimator.tsx", "Estimator");
}),
"[project]/components/estimator/estimator.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/estimator/estimator.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/estimator/estimator.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/estimator/shell/estimator-footer.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EstimatorFooter",
    ()=>EstimatorFooter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
;
;
const link = 'inline-flex min-h-11 items-center underline-offset-4 hover:text-[var(--hq-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
function EstimatorFooter({ contractor }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "border-t border-[var(--hq-line)] bg-[var(--hq-navy-deep)] text-sm text-[var(--hq-text-dim)]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "min-w-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "font-medium text-[var(--hq-text-muted)]",
                            children: contractor.network ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    contractor.contractorName,
                                    " · ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-normal",
                                        children: contractor.licenseLabel
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                                        lineNumber: 24,
                                        columnNumber: 47
                                    }, this)
                                ]
                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    contractor.contractorName,
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "tabular-nums",
                                        children: [
                                            "(",
                                            contractor.licenseLabel,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                                        lineNumber: 28,
                                        columnNumber: 45
                                    }, this)
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                            lineNumber: 20,
                            columnNumber: 11
                        }, this),
                        contractor.serviceAreaLabel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-pretty",
                            children: [
                                "Serving ",
                                contractor.serviceAreaLabel,
                                "."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                            lineNumber: 32,
                            columnNumber: 42
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center gap-x-6 gap-y-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            "aria-label": "Legal",
                            className: "flex gap-5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/privacy",
                                    className: link,
                                    children: "Privacy"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                                    lineNumber: 36,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/terms",
                                    className: link,
                                    children: "Terms"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                                    lineNumber: 39,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs",
                            children: "Powered by Rendoly"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                            lineNumber: 44,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/shell/estimator-footer.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/shell/facts.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/components/estimator/shell/estimator-header.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EstimatorHeader",
    ()=>EstimatorHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down.js [app-rsc] (ecmascript) <export default as ArrowDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-rsc] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-rsc] (ecmascript)");
;
;
;
;
function EstimatorHeader({ contractor, facts = [], startHref }) {
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    // The first fact (licensed & insured) rides with the license; the rest live in the hero.
    const credential = facts[0];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "sticky top-0 z-40 bg-[var(--hq-mist)] text-[var(--hq-navy)] shadow-[0_1px_0_rgba(10,27,61,0.08),0_8px_24px_-12px_rgba(6,18,43,0.55)]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-5 sm:h-20 sm:gap-5 sm:px-8",
            children: [
                contractor.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "relative block h-9 w-[86px] shrink-0 sm:h-12 sm:w-[114px]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                        src: contractor.logoUrl,
                        alt: contractor.contractorName,
                        fill: true,
                        sizes: "(min-width: 640px) 114px, 86px",
                        className: "object-contain object-left",
                        priority: true
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                        lineNumber: 39,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                    lineNumber: 38,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "font-[family-name:var(--font-sora)] text-base font-bold tracking-tight sm:text-lg",
                    children: contractor.contractorName
                }, void 0, false, {
                    fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                    lineNumber: 49,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "min-w-0 border-l border-[rgba(10,27,61,0.14)] pl-3 text-[11px] leading-4 text-[#3b4a6b] sm:pl-5 sm:text-[13px] sm:leading-5",
                    children: [
                        contractor.logoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sr-only",
                            children: [
                                contractor.contractorName,
                                ", "
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 53,
                            columnNumber: 33
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: contractor.network ? 'block text-balance font-medium max-sm:max-w-[11rem]' : 'block whitespace-nowrap font-medium tabular-nums',
                            children: contractor.licenseLabel
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        credential ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "block truncate",
                            children: credential
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 58,
                            columnNumber: 25
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this),
                tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    href: tel,
                    "aria-label": `Call ${contractor.contractorName} at ${contractor.phone}`,
                    className: "ml-auto inline-flex h-11 shrink-0 touch-manipulation items-center gap-2 rounded-full bg-[var(--hq-accent)] pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_-6px_rgba(0,56,184,0.7)] [transition:background-color_150ms_ease,scale_120ms_ease-out] hover:bg-[#0a46d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent)] active:scale-[.97] motion-reduce:transition-none",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                            "aria-hidden": "true",
                            className: "size-4",
                            strokeWidth: 2.4
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 66,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sm:hidden",
                            children: "Call"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 67,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden tabular-nums sm:inline",
                            children: contractor.phone
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 68,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                    lineNumber: 61,
                    columnNumber: 11
                }, this) : startHref ? // Hidden once the design is finished (the flow marks the page with data-estimator-done).
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    href: startHref,
                    className: "[[data-estimator-done]_&]:hidden ml-auto inline-flex h-11 shrink-0 touch-manipulation items-center gap-2 rounded-full bg-[var(--hq-accent)] pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_-6px_rgba(0,56,184,0.7)] [transition:background-color_150ms_ease,scale_120ms_ease-out] hover:bg-[#0a46d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent)] active:scale-[.97] motion-reduce:transition-none",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDown$3e$__["ArrowDown"], {
                            "aria-hidden": "true",
                            className: "size-4",
                            strokeWidth: 2.4
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 76,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sm:hidden",
                            children: "Start"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 77,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden sm:inline",
                            children: "Start my design"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                            lineNumber: 78,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/shell/estimator-header.tsx",
                    lineNumber: 72,
                    columnNumber: 11
                }, this) : null
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/shell/estimator-header.tsx",
            lineNumber: 36,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/shell/estimator-header.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/funnel/chrome.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelFooter",
    ()=>FunnelFooter,
    "FunnelLogo",
    ()=>FunnelLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-rsc] (ecmascript)");
;
;
;
;
function FunnelLogo({ contractor, height, priority = false }) {
    if (!contractor.logoUrl) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[18px] font-semibold tracking-[-0.02em] text-[var(--fn-ink)]",
            children: contractor.contractorName
        }, void 0, false, {
            fileName: "[project]/components/estimator/funnel/chrome.tsx",
            lineNumber: 17,
            columnNumber: 12
        }, this);
    }
    const width = Math.round(height * 2.38);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
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
function FunnelFooter({ contractor, note }) {
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "border-t border-[var(--fn-hair)] text-[var(--fn-muted)]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-[1120px] px-5 pb-8 pt-6 sm:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] leading-[20px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                        tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: tel,
                            className: "tabular-nums underline-offset-4 hover:text-[var(--fn-ink)] hover:underline",
                            children: contractor.phone
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 51,
                            columnNumber: 13
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                            href: "/privacy",
                            className: "underline-offset-4 hover:text-[var(--fn-ink)] hover:underline",
                            children: "Privacy"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/funnel/chrome.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-3 max-w-[640px] text-pretty text-[12px] leading-[17px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
}),
"[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AnnouncementBar",
    ()=>AnnouncementBar,
    "HeaderMenu",
    ()=>HeaderMenu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AnnouncementBar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AnnouncementBar() from the server but AnnouncementBar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/funnel/landing-bits.tsx <module evaluation>", "AnnouncementBar");
const HeaderMenu = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call HeaderMenu() from the server but HeaderMenu is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/funnel/landing-bits.tsx <module evaluation>", "HeaderMenu");
}),
"[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AnnouncementBar",
    ()=>AnnouncementBar,
    "HeaderMenu",
    ()=>HeaderMenu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AnnouncementBar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AnnouncementBar() from the server but AnnouncementBar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/funnel/landing-bits.tsx", "AnnouncementBar");
const HeaderMenu = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call HeaderMenu() from the server but HeaderMenu is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/estimator/funnel/landing-bits.tsx", "HeaderMenu");
}),
"[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/lib/estimator/funnel/engine.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-rsc] (ecmascript)");
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
    const sel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["defaultSelection"])(cfg);
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
    if (spec.configurator && cfgSel) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["selectionToAnswers"])(spec.configurator, cfgSel, overlay);
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
        const { estimate, total } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["estimateSelection"])(spec.configurator, template, cfgSel, overlayAnswers(spec, selection));
        return {
            estimate,
            total
        };
    }
    const estimate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["computeEstimate"])(template, {
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
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoFor"])(cfg, step.photo.view, cfgSel);
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
    const photo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoSrc"])(cfg, photoKey(spec, step.id, sel));
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
}),
"[project]/components/estimator/funnel/state.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-rsc] (ecmascript)");
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
    return `${pathname}?step=${screenParam(screen)}&${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["encodeFunnelSelection"])(spec, selection)}${tail}`;
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
        selection: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeFunnelSelection"])(spec, params),
        fromUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["answeredSteps"])(spec, params).length > 0
    };
}
const storageKey = (slug)=>`hq-funnel:${slug}`;
function session() {
    try {
        return ("TURBOPACK compile-time truthy", 1) ? null : "TURBOPACK unreachable";
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
            selection: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, parsed.selection),
            result
        };
    } catch  {
        return null;
    }
}
function resultFor(spec, result, selection) {
    if (!result?.selection) return null;
    const a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, result.selection);
    const b = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeFunnelSelection"])(spec, selection);
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
}),
"[project]/components/estimator/funnel/landing.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FunnelLanding",
    ()=>FunnelLanding,
    "headlineLines",
    ()=>headlineLines
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$dom$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-dom.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/chrome.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/landing-bits.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/state.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
/*
 * The funnel's landing page (Buildoly's mobile landing, for a pool remodeler):
 * a dark announcement bar, a floating white header card, a huge two-line
 * headline on a pale sky, one line under it, one full-width blue button, and
 * the hero photo rising out of the sky to the bottom of the screen. Below the
 * fold, only three real finished jobs and the licence. Nothing else.
 */ const SKY = 'linear-gradient(180deg, #b8cfeb 0%, #cddcef 42%, #dfe8f3 100%)';
function headlineLines(headline) {
    const i = headline.indexOf(', ');
    return i > 0 ? [
        headline.slice(0, i + 1),
        headline.slice(i + 2)
    ] : [
        headline
    ];
}
function FunnelLanding({ spec, contractor, designHref }) {
    const { landing } = spec;
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["telHref"])(contractor.phone);
    const lines = headlineLines(landing.headline);
    const hero = landing.heroPhoto;
    const heroSrcSet = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$state$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["photoSrcSet"])(hero);
    // The hero is the largest paint: ask for it with the HTML (the right width from the srcset).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$dom$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["preload"])(hero.src, {
        as: 'image',
        fetchPriority: 'high',
        ...heroSrcSet ? {
            imageSrcSet: heroSrcSet,
            imageSizes: '100vw'
        } : {}
    });
    const projects = landing.projects ?? [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "es-fn flex min-h-[100dvh] flex-1 flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AnnouncementBar"], {
                text: landing.announcement
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/landing.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                id: "main",
                className: "flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "relative isolate flex min-h-[calc(100svh-36px)] flex-col overflow-hidden",
                        style: {
                            background: SKY
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative z-20 px-3 pt-[11px] lg:px-3 lg:pt-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                    className: "relative mx-auto flex h-[50px] max-w-[1416px] items-center justify-between rounded-[12px] border border-black/[0.06] bg-white pl-6 pr-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_14px_rgb(0_0_0/0.06)] lg:h-[56px] lg:pl-6 lg:pr-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                            href: `/estimator/${contractor.slug}`,
                                            "aria-label": `${contractor.contractorName} home`,
                                            className: "-mx-1 rounded-[4px] px-1 py-1 focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["FunnelLogo"], {
                                                contractor: contractor,
                                                height: 30,
                                                priority: true
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                lineNumber: 46,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                            lineNumber: 45,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2d$bits$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HeaderMenu"], {
                                            links: [
                                                {
                                                    href: designHref,
                                                    label: landing.cta
                                                },
                                                ...projects.length ? [
                                                    {
                                                        href: '#projects',
                                                        label: 'Recent projects'
                                                    }
                                                ] : []
                                            ],
                                            tel: tel,
                                            phone: contractor.phone
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                            lineNumber: 48,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "hidden items-center gap-6 lg:flex",
                                            children: [
                                                projects.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#projects",
                                                    className: "whitespace-nowrap text-[16px] text-[#0a0a0a] underline-offset-4 hover:underline",
                                                    children: "Recent projects"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 58,
                                                    columnNumber: 19
                                                }, this) : null,
                                                tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: tel,
                                                    className: "whitespace-nowrap text-[16px] tabular-nums text-[#0a0a0a] underline-offset-4 hover:underline",
                                                    children: contractor.phone
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 63,
                                                    columnNumber: 19
                                                }, this) : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: designHref,
                                                    className: "fn-btn h-10 whitespace-nowrap rounded-full px-5 text-[15px] shadow-none",
                                                    children: landing.cta
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 67,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                            lineNumber: 56,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                    lineNumber: 44,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative z-10 mx-auto w-full max-w-[1120px] px-5 text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "mx-auto mt-[27px] text-balance text-[clamp(30px,8.6vw,44px)] font-medium leading-[1.08] tracking-[-0.024em] text-[#0a0a0a] sm:mt-10 lg:mt-14 lg:text-[64px] lg:leading-[1.04] lg:tracking-[-0.028em]",
                                        children: lines.length === 2 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block lg:inline",
                                                    children: lines[0]
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 78,
                                                    columnNumber: 19
                                                }, this),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block lg:inline",
                                                    children: lines[1]
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 78,
                                                    columnNumber: 71
                                                }, this)
                                            ]
                                        }, void 0, true) : lines[0]
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 75,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mx-auto mt-[13px] max-w-[352px] text-pretty text-[17px] leading-[23px] tracking-[-0.01em] text-[#1c1b19] sm:max-w-[520px] lg:mt-4 lg:max-w-[720px] lg:text-[20px] lg:leading-[28px]",
                                        children: landing.subline.replace(/-/g, '\u2011')
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 84,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                        href: designHref,
                                        className: "fn-btn mx-auto mt-[22px] h-[56px] w-full max-w-[353px] text-[19px] sm:max-w-[360px] lg:mt-7 lg:inline-flex lg:h-[52px] lg:w-auto lg:px-6 lg:text-[17px]",
                                        children: landing.cta
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 88,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative -mt-[30px] min-h-[300px] flex-1 lg:-mt-[60px] lg:min-h-[440px]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: hero.src,
                                    srcSet: heroSrcSet,
                                    sizes: "100vw",
                                    alt: landing.heroAlt,
                                    fetchPriority: "high",
                                    decoding: "async",
                                    draggable: false,
                                    className: "fn-hero-photo absolute inset-0 h-full w-full select-none object-cover object-[50%_72%]"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                    lineNumber: 99,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 97,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this),
                    projects.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "projects",
                        "aria-labelledby": "fn-projects",
                        className: "mx-auto w-full max-w-[1120px] scroll-mt-4 px-8 pb-14 pt-12 lg:pb-20 lg:pt-20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                id: "fn-projects",
                                className: "text-balance text-[28px] font-medium leading-[1.1] tracking-[-0.022em] text-[#0a0a0a] lg:text-[40px]",
                                children: [
                                    "Recent ",
                                    contractor.contractorName,
                                    " projects"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 114,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-2 max-w-[560px] text-pretty text-[16px] leading-[23px] text-[var(--fn-muted)] lg:text-[18px] lg:leading-[26px]",
                                children: "Real backyards we remodeled, photographed as built."
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "-mx-8 mt-6 flex snap-x snap-mandatory scroll-px-8 gap-3 overflow-x-auto px-8 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden",
                                children: projects.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "w-[78%] shrink-0 snap-start lg:w-auto",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[#e9e6e0]",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                            src: p.thumb ?? p.src,
                                                            alt: p.alt,
                                                            loading: "lazy",
                                                            decoding: "async",
                                                            className: "absolute inset-0 h-full w-full object-cover"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                            lineNumber: 126,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            "aria-hidden": "true",
                                                            className: "pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                            lineNumber: 127,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 124,
                                                    columnNumber: 21
                                                }, this),
                                                p.caption ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                                                    className: "mt-2.5 text-[15px] leading-[20px] text-[#2b2a27]",
                                                    children: p.caption
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                    lineNumber: 129,
                                                    columnNumber: 34
                                                }, this) : null
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/estimator/funnel/landing.tsx",
                                            lineNumber: 123,
                                            columnNumber: 19
                                        }, this)
                                    }, p.src, false, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 122,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 120,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-10 flex flex-col gap-5 border-t border-[var(--fn-hair)] pt-8 lg:flex-row lg:items-center lg:justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-pretty text-[15px] leading-[22px] text-[var(--fn-muted)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-medium text-[#0a0a0a]",
                                                children: contractor.contractorName
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                                lineNumber: 136,
                                                columnNumber: 17
                                            }, this),
                                            " ·",
                                            ' ',
                                            [
                                                ...contractor.facts ?? [],
                                                contractor.licenseLabel
                                            ].join(' · ')
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 135,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                        href: designHref,
                                        className: "fn-btn h-[52px] w-full text-[17px] lg:w-auto lg:px-6",
                                        children: landing.cta
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                                        lineNumber: 139,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/funnel/landing.tsx",
                                lineNumber: 134,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/funnel/landing.tsx",
                        lineNumber: 113,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/funnel/landing.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$chrome$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["FunnelFooter"], {
                contractor: contractor,
                note: spec.photoNote
            }, void 0, false, {
                fileName: "[project]/components/estimator/funnel/landing.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/funnel/landing.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
}),
"[project]/lib/estimator/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyContractorConfig",
    ()=>applyContractorConfig,
    "publicTemplate",
    ()=>publicTemplate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-rsc] (ecmascript)");
;
/** Price with the override's defined fields laid over it; undefined when the result would be incomplete. */ function mergePrice(base, patch) {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v])=>v !== undefined));
    const merged = {
        ...base,
        ...defined
    };
    if (merged.unit === undefined || merged.low === undefined || merged.high === undefined) return base;
    return merged;
}
function patchOption(option, override) {
    if (override.label !== undefined) option.label = override.label;
    if (override.note !== undefined) option.note = override.note;
    if (override.image !== undefined) option.image = override.image;
    if (override.price) {
        const price = mergePrice(option.price, override.price);
        if (price) option.price = price;
    }
}
/** Put a catalog option back where the catalog lists it, relative to the options already shown. */ function insertInCatalogOrder(q, option, catalogOptions) {
    const start = catalogOptions.findIndex((o)=>o.id === option.id);
    for(let i = start + 1; i < catalogOptions.length; i++){
        const at = q.options.findIndex((o)=>o.id === catalogOptions[i].id);
        if (at !== -1) {
            q.options.splice(at, 0, option);
            return;
        }
    }
    q.options.push(option);
}
/** Option ids the package question should offer: one per package, then the custom option. */ function syncPackageOptions(q, packages) {
    const existing = new Map(q.options.map((o)=>[
            o.id,
            o
        ]));
    const options = packages.map((p)=>({
            ...existing.get(p.id),
            id: p.id,
            label: p.label,
            note: existing.get(p.id)?.note ?? p.description
        }));
    options.push(existing.get(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"]) ?? {
        id: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CUSTOM_PACKAGE_ID"],
        label: 'Build my own'
    });
    q.options = options;
}
/**
 * After options were removed: drop their ids from other questions' showWhen, and
 * remove a question left with nothing that could ever show it (and, in turn,
 * the questions that hang off it). Returns the removed question ids.
 */ function dropUnreachable(questions) {
    const removed = new Set();
    let changed = true;
    while(changed){
        changed = false;
        for (const q of [
            ...questions
        ]){
            if (!q.showWhen) continue;
            const parent = questions.find((p)=>p.id === q.showWhen.questionId);
            if (parent) q.showWhen.anyOf = q.showWhen.anyOf.filter((id)=>parent.options.some((o)=>o.id === id));
            if (!parent || q.showWhen.anyOf.length === 0) {
                questions.splice(questions.indexOf(q), 1);
                removed.add(q.id);
                changed = true;
            }
        }
    }
    return removed;
}
/** A package's answers without picks for options or questions that no longer exist. */ function pruneAnswers(answers, questions, removed) {
    const out = {};
    for (const [questionId, picks] of Object.entries(answers)){
        if (removed.has(questionId)) continue;
        const q = questions.find((x)=>x.id === questionId);
        if (!q) {
            out[questionId] = [
                ...picks
            ];
            continue;
        }
        const kept = picks.filter((id)=>q.options.some((o)=>o.id === id));
        if (kept.length) out[questionId] = kept;
    }
    return out;
}
function applyContractorConfig(template, config, catalog) {
    const next = structuredClone(template);
    next.pricesConfirmed = config.pricesConfirmed;
    next.minimumJob = config.minimumJob ?? template.minimumJob;
    for (const [key, override] of Object.entries(config.options ?? {})){
        const dot = key.indexOf('.');
        if (dot === -1) continue;
        const q = next.questions.find((x)=>x.id === key.slice(0, dot));
        if (!q) continue;
        const optionId = key.slice(dot + 1);
        if (override.enabled === false) {
            q.options = q.options.filter((o)=>o.id !== optionId);
            continue;
        }
        let option = q.options.find((o)=>o.id === optionId);
        if (!option && override.enabled === true) {
            const catalogOptions = catalog?.[q.id] ?? [];
            const fromCatalog = catalogOptions.find((o)=>o.id === optionId);
            if (fromCatalog) {
                option = structuredClone(fromCatalog);
                insertInCatalogOrder(q, option, catalogOptions);
            }
        }
        if (option) patchOption(option, override);
    }
    for (const [questionId, extra] of Object.entries(config.customOptions ?? {})){
        const q = next.questions.find((x)=>x.id === questionId);
        if (q) q.options.push(...structuredClone(extra));
    }
    if (config.packages) {
        next.packages = structuredClone(config.packages);
        const packageQ = next.questions.find((q)=>q.role === 'package');
        if (packageQ) syncPackageOptions(packageQ, next.packages);
    }
    const removed = dropUnreachable(next.questions);
    next.packages = next.packages.map((p)=>({
            ...p,
            answers: pruneAnswers(p.answers, next.questions, removed)
        }));
    return next;
}
function publicTemplate(template, config) {
    if (config.revealRange === 'immediately') return template;
    return {
        ...template,
        minimumJob: 0,
        roundTo: 0,
        questions: template.questions.map((q)=>({
                ...q,
                options: q.options.map((option)=>{
                    const copy = {
                        ...option
                    };
                    delete copy.price;
                    return copy;
                })
            }))
    };
}
}),
"[project]/content/estimators/homequote-bathroom-photos.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATH_GALLERY",
    ()=>BATH_GALLERY,
    "BATH_HERO_VIDEO",
    ()=>BATH_HERO_VIDEO,
    "BATH_OPTION_IMAGES",
    ()=>BATH_OPTION_IMAGES,
    "BATH_STYLE_IDEA_LABEL",
    ()=>BATH_STYLE_IDEA_LABEL
]);
/*
 * Bathroom builder images (/estimator/bathroom-remodel). HomeQuote Network is
 * a matching network with no jobs of its own, so these are AI-generated style
 * ideas (kie.ai nano-banana-pro), never real completed projects: captions and
 * alt text say so, and nothing here may be presented as "our work". Nothing is
 * taken from the web. Files live in public/estimator/bathroom/ (thumbs/ holds
 * 720 px copies and the option crops); re-make them with
 * `node scripts/generate-bath-assets.mjs generate|post` (metadata stripped).
 */ const DIR = '/estimator/bathroom/';
const THUMBS = `${DIR}thumbs/`;
const BATH_STYLE_IDEA_LABEL = 'Style idea (AI-generated)';
const look = (name, alt, caption)=>({
        src: `${DIR}${name}.webp`,
        thumb: `${THUMBS}${name}.webp`,
        alt,
        caption: `${BATH_STYLE_IDEA_LABEL}: ${caption}`
    });
const BATH_GALLERY = [
    look('style-modern-spa', 'AI-generated modern spa bathroom with a curbless walk-in shower, built-in bench and niche, a floating oak vanity and a backlit mirror', 'Modern spa'),
    look('style-warm-wood', 'AI-generated bathroom with white subway tile, an oak double vanity, brass fixtures and a white hexagon floor', 'Warm wood and white'),
    look('style-classic-marble', 'AI-generated marble bathroom with a freestanding soaking tub and a separate glass shower', 'Classic marble'),
    look('style-green-zellige', 'AI-generated bathroom with a green zellige tiled walk-in shower and brushed gold fixtures', 'Bold green zellige'),
    look('style-black-white', 'AI-generated black-and-white bathroom with a hexagon floor, a black vanity and matte black fixtures', 'Black and white'),
    look('style-coastal', 'AI-generated coastal bathroom with pale blue tile, a light wood vanity and a wood-look floor', 'Light coastal'),
    look('style-navy-hall', 'AI-generated compact hall bathroom with a navy vanity and a tub-and-shower combo with a recessed niche', 'Navy hall bath'),
    look('style-heated-floor', 'AI-generated greige bathroom with a floating oak vanity and a glowing LED backlit mirror', 'Soft greige retreat')
];
const BATH_OPTION_IMAGES = {
    'bathing.walk_in': `${THUMBS}option-bathing-walk_in.webp`,
    'bathing.tub_shower': `${THUMBS}option-bathing-tub_shower.webp`,
    'bathing.tub_and_shower': `${THUMBS}option-bathing-tub_and_shower.webp`,
    'vanity.single': `${THUMBS}option-vanity-single.webp`,
    'vanity.double': `${THUMBS}option-vanity-double.webp`,
    'vanity.floating': `${THUMBS}option-vanity-floating.webp`,
    'extras.niche': `${THUMBS}option-extras-niche.webp`,
    'extras.bench': `${THUMBS}option-extras-bench.webp`,
    'extras.led_mirror': `${THUMBS}option-extras-led_mirror.webp`
};
const BATH_HERO_VIDEO = {
    mp4: '/estimator/hero/bath-hero.mp4',
    webm: '/estimator/hero/bath-hero.webm',
    poster: '/estimator/hero/bath-hero.webp',
    alt: 'AI-rendered remodeled bathroom with a glass walk-in shower, a floating oak vanity and a freestanding tub'
};
}),
"[project]/content/estimators/homequote-bathroom.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HOMEQUOTE_BATHROOM_ESTIMATOR",
    ()=>HOMEQUOTE_BATHROOM_ESTIMATOR
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/homequote-bathroom-photos.ts [app-rsc] (ecmascript)");
;
const HOMEQUOTE_BATHROOM_ESTIMATOR = {
    slug: 'bathroom-remodel',
    trade: 'bathroom',
    contractorName: 'HomeQuote Network',
    // A network: this line describes the service; it is never shown as a license of its own.
    licenseLabel: 'Connects you with licensed local contractors',
    network: true,
    logoUrl: '/images/brand/homequote-network-logo.webp',
    funnelSlug: 'bathroom-remodel',
    calendarProvider: 'homequote',
    revealRange: 'after_contact',
    // Mirrors the funnel's trackingPixels.consentMode.
    adMeasurement: 'opt_out',
    pricesConfirmed: false,
    // About the service only: no license, years or reviews of the network's own.
    // (The licensed-contractor line is in the header already.)
    facts: [
        'Free in-home consultation',
        'No obligation',
        'Free to use'
    ],
    // AI-generated style ideas (labelled as such), never presented as finished jobs.
    options: Object.fromEntries(Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_OPTION_IMAGES"]).map(([key, image])=>[
            key,
            {
                image
            }
        ])),
    gallery: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATH_GALLERY"]
};
}),
"[project]/content/estimators/pool-masters-configurator.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_MASTERS_CONFIGURATOR",
    ()=>POOL_MASTERS_CONFIGURATOR
]);
/*
 * Pool Masters LA's one-page configurator: pick the size, pick the finish, pick
 * the upgrades. Every row maps to the pool template's question/option ids
 * (lib/estimator/templates/pool.ts), so prices come from the same example price
 * table as the step-by-step builder (still examples: pricesConfirmed false).
 *
 * "Included" (the base design) is a solid refresh: plaster interior, porcelain
 * waterline tile with concrete coping, a resurfaced deck sized to the pool, and
 * a new variable-speed pump and filter. Rectangle shape only (the photos show a
 * rectangle; the site visit measures the real pool).
 *
 * Go Luxe bundles 6 upgrades (pebble, glass tile, travertine coping, porcelain
 * deck, spa, fire bowls) for 10% off the sum of their example prices. At the
 * medium size that is about $48,900–$81,300 of upgrades for about
 * $44,100–$73,100 (saving about $4,800–$8,200). The 10% is an example figure for
 * the contractor to confirm with the prices.
 *
 * Prices are for remodelling an existing pool (the size cards describe the
 * pool the homeowner has), not a new build.
 *
 * Photos are pre-rendered: public/estimator/pool-masters/configurator/<key>.webp
 * (1800 px) and <key>-sm.webp (1200 px), 78 keys, all edited from one real Pool
 * Masters job (the same yard from three angles) by
 * scripts/generate-pool-configurator-photos.mjs (kie.ai edits) and
 * scripts/pool-configurator-composite.py (composites and recolours). A missing
 * file falls back to the view's real photo. The pool's size is not in the
 * photos: the size cards and the to-scale plan on the photo show it.
 */ const DIR = '/estimator/pool-masters/configurator/';
const REAL = '/estimator/pool-masters/';
const SPA = {
    id: 'spa',
    options: [
        {
            token: 'spa',
            rows: [
                'spa'
            ]
        },
        {
            token: '',
            rows: []
        }
    ]
};
/*
 * Every view shows the picks it can (the same yard from three angles): the pebble
 * finish and the spa show everywhere; the deck and the backyard from above; the
 * waterline tile and coping poolside; LED lights and fire bowls at dusk.
 * Baja shelf, water bowls, fire pit, turf and equipment are priced, not pictured
 * (the rows say so).
 */ const VIEWS = [
    {
        id: 'aerial',
        label: 'Aerial',
        dimensions: [
            {
                id: 'deck',
                options: [
                    {
                        token: 'pavers',
                        rows: [
                            'deck_pavers'
                        ]
                    },
                    {
                        token: 'porcelain',
                        rows: [
                            'deck_porcelain'
                        ]
                    },
                    {
                        token: 'resurface',
                        rows: []
                    }
                ]
            },
            // Quartz reads as light water from above; only pebble changes the colour there.
            {
                id: 'water',
                options: [
                    {
                        token: 'pebble',
                        rows: [
                            'pebble'
                        ]
                    },
                    {
                        token: '',
                        rows: []
                    }
                ]
            },
            SPA,
            {
                id: 'yard',
                options: [
                    {
                        token: 'yard',
                        rows: [],
                        allOf: [
                            'outdoor_kitchen',
                            'patio_cover'
                        ]
                    },
                    {
                        token: 'kitchen',
                        rows: [
                            'outdoor_kitchen'
                        ]
                    },
                    {
                        token: 'cover',
                        rows: [
                            'patio_cover'
                        ]
                    },
                    {
                        token: '',
                        rows: []
                    }
                ]
            }
        ],
        fallback: {
            src: `${REAL}overhead-pool-turf-bands-pavers.webp`,
            alt: 'Drone view of a Pool Masters LA pool with a spa, pavers and turf bands'
        }
    },
    {
        id: 'poolside',
        label: 'Poolside',
        dimensions: [
            {
                id: 'finish',
                options: [
                    {
                        token: 'quartz',
                        rows: [
                            'quartz'
                        ]
                    },
                    {
                        token: 'pebble',
                        rows: [
                            'pebble'
                        ]
                    },
                    {
                        token: 'plaster',
                        rows: []
                    }
                ]
            },
            {
                id: 'edge',
                options: [
                    {
                        token: 'premium',
                        rows: [
                            'edge_glass_travertine'
                        ]
                    },
                    {
                        token: 'stone',
                        rows: [
                            'edge_stone'
                        ]
                    },
                    {
                        token: 'classic',
                        rows: []
                    }
                ]
            },
            SPA
        ],
        fallback: {
            src: `${REAL}pool-umbrella-spa-baja-shelf.webp`,
            alt: 'Sunny hilltop pool and spa by Pool Masters LA with a white umbrella and loungers on the Baja shelf'
        }
    },
    {
        id: 'evening',
        label: 'Evening',
        dimensions: [
            // Colour LEDs set the water colour at night; otherwise a pebble pool reads deep blue.
            {
                id: 'water',
                options: [
                    {
                        token: 'led',
                        rows: [
                            'led_lights'
                        ]
                    },
                    {
                        token: 'pebble',
                        rows: [
                            'pebble'
                        ]
                    },
                    {
                        token: '',
                        rows: []
                    }
                ]
            },
            {
                id: 'fire',
                options: [
                    {
                        token: 'fire',
                        rows: [
                            'fire_bowls'
                        ]
                    },
                    {
                        token: '',
                        rows: []
                    }
                ]
            },
            SPA
        ],
        fallback: {
            src: `${REAL}night-led-pool-spa.webp`,
            alt: 'Pool and spa by Pool Masters LA glowing with LED lights at dusk'
        }
    }
];
const DECK_ALT = {
    resurface: 'a freshly resurfaced light concrete deck',
    pavers: 'a new deck of large pale stone pavers',
    porcelain: 'a new deck of large-format pale porcelain tile'
};
const FINISH_ALT = {
    plaster: 'bright white plaster that makes the water light blue',
    quartz: 'pale grey quartz finish with a soft aqua water colour',
    pebble: 'dark blue pebble finish that makes the water a deep lagoon blue'
};
const EDGE_ALT = {
    classic: 'white porcelain waterline tile and a concrete coping',
    premium: 'blue glass waterline tile and travertine coping',
    stone: 'natural split-face stone waterline tile and flagstone coping'
};
const YARD_ALT = {
    yard: 'an outdoor kitchen with a grill, island and bar stools beside a dark patio cover',
    kitchen: 'an open-air outdoor kitchen with a grill, island and bar stools',
    cover: 'a dark patio cover over an outdoor lounge'
};
/** Alt text per image key (example designs; the page labels them once as AI-assisted). */ function altFor(key) {
    const [view, ...tokens] = key.split('-');
    const has = (t)=>tokens.includes(t);
    if (view === 'aerial') {
        const [deck] = tokens;
        const parts = [
            `Drone view of a rectangular pool${has('pebble') ? ' with a dark pebble finish' : ''} and ${DECK_ALT[deck]}`
        ];
        if (has('spa')) parts.push('a raised spa in dark tile');
        const yard = [
            'yard',
            'kitchen',
            'cover'
        ].find(has);
        if (yard) parts.push(YARD_ALT[yard]);
        return `${parts.join(', ')} (example design)`;
    }
    if (view === 'poolside') {
        const [finish, edge] = tokens;
        return `Poolside view of a rectangular pool with ${FINISH_ALT[finish]}, ${EDGE_ALT[edge]}${has('spa') ? ', and a raised spa with a spillover' : ''} (example design)`;
    }
    const parts = [
        `The same pool at dusk${has('pebble') ? ', its pebble finish a deep blue' : ''}`
    ];
    parts.push(has('led') ? 'glowing with colour LED pool lights' : 'with a warm white pool light');
    if (has('spa')) parts.push('a lit raised spa in the foreground');
    if (has('fire')) parts.push('two lit fire bowls at the far end');
    return `${parts.join(', ')} (example design)`;
}
function photoMatrix(views) {
    const out = {};
    for (const v of views){
        const keys = v.dimensions.reduce((acc, d)=>acc.flatMap((t)=>d.options.map((o)=>[
                        ...t,
                        o.token
                    ])), [
            []
        ]).map((tokens)=>[
                v.id,
                ...tokens.filter(Boolean)
            ].join('-'));
        for (const key of keys)out[key] = {
            src: `${DIR}${key}.webp`,
            alt: altFor(key)
        };
    }
    return out;
}
const POOL_MASTERS_CONFIGURATOR = {
    title: 'Reimagine your pool',
    intro: 'Remodel pricing for the pool you have. Pick its size, a finish and the upgrades you want: the photos and the price change as you go.',
    defaultModel: 'medium',
    models: [
        {
            id: 'small',
            name: 'Compact',
            tagline: 'Existing pools up to about 24 × 12 ft',
            dimensions: '24 × 12 ft',
            answers: {
                shape: [
                    'rectangle'
                ],
                size: [
                    'small'
                ],
                deckSize: [
                    'small'
                ]
            }
        },
        {
            id: 'medium',
            name: 'Classic',
            tagline: 'Existing pools around 30 × 15 ft',
            dimensions: '30 × 15 ft',
            answers: {
                shape: [
                    'rectangle'
                ],
                size: [
                    'medium'
                ],
                deckSize: [
                    'medium'
                ]
            }
        },
        {
            id: 'large',
            name: 'Estate',
            tagline: 'Existing pools around 36 × 18 ft or larger',
            dimensions: '36 × 18 ft',
            answers: {
                shape: [
                    'rectangle'
                ],
                size: [
                    'large'
                ],
                deckSize: [
                    'large'
                ]
            }
        }
    ],
    views: VIEWS,
    baseAnswers: {
        project: [
            'remodel'
        ],
        package: [
            'custom'
        ],
        scope: [
            'surface',
            'tile_coping',
            'deck',
            'equipment'
        ],
        equipment: [
            'pump_filter'
        ]
    },
    groups: [
        {
            id: 'finish',
            title: 'Pool finish',
            view: 'poolside',
            kind: 'single',
            rows: [
                {
                    id: 'plaster',
                    label: 'White plaster',
                    note: 'Classic, bright blue water',
                    answers: {
                        surface: [
                            'plaster'
                        ]
                    },
                    included: true
                },
                {
                    id: 'quartz',
                    label: 'Quartz',
                    note: 'Smoother, longer-lasting, soft aqua',
                    answers: {
                        surface: [
                            'quartz'
                        ]
                    }
                },
                {
                    id: 'pebble',
                    label: 'Pebble',
                    note: 'Natural texture, deep lagoon blue',
                    answers: {
                        surface: [
                            'pebble'
                        ]
                    }
                }
            ]
        },
        {
            id: 'edge',
            title: 'Tile & coping',
            view: 'poolside',
            kind: 'single',
            rows: [
                {
                    id: 'edge_classic',
                    label: 'Porcelain tile, concrete coping',
                    answers: {
                        tile: [
                            'porcelain'
                        ],
                        coping: [
                            'concrete'
                        ]
                    },
                    included: true
                },
                {
                    id: 'edge_glass_travertine',
                    label: 'Glass tile, travertine coping',
                    answers: {
                        tile: [
                            'glass'
                        ],
                        coping: [
                            'travertine'
                        ]
                    }
                },
                {
                    id: 'edge_stone',
                    label: 'Natural stone tile and coping',
                    answers: {
                        tile: [
                            'stone'
                        ],
                        coping: [
                            'stone'
                        ]
                    }
                }
            ]
        },
        {
            id: 'deck',
            title: 'Deck',
            view: 'aerial',
            kind: 'single',
            rows: [
                {
                    id: 'deck_resurface',
                    label: 'Resurface the existing deck',
                    answers: {
                        deck: [
                            'resurface'
                        ]
                    },
                    included: true
                },
                {
                    id: 'deck_pavers',
                    label: 'New stone pavers',
                    answers: {
                        deck: [
                            'pavers'
                        ]
                    }
                },
                {
                    id: 'deck_porcelain',
                    label: 'New porcelain deck',
                    note: 'Large-format, stays cooler underfoot',
                    answers: {
                        deck: [
                            'porcelain'
                        ]
                    }
                }
            ]
        },
        {
            id: 'features',
            title: 'Pool features',
            view: 'aerial',
            kind: 'multi',
            rows: [
                {
                    id: 'spa',
                    label: 'Spa',
                    note: 'Raised spa with a spillover',
                    answers: {
                        scope: [
                            'features'
                        ],
                        features: [
                            'spa'
                        ]
                    }
                },
                {
                    id: 'baja',
                    label: 'Baja shelf',
                    note: 'Shallow lounging ledge',
                    answers: {
                        scope: [
                            'features'
                        ],
                        features: [
                            'baja'
                        ]
                    }
                },
                {
                    id: 'fire_bowls',
                    label: 'Fire bowls',
                    note: 'A pair on the pool edge',
                    answers: {
                        scope: [
                            'features'
                        ],
                        features: [
                            'fire'
                        ]
                    },
                    view: 'evening'
                },
                {
                    id: 'water_bowls',
                    label: 'Water bowls',
                    note: 'A pair spilling into the pool',
                    answers: {
                        scope: [
                            'features'
                        ],
                        features: [
                            'water'
                        ]
                    }
                },
                {
                    id: 'led_lights',
                    label: 'Colour LED lights',
                    note: 'Two lights, set any colour',
                    answers: {
                        scope: [
                            'features'
                        ],
                        features: [
                            'lighting'
                        ]
                    },
                    view: 'evening'
                }
            ]
        },
        {
            id: 'backyard',
            title: 'Backyard',
            view: 'aerial',
            kind: 'multi',
            rows: [
                {
                    id: 'outdoor_kitchen',
                    label: 'Outdoor kitchen',
                    note: 'Grill, counter and storage',
                    answers: {
                        project: [
                            'backyard'
                        ],
                        extras: [
                            'kitchen'
                        ]
                    }
                },
                {
                    id: 'patio_cover',
                    label: 'Patio cover',
                    note: 'Shade over the lounge',
                    answers: {
                        project: [
                            'backyard'
                        ],
                        extras: [
                            'patio_cover'
                        ]
                    }
                },
                {
                    id: 'fire_pit',
                    label: 'Fire pit',
                    note: 'Built-in, with seating',
                    answers: {
                        project: [
                            'backyard'
                        ],
                        extras: [
                            'fire_pit'
                        ]
                    }
                },
                {
                    id: 'turf_planting',
                    label: 'Turf and planting',
                    answers: {
                        project: [
                            'backyard'
                        ],
                        extras: [
                            'turf_planting'
                        ]
                    }
                }
            ]
        },
        {
            id: 'equipment',
            title: 'Equipment',
            kind: 'multi',
            note: 'A new variable-speed pump and filter is included.',
            rows: [
                {
                    id: 'heater',
                    label: 'Heater',
                    note: 'Swim more of the year',
                    answers: {
                        equipment: [
                            'heater'
                        ]
                    }
                },
                {
                    id: 'automation',
                    label: 'Automation',
                    note: 'Run it all from your phone',
                    answers: {
                        equipment: [
                            'automation'
                        ]
                    }
                },
                {
                    id: 'salt',
                    label: 'Salt system',
                    note: 'Softer water, less chlorine',
                    answers: {
                        equipment: [
                            'salt'
                        ]
                    }
                }
            ]
        }
    ],
    bundle: {
        id: 'luxe',
        label: 'Go Luxe',
        headline: 'Our six signature upgrades, bundled for 10% less.',
        rows: [
            'pebble',
            'edge_glass_travertine',
            'deck_porcelain',
            'spa',
            'fire_bowls'
        ],
        discountPct: 0.1,
        includes: [
            'Pebble finish',
            'Glass waterline tile',
            'Travertine coping',
            'Porcelain deck',
            'Raised spa',
            'Pair of fire bowls'
        ]
    },
    photos: photoMatrix(VIEWS),
    photoNote: 'Photos show example designs (AI-assisted, based on Pool Masters projects), not your yard.',
    // Real Pool Masters LA jobs, unedited (permission granted): the "Recent projects" strip.
    projects: [
        {
            src: `${DIR}projects/hilltop-pool-spa-baja-shelf.webp`,
            alt: 'Hilltop pool and spa with a Baja shelf by Pool Masters LA',
            caption: 'Hilltop pool, spa and Baja shelf'
        },
        {
            src: `${DIR}projects/long-pool-raised-spa.webp`,
            alt: 'Long pool with a raised spa by Pool Masters LA',
            caption: 'Long pool with a raised spa'
        },
        {
            src: `${DIR}projects/led-pool-spa-night.webp`,
            alt: 'Pool and spa lit with LED lights at night by Pool Masters LA',
            caption: 'LED lighting at night'
        },
        {
            src: `${DIR}projects/overhead-pool-blue-umbrellas.webp`,
            alt: 'Overhead view of a pool with blue umbrellas by Pool Masters LA',
            caption: 'Pool deck from above'
        },
        {
            src: `${DIR}projects/covered-outdoor-kitchen.webp`,
            alt: 'Covered outdoor kitchen next to a pool by Pool Masters LA',
            caption: 'Covered outdoor kitchen'
        },
        {
            src: `${DIR}projects/fire-and-water-bowls.webp`,
            alt: 'Fire and water bowls on a pool edge by Pool Masters LA',
            caption: 'Fire and water bowls'
        }
    ]
};
}),
"[project]/content/estimators/pool-masters-funnel.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_MASTERS_FUNNEL",
    ()=>POOL_MASTERS_FUNNEL
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$configurator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/pool-masters-configurator.ts [app-rsc] (ecmascript)");
;
/*
 * Pool Masters LA's simple mobile funnel (experience 'funnel'): a landing page,
 * then exactly three taps of choice (size, finish, extras), the contact step
 * and the booking step. Owner's brief: "too much going on = too many
 * questions; it should feel straightforward and simple." Equipment and site
 * questions are left to the free on-site visit.
 *
 * Every option maps to the one-page configurator's models and rows
 * (./pool-masters-configurator.ts), so prices come from the same example
 * price table (lib/estimator/templates/pool.ts; still examples while
 * pricesConfirmed is false) and the photos are its pre-rendered files.
 *
 * - Standard = the configurator's included design (white plaster, porcelain
 *   waterline tile, concrete coping, resurfaced deck, new pump and filter).
 * - Luxe = pebble, glass tile + travertine coping, porcelain deck. Priced as
 *   plain rows: the Go Luxe bundle discount is never applied here.
 * - Extras: just the pool / + raised spa / + spa, outdoor kitchen, patio cover
 *   and fire bowls.
 */ const DIR = '/estimator/pool-masters/configurator/';
const FUNNEL_DIR = '/estimator/pool-masters/funnel/';
/** Shown if a to-scale plan image fails to load. */ const SIZE_FALLBACK = {
    src: `${DIR}aerial-resurface.webp`,
    srcSm: `${DIR}aerial-resurface-sm.webp`,
    alt: 'Drone view of a rectangular pool with a freshly resurfaced light concrete deck (example design)'
};
function sizePlan(id, dims) {
    return {
        src: `${FUNNEL_DIR}size-${id}.webp`,
        srcSm: `${FUNNEL_DIR}size-${id}-sm.webp`,
        widths: {
            sm: 800,
            full: 1200
        },
        alt: `Top-down plan of a rectangular pool about ${dims} (to scale)`,
        fallback: SIZE_FALLBACK
    };
}
const POOL_MASTERS_FUNNEL = {
    landing: {
        // One line on a phone (Buildoly's bar); the Inland Empire = Riverside and San Bernardino counties.
        announcement: 'Serving LA, OC, Ventura & the Inland Empire',
        headline: 'Backyard pools, remodeled just for you',
        subline: 'Design your pool in 60 seconds and get a ballpark price, with a free on-site estimate.',
        cta: 'Design your pool',
        heroPhoto: {
            src: `${DIR}evening-pebble-fire-spa.webp`,
            srcSm: `${DIR}evening-pebble-fire-spa-sm.webp`
        },
        heroAlt: 'A remodeled pool and raised spa at dusk with a deep blue pebble finish and two lit fire bowls (example design)',
        // Real Pool Masters LA jobs, unedited (permission granted).
        projects: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$configurator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_CONFIGURATOR"].projects?.filter((p)=>[
                'hilltop-pool-spa-baja-shelf',
                'long-pool-raised-spa',
                'covered-outdoor-kitchen'
            ].some((name)=>p.src.includes(name)))
    },
    steps: [
        {
            id: 'size',
            label: 'Select your pool size.',
            defaultOption: 'classic',
            options: [
                {
                    id: 'compact',
                    title: 'Compact',
                    subtitle: 'About 24 × 12 ft',
                    model: 'small'
                },
                {
                    id: 'classic',
                    title: 'Classic',
                    subtitle: 'About 30 × 15 ft',
                    model: 'medium'
                },
                {
                    id: 'estate',
                    title: 'Estate',
                    subtitle: 'About 36 × 18 ft or larger',
                    model: 'large'
                }
            ],
            photo: {
                kind: 'option',
                photos: {
                    compact: sizePlan('compact', '24 × 12 ft'),
                    classic: sizePlan('classic', '30 × 15 ft'),
                    estate: sizePlan('estate', '36 × 18 ft')
                }
            }
        },
        {
            id: 'finish',
            label: 'Choose your finish.',
            options: [
                {
                    id: 'standard',
                    title: 'Standard',
                    subtitle: 'Plaster, porcelain tile, concrete coping'
                },
                {
                    id: 'luxe',
                    title: 'Luxe',
                    subtitle: 'Pebble, glass tile, travertine, porcelain deck',
                    rows: [
                        'pebble',
                        'edge_glass_travertine',
                        'deck_porcelain'
                    ]
                }
            ],
            // poolside-plaster-classic vs poolside-pebble-premium (+ "-spa" once a spa is picked).
            photo: {
                kind: 'view',
                view: 'poolside'
            }
        },
        {
            id: 'extras',
            label: 'Add the extras.',
            options: [
                {
                    id: 'pool',
                    title: 'Just the pool',
                    short: 'Pool only',
                    subtitle: 'No spa or backyard extras'
                },
                {
                    id: 'spa',
                    title: 'Add a spa',
                    short: 'With spa',
                    subtitle: 'Raised spa with a spillover',
                    rows: [
                        'spa'
                    ]
                },
                {
                    id: 'backyard',
                    title: 'The full backyard',
                    short: 'Full backyard',
                    subtitle: 'Spa, kitchen, patio cover, fire bowls',
                    rows: [
                        'spa',
                        'outdoor_kitchen',
                        'patio_cover',
                        'fire_bowls'
                    ]
                }
            ],
            // e.g. aerial-resurface, aerial-porcelain-pebble-spa, aerial-resurface-spa-yard.
            photo: {
                kind: 'view',
                view: 'aerial'
            },
            cta: 'Get my estimate'
        }
    ],
    contactStep: {
        eyebrow: 'Last step',
        headline: 'Your estimate is ready.',
        subline: 'Where should we send it?',
        cta: 'Get my estimate',
        // Name, email, phone, home address, then this (owner: ask it, in words that make sense).
        homeowner: {
            label: 'Are you the homeowner?',
            yes: 'Yes',
            no: 'No'
        },
        trustLine: 'Licensed & insured · CSLB #1112793'
    },
    bookingStep: {
        headline: 'Book your free call',
        priceEyebrow: '{options}',
        priceNote: 'Ballpark price, not a quote. Your firm price is set at your free on-site visit.',
        financingLabel: 'Financing available',
        bookingTitle: 'Pick a time for a free 30-minute call.',
        callPrompt: 'Prefer to talk now? Call'
    },
    configurator: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$configurator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_CONFIGURATOR"],
    // Footer only (owner: no badge on the photos).
    photoNote: 'Photos show example designs, AI-assisted from Pool Masters projects.'
};
}),
"[project]/content/estimators/pool-masters-photos.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_MASTERS_GALLERY",
    ()=>POOL_MASTERS_GALLERY,
    "POOL_MASTERS_OPTION_IMAGES",
    ()=>POOL_MASTERS_OPTION_IMAGES
]);
/*
 * Pool Masters LA job photos for the estimator (the owner's own project and
 * drone photos, used with permission). Files live in
 * public/estimator/pool-masters/; re-export them with
 * `node scripts/generate-scene-textures.mjs photos <dir>` (metadata stripped).
 */ const DIR = '/estimator/pool-masters/';
/** 720 px copies for the small option and look tiles (same names, metadata stripped). */ const THUMBS = `${DIR}thumbs/`;
const POOL_MASTERS_GALLERY = [
    {
        src: `${DIR}pool-umbrella-spa-baja-shelf.webp`,
        thumb: `${THUMBS}pool-umbrella-spa-baja-shelf.webp`,
        alt: 'Sunny hilltop pool and spa with a white umbrella and in-water loungers on the Baja shelf, and pavers set in turf',
        caption: 'Baja shelf and spa with a view'
    },
    {
        src: `${DIR}overhead-pool-turf-bands-pavers.webp`,
        thumb: `${THUMBS}overhead-pool-turf-bands-pavers.webp`,
        alt: 'Drone view of a long pool with a spa, a dark wood deck, blue umbrellas and large pavers separated by turf bands',
        caption: 'Pavers with turf bands, from above'
    },
    {
        src: `${DIR}baja-shelf-loungers-blue-umbrellas.webp`,
        thumb: `${THUMBS}baja-shelf-loungers-blue-umbrellas.webp`,
        alt: 'Wide shallow Baja shelf holding two white loungers in clear turquoise water, with blue umbrellas on the deck',
        caption: 'Baja shelf with in-water loungers'
    },
    {
        src: `${DIR}raised-dark-tile-spa-long-pool.webp`,
        thumb: `${THUMBS}raised-dark-tile-spa-long-pool.webp`,
        alt: 'Angular raised spa faced in dark tile at the end of a long pool, beside pale pavers and turf bands',
        caption: 'Raised spa in dark tile'
    },
    {
        src: `${DIR}fire-water-bowls-closeup.webp`,
        thumb: `${THUMBS}fire-water-bowls-closeup.webp`,
        alt: 'Two black bowls on pedestals with fire burning on top and water spilling into the pool',
        caption: 'Fire and water bowls'
    },
    {
        src: `${DIR}night-led-pool-spa.webp`,
        thumb: `${THUMBS}night-led-pool-spa.webp`,
        alt: 'Pool and spa glowing purple and blue with LED lights at dusk, with uplit planting behind',
        caption: 'Color LED lighting at night'
    },
    {
        src: `${DIR}covered-outdoor-kitchen-bar.webp`,
        thumb: `${THUMBS}covered-outdoor-kitchen-bar.webp`,
        alt: 'Outdoor kitchen with a stone bar counter and stools under a slatted shade cover, with desert planting',
        caption: 'Covered outdoor kitchen and bar'
    },
    {
        src: `${DIR}modern-pool-ipe-deck-overhead.webp`,
        thumb: `${THUMBS}modern-pool-ipe-deck-overhead.webp`,
        alt: 'Straight-down view of a compact modern pool and spa with a warm ipe wood deck, loungers and turf',
        caption: 'Modern pool with an ipe deck'
    }
];
const POOL_MASTERS_OPTION_IMAGES = {
    'features.baja': `${THUMBS}baja-shelf-loungers-blue-umbrellas.webp`,
    'features.spa': `${THUMBS}raised-dark-tile-spa-long-pool.webp`,
    'features.water': `${THUMBS}water-bowl-spill-closeup.webp`,
    'features.fire': `${THUMBS}fire-bowl-flame-closeup.webp`,
    'features.lighting': `${THUMBS}night-led-pool-spa.webp`,
    'extras.kitchen': `${THUMBS}covered-outdoor-kitchen-bar.webp`,
    'extras.patio_cover': `${THUMBS}covered-lounge-pool-dusk.webp`,
    'extras.fire_pit': `${THUMBS}fire-pit-stone-wall-seating.webp`,
    'extras.turf_planting': `${THUMBS}pool-turf-planting-overhead.webp`
};
}),
"[project]/content/estimators/pool-masters.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_MASTERS_ESTIMATOR",
    ()=>POOL_MASTERS_ESTIMATOR
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$configurator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/pool-masters-configurator.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$funnel$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/pool-masters-funnel.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/pool-masters-photos.ts [app-rsc] (ecmascript)");
;
;
;
const POOL_MASTERS_ESTIMATOR = {
    slug: 'pool-masters',
    contractorName: 'Pool Masters LA',
    licenseLabel: 'CSLB #1112793',
    phone: '(818) 643-6888',
    website: 'https://poolmastersla.com',
    logoUrl: '/images/brand/poolmasters-logo.png',
    // From the brochure; the funnel's qualification gate (content/funnels/clients/pool-masters-la.json
    // zipPrefixes) covers the same five counties.
    serviceAreaLabel: 'Los Angeles, Orange, Ventura, Riverside and San Bernardino counties',
    financingNote: 'Financing is available through third-party lenders, including Lyon Financial. Ask about it during your free on-site estimate.',
    financingDisclosure: 'Financing is provided by third-party lenders, including Lyon Financial, and is subject to credit approval. Pool Masters LA is not a lender and does not make credit decisions, set rates, or guarantee approval. All financing terms, rates and monthly payments are determined by the lender based on your application.',
    funnelSlug: 'pool-masters',
    // Books a free 30-minute call on Pool Masters' own HomeQuote calendar (as the
    // pool-masters funnel, content/funnels/clients/pool-masters-la.json); no Calendly.
    calendarProvider: 'homequote',
    // The simple mobile funnel (landing, three taps, contact, then the range and booking):
    // prices never reach the browser before the contact step. The one-page
    // configurator spec stays attached (the funnel reuses its rows and photos).
    revealRange: 'after_contact',
    experience: 'funnel',
    funnel: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$funnel$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_FUNNEL"],
    configurator: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$configurator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_CONFIGURATOR"],
    // Mirrors the funnel's trackingPixels.consentMode.
    adMeasurement: 'opt_out',
    pricesConfirmed: false,
    options: Object.fromEntries(Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_OPTION_IMAGES"]).map(([key, image])=>[
            key,
            {
                image
            }
        ])),
    gallery: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2d$photos$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_GALLERY"],
    // From the brochure (V3): licensed & insured, serving SoCal since 2010, complimentary on-site estimates.
    facts: [
        'Licensed & insured',
        'Serving SoCal since 2010',
        'Free on-site estimate'
    ]
};
}),
"[project]/lib/estimator/templates/bathroom.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATHROOM_TEMPLATE",
    ()=>BATHROOM_TEMPLATE
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-rsc] (ecmascript)");
;
/**
 * The default bathroom remodel estimator template.
 *
 * EVERY PRICE IN THIS FILE IS AN EXAMPLE (pricesConfirmed: false). They are
 * plausible installed prices for Southern California bathroom remodels,
 * picked so a medium bathroom (10 x 8 ft, 80 sq ft of floor) lands in
 * realistic ranges: about $6k-$15k for a refresh, $25k-$50k for a full
 * remodel and $50k-$95k for a large spa-style primary bath. They are not any
 * contractor's real pricing; each one is confirmed or replaced before the page
 * drops the "Example prices" label and becomes indexable.
 *
 * Pricing model: the project pick carries the base (demo, prep, rough-in,
 * waterproofing, labor), per sq ft of floor for a refresh or full remodel and
 * flat for a tub-to-shower conversion. Each scope item then adds its own line:
 * the shower or tub, its wall tile, the vanity and counter, the floor (per sq
 * ft), paint, fixture finish and upgrades.
 *
 * Geometry reuses the pool path: the size presets are the room's floor
 * (length x width in feet), every shape factor is 1 (there is no shape
 * question) and depth is ignored. Typed dimensions between 4 and 30 ft win
 * over the preset.
 *
 * Ids here are a fixed contract with the scene (lib/estimator/scene/bath), the
 * screens, the lead route and the tests; rename labels freely but do not
 * rename ids. Extra options a contractor can swap in live in
 * ../catalog/bathroom.ts.
 */ /**
 * Help line for the questions whose option tiles show pictures. The only
 * bathroom pictures today are AI-generated style ideas (HomeQuote Network has
 * no jobs of its own), so the tiles say so; a contractor using photos of real
 * jobs would drop this line.
 */ const AI_PICTURES = 'Pictures are AI-generated style ideas.';
/** The three "not sure / no / yes" site questions share these options. */ const siteQuestion = (id, label, flag, extra = {})=>({
        id,
        label,
        kind: 'single',
        screen: 'property',
        options: [
            {
                id: 'no',
                label: 'No'
            },
            {
                id: 'yes',
                label: 'Yes',
                siteVisit: flag
            },
            {
                id: 'unsure',
                label: 'Not sure',
                siteVisit: flag
            }
        ],
        ...extra
    });
const BATHROOM_TEMPLATE = {
    trade: 'bathroom',
    title: 'Bathroom remodel',
    projectNoun: 'bathroom remodel',
    pricesConfirmed: false,
    minimumJob: 6000,
    roundTo: 500,
    limits: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEFAULT_LIMITS"],
    geometry: {
        // Room floor footprints.
        sizes: {
            small: {
                lengthFt: 8,
                widthFt: 5
            },
            medium: {
                lengthFt: 10,
                widthFt: 8
            },
            large: {
                lengthFt: 14,
                widthFt: 12
            }
        },
        // No depth for a room; kept at 0 so nothing can price by it.
        avgDepthFt: 0,
        shapes: {
            rectangle: {
                areaFactor: 1,
                perimeterFactor: 1
            },
            l_shape: {
                areaFactor: 1,
                perimeterFactor: 1
            },
            freeform: {
                areaFactor: 1,
                perimeterFactor: 1
            },
            unsure: {
                areaFactor: 1,
                perimeterFactor: 1
            }
        },
        deckSizes: {},
        limits: {
            minFt: 4,
            maxLengthFt: 30,
            maxWidthFt: 30,
            minDepthFt: 0,
            maxDepthFt: 0
        }
    },
    questions: [
        {
            id: 'project',
            label: 'What are you planning?',
            kind: 'single',
            role: 'project',
            options: [
                {
                    id: 'refresh',
                    label: 'Update the look',
                    note: 'New finishes, same layout',
                    price: {
                        unit: 'floor_sqft',
                        low: 30,
                        high: 60
                    }
                },
                {
                    id: 'full',
                    label: 'Full remodel',
                    note: 'Down to the studs, all new',
                    price: {
                        unit: 'floor_sqft',
                        low: 90,
                        high: 160
                    }
                },
                {
                    id: 'tub_to_shower',
                    label: 'Tub-to-shower conversion',
                    note: 'Swap the tub for a walk-in shower',
                    price: {
                        unit: 'flat',
                        low: 3000,
                        high: 6000
                    }
                }
            ]
        },
        {
            id: 'size',
            label: 'About how big is the bathroom?',
            help: 'Choose the closest. You can type exact measurements on the next step if you know them.',
            kind: 'single',
            role: 'size',
            options: [
                // Length x width, the order the lead, the result and the typed fields use.
                {
                    id: 'small',
                    label: 'Small',
                    note: 'Hall or guest bath, about 8 x 5 ft'
                },
                {
                    id: 'medium',
                    label: 'Medium',
                    note: 'About 10 x 8 ft'
                },
                {
                    id: 'large',
                    label: 'Large',
                    note: 'Primary bath, about 14 x 12 ft'
                },
                {
                    id: 'unsure',
                    label: 'Not sure',
                    siteVisit: 'Bathroom size to be measured'
                }
            ]
        },
        {
            id: 'package',
            label: 'Pick a starting point',
            help: 'Each package fills in the choices for you. You can change anything after.',
            kind: 'single',
            role: 'package',
            options: [
                {
                    id: 'refresh',
                    label: 'Refresh',
                    note: 'New vanity, floor and paint'
                },
                {
                    id: 'signature',
                    label: 'Signature',
                    note: 'The most popular full remodel'
                },
                {
                    id: 'spa',
                    label: 'Spa retreat',
                    note: 'Freestanding tub, stone and upgrades'
                },
                {
                    id: 'custom',
                    label: 'Build my own',
                    note: 'Choose each piece yourself'
                }
            ]
        },
        {
            id: 'scope',
            label: 'What to include',
            help: 'Pick everything you want done.',
            kind: 'multi',
            role: 'scope',
            options: [
                {
                    id: 'bathing',
                    label: 'Shower or tub',
                    note: 'New shower, tub and wall tile'
                },
                {
                    id: 'vanity',
                    label: 'Vanity and counter',
                    note: 'Cabinet, sink and countertop'
                },
                {
                    id: 'floor',
                    label: 'Floor',
                    note: 'New floor tile or plank'
                },
                {
                    id: 'walls',
                    label: 'Walls and paint',
                    note: 'Patch, prime and paint'
                },
                {
                    id: 'extras',
                    label: 'Upgrades',
                    note: 'Niche, bench, LED mirror and more'
                }
            ]
        },
        {
            id: 'bathing',
            label: 'Shower or tub?',
            help: AI_PICTURES,
            kind: 'single',
            summaryLabel: 'Shower/tub',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'bathing'
                ]
            },
            options: [
                {
                    id: 'walk_in',
                    label: 'Walk-in shower with glass',
                    note: 'Curbless or low curb, frameless glass',
                    price: {
                        unit: 'flat',
                        low: 7000,
                        high: 13000
                    }
                },
                {
                    id: 'tub_shower',
                    label: 'Tub and shower combo',
                    note: 'A new tub with a shower over it',
                    // A tub on a tub-to-shower conversion contradicts the project: confirmed in person.
                    siteVisit: 'A tub on a tub-to-shower conversion (plan confirmed in person)',
                    siteVisitWhen: {
                        questionId: 'project',
                        anyOf: [
                            'tub_to_shower'
                        ]
                    },
                    price: {
                        unit: 'flat',
                        low: 5000,
                        high: 9000
                    }
                },
                {
                    id: 'tub_and_shower',
                    label: 'Freestanding tub + separate shower',
                    note: 'Best in a medium or large bathroom',
                    // A layout and plumbing check in a small room, on a same-layout refresh, or on a tub-to-shower conversion.
                    siteVisit: 'Freestanding tub and separate shower (layout and plumbing check)',
                    siteVisitWhen: [
                        {
                            questionId: 'size',
                            anyOf: [
                                'small'
                            ]
                        },
                        {
                            questionId: 'project',
                            anyOf: [
                                'refresh',
                                'tub_to_shower'
                            ]
                        }
                    ],
                    price: {
                        unit: 'flat',
                        low: 14000,
                        high: 26000
                    }
                },
                {
                    id: 'keep',
                    label: 'Keep my current tub/shower',
                    note: 'Work around what is there',
                    siteVisit: 'Keeping the tub on a tub-to-shower conversion (plan confirmed in person)',
                    siteVisitWhen: {
                        questionId: 'project',
                        anyOf: [
                            'tub_to_shower'
                        ]
                    }
                }
            ]
        },
        {
            id: 'showerTile',
            label: 'Which shower wall tile?',
            kind: 'single',
            summaryLabel: 'Shower tile',
            showWhen: {
                questionId: 'bathing',
                anyOf: [
                    'walk_in',
                    'tub_shower',
                    'tub_and_shower'
                ]
            },
            options: [
                {
                    id: 'subway',
                    label: 'Classic subway',
                    note: 'Glossy 3 x 6 in, timeless',
                    price: {
                        unit: 'flat',
                        low: 2500,
                        high: 4500
                    }
                },
                {
                    id: 'large_porcelain',
                    label: 'Large porcelain',
                    note: 'Big slabs, fewer grout lines',
                    price: {
                        unit: 'flat',
                        low: 3500,
                        high: 6000
                    }
                },
                {
                    id: 'zellige',
                    label: 'Zellige',
                    note: 'Handmade look with soft shine',
                    price: {
                        unit: 'flat',
                        low: 5000,
                        high: 9000
                    }
                },
                {
                    id: 'marble',
                    label: 'Marble',
                    note: 'Natural stone with soft veining',
                    price: {
                        unit: 'flat',
                        low: 6000,
                        high: 11000
                    }
                }
            ]
        },
        {
            id: 'vanity',
            label: 'Which vanity?',
            help: AI_PICTURES,
            kind: 'single',
            summaryLabel: 'Vanity',
            screen: 'vanity',
            screenTitle: 'Your vanity',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'vanity'
                ]
            },
            options: [
                {
                    id: 'single',
                    label: 'Single vanity',
                    note: 'One sink, about 30-48 in',
                    price: {
                        unit: 'flat',
                        low: 1500,
                        high: 3500
                    }
                },
                {
                    id: 'double',
                    label: 'Double vanity',
                    note: 'Two sinks, about 60-72 in',
                    price: {
                        unit: 'flat',
                        low: 3500,
                        high: 7000
                    }
                },
                {
                    id: 'floating',
                    label: 'Floating vanity',
                    note: 'Wall-mounted, open below',
                    price: {
                        unit: 'flat',
                        low: 2500,
                        high: 5500
                    }
                }
            ]
        },
        {
            id: 'vanityFinish',
            label: 'Which cabinet finish?',
            kind: 'single',
            summaryLabel: 'Cabinet',
            screen: 'vanity',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'vanity'
                ]
            },
            options: [
                {
                    id: 'white',
                    label: 'White'
                },
                {
                    id: 'wood',
                    label: 'Natural wood'
                },
                {
                    id: 'navy_green',
                    label: 'Navy or green'
                },
                {
                    id: 'black',
                    label: 'Black'
                }
            ]
        },
        {
            id: 'counter',
            label: 'Which countertop?',
            kind: 'single',
            summaryLabel: 'Counter',
            screen: 'vanity',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'vanity'
                ]
            },
            options: [
                {
                    id: 'quartz_white',
                    label: 'White quartz',
                    note: 'Clean and low-maintenance',
                    price: {
                        unit: 'flat',
                        low: 1200,
                        high: 2800
                    }
                },
                {
                    id: 'marble_look',
                    label: 'Marble look',
                    note: 'Veined porcelain or quartz',
                    price: {
                        unit: 'flat',
                        low: 1500,
                        high: 3500
                    }
                },
                {
                    id: 'concrete',
                    label: 'Concrete',
                    note: 'Soft gray, modern',
                    price: {
                        unit: 'flat',
                        low: 1800,
                        high: 4000
                    }
                }
            ]
        },
        {
            id: 'floor',
            label: 'Which floor?',
            kind: 'single',
            summaryLabel: 'Floor',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'floor'
                ]
            },
            options: [
                {
                    id: 'porcelain_wood',
                    label: 'Wood-look porcelain',
                    note: 'Warm look, fully waterproof',
                    price: {
                        unit: 'floor_sqft',
                        low: 18,
                        high: 30
                    }
                },
                {
                    id: 'large_stone',
                    label: 'Large stone-look tile',
                    note: 'Big tiles, few grout lines',
                    price: {
                        unit: 'floor_sqft',
                        low: 20,
                        high: 35
                    }
                },
                {
                    id: 'hex_mosaic',
                    label: 'Hex mosaic',
                    note: 'Small tiles, classic and grippy',
                    price: {
                        unit: 'floor_sqft',
                        low: 25,
                        high: 40
                    }
                },
                {
                    id: 'lvp',
                    label: 'Luxury vinyl plank',
                    note: 'Budget-friendly and soft underfoot',
                    price: {
                        unit: 'floor_sqft',
                        low: 9,
                        high: 15
                    }
                }
            ]
        },
        {
            id: 'paint',
            label: 'Which wall color?',
            kind: 'single',
            summaryLabel: 'Walls',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'walls'
                ]
            },
            options: [
                {
                    id: 'soft_white',
                    label: 'Soft white',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1600
                    }
                },
                {
                    id: 'greige',
                    label: 'Warm greige',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1600
                    }
                },
                {
                    id: 'sage',
                    label: 'Sage green',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1600
                    }
                },
                {
                    id: 'navy',
                    label: 'Deep navy',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1600
                    }
                }
            ]
        },
        {
            id: 'metal',
            label: 'Which fixture finish?',
            help: 'Faucets, shower trim and hardware.',
            kind: 'single',
            summaryLabel: 'Fixtures',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'bathing',
                    'vanity'
                ]
            },
            options: [
                {
                    id: 'chrome',
                    label: 'Polished chrome',
                    price: {
                        unit: 'flat',
                        low: 600,
                        high: 1200
                    }
                },
                {
                    id: 'matte_black',
                    label: 'Matte black',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1600
                    }
                },
                {
                    id: 'brushed_gold',
                    label: 'Brushed gold',
                    price: {
                        unit: 'flat',
                        low: 1000,
                        high: 2000
                    }
                },
                {
                    id: 'brushed_nickel',
                    label: 'Brushed nickel',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1500
                    }
                }
            ]
        },
        {
            id: 'extras',
            label: 'Any upgrades?',
            help: `Optional. Pick any you would like. ${AI_PICTURES}`,
            kind: 'multi',
            summaryLabel: 'Upgrade',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'extras'
                ]
            },
            optional: true,
            options: [
                {
                    id: 'niche',
                    label: 'Shower niche',
                    note: 'Built-in shelf for bottles',
                    price: {
                        unit: 'flat',
                        low: 400,
                        high: 900
                    }
                },
                {
                    id: 'bench',
                    label: 'Shower bench',
                    note: 'Tiled seat in the shower',
                    price: {
                        unit: 'flat',
                        low: 800,
                        high: 1800
                    }
                },
                {
                    id: 'led_mirror',
                    label: 'LED mirror',
                    note: 'Lit mirror with anti-fog',
                    price: {
                        unit: 'flat',
                        low: 500,
                        high: 1200
                    }
                },
                {
                    id: 'heated_floor',
                    label: 'Heated floor',
                    note: 'Warm tile underfoot',
                    price: {
                        unit: 'flat',
                        low: 1800,
                        high: 3500
                    }
                },
                {
                    id: 'rain_head',
                    label: 'Rain shower head',
                    note: 'Ceiling or wall-arm rain head',
                    price: {
                        unit: 'flat',
                        low: 600,
                        high: 1500
                    }
                }
            ]
        },
        siteQuestion('plumbing', 'Moving the toilet, shower or any walls?', 'Moving plumbing or walls', {
            help: 'Keeping things where they are costs less. It is fine to say you are not sure.',
            screenTitle: 'About your bathroom'
        }),
        siteQuestion('damage', 'Any water damage, leaks or mold?', 'Water damage or mold'),
        siteQuestion('location', 'Is it upstairs, or in a condo or HOA building?', 'Upstairs or condo bathroom (access and building rules)')
    ],
    packages: [
        {
            id: 'refresh',
            label: 'Refresh',
            description: 'A fresh look without moving anything: new vanity, counter, floor and paint.',
            includes: [
                'Single vanity in white',
                'White quartz counter',
                'Luxury vinyl plank floor',
                'Fresh paint',
                'Brushed nickel fixtures'
            ],
            answers: {
                scope: [
                    'vanity',
                    'floor',
                    'walls'
                ],
                vanity: [
                    'single'
                ],
                vanityFinish: [
                    'white'
                ],
                counter: [
                    'quartz_white'
                ],
                floor: [
                    'lvp'
                ],
                paint: [
                    'soft_white'
                ],
                metal: [
                    'brushed_nickel'
                ]
            }
        },
        {
            id: 'signature',
            label: 'Signature',
            description: 'The full remodel most homeowners pick: a glass walk-in shower and all-new finishes.',
            includes: [
                'Walk-in shower with frameless glass',
                'Large porcelain shower tile',
                'Double vanity in natural wood',
                'Wood-look porcelain floor',
                'Brushed gold fixtures and a shower niche'
            ],
            answers: {
                scope: [
                    'bathing',
                    'vanity',
                    'floor',
                    'walls',
                    'extras'
                ],
                bathing: [
                    'walk_in'
                ],
                showerTile: [
                    'large_porcelain'
                ],
                vanity: [
                    'double'
                ],
                vanityFinish: [
                    'wood'
                ],
                counter: [
                    'quartz_white'
                ],
                floor: [
                    'porcelain_wood'
                ],
                paint: [
                    'greige'
                ],
                metal: [
                    'brushed_gold'
                ],
                extras: [
                    'niche'
                ]
            },
            popular: true
        },
        {
            id: 'spa',
            label: 'Spa retreat',
            description: 'The showpiece: freestanding tub, separate shower, marble and every comfort.',
            includes: [
                'Freestanding tub and separate glass shower',
                'Marble shower walls and large stone floor',
                'Floating vanity in navy or green, marble-look top',
                'Heated floor, rain head and LED mirror',
                'Shower bench and niche'
            ],
            answers: {
                scope: [
                    'bathing',
                    'vanity',
                    'floor',
                    'walls',
                    'extras'
                ],
                bathing: [
                    'tub_and_shower'
                ],
                showerTile: [
                    'marble'
                ],
                vanity: [
                    'floating'
                ],
                vanityFinish: [
                    'navy_green'
                ],
                counter: [
                    'marble_look'
                ],
                floor: [
                    'large_stone'
                ],
                paint: [
                    'soft_white'
                ],
                metal: [
                    'brushed_gold'
                ],
                extras: [
                    'niche',
                    'bench',
                    'led_mirror',
                    'heated_floor',
                    'rain_head'
                ]
            }
        }
    ],
    notIncluded: [
        'Moving plumbing, walls or windows',
        'Repairs for water damage, mold or subfloor',
        'Permits and plan fees',
        'Electrical panel or service upgrades',
        'Unforeseen conditions found once walls are opened'
    ],
    disclaimer: 'This is a ballpark range, not a quote. Your final price is set by a licensed local contractor after a free in-home consultation.'
};
}),
"[project]/lib/estimator/catalog/bathroom.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATHROOM_CATALOG",
    ()=>BATHROOM_CATALOG
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/templates/bathroom.ts [app-rsc] (ecmascript)");
;
/**
 * The fuller bathroom option catalog, behind the scenes. For each priced
 * question it holds the default template's options (so the two cannot drift
 * apart) plus a few extra options that are OFF by default: a contractor can
 * swap them in through contractor settings instead of writing them from
 * scratch. The live picture draws a swapped-in option with the closest look.
 *
 * Names are generic on purpose (no brands). Every price is an EXAMPLE, in
 * whole dollars, until a contractor confirms it.
 */ const fromTemplate = (questionId)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATHROOM_TEMPLATE"].questions.find((q)=>q.id === questionId)?.options ?? [];
const BATHROOM_CATALOG = {
    bathing: [
        ...fromTemplate('bathing'),
        {
            id: 'tub_only',
            label: 'Soaking tub only',
            note: 'A deep alcove tub, no shower',
            price: {
                unit: 'flat',
                low: 4000,
                high: 8000
            }
        },
        {
            id: 'steam_shower',
            label: 'Steam shower',
            note: 'Sealed glass, steam generator',
            siteVisit: 'Steam shower (electrical and venting)',
            price: {
                unit: 'flat',
                low: 14000,
                high: 25000
            }
        }
    ],
    showerTile: [
        ...fromTemplate('showerTile'),
        {
            id: 'ceramic',
            label: 'Ceramic',
            note: 'Budget-friendly classic',
            price: {
                unit: 'flat',
                low: 1800,
                high: 3500
            }
        },
        {
            id: 'terrazzo',
            label: 'Terrazzo look',
            note: 'Speckled porcelain',
            price: {
                unit: 'flat',
                low: 4000,
                high: 7000
            }
        }
    ],
    vanity: [
        ...fromTemplate('vanity'),
        {
            id: 'custom_built',
            label: 'Custom-built vanity',
            note: 'Made to fit your room',
            price: {
                unit: 'flat',
                low: 5000,
                high: 11000
            }
        }
    ],
    counter: [
        ...fromTemplate('counter'),
        {
            id: 'granite',
            label: 'Granite',
            note: 'Natural stone, many colors',
            price: {
                unit: 'flat',
                low: 1400,
                high: 3200
            }
        },
        {
            id: 'quartzite',
            label: 'Quartzite',
            note: 'Premium natural stone',
            price: {
                unit: 'flat',
                low: 2500,
                high: 5500
            }
        }
    ],
    floor: [
        ...fromTemplate('floor'),
        {
            id: 'ceramic',
            label: 'Ceramic tile',
            note: 'Budget-friendly tile',
            price: {
                unit: 'floor_sqft',
                low: 12,
                high: 20
            }
        },
        {
            id: 'marble',
            label: 'Marble tile',
            note: 'Polished natural stone',
            price: {
                unit: 'floor_sqft',
                low: 35,
                high: 60
            }
        }
    ],
    extras: [
        ...fromTemplate('extras'),
        {
            id: 'grab_bars',
            label: 'Grab bars',
            note: 'Two safety bars, priced each',
            price: {
                unit: 'each',
                low: 250,
                high: 500,
                quantity: 2
            }
        },
        {
            id: 'exhaust_fan',
            label: 'Quiet exhaust fan',
            note: 'Vented to the outside',
            price: {
                unit: 'flat',
                low: 500,
                high: 1200
            }
        },
        {
            id: 'smart_toilet',
            label: 'Smart toilet',
            note: 'Heated seat and bidet',
            siteVisit: 'Smart toilet (outlet near the toilet)',
            price: {
                unit: 'flat',
                low: 1500,
                high: 4000
            }
        }
    ]
};
}),
"[project]/lib/estimator/templates/pool.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_TEMPLATE",
    ()=>POOL_TEMPLATE
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/types.ts [app-rsc] (ecmascript)");
;
const POOL_TEMPLATE = {
    trade: 'pool',
    title: 'Pool remodel',
    projectNoun: 'pool project',
    pricesConfirmed: false,
    minimumJob: 5000,
    roundTo: 500,
    limits: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEFAULT_LIMITS"],
    geometry: {
        // Rectangle-equivalent footprints; the shape factors scale area and edge.
        sizes: {
            small: {
                lengthFt: 24,
                widthFt: 12
            },
            medium: {
                lengthFt: 30,
                widthFt: 15
            },
            large: {
                lengthFt: 36,
                widthFt: 18
            }
        },
        avgDepthFt: 5,
        shapes: {
            rectangle: {
                areaFactor: 1,
                perimeterFactor: 1
            },
            l_shape: {
                areaFactor: 0.9,
                perimeterFactor: 1.15
            },
            freeform: {
                areaFactor: 0.85,
                perimeterFactor: 1.1
            },
            unsure: {
                areaFactor: 1,
                perimeterFactor: 1
            }
        },
        deckSizes: {
            small: 300,
            medium: 600,
            large: 1000
        },
        limits: {
            minFt: 6,
            maxLengthFt: 80,
            maxWidthFt: 50,
            minDepthFt: 3,
            maxDepthFt: 12
        }
    },
    questions: [
        {
            id: 'project',
            label: 'What are you planning?',
            kind: 'single',
            role: 'project',
            options: [
                {
                    id: 'remodel',
                    label: 'Remodel my pool',
                    note: 'Update what is already there'
                },
                {
                    id: 'backyard',
                    label: 'Pool and backyard',
                    note: 'Pool plus outdoor living upgrades'
                }
            ]
        },
        {
            id: 'shape',
            label: 'What shape is your pool?',
            help: 'A rough idea is fine.',
            kind: 'single',
            role: 'shape',
            options: [
                {
                    id: 'rectangle',
                    label: 'Rectangle'
                },
                {
                    id: 'l_shape',
                    label: 'L-shape'
                },
                {
                    id: 'freeform',
                    label: 'Freeform',
                    note: 'Curves, kidney or organic shapes'
                },
                {
                    id: 'unsure',
                    label: 'Not sure'
                }
            ]
        },
        {
            id: 'size',
            label: 'About how big is it?',
            help: 'Choose the closest. You can type exact measurements on the next step if you know them.',
            kind: 'single',
            role: 'size',
            options: [
                {
                    id: 'small',
                    label: 'Small',
                    note: 'About 24 x 12 ft'
                },
                {
                    id: 'medium',
                    label: 'Medium',
                    note: 'About 30 x 15 ft'
                },
                {
                    id: 'large',
                    label: 'Large',
                    note: 'About 36 x 18 ft'
                },
                {
                    id: 'unsure',
                    label: 'Not sure',
                    siteVisit: 'Pool size to be measured'
                }
            ]
        },
        {
            id: 'package',
            label: 'Pick a starting point',
            help: 'Each package fills in the choices for you. You can change anything after.',
            kind: 'single',
            role: 'package',
            options: [
                {
                    id: 'refresh',
                    label: 'Refresh',
                    note: 'A fresh look for the pool itself'
                },
                {
                    id: 'signature',
                    label: 'Signature',
                    note: 'Our most popular upgrade'
                },
                {
                    id: 'transformation',
                    label: 'Transformation',
                    note: 'A full pool and deck makeover'
                },
                {
                    id: 'custom',
                    label: 'Build my own',
                    note: 'Choose each piece yourself'
                }
            ]
        },
        {
            id: 'scope',
            label: 'What to include',
            help: 'Pick everything you want done.',
            kind: 'multi',
            role: 'scope',
            options: [
                {
                    id: 'surface',
                    label: 'Pool surface',
                    note: 'Replaster or resurface the inside'
                },
                {
                    id: 'tile_coping',
                    label: 'Tile and coping',
                    note: 'The band at the water line and the edge'
                },
                {
                    id: 'deck',
                    label: 'Deck',
                    note: 'The area around the pool'
                },
                {
                    id: 'features',
                    label: 'Pool features',
                    note: 'Shelf, spa, water and fire, lighting'
                },
                {
                    id: 'equipment',
                    label: 'Equipment',
                    note: 'Pump, heater, automation'
                }
            ]
        },
        {
            id: 'surface',
            label: 'Which pool surface?',
            help: 'This is the finish you see and feel inside the pool.',
            kind: 'single',
            summaryLabel: 'Surface',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'surface'
                ]
            },
            options: [
                {
                    id: 'plaster',
                    label: 'Plaster',
                    note: 'Classic smooth white finish',
                    swatch: 'plaster',
                    price: {
                        unit: 'interior_sqft',
                        low: 8,
                        high: 11
                    }
                },
                {
                    id: 'quartz',
                    label: 'Quartz',
                    note: 'Smooth and more durable, with sparkle',
                    swatch: 'quartz',
                    price: {
                        unit: 'interior_sqft',
                        low: 10,
                        high: 14
                    }
                },
                {
                    id: 'pebble',
                    label: 'Pebble',
                    note: 'Textured, long-lasting, natural look',
                    swatch: 'pebble',
                    price: {
                        unit: 'interior_sqft',
                        low: 14,
                        high: 19
                    }
                },
                // Spans the cheapest low to the priciest high of the options above.
                {
                    id: 'unsure',
                    label: 'Help me choose',
                    note: 'We will show the full range',
                    price: {
                        unit: 'interior_sqft',
                        low: 8,
                        high: 19
                    }
                }
            ]
        },
        {
            id: 'tile',
            label: 'Which waterline tile?',
            help: 'The row of tile at the water line.',
            kind: 'single',
            summaryLabel: 'Waterline tile',
            screen: 'edge',
            screenTitle: 'Tile & coping',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'tile_coping'
                ]
            },
            options: [
                {
                    id: 'porcelain',
                    label: 'Porcelain',
                    note: 'Clean, durable, many colors',
                    swatch: 'tile_porcelain',
                    price: {
                        unit: 'perimeter_lf',
                        low: 35,
                        high: 55
                    }
                },
                {
                    id: 'glass',
                    label: 'Glass',
                    note: 'Bright and glossy',
                    swatch: 'tile_glass',
                    price: {
                        unit: 'perimeter_lf',
                        low: 60,
                        high: 90
                    }
                },
                {
                    id: 'stone',
                    label: 'Natural stone',
                    note: 'Earthy, one-of-a-kind look',
                    swatch: 'stone',
                    price: {
                        unit: 'perimeter_lf',
                        low: 45,
                        high: 75
                    }
                }
            ]
        },
        {
            id: 'coping',
            label: 'Which coping?',
            help: 'The cap along the edge of the pool.',
            kind: 'single',
            summaryLabel: 'Coping',
            screen: 'edge',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'tile_coping'
                ]
            },
            options: [
                {
                    id: 'concrete',
                    label: 'Concrete',
                    note: 'Budget-friendly and sturdy',
                    swatch: 'concrete',
                    price: {
                        unit: 'perimeter_lf',
                        low: 40,
                        high: 60
                    }
                },
                {
                    id: 'travertine',
                    label: 'Travertine',
                    note: 'Soft natural stone that stays cool',
                    swatch: 'travertine',
                    price: {
                        unit: 'perimeter_lf',
                        low: 65,
                        high: 95
                    }
                },
                {
                    id: 'stone',
                    label: 'Natural stone',
                    note: 'Premium cut stone',
                    swatch: 'stone',
                    price: {
                        unit: 'perimeter_lf',
                        low: 55,
                        high: 100
                    }
                },
                {
                    id: 'unsure',
                    label: 'Help me choose',
                    note: 'We will show the full range',
                    price: {
                        unit: 'perimeter_lf',
                        low: 40,
                        high: 100
                    }
                }
            ]
        },
        {
            id: 'deck',
            label: 'Which deck material?',
            kind: 'single',
            summaryLabel: 'Deck',
            screen: 'deck',
            screenTitle: 'Your deck',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'deck'
                ]
            },
            options: [
                {
                    id: 'pavers',
                    label: 'Pavers',
                    note: 'Interlocking stone pavers',
                    swatch: 'pavers',
                    price: {
                        unit: 'deck_sqft',
                        low: 25,
                        high: 41
                    }
                },
                {
                    id: 'concrete',
                    label: 'Concrete',
                    note: 'Poured, with a broom or stamped finish',
                    swatch: 'concrete',
                    price: {
                        unit: 'deck_sqft',
                        low: 12,
                        high: 20
                    }
                },
                {
                    id: 'porcelain',
                    label: 'Porcelain',
                    note: 'Large-format tile, stays cooler underfoot',
                    swatch: 'porcelain_deck',
                    price: {
                        unit: 'deck_sqft',
                        low: 35,
                        high: 55
                    }
                },
                {
                    id: 'resurface',
                    label: 'Resurface existing',
                    note: 'Keep your deck, give it a new coating',
                    swatch: 'deck_resurface',
                    price: {
                        unit: 'deck_sqft',
                        low: 6,
                        high: 12
                    }
                }
            ]
        },
        {
            id: 'deckSize',
            label: 'About how big is the deck?',
            help: 'The paved area around and beside the pool.',
            kind: 'single',
            role: 'deckSize',
            screen: 'deck',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'deck'
                ]
            },
            options: [
                {
                    id: 'small',
                    label: 'Small',
                    note: 'About 300 sq ft'
                },
                {
                    id: 'medium',
                    label: 'Medium',
                    note: 'About 600 sq ft'
                },
                {
                    id: 'large',
                    label: 'Large',
                    note: 'About 1,000 sq ft'
                }
            ]
        },
        {
            id: 'features',
            label: 'Which pool features?',
            help: 'Pick any you would like.',
            kind: 'multi',
            summaryLabel: 'Feature',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'features'
                ]
            },
            options: [
                {
                    id: 'baja',
                    label: 'Baja shelf',
                    note: 'A shallow lounging area',
                    price: {
                        unit: 'flat',
                        low: 5000,
                        high: 9000
                    }
                },
                {
                    id: 'spa',
                    label: 'Spa',
                    note: 'Attached hot tub',
                    siteVisit: 'New or raised spa (plumbing, electrical and structure)',
                    price: {
                        unit: 'flat',
                        low: 18000,
                        high: 35000
                    }
                },
                {
                    id: 'water',
                    label: 'Water bowls',
                    note: 'Two bowls, priced each',
                    price: {
                        unit: 'each',
                        low: 1500,
                        high: 3000,
                        quantity: 2
                    }
                },
                {
                    id: 'fire',
                    label: 'Fire bowls',
                    note: 'Two bowls, priced each',
                    price: {
                        unit: 'each',
                        low: 1800,
                        high: 3500,
                        quantity: 2
                    }
                },
                {
                    id: 'lighting',
                    label: 'LED pool lights',
                    note: 'Two lights, priced each',
                    price: {
                        unit: 'each',
                        low: 700,
                        high: 1200,
                        quantity: 2
                    }
                }
            ]
        },
        {
            id: 'equipment',
            label: 'Which equipment?',
            help: 'New equipment is often worth doing while the pool is open.',
            kind: 'multi',
            summaryLabel: 'Equipment',
            showWhen: {
                questionId: 'scope',
                anyOf: [
                    'equipment'
                ]
            },
            options: [
                {
                    id: 'pump_filter',
                    label: 'Pump and filter',
                    note: 'Energy-saving variable-speed pump',
                    price: {
                        unit: 'flat',
                        low: 2500,
                        high: 4500
                    }
                },
                {
                    id: 'heater',
                    label: 'Heater',
                    note: 'Swim more of the year',
                    price: {
                        unit: 'flat',
                        low: 3500,
                        high: 6500
                    }
                },
                {
                    id: 'automation',
                    label: 'Automation',
                    note: 'Control it all from your phone',
                    price: {
                        unit: 'flat',
                        low: 2500,
                        high: 5000
                    }
                },
                {
                    id: 'salt',
                    label: 'Salt system',
                    note: 'Softer water, less chlorine handling',
                    price: {
                        unit: 'flat',
                        low: 1800,
                        high: 3200
                    }
                }
            ]
        },
        {
            id: 'extras',
            label: 'Any backyard extras?',
            help: 'Optional. Pick any you would like.',
            kind: 'multi',
            summaryLabel: 'Backyard',
            showWhen: {
                questionId: 'project',
                anyOf: [
                    'backyard'
                ]
            },
            optional: true,
            options: [
                {
                    id: 'kitchen',
                    label: 'Outdoor kitchen',
                    note: 'Grill, counter and storage',
                    siteVisit: 'Outdoor kitchen (gas and electrical)',
                    price: {
                        unit: 'flat',
                        low: 8000,
                        high: 25000
                    }
                },
                {
                    id: 'patio_cover',
                    label: 'Patio cover',
                    note: 'Shade for the seating area',
                    price: {
                        unit: 'flat',
                        low: 9000,
                        high: 22000
                    }
                },
                {
                    id: 'turf_planting',
                    label: 'Turf and planting',
                    note: 'Artificial turf and new plants',
                    price: {
                        unit: 'flat',
                        low: 4000,
                        high: 12000
                    }
                },
                {
                    id: 'fire_pit',
                    label: 'Fire pit',
                    note: 'A built-in gathering spot',
                    price: {
                        unit: 'flat',
                        low: 2500,
                        high: 7000
                    }
                }
            ]
        },
        {
            id: 'cracks',
            label: 'Any cracks, leaks or water loss?',
            help: 'It is fine to say you are not sure.',
            kind: 'single',
            screen: 'property',
            screenTitle: 'About your property',
            options: [
                {
                    id: 'no',
                    label: 'No'
                },
                {
                    id: 'yes',
                    label: 'Yes',
                    siteVisit: 'Cracks, leaks or water loss'
                },
                {
                    id: 'unsure',
                    label: 'Not sure',
                    siteVisit: 'Cracks, leaks or water loss'
                }
            ]
        },
        {
            id: 'access',
            label: 'Is backyard access narrow?',
            help: 'For example a gate under about 3 feet wide.',
            kind: 'single',
            screen: 'property',
            options: [
                {
                    id: 'no',
                    label: 'No'
                },
                {
                    id: 'yes',
                    label: 'Yes',
                    siteVisit: 'Narrow backyard access'
                },
                {
                    id: 'unsure',
                    label: 'Not sure',
                    siteVisit: 'Narrow backyard access'
                }
            ]
        },
        {
            id: 'hillside',
            label: 'Is your home on a hillside?',
            kind: 'single',
            screen: 'property',
            options: [
                {
                    id: 'no',
                    label: 'No'
                },
                {
                    id: 'yes',
                    label: 'Yes',
                    siteVisit: 'Hillside lot'
                },
                {
                    id: 'unsure',
                    label: 'Not sure',
                    siteVisit: 'Hillside lot'
                }
            ]
        }
    ],
    packages: [
        {
            id: 'refresh',
            label: 'Refresh',
            description: 'A fresh look for the pool itself: new surface, tile and edge.',
            includes: [
                'New quartz pool surface',
                'Porcelain waterline tile',
                'Concrete coping'
            ],
            answers: {
                scope: [
                    'surface',
                    'tile_coping'
                ],
                surface: [
                    'quartz'
                ],
                tile: [
                    'porcelain'
                ],
                coping: [
                    'concrete'
                ]
            }
        },
        {
            id: 'signature',
            label: 'Signature',
            description: 'A step up in finish, plus new equipment and lighting.',
            includes: [
                'Pebble pool surface',
                'Glass waterline tile',
                'Travertine coping',
                'New pump and filter',
                'LED pool lights'
            ],
            answers: {
                scope: [
                    'surface',
                    'tile_coping',
                    'features',
                    'equipment'
                ],
                surface: [
                    'pebble'
                ],
                tile: [
                    'glass'
                ],
                coping: [
                    'travertine'
                ],
                features: [
                    'lighting'
                ],
                equipment: [
                    'pump_filter'
                ]
            },
            popular: true
        },
        {
            id: 'transformation',
            label: 'Transformation',
            description: 'The full makeover: everything in Signature plus a new deck and showpiece features.',
            includes: [
                'Everything in Signature',
                'New paver deck (medium size)',
                'Baja shelf',
                'Fire and water bowls',
                'Pool automation'
            ],
            answers: {
                scope: [
                    'surface',
                    'tile_coping',
                    'deck',
                    'features',
                    'equipment'
                ],
                surface: [
                    'pebble'
                ],
                tile: [
                    'glass'
                ],
                coping: [
                    'travertine'
                ],
                deck: [
                    'pavers'
                ],
                deckSize: [
                    'medium'
                ],
                features: [
                    'baja',
                    'water',
                    'fire',
                    'lighting'
                ],
                equipment: [
                    'pump_filter',
                    'automation'
                ]
            }
        }
    ],
    notIncluded: [
        'Structural repairs and leak detection',
        'Permits and plan fees',
        'Gas or electrical service changes',
        'Unforeseen conditions found once work begins'
    ],
    disclaimer: 'This is a ballpark range, not a quote. Your final price is set after a free on-site visit.'
};
}),
"[project]/lib/estimator/catalog/pool.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POOL_CATALOG",
    ()=>POOL_CATALOG
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/templates/pool.ts [app-rsc] (ecmascript)");
;
/**
 * The fuller pool option catalog, behind the scenes. For each priced question
 * it holds the default template's options (so the two cannot drift apart) plus
 * extra options that are OFF by default: a contractor can swap them in through
 * contractor settings (customOptions / option overrides) instead of writing
 * them from scratch.
 *
 * Names are generic on purpose (no brands). Like the template, every price is
 * an EXAMPLE per unit, in whole dollars, until a contractor confirms it.
 */ /** The template's options for one question, so the catalog always includes them. */ const fromTemplate = (questionId)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_TEMPLATE"].questions.find((q)=>q.id === questionId)?.options ?? [];
const POOL_CATALOG = {
    surface: [
        ...fromTemplate('surface'),
        {
            id: 'colored_plaster',
            label: 'Colored plaster',
            note: 'Plaster tinted gray, blue or charcoal',
            price: {
                unit: 'interior_sqft',
                low: 9,
                high: 13
            }
        },
        {
            id: 'mini_pebble',
            label: 'Mini pebble',
            note: 'Fine pebble, smoother underfoot',
            price: {
                unit: 'interior_sqft',
                low: 13,
                high: 17
            }
        },
        {
            id: 'polished_pebble',
            label: 'Polished pebble',
            note: 'Pebble with a smooth, ground finish',
            price: {
                unit: 'interior_sqft',
                low: 18,
                high: 25
            }
        },
        {
            id: 'glass_bead',
            label: 'Glass bead',
            note: 'Glass beads for a glittering, bright finish',
            price: {
                unit: 'interior_sqft',
                low: 18,
                high: 26
            }
        },
        {
            id: 'full_tile',
            label: 'Full tile',
            note: 'Tile across the whole interior',
            price: {
                unit: 'interior_sqft',
                low: 45,
                high: 80
            }
        }
    ],
    tile: [
        ...fromTemplate('tile'),
        {
            id: 'ceramic',
            label: 'Ceramic',
            note: 'Budget-friendly classic',
            price: {
                unit: 'perimeter_lf',
                low: 25,
                high: 40
            }
        },
        {
            id: 'italian_porcelain',
            label: 'Italian porcelain',
            note: 'Imported, designer patterns',
            price: {
                unit: 'perimeter_lf',
                low: 55,
                high: 85
            }
        },
        {
            id: 'glass_mosaic',
            label: 'Glass mosaic',
            note: 'Small glass pieces, rich color',
            price: {
                unit: 'perimeter_lf',
                low: 70,
                high: 110
            }
        },
        {
            id: 'natural_stone',
            label: 'Natural stone mosaic',
            note: 'Hand-cut stone pieces',
            price: {
                unit: 'perimeter_lf',
                low: 60,
                high: 95
            }
        }
    ],
    coping: [
        ...fromTemplate('coping'),
        {
            id: 'precast',
            label: 'Precast concrete',
            note: 'Shaped concrete with a finished edge',
            price: {
                unit: 'perimeter_lf',
                low: 45,
                high: 65
            }
        },
        {
            id: 'poured_in_place',
            label: 'Poured-in-place concrete',
            note: 'Cast on site, seamless look',
            price: {
                unit: 'perimeter_lf',
                low: 40,
                high: 65
            }
        },
        {
            id: 'porcelain',
            label: 'Porcelain',
            note: 'Thick porcelain pavers',
            price: {
                unit: 'perimeter_lf',
                low: 60,
                high: 90
            }
        },
        {
            id: 'brick',
            label: 'Brick',
            note: 'Traditional brick edge',
            price: {
                unit: 'perimeter_lf',
                low: 45,
                high: 70
            }
        },
        {
            id: 'bluestone_limestone',
            label: 'Bluestone or limestone',
            note: 'Cut natural stone',
            price: {
                unit: 'perimeter_lf',
                low: 70,
                high: 110
            }
        }
    ],
    deck: [
        ...fromTemplate('deck'),
        {
            id: 'stamped_concrete',
            label: 'Stamped concrete',
            note: 'Concrete pressed to look like stone or tile',
            price: {
                unit: 'deck_sqft',
                low: 15,
                high: 25
            }
        },
        {
            id: 'exposed_aggregate',
            label: 'Exposed aggregate',
            note: 'Concrete with a pebbled surface',
            price: {
                unit: 'deck_sqft',
                low: 14,
                high: 22
            }
        },
        {
            id: 'salt_finish',
            label: 'Salt finish concrete',
            note: 'Soft, pitted, cool-to-touch finish',
            price: {
                unit: 'deck_sqft',
                low: 13,
                high: 21
            }
        },
        {
            id: 'flagstone',
            label: 'Flagstone',
            note: 'Irregular natural stone',
            price: {
                unit: 'deck_sqft',
                low: 30,
                high: 50
            }
        },
        {
            id: 'stepping_stones_turf',
            label: 'Stepping stones with turf',
            note: 'Stone pads set in artificial grass',
            price: {
                unit: 'deck_sqft',
                low: 18,
                high: 32
            }
        },
        {
            id: 'decomposed_granite',
            label: 'Decomposed granite',
            note: 'Compacted crushed stone, casual look',
            price: {
                unit: 'deck_sqft',
                low: 6,
                high: 12
            }
        },
        {
            id: 'wood_composite',
            label: 'Wood or composite',
            note: 'Raised boards, warm underfoot',
            price: {
                unit: 'deck_sqft',
                low: 30,
                high: 55
            }
        }
    ],
    features: [
        ...fromTemplate('features'),
        {
            id: 'bench_steps',
            label: 'Bench or in-water steps',
            note: 'Built-in seating or entry steps',
            price: {
                unit: 'flat',
                low: 3500,
                high: 7500
            }
        },
        {
            id: 'umbrella_sleeve',
            label: 'Umbrella sleeve',
            note: 'Built into the deck for a patio umbrella',
            price: {
                unit: 'flat',
                low: 400,
                high: 900
            }
        },
        {
            id: 'bubblers',
            label: 'Bubblers',
            note: 'Small fountains on a shelf, priced each',
            price: {
                unit: 'each',
                low: 600,
                high: 1200,
                quantity: 2
            }
        },
        {
            id: 'sheer_descent',
            label: 'Sheer descent',
            note: 'A smooth sheet of falling water',
            price: {
                unit: 'flat',
                low: 3000,
                high: 7000
            }
        },
        {
            id: 'deck_jets',
            label: 'Deck jets',
            note: 'Arcs of water from the deck, priced each',
            price: {
                unit: 'each',
                low: 700,
                high: 1400,
                quantity: 3
            }
        },
        {
            id: 'zero_edge',
            label: 'Zero edge',
            note: 'Water spills over one side of the pool',
            siteVisit: 'Zero-edge pool (structure and plumbing)',
            price: {
                unit: 'flat',
                low: 20000,
                high: 60000
            }
        },
        {
            id: 'raised_spa_wall',
            label: 'Raised spa wall',
            note: 'A taller wall around the spa',
            price: {
                unit: 'flat',
                low: 6000,
                high: 15000
            }
        }
    ],
    equipment: [
        ...fromTemplate('equipment'),
        {
            id: 'cartridge_filter',
            label: 'Cartridge filter',
            note: 'Easy to maintain filter',
            price: {
                unit: 'flat',
                low: 1200,
                high: 2400
            }
        },
        {
            id: 'de_filter',
            label: 'DE filter',
            note: 'Finest filtering',
            price: {
                unit: 'flat',
                low: 1800,
                high: 3200
            }
        },
        {
            id: 'heat_pump',
            label: 'Heat pump',
            note: 'Efficient electric heating',
            price: {
                unit: 'flat',
                low: 4500,
                high: 8000
            }
        },
        {
            id: 'uv_ozone',
            label: 'UV or ozone sanitizer',
            note: 'Extra water cleaning',
            price: {
                unit: 'flat',
                low: 1500,
                high: 3500
            }
        }
    ],
    extras: [
        ...fromTemplate('extras'),
        {
            id: 'louvered_pergola',
            label: 'Louvered pergola',
            note: 'Adjustable slats for sun or shade',
            price: {
                unit: 'flat',
                low: 12000,
                high: 30000
            }
        },
        {
            id: 'seating_wall',
            label: 'Seating wall',
            note: 'Low wall for extra seating, priced per foot',
            price: {
                unit: 'linear_ft',
                low: 150,
                high: 300,
                quantity: 20
            }
        },
        {
            id: 'pool_safety_fence',
            label: 'Pool safety fence',
            note: 'Code-compliant fence, priced per foot',
            price: {
                unit: 'linear_ft',
                low: 40,
                high: 90,
                quantity: 100
            }
        },
        {
            id: 'landscape_lighting',
            label: 'Landscape lighting',
            note: 'Low-voltage path and accent lights',
            price: {
                unit: 'flat',
                low: 2500,
                high: 7000
            }
        }
    ]
};
}),
"[project]/lib/estimator/registry.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ESTIMATOR_SLUGS",
    ()=>ESTIMATOR_SLUGS,
    "TEMPLATES",
    ()=>TEMPLATES,
    "getEstimator",
    ()=>getEstimator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/homequote-bathroom.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/estimators/pool-masters.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$catalog$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/catalog/bathroom.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$catalog$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/catalog/pool.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/templates/bathroom.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/templates/pool.ts [app-rsc] (ecmascript)");
/** Re-exported for callers that already import the registry. */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
const TEMPLATES = {
    pool: {
        template: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_TEMPLATE"],
        catalog: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$catalog$2f$pool$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_CATALOG"]
    },
    bathroom: {
        template: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$templates$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATHROOM_TEMPLATE"],
        catalog: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$catalog$2f$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BATHROOM_CATALOG"]
    }
};
/*
 * Published estimators. For now each is a config file in content/estimators/
 * merged onto its trade's template (config.trade, default pool); self-serve
 * contractors will later load their saved config here instead. Server-safe:
 * no client-only imports.
 */ const CONTRACTORS = {
    [__TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_ESTIMATOR"].slug]: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$pool$2d$masters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["POOL_MASTERS_ESTIMATOR"],
    [__TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HOMEQUOTE_BATHROOM_ESTIMATOR"].slug]: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$estimators$2f$homequote$2d$bathroom$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HOMEQUOTE_BATHROOM_ESTIMATOR"]
};
const ESTIMATOR_SLUGS = Object.keys(CONTRACTORS);
function getEstimator(slug) {
    if (!Object.hasOwn(CONTRACTORS, slug)) return null;
    const contractor = CONTRACTORS[slug];
    const trade = contractor.trade ?? 'pool';
    if (!Object.hasOwn(TEMPLATES, trade)) return null;
    const { template, catalog } = TEMPLATES[trade];
    return {
        template: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["applyContractorConfig"])(template, contractor, catalog),
        contractor
    };
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/estimator/render.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATHROOM_RENDER_PROMPT",
    ()=>BATHROOM_RENDER_PROMPT,
    "DEFAULT_DAILY_RENDER_CAP",
    ()=>DEFAULT_DAILY_RENDER_CAP,
    "MAX_RENDER_BODY_BYTES",
    ()=>MAX_RENDER_BODY_BYTES,
    "MAX_RENDER_IMAGE_BYTES",
    ()=>MAX_RENDER_IMAGE_BYTES,
    "RENDERS_PER_IP_HOUR",
    ()=>RENDERS_PER_IP_HOUR,
    "RENDERS_PER_LEAD",
    ()=>RENDERS_PER_LEAD,
    "RENDER_ACTIVITY_KIND",
    ()=>RENDER_ACTIVITY_KIND,
    "RENDER_PROMPT",
    ()=>RENDER_PROMPT,
    "RENDER_TOKEN_HEADER",
    ()=>RENDER_TOKEN_HEADER,
    "RENDER_TOKEN_TTL_MS",
    ()=>RENDER_TOKEN_TTL_MS,
    "createRenderTask",
    ()=>createRenderTask,
    "dailyRenderCap",
    ()=>dailyRenderCap,
    "fetchRenderTask",
    ()=>fetchRenderTask,
    "parseRenderImage",
    ()=>parseRenderImage,
    "renderPromptFor",
    ()=>renderPromptFor,
    "rendersEnabled",
    ()=>rendersEnabled,
    "signRenderToken",
    ()=>signRenderToken,
    "signTaskRef",
    ()=>signTaskRef,
    "uploadRenderImage",
    ()=>uploadRenderImage,
    "verifyRenderToken",
    ()=>verifyRenderToken,
    "verifyTaskRef",
    ()=>verifyTaskRef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
;
const RENDER_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const RENDERS_PER_LEAD = 3;
const RENDERS_PER_IP_HOUR = 6;
const RENDER_TOKEN_HEADER = 'x-render-token';
const DEFAULT_DAILY_RENDER_CAP = 100;
const MAX_RENDER_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_RENDER_BODY_BYTES = Math.ceil(MAX_RENDER_IMAGE_BYTES * 4 / 3) + 16 * 1024;
const RENDER_ACTIVITY_KIND = 'estimator_render';
const KIE_BASE = 'https://api.kie.ai';
/** kie.ai serves file uploads from a separate host, with no /v1 (same as scripts/generate-scene-textures.mjs). */ const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';
const MODELS = [
    'nano-banana-pro',
    'nano-banana-2'
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const KIE_TASK = /^[A-Za-z0-9_-]{4,128}$/;
const RENDER_PROMPT = [
    'Turn this top-down design illustration into a photorealistic straight-down drone photograph of a Southern California backyard pool.',
    'Keep exactly the same layout, framing, pool shape and size, materials, colours and objects: do not add, remove, move or resize anything.',
    'Camera looks straight down from above, the same crop as the input.',
    'Realistic clear turquoise water with soft light caustics on the pool floor and a gentle sun glint; crisp coping edges and waterline tile;',
    'real paver, stone, concrete and wood textures with fine joints; natural grass, plants and trees; furniture as real outdoor furniture.',
    'Soft natural shadows, bright midday Southern California light, true-to-life colours, sharp detail.',
    'No text, no labels, no watermark, no people.'
].join(' ');
const BATHROOM_RENDER_PROMPT = [
    'Turn this bathroom design illustration into a photorealistic interior photograph of a newly remodeled bathroom,',
    'shot straight-on at eye level with a wide-angle lens.',
    'Keep exactly the same layout, fixtures, tile patterns, materials, colours and finishes;',
    'realistic grout lines, glass reflections, soft natural window light and warm accent lighting.',
    'No text, no people, no logos.'
].join(' ');
/** Edit prompt per trade (EstimatorTemplate.trade); anything unknown keeps the pool prompt. Kitchen slots in here. */ const RENDER_PROMPTS = {
    pool: RENDER_PROMPT,
    bathroom: BATHROOM_RENDER_PROMPT
};
function renderPromptFor(trade) {
    return Object.hasOwn(RENDER_PROMPTS, trade) ? RENDER_PROMPTS[trade] : RENDER_PROMPT;
}
function rendersEnabled() {
    return !!process.env.KIE_API_KEY && !!renderKey();
}
/** Signing key, derived (never the raw secret) so the service-role fallback is not reused verbatim. */ function renderKey() {
    const secret = process.env.ESTIMATOR_RENDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return secret ? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])('sha256', secret).update('hqn-estimator-render-v1').digest() : null;
}
function sign(message) {
    const key = renderKey();
    return key ? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])('sha256', key).update(message).digest('base64url') : null;
}
function sameSignature(a, b) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["timingSafeEqual"])(left, right);
}
function signRenderToken(slug, leadId, now = Date.now()) {
    if (!rendersEnabled() || !SLUG.test(slug) || !UUID.test(leadId)) return null;
    const expiry = String(Math.floor((now + RENDER_TOKEN_TTL_MS) / 1000));
    const signature = sign(`${slug}.${leadId}.${expiry}`);
    return signature ? `${leadId}.${expiry}.${signature}` : null;
}
function verifyRenderToken(slug, token, now = Date.now()) {
    if (typeof token !== 'string' || token.length > 200 || !SLUG.test(slug)) return null;
    const [leadId, expiry, signature, extra] = token.split('.');
    if (extra !== undefined || !leadId || !expiry || !signature || !UUID.test(leadId) || !/^\d{9,11}$/.test(expiry)) return null;
    const expected = sign(`${slug}.${leadId}.${expiry}`);
    if (!expected || !sameSignature(signature, expected)) return null;
    const expiresAt = Number(expiry) * 1000;
    return expiresAt > now ? {
        leadId,
        expiresAt
    } : null;
}
function signTaskRef(slug, leadId, kieTaskId) {
    if (!KIE_TASK.test(kieTaskId)) return null;
    const signature = sign(`task.${slug}.${leadId}.${kieTaskId}`);
    return signature ? `${kieTaskId}.${signature}` : null;
}
function verifyTaskRef(slug, leadId, ref) {
    if (typeof ref !== 'string' || ref.length > 300) return null;
    const [taskId, signature, extra] = ref.split('.');
    if (extra !== undefined || !taskId || !signature || !KIE_TASK.test(taskId)) return null;
    const expected = sign(`task.${slug}.${leadId}.${taskId}`);
    return expected && sameSignature(signature, expected) ? taskId : null;
}
function dailyRenderCap() {
    const value = Number(process.env.ESTIMATOR_RENDER_DAILY_CAP);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_DAILY_RENDER_CAP;
}
const IMAGE_TYPES = {
    png: {
        mime: 'image/png',
        ext: 'png',
        magic: (b)=>b.subarray(0, 8).equals(Buffer.from([
                0x89,
                0x50,
                0x4e,
                0x47,
                0x0d,
                0x0a,
                0x1a,
                0x0a
            ]))
    },
    jpeg: {
        mime: 'image/jpeg',
        ext: 'jpg',
        magic: (b)=>b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    },
    webp: {
        mime: 'image/webp',
        ext: 'webp',
        magic: (b)=>b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
    }
};
function parseRenderImage(value) {
    if (typeof value !== 'string') return {
        error: 'invalid'
    };
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return {
        error: 'invalid'
    };
    const encoded = match[2];
    if (Math.floor(encoded.length * 3 / 4) > MAX_RENDER_IMAGE_BYTES) return {
        error: 'too_large'
    };
    const type = IMAGE_TYPES[match[1]];
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length < 64 || !type.magic(bytes)) return {
        error: 'invalid'
    };
    return {
        bytes,
        mime: type.mime,
        ext: type.ext
    };
}
function kieKey() {
    const key = process.env.KIE_API_KEY;
    if (!key) throw new Error('Renders are not configured');
    return key;
}
function renderModel() {
    const wanted = process.env.ESTIMATOR_RENDER_MODEL;
    return MODELS.includes(wanted ?? '') ? wanted : 'nano-banana-pro';
}
async function kieJson(res, step) {
    const json = await res.json().catch(()=>null);
    // Only the status codes go in errors: kie.ai bodies can echo request details.
    if (!res.ok || !json || json.code !== undefined && json.code !== 200) {
        throw new Error(`kie.ai ${step} failed (${res.status}${json?.code ? `/${json.code}` : ''})`);
    }
    return json;
}
async function uploadRenderImage(image, name) {
    const form = new FormData();
    form.append('file', new Blob([
        new Uint8Array(image.bytes)
    ], {
        type: image.mime
    }), `${name}.${image.ext}`);
    form.append('uploadPath', 'estimator-renders');
    form.append('fileName', `${name}.${image.ext}`);
    const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${kieKey()}`
        },
        body: form,
        signal: AbortSignal.timeout(30_000)
    });
    const data = (await kieJson(res, 'upload')).data ?? {};
    const url = [
        data.downloadUrl,
        data.fileUrl,
        data.url
    ].find((v)=>typeof v === 'string' && /^https:\/\//.test(v));
    if (!url) throw new Error('kie.ai upload returned no URL');
    return url;
}
async function createRenderTask(imageUrl, prompt = RENDER_PROMPT) {
    const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${kieKey()}`
        },
        body: JSON.stringify({
            model: renderModel(),
            input: {
                prompt,
                image_input: [
                    imageUrl
                ],
                aspect_ratio: '3:2',
                resolution: '2K',
                output_format: 'jpg'
            }
        }),
        signal: AbortSignal.timeout(20_000)
    });
    const taskId = (await kieJson(res, 'createTask')).data?.taskId;
    if (typeof taskId !== 'string' || !KIE_TASK.test(taskId)) throw new Error('kie.ai returned no task id');
    return taskId;
}
function resultUrl(data) {
    const pick = (v)=>Array.isArray(v) ? v.find((u)=>typeof u === 'string' && /^https:\/\//.test(u)) ?? null : null;
    if (typeof data.resultJson === 'string') {
        try {
            return pick(JSON.parse(data.resultJson).resultUrls);
        } catch  {
            return null;
        }
    }
    return pick(data.resultUrls) ?? pick(data.response?.resultUrls);
}
async function fetchRenderTask(taskId) {
    let data;
    try {
        const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
            headers: {
                Authorization: `Bearer ${kieKey()}`
            },
            signal: AbortSignal.timeout(15_000),
            cache: 'no-store'
        });
        if (res.status >= 500) return {
            status: 'running'
        };
        data = (await kieJson(res, 'recordInfo')).data ?? {};
    } catch (error) {
        if (error instanceof Error && /timeout|abort|fetch failed/i.test(`${error.name} ${error.message}`)) return {
            status: 'running'
        };
        throw error;
    }
    const state = String(data.state ?? '').toLowerCase();
    if (state === 'success') {
        const url = resultUrl(data);
        return url ? {
            status: 'done',
            imageUrl: url
        } : {
            status: 'failed',
            message: 'The render finished without a picture. Please try again.'
        };
    }
    if (state === 'fail' || state === 'error') return {
        status: 'failed',
        message: 'The render didn’t work this time. Please try again.'
    };
    return {
        status: 'running'
    };
}
}),
"[project]/app/(estimator)/estimator/[slug]/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EstimatorPage,
    "generateMetadata",
    ()=>generateMetadata,
    "generateStaticParams",
    ()=>generateStaticParams
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$example$2d$files$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/example-files.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$configurator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/configurator.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photo$2d$manifest$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/configurator/photo-manifest.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/estimator.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$footer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/estimator-footer.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/estimator-header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/estimator-hero.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/funnel/landing.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/shell/facts.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/configurator/engine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/funnel/engine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$registry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/estimator/registry.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/render.ts [app-rsc] (ecmascript)");
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
/** "Pool remodel" -> "Pool Remodel" for page titles. */ const titleCase = (s)=>s.replace(/\b[a-z]/g, (c)=>c.toUpperCase());
/** The id the header's "Start my design" link jumps to (no phone number to call). */ const BUILDER_ANCHOR = 'design';
function generateStaticParams() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$registry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ESTIMATOR_SLUGS"].map((slug)=>({
            slug
        }));
}
async function generateMetadata({ params }) {
    const { slug } = await params;
    const found = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$registry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getEstimator"])(slug);
    if (!found) return {
        title: 'Estimator not found',
        robots: {
            index: false,
            follow: false
        }
    };
    const { template, contractor } = found;
    const meta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tradeMeta"])(template.trade);
    const title = `${titleCase(template.title)} Price Estimator · ${contractor.contractorName}`;
    const description = meta ? meta.description(template.projectNoun, contractor.contractorName) : `Get a ballpark price range for your ${template.projectNoun} from ${contractor.contractorName}, then book a free on-site consultation. A ballpark, not a quote.`;
    // Only a share picture that is actually there.
    const share = meta?.shareImage && (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$example$2d$files$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["exampleFileExists"])(meta.shareImage.url) ? meta.shareImage : null;
    return {
        title: {
            absolute: title
        },
        description,
        alternates: {
            canonical: `/estimator/${contractor.slug}`
        },
        // Example prices must not be indexed; the page opens up once the contractor confirms its prices.
        robots: template.pricesConfirmed ? {
            index: true,
            follow: true
        } : {
            index: false,
            follow: false
        },
        // Shared links preview as the contractor's builder, not the site-wide HomeQuote defaults (the design
        // illustration, so a preview never promises a photo while renders are off).
        openGraph: {
            type: 'website',
            title,
            description,
            ...share ? {
                images: [
                    {
                        url: share.url,
                        width: 1200,
                        height: 800,
                        alt: share.alt
                    }
                ]
            } : {}
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...share ? {
                images: [
                    share.url
                ]
            } : {}
        }
    };
}
async function EstimatorPage({ params }) {
    const { slug } = await params;
    const found = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$registry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getEstimator"])(slug);
    if (!found) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notFound"])();
    const { template, contractor } = found;
    // Opt-in simple funnel: this page is its landing; the questions live at /estimator/[slug]/design.
    const funnel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$funnel$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["funnelSpecFor"])(contractor);
    if (funnel) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$funnel$2f$landing$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["FunnelLanding"], {
        spec: funnel,
        contractor: contractor,
        designHref: `/estimator/${contractor.slug}/design`
    }, void 0, false, {
        fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
        lineNumber: 76,
        columnNumber: 22
    }, this);
    // Opt-in one-page configurator (size / finish / upgrades over pre-rendered photos): its own light page, header and footer.
    const spec = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$configurator$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["configuratorSpecFor"])(contractor);
    if (spec) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$configurator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Configurator"], {
            spec: spec,
            template: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicTemplate"])(template, contractor),
            contractor: contractor,
            manifest: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$configurator$2f$photo$2d$manifest$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["configuratorPhotoManifest"])(spec)
        }, void 0, false, {
            fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
            lineNumber: 81,
            columnNumber: 7
        }, this);
    }
    const meta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tradeMeta"])(template.trade);
    const builder = meta !== null;
    // Server-only check (kie.ai key + signing secret); copy promising a realistic photo depends on it.
    const renders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$render$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rendersEnabled"])();
    const facts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$facts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contractorFacts"])(contractor);
    // Before the first answer (renders on): the example design and its photo, or the example clip, if the files exist.
    const example = meta && renders ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolveExampleMedia"])(meta, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$example$2d$files$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["exampleFileExists"]) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EstimatorHeader"], {
                contractor: contractor,
                facts: facts,
                startHref: builder ? `#${BUILDER_ANCHOR}` : undefined
            }, void 0, false, {
                fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                id: "main",
                className: "flex-1",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "relative isolate overflow-x-clip",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hq-glow",
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                            lineNumber: 102,
                            columnNumber: 11
                        }, this),
                        meta ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$hero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EstimatorHero"], {
                            rendersEnabled: renders,
                            facts: facts,
                            copy: renders ? meta.hero.withRenders : meta.hero.withoutRenders,
                            factsLabel: `About ${contractor.contractorName}`
                        }, void 0, false, {
                            fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                            lineNumber: 104,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative mx-auto w-full max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl",
                                    children: [
                                        "What could your ",
                                        template.projectNoun,
                                        " cost?"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                                    lineNumber: 112,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)]",
                                    children: [
                                        "Answer a few quick questions and see a ballpark price range from ",
                                        contractor.contractorName,
                                        ". It takes about two minutes, and a free on-site consultation gets you a firm quote."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                                    lineNumber: 115,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                            lineNumber: 111,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            id: builder ? BUILDER_ANCHOR : undefined,
                            className: builder ? 'relative mx-auto w-full max-w-7xl scroll-mt-16 px-5 pb-28 pt-3 sm:scroll-mt-20 sm:px-8 sm:pt-6 lg:pb-20' : 'relative mx-auto w-full max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:pb-20',
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$estimator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Estimator"], {
                                template: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicTemplate"])(template, contractor),
                                contractor: contractor,
                                rendersEnabled: renders,
                                example: example
                            }, void 0, false, {
                                fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                                lineNumber: 130,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                            lineNumber: 122,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$shell$2f$estimator$2d$footer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EstimatorFooter"], {
                contractor: contractor
            }, void 0, false, {
                fileName: "[project]/app/(estimator)/estimator/[slug]/page.tsx",
                lineNumber: 134,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
}),
"[project]/app/(estimator)/estimator/[slug]/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/(estimator)/estimator/[slug]/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__65e524b0._.js.map