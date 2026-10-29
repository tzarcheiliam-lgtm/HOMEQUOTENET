module.exports = [
"[next]/internal/font/google/sora_b6e5c9f6.module.css [app-rsc] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "sora_b6e5c9f6-module__Nf_hBG__className",
  "variable": "sora_b6e5c9f6-module__Nf_hBG__variable",
});
}),
"[next]/internal/font/google/sora_b6e5c9f6.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/sora_b6e5c9f6.module.css [app-rsc] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Sora', 'Sora Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
}),
"[next]/internal/font/google/dm_sans_ba1125dd.module.css [app-rsc] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "dm_sans_ba1125dd-module__bygbXq__className",
  "variable": "dm_sans_ba1125dd-module__bygbXq__variable",
});
}),
"[next]/internal/font/google/dm_sans_ba1125dd.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/dm_sans_ba1125dd.module.css [app-rsc] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'DM Sans', 'DM Sans Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
}),
"[project]/content/site.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Global, niche-independent site content.
 *
 * Everything a future niche page (fencing, roofing, ADUs, kitchens, baths,
 * outdoor living) shares lives here. Niche-specific copy lives in
 * `content/niches/*.ts` and is typed by `content/types.ts`.
 */ __turbopack_context__.s([
    "disclaimers",
    ()=>disclaimers,
    "hasRealContactEmail",
    ()=>hasRealContactEmail,
    "site",
    ()=>site
]);
const site = {
    name: 'HomeQuote Network',
    domain: 'homequotenet.com',
    url: 'https://homequotenet.com',
    founder: 'Liam Tzarchei',
    operator: 'Tzarchei Investments',
    tagline: 'Qualified booked appointments for home-service contractors. Pay per appointment we set on your calendar.',
    /** Default <title> and link-preview title for any route without its own. */ defaultTitle: 'HomeQuote Network | Qualified Contractor Leads',
    /** Default meta / Open Graph description for any route without its own. */ description: 'HomeQuote Network delivers qualified homeowner leads and booked estimate appointments to remodeling, roofing, fencing, HVAC and pool contractors across Southern California.',
    contact: {
        email: 'info@homequotenet.com',
        /** Second public address, shown beside `email`. */ founderEmail: 'liam@homequotenet.com',
        phone: '747-217-5713',
        /** E.164, for tel: links. */ phoneHref: '+17472175713',
        /**
     * 30-minute contractor call: the Check My Fit funnel, which books it on
     * HomeQuote's own sales calendar (lib/contractor-funnel/settings.server.ts).
     */ booking: '/contractor-appointments/check-fit'
    },
    nav: [
        {
            label: 'How it works',
            href: '/#how-it-works'
        },
        /* wideOnly: hidden in the desktop bar below 1280px, where the Industries
       menu needs the room. Always listed in the mobile sheet. */ {
            label: 'Projects',
            href: '/#projects',
            wideOnly: true
        },
        {
            label: 'Appointment standards',
            href: '/lead-standards'
        },
        {
            label: 'Working together',
            href: '/#options'
        },
        {
            label: 'FAQ',
            href: '/#faq',
            wideOnly: true
        }
    ],
    footerLinks: {
        company: [
            {
                label: 'Appointment standards',
                href: '/lead-standards'
            },
            {
                label: 'Contractor application',
                href: '/apply'
            }
        ],
        legal: [
            {
                label: 'Privacy Policy',
                href: '/privacy'
            },
            {
                label: 'Terms',
                href: '/terms'
            }
        ]
    },
    cta: {
        primary: 'Check Appointment Availability',
        /*
      Header-only. The full label pushes the nav onto two lines at 1024-1280px
      once "Appointment standards" is in the bar; in the header the surrounding
      nav already supplies the context.
    */ primaryShort: 'Check Availability',
        primaryHref: '/apply',
        secondary: 'See How It Works',
        secondaryHref: '/#how-it-works',
        managed: 'Discuss Managed Growth',
        managedHref: '/apply?track=managed'
    }
};
const hasRealContactEmail = !site.contact.email.includes('REPLACE_ME');
const disclaimers = {
    /*
    Precise on purpose. We do book the appointment, so we cannot say
    "appointments are not guaranteed" — but attendance and outcomes are not ours
    to promise, and that line has to stay sharp.
  */ noGuarantee: 'HomeQuote Network does not guarantee attendance, estimates, sales, revenue, or profitability. We guarantee that anything billed as a booked appointment met the agreed qualification and scheduling standard when delivered. Attending the appointment, estimating, and closing the job are the contractor’s responsibility.',
    agreementGoverns: 'Final qualification, duplicate, cancellation, rescheduling, no-show, replacement, and dispute terms are defined in each partner agreement.',
    pricing: 'Pricing per booked appointment depends on project types, market, qualification requirements, and expected volume. Pricing is confirmed before launch.',
    systemPreview: 'Example workflow — interface preview only. Not client data or reported results.'
};
}),
"[project]/lib/site-metadata.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "baseOpenGraph",
    ()=>baseOpenGraph,
    "defaultOgImage",
    ()=>defaultOgImage,
    "rootMetadata",
    ()=>rootMetadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/content/site.ts [app-rsc] (ecmascript)");
;
const baseOpenGraph = {
    type: 'website',
    siteName: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].name,
    locale: 'en_US'
};
const defaultOgImage = {
    url: '/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'HomeQuote Network — Qualified Contractor Leads'
};
const rootMetadata = {
    metadataBase: new URL(__TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].url),
    title: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].defaultTitle,
    description: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].description,
    applicationName: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].name,
    // Meta business domain verification; rendered server-side in <head>.
    other: {
        'facebook-domain-verification': 'cmx738y17dj6j5tebzgpx0jw9yikpk'
    },
    openGraph: {
        ...baseOpenGraph,
        url: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].url,
        title: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].defaultTitle,
        description: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].description
    },
    twitter: {
        card: 'summary_large_image',
        title: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].defaultTitle,
        description: __TURBOPACK__imported__module__$5b$project$5d2f$content$2f$site$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["site"].description
    }
};
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RootLayout,
    "metadata",
    ()=>metadata,
    "viewport",
    ()=>viewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/sora_b6e5c9f6.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/dm_sans_ba1125dd.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$site$2d$metadata$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/site-metadata.ts [app-rsc] (ecmascript)");
;
;
;
;
;
const metadata = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$site$2d$metadata$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rootMetadata"];
const viewport = {
    maximumScale: 1
};
function RootLayout({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: "en",
        className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$sora_b6e5c9f6$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].variable} ${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].variable} ${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$dm_sans_ba1125dd$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].className}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
            className: "min-h-[100dvh] bg-background text-foreground antialiased",
            children: children
        }, void 0, false, {
            fileName: "[project]/app/layout.tsx",
            lineNumber: 28,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/layout.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7c44aaf7._.js.map