module.exports = [
"[project]/lib/supabase/cookie-options.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SESSION_COOKIE_MAX_AGE",
    ()=>SESSION_COOKIE_MAX_AGE,
    "supabaseCookieOptions",
    ()=>supabaseCookieOptions
]);
const SESSION_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days: the browser maximum
const supabaseCookieOptions = {
    path: '/',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
    secure: ("TURBOPACK compile-time value", "development") === 'production'
};
}),
"[project]/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$cookie$2d$options$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/cookie-options.ts [app-rsc] (ecmascript)");
;
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "http://127.0.0.1:54399"), ("TURBOPACK compile-time value", "preview-anon"), {
        cookieOptions: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$cookie$2d$options$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseCookieOptions"],
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The `setAll` method was called from a Server Component.
                // This can be safely ignored when middleware refreshes sessions.
                }
            }
        }
    });
}
}),
"[project]/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getProfile",
    ()=>getProfile,
    "requireCallWorkspace",
    ()=>requireCallWorkspace,
    "requireProfile",
    ()=>requireProfile,
    "requireRole",
    ()=>requireRole
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
;
;
async function getProfile() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error } = await supabase.auth.getUser();
    // Supabase unreachable is not "signed out": fail closed (no portal) but do not send the
    // user to /sign-in — the app error boundary offers a retry and the session cookie survives.
    if (!user && error && (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500)) {
        throw new Error('Could not reach the sign-in service. Please try again in a moment.');
    }
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return profile ?? null;
}
async function requireProfile() {
    const profile = await getProfile();
    if (!profile) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/sign-in');
    if (!profile.is_active) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/pending');
    return profile;
}
async function requireRole(roles) {
    const profile = await requireProfile();
    if (!roles.includes(profile.role)) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/app');
    return profile;
}
async function requireCallWorkspace() {
    return requireRole([
        'admin',
        'caller',
        'setter'
    ]);
}
}),
"[project]/lib/nav.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NAV_GROUP_ORDER",
    ()=>NAV_GROUP_ORDER,
    "NAV_ITEMS",
    ()=>NAV_ITEMS,
    "ROLE_LABELS",
    ()=>ROLE_LABELS,
    "groupNavItems",
    ()=>groupNavItems,
    "homePathFor",
    ()=>homePathFor,
    "mobileNavForRole",
    ()=>mobileNavForRole,
    "navItemsForRole",
    ()=>navItemsForRole
]);
const NAV_GROUP_ORDER = [
    'Operations',
    'Growth',
    'Administration'
];
const GROUP_BY_LABEL = {
    Leads: 'Operations',
    'My Leads': 'Operations',
    Contractors: 'Operations',
    'Lead Recipients': 'Operations',
    Calls: 'Operations',
    'AI Agent Calls': 'Operations',
    Contracts: 'Operations',
    'Documents & Signing': 'Operations',
    Appointments: 'Operations',
    Calendar: 'Operations',
    Availability: 'Operations',
    'Call Logs': 'Operations',
    'Call Appointments': 'Operations',
    'Call Emails': 'Operations',
    'Growth Tools': 'Growth',
    'Service Requests': 'Growth',
    Funnels: 'Growth',
    'Contractor Funnel': 'Growth',
    Analytics: 'Growth',
    'Meta Ads': 'Growth',
    Seret: 'Growth',
    'Seret API': 'Growth',
    Automations: 'Growth',
    'Email Templates': 'Growth',
    Sales: 'Administration',
    Billing: 'Administration',
    Team: 'Administration',
    Integrations: 'Administration',
    'Lead Intake': 'Administration',
    'Audit Log': 'Administration'
};
function groupNavItems(items) {
    const out = [];
    const loose = items.filter((i)=>!i.group);
    if (loose.length) out.push({
        group: null,
        items: loose
    });
    for (const group of NAV_GROUP_ORDER){
        const inGroup = items.filter((i)=>i.group === group);
        if (inGroup.length) out.push({
            group,
            items: inGroup
        });
    }
    return out;
}
// The UI is admin-first, but each item declares exactly which roles see it.
const BASE_NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/app',
        icon: 'LayoutDashboard',
        roles: [
            'admin',
            'setter',
            'contractor'
        ]
    },
    {
        label: 'Leads',
        href: '/app/leads',
        icon: 'Users',
        roles: [
            'admin',
            'setter'
        ]
    },
    {
        label: 'My Leads',
        href: '/app/leads',
        icon: 'Inbox',
        roles: [
            'contractor'
        ]
    },
    {
        label: 'Contractors',
        href: '/app/contractors',
        icon: 'Building2',
        roles: [
            'admin',
            'setter'
        ]
    },
    // Who a qualified lead can be sent to (contractors + team members).
    {
        label: 'Lead Recipients',
        href: '/app/lead-recipients',
        icon: 'Send',
        roles: [
            'admin'
        ]
    },
    // The partner cold-calling workspace. Callers and setters work their own
    // assigned list here; admins use it to assign prospects and compare agents.
    // Contractors never see it.
    {
        label: 'Calls',
        href: '/app/calls',
        icon: 'Phone',
        roles: [
            'admin',
            'caller',
            'setter'
        ]
    },
    // AI voice agent calls to new form leads and admin-initiated calls (admin only; server actions re-check the role).
    {
        label: 'AI Agent Calls',
        href: '/app/ai-calls',
        icon: 'Bot',
        roles: [
            'admin'
        ]
    },
    // Automatic texting of new leads from the owner's Mac, with an AI that qualifies over text (admin only).
    {
        label: 'Texting',
        href: '/app/texting',
        icon: 'MessageSquare',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Appointments',
        href: '/app/appointments',
        icon: 'CalendarDays',
        roles: [
            'admin',
            'setter',
            'contractor'
        ]
    },
    // HomeQuote's own booking calendar (day / week): the team, sales and contractor calendars for admins, a
    // contractor's own for them. Setters may open /app/calendar too (the page allows them) but their sidebar
    // stays at its five sections (tests/setter-access.test.ts) until that product decision changes.
    {
        label: 'Calendar',
        href: '/app/calendar',
        icon: 'CalendarCheck',
        roles: [
            'admin',
            'contractor'
        ]
    },
    // Contractors set when they can't take appointments and connect their calendar; admins/setters read it per contractor.
    {
        label: 'Availability',
        href: '/app/availability',
        icon: 'CalendarClock',
        // Setters stay at their five sections (product decision); they read a contractor's availability from the
        // contractor's page and via the booking warning, both of which link to /app/availability?contractor=.
        roles: [
            'admin',
            'contractor'
        ]
    },
    // Electronic document signing. HQN admins see every company's documents; contractor owners/staff only their own
    // (enforced server-side in lib/signing/access.ts and by RLS, not by this list).
    // Reusable agreements (admins prepare + send; a contractor user only reads agreements sent to their own company).
    {
        label: 'Contracts',
        href: '/app/contracts',
        icon: 'FileStack',
        roles: [
            'admin',
            'contractor'
        ]
    },
    {
        label: 'Documents & Signing',
        href: '/app/documents',
        icon: 'FileSignature',
        roles: [
            'admin',
            'contractor'
        ]
    },
    // Optional growth services for contractors. Listed after the lead workflow
    // so leads and appointments stay first.
    {
        label: 'Growth Tools',
        href: '/app/growth',
        icon: 'Sprout',
        roles: [
            'contractor'
        ]
    },
    // Contractors' requests for growth services, reviewed by HQN admins.
    {
        label: 'Service Requests',
        href: '/app/service-requests',
        icon: 'Handshake',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Sales',
        href: '/app/sales',
        icon: 'DollarSign',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Billing',
        href: '/app/billing',
        icon: 'Receipt',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Analytics',
        href: '/app/analytics',
        icon: 'BarChart3',
        roles: [
            'admin'
        ]
    },
    // Meta Ads reporting + lead-outcome feedback. Admins see every account; contractor owners only campaigns an
    // admin mapped to their company (enforced by RLS and lib/permissions.canViewMetaAds, not by this list).
    {
        label: 'Meta Ads',
        href: '/app/meta-ads',
        icon: 'Megaphone',
        roles: [
            'admin',
            'contractor'
        ]
    },
    // Seret, the AI image/video studio (static app in public/studio/, admin-only via the middleware). Opens in a new tab.
    {
        label: 'Seret',
        title: 'Seret studio',
        href: '/studio',
        icon: 'Clapperboard',
        roles: [
            'admin'
        ],
        newTab: true
    },
    // Keys that let Claude (MCP) look things up and act in HomeQuote; admin only.
    {
        label: 'Claude connector',
        href: '/app/claude-connector',
        icon: 'KeyRound',
        roles: [
            'admin'
        ]
    },
    // API keys that let Claude (MCP) use Seret; admin only.
    {
        label: 'Seret API',
        href: '/app/seret-api',
        icon: 'KeyRound',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Funnels',
        href: '/app/funnels',
        icon: 'BarChart3',
        roles: [
            'admin'
        ]
    },
    // Contractors who completed Check My Fit: prospective clients, kept apart from homeowner Leads.
    {
        label: 'Contractor Funnel',
        href: '/app/contractor-funnel',
        icon: 'Handshake',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Automations',
        href: '/app/workflows',
        icon: 'Workflow',
        roles: [
            'admin',
            'contractor'
        ]
    },
    {
        label: 'Email Templates',
        href: '/app/email-templates',
        icon: 'Mail',
        roles: [
            'admin',
            'contractor'
        ]
    },
    {
        label: 'Team',
        href: '/app/team',
        icon: 'ShieldCheck',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Integrations',
        href: '/app/integrations',
        icon: 'Plug',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Lead Intake',
        href: '/app/lead-intake',
        icon: 'ArrowDownToLine',
        roles: [
            'admin'
        ]
    },
    {
        label: 'Audit Log',
        href: '/app/audit',
        icon: 'ScrollText',
        roles: [
            'admin'
        ]
    }
];
const NAV_ITEMS = BASE_NAV_ITEMS.map((i)=>({
        ...i,
        group: GROUP_BY_LABEL[i.label]
    }));
function navItemsForRole(role) {
    return NAV_ITEMS.filter((item)=>item.roles.includes(role));
}
const ROLE_LABELS = {
    admin: 'Administrator',
    setter: 'Appointment Setter',
    contractor: 'Contractor',
    caller: 'Partner (Caller)'
};
function homePathFor(role) {
    return role === 'caller' ? '/app/calls' : '/app';
}
/* ---- Mobile navigation ---------------------------------------------------
 * The phone UI shows a few destinations in a bottom bar and everything else
 * behind "More". Both lists are derived from NAV_ITEMS (plus the calling
 * workspace sub-pages), so a role can never see a route on a phone that it
 * cannot see in the desktop sidebar.
 */ /** Calling-workspace sub-pages: not in the sidebar (CallsSubnav covers them
 *  on desktop) but worth first-class phone navigation. Same guard as the
 *  pages themselves (requireCallWorkspace). */ const CALL_WORKSPACE_EXTRAS = [
    {
        label: 'Call Logs',
        href: '/app/calls/logs',
        icon: 'ClipboardList',
        roles: [
            'admin',
            'caller',
            'setter'
        ]
    },
    {
        label: 'Call Appointments',
        href: '/app/calls/appointments',
        icon: 'CalendarCheck',
        roles: [
            'admin',
            'caller',
            'setter'
        ]
    },
    {
        label: 'Call Emails',
        href: '/app/calls/emails',
        icon: 'Mail',
        roles: [
            'admin',
            'caller',
            'setter'
        ]
    }
].map((i)=>({
        ...i,
        group: GROUP_BY_LABEL[i.label]
    }));
/** Bottom-bar picks per role, in order. Label is the short phone label. */ /**
 * Bottom-bar picks per role, in order (label is the short phone label). The bar
 * always adds an Alerts tab (notifications) and a More tab, so keep these to
 * three or four to stay at five tabs. Anything not listed lives under More.
 */ const MOBILE_PRIMARY = {
    admin: [
        {
            href: '/app',
            label: 'Home'
        },
        {
            href: '/app/leads',
            label: 'Leads'
        },
        {
            href: '/app/appointments',
            label: 'Appts'
        }
    ],
    setter: [
        {
            href: '/app',
            label: 'Home'
        },
        {
            href: '/app/calls',
            label: 'Calls'
        },
        {
            href: '/app/leads',
            label: 'Leads'
        }
    ],
    caller: [
        {
            href: '/app/calls',
            label: 'Prospects'
        },
        {
            href: '/app/calls/logs',
            label: 'Logs'
        },
        {
            href: '/app/calls/appointments',
            label: 'Appts'
        }
    ],
    contractor: [
        {
            href: '/app',
            label: 'Home'
        },
        {
            href: '/app/leads',
            label: 'Leads'
        },
        {
            href: '/app/appointments',
            label: 'Appts'
        }
    ]
};
function mobileNavForRole(role) {
    const visible = [
        ...NAV_ITEMS,
        ...CALL_WORKSPACE_EXTRAS
    ].filter((i)=>i.roles.includes(role));
    const primary = [];
    for (const pick of MOBILE_PRIMARY[role]){
        const item = visible.find((i)=>i.href === pick.href);
        if (item) primary.push({
            ...item,
            label: pick.label,
            title: item.label
        });
    }
    const taken = new Set(primary.map((p)=>p.href));
    const seen = new Set();
    const secondary = visible.filter((i)=>{
        if (taken.has(i.href)) return false;
        const key = `${i.href}|${i.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return {
        primary,
        secondary
    };
}
}),
"[project]/components/app-sidebar.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AppSidebar",
    ()=>AppSidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AppSidebar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AppSidebar() from the server but AppSidebar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/app-sidebar.tsx <module evaluation>", "AppSidebar");
}),
"[project]/components/app-sidebar.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AppSidebar",
    ()=>AppSidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AppSidebar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AppSidebar() from the server but AppSidebar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/app-sidebar.tsx", "AppSidebar");
}),
"[project]/components/app-sidebar.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/app-sidebar.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/app-sidebar.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/lib/calls/redirect.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Guards the `next` parameter that carries a visitor back to the page they
 * asked for after signing in. Only same-origin paths inside the app are
 * honoured; anything that could send someone off-site — a full URL, a
 * protocol-relative `//host`, a backslash trick, a non-app path — falls back
 * to the role's home. Pure, so it is unit-tested directly.
 */ __turbopack_context__.s([
    "safeNextPath",
    ()=>safeNextPath
]);
function safeNextPath(raw, fallback) {
    if (!raw) return fallback;
    let value;
    try {
        value = decodeURIComponent(raw).trim();
    } catch  {
        return fallback;
    }
    if (value === '') return fallback;
    // Must be an absolute path, and not protocol-relative or scheme-bearing.
    if (!value.startsWith('/')) return fallback;
    if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
    if (/[\r\n]/.test(value)) return fallback;
    if (value.includes('://')) return fallback;
    // Only the authenticated app is a sensible destination after sign-in.
    if (!(value === '/app' || value.startsWith('/app/'))) return fallback;
    return value;
}
}),
"[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
;
;
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "http://127.0.0.1:54399"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
}),
"[project]/lib/emails/template.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SIGNER",
    ()=>DEFAULT_SIGNER,
    "EMAIL_LOGO_PATH",
    ()=>EMAIL_LOGO_PATH,
    "MORE_INFO_TEMPLATE_KEY",
    ()=>MORE_INFO_TEMPLATE_KEY,
    "OPT_OUT_LINE",
    ()=>OPT_OUT_LINE,
    "buildBrandedEmailHtml",
    ()=>buildBrandedEmailHtml,
    "buildBrandedEmailText",
    ()=>buildBrandedEmailText,
    "buildMoreInfoAfterCallEmail",
    ()=>buildMoreInfoAfterCallEmail,
    "buildProspectEmailHtml",
    ()=>buildProspectEmailHtml,
    "buildProspectEmailText",
    ()=>buildProspectEmailText,
    "emailLogoUrl",
    ()=>emailLogoUrl,
    "mailingAddress",
    ()=>mailingAddress
]);
const MORE_INFO_TEMPLATE_KEY = 'more_info_after_call';
const EMAIL_LOGO_PATH = '/images/email/homequote-logo-transparent.png';
function clean(value) {
    return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function servicePhrase(services) {
    const values = Array.from(new Set(services.map(clean).filter(Boolean))).slice(0, 5);
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}
function emailLogoUrl(siteUrl) {
    return new URL(EMAIL_LOGO_PATH, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}
function buildMoreInfoAfterCallEmail(prospect, contactName, discussedServices) {
    const company = clean(prospect.company_name);
    const firstName = clean(contactName).split(' ')[0] || '';
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const services = servicePhrase(discussedServices);
    return {
        subject: `Following up after our call${company ? ` — ${company}` : ''}`,
        message: [
            greeting,
            '',
            `Thanks again for taking my call. I wanted to follow up with a little more detail on how HomeQuote Network could work with ${company}.`,
            '',
            'We speak directly with homeowners about their pool projects, qualify the project by confirming the details and fit, and then book a specific day and time for the contractor to meet with the homeowner.',
            ...services ? [
                '',
                `Based on our conversation, we would focus on homeowners looking for ${services}.`
            ] : [],
            '',
            'If that sounds worth exploring, would you be open to a 15-minute call with Liam?',
            '',
            'You can also book an appointment with Liam and see our results at https://homequotenet.com/.'
        ].join('\n')
    };
}
function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function messageHtml(message) {
    return message.trim().split(/\n{2,}/).map((paragraph)=>{
        const content = escapeHtml(paragraph).replace(/https:\/\/homequotenet\.com\/?/gi, '<a href="https://homequotenet.com/" style="color:#0038B8;text-decoration:underline;">homequotenet.com</a>').replace(/\n/g, '<br>');
        return `<p style="margin:0 0 16px 0;">${content}</p>`;
    }).join('');
}
const DEFAULT_SIGNER = {
    name: 'Liam'
};
const OPT_OUT_LINE = 'Not interested in hearing from us? Reply "stop" and we won\u2019t email you again.';
function mailingAddress() {
    const v = typeof process !== 'undefined' ? process.env.EMAIL_MAILING_ADDRESS : undefined;
    return v && v.trim() ? v.trim() : null;
}
function signerName(signer) {
    const name = signer?.name?.trim();
    return name ? name : DEFAULT_SIGNER.name;
}
function buildProspectEmailHtml(message, logoUrl, signer = DEFAULT_SIGNER, address = null) {
    const safeLogoUrl = escapeHtml(logoUrl);
    const phone = signer.phone?.trim();
    return [
        '<div style="margin:0;padding:0;background:#ffffff;color:#0A1B3D;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">',
        '<div style="max-width:600px;margin:0;padding:4px 0;">',
        messageHtml(message),
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #DCE4F2;padding-top:16px;border-collapse:separate;">',
        '<tr>',
        `<td style="padding:0 14px 0 0;vertical-align:middle;"><img src="${safeLogoUrl}" width="72" height="72" alt="HomeQuote Network" style="display:block;width:72px;height:72px;border:0;outline:none;text-decoration:none;"></td>`,
        '<td style="padding:0;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;line-height:1.4;">',
        `<div style="font-size:16px;font-weight:700;color:#0A1B3D;">${escapeHtml(signerName(signer))}</div>`,
        '<div style="font-size:14px;font-weight:700;color:#0038B8;">HomeQuote Network</div>',
        phone ? `<div style="font-size:13px;color:#0A1B3D;">${escapeHtml(phone)}</div>` : '',
        '<div style="font-size:13px;color:#5B6B8C;">Homeowner qualification &amp; pool project appointments</div>',
        '</td>',
        '</tr>',
        '</table>',
        `<p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#8A96B0;">${escapeHtml(OPT_OUT_LINE)}${address ? `<br>HomeQuote Network · ${escapeHtml(address)}` : ''}</p>`,
        '</div>',
        '</div>'
    ].join('');
}
function buildProspectEmailText(message, signer = DEFAULT_SIGNER, address = null) {
    const phone = signer.phone?.trim();
    return [
        message.trim(),
        '',
        'Best,',
        signerName(signer),
        'HomeQuote Network',
        ...phone ? [
            phone
        ] : [],
        '',
        '--',
        OPT_OUT_LINE,
        ...address ? [
            `HomeQuote Network · ${address}`
        ] : []
    ].join('\n');
}
function paragraphsHtml(paragraphs) {
    return paragraphs.map((paragraph)=>`<p style="margin:0 0 16px 0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}
function buildBrandedEmailHtml(paragraphs, options) {
    const safeLogoUrl = escapeHtml(options.logoUrl);
    const cta = options.ctaText && options.ctaUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;"><tr><td style="border-radius:8px;background:#0038B8;"><a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(options.ctaText)}</a></td></tr></table>` : '';
    return [
        '<div style="margin:0;padding:0;background:#ffffff;color:#0A1B3D;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">',
        '<div style="max-width:600px;margin:0;padding:4px 0;">',
        `<img src="${safeLogoUrl}" width="40" height="40" alt="HomeQuote Network" style="display:block;width:40px;height:40px;margin-bottom:20px;border:0;outline:none;text-decoration:none;">`,
        paragraphsHtml(paragraphs),
        cta,
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid #DCE4F2;padding-top:16px;border-collapse:separate;">',
        '<tr><td style="padding:0;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;line-height:1.4;">',
        '<div style="font-size:14px;font-weight:700;color:#0038B8;">HomeQuote Network</div>',
        `<div style="font-size:13px;color:#5B6B8C;">${escapeHtml(options.footerNote ?? 'Homeowner qualification & contractor appointments')}</div>`,
        '</td></tr>',
        '</table>',
        '</div>',
        '</div>'
    ].join('');
}
function buildBrandedEmailText(paragraphs, options = {}) {
    return `${paragraphs.join('\n\n')}\n\n—\nHomeQuote Network\n${options.footerNote ?? 'homequotenet.com'}`;
}
}),
"[project]/lib/emails/gmail-message.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildRawGmailMessage",
    ()=>buildRawGmailMessage,
    "deliverGmailWithAccessToken",
    ()=>deliverGmailWithAccessToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/template.ts [app-rsc] (ecmascript)");
;
function encodedHeader(value) {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}
/** Plain ASCII names go in as-is; anything else is RFC 2047 encoded. */ function displayName(name) {
    return /^[\x20-\x7e]+$/.test(name) ? name : encodedHeader(name);
}
/** Display name for the From header; letters, digits, spaces and · & ' . - only. */ function fromName(name) {
    const safe = (name ?? '').replace(/[^\p{L}\p{N} ·&'.-]/gu, '').trim().slice(0, 80);
    return safe || 'HomeQuote Network';
}
function buildRawGmailMessage(input) {
    const boundary = 'hqn-prospect-email-boundary';
    const mixed = 'hqn-prospect-email-mixed';
    const attachments = (input.attachments ?? []).filter((a)=>/^[\w.-]{1,80}$/.test(a.filename) && !/[\r\n]/.test(a.contentType));
    const lines = [
        `From: ${displayName(fromName(input.fromName))} <${input.fromEmail}>`,
        `To: ${input.toEmail}`,
        ...input.replyTo && /^[^\s<>@,;]+@[^\s<>@,;]+$/.test(input.replyTo) ? [
            `Reply-To: ${input.replyTo}`
        ] : [],
        `Subject: ${encodedHeader(input.subject)}`,
        'MIME-Version: 1.0',
        ...attachments.length ? [
            `Content-Type: multipart/mixed; boundary="${mixed}"`,
            '',
            `--${mixed}`
        ] : [],
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        (input.text ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildProspectEmailText"])(input.message)).replace(/\r?\n/g, '\r\n'),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        input.html,
        '',
        `--${boundary}--`,
        ...attachments.flatMap((a)=>[
                '',
                `--${mixed}`,
                `Content-Type: ${a.contentType}; name="${a.filename}"`,
                `Content-Disposition: attachment; filename="${a.filename}"`,
                'Content-Transfer-Encoding: base64',
                '',
                ...Buffer.from(a.content, 'utf8').toString('base64').match(/.{1,76}/g) ?? []
            ]),
        ...attachments.length ? [
            '',
            `--${mixed}--`
        ] : []
    ];
    return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}
async function deliverGmailWithAccessToken(accessToken, input, request = fetch) {
    const response = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            raw: buildRawGmailMessage(input)
        })
    });
    const json = await response.json().catch(()=>({}));
    if (!response.ok || !json.id) {
        throw new Error(json.error?.message || 'Gmail did not accept the message');
    }
    return {
        id: json.id
    };
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/emails/token-crypto.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptToken",
    ()=>decryptToken,
    "encryptToken",
    ()=>encryptToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
function encryptToken(token, key) {
    const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(12);
    const cipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createCipheriv"])('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final()
    ]);
    return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}
function decryptToken(value, key) {
    const [version, ivText, tagText, ciphertextText] = value.split('.');
    if (version !== 'v1' || !ivText || !tagText || !ciphertextText) {
        throw new Error('Stored Gmail token is invalid');
    }
    const decipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createDecipheriv"])('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextText, 'base64url')),
        decipher.final()
    ]).toString('utf8');
}
}),
"[project]/lib/emails/gmail.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_AUTOMATION_EMAIL",
    ()=>DEFAULT_AUTOMATION_EMAIL,
    "GMAIL_IDENTITY_SCOPES",
    ()=>GMAIL_IDENTITY_SCOPES,
    "GMAIL_SEND_SCOPE",
    ()=>GMAIL_SEND_SCOPE,
    "decryptRefreshToken",
    ()=>decryptRefreshToken,
    "encryptRefreshToken",
    ()=>encryptRefreshToken,
    "fetchAuthorizedEmail",
    ()=>fetchAuthorizedEmail,
    "getGmailConnectionStatus",
    ()=>getGmailConnectionStatus,
    "gmailEnvironmentReady",
    ()=>gmailEnvironmentReady,
    "gmailOAuthConfig",
    ()=>gmailOAuthConfig,
    "resolveGmailSender",
    ()=>resolveGmailSender,
    "saveGmailConnection",
    ()=>saveGmailConnection,
    "sendGmailMessage",
    ()=>sendGmailMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2d$message$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/gmail-message.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/token-crypto.ts [app-rsc] (ecmascript)");
;
;
;
;
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_IDENTITY_SCOPES = [
    'openid',
    'email'
];
const DEFAULT_AUTOMATION_EMAIL = 'info@homequotenet.com';
function required(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}
function encryptionKey() {
    const raw = required('GMAIL_TOKEN_ENCRYPTION_KEY');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    return key;
}
function encryptRefreshToken(token, key = encryptionKey()) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["encryptToken"])(token, key);
}
function decryptRefreshToken(value, key = encryptionKey()) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decryptToken"])(value, key);
}
function gmailOAuthConfig() {
    return {
        clientId: required('GOOGLE_GMAIL_CLIENT_ID'),
        clientSecret: required('GOOGLE_GMAIL_CLIENT_SECRET'),
        redirectUri: required('GMAIL_OAUTH_REDIRECT_URI'),
        // Only a hint for the automation account chooser. Whichever account is
        // actually approved becomes the sender, so changing it never needs an env edit.
        automationHintEmail: process.env.GMAIL_AUTOMATION_EMAIL?.trim() || DEFAULT_AUTOMATION_EMAIL
    };
}
function gmailEnvironmentReady() {
    try {
        gmailOAuthConfig();
        encryptionKey();
        return true;
    } catch  {
        return false;
    }
}
async function fetchAuthorizedEmail(accessToken, request = fetch) {
    const response = await request('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    if (!response.ok) return null;
    const json = await response.json().catch(()=>({}));
    return json.email?.trim() || null;
}
/**
 * The connection a send should use: the member's own when they have one,
 * otherwise the shared automation sender. Automations pass no userId.
 */ async function loadConnection(admin, userId) {
    const columns = 'id, kind, email_address, encrypted_refresh_token';
    if (userId) {
        const { data, error } = await admin.from('gmail_connections').select(columns).eq('kind', 'user').eq('user_id', userId).maybeSingle();
        if (error) throw new Error(error.message);
        if (data) return data;
    }
    const { data, error } = await admin.from('gmail_connections').select(columns).eq('kind', 'automation').maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
}
async function resolveGmailSender(userId) {
    const connection = await loadConnection((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])(), userId);
    return connection ? {
        kind: connection.kind,
        email: connection.email_address
    } : null;
}
async function saveGmailConnection(input) {
    if (!input.scope.split(/\s+/).includes(GMAIL_SEND_SCOPE)) {
        throw new Error('Google did not grant the Gmail send permission');
    }
    if (input.kind === 'user' && !input.userId) throw new Error('A team member is required for a personal sender');
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const values = {
        email_address: input.authorizedEmail,
        encrypted_refresh_token: encryptRefreshToken(input.refreshToken),
        granted_scope: input.scope,
        connected_by: input.connectedBy,
        connected_at: new Date().toISOString(),
        last_error: null
    };
    let existing = admin.from('gmail_connections').select('id').eq('kind', input.kind);
    if (input.kind === 'user') existing = existing.eq('user_id', input.userId);
    const { data: row, error: lookupError } = await existing.maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const { error } = row ? await admin.from('gmail_connections').update(values).eq('id', row.id) : await admin.from('gmail_connections').insert({
        ...values,
        kind: input.kind,
        user_id: input.kind === 'user' ? input.userId : null
    });
    if (error) throw new Error(error.message);
}
async function getGmailConnectionStatus(userId) {
    const environmentReady = gmailEnvironmentReady();
    if (!environmentReady) return {
        environmentReady,
        automation: null,
        mine: null,
        canSend: false
    };
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data } = await admin.from('gmail_connections').select('kind, user_id, email_address, last_error');
    const rows = data ?? [];
    const toStatus = (row)=>row ? {
            email: row.email_address,
            lastError: row.last_error
        } : null;
    const automation = toStatus(rows.find((row)=>row.kind === 'automation'));
    const mine = userId ? toStatus(rows.find((row)=>row.kind === 'user' && row.user_id === userId)) : null;
    return {
        environmentReady,
        automation,
        mine,
        canSend: !!(mine || automation)
    };
}
async function sendGmailMessage(input, request = fetch) {
    const config = gmailOAuthConfig();
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { senderUserId, ...message } = input;
    const connection = await loadConnection(admin, senderUserId);
    if (!connection) throw new Error('HomeQuote Gmail is not connected');
    const tokenResponse = await request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: decryptRefreshToken(connection.encrypted_refresh_token),
            grant_type: 'refresh_token'
        })
    });
    const tokenJson = await tokenResponse.json().catch(()=>({}));
    if (!tokenResponse.ok || !tokenJson.access_token) {
        const detail = tokenJson.error_description || 'Google rejected the Gmail connection';
        await admin.from('gmail_connections').update({
            last_error: detail
        }).eq('id', connection.id);
        throw new Error(connection.kind === 'user' ? `${detail}. Reconnect your Gmail on the Emails page.` : detail);
    }
    let delivered;
    try {
        delivered = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2d$message$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deliverGmailWithAccessToken"])(tokenJson.access_token, {
            fromEmail: connection.email_address,
            ...message
        }, request);
    } catch (error) {
        const detail = error.message;
        await admin.from('gmail_connections').update({
            last_error: detail
        }).eq('id', connection.id);
        throw new Error(detail);
    }
    await admin.from('gmail_connections').update({
        last_used_at: new Date().toISOString(),
        last_error: null
    }).eq('id', connection.id);
    return {
        id: delivered.id,
        fromEmail: connection.email_address
    };
}
}),
"[project]/lib/auth/site-url.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Production fallback so a missing env var can never send a customer to localhost. */ __turbopack_context__.s([
    "PRODUCTION_SITE_URL",
    ()=>PRODUCTION_SITE_URL,
    "publicSiteUrl",
    ()=>publicSiteUrl
]);
const PRODUCTION_SITE_URL = 'https://homequotenet.com';
const isLocal = (url)=>/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);
function publicSiteUrl(env = process.env) {
    const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
    const production = env.NODE_ENV === 'production';
    if (configured && !(production && isLocal(configured))) return configured;
    if (!production) return 'http://localhost:3000';
    const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    return PRODUCTION_SITE_URL;
}
}),
"[project]/lib/auth/password-reset.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildResetEmail",
    ()=>buildResetEmail,
    "resetPageUrl",
    ()=>resetPageUrl,
    "sendPasswordReset",
    ()=>sendPasswordReset
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/gmail.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/template.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/site-url.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
function resetPageUrl(tokenHash, base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicSiteUrl"])()) {
    return `${base}/reset-password?token_hash=${encodeURIComponent(tokenHash)}`;
}
function buildResetEmail(link, base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicSiteUrl"])()) {
    const paragraphs = [
        'We received a request to reset the password on your HomeQuote Network account.',
        'Click the button below to choose a new password. The link works once and expires in one hour.',
        'If you did not ask for this, you can ignore this email — your password will not change.'
    ];
    const html = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildBrandedEmailHtml"])(paragraphs, {
        logoUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["emailLogoUrl"])(base),
        ctaText: 'Reset my password',
        ctaUrl: link,
        footerNote: 'Secure account email from HomeQuote Network'
    });
    const text = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$template$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildBrandedEmailText"])(paragraphs, {
        footerNote: 'homequotenet.com'
    })}\n\nReset my password: ${link}`;
    return {
        subject: 'Reset your HomeQuote Network password',
        html,
        text
    };
}
async function sendPasswordReset(email) {
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicSiteUrl"])();
    try {
        const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
        const { data, error } = await admin.auth.admin.generateLink({
            type: 'recovery',
            email
        });
        const tokenHash = data?.properties?.hashed_token;
        if (error || !tokenHash) return 'skipped'; // unknown email: silently nothing
        const mail = buildResetEmail(resetPageUrl(tokenHash, base), base);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendGmailMessage"])({
            toEmail: email,
            subject: mail.subject,
            message: mail.text,
            html: mail.html,
            text: mail.text
        });
        return 'sent';
    } catch (e) {
        console.error('[password-reset] HomeQuote email failed, using fallback:', e instanceof Error ? e.message : e);
        try {
            const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${base}/auth/callback?next=/set-password`
            });
            return 'fallback';
        } catch  {
            return 'skipped';
        }
    }
}
}),
"[project]/lib/actions/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00dd11f639e0468ef728ef6bec526e6e0b9c39e221":"signOutAction","6007fa06dd8623bc726270e2cb7713f876fae597e2":"continueResetAction","6040277171691c5ce0867dc08f5436fad13bfcff7a":"forgotPasswordAction","6041787c0bcfab5e75cf71a65bc81589ce4ee7049e":"signUpAction","604b9d690f9c63f80ac44fbd9c92ccf3643388703c":"signInAction","60b76751e145a9f18f866e2bf943be0fb67ee7552e":"setPasswordAction"},"",""] */ __turbopack_context__.s([
    "continueResetAction",
    ()=>continueResetAction,
    "forgotPasswordAction",
    ()=>forgotPasswordAction,
    "setPasswordAction",
    ()=>setPasswordAction,
    "signInAction",
    ()=>signInAction,
    "signOutAction",
    ()=>signOutAction,
    "signUpAction",
    ()=>signUpAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nav.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calls$2f$redirect$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/calls/redirect.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$password$2d$reset$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/password-reset.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
const signInSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Enter a valid email'),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Password is required')
});
const signUpSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    fullName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Your name is required'),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Enter a valid email'),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters')
});
const emailSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Enter a valid email')
});
const passwordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters'),
    confirm: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
}).refine((v)=>v.password === v.confirm, {
    message: 'Passwords do not match',
    path: [
        'confirm'
    ]
});
async function signInAction(_prev, formData) {
    const parsed = signInSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    });
    if (!parsed.success) {
        return {
            error: parsed.error.errors[0].message
        };
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return {
        error: error.message
    };
    // Where this user belongs depends on their role, which lives on the
    // profile, not the auth user. Read it once here rather than bouncing them
    // through /app to find out.
    let role = 'setter';
    if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role) role = profile.role;
        // Record last login (own-row update; allowed by RLS + privilege guard).
        await supabase.from('profiles').update({
            last_login_at: new Date().toISOString()
        }).eq('id', data.user.id);
    }
    // Honour the page they originally asked for, but only if it is ours.
    const next = formData.get('next');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calls$2f$redirect$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["safeNextPath"])(typeof next === 'string' ? next : null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["homePathFor"])(role)));
}
async function signUpAction(_prev, formData) {
    const parsed = signUpSchema.safeParse({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password')
    });
    if (!parsed.success) {
        return {
            error: parsed.error.errors[0].message
        };
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
            data: {
                full_name: parsed.data.fullName
            }
        }
    });
    if (error) return {
        error: error.message
    };
    // New accounts are created inactive; an admin must enable them.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/pending');
}
async function signOutAction() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    await supabase.auth.signOut();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/sign-in');
}
async function forgotPasswordAction(_prev, formData) {
    const parsed = emailSchema.safeParse({
        email: formData.get('email')
    });
    if (!parsed.success) return {
        error: parsed.error.errors[0].message
    };
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$password$2d$reset$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendPasswordReset"])(parsed.data.email);
    return {
        success: 'If an account exists for that email, a reset link is on its way. It expires in one hour.'
    };
}
async function continueResetAction(_prev, formData) {
    const tokenHash = formData.get('token_hash');
    if (typeof tokenHash !== 'string' || tokenHash.length < 10 || tokenHash.length > 200) {
        return {
            error: 'This link isn’t valid. Request a new one.'
        };
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
    });
    if (error) return {
        error: 'This link has expired or was already used. Request a new one.'
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/set-password');
}
async function setPasswordAction(_prev, formData) {
    const parsed = passwordSchema.safeParse({
        password: formData.get('password'),
        confirm: formData.get('confirm')
    });
    if (!parsed.success) return {
        error: parsed.error.errors[0].message
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: 'This link has expired. Request a new one from the sign-in page.'
        };
    }
    const { error } = await supabase.auth.updateUser({
        password: parsed.data.password
    });
    if (error) return {
        error: error.message
    };
    const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single();
    if (!profile?.is_active) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/pending');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["homePathFor"])(profile.role ?? 'setter'));
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    signInAction,
    signUpAction,
    signOutAction,
    forgotPasswordAction,
    continueResetAction,
    setPasswordAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signInAction, "604b9d690f9c63f80ac44fbd9c92ccf3643388703c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signUpAction, "6041787c0bcfab5e75cf71a65bc81589ce4ee7049e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signOutAction, "00dd11f639e0468ef728ef6bec526e6e0b9c39e221", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(forgotPasswordAction, "6040277171691c5ce0867dc08f5436fad13bfcff7a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(continueResetAction, "6007fa06dd8623bc726270e2cb7713f876fae597e2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(setPasswordAction, "60b76751e145a9f18f866e2bf943be0fb67ee7552e", null);
}),
"[project]/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-rsc] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/components/ui/button.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Slot$3e$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-rsc] (ecmascript) <export * as Slot>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
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
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Slot$3e$__["Slot"].Slot : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "button",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
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
;
}),
"[project]/components/mobile/mobile-shell.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MobileChrome",
    ()=>MobileChrome,
    "isFocusedRoute",
    ()=>isFocusedRoute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MobileChrome = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MobileChrome() from the server but MobileChrome is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/mobile/mobile-shell.tsx <module evaluation>", "MobileChrome");
const isFocusedRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call isFocusedRoute() from the server but isFocusedRoute is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/mobile/mobile-shell.tsx <module evaluation>", "isFocusedRoute");
}),
"[project]/components/mobile/mobile-shell.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MobileChrome",
    ()=>MobileChrome,
    "isFocusedRoute",
    ()=>isFocusedRoute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MobileChrome = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MobileChrome() from the server but MobileChrome is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/mobile/mobile-shell.tsx", "MobileChrome");
const isFocusedRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call isFocusedRoute() from the server but isFocusedRoute is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/mobile/mobile-shell.tsx", "isFocusedRoute");
}),
"[project]/components/mobile/mobile-shell.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$mobile$2f$mobile$2d$shell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/mobile/mobile-shell.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$mobile$2f$mobile$2d$shell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/mobile/mobile-shell.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$mobile$2f$mobile$2d$shell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/notifications/notification-bell.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "NotificationBell",
    ()=>NotificationBell,
    "NotificationPanel",
    ()=>NotificationPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const NotificationBell = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NotificationBell() from the server but NotificationBell is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/notification-bell.tsx <module evaluation>", "NotificationBell");
const NotificationPanel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NotificationPanel() from the server but NotificationPanel is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/notification-bell.tsx <module evaluation>", "NotificationPanel");
}),
"[project]/components/notifications/notification-bell.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "NotificationBell",
    ()=>NotificationBell,
    "NotificationPanel",
    ()=>NotificationPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const NotificationBell = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NotificationBell() from the server but NotificationBell is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/notification-bell.tsx", "NotificationBell");
const NotificationPanel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NotificationPanel() from the server but NotificationPanel is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/notification-bell.tsx", "NotificationPanel");
}),
"[project]/components/notifications/notification-bell.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$notification$2d$bell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/notifications/notification-bell.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$notification$2d$bell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/notifications/notification-bell.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$notification$2d$bell$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/notifications/portal-push-boot.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "PortalPushBoot",
    ()=>PortalPushBoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PortalPushBoot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PortalPushBoot() from the server but PortalPushBoot is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/portal-push-boot.tsx <module evaluation>", "PortalPushBoot");
}),
"[project]/components/notifications/portal-push-boot.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "PortalPushBoot",
    ()=>PortalPushBoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PortalPushBoot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PortalPushBoot() from the server but PortalPushBoot is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/portal-push-boot.tsx", "PortalPushBoot");
}),
"[project]/components/notifications/portal-push-boot.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$portal$2d$push$2d$boot$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/notifications/portal-push-boot.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$portal$2d$push$2d$boot$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/notifications/portal-push-boot.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$portal$2d$push$2d$boot$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/notifications/sign-out-form.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "SignOutForm",
    ()=>SignOutForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const SignOutForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call SignOutForm() from the server but SignOutForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/sign-out-form.tsx <module evaluation>", "SignOutForm");
}),
"[project]/components/notifications/sign-out-form.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "SignOutForm",
    ()=>SignOutForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const SignOutForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call SignOutForm() from the server but SignOutForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/sign-out-form.tsx", "SignOutForm");
}),
"[project]/components/notifications/sign-out-form.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/notifications/sign-out-form.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/notifications/sign-out-form.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/ui/toaster.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Toaster",
    ()=>Toaster,
    "toast",
    ()=>toast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Toaster = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Toaster() from the server but Toaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/ui/toaster.tsx <module evaluation>", "Toaster");
const toast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call toast() from the server but toast is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/ui/toaster.tsx <module evaluation>", "toast");
}),
"[project]/components/ui/toaster.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Toaster",
    ()=>Toaster,
    "toast",
    ()=>toast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Toaster = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Toaster() from the server but Toaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/ui/toaster.tsx", "Toaster");
const toast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call toast() from the server but toast is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/ui/toaster.tsx", "toast");
}),
"[project]/components/ui/toaster.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/ui/toaster.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/ui/toaster.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/brand-logo.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BrandLogo",
    ()=>BrandLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-rsc] (ecmascript)");
;
;
/*
 * HomeQuote artwork, served from /brand (extracted from the brand guidelines).
 * The files already carry the guideline clear space (one quote-mark width on
 * every side), so size them directly and do not add tight padding or crop them.
 *
 * - tone="primary":  blue/navy logo for white and Mist surfaces.
 * - tone="reversed": white/gold logo for Navy and Blue surfaces. Never use the
 *   primary logo on Blue (guideline).
 * - variant="mark":  the house-and-quote icon alone, for tight spaces.
 *
 * Plain <img> on purpose: these are small SVGs, so next/image optimisation
 * adds nothing.
 */ const ART = {
    horizontal: {
        primary: '/brand/homequote-logo-primary-horizontal.svg',
        reversed: '/brand/homequote-logo-reversed-horizontal.svg',
        width: 1200,
        height: 348
    },
    mark: {
        primary: '/brand/homequote-icon-primary.svg',
        reversed: '/brand/homequote-icon-reversed.svg',
        width: 1,
        height: 1
    }
};
function BrandLogo({ variant = 'horizontal', tone = 'primary', className, priority }) {
    const art = ART[variant];
    return(// eslint-disable-next-line @next/next/no-img-element
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: art[tone],
        width: art.width,
        height: art.height,
        alt: "HomeQuote",
        loading: priority ? 'eager' : 'lazy',
        decoding: "async",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])('h-auto', className)
    }, void 0, false, {
        fileName: "[project]/components/brand-logo.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this));
}
}),
"[project]/components/notifications/install-helper.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "InstallHelper",
    ()=>InstallHelper,
    "InstallSteps",
    ()=>InstallSteps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const InstallHelper = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call InstallHelper() from the server but InstallHelper is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/install-helper.tsx <module evaluation>", "InstallHelper");
const InstallSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call InstallSteps() from the server but InstallSteps is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/install-helper.tsx <module evaluation>", "InstallSteps");
}),
"[project]/components/notifications/install-helper.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "InstallHelper",
    ()=>InstallHelper,
    "InstallSteps",
    ()=>InstallSteps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const InstallHelper = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call InstallHelper() from the server but InstallHelper is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/install-helper.tsx", "InstallHelper");
const InstallSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call InstallSteps() from the server but InstallSteps is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/notifications/install-helper.tsx", "InstallSteps");
}),
"[project]/components/notifications/install-helper.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$install$2d$helper$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/notifications/install-helper.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$install$2d$helper$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/notifications/install-helper.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$install$2d$helper$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/assistant/assistant-root.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AssistantRoot",
    ()=>AssistantRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AssistantRoot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AssistantRoot() from the server but AssistantRoot is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/assistant/assistant-root.tsx <module evaluation>", "AssistantRoot");
}),
"[project]/components/assistant/assistant-root.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "AssistantRoot",
    ()=>AssistantRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AssistantRoot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AssistantRoot() from the server but AssistantRoot is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/assistant/assistant-root.tsx", "AssistantRoot");
}),
"[project]/components/assistant/assistant-root.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$assistant$2d$root$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/assistant/assistant-root.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$assistant$2d$root$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/assistant/assistant-root.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$assistant$2d$root$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/lib/assistant/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Assistant settings. Everything tunable lives here or in env vars; nothing is hardcoded in the UI.
 * No 'server-only' import: the greeting/intro constants are also read by client components.
 */ /** The first thing the assistant says. Rename it here. */ __turbopack_context__.s([
    "ASSISTANT_GREETING",
    ()=>ASSISTANT_GREETING,
    "ASSISTANT_INTRO",
    ()=>ASSISTANT_INTRO,
    "ASSISTANT_ROLES",
    ()=>ASSISTANT_ROLES,
    "ASSISTANT_TITLE",
    ()=>ASSISTANT_TITLE,
    "DEFAULT_MODEL",
    ()=>DEFAULT_MODEL,
    "assistantEffort",
    ()=>assistantEffort,
    "assistantLimits",
    ()=>assistantLimits,
    "assistantModel",
    ()=>assistantModel,
    "isAnthropicConfigured",
    ()=>isAnthropicConfigured,
    "isAssistantEnabled",
    ()=>isAssistantEnabled
]);
const ASSISTANT_GREETING = 'Complote?';
const ASSISTANT_INTRO = 'Ask me about your leads, appointments, or what needs your attention.';
const ASSISTANT_TITLE = 'Assistant';
const ASSISTANT_ROLES = [
    'admin',
    'setter',
    'contractor'
];
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const num = (name, fallback, min, max)=>{
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback;
};
function assistantModel() {
    return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}
function assistantEffort() {
    const v = process.env.ASSISTANT_EFFORT?.trim();
    return v === 'medium' || v === 'high' ? v : 'low';
}
function isAssistantEnabled() {
    return process.env.ASSISTANT_ENABLED?.trim().toLowerCase() !== 'false';
}
function isAnthropicConfigured() {
    return !!process.env.ANTHROPIC_API_KEY?.trim();
}
function assistantLimits() {
    return {
        maxOutputTokens: Math.round(num('ASSISTANT_MAX_OUTPUT_TOKENS', 1500, 200, 8000)),
        maxToolRounds: Math.round(num('ASSISTANT_MAX_TOOL_ROUNDS', 5, 1, 10)),
        maxToolResultChars: 6000,
        maxUserMessageChars: 2000,
        historyMessages: 10,
        userDailyUsd: num('ASSISTANT_USER_DAILY_USD', 1.5, 0.05, 1000),
        tenantMonthlyUsd: num('ASSISTANT_TENANT_MONTHLY_USD', 20, 0.5, 100000),
        orgMonthlyUsd: num('ASSISTANT_ORG_MONTHLY_USD', 100, 1, 100000),
        perMinute: Math.round(num('ASSISTANT_RATE_LIMIT_PER_MIN', 8, 1, 120))
    };
}
}),
"[project]/lib/assistant/access.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LEAD_SAFE_COLUMNS",
    ()=>LEAD_SAFE_COLUMNS,
    "canUseAssistant",
    ()=>canUseAssistant,
    "hasDataAccess",
    ()=>hasDataAccess,
    "isStaff",
    ()=>isStaff,
    "loadAccessibleLead",
    ()=>loadAccessibleLead,
    "tenantOf",
    ()=>tenantOf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/assistant/config.ts [app-rsc] (ecmascript)");
;
;
function canUseAssistant(profile) {
    return profile.is_active && !profile.deleted_at && profile.account_status === 'active' && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ASSISTANT_ROLES"].includes(profile.role);
}
function tenantOf(profile) {
    return profile.role === 'contractor' ? profile.contractor_id : null;
}
const isStaff = (profile)=>profile.role === 'admin' || profile.role === 'setter';
function hasDataAccess(profile) {
    return isStaff(profile) || profile.role === 'contractor' && !!profile.contractor_id;
}
const LEAD_SAFE_COLUMNS = 'id, first_name, last_name, email, phone, address, city, state, zip, status, project_description, budget_range, timeline, urgency, source, notes, created_at, last_contact_date, qualification_status';
async function loadAccessibleLead(db, profile, leadId, columns = LEAD_SAFE_COLUMNS) {
    if (!hasDataAccess(profile)) return null;
    const tenant = tenantOf(profile);
    let q = db.from('leads').select(tenant ? `${columns}, lead_assignments!inner(contractor_id)` : columns).eq('id', leadId);
    if (tenant) q = q.eq('lead_assignments.contractor_id', tenant);
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const { lead_assignments: _drop, ...lead } = data;
    void _drop;
    return lead;
}
}),
"[project]/lib/contracts/types.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Contract document model. Pure (safe to import from client components).
 *
 * Content is a small, whitelisted subset of the TipTap/ProseMirror JSON schema, grouped into ordered SECTIONS.
 * The same normalized content is rendered by the HTML preview and by the PDF generator (see render-model.ts),
 * so the two cannot drift structurally.
 */ __turbopack_context__.s([
    "BRANDING_MODES",
    ()=>BRANDING_MODES,
    "BRANDING_MODE_LABELS",
    ()=>BRANDING_MODE_LABELS,
    "LIMITS",
    ()=>LIMITS,
    "LOGO_SIZES",
    ()=>LOGO_SIZES,
    "NODE_TYPES",
    ()=>NODE_TYPES,
    "brandingSchema",
    ()=>brandingSchema,
    "clientSchema",
    ()=>clientSchema,
    "defaultBranding",
    ()=>defaultBranding,
    "emptyDoc",
    ()=>emptyDoc,
    "sanitizeDoc",
    ()=>sanitizeDoc,
    "sectionSchema",
    ()=>sectionSchema,
    "sectionsSchema",
    ()=>sectionsSchema,
    "settingsSchema",
    ()=>settingsSchema,
    "signerSchema",
    ()=>signerSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const NODE_TYPES = [
    'doc',
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
    'hardBreak',
    'text',
    'pageBreak',
    'horizontalRule'
];
const NODE_SET = new Set(NODE_TYPES);
const MARK_SET = new Set([
    'bold',
    'italic',
    'underline'
]);
const LIMITS = {
    maxSections: 40,
    maxDocBytes: 150_000,
    maxTitle: 200,
    maxVariableLength: 6000,
    maxLogoBytes: 2 * 1024 * 1024,
    maxAttachmentBytes: 8 * 1024 * 1024,
    maxAttachments: 5,
    maxSigners: 6
};
function sanitizeDoc(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 12) return null;
    const n = node;
    const type = typeof n.type === 'string' ? n.type : '';
    if (!NODE_SET.has(type)) return null;
    const out = {
        type
    };
    if (type === 'text') {
        if (typeof n.text !== 'string' || !n.text) return null;
        out.text = n.text.slice(0, 20_000);
        const marks = Array.isArray(n.marks) ? n.marks : [];
        const kept = marks.filter((m)=>!!m && typeof m === 'object' && MARK_SET.has(m.type)).map((m)=>({
                type: m.type
            }));
        if (kept.length) out.marks = kept;
        return out;
    }
    if (type === 'heading') {
        const level = Number(n.attrs?.level);
        out.attrs = {
            level: level === 1 || level === 3 ? level : 2
        };
    }
    if (type === 'orderedList') {
        const start = Number(n.attrs?.start);
        if (Number.isInteger(start) && start > 1 && start < 1000) out.attrs = {
            start
        };
    }
    if (type === 'tableCell' || type === 'tableHeader') {
        const a = n.attrs ?? {};
        const span = (v)=>{
            const x = Number(v);
            return Number.isInteger(x) && x > 1 && x <= 12 ? x : undefined;
        };
        const attrs = {};
        if (span(a.colspan)) attrs.colspan = span(a.colspan);
        if (span(a.rowspan)) attrs.rowspan = span(a.rowspan);
        if (Object.keys(attrs).length) out.attrs = attrs;
    }
    if (Array.isArray(n.content)) {
        const kids = n.content.map((c)=>sanitizeDoc(c, depth + 1)).filter((c)=>!!c);
        if (kids.length) out.content = kids;
    }
    return out;
}
const emptyDoc = ()=>({
        type: 'doc',
        content: [
            {
                type: 'paragraph'
            }
        ]
    });
const docSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown().transform((v, ctx)=>{
    const d = sanitizeDoc(v);
    if (!d || d.type !== 'doc') {
        ctx.addIssue({
            code: 'custom',
            message: 'Invalid section content'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].NEVER;
    }
    if (JSON.stringify(d).length > LIMITS.maxDocBytes) {
        ctx.addIssue({
            code: 'custom',
            message: 'A section is too long'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].NEVER;
    }
    return d;
});
const sectionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(60),
    key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(60).default('custom'),
    kind: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'rich',
        'signatures'
    ]).default('rich'),
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(160).default(''),
    showTitle: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true),
    numbered: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true),
    pageBreakBefore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    doc: docSchema
});
const sectionsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(sectionSchema).max(LIMITS.maxSections).superRefine((s, ctx)=>{
    if (new Set(s.map((x)=>x.id)).size !== s.length) ctx.addIssue({
        code: 'custom',
        message: 'Duplicate section ids'
    });
    if (s.filter((x)=>x.kind === 'signatures').length > 1) ctx.addIssue({
        code: 'custom',
        message: 'Only one signatures section is allowed'
    });
});
const BRANDING_MODES = [
    'side_by_side',
    'homequote_only',
    'client_only',
    'none'
];
const BRANDING_MODE_LABELS = {
    side_by_side: 'Both logos side by side',
    homequote_only: 'HomeQuote logo only',
    client_only: 'Client logo only',
    none: 'No logos'
};
const LOGO_SIZES = {
    small: 34,
    medium: 44,
    large: 56
};
const brandingSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    mode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(BRANDING_MODES).default('side_by_side'),
    /** Put the client logo on the left (default: HomeQuote on the left). */ swap: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    size: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'small',
        'medium',
        'large'
    ]).default('medium'),
    /** center = grouped in the middle with a divider; spread = HomeQuote left edge, client right edge. */ align: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'center',
        'spread'
    ]).default('center'),
    /** Logo uploaded for THIS agreement (storage path in contract-assets). Falls back to the CRM logo. */ clientLogoPath: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(300).nullable().default(null),
    /** Use the saved CRM logo when no agreement-specific logo is set. */ useCrmLogo: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true)
});
const defaultBranding = ()=>brandingSchema.parse({});
const signerSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    /** "client" | "homequote" | "other" - decides which company the signature block is for. */ role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'client',
        'homequote',
        'other'
    ]),
    label: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(80),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Enter the signer’s name').max(200),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().toLowerCase().email('Enter a valid email').max(254)
});
const clientSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    company: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(200).default(''),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(200).default(''),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(254).default(''),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(60).default(''),
    address: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(400).default('')
});
const settingsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    signingOrder: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'sequential',
        'parallel'
    ]).default('sequential'),
    expiryDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(14),
    subject: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(200).default(''),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(4000).default(''),
    autoRemindDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(30).nullable().default(3),
    /** Admin confirmed they know placeholder passages ([REVIEW: ...]) remain in the text. */ placeholdersAcknowledged: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    roles: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        label: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })).optional()
});
}),
"[project]/lib/contracts/storage.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CONTRACT_ASSETS_BUCKET",
    ()=>CONTRACT_ASSETS_BUCKET,
    "assetUrl",
    ()=>assetUrl,
    "getAsset",
    ()=>getAsset,
    "putAsset",
    ()=>putAsset,
    "removeAsset",
    ()=>removeAsset
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
;
;
const CONTRACT_ASSETS_BUCKET = 'contract-assets';
async function putAsset(path, bytes, contentType) {
    const { error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(CONTRACT_ASSETS_BUCKET).upload(path, bytes, {
        contentType,
        upsert: false,
        cacheControl: '3600'
    });
    if (error) throw new Error('The file could not be stored.');
}
async function getAsset(path) {
    const { data, error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(CONTRACT_ASSETS_BUCKET).download(path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
}
async function removeAsset(path) {
    if (!path) return;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(CONTRACT_ASSETS_BUCKET).remove([
        path
    ]).catch(()=>undefined);
}
async function assetUrl(path, seconds = 3600) {
    if (!path) return null;
    const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(CONTRACT_ASSETS_BUCKET).createSignedUrl(path, seconds);
    return data?.signedUrl ?? null;
}
}),
"[externals]/fontkit [external] (fontkit, esm_import)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

const mod = await __turbopack_context__.y("fontkit");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/@napi-rs/canvas [external] (@napi-rs/canvas, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@napi-rs/canvas", () => require("@napi-rs/canvas"));

module.exports = mod;
}),
"[project]/lib/contracts/logo.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LogoRejected",
    ()=>LogoRejected,
    "initialsOf",
    ()=>initialsOf,
    "loadHomeQuoteLogo",
    ()=>loadHomeQuoteLogo,
    "normalizeLogo",
    ()=>normalizeLogo,
    "sniffImage",
    ()=>sniffImage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$napi$2d$rs$2f$canvas__$5b$external$5d$__$2840$napi$2d$rs$2f$canvas$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@napi-rs/canvas [external] (@napi-rs/canvas, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/types.ts [app-rsc] (ecmascript)");
;
;
;
;
;
class LogoRejected extends Error {
}
function sniffImage(b) {
    if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (b.length > 16 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') return 'webp';
    return null;
}
const MAX_SOURCE_PX = 6000;
const MAX_OUT_W = 900, MAX_OUT_H = 450;
async function normalizeLogo(input) {
    if (!input.length) throw new LogoRejected('That file is empty.');
    if (input.length > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxLogoBytes) throw new LogoRejected('Logos can be up to 2 MB.');
    if (!sniffImage(input)) throw new LogoRejected('Use a PNG, JPG or WebP image.');
    let img;
    try {
        img = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f40$napi$2d$rs$2f$canvas__$5b$external$5d$__$2840$napi$2d$rs$2f$canvas$2c$__cjs$29$__["loadImage"])(Buffer.from(input));
    } catch  {
        throw new LogoRejected('That image could not be read.');
    }
    if (!img.width || !img.height) throw new LogoRejected('That image could not be read.');
    if (img.width > MAX_SOURCE_PX || img.height > MAX_SOURCE_PX) throw new LogoRejected('That image is too large (6000 px maximum).');
    if (img.width < 24 || img.height < 24) throw new LogoRejected('That image is too small to use as a logo (24 px minimum).');
    // Trim fully transparent margins so every logo fills its box the same way.
    const probe = (0, __TURBOPACK__imported__module__$5b$externals$5d2f40$napi$2d$rs$2f$canvas__$5b$external$5d$__$2840$napi$2d$rs$2f$canvas$2c$__cjs$29$__["createCanvas"])(img.width, img.height);
    const pctx = probe.getContext('2d');
    pctx.drawImage(img, 0, 0);
    const data = pctx.getImageData(0, 0, img.width, img.height).data;
    let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
    for(let y = 0; y < img.height; y++){
        for(let x = 0; x < img.width; x++){
            if (data[(y * img.width + x) * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) throw new LogoRejected('That image is completely transparent.');
    const sw = maxX - minX + 1, sh = maxY - minY + 1;
    const scale = Math.min(1, MAX_OUT_W / sw, MAX_OUT_H / sh);
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    const out = (0, __TURBOPACK__imported__module__$5b$externals$5d2f40$napi$2d$rs$2f$canvas__$5b$external$5d$__$2840$napi$2d$rs$2f$canvas$2c$__cjs$29$__["createCanvas"])(w, h);
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, minX, minY, sw, sh, 0, 0, w, h);
    const png = new Uint8Array(await out.encode('png'));
    return {
        png,
        width: w,
        height: h
    };
}
let hqLogo;
function loadHomeQuoteLogo() {
    if (hqLogo !== undefined) return hqLogo;
    try {
        hqLogo = new Uint8Array(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), 'public', 'assets', 'brand', 'hq-logo-horizontal.png')));
    } catch  {
        hqLogo = null;
    }
    return hqLogo;
}
function initialsOf(name) {
    const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}
}),
"[project]/lib/contracts/numbers.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Display number for an agreement, e.g. HQ-C-00042. Pure (safe in client components). */ __turbopack_context__.s([
    "contractNumber",
    ()=>contractNumber
]);
const contractNumber = (n)=>n == null ? '' : `HQ-C-${String(n).padStart(5, '0')}`;
}),
"[project]/lib/signing/geometry.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Page geometry for signing fields.
 *
 * Fields are stored as fractions (0..1) of the DISPLAYED page: the page as a viewer shows it,
 * i.e. after /Rotate and using the CropBox, origin at the TOP-LEFT, y growing downward.
 * That is the same space the browser editor draws in, so what the sender sees is what is stamped.
 * Only at stamping time are those fractions converted to PDF user space (below), which is where
 * rotated pages and non-zero box origins would otherwise shift fields.
 */ __turbopack_context__.s([
    "clampFraction",
    ()=>clampFraction,
    "displayedToUser",
    ()=>displayedToUser,
    "makePageGeom",
    ()=>makePageGeom,
    "normalizeRotation",
    ()=>normalizeRotation,
    "placeRect",
    ()=>placeRect,
    "pointsToFraction",
    ()=>pointsToFraction,
    "userRectToFraction",
    ()=>userRectToFraction,
    "userToDisplayed",
    ()=>userToDisplayed
]);
function normalizeRotation(angle) {
    const a = (Math.round(angle / 90) * 90 % 360 + 360) % 360;
    return a;
}
function makePageGeom(box, rotationDeg) {
    const rotation = normalizeRotation(rotationDeg);
    const swap = rotation === 90 || rotation === 270;
    return {
        box,
        rotation,
        width: swap ? box.h : box.w,
        height: swap ? box.w : box.h
    };
}
function displayedToUser(g, dx, dy) {
    const { x: bx, y: by, w, h } = g.box;
    switch(g.rotation){
        case 0:
            return {
                x: bx + dx,
                y: by + h - dy
            };
        case 90:
            return {
                x: bx + dy,
                y: by + dx
            };
        case 180:
            return {
                x: bx + w - dx,
                y: by + dy
            };
        case 270:
            return {
                x: bx + w - dy,
                y: by + h - dx
            };
    }
}
function userToDisplayed(g, ux, uy) {
    const { x: bx, y: by, w, h } = g.box;
    switch(g.rotation){
        case 0:
            return {
                x: ux - bx,
                y: by + h - uy
            };
        case 90:
            return {
                x: uy - by,
                y: ux - bx
            };
        case 180:
            return {
                x: bx + w - ux,
                y: uy - by
            };
        case 270:
            return {
                x: by + h - uy,
                y: bx + w - ux
            };
    }
}
function placeRect(g, r) {
    const width = r.w * g.width;
    const height = r.h * g.height;
    const anchor = displayedToUser(g, r.x * g.width, (r.y + r.h) * g.height);
    return {
        x: anchor.x,
        y: anchor.y,
        width,
        height,
        rotateDeg: g.rotation
    };
}
function userRectToFraction(g, ur) {
    const a = userToDisplayed(g, ur.x, ur.y);
    const b = userToDisplayed(g, ur.x + ur.w, ur.y + ur.h);
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    return clampFraction({
        x: x0 / g.width,
        y: y0 / g.height,
        w: (x1 - x0) / g.width,
        h: (y1 - y0) / g.height
    });
}
function clampFraction(r) {
    const w = Math.min(1, Math.max(0.002, r.w));
    const h = Math.min(1, Math.max(0.002, r.h));
    return {
        x: Math.min(1 - w, Math.max(0, r.x)),
        y: Math.min(1 - h, Math.max(0, r.y)),
        w,
        h
    };
}
function pointsToFraction(g, r) {
    return clampFraction({
        x: r.x / g.width,
        y: r.y / g.height,
        w: r.w / g.width,
        h: r.h / g.height
    });
}
}),
"[project]/lib/signing/stamp.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

/**
 * Stamps sender prefill + signer-entered values onto a COPY of the original PDF.
 * Everything is positioned from displayed-page fractions via geometry.placeRect, so rotated pages and
 * CropBox offsets land where the sender saw them. Text is fitted (shrink, then wrap); if it cannot fit
 * it is rejected earlier at signing time (see fitText) instead of being clipped here.
 */ __turbopack_context__.s([
    "fitText",
    ()=>fitText,
    "fontFor",
    ()=>fontFor,
    "loadUnicodeFont",
    ()=>loadUnicodeFont,
    "prepareFonts",
    ()=>prepareFonts,
    "stampPdf",
    ()=>stampPdf,
    "textFits",
    ()=>textFits
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/StandardFonts.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$rotations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/rotations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/colors.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/fontkit [external] (fontkit, esm_import)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/geometry.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
let unicodeFontBytes = null;
function loadUnicodeFont() {
    if (!unicodeFontBytes) {
        const dir = process.env.SIGNING_ASSET_DIR || __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), 'lib', 'signing', 'assets');
        unicodeFontBytes = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(dir, 'DejaVuSans.ttf'));
    }
    return unicodeFontBytes;
}
async function prepareFonts(doc) {
    const latin = await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].Helvetica);
    let unicode = null;
    return {
        latin,
        unicode: async ()=>{
            if (!unicode) {
                doc.registerFontkit(__TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__.default ?? __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__);
                unicode = await doc.embedFont(loadUnicodeFont(), {
                    subset: true
                });
            }
            return unicode;
        }
    };
}
async function fontFor(text, fonts) {
    const set = new Set(fonts.latin.getCharacterSet());
    for (const ch of text)if (!set.has(ch.codePointAt(0))) return fonts.unicode();
    return fonts.latin;
}
function wrap(text, font, size, maxW) {
    const lines = [];
    for (const para of text.split(/\r?\n/)){
        let line = '';
        for (const word of para.split(/\s+/).filter(Boolean)){
            const next = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(next, size) <= maxW) {
                line = next;
                continue;
            }
            if (line) lines.push(line);
            if (font.widthOfTextAtSize(word, size) <= maxW) {
                line = word;
                continue;
            }
            // a single very long token: hard-break it
            let chunk = '';
            for (const ch of word){
                if (font.widthOfTextAtSize(chunk + ch, size) > maxW && chunk) {
                    lines.push(chunk);
                    chunk = ch;
                } else chunk += ch;
            }
            line = chunk;
        }
        lines.push(line);
    }
    return lines;
}
function fitText(text, font, wPt, hPt) {
    const maxW = Math.max(4, wPt - 4);
    const maxSize = Math.min(12, Math.max(6, hPt - 4));
    const single = !text.includes('\n');
    if (single) {
        for(let size = maxSize; size >= 6; size -= 0.5){
            if (font.widthOfTextAtSize(text, size) <= maxW) return {
                size,
                lines: [
                    text
                ]
            };
        }
    }
    for(let size = Math.min(maxSize, 10); size >= 6.5; size -= 0.5){
        const lines = wrap(text, font, size, maxW);
        if (lines && lines.length * size * 1.15 <= hPt - 2) return {
            size,
            lines
        };
    }
    return null;
}
async function textFits(text, fieldWpt, fieldHpt) {
    const doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].create();
    const fonts = await prepareFonts(doc);
    const font = await fontFor(text, fonts);
    return fitText(text, font, fieldWpt, fieldHpt) !== null;
}
function drawTextBox(page, geom, f, fit, font) {
    const lineH = fit.size * 1.15;
    const totalH = fit.lines.length * lineH;
    const boxH = f.h * geom.height;
    const boxTop = f.y * geom.height;
    const startTop = boxTop + Math.max(0, (boxH - totalH) / 2);
    fit.lines.forEach((line, i)=>{
        const baselineY = startTop + i * lineH + fit.size * 0.92;
        const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["displayedToUser"])(geom, f.x * geom.width + 2, baselineY);
        page.drawText(line, {
            x: p.x,
            y: p.y,
            size: fit.size,
            font,
            color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.05, 0.05, 0.12),
            rotate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$rotations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["degrees"])(geom.rotation)
        });
    });
}
async function stampPdf(original, fields, values) {
    const doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].load(original, {
        updateMetadata: false,
        ignoreEncryption: false,
        throwOnInvalidObject: false
    });
    const fonts = await prepareFonts(doc);
    const pages = doc.getPages();
    const geoms = pages.map((p)=>{
        const b = p.getCropBox();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["makePageGeom"])({
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height
        }, p.getRotation().angle);
    });
    const byField = new Map(values.map((v)=>[
            v.field_id,
            v
        ]));
    // Drop the original interactive fields we replaced, so an empty widget does not draw over the value.
    const consumed = new Set(fields.filter((f)=>f.source === 'acroform' && f.source_ref).map((f)=>f.source_ref.replace(/#\d+$/, '')));
    if (consumed.size) {
        try {
            const form = doc.getForm();
            for (const name of consumed){
                try {
                    form.removeField(form.getField(name));
                } catch  {}
            }
        } catch  {}
    }
    for (const f of fields){
        const page = pages[f.page - 1];
        const geom = geoms[f.page - 1];
        if (!page || !geom) continue;
        const v = byField.get(f.id);
        if (f.type === 'signature' || f.type === 'initials') {
            if (!v?.image_png) continue;
            const img = await doc.embedPng(Buffer.from(v.image_png, 'base64'));
            const boxW = f.w * geom.width, boxH = f.h * geom.height;
            const scale = Math.min(boxW / img.width, boxH / img.height);
            const w = img.width * scale, h = img.height * scale;
            const sub = {
                x: f.x + (boxW - w) / 2 / geom.width,
                y: f.y + (boxH - h) / 2 / geom.height,
                w: w / geom.width,
                h: h / geom.height
            };
            const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["placeRect"])(geom, sub);
            page.drawImage(img, {
                x: p.x,
                y: p.y,
                width: p.width,
                height: p.height,
                rotate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$rotations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["degrees"])(p.rotateDeg)
            });
        } else if (f.type === 'checkbox') {
            if (v?.value !== 'true') continue;
            const s = Math.min(f.w * geom.width, f.h * geom.height);
            const ox = f.x * geom.width + (f.w * geom.width - s) / 2, oy = f.y * geom.height + (f.h * geom.height - s) / 2;
            const pt = (fx, fy)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["displayedToUser"])(geom, ox + fx * s, oy + fy * s);
            const a = pt(0.2, 0.55), b = pt(0.42, 0.78), c = pt(0.82, 0.22);
            const thickness = Math.max(1, s * 0.12);
            page.drawLine({
                start: a,
                end: b,
                thickness,
                color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.05, 0.05, 0.12)
            });
            page.drawLine({
                start: b,
                end: c,
                thickness,
                color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.05, 0.05, 0.12)
            });
        } else {
            const text = (f.prefill_value ?? v?.value ?? '').toString();
            if (!text.trim()) continue;
            const font = await fontFor(text, fonts);
            const fit = fitText(text, font, f.w * geom.width, f.h * geom.height);
            if (!fit) throw new Error(`Text does not fit field ${f.id}`);
            drawTextBox(page, geom, f, fit, font);
        }
    }
    return doc.save();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/contracts/pdf.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "ContractRenderError",
    ()=>ContractRenderError,
    "renderContractPdf",
    ()=>renderContractPdf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/StandardFonts.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/colors.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/fontkit [external] (fontkit, esm_import)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$logo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/logo.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$numbers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/numbers.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/stamp.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
class ContractRenderError extends Error {
}
const W = 612, H = 792, MX = 58, TOP = 56, BOTTOM = 62;
const CW = W - MX * 2;
const INK = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.09, 0.1, 0.14), MUTED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.42, 0.45, 0.5), NAVY = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.06, 0.09, 0.16), RULE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.84, 0.86, 0.9);
const REVIEW_BG = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(1, 0.94, 0.62), MISSING = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.75, 0.1, 0.1), TILE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.93, 0.95, 0.98);
;
// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
function clean(s) {
    return s.normalize('NFC').replace(/\t/g, '    ').replace(/[   ]/g, ' ').replace(/‑/g, '-').replace(/[​‌‍⁠﻿]/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '');
}
class Ctx {
    doc;
    f;
    page;
    pageNo;
    y;
    dry;
    pages;
    fields;
    sets;
    constructor(doc, f){
        this.doc = doc;
        this.f = f;
        this.pageNo = 0;
        this.y = TOP;
        this.dry = false;
        this.pages = [];
        this.fields = [];
        this.sets = new Map();
    }
    newPage() {
        if (this.dry) return;
        this.page = this.doc.addPage([
            W,
            H
        ]);
        this.pages.push(this.page);
        this.pageNo = this.pages.length;
        this.y = TOP;
    }
    get limit() {
        return H - BOTTOM;
    }
    ensure(h) {
        if (!this.dry && this.y + h > this.limit) this.newPage();
    }
    /** Make sure the next h points fit on this page, else start a new one (no-op in dry runs). */ fits(h) {
        return this.dry || this.y + h <= this.limit;
    }
    has(font, ch) {
        let s = this.sets.get(font);
        if (!s) {
            s = new Set(font.getCharacterSet());
            this.sets.set(font, s);
        }
        return s.has(ch.codePointAt(0));
    }
    fontFor(run, text) {
        const base = run.b && run.i ? this.f.boldItal : run.b ? this.f.bold : run.i ? this.f.ital : this.f.reg;
        if (!this.f.uni) return base;
        for (const ch of text)if (!this.has(base, ch)) return this.f.uni;
        return base;
    }
    text(s, x, topY, size, font, color = INK) {
        if (this.dry || !s) return;
        this.page.drawText(s, {
            x,
            y: H - topY - size * 0.82,
            size,
            font,
            color
        });
    }
    line(x1, y1, x2, y2, thickness = 0.6, color = RULE) {
        if (this.dry) return;
        this.page.drawLine({
            start: {
                x: x1,
                y: H - y1
            },
            end: {
                x: x2,
                y: H - y2
            },
            thickness,
            color
        });
    }
    rect(x, topY, w, h, color, border) {
        if (this.dry) return;
        this.page.drawRectangle({
            x,
            y: H - topY - h,
            width: w,
            height: h,
            color,
            ...border ? {
                borderColor: border,
                borderWidth: 0.6
            } : {}
        });
    }
    image(img, x, topY, w, h) {
        if (this.dry) return;
        this.page.drawImage(img, {
            x,
            y: H - topY - h,
            width: w,
            height: h
        });
    }
}
/** Splits runs into measured words, honouring "\n" as a forced break. */ function layoutLines(ctx, runs, width, size, boldAll = false) {
    const lines = [];
    let cur = {
        words: [],
        width: 0,
        blank: true
    };
    const push = (force = false)=>{
        while(cur.words.length && cur.words[cur.words.length - 1].space){
            cur.width -= cur.words[cur.words.length - 1].width;
            cur.words.pop();
        }
        if (cur.words.length || force) lines.push(cur);
        cur = {
            words: [],
            width: 0,
            blank: true
        };
    };
    for (const r0 of runs){
        const run = boldAll ? {
            ...r0,
            b: true
        } : r0;
        const text = clean(run.text);
        const parts = text.split('\n');
        parts.forEach((part, pi)=>{
            if (pi > 0) push(true);
            for (const tok of part.split(/( +)/).filter((t)=>t !== '')){
                const space = tok.trim() === '';
                const font = ctx.fontFor(run, tok);
                const safe = [
                    ...tok
                ].map((ch)=>ctx.has(font, ch) ? ch : '?').join('');
                const w = font.widthOfTextAtSize(safe, size);
                if (space) {
                    if (!cur.words.length) continue; // no leading spaces on a line
                    cur.words.push({
                        text: ' ',
                        font,
                        size,
                        width: w,
                        run,
                        space: true
                    });
                    cur.width += w;
                    continue;
                }
                if (cur.width + w > width && cur.words.length) push();
                if (w > width) {
                    let chunk = '';
                    for (const ch of safe){
                        const cw = font.widthOfTextAtSize(chunk + ch, size);
                        if (cw > width && chunk) {
                            cur.words.push({
                                text: chunk,
                                font,
                                size,
                                width: font.widthOfTextAtSize(chunk, size),
                                run,
                                space: false
                            });
                            cur.width += font.widthOfTextAtSize(chunk, size);
                            cur.blank = false;
                            push();
                            chunk = ch;
                        } else chunk += ch;
                    }
                    if (chunk) {
                        const cw = font.widthOfTextAtSize(chunk, size);
                        cur.words.push({
                            text: chunk,
                            font,
                            size,
                            width: cw,
                            run,
                            space: false
                        });
                        cur.width += cw;
                        cur.blank = false;
                    }
                    continue;
                }
                cur.words.push({
                    text: safe,
                    font,
                    size,
                    width: w,
                    run,
                    space: false
                });
                cur.width += w;
                cur.blank = false;
            }
        });
    }
    push(runs.length === 0 || lines.length === 0);
    return lines;
}
function drawLine(ctx, line, x, color = INK) {
    let cx = x;
    for (const w of line.words){
        if (!w.space) {
            if (w.run.review) ctx.rect(cx - 1, ctx.y - 1, w.width + 2, w.size * 1.25, REVIEW_BG);
            ctx.text(w.text, cx, ctx.y, w.size, w.font, w.run.missing ? MISSING : color);
            if (w.run.u) ctx.line(cx, ctx.y + w.size * 0.98, cx + w.width, ctx.y + w.size * 0.98, 0.6, w.run.missing ? MISSING : color);
        } else if (w.run.review) ctx.rect(cx, ctx.y - 1, w.width, w.size * 1.25, REVIEW_BG);
        cx += w.width;
    }
}
function drawRuns(ctx, runs, fr) {
    const lines = layoutLines(ctx, runs, fr.width, fr.size, fr.boldAll);
    if (lines.length >= 3 && !ctx.fits(fr.leading * 2)) ctx.newPage(); // avoid a lone first line at the bottom
    for (const ln of lines){
        ctx.ensure(fr.leading);
        drawLine(ctx, ln, fr.x, fr.color);
        ctx.y += fr.leading;
    }
}
const BODY = 10.5, LEAD = 15;
function fitBox(iw, ih, maxW, maxH) {
    const s = Math.min(maxW / iw, maxH / ih);
    return {
        w: iw * s,
        h: ih * s
    };
}
function drawBlocks(ctx, env, blocks, fr) {
    for (const b of blocks){
        switch(b.t){
            case 'para':
                if (!b.runs.length || b.runs.every((r)=>!r.text.trim())) {
                    ctx.y += fr.leading * 0.55;
                    break;
                }
                drawRuns(ctx, b.runs, fr);
                ctx.y += fr.leading * 0.35;
                break;
            case 'heading':
                {
                    const size = b.level === 1 ? 16 : b.level === 2 ? 13 : 11.5;
                    ctx.y += size * 0.5;
                    ctx.ensure(size * 1.4 + 34);
                    drawRuns(ctx, b.runs, {
                        ...fr,
                        size,
                        leading: size * 1.35,
                        boldAll: true,
                        color: NAVY
                    });
                    ctx.y += size * 0.25;
                    break;
                }
            case 'list':
                {
                    const indent = 20;
                    b.items.forEach((item, i)=>{
                        const marker = b.ordered ? `${b.start + i}.` : '•';
                        ctx.ensure(fr.leading * 2);
                        ctx.text(marker, fr.x + (b.ordered ? 2 : 6), ctx.y, fr.size, ctx.f.reg, INK);
                        drawBlocks(ctx, env, item, {
                            ...fr,
                            x: fr.x + indent,
                            width: fr.width - indent
                        });
                    });
                    break;
                }
            case 'table':
                drawTable(ctx, env, b, fr);
                break;
            case 'pageBreak':
                if (ctx.y > TOP + 1) ctx.newPage();
                break;
            case 'rule':
                ctx.y += 4;
                ctx.ensure(10);
                ctx.line(fr.x, ctx.y, fr.x + fr.width, ctx.y);
                ctx.y += 10;
                break;
            case 'logo':
                drawInlineLogo(ctx, env, b.which, fr);
                break;
            case 'signatures':
                drawSignatures(ctx, env);
                break;
        }
    }
}
function drawInlineLogo(ctx, env, which, fr) {
    const img = which === 'client' ? env.img.client : env.img.hq;
    const dims = which === 'client' ? env.img.clientDims : env.img.hqDims;
    const h = 40;
    ctx.ensure(h + 8);
    if (img && dims) {
        const bx = fitBox(dims.w, dims.h, Math.min(190, fr.width), h);
        ctx.image(img, fr.x, ctx.y, bx.w, bx.h);
    } else drawLogoFallback(ctx, env, which, fr.x, ctx.y, h, 'left');
    ctx.y += h + 8;
}
function drawTable(ctx, env, t, fr) {
    const cols = Math.max(1, ...t.rows.map((r)=>r.cells.reduce((n, c)=>n + c.colspan, 0)));
    const colW = fr.width / cols;
    const pad = 5;
    const cellFrame = (span, x)=>({
            x: x + pad,
            width: colW * span - pad * 2,
            size: Math.min(fr.size, 9.5),
            leading: 13
        });
    const measure = (row)=>{
        let hmax = 0;
        row.cells.forEach((c)=>{
            const keep = {
                y: ctx.y,
                dry: ctx.dry
            };
            ctx.dry = true;
            ctx.y = 0;
            drawBlocks(ctx, env, c.blocks, {
                ...cellFrame(c.colspan, 0),
                boldAll: c.header
            });
            hmax = Math.max(hmax, ctx.y);
            ctx.y = keep.y;
            ctx.dry = keep.dry;
        });
        return Math.max(hmax, 13) + pad * 2;
    };
    ctx.y += 4;
    const header = t.rows[0]?.cells.every((c)=>c.header) ? t.rows[0] : null;
    const drawRow = (row, rowH)=>{
        let x = fr.x;
        const top = ctx.y;
        row.cells.forEach((c)=>{
            const w = colW * c.colspan;
            ctx.rect(x, top, w, rowH, c.header ? TILE : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(1, 1, 1), RULE);
            const save = ctx.y;
            ctx.y = top + pad;
            drawBlocks(ctx, env, c.blocks, {
                ...cellFrame(c.colspan, x),
                boldAll: c.header
            });
            ctx.y = save;
            x += w;
        });
        ctx.y = top + rowH;
    };
    t.rows.forEach((row)=>{
        const rowH = measure(row);
        if (rowH > ctx.limit - TOP) throw new ContractRenderError('A table row is too tall to fit on one page. Shorten the cell text or split the row.');
        if (!ctx.fits(rowH)) {
            ctx.newPage();
            if (header && row !== header) {
                const hh = measure(header);
                drawRow(header, hh);
            }
        }
        drawRow(row, rowH);
    });
    ctx.y += 8;
}
// ---------------------------------------------------------------------------
// Logos / header
// ---------------------------------------------------------------------------
function drawLogoFallback(ctx, env, which, x, topY, h, _align) {
    void _align;
    const name = which === 'client' ? env.input.clientName || 'Client' : env.input.hqName;
    ctx.rect(x, topY, h, h, TILE, RULE);
    const ini = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$logo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["initialsOf"])(name);
    const size = h * 0.4;
    const w = ctx.f.bold.widthOfTextAtSize(ini, size);
    ctx.text(ini, x + (h - w) / 2, topY + (h - size) / 2 + 1, size, ctx.f.bold, NAVY);
    const label = clean(name).slice(0, 40);
    const lines = layoutLines(ctx, [
        {
            text: label,
            b: true
        }
    ], 120, 10).slice(0, 2);
    let ly = topY + h / 2 - lines.length * 12 / 2;
    for (const ln of lines){
        const keep = ctx.y;
        ctx.y = ly;
        drawLine(ctx, ln, x + h + 8, NAVY);
        ctx.y = keep;
        ly += 12;
    }
}
function logoSlot(env, which, h) {
    const img = which === 'client' ? env.img.client : env.img.hq;
    const dims = which === 'client' ? env.img.clientDims : env.img.hqDims;
    if (img && dims) {
        const bx = fitBox(dims.w, dims.h, 190, h);
        return {
            w: bx.w,
            draw: (ctx, x, topY)=>ctx.image(img, x, topY + (h - bx.h) / 2, bx.w, bx.h)
        };
    }
    // attractive fallback: initials tile + company name
    return {
        w: h + 8 + 120,
        draw: (ctx, x, topY)=>drawLogoFallback(ctx, env, which, x, topY, h, 'left')
    };
}
function drawHeader(ctx, env) {
    const { branding: b, title, contractNo, clientName, hqName } = env.input;
    const h = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LOGO_SIZES"][b.size];
    const slots = b.mode === 'side_by_side' ? b.swap ? [
        'client',
        'homequote'
    ] : [
        'homequote',
        'client'
    ] : b.mode === 'homequote_only' ? [
        'homequote'
    ] : b.mode === 'client_only' ? [
        'client'
    ] : [];
    if (slots.length) {
        const items = slots.map((s)=>logoSlot(env, s, h));
        const top = ctx.y;
        if (items.length === 2) {
            if (b.align === 'spread') {
                items[0].draw(ctx, MX, top);
                items[1].draw(ctx, W - MX - items[1].w, top);
            } else {
                const gap = 40;
                const total = items[0].w + gap + items[1].w;
                const x0 = (W - total) / 2;
                items[0].draw(ctx, x0, top);
                ctx.line(x0 + items[0].w + gap / 2, top - 2, x0 + items[0].w + gap / 2, top + h + 2, 0.8, RULE);
                items[1].draw(ctx, x0 + items[0].w + gap, top);
            }
        } else items[0].draw(ctx, b.align === 'spread' ? MX : (W - items[0].w) / 2, top);
        ctx.y = top + h + 12;
        ctx.line(MX, ctx.y, W - MX, ctx.y, 0.8, RULE);
        ctx.y += 22;
    }
    const titleLines = layoutLines(ctx, [
        {
            text: title,
            b: true
        }
    ], CW, 22);
    for (const ln of titleLines){
        drawLine(ctx, ln, MX, NAVY);
        ctx.y += 28;
    }
    const sub = [
        contractNo != null ? `Agreement ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$numbers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contractNumber"])(contractNo)}` : null,
        `${hqName} and ${clientName || 'Client'}`
    ].filter(Boolean).join('  ·  ');
    drawRuns(ctx, [
        {
            text: sub
        }
    ], {
        x: MX,
        width: CW,
        size: 9.5,
        leading: 13,
        color: MUTED
    });
    ctx.y += 14;
}
// ---------------------------------------------------------------------------
// Signature blocks
// ---------------------------------------------------------------------------
const SIG_ROW_H = 190;
function drawSignatures(ctx, env) {
    const signers = env.input.signers;
    const cols = signers.length > 1 ? 2 : 1;
    const gap = 28;
    const colW = cols === 2 ? (CW - gap) / 2 : 300;
    ctx.y += 8;
    for(let i = 0; i < signers.length; i += cols){
        ctx.ensure(SIG_ROW_H);
        const rowTop = ctx.y;
        for(let c = 0; c < cols && i + c < signers.length; c++){
            const s = signers[i + c];
            const idx = i + c;
            const bx = MX + c * (colW + gap);
            const company = s.role === 'client' ? env.input.clientName : s.role === 'homequote' ? env.input.hqName : '';
            ctx.text(clean(s.label), bx, rowTop, 10.5, ctx.f.bold, NAVY);
            ctx.text(clean([
                company,
                s.name
            ].filter(Boolean).join(' · ')).slice(0, 70), bx, rowTop + 15, 8.5, ctx.f.reg, MUTED);
            const sigTop = rowTop + 38;
            ctx.line(bx, sigTop + 40, bx + colW, sigTop + 40, 0.8, INK);
            ctx.text('Signature', bx, sigTop + 43, 8, ctx.f.reg, MUTED);
            const nameTop = rowTop + 100;
            ctx.line(bx, nameTop + 18, bx + colW, nameTop + 18, 0.8, INK);
            ctx.text('Printed name', bx, nameTop + 21, 8, ctx.f.reg, MUTED);
            const dateTop = rowTop + 142;
            ctx.line(bx, dateTop + 18, bx + 130, dateTop + 18, 0.8, INK);
            ctx.text('Date', bx, dateTop + 21, 8, ctx.f.reg, MUTED);
            if (!ctx.dry) {
                const f = (type, x, top, w, h, label)=>ctx.fields.push({
                        signerIndex: idx,
                        type,
                        page: ctx.pageNo,
                        x: x / W,
                        y: top / H,
                        w: w / W,
                        h: h / H,
                        label
                    });
                f('signature', bx, sigTop, colW, 40, `${s.label} signature`);
                f('name', bx, nameTop, colW, 18, `${s.label} printed name`);
                f('date', bx, dateTop, 130, 18, `${s.label} date`);
            }
        }
        ctx.y = rowTop + SIG_ROW_H;
    }
}
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function needsUnicode(input, latin) {
    const set = new Set(latin.getCharacterSet());
    const check = (s)=>{
        for (const ch of clean(s))if (ch !== '\n' && !set.has(ch.codePointAt(0))) return true;
        return false;
    };
    const runs = (rs)=>rs.some((r)=>check(r.text));
    const blocks = (bs)=>bs.some((b)=>{
            if (b.t === 'para' || b.t === 'heading') return runs(b.runs);
            if (b.t === 'list') return b.items.some(blocks);
            if (b.t === 'table') return b.rows.some((r)=>r.cells.some((c)=>blocks(c.blocks)));
            return false;
        });
    return check(input.title) || check(input.clientName) || check(input.hqName) || input.signers.some((s)=>check(s.label) || check(s.name)) || input.model.sections.some((s)=>(s.title ? check(s.title) : false) || blocks(s.blocks));
}
async function embedLogo(doc, bytes) {
    if (!bytes) return {
        img: null,
        dims: null
    };
    try {
        const img = await doc.embedPng(bytes);
        return {
            img,
            dims: {
                w: img.width,
                h: img.height
            }
        };
    } catch  {
        return {
            img: null,
            dims: null
        };
    }
}
async function renderContractPdf(input) {
    const doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].create();
    doc.setTitle(input.title.slice(0, 200));
    doc.setProducer('HomeQuote Network');
    doc.setCreator('HomeQuote Network');
    const f = {
        reg: await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].Helvetica),
        bold: await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].HelveticaBold),
        ital: await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].HelveticaOblique),
        boldItal: await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].HelveticaBoldOblique),
        uni: null
    };
    if (needsUnicode(input, f.reg)) {
        doc.registerFontkit(__TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__.default ?? __TURBOPACK__imported__module__$5b$externals$5d2f$fontkit__$5b$external$5d$__$28$fontkit$2c$__esm_import$29$__);
        f.uni = await doc.embedFont((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadUnicodeFont"])(), {
            subset: true
        });
    }
    const hq = await embedLogo(doc, input.hqLogo), client = await embedLogo(doc, input.clientLogo);
    const env = {
        input,
        img: {
            hq: hq.img,
            hqDims: hq.dims,
            client: client.img,
            clientDims: client.dims
        }
    };
    const ctx = new Ctx(doc, f);
    ctx.newPage();
    drawHeader(ctx, env);
    const body = {
        x: MX,
        width: CW,
        size: BODY,
        leading: LEAD
    };
    for (const s of input.model.sections){
        if (s.pageBreakBefore && ctx.y > TOP + 1) ctx.newPage();
        if (s.title) {
            ctx.y += 12;
            const keep = s.kind === 'signatures' ? SIG_ROW_H + 90 : 60;
            ctx.ensure(keep);
            drawRuns(ctx, [
                {
                    text: s.title
                }
            ], {
                x: MX,
                width: CW,
                size: 13,
                leading: 18,
                boldAll: true,
                color: NAVY
            });
            ctx.y += 3;
        } else if (s.kind === 'signatures') ctx.ensure(SIG_ROW_H + 40);
        drawBlocks(ctx, env, s.blocks, body);
    }
    const bodyPages = ctx.pages.length;
    const exhibits = input.exhibits ?? [];
    for(let i = 0; i < exhibits.length; i++){
        let src;
        try {
            src = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].load(exhibits[i].bytes);
        } catch  {
            throw new ContractRenderError(`Exhibit “${exhibits[i].name}” could not be read.`);
        }
        const copied = await doc.copyPages(src, src.getPageIndices());
        copied.forEach((p, pi)=>{
            doc.addPage(p);
            if (pi === 0) {
                const label = `Exhibit ${String.fromCharCode(65 + i)} - ${clean(exhibits[i].name).slice(0, 80)}`;
                const { height } = p.getSize();
                p.drawRectangle({
                    x: 20,
                    y: height - 22,
                    width: Math.min(420, f.reg.widthOfTextAtSize(label.replace(/[^\x20-\x7e]/g, '?'), 8) + 12),
                    height: 14,
                    color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(1, 1, 1)
                });
                p.drawText(label.replace(/[^\x20-\x7e]/g, '?'), {
                    x: 26,
                    y: height - 18,
                    size: 8,
                    font: f.reg,
                    color: MUTED
                });
            }
        });
    }
    const total = doc.getPageCount();
    ctx.pages.forEach((p, i)=>{
        p.drawLine({
            start: {
                x: MX,
                y: 44
            },
            end: {
                x: W - MX,
                y: 44
            },
            thickness: 0.5,
            color: RULE
        });
        const left = clean(`${input.title}${input.contractNo != null ? `  ·  ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$numbers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contractNumber"])(input.contractNo)}` : ''}`).slice(0, 90);
        const font = f.uni && [
            ...left
        ].some((ch)=>!f.reg.getCharacterSet().includes(ch.codePointAt(0))) ? f.uni : f.reg;
        const safeLeft = [
            ...left
        ].map((ch)=>font.getCharacterSet().includes(ch.codePointAt(0)) ? ch : '?').join('');
        p.drawText(safeLeft, {
            x: MX,
            y: 30,
            size: 8,
            font,
            color: MUTED
        });
        const right = `Page ${i + 1} of ${total}`;
        p.drawText(right, {
            x: W - MX - f.reg.widthOfTextAtSize(right, 8),
            y: 30,
            size: 8,
            font: f.reg,
            color: MUTED
        });
    });
    const bytes = await doc.save();
    return {
        bytes,
        pageCount: total,
        bodyPages,
        fields: ctx.fields,
        pages: Array.from({
            length: total
        }, ()=>({
                w: W,
                h: H
            }))
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/contracts/variables.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Merge fields ({{client_company}} ...). Pure. One registry drives the editor's insert menu, the wizard's form,
 * validation, and rendering.
 */ __turbopack_context__.s([
    "KNOWN_VARIABLES",
    ()=>KNOWN_VARIABLES,
    "LEAD_PREFILL_KEYS",
    ()=>LEAD_PREFILL_KEYS,
    "PLACEHOLDER",
    ()=>PLACEHOLDER,
    "SYSTEM_DEFAULTS",
    ()=>SYSTEM_DEFAULTS,
    "VARIABLES",
    ()=>VARIABLES,
    "VARIABLE_BY_KEY",
    ()=>VARIABLE_BY_KEY,
    "formatLongDate",
    ()=>formatLongDate,
    "formatMoney",
    ()=>formatMoney,
    "moneyToNumber",
    ()=>moneyToNumber,
    "placeholderCount",
    ()=>placeholderCount,
    "resolveVariables",
    ()=>resolveVariables,
    "sectionTexts",
    ()=>sectionTexts,
    "textBlocks",
    ()=>textBlocks,
    "todayIso",
    ()=>todayIso,
    "tokensIn",
    ()=>tokensIn,
    "usedVariables",
    ()=>usedVariables
]);
const VARIABLES = [
    {
        key: 'client_company',
        label: 'Client company',
        group: 'Client',
        kind: 'text',
        source: 'crm',
        example: 'Acme Pools LLC'
    },
    {
        key: 'client_name',
        label: 'Client contact name',
        group: 'Client',
        kind: 'text',
        source: 'crm',
        example: 'Jordan Rivera'
    },
    {
        key: 'client_email',
        label: 'Client email',
        group: 'Client',
        kind: 'text',
        source: 'crm',
        example: 'jordan@acmepools.example'
    },
    {
        key: 'client_phone',
        label: 'Client phone',
        group: 'Client',
        kind: 'text',
        source: 'crm',
        example: '(555) 010-0142'
    },
    {
        key: 'client_address',
        label: 'Client address',
        group: 'Client',
        kind: 'longtext',
        source: 'input',
        hint: 'Not stored in the CRM yet - enter it here.',
        example: '12 Main St, Springfield'
    },
    {
        key: 'client_logo',
        label: 'Client logo',
        group: 'Branding',
        kind: 'text',
        source: 'branding',
        optional: true,
        emptyText: '',
        hint: 'A paragraph that contains only this field shows the logo image.',
        example: '(logo)'
    },
    {
        key: 'homequote_company',
        label: 'HomeQuote company name',
        group: 'HomeQuote',
        kind: 'text',
        source: 'system',
        example: 'HomeQuote Network'
    },
    {
        key: 'homequote_logo',
        label: 'HomeQuote logo',
        group: 'Branding',
        kind: 'text',
        source: 'branding',
        optional: true,
        emptyText: '',
        hint: 'A paragraph that contains only this field shows the logo image.',
        example: '(logo)'
    },
    {
        key: 'effective_date',
        label: 'Effective date',
        group: 'Dates',
        kind: 'date',
        source: 'input',
        example: 'November 1, 2026'
    },
    {
        key: 'contract_date',
        label: 'Contract date',
        group: 'Dates',
        kind: 'date',
        source: 'system',
        hint: 'Set to the day the agreement is sent.',
        example: 'October 8, 2026'
    },
    {
        key: 'service_name',
        label: 'Service name',
        group: 'Service',
        kind: 'text',
        source: 'input',
        example: 'Pay Per Booked Appointment'
    },
    {
        key: 'service_description',
        label: 'Service description',
        group: 'Service',
        kind: 'longtext',
        source: 'input',
        example: 'Exclusive homeowner appointments for pool remodeling.'
    },
    {
        key: 'scope_of_work',
        label: 'Scope of work',
        group: 'Service',
        kind: 'longtext',
        source: 'input',
        example: 'Describe exactly what HomeQuote will deliver.'
    },
    {
        key: 'appointment_price',
        label: 'Price per appointment',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        example: '$150.00'
    },
    {
        key: 'monthly_retainer',
        label: 'Monthly retainer',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        example: '$1,500.00'
    },
    {
        key: 'setup_fee',
        label: 'Setup fee',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        example: '$500.00'
    },
    {
        key: 'advertising_budget',
        label: 'Advertising budget',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        hint: 'Paid by the client directly to the ad platform unless the agreement says otherwise.',
        example: '$3,000.00'
    },
    {
        key: 'payment_schedule',
        label: 'Payment schedule',
        group: 'Pricing',
        kind: 'longtext',
        source: 'input',
        example: 'Invoiced monthly, due within 15 days.'
    },
    {
        key: 'contract_duration',
        label: 'Contract duration',
        group: 'Terms',
        kind: 'text',
        source: 'input',
        example: '12 months'
    },
    {
        key: 'cancellation_notice',
        label: 'Cancellation notice',
        group: 'Terms',
        kind: 'text',
        source: 'input',
        example: '30 days written notice'
    },
    {
        key: 'refund_policy',
        label: 'Refund / replacement policy',
        group: 'Terms',
        kind: 'longtext',
        source: 'input',
        example: 'Describe the agreed refund or replacement rules.'
    },
    {
        key: 'qualification_standards',
        label: 'Appointment qualification standards',
        group: 'Terms',
        kind: 'longtext',
        source: 'input',
        example: 'Homeowner, in service area, project budget confirmed.'
    },
    {
        key: 'governing_law',
        label: 'Governing law / venue',
        group: 'Terms',
        kind: 'text',
        source: 'input',
        example: 'State of California'
    },
    // ---- Customer documents (work orders / proposals / contracts issued to a homeowner for a lead) ----
    // Customer + project fields are pre-filled from the lead record by the server and can be corrected before saving.
    // Price, scope and payment terms are NEVER pre-filled or invented: the person issuing the document supplies them.
    {
        key: 'customer_name',
        label: 'Customer name',
        group: 'Customer',
        kind: 'text',
        source: 'input',
        example: 'Sarah Lee'
    },
    {
        key: 'customer_email',
        label: 'Customer email',
        group: 'Customer',
        kind: 'text',
        source: 'input',
        example: 'sarah@example.com'
    },
    {
        key: 'customer_phone',
        label: 'Customer phone',
        group: 'Customer',
        kind: 'text',
        source: 'input',
        example: '(555) 010-0142'
    },
    {
        key: 'customer_address',
        label: 'Customer mailing address',
        group: 'Customer',
        kind: 'longtext',
        source: 'input',
        example: '12 Main St, Springfield CA 90001'
    },
    {
        key: 'project_address',
        label: 'Project address',
        group: 'Project',
        kind: 'longtext',
        source: 'input',
        example: '12 Main St, Springfield CA 90001'
    },
    {
        key: 'project_description',
        label: 'Project description',
        group: 'Project',
        kind: 'longtext',
        source: 'input',
        example: 'Resurface the pool and replace the tile.'
    },
    {
        key: 'contractor_company',
        label: 'Contractor company',
        group: 'Project',
        kind: 'text',
        source: 'input',
        example: 'Acme Pools LLC'
    },
    {
        key: 'total_price',
        label: 'Total price',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        example: '$24,500.00'
    },
    {
        key: 'deposit_amount',
        label: 'Deposit',
        group: 'Pricing',
        kind: 'money',
        source: 'input',
        optional: true,
        emptyText: 'None.',
        example: '$2,000.00'
    },
    {
        key: 'start_date',
        label: 'Planned start date',
        group: 'Dates',
        kind: 'date',
        source: 'input',
        optional: true,
        emptyText: 'To be scheduled.',
        example: 'November 3, 2026'
    },
    {
        key: 'completion_date',
        label: 'Planned completion date',
        group: 'Dates',
        kind: 'date',
        source: 'input',
        optional: true,
        emptyText: 'To be scheduled.',
        example: 'December 1, 2026'
    },
    {
        key: 'additional_terms',
        label: 'Additional terms',
        group: 'Terms',
        kind: 'longtext',
        source: 'input',
        optional: true,
        emptyText: 'None.',
        example: 'Any custom terms agreed with this client.'
    }
];
const VARIABLE_BY_KEY = new Map(VARIABLES.map((v)=>[
        v.key,
        v
    ]));
const KNOWN_VARIABLES = new Set(VARIABLES.map((v)=>v.key));
const SYSTEM_DEFAULTS = {
    homequote_company: 'HomeQuote Network'
};
const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const tokensIn = (text)=>Array.from(text.matchAll(TOKEN), (m)=>m[1]);
// ---------------------------------------------------------------------------
// Text walking helpers (shared with the renderer)
// ---------------------------------------------------------------------------
const TEXTBLOCKS = new Set([
    'paragraph',
    'heading'
]);
function textBlocks(node, out = []) {
    if (TEXTBLOCKS.has(node.type)) {
        out.push((node.content ?? []).map((c)=>c.type === 'text' ? c.text ?? '' : c.type === 'hardBreak' ? '\n' : '').join(''));
        return out;
    }
    for (const c of node.content ?? [])textBlocks(c, out);
    return out;
}
function sectionTexts(sections) {
    const out = [];
    for (const s of sections){
        if (s.title) out.push(s.title);
        textBlocks(s.doc, out);
    }
    return out;
}
function usedVariables(sections) {
    const known = [], unknown = [];
    for (const t of sectionTexts(sections)){
        for (const k of tokensIn(t)){
            const key = k.toLowerCase();
            const list = KNOWN_VARIABLES.has(key) ? known : unknown;
            if (!list.includes(key)) list.push(key);
        }
    }
    return {
        known,
        unknown
    };
}
const PLACEHOLDER = /\[REVIEW:[^\]]*\]/g;
function placeholderCount(sections) {
    return sectionTexts(sections).reduce((n, t)=>n + (t.match(PLACEHOLDER)?.length ?? 0), 0);
}
// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];
function formatLongDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    const [y, mo, d] = [
        Number(m[1]),
        Number(m[2]),
        Number(m[3])
    ];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return `${MONTHS[mo - 1]} ${d}, ${y}`;
}
const todayIso = (now = new Date())=>now.toISOString().slice(0, 10);
function formatMoney(raw) {
    const cleaned = raw.trim().replace(/^\$\s*/, '').replace(/,/g, '');
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return `$${n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}
function moneyToNumber(raw) {
    if (!raw) return null;
    const f = formatMoney(raw);
    return f ? Number(f.replace(/[$,]/g, '')) : null;
}
function resolveVariables(sections, raw, client, opts = {}) {
    const { known, unknown } = usedVariables(sections);
    const source = {
        ...SYSTEM_DEFAULTS,
        contract_date: opts.today ?? todayIso(),
        client_company: client.company,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone,
        client_address: client.address
    };
    // Explicit values typed on the agreement win over CRM data and system defaults ("override before sending").
    for (const [k, v] of Object.entries(raw))if (typeof v === 'string' && v.trim()) source[k] = v;
    const values = {};
    const missing = [];
    const invalid = {};
    for (const key of known){
        const def = VARIABLE_BY_KEY.get(key);
        if (def.source === 'branding') {
            values[key] = def.emptyText ?? '';
            continue;
        }
        const v = (source[key] ?? '').trim();
        if (!v) {
            if (def.optional) values[key] = def.emptyText ?? '';
            else missing.push(key);
            continue;
        }
        if (v.length > 6000) {
            invalid[key] = `${def.label} is too long.`;
            continue;
        }
        if (def.kind === 'money') {
            const f = formatMoney(v);
            if (!f) invalid[key] = `${def.label} must be an amount like 1500 or 1,500.00.`;
            else values[key] = f;
        } else if (def.kind === 'date') {
            const f = formatLongDate(v);
            if (!f) invalid[key] = `${def.label} must be a valid date.`;
            else values[key] = f;
        } else values[key] = v;
    }
    return {
        values,
        missing,
        invalid,
        unknown
    };
}
const LEAD_PREFILL_KEYS = [
    'customer_name',
    'customer_email',
    'customer_phone',
    'customer_address',
    'project_address',
    'project_description',
    'contractor_company'
];
}),
"[project]/lib/contracts/render-model.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Normalizes stored section JSON + resolved variable values into one simple block model.
 * BOTH the HTML preview (components/contracts/document-view.tsx) and the PDF generator (pdf.ts) render from
 * this model, so structure, numbering, merged text and page breaks are identical in both.
 */ __turbopack_context__.s([
    "buildRenderModel",
    ()=>buildRenderModel,
    "runsText",
    ()=>runsText,
    "substitute",
    ()=>substitute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/variables.ts [app-rsc] (ecmascript)");
;
const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
function inlineChars(nodes) {
    const out = [];
    for (const n of nodes ?? []){
        if (n.type === 'hardBreak') {
            out.push({
                ch: '\n'
            });
            continue;
        }
        if (n.type !== 'text' || !n.text) continue;
        const m = new Set((n.marks ?? []).map((x)=>x.type));
        for (const ch of n.text)out.push({
            ch,
            b: m.has('bold') || undefined,
            i: m.has('italic') || undefined,
            u: m.has('underline') || undefined
        });
    }
    return out;
}
function coalesce(chars) {
    const runs = [];
    const mark = (text)=>{
        // [REVIEW: ...] passages get their own flag so previews can highlight them
        return text;
    };
    for (const c of chars){
        const last = runs[runs.length - 1];
        if (last && !!last.b === !!c.b && !!last.i === !!c.i && !!last.u === !!c.u && !!last.missing === !!c.missing) last.text += c.ch;
        else runs.push({
            text: mark(c.ch),
            ...c.b ? {
                b: true
            } : {},
            ...c.i ? {
                i: true
            } : {},
            ...c.u ? {
                u: true
            } : {},
            ...c.missing ? {
                missing: true
            } : {}
        });
    }
    return splitReview(runs);
}
/** Splits runs so that "[REVIEW: ...]" passages are separate runs flagged `review`. */ function splitReview(runs) {
    const out = [];
    for (const r of runs){
        let last = 0;
        for (const m of r.text.matchAll(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PLACEHOLDER"])){
            const idx = m.index ?? 0;
            if (idx > last) out.push({
                ...r,
                text: r.text.slice(last, idx)
            });
            out.push({
                ...r,
                text: m[0],
                review: true
            });
            last = idx + m[0].length;
        }
        if (last < r.text.length) out.push({
            ...r,
            text: r.text.slice(last)
        });
    }
    return out;
}
function substitute(chars, values) {
    const text = chars.map((c)=>c.ch).join('');
    const out = [];
    let pos = 0;
    // chars are code points, `text` indexes UTF-16: walk by code point offsets
    const cpIndex = [];
    {
        let u = 0;
        for (const c of chars){
            cpIndex.push(u);
            u += c.ch.length;
        }
        cpIndex.push(u);
    }
    const unitToCp = (u)=>{
        let lo = 0, hi = cpIndex.length - 1;
        while(lo < hi){
            const mid = lo + hi >> 1;
            if (cpIndex[mid] < u) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };
    for (const m of text.matchAll(TOKEN)){
        const s = unitToCp(m.index ?? 0), e = unitToCp((m.index ?? 0) + m[0].length);
        for(let i = pos; i < s; i++)out.push(chars[i]);
        const key = m[1].toLowerCase();
        const style = chars[s];
        if (key in values) for (const ch of values[key])out.push({
            ...style,
            ch
        });
        else for (const ch of m[0])out.push({
            ...style,
            ch,
            missing: true
        });
        pos = e;
    }
    for(let i = pos; i < chars.length; i++)out.push(chars[i]);
    return out;
}
const subText = (text, values)=>text.replace(TOKEN, (m, k)=>k.toLowerCase() in values ? values[k.toLowerCase()] : m);
function inlineRuns(node, values) {
    return coalesce(substitute(inlineChars(node.content), values));
}
function blocksOf(nodes, values) {
    const out = [];
    for (const n of nodes ?? []){
        switch(n.type){
            case 'paragraph':
                {
                    const raw = (n.content ?? []).map((c)=>c.type === 'text' ? c.text ?? '' : '').join('').trim();
                    const logo = /^\{\{\s*(client_logo|homequote_logo)\s*\}\}$/i.exec(raw);
                    if (logo) {
                        out.push({
                            t: 'logo',
                            which: logo[1].toLowerCase() === 'client_logo' ? 'client' : 'homequote'
                        });
                        break;
                    }
                    out.push({
                        t: 'para',
                        runs: inlineRuns(n, values)
                    });
                    break;
                }
            case 'heading':
                {
                    const level = n.attrs?.level === 1 ? 1 : n.attrs?.level === 3 ? 3 : 2;
                    out.push({
                        t: 'heading',
                        level,
                        runs: inlineRuns(n, values)
                    });
                    break;
                }
            case 'bulletList':
            case 'orderedList':
                out.push({
                    t: 'list',
                    ordered: n.type === 'orderedList',
                    start: Number(n.attrs?.start) > 1 ? Number(n.attrs?.start) : 1,
                    items: (n.content ?? []).filter((li)=>li.type === 'listItem').map((li)=>blocksOf(li.content, values))
                });
                break;
            case 'table':
                out.push({
                    t: 'table',
                    rows: (n.content ?? []).filter((r)=>r.type === 'tableRow').map((r)=>({
                            cells: (r.content ?? []).filter((c)=>c.type === 'tableCell' || c.type === 'tableHeader').map((c)=>({
                                    header: c.type === 'tableHeader',
                                    colspan: Number(c.attrs?.colspan) > 1 ? Number(c.attrs?.colspan) : 1,
                                    blocks: blocksOf(c.content, values)
                                }))
                        })).filter((r)=>r.cells.length > 0)
                });
                break;
            case 'pageBreak':
                out.push({
                    t: 'pageBreak'
                });
                break;
            case 'horizontalRule':
                out.push({
                    t: 'rule'
                });
                break;
            default:
                break;
        }
    }
    return out;
}
function buildRenderModel(sections, values) {
    let n = 0;
    return {
        sections: sections.map((s)=>{
            const numbered = s.kind === 'rich' && s.showTitle && s.numbered && !!s.title.trim();
            if (numbered) n += 1;
            const title = s.showTitle && s.title.trim() ? `${numbered ? `${n}. ` : ''}${subText(s.title.trim(), values)}` : null;
            const blocks = blocksOf(s.doc.content, values);
            if (s.kind === 'signatures') blocks.push({
                t: 'signatures'
            });
            return {
                id: s.id,
                title,
                kind: s.kind,
                pageBreakBefore: s.pageBreakBefore,
                blocks
            };
        })
    };
}
const runsText = (runs)=>runs.map((r)=>r.text).join('');
}),
"[project]/lib/contracts/validate.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Pre-send validation. Pure, so the wizard can show the same list the server enforces.
 */ __turbopack_context__.s([
    "estimateContractValue",
    ()=>estimateContractValue,
    "validateContract",
    ()=>validateContract
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/variables.ts [app-rsc] (ecmascript)");
;
;
function validateContract(i) {
    const errors = [];
    const warnings = [];
    const resolved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolveVariables"])(i.sections, i.variables, i.client, {
        today: i.today
    });
    for (const key of resolved.missing){
        const def = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VARIABLE_BY_KEY"].get(key);
        errors.push({
            code: 'missing_variable',
            field: key,
            step: def.group === 'Client' ? 'client' : 'configure',
            message: `${def.label} is required.`
        });
    }
    for (const [key, message] of Object.entries(resolved.invalid))errors.push({
        code: 'invalid_variable',
        field: key,
        step: 'configure',
        message
    });
    for (const key of resolved.unknown)errors.push({
        code: 'unknown_variable',
        field: key,
        step: 'content',
        message: `The text uses {{${key}}}, which is not a known merge field. Fix or remove it.`
    });
    if (!i.sections.some((s)=>s.kind === 'signatures')) errors.push({
        code: 'no_signatures',
        step: 'content',
        message: 'The agreement has no Signatures section.'
    });
    if (!i.sections.some((s)=>s.kind === 'rich' && s.doc.content?.some((n)=>n.content?.length))) errors.push({
        code: 'empty',
        step: 'content',
        message: 'The agreement has no text.'
    });
    if (!i.signers.length) errors.push({
        code: 'no_signers',
        step: 'send',
        message: 'Add at least one signer.'
    });
    const seen = new Set();
    i.signers.forEach((s, idx)=>{
        const p = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signerSchema"].safeParse(s);
        if (!p.success) errors.push({
            code: 'bad_signer',
            step: 'send',
            field: `signers.${idx}`,
            message: `Signer ${idx + 1}: ${p.error.issues[0]?.message ?? 'check the details'}.`
        });
        const em = s.email.trim().toLowerCase();
        if (em && seen.has(em)) errors.push({
            code: 'duplicate_signer',
            step: 'send',
            field: `signers.${idx}`,
            message: `${s.email} is listed twice. Each signer needs their own email address.`
        });
        seen.add(em);
    });
    if (i.signers.length && !i.signers.some((s)=>s.role === 'client')) warnings.push({
        code: 'no_client_signer',
        step: 'send',
        message: 'No signer is marked as the client.'
    });
    const placeholders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["placeholderCount"])(i.sections);
    if (placeholders > 0 && !i.placeholdersAcknowledged) {
        errors.push({
            code: 'placeholders_unacknowledged',
            step: 'send',
            message: `${placeholders} placeholder passage${placeholders === 1 ? '' : 's'} marked [REVIEW: …] remain in the text. Replace them with approved wording, or confirm below that you have reviewed this agreement.`
        });
    } else if (placeholders > 0) {
        warnings.push({
            code: 'placeholders',
            step: 'send',
            message: `${placeholders} [REVIEW: …] passage${placeholders === 1 ? '' : 's'} will appear in the agreement exactly as written.`
        });
    }
    return {
        errors,
        warnings,
        resolved,
        placeholders
    };
}
function estimateContractValue(values) {
    const setup = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["moneyToNumber"])(values.setup_fee) ?? 0;
    const monthly = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["moneyToNumber"])(values.monthly_retainer);
    const dur = /(\d{1,3})\s*(month|year)/i.exec(values.contract_duration ?? '');
    const months = dur ? Number(dur[1]) * (/year/i.test(dur[2]) ? 12 : 1) : null;
    if (monthly != null && months) return setup + monthly * months;
    if (setup > 0 && monthly == null) return setup;
    return null;
}
;
}),
"[project]/lib/permissions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "belongsToCompany",
    ()=>belongsToCompany,
    "canExportCompanyData",
    ()=>canExportCompanyData,
    "canManageCompanyTeam",
    ()=>canManageCompanyTeam,
    "canManageContracts",
    ()=>canManageContracts,
    "canManageDistribution",
    ()=>canManageDistribution,
    "canManageRecipients",
    ()=>canManageRecipients,
    "canManageSigning",
    ()=>canManageSigning,
    "canPermanentlyDeleteLeads",
    ()=>canPermanentlyDeleteLeads,
    "canViewInternalNotes",
    ()=>canViewInternalNotes,
    "canViewMetaAds",
    ()=>canViewMetaAds,
    "canViewOwnContracts",
    ()=>canViewOwnContracts,
    "isContractorOwner",
    ()=>isContractorOwner,
    "isContractorStaff",
    ()=>isContractorStaff,
    "isHqnAdministrator",
    ()=>isHqnAdministrator
]);
function isHqnAdministrator(profile) {
    return profile.role === 'admin' && profile.is_active;
}
function isContractorOwner(profile) {
    return profile.role === 'contractor' && profile.contractor_role === 'owner';
}
function isContractorStaff(profile) {
    return profile.role === 'contractor' && profile.contractor_role === 'staff';
}
function canManageCompanyTeam(profile) {
    return isHqnAdministrator(profile) || isContractorOwner(profile);
}
function canManageRecipients(profile) {
    return isHqnAdministrator(profile);
}
function canManageDistribution(profile) {
    return isHqnAdministrator(profile);
}
function canPermanentlyDeleteLeads(profile) {
    return isHqnAdministrator(profile);
}
function canViewInternalNotes(profile) {
    return profile.role === 'admin' || profile.role === 'setter';
}
function canExportCompanyData(profile) {
    return isHqnAdministrator(profile) || profile.role === 'contractor' && profile.can_export_company_data;
}
function belongsToCompany(profile, contractorId) {
    return isHqnAdministrator(profile) || profile.role === 'contractor' && profile.contractor_id === contractorId;
}
function canManageSigning(profile) {
    return isHqnAdministrator(profile) || profile.role === 'contractor' && profile.is_active && !!profile.contractor_id;
}
function canViewMetaAds(profile) {
    return isHqnAdministrator(profile) || isContractorOwner(profile) && profile.is_active && !!profile.contractor_id;
}
function canManageContracts(profile) {
    return isHqnAdministrator(profile);
}
function canViewOwnContracts(profile) {
    return profile.role === 'contractor' && profile.is_active && !!profile.contractor_id;
}
}),
"[project]/lib/signing/constants.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Shared constants for Documents & Signing. Pure (safe to import from client components).
 * NOTE: the consent / identity wording below is plain-language product copy, NOT legal advice.
 * It must be reviewed by counsel for each jurisdiction before real contracts are signed.
 */ __turbopack_context__.s([
    "AUTH_METHOD",
    ()=>AUTH_METHOD,
    "AUTH_METHOD_CODE",
    ()=>AUTH_METHOD_CODE,
    "CONSENT_TEXT",
    ()=>CONSENT_TEXT,
    "CONSENT_VERSION",
    ()=>CONSENT_VERSION,
    "DATE_FORMATS",
    ()=>DATE_FORMATS,
    "FIELD_DEFAULT_PT",
    ()=>FIELD_DEFAULT_PT,
    "FIELD_TYPES",
    ()=>FIELD_TYPES,
    "FIELD_TYPE_LABELS",
    ()=>FIELD_TYPE_LABELS,
    "IDENTITY_STATEMENT",
    ()=>IDENTITY_STATEMENT,
    "IDENTITY_STATEMENT_CODE",
    ()=>IDENTITY_STATEMENT_CODE,
    "LEGAL_REVIEW_NOTE",
    ()=>LEGAL_REVIEW_NOTE,
    "LIMITS",
    ()=>LIMITS,
    "RECIPIENT_STATUS_LABELS",
    ()=>RECIPIENT_STATUS_LABELS,
    "REMINDER_DAY_OPTIONS",
    ()=>REMINDER_DAY_OPTIONS,
    "REMINDER_MAX_OPTIONS",
    ()=>REMINDER_MAX_OPTIONS,
    "SIGNATURE_STATEMENT",
    ()=>SIGNATURE_STATEMENT,
    "SIGNING_BUCKET",
    ()=>SIGNING_BUCKET,
    "SIGNING_EVENT_LABELS",
    ()=>SIGNING_EVENT_LABELS,
    "STATUS_LABELS",
    ()=>STATUS_LABELS
]);
const SIGNING_BUCKET = 'signing-documents';
const LIMITS = {
    maxFileBytes: 25 * 1024 * 1024,
    maxPages: 50,
    maxPageDimensionPt: 14_400,
    maxRecipients: 10,
    maxFields: 400,
    maxSignatureImageBytes: 300 * 1024,
    maxTextLength: 1000,
    /** OCR is CPU heavy; pages beyond this are skipped (manual placement still works). */ maxOcrPages: 8,
    defaultExpiryDays: 14,
    /** Completed-document link validity in the completion email. */ downloadLinkDays: 30,
    /** Audit/retention policy default. Counsel should confirm per jurisdiction/contract type. */ retentionYears: 7
};
const FIELD_TYPES = [
    'signature',
    'initials',
    'name',
    'date',
    'text',
    'checkbox'
];
const FIELD_TYPE_LABELS = {
    signature: 'Signature',
    initials: 'Initials',
    name: 'Printed name',
    date: 'Date signed',
    text: 'Text',
    checkbox: 'Checkbox'
};
const FIELD_DEFAULT_PT = {
    signature: {
        w: 180,
        h: 36
    },
    initials: {
        w: 64,
        h: 30
    },
    name: {
        w: 170,
        h: 18
    },
    date: {
        w: 110,
        h: 18
    },
    text: {
        w: 170,
        h: 18
    },
    checkbox: {
        w: 14,
        h: 14
    }
};
const DATE_FORMATS = [
    'MMM d, yyyy',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd'
];
const STATUS_LABELS = {
    draft: 'Draft',
    awaiting_signature: 'Awaiting signature',
    partially_signed: 'Partially signed',
    completed: 'Completed',
    declined: 'Declined',
    voided: 'Voided',
    expired: 'Expired'
};
const RECIPIENT_STATUS_LABELS = {
    pending: 'Not yet invited',
    sent: 'Invited',
    viewed: 'Viewed',
    signed: 'Signed',
    declined: 'Declined'
};
const SIGNING_EVENT_LABELS = {
    version_created: 'New version created',
    placement_reviewed: 'Field placement reviewed',
    sent: 'Sent for signature',
    invited: 'Invitation emailed',
    invite_failed: 'Invitation email failed',
    reminded: 'Reminder emailed',
    viewed: 'Opened',
    viewed_again: 'Opened again',
    consent_given: 'Agreed to sign electronically',
    signed: 'Signed',
    declined: 'Declined to sign',
    completed: 'All signers finished',
    finalized: 'Final PDF and certificate created',
    finalize_failed: 'Final PDF generation failed',
    completion_emailed: 'Completion email sent',
    completion_email_failed: 'Completion email failed',
    voided: 'Voided',
    expired: 'Expired',
    downloaded: 'Downloaded',
    auto_reminded: 'Automatic reminder emailed',
    reminders_configured: 'Reminder settings changed',
    access_code_issued: 'Access code issued',
    access_code_verified: 'Access code entered correctly',
    access_code_failed: 'Wrong access code entered',
    access_code_locked: 'Signer locked out after wrong access codes',
    template_saved: 'Saved as a template'
};
const CONSENT_VERSION = 'esign-consent-2026-10-v1';
const CONSENT_TEXT = [
    'I agree to review and sign this document electronically instead of on paper.',
    'I understand my typed or drawn signature will be applied to the document where I choose, and that I intend it as my signature on this document, to the extent permitted by law.',
    'I can view and keep a copy: when everyone has signed, I will receive a link to download the completed PDF. I can ask the sender for a paper copy, or withdraw my consent to sign electronically, by contacting them before I sign.',
    'To use this page I need a current web browser and a PDF viewer to open the completed file.'
];
const AUTH_METHOD = 'email_link';
const IDENTITY_STATEMENT = 'The signer was identified only by access to a unique, expiring link sent to the email address the sender entered. HomeQuote Network did not independently verify the signer’s legal identity (no ID check, no SMS or access-code check).';
const AUTH_METHOD_CODE = 'email_link_code';
const IDENTITY_STATEMENT_CODE = 'Signers marked “link + access code” were identified by access to a unique, expiring link sent to the email address the sender entered AND by an access code that the sender states they shared separately from the email. HomeQuote Network recorded that the code was entered correctly but did not independently verify the signer’s legal identity or confirm how the code was delivered.';
const REMINDER_DAY_OPTIONS = [
    1,
    2,
    3,
    5,
    7,
    14
];
const REMINDER_MAX_OPTIONS = [
    1,
    2,
    3,
    5,
    10
];
const SIGNATURE_STATEMENT = 'Signatures on this document are electronic signatures (drawn or typed by the signer). They are not certificate-based cryptographic digital signatures (e.g. PAdES).';
const LEGAL_REVIEW_NOTE = 'HomeQuote Network provides this tool as software only. Whether an electronic signature is valid or enforceable depends on the document, the parties and the jurisdiction. Have counsel review before using it for real contracts.';
}),
"[project]/lib/signing/pdf-validate.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PdfRejected",
    ()=>PdfRejected,
    "inspectPdf",
    ()=>inspectPdf,
    "sha256Hex",
    ()=>sha256Hex
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/core/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/geometry.ts [app-rsc] (ecmascript)");
;
;
;
;
class PdfRejected extends Error {
    code;
    constructor(message, code){
        super(message), this.code = code;
    }
}
const sha256Hex = (bytes)=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])('sha256').update(bytes).digest('hex');
function hasKey(dict, name) {
    return !!dict && dict.has(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of(name));
}
async function inspectPdf(bytes) {
    try {
        return await inspectPdfUnsafe(bytes);
    } catch (e) {
        if (e instanceof PdfRejected) throw e;
        throw new PdfRejected('This PDF could not be read. It may be damaged. Try re-saving or printing it to a new PDF.', 'unreadable');
    }
}
async function inspectPdfUnsafe(bytes) {
    if (bytes.byteLength === 0) throw new PdfRejected('The file is empty.', 'empty');
    if (bytes.byteLength > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxFileBytes) {
        throw new PdfRejected(`The file is larger than ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxFileBytes / 1024 / 1024} MB.`, 'too_large');
    }
    // %PDF- may be preceded by a little junk; the spec allows it within the first 1024 bytes.
    const head = Buffer.from(bytes.subarray(0, 1024)).toString('latin1');
    if (!head.includes('%PDF-')) throw new PdfRejected('This is not a PDF file.', 'not_pdf');
    let doc;
    try {
        doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].load(bytes, {
            ignoreEncryption: false,
            updateMetadata: false,
            throwOnInvalidObject: false
        });
    } catch (error) {
        const msg = String(error?.message ?? '');
        if (/encrypt/i.test(msg)) {
            throw new PdfRejected('This PDF is password-protected or encrypted. Remove the protection and upload it again.', 'encrypted');
        }
        throw new PdfRejected('This PDF could not be read. It may be damaged. Try re-saving or printing it to a new PDF.', 'unreadable');
    }
    if (doc.isEncrypted) {
        throw new PdfRejected('This PDF is password-protected or encrypted. Remove the protection and upload it again.', 'encrypted');
    }
    const pageCount = doc.getPageCount();
    if (pageCount < 1) throw new PdfRejected('This PDF has no pages.', 'no_pages');
    if (pageCount > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxPages) {
        throw new PdfRejected(`This PDF has ${pageCount} pages; the limit is ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxPages}.`, 'too_many_pages');
    }
    // Active content: refuse scripts rather than carry them into a legal document.
    const catalog = doc.catalog;
    const names = catalog.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('Names'), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDict"]);
    if (hasKey(catalog, 'OpenAction') || hasKey(catalog, 'AA') || hasKey(names, 'JavaScript')) {
        throw new PdfRejected('This PDF contains scripts or automatic actions, which are not allowed. Print it to a new PDF and upload that.', 'active_content');
    }
    const pages = [];
    const geoms = [];
    for (const page of doc.getPages()){
        const box = page.getCropBox();
        if (!(box.width > 0 && box.height > 0) || box.width > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxPageDimensionPt || box.height > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxPageDimensionPt) {
            throw new PdfRejected('This PDF has a page with an unsupported size.', 'bad_page_size');
        }
        const geom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["makePageGeom"])({
            x: box.x,
            y: box.y,
            w: box.width,
            h: box.height
        }, page.getRotation().angle);
        geoms.push(geom);
        pages.push({
            w: round(geom.width),
            h: round(geom.height),
            rotation: geom.rotation
        });
        // widget annotation scripts
        const annots = page.node.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('Annots'), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFArray"]);
        if (annots) {
            for(let i = 0; i < annots.size(); i++){
                const a = annots.lookupMaybe(i, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDict"]);
                const action = a?.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('A'), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDict"]);
                const s = action?.get(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('S'));
                if (s && String(s) === '/JavaScript') {
                    throw new PdfRejected('This PDF contains scripts, which are not allowed. Print it to a new PDF and upload that.', 'active_content');
                }
            }
        }
    }
    const acro = catalog.get(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('AcroForm'));
    void __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFRef"];
    return {
        sha256: sha256Hex(bytes),
        size: bytes.byteLength,
        pageCount,
        pages,
        geoms,
        hasAcroForm: !!acro
    };
}
const round = (n)=>Math.round(n * 100) / 100;
}),
"[project]/lib/signing/errors.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ERROR_MESSAGES",
    ()=>ERROR_MESSAGES,
    "SigningError",
    ()=>SigningError,
    "messageFor",
    ()=>messageFor
]);
class SigningError extends Error {
    code;
    extra;
    constructor(code, message, extra){
        super(message), this.code = code, this.extra = extra;
    }
}
const ERROR_MESSAGES = {
    forbidden: 'You do not have access to this document.',
    not_found: 'That document could not be found.',
    locked: 'This request has been sent and can no longer be edited. Create a new version to make changes.',
    not_draft: 'Only drafts can be sent.',
    subject_required: 'Add an email subject before sending.',
    no_recipients: 'Add at least one signer.',
    recipient_without_signature: 'Every signer needs at least one signature field.',
    unassigned_fields: 'Some fields are not assigned to a signer (and have no sender-provided value).',
    unreviewed_fields: 'Some suggested fields still need your review.',
    review_required: 'Review the field placement on every page before sending.',
    not_voidable: 'Only requests that are awaiting signature can be voided.',
    draft_exists: 'This document already has a draft version. Finish or delete it first.',
    already_draft: 'This version is already a draft.',
    expired: 'This signing link has expired.',
    voided: 'This request was cancelled by the sender.',
    declined: 'This request was declined.',
    invalid: 'This signing link is not valid.',
    not_your_turn: 'It is not your turn to sign yet. You will get an email when it is.',
    consent_required: 'Please agree to sign electronically first.',
    missing_required: 'Please complete all required fields.',
    group_conflict: 'Only one option can be selected in a group.',
    bad_field: 'One of the fields could not be accepted.',
    bad_value: 'One of the values could not be accepted.',
    too_long: 'One of the values is too long.',
    not_open: 'This request is no longer open for signing.',
    code_required: 'Enter your access code to continue.',
    wrong_code: 'That access code is not correct.',
    code_locked: 'Too many incorrect attempts. Ask the sender for a new access code.',
    code_missing: 'No access code has been set up for this request. Ask the sender to send it again.',
    not_required: 'This request does not use an access code.',
    bad_roles: 'The number of signers does not match the template.',
    template_not_found: 'That template could not be found.',
    lead_mismatch: 'That lead is not assigned to this company.'
};
const messageFor = (code)=>ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}),
"[project]/lib/signing/rpc.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* eslint-disable @typescript-eslint/no-explicit-any */ __turbopack_context__.s([
    "log",
    ()=>log,
    "unwrap",
    ()=>unwrap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/errors.ts [app-rsc] (ecmascript)");
;
;
;
function unwrap(res) {
    if (res.error) {
        const m = /signing:(\w+)/.exec(res.error.message);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"](m?.[1] ?? 'server', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])(m?.[1] ?? 'server'));
    }
    if (res.data && res.data.ok === false) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"](res.data.error, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])(res.data.error), res.data);
    return res.data;
}
async function log(versionId, type, actor, meta = {}, recipientId = null) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_log_event', {
        p_version: versionId,
        p_recipient: recipientId,
        p_type: type,
        p_actor: actor?.id ?? null,
        p_ip: null,
        p_ua: null,
        p_meta: meta
    });
}
}),
"[project]/lib/signing/access.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "actorCanAccessDocument",
    ()=>actorCanAccessDocument,
    "loadVersionForActor",
    ()=>loadVersionForActor,
    "ownerKey",
    ()=>ownerKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/errors.ts [app-rsc] (ecmascript)");
;
;
;
;
function actorCanAccessDocument(actor, doc) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageSigning"])(actor)) return false;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor)) return true;
    return !!doc.contractor_id && doc.contractor_id === actor.contractor_id;
}
async function loadVersionForActor(actor, versionId) {
    if (!/^[0-9a-f-]{36}$/i.test(versionId)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_found', 'not found');
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: version } = await admin.from('signing_versions').select('*').eq('id', versionId).maybeSingle();
    if (!version) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_found', 'not found');
    const { data: doc } = await admin.from('signing_documents').select('*').eq('id', version.document_id).maybeSingle();
    // Same answer for "missing" and "someone else's": do not reveal that another tenant's document exists.
    if (!doc || !actorCanAccessDocument(actor, doc)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_found', 'not found');
    return {
        version: version,
        doc: doc
    };
}
function ownerKey(contractorId) {
    return contractorId ? `c-${contractorId}` : 'hqn';
}
}),
"[externals]/node:url [external] (node:url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:url", () => require("node:url"));

module.exports = mod;
}),
"[project]/lib/signing/pdfjs.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "loadPdfjs",
    ()=>loadPdfjs,
    "openWithPdfjs",
    ()=>openWithPdfjs
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$url__$5b$external$5d$__$28$node$3a$url$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:url [external] (node:url, cjs)");
;
;
async function loadPdfjs() {
    return __turbopack_context__.A("[externals]/pdfjs-dist/legacy/build/pdf.mjs [external] (pdfjs-dist/legacy/build/pdf.mjs, esm_import, async loader)");
}
function assetDir(name) {
    const root = process.env.PDFJS_ASSET_ROOT || __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), 'node_modules', 'pdfjs-dist');
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(root, name) + __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].sep;
}
async function openWithPdfjs(bytes) {
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({
        data: new Uint8Array(bytes),
        isEvalSupported: false,
        useSystemFonts: false,
        disableFontFace: true,
        standardFontDataUrl: assetDir('standard_fonts'),
        cMapUrl: assetDir('cmaps'),
        cMapPacked: true,
        wasmUrl: assetDir('wasm'),
        iccUrl: assetDir('iccs'),
        verbosity: 0
    });
    const pdf = await task.promise;
    return {
        pdfjs,
        pdf,
        destroy: ()=>task.destroy()
    };
}
void __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$url__$5b$external$5d$__$28$node$3a$url$2c$__cjs$29$__["pathToFileURL"];
}),
"[project]/lib/signing/extract.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Native-PDF extraction: text runs and vector rules/boxes in DISPLAYED coordinates (points,
 * top-left origin, after /Rotate and CropBox), via pdf.js. Feeds layout.ts.
 */ __turbopack_context__.s([
    "extractLayouts",
    ()=>extractLayouts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdfjs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdfjs.ts [app-rsc] (ecmascript)");
;
const mul = (a, b)=>[
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5]
    ];
const apply = (m, x, y)=>({
        x: m[0] * x + m[2] * y + m[4],
        y: m[1] * x + m[3] * y + m[5]
    });
async function extractLayouts(bytes) {
    const { pdfjs, pdf, destroy } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdfjs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["openWithPdfjs"])(bytes);
    const OPS = pdfjs.OPS;
    const STROKE = new Set([
        OPS.stroke,
        OPS.closeStroke,
        OPS.fillStroke,
        OPS.eoFillStroke,
        OPS.closeFillStroke,
        OPS.closeEOFillStroke
    ]);
    const layouts = [];
    const textChars = [];
    const bigImage = [];
    const IMAGE_OPS = new Set([
        OPS.paintImageXObject,
        OPS.paintInlineImageXObject,
        OPS.paintJpegXObject,
        OPS.paintImageXObjectRepeat
    ].filter((n)=>n !== undefined));
    try {
        for(let n = 1; n <= pdf.numPages; n++){
            const page = await pdf.getPage(n);
            const vp = page.getViewport({
                scale: 1
            });
            const layout = {
                width: vp.width,
                height: vp.height,
                runs: [],
                lines: [],
                boxes: []
            };
            const tc = await page.getTextContent();
            let chars = 0;
            for (const item of tc.items){
                if (!item.str || !item.transform) continue;
                chars += item.str.trim().length;
                const m = mul(vp.transform, item.transform);
                const size = Math.hypot(m[2], m[3]);
                if (!size || Math.abs(m[1]) > 0.25 * Math.abs(m[0])) continue; // only upright (in the displayed page) text
                if (!item.str.trim() && item.str.length < 2) continue;
                layout.runs.push({
                    str: item.str,
                    x: m[4],
                    w: Math.abs(item.width ?? 0) * Math.hypot(m[0], m[1]) / Math.max(1e-6, Math.hypot(item.transform[0], item.transform[1])),
                    baseline: m[5],
                    size
                });
            }
            textChars.push(chars);
            const ops = await page.getOperatorList();
            const stack = [];
            let ctm = [
                1,
                0,
                0,
                1,
                0,
                0
            ];
            const base = vp.transform;
            let pageHasBigImage = false;
            for(let i = 0; i < ops.fnArray.length; i++){
                const fn = ops.fnArray[i];
                const args = ops.argsArray[i];
                if (fn === OPS.save) stack.push(ctm);
                else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
                else if (fn === OPS.transform) ctm = mul(ctm, args);
                else if (IMAGE_OPS.has(fn)) {
                    const f = mul(base, ctm);
                    if (Math.abs(f[0] * f[3] - f[1] * f[2]) >= 0.5 * vp.width * vp.height) pageHasBigImage = true;
                } else if (fn === OPS.constructPath) {
                    const [op, data] = args;
                    const path = data?.[0];
                    if (!path) continue;
                    const full = mul(base, ctm);
                    const subpaths = [];
                    let cur = [];
                    let closed = false;
                    for(let k = 0; k < path.length;){
                        const code = path[k++];
                        if (code === 0) {
                            if (cur.length) subpaths.push(cur);
                            cur = [
                                apply(full, path[k], path[k + 1])
                            ];
                            k += 2;
                            closed = false;
                        } else if (code === 1) {
                            cur.push(apply(full, path[k], path[k + 1]));
                            k += 2;
                        } else if (code === 2) {
                            k += 6;
                            cur.push({
                                x: NaN,
                                y: NaN
                            });
                        } else if (code === 3) {
                            k += 4;
                            cur.push({
                                x: NaN,
                                y: NaN
                            });
                        } else if (code === 4) {
                            closed = true;
                            if (cur.length) cur.push({
                                ...cur[0]
                            });
                        }
                    }
                    if (cur.length) subpaths.push(cur);
                    void closed;
                    const stroked = STROKE.has(op);
                    const filled = op === OPS.fill || op === OPS.eoFill || op === OPS.fillStroke || op === OPS.eoFillStroke || op === OPS.closeFillStroke || op === OPS.closeEOFillStroke;
                    for (const sp of subpaths){
                        if (sp.some((p)=>Number.isNaN(p.x))) continue;
                        const xs = sp.map((p)=>p.x), ys = sp.map((p)=>p.y);
                        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
                        const w = x1 - x0, h = y1 - y0;
                        if (sp.length === 2) {
                            if (h <= 1.2 && w >= 20 && stroked) layout.lines.push({
                                x1: x0,
                                x2: x1,
                                y: (y0 + y1) / 2
                            });
                        } else if (sp.length >= 4 && sp.length <= 6) {
                            const axisAligned = sp.every((p, j)=>j === 0 || Math.abs(p.x - sp[j - 1].x) < 0.5 || Math.abs(p.y - sp[j - 1].y) < 0.5);
                            if (!axisAligned) continue;
                            if (h <= 1.6 && w >= 20 && (filled || stroked)) layout.lines.push({
                                x1: x0,
                                x2: x1,
                                y: (y0 + y1) / 2
                            });
                            else if (w >= 5 && h >= 5 && stroked && !(filled && w > 30 && h > 30)) layout.boxes.push({
                                x: x0,
                                y: y0,
                                w,
                                h
                            });
                        }
                    }
                }
            }
            layouts.push(layout);
            bigImage.push(pageHasBigImage);
            page.cleanup();
        }
    } finally{
        await destroy();
    }
    return {
        layouts,
        textChars,
        bigImage
    };
}
}),
"[project]/lib/signing/layout.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Layout-based field suggestion. Pure functions over a page "layout" (text runs, rules, boxes in
 * DISPLAYED points, origin top-left). The same analysis serves native text PDFs (pdf.js text layer +
 * vector operators) and scanned PDFs (OCR words + raster rules).
 *
 * This is a HEURISTIC. It proposes fields and scores its own certainty; anything below the
 * confidence bar is flagged for human review, and weak guesses are dropped. It can be wrong in both
 * directions (missed fields, wrong fields) and a sender must always review placement.
 */ __turbopack_context__.s([
    "CONFIDENT",
    ()=>CONFIDENT,
    "MIN_KEEP",
    ()=>MIN_KEEP,
    "classifyLabel",
    ()=>classifyLabel,
    "rectIou",
    ()=>iou,
    "suggestFields",
    ()=>suggestFields
]);
const CONFIDENT = 0.75;
const MIN_KEEP = 0.45;
const GLYPH_BOXES = /[☐□▢❏❑❒◻]/;
const PROSE = /\b(shall|must|hereby|agrees?|agreed|binding|required|requires?|will|upon|thereof|herein|whereas|constitutes?|means|acknowledges?|indicates?|represents?|warrants?|including|following|appear|appears|page|pages|refer|attached)\b/i;
const ROLE_RE = /\b(buyer|seller|homeowner|home owner|owner|client|customer|contractor|landlord|tenant|lessee|lessor|witness|employee|employer|borrower|lender|representative|purchaser|vendor|guarantor|subcontractor|party [ab12]|signer \d)\b/i;
const AGREE_RE = /\b(agree|acknowledg|accept|consent|understand|authori[sz]e|certif)/i;
const NOT_SIGNING_DATE = /\b(effective|start|starting|end|ending|completion|closing|due|expir\w*|birth|delivery|installation|service|move|install|begin|commence\w*)\b/i;
const clean = (s)=>s.replace(/[_–—\-]{3,}|\.{4,}/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s)=>clean(s).split(/\s+/).filter(Boolean);
const overlapX = (a1, a2, b1, b2)=>Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
function classifyLabel(raw) {
    const t = clean(raw).replace(/[:•*]+\s*$/, '').trim();
    if (!t) return null;
    const lower = t.toLowerCase();
    const w = lower.split(/\s+/);
    const stripped = lower.replace(ROLE_RE, '').replace(/\b(of|the|and|for|your|print|printed|authorized|authorised|full|legal)\b/g, '').replace(/[()\[\]:#\d.,/]/g, '').replace(/\s+/g, ' ').trim();
    const shortish = w.length <= 4 ? 1 : w.length <= 6 ? 0.8 : w.length <= 9 ? 0.5 : 0.25;
    const m = (type, label, base)=>({
            type,
            label,
            strength: Math.min(1, base * shortish)
        });
    if (/\binitials?\b/.test(lower) && !/\binitial (?:deposit|payment|fee|cost)\b/.test(lower)) return m('initials', 'Initials', 0.9);
    if (/\bdate\b|\bdated\b/.test(lower) && !/\b(update|candidate)\b/.test(lower)) {
        if (NOT_SIGNING_DATE.test(lower)) return m('text', t.replace(/^\w/, (c)=>c.toUpperCase()), 0.6);
        return m('date', 'Date signed', /\bdate( signed)?\b/.test(lower) ? 0.9 : 0.6);
    }
    if (/\bsignature\b|\bsign here\b|\bsigned by\b|\bsign:?$/.test(lower) || /^(?:x|by)$/.test(stripped) && /^(?:by|x)\b/.test(lower)) {
        const weak = /^(?:x|by)$/.test(stripped) || /\bsigned by\b/.test(lower);
        return m('signature', 'Signature', weak ? 0.65 : 0.95);
    }
    if (/\bprint(?:ed)?\b/.test(lower) && /\bname\b/.test(lower)) return m('name', 'Printed name', 0.95);
    if (/\bname\b.*\(print/.test(lower)) return m('name', 'Printed name', 0.95);
    if (/\b(?:full|legal) name\b/.test(lower) || /\bname of (?:the )?(?:signer|signatory|buyer|seller|owner|homeowner|client|customer|contractor|representative|party)\b/.test(lower)) return m('name', 'Printed name', 0.85);
    if (/^(?:your |signer(?:'s)? |customer |client |homeowner |owner |buyer |seller )?name$/.test(stripped === 'name' ? 'name' : lower.replace(ROLE_RE, 'name').replace(/\s+/g, ' ').trim()) || stripped === 'name') return m('name', 'Printed name', 0.6);
    if (/^(?:job )?title\b/.test(lower) || /\b(?:position|capacity)\b/.test(lower) && w.length <= 3) return m('text', 'Title', 0.8);
    if (/\b(?:company|business|firm|organi[sz]ation|entity)(?: name)?\b/.test(lower) && w.length <= 4) return m('text', 'Company name', 0.8);
    return null;
}
const SIZES = {
    signature: {
        h: 34,
        maxW: 240,
        minW: 110
    },
    initials: {
        h: 28,
        maxW: 80,
        minW: 44
    },
    name: {
        h: 18,
        maxW: 260,
        minW: 80
    },
    date: {
        h: 18,
        maxW: 130,
        minW: 70
    },
    text: {
        h: 18,
        maxW: 260,
        minW: 80
    },
    checkbox: {
        h: 14,
        maxW: 14,
        minW: 8
    }
};
function buildSegments(runs) {
    const sorted = [
        ...runs
    ].filter((r)=>r.str.trim().length > 0).sort((a, b)=>a.baseline - b.baseline || a.x - b.x);
    const rows = [];
    for (const r of sorted){
        const row = rows.find((row0)=>Math.abs(row0[0].baseline - r.baseline) <= Math.max(2, 0.4 * r.size));
        if (row) row.push(r);
        else rows.push([
            r
        ]);
    }
    const segs = [];
    for (const row of rows){
        row.sort((a, b)=>a.x - b.x);
        let cur = [];
        const flush = ()=>{
            if (!cur.length) return;
            let text = '';
            for(let i = 0; i < cur.length; i++){
                const r = cur[i];
                if (i > 0) {
                    const p = cur[i - 1];
                    const gap = r.x - (p.x + p.w);
                    if (gap > 0.12 * r.size && !/\s$/.test(text) && !/^\s/.test(r.str)) text += ' ';
                }
                text += r.str;
            }
            const size = Math.max(...cur.map((c)=>c.size));
            const last = cur[cur.length - 1];
            const baseline = cur[0].baseline;
            segs.push({
                text,
                runs: cur,
                x1: cur[0].x,
                x2: last.x + last.w,
                baseline,
                size,
                top: baseline - size * 0.9,
                bottom: baseline + size * 0.25
            });
            cur = [];
        };
        for (const r of row){
            const prev = cur[cur.length - 1];
            if (prev && r.x - (prev.x + prev.w) > Math.max(2.4 * r.size, 22)) flush();
            cur.push(r);
        }
        flush();
    }
    return segs.sort((a, b)=>a.baseline - b.baseline || a.x1 - b.x1);
}
function underscoreSlots(seg, idBase) {
    const slots = [];
    seg.runs.forEach((run, ri)=>{
        const re = /[_\u2013\u2014\-]{3,}|(?:\.\s?){6,}/g;
        let m;
        while(m = re.exec(run.str)){
            const len = Math.max(1, run.str.length);
            const x1 = run.x + run.w * m.index / len;
            const x2 = run.x + run.w * (m.index + m[0].length) / len;
            if (x2 - x1 >= 24) slots.push({
                kind: 'underscore',
                x1,
                x2,
                y: run.baseline + 1.5,
                relation: 'right',
                id: `${idBase}:u${ri}:${m.index}`
            });
        }
    });
    return slots;
}
function roleFor(seg, segs) {
    const own = ROLE_RE.exec(clean(seg.text));
    if (own) return own[1].toLowerCase().replace('home owner', 'homeowner');
    const above = segs.filter((s)=>s !== seg && s.baseline < seg.baseline && seg.baseline - s.baseline <= 150 && words(s.text).length <= 4 && Math.abs(s.x1 - seg.x1) <= 140).sort((a, b)=>b.baseline - a.baseline);
    for (const s of above){
        const r = ROLE_RE.exec(clean(s.text));
        if (r) return r[1].toLowerCase().replace('home owner', 'homeowner');
    }
    return null;
}
/** Fraction of `r` covered by text runs other than those in `ignore`. */ function textOverlap(r, layout, ignore) {
    let covered = 0;
    for (const run of layout.runs){
        if (ignore.has(run) || !run.str.trim()) continue;
        const t = {
            x: run.x,
            y: run.baseline - run.size * 0.8,
            w: run.w,
            h: run.size
        };
        const ox = overlapX(r.x, r.x + r.w, t.x, t.x + t.w);
        const oy = overlapX(r.y, r.y + r.h, t.y, t.y + t.h);
        covered += ox * oy;
    }
    return covered / Math.max(1, r.w * r.h);
}
function suggestFields(layout) {
    const segs = buildSegments(layout.runs);
    const out = [];
    const usedSlots = new Set();
    const lines = layout.lines.filter((l)=>l.x2 - l.x1 >= 30 && l.x2 - l.x1 <= layout.width * 0.7);
    let groupSeq = 0;
    // ---- checkboxes (vector squares + glyphs) ------------------------------------------------
    const squares = layout.boxes.filter((b)=>b.w >= 6 && b.w <= 22 && b.h >= 6 && b.h <= 22 && Math.abs(b.w - b.h) <= 2.5);
    const checkCandidates = squares.map((box)=>({
            box,
            viaGlyph: false
        }));
    for (const seg of segs){
        for (const run of seg.runs){
            for(let i = 0; i < run.str.length; i++){
                if (GLYPH_BOXES.test(run.str[i])) {
                    const cw = run.w / Math.max(1, run.str.length);
                    const size = Math.max(9, Math.min(16, run.size));
                    checkCandidates.push({
                        box: {
                            x: run.x + cw * i,
                            y: run.baseline - size * 0.85,
                            w: size * 0.9,
                            h: size * 0.9
                        },
                        viaGlyph: true
                    });
                }
            }
        }
    }
    const rows = new Map();
    for (const { box } of checkCandidates){
        const cy = box.y + box.h / 2;
        const ignore = new Set();
        const following = segs.filter((s)=>s.runs.some((r)=>r.x >= box.x + box.w - 2 && r.x <= box.x + box.w + 24 && Math.abs(r.baseline - (box.y + box.h)) <= Math.max(5, box.h * 0.8))).sort((a, b)=>a.x1 - b.x1)[0];
        let label = '';
        if (following) {
            const nextBox = checkCandidates.map((c)=>c.box.x).filter((x)=>x > box.x + box.w + 24 && Math.abs(box.y - checkCandidates.find((c)=>c.box.x === x).box.y) < 8).sort((a, b)=>a - b)[0] ?? Infinity;
            const picked = following.runs.filter((r)=>r.x >= box.x + box.w - 2 && r.x < nextBox - 2);
            picked.forEach((r)=>ignore.add(r));
            label = clean(picked.map((r)=>r.str).join(' ').replace(GLYPH_BOXES, ''));
        }
        const key = Math.round(cy / 6);
        const arr = rows.get(key) ?? [];
        arr.push({
            box,
            label
        });
        rows.set(key, arr);
    }
    for (const arr of rows.values()){
        arr.sort((a, b)=>a.box.x - b.box.x);
        const yesNo = arr.length >= 2 && arr.every((c)=>/^(yes|no|n\/?a|none)$/i.test(c.label));
        const gk = yesNo ? `choice-${++groupSeq}` : null;
        for (const { box, label } of arr){
            if (!label && !yesNo) continue; // a bare square with no label is probably decoration
            const agree = AGREE_RE.test(label);
            const conf = label ? agree ? 0.85 : 0.72 : 0.5;
            out.push({
                type: 'checkbox',
                rect: {
                    x: box.x,
                    y: box.y,
                    w: Math.max(box.w, 10),
                    h: Math.max(box.h, 10)
                },
                label: label.slice(0, 80) || 'Checkbox',
                required: agree && !yesNo,
                group_key: gk,
                confidence: yesNo ? Math.min(conf, 0.7) : conf,
                needs_review: yesNo || conf < CONFIDENT,
                role_hint: null,
                note: yesNo ? 'Looks like a Yes/No choice. Confirm it should be exclusive and whether it is required.' : agree ? 'Agreement checkbox: the signer must tick it themselves.' : 'Checkbox found next to text; confirm it belongs to a signer.'
            });
        }
    }
    const cands = [];
    segs.forEach((seg, si)=>{
        const us = underscoreSlots(seg, `s${si}`);
        const text = clean(seg.text);
        if (!text) return;
        const nWords = words(text).length;
        // "Name: ____ Title: ____" in ONE run: split the text at each recognised label to classify each separately.
        const parts = splitOnLabels(seg);
        for (const part of parts){
            const cls = classifyLabel(part.text);
            if (!cls) continue;
            const prose = PROSE.test(part.text) || nWords > 10;
            const endsColon = /[:•]\s*(?:[_.\-\s]*)$/.test(seg.text.trim()) || /:\s*[_.\-]{3,}/.test(seg.text);
            let slot = null;
            const partSlots = us.filter((s)=>s.x1 >= part.x1 - 1 && (part.x2 === Infinity || s.x1 <= part.x2 + 6)).sort((a, b)=>a.x1 - b.x1);
            const labelRight = part.labelEnd;
            // (a) underscore run to the right of this label
            slot = partSlots.find((s)=>s.x1 >= labelRight - 2) ?? null;
            // (b) rule just under the baseline starting right of the label
            if (!slot) {
                const l = lines.filter((ln)=>Math.abs(ln.y - (seg.baseline + 2)) <= Math.max(4, seg.size * 0.45) && ln.x1 >= labelRight - 4 && ln.x1 <= labelRight + 70).sort((a, b)=>a.x1 - b.x1)[0];
                if (l) slot = {
                    kind: 'line',
                    x1: l.x1,
                    x2: l.x2,
                    y: l.y,
                    relation: 'right',
                    id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}`
                };
            }
            // (c) rule ABOVE the label (label printed under the line)
            if (!slot) {
                const l = lines.filter((ln)=>ln.y <= seg.top + seg.size * 0.3 && seg.top - ln.y <= 34 && overlapX(ln.x1, ln.x2, part.x1, Math.min(part.labelEnd, part.x1 + 400)) >= 0.35 * Math.max(10, part.labelEnd - part.x1)).sort((a, b)=>b.y - a.y)[0];
                if (l) slot = {
                    kind: 'line',
                    x1: l.x1,
                    x2: l.x2,
                    y: l.y,
                    relation: 'above',
                    id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}`
                };
            }
            // (d) box to the right, or containing the label
            if (!slot) {
                const b = layout.boxes.filter((bx)=>bx.w >= 50 && bx.h >= 12 && bx.h <= 70 && !(bx.w < 24)).filter((bx)=>bx.x >= labelRight - 4 && bx.x - labelRight <= 16 && bx.y - 6 <= seg.baseline && bx.y + bx.h + 6 >= seg.baseline - seg.size || bx.x <= part.x1 + 2 && bx.x + bx.w >= labelRight && bx.y <= seg.top + 2 && bx.y + bx.h >= seg.baseline).sort((a, b)=>a.w * a.h - b.w * b.h)[0];
                if (b) slot = {
                    kind: 'box',
                    x1: b.x,
                    x2: b.x + b.w,
                    y: b.y + b.h,
                    top: b.y,
                    relation: 'box',
                    id: `b:${b.x.toFixed(0)}:${b.y.toFixed(0)}`
                };
            }
            // (e) rule BELOW the label (label printed above the line)
            if (!slot) {
                const l = lines.filter((ln)=>ln.y >= seg.baseline + seg.size * 0.3 && ln.y - seg.baseline <= 38 && overlapX(ln.x1, ln.x2, part.x1, Math.min(part.labelEnd, part.x1 + 400)) >= 0.35 * Math.max(10, part.labelEnd - part.x1)).sort((a, b)=>a.y - b.y)[0];
                if (l) slot = {
                    kind: 'line',
                    x1: l.x1,
                    x2: l.x2,
                    y: l.y,
                    relation: 'below',
                    id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}`
                };
            }
            let score = 0.35 * cls.strength + 0.2;
            if (cls.type === 'signature') score += 0.05;
            if (slot) score += slot.relation === 'right' ? 0.32 : slot.relation === 'above' ? 0.3 : slot.relation === 'box' ? 0.28 : 0.2;
            if (endsColon) score += 0.08;
            if (prose) score *= 0.35;
            if (!slot && !(endsColon && cls.strength >= 0.8 && (cls.type === 'signature' || cls.type === 'initials'))) score = Math.min(score, 0.3);
            cands.push({
                seg,
                cls,
                slot,
                score,
                prose,
                labelStart: part.x1,
                labelEnd: part.labelEnd
            });
        }
    });
    cands.sort((a, b)=>b.score - a.score);
    for (const c of cands){
        if (c.score < MIN_KEEP) continue;
        if (c.slot && usedSlots.has(c.slot.id)) continue;
        const sz = SIZES[c.cls.type];
        let rect;
        if (c.slot && c.slot.kind === 'box') {
            rect = {
                x: c.slot.x1 + 1,
                y: (c.slot.top ?? c.slot.y - sz.h) + 1,
                w: c.slot.x2 - c.slot.x1 - 2,
                h: Math.max(10, c.slot.y - (c.slot.top ?? 0) - 2)
            };
            if (c.slot.relation === 'box' && c.slot.x1 <= c.labelStart + 2) {
                // label inside the box: use the area to the right of the label
                rect = {
                    x: Math.min(c.labelEnd + 6, c.slot.x2 - sz.minW),
                    y: rect.y,
                    w: Math.max(sz.minW, c.slot.x2 - Math.min(c.labelEnd + 6, c.slot.x2 - sz.minW) - 2),
                    h: rect.h
                };
            }
        } else if (c.slot) {
            const w = Math.max(sz.minW, Math.min(sz.maxW, c.slot.x2 - c.slot.x1));
            const bottom = c.slot.y - 1.5;
            rect = {
                x: c.slot.x1 + 1,
                y: bottom - sz.h,
                w,
                h: sz.h
            };
        } else {
            rect = {
                x: c.labelEnd + 6,
                y: c.seg.baseline - sz.h + 3,
                w: sz.maxW > 200 ? 170 : sz.maxW,
                h: sz.h
            };
        }
        // keep the box clear of the label and the paragraph above it
        const ownRuns = new Set(c.seg.runs);
        const above = layout.runs.filter((r)=>!ownRuns.has(r) && r.str.trim() && r.baseline < rect.y + rect.h - 1 && overlapX(rect.x, rect.x + rect.w, r.x, r.x + r.w) > 2 && r.baseline > rect.y - 2);
        if (above.length) {
            const lowest = Math.max(...above.map((r)=>r.baseline + r.size * 0.25));
            const newTop = Math.max(rect.y, lowest + 1);
            if (rect.y + rect.h - newTop >= 14) {
                rect.h = rect.y + rect.h - newTop;
                rect.y = newTop;
            }
        }
        if (c.slot?.relation === 'below' || c.slot?.relation === 'above') {
            const labelTop = c.seg.top;
            if (c.slot.relation === 'below' && rect.y < c.seg.baseline + 2) {
                const nt = c.seg.baseline + 3;
                if (rect.y + rect.h - nt >= 12) {
                    rect.h = rect.y + rect.h - nt;
                    rect.y = nt;
                }
            }
            void labelTop;
        }
        rect.x = Math.max(0, Math.min(rect.x, layout.width - 8));
        rect.w = Math.min(rect.w, layout.width - rect.x);
        rect.y = Math.max(0, rect.y);
        if (rect.w < 8 || rect.h < 8) continue;
        const overlap = textOverlap(rect, layout, ownRuns);
        let conf = c.score;
        if (overlap > 0.25) conf -= 0.2;
        conf = Math.max(0, Math.min(0.97, conf));
        if (conf < MIN_KEEP) continue;
        if (c.slot) usedSlots.add(c.slot.id);
        const note = !c.slot ? 'No line or box found next to this label; position is a guess.' : c.slot.relation === 'below' ? 'Line sits below the label; check the field is where the signer should write.' : overlap > 0.25 ? 'Overlaps printed text; check placement.' : c.prose ? 'Label appears inside a sentence; may not be a signing field.' : null;
        out.push({
            type: c.cls.type,
            rect,
            label: c.cls.label,
            required: c.cls.type !== 'text' || /^(Company name|Title)$/.test(c.cls.label) ? true : false,
            group_key: null,
            confidence: Math.round(conf * 100) / 100,
            needs_review: conf < CONFIDENT || !c.slot || c.prose,
            role_hint: roleFor(c.seg, segs),
            note
        });
    }
    return dedupe(out);
}
/** Splits a segment at each recognised label so "Name: ___ Title: ___" yields two label parts. */ function splitOnLabels(seg) {
    const single = [
        {
            text: seg.text.replace(/[_–—\-]{3,}|(?:\.\s?){6,}/g, ' '),
            x1: seg.x1,
            x2: Infinity,
            labelEnd: labelEndOf(seg, seg.x1, Infinity)
        }
    ];
    // Only split when several separate label words occur in one run (producers that emit a line as one run).
    const full = seg.text;
    const re = /(?:^|[\s_])((?:printed |print )?name|title|date(?: signed)?|company(?: name)?|signature|initials)\s*:/gi;
    const hits = [];
    let m;
    while(m = re.exec(full))hits.push({
        idx: m.index + m[0].indexOf(m[1]),
        len: m[0].length - m[0].indexOf(m[1])
    });
    if (hits.length < 2 || seg.runs.length !== 1) return single;
    const run = seg.runs[0];
    const len = Math.max(1, run.str.length);
    return hits.map((h, i)=>{
        const end = i + 1 < hits.length ? hits[i + 1].idx : full.length;
        const x1 = run.x + run.w * h.idx / len;
        const x2 = run.x + run.w * end / len;
        return {
            text: full.slice(h.idx, end).replace(/[_–—\-]{3,}/g, ' '),
            x1,
            x2,
            labelEnd: run.x + run.w * (h.idx + h.len) / len
        };
    });
}
function labelEndOf(seg, x1, x2) {
    let end = x1;
    for (const r of seg.runs){
        if (r.x < x1 - 1 || r.x > x2) continue;
        const m = /[_–—\-]{3,}|(?:\.\s?){6,}/.exec(r.str);
        if (m) {
            end = Math.max(end, r.x + r.w * m.index / Math.max(1, r.str.length));
            break;
        }
        end = Math.max(end, r.x + r.w);
    }
    return end;
}
function iou(a, b) {
    const ox = overlapX(a.x, a.x + a.w, b.x, b.x + b.w), oy = overlapX(a.y, a.y + a.h, b.y, b.y + b.h);
    const inter = ox * oy;
    return inter / (a.w * a.h + b.w * b.h - inter || 1);
}
function dedupe(list) {
    const sorted = [
        ...list
    ].sort((a, b)=>b.confidence - a.confidence);
    const kept = [];
    for (const s of sorted)if (!kept.some((k)=>iou(k.rect, s.rect) > 0.3)) kept.push(s);
    return kept.sort((a, b)=>a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}
;
}),
"[project]/lib/signing/ocr.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */ /**
 * OCR for scanned (image-only) pages. Runs LOCALLY in this server process with tesseract.js
 * (WebAssembly) and a bundled English model, so page images are never sent to any external AI/OCR
 * service. Cost: server CPU/time only (no per-page fees). Limits: English text, ~150 dpi render,
 * horizontal text only, checkboxes are NOT detected in scans, and it can misread handwriting/noise.
 */ __turbopack_context__.s([
    "ocrPages",
    ()=>ocrPages,
    "rasterRules",
    ()=>rasterRules,
    "rasterRulesForPages",
    ()=>rasterRulesForPages
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdfjs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdfjs.ts [app-rsc] (ecmascript)");
;
;
const SCALE = 2; // 144 dpi
function langDir() {
    return process.env.SIGNING_OCR_LANG_DIR || __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), 'lib', 'signing', 'assets');
}
function collectWords(data) {
    if (Array.isArray(data?.words) && data.words.length) return data.words;
    const out = [];
    for (const b of data?.blocks ?? [])for (const p of b.paragraphs ?? [])for (const l of p.lines ?? [])for (const w of l.words ?? [])out.push(w);
    return out;
}
function rasterRules(gray, w, h, scale) {
    const minRun = Math.round(34 * scale);
    const rows = [];
    for(let y = 0; y < h; y++){
        let start = -1, gaps = 0;
        for(let x = 0; x <= w; x++){
            const dark = x < w && gray[y * w + x] < 150;
            if (dark) {
                if (start < 0) start = x;
                gaps = 0;
            } else if (start >= 0) {
                if (++gaps > 2 || x === w) {
                    const end = x - gaps;
                    if (end - start >= minRun) rows.push({
                        y,
                        x1: start,
                        x2: end
                    });
                    start = -1;
                    gaps = 0;
                }
            }
        }
    }
    const merged = [];
    for (const r of rows){
        const m = merged.find((c)=>r.y - c.y1 <= 1 && Math.abs(c.x1 - r.x1) <= 6 && Math.abs(c.x2 - r.x2) <= 6);
        if (m) {
            m.y1 = r.y;
            m.x1 = Math.min(m.x1, r.x1);
            m.x2 = Math.max(m.x2, r.x2);
        } else merged.push({
            y0: r.y,
            y1: r.y,
            x1: r.x1,
            x2: r.x2
        });
    }
    // a rule is thin; thick bars / text underlines glued to glyph rows are ignored
    return merged.filter((m)=>m.y1 - m.y0 <= 5 * scale).map((m)=>({
            x1: m.x1 / scale,
            x2: m.x2 / scale,
            y: (m.y0 + m.y1) / 2 / scale
        }));
}
async function rasterRulesForPages(bytes, pageNumbers) {
    const out = new Map();
    if (!pageNumbers.length) return out;
    const { pdf, destroy } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdfjs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["openWithPdfjs"])(bytes);
    try {
        for (const n of pageNumbers){
            const page = await pdf.getPage(n);
            const vp = page.getViewport({
                scale: SCALE
            });
            const cc = pdf.canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
            await page.render({
                canvasContext: cc.context,
                viewport: vp,
                canvas: cc.canvas
            }).promise;
            const img = cc.context.getImageData(0, 0, cc.canvas.width, cc.canvas.height);
            const gray = new Uint8Array(cc.canvas.width * cc.canvas.height);
            for(let i = 0, j = 0; i < img.data.length; i += 4, j++)gray[j] = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 | 0;
            out.set(n, rasterRules(gray, cc.canvas.width, cc.canvas.height, SCALE));
            page.cleanup();
        }
    } finally{
        await destroy();
    }
    return out;
}
async function ocrPages(bytes, pageNumbers) {
    const result = new Map();
    if (!pageNumbers.length) return result;
    const { pdf, destroy } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdfjs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["openWithPdfjs"])(bytes);
    const { createWorker } = await __turbopack_context__.A("[externals]/tesseract.js [external] (tesseract.js, cjs, async loader)");
    const worker = await createWorker('eng', 1, {
        langPath: langDir(),
        gzip: false,
        cacheMethod: 'none',
        logger: ()=>undefined,
        errorHandler: ()=>undefined
    });
    try {
        for (const n of pageNumbers){
            const page = await pdf.getPage(n);
            const vp = page.getViewport({
                scale: SCALE
            });
            const canvasAndContext = pdf.canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
            await page.render({
                canvasContext: canvasAndContext.context,
                viewport: vp,
                canvas: canvasAndContext.canvas
            }).promise;
            const { canvas, context } = canvasAndContext;
            const img = context.getImageData(0, 0, canvas.width, canvas.height);
            const gray = new Uint8Array(canvas.width * canvas.height);
            for(let i = 0, j = 0; i < img.data.length; i += 4, j++)gray[j] = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 | 0;
            const png = canvas.toBuffer('image/png');
            const { data } = await worker.recognize(png, {}, {
                blocks: true
            });
            const runs = [];
            for (const w of collectWords(data)){
                const text = String(w.text ?? '').trim();
                if (!text) continue;
                const h = (w.bbox.y1 - w.bbox.y0) / SCALE;
                runs.push({
                    str: text,
                    x: w.bbox.x0 / SCALE,
                    w: (w.bbox.x1 - w.bbox.x0) / SCALE,
                    baseline: w.bbox.y1 / SCALE - h * 0.18,
                    size: Math.max(6, h * 1.05)
                });
            }
            result.set(n, {
                width: vp.width / SCALE,
                height: vp.height / SCALE,
                runs,
                lines: rasterRules(gray, canvas.width, canvas.height, SCALE),
                boxes: []
            });
            page.cleanup();
        }
    } finally{
        await worker.terminate();
        await destroy();
    }
    return result;
}
}),
"[project]/lib/signing/detect.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Field detection orchestrator.
 *   1. Existing AcroForm widgets (most reliable).
 *   2. Text-layer + vector layout analysis for flat PDFs (heuristic).
 *   3. Local OCR for pages with no text layer (scans; least reliable, always flagged for review).
 * Results are SUGGESTIONS. The sender must review them; nothing here fills a signature or ticks a box.
 */ __turbopack_context__.s([
    "detectFields",
    ()=>detectFields
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/core/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/form/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$extract$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/extract.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/layout.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$ocr$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/ocr.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/geometry.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const OCR_CONFIDENCE_CAP = 0.7;
/** A page is treated as a scan when it is dominated by an image and has (almost) no text layer. */ const SCAN_MAX_CHARS = 40;
function widgetPageIndex(doc, widgetRef, widgetDict) {
    const p = widgetDict.get(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('P'));
    const pages = doc.getPages();
    if (p instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFRef"]) {
        const idx = pages.findIndex((pg)=>pg.ref === p);
        if (idx >= 0) return idx;
    }
    if (widgetRef) {
        for(let i = 0; i < pages.length; i++){
            const annots = pages[i].node.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('Annots'), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFArray"]);
            if (!annots) continue;
            for(let j = 0; j < annots.size(); j++)if (annots.get(j) === widgetRef) return i;
        }
    }
    return -1;
}
async function acroFormFields(bytes, geoms) {
    const doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
        throwOnInvalidObject: false
    });
    const out = [];
    let form;
    try {
        form = doc.getForm();
    } catch  {
        return out;
    }
    for (const field of form.getFields()){
        const name = field.getName();
        const acro = field.acroField;
        const flags = acro.dict.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('Ff'), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFNumber"])?.asNumber() ?? 0;
        const readOnly = (flags & 1) !== 0;
        if (readOnly) continue;
        let generic = false;
        let type;
        let conf;
        let label = null;
        let note = null;
        let group = null;
        const tooltip = acro.dict.lookupMaybe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFName"].of('TU'), (await __turbopack_context__.A("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript, async loader)")).PDFString);
        const hint = `${name} ${tooltip?.decodeText?.() ?? ''}`.replace(/[_.\-[\]]+/g, ' ');
        if (field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFSignature"]) {
            type = 'signature';
            conf = 0.95;
            label = 'Signature';
        } else if (field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFCheckBox"]) {
            type = 'checkbox';
            conf = 0.85;
            label = name;
        } else if (field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFRadioGroup"]) {
            type = 'checkbox';
            conf = 0.7;
            label = name;
            group = `radio-${name}`.slice(0, 60);
            note = 'Radio buttons become an exclusive checkbox group. Confirm it.';
        } else if (field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFTextField"] || field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDropdown"] || field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFOptionList"]) {
            if (field instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$form$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFTextField"] && (field.getText() ?? '').trim()) continue; // already filled by whoever made the PDF
            const cls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["classifyLabel"])(hint);
            if (cls && cls.type !== 'checkbox') {
                type = cls.type;
                label = cls.label;
                conf = 0.82;
            } else {
                type = 'text';
                label = name.replace(/[_.\-]+/g, ' ').trim().slice(0, 100) || 'Text';
                conf = 0.55;
                generic = true;
                note = 'Generic form field; confirm who fills it in.';
            }
        } else continue;
        const widgets = acro.getWidgets();
        widgets.forEach((w, i)=>{
            const wd = w.dict;
            const idx = widgetPageIndex(doc, doc.context.getObjectRef(wd), wd);
            if (idx < 0 || !geoms[idx]) return;
            const r = w.getRectangle();
            if (!(r.width > 2 && r.height > 2)) return;
            const f = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["userRectToFraction"])(geoms[idx], {
                x: r.x,
                y: r.y,
                w: r.width,
                h: r.height
            });
            out.push({
                type,
                page: idx + 1,
                ...f,
                required: type === 'checkbox' ? /agree|accept|consent|acknowledg/i.test(hint) : generic ? (flags & 2) !== 0 : true,
                label,
                group_key: group,
                source: 'acroform',
                confidence: conf,
                needs_review: conf < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONFIDENT"],
                role_hint: null,
                detection_note: note,
                source_ref: widgets.length > 1 ? `${name}#${i}` : name
            });
        });
    }
    void __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$core$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFBool"];
    return out;
}
function toDetected(layoutResult, page, layout, source) {
    return layoutResult.map((s)=>{
        const f = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$geometry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pointsToFraction"])(layout, s.rect);
        const confidence = source === 'ocr' ? Math.min(s.confidence, OCR_CONFIDENCE_CAP) : s.confidence;
        return {
            type: s.type,
            page,
            ...f,
            required: s.required,
            label: s.label,
            group_key: s.group_key,
            source,
            confidence,
            needs_review: source === 'ocr' || s.needs_review || confidence < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONFIDENT"],
            role_hint: s.role_hint,
            detection_note: source === 'ocr' ? (s.note ? s.note + ' ' : '') + 'Found by OCR on a scan; verify position.' : s.note,
            source_ref: null
        };
    });
}
async function detectFields(bytes, geoms, opts = {}) {
    const notes = [];
    const methods = new Set();
    let fields = [];
    let acro = [];
    try {
        acro = await acroFormFields(bytes, geoms);
    } catch  {
        notes.push('Form fields could not be read.');
    }
    if (acro.length) {
        methods.add('acroform');
        fields.push(...acro);
    }
    let layouts = [];
    let textChars = [];
    let bigImage = [];
    try {
        ({ layouts, textChars, bigImage } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$extract$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["extractLayouts"])(bytes));
    } catch  {
        notes.push('The text layer could not be analyzed; place fields manually.');
    }
    const pagesWithoutText = textChars.map((c, i)=>c < SCAN_MAX_CHARS && bigImage[i] ? i + 1 : 0).filter(Boolean);
    const emptyPages = textChars.map((c, i)=>c === 0 && !bigImage[i] && !layouts[i]?.lines.length ? i + 1 : 0).filter(Boolean);
    if (emptyPages.length) notes.push(`Page${emptyPages.length > 1 ? 's' : ''} ${emptyPages.join(', ')} ha${emptyPages.length > 1 ? 've' : 's'} no readable text; place fields manually there.`);
    // searchable scans: a text layer exists but the ruled lines are only in the picture
    const imagePagesWithText = bigImage.map((b, i)=>b && !pagesWithoutText.includes(i + 1) ? i + 1 : 0).filter(Boolean).slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxOcrPages);
    if (imagePagesWithText.length) {
        try {
            const rules = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$ocr$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rasterRulesForPages"])(bytes, imagePagesWithText);
            for (const [n, ls] of rules)layouts[n - 1].lines.push(...ls);
        } catch  {}
    }
    const layoutFields = [];
    layouts.forEach((layout, i)=>{
        if (pagesWithoutText.includes(i + 1)) return;
        layoutFields.push(...toDetected((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["suggestFields"])(layout), i + 1, layout, 'text'));
    });
    if (layoutFields.length) methods.add('text');
    const ocrWanted = opts.ocr !== false ? pagesWithoutText : [];
    const ocrTodo = ocrWanted.slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxOcrPages);
    const ocrSkipped = ocrWanted.slice(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxOcrPages);
    if (ocrTodo.length) {
        try {
            const ocr = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$ocr$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ocrPages"])(bytes, ocrTodo);
            for (const [pageNo, layout] of ocr)layoutFields.push(...toDetected((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["suggestFields"])(layout), pageNo, layout, 'ocr'));
            if ([
                ...ocr.values()
            ].some((l)=>l.runs.length)) methods.add('ocr');
        } catch  {
            notes.push('OCR could not run on the scanned pages; place fields manually on those pages.');
        }
    }
    if (ocrSkipped.length) notes.push(`OCR was limited to the first ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxOcrPages} scanned pages; pages ${ocrSkipped.join(', ')} need manual placement.`);
    if (pagesWithoutText.length && opts.ocr === false) notes.push('Scanned pages were not analyzed (OCR off); place fields manually.');
    // layout candidates that coincide with a real form widget are redundant
    for (const lf of layoutFields){
        const dup = acro.some((a)=>a.page === lf.page && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rectIou"])({
                x: a.x,
                y: a.y,
                w: a.w,
                h: a.h
            }, {
                x: lf.x,
                y: lf.y,
                w: lf.w,
                h: lf.h
            }) > 0.15);
        if (!dup) fields.push(lf);
    }
    fields = fields.sort((a, b)=>a.page - b.page || a.y - b.y || a.x - b.x).slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxFields);
    if (!fields.length) notes.push('No likely signing fields were found. Add fields manually in the editor.');
    notes.push('Detection is heuristic and can miss fields or suggest wrong ones. Review every page before sending.');
    return {
        fields,
        info: {
            engine: 'hqn-layout-1',
            methods: [
                ...methods
            ],
            acroformFields: acro.length,
            pagesAnalyzed: geoms.length,
            pagesWithoutText,
            ocrPages: ocrTodo,
            ocrSkippedPages: ocrSkipped,
            processing: 'local',
            notes,
            ranAt: new Date().toISOString(),
            suggested: fields.length,
            needsReview: fields.filter((f)=>f.needs_review).length
        }
    };
}
}),
"[project]/lib/signing/email.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Branded transactional emails for signing. Plain inline-styled HTML + a text alternative. */ __turbopack_context__.s([
    "completedEmail",
    ()=>completedEmail,
    "declinedEmail",
    ()=>declinedEmail,
    "downloadLink",
    ()=>downloadLink,
    "inviteEmail",
    ()=>inviteEmail,
    "signLink",
    ()=>signLink,
    "siteUrl",
    ()=>siteUrl,
    "voidedEmail",
    ()=>voidedEmail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
;
const esc = (s)=>s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const siteUrl = ()=>(("TURBOPACK compile-time value", "http://localhost:3371") || 'http://localhost:3000').replace(/\/+$/, '');
const signLink = (token)=>`${siteUrl()}/sign#t=${token}`;
const downloadLink = (token)=>`${siteUrl()}/sign#d=${token}`;
function shell(title, bodyHtml, button, footer) {
    return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
<tr><td style="background:#0f172a;padding:16px 24px;color:#fff;font-weight:600;letter-spacing:.2px">HomeQuote<span style="opacity:.65"> Network</span> <span style="float:right;font-weight:400;opacity:.65;font-size:12px">Documents &amp; Signing</span></td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${esc(title)}</h1>${bodyHtml}</td></tr>
${button ? `<tr><td style="padding:8px 24px 24px"><a href="${esc(button.href)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></td></tr>` : ''}
<tr><td style="padding:16px 24px 24px;border-top:1px solid #f4f4f5;font-size:12px;line-height:1.5;color:#71717a">${footer ?? ''}</td></tr>
</table></td></tr></table></body></html>`;
}
const p = (s)=>`<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${s}</p>`;
const quote = (s)=>`<blockquote style="margin:0 0 14px;padding:10px 14px;border-left:3px solid #d4d4d8;background:#fafafa;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(s)}</blockquote>`;
const PERSONAL_NOTE = 'This link is personal to you — please do not forward it. Anyone who has it can open this document, because the link is the only thing that identifies the signer. HomeQuote Network does not independently verify who you are.';
function inviteEmail(i) {
    const who = i.business || i.senderName || 'A HomeQuote Network contractor';
    const subject = i.reminder ? `Reminder: ${i.subject || `Please sign ${i.documentTitle}`}` : i.subject || `Please sign ${i.documentTitle}`;
    const html = shell(i.reminder ? 'Reminder: a document is waiting for your signature' : 'You have a document to sign', p(`Hi ${esc(i.recipientName)},`) + p(`<strong>${esc(who)}</strong> sent you <strong>${esc(i.documentTitle)}</strong> to review and sign electronically.`) + (i.message ? quote(i.message) : '') + (i.requiresCode ? p(`You will also need a <strong>6-digit access code</strong>. ${esc(who)} will give it to you separately (for example by phone or text). It is not in this email.`) : '') + p(`The link works until <strong>${esc(i.expiresAt.toUTCString().replace(' GMT', ' UTC'))}</strong>.`), {
        label: 'Review and sign',
        href: signLink(i.token)
    }, `${esc(PERSONAL_NOTE)}<br><br>Sent through HomeQuote Network on behalf of ${esc(who)}${i.senderEmail ? `. Questions? Reply to this email to reach ${esc(i.senderEmail)}` : ''}.`);
    const text = [
        `Hi ${i.recipientName},`,
        '',
        `${who} sent you "${i.documentTitle}" to review and sign electronically.`,
        i.message ? `\n${i.message}\n` : '',
        `Review and sign: ${signLink(i.token)}`,
        '',
        i.requiresCode ? `You will also need a 6-digit access code. ${who} will give it to you separately (for example by phone or text); it is not in this email.\n` : '',
        `This link works until ${i.expiresAt.toUTCString()}.`,
        PERSONAL_NOTE
    ].join('\n');
    return {
        subject,
        html,
        text,
        message: text
    };
}
function completedEmail(i) {
    const subject = `Completed: ${i.documentTitle}`;
    const href = i.token ? downloadLink(i.token) : i.viewUrl || siteUrl();
    const html = shell('Everyone has signed', p(`Hi ${esc(i.recipientName)},`) + p(`<strong>${esc(i.documentTitle)}</strong>${i.business ? ` (from ${esc(i.business)})` : ''} has been signed by all parties. You can download the signed PDF and the completion certificate (audit record) with the button below.`) + p(i.token ? `This download link works for ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].downloadLinkDays} days. Keep your own copy of the files.` : 'Sign in to HomeQuote Network to download the signed PDF and certificate.'), {
        label: i.token ? 'Download signed document' : 'Open in HomeQuote Network',
        href
    }, i.token ? esc('This link is personal to you — please do not forward it.') : '');
    const text = `Hi ${i.recipientName},\n\n"${i.documentTitle}" has been signed by all parties.\n\nDownload: ${href}\n`;
    return {
        subject,
        html,
        text,
        message: text
    };
}
function declinedEmail(i) {
    const subject = `Declined: ${i.documentTitle}`;
    const html = shell('A signer declined', p(`Hi ${esc(i.senderName || 'there')},`) + p(`<strong>${esc(i.signerName)}</strong> declined to sign <strong>${esc(i.documentTitle)}</strong>. The request is closed.`) + (i.reason ? quote(i.reason) : ''), {
        label: 'Open document',
        href: i.viewUrl
    });
    const text = `${i.signerName} declined to sign "${i.documentTitle}".${i.reason ? `\nReason: ${i.reason}` : ''}\n${i.viewUrl}`;
    return {
        subject,
        html,
        text,
        message: text
    };
}
function voidedEmail(i) {
    const subject = `Cancelled: ${i.documentTitle}`;
    const html = shell('This signing request was cancelled', p(`Hi ${esc(i.recipientName)},`) + p(`${esc(i.business || 'The sender')} cancelled the request to sign <strong>${esc(i.documentTitle)}</strong>. The link you received no longer works. If a corrected version is needed you will get a new email.`));
    const text = `${i.business || 'The sender'} cancelled the request to sign "${i.documentTitle}". The link no longer works.`;
    return {
        subject,
        html,
        text,
        message: text
    };
}
}),
"[project]/lib/signing/access-code.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CODE_LENGTH",
    ()=>CODE_LENGTH,
    "MAX_CODE_ATTEMPTS",
    ()=>MAX_CODE_ATTEMPTS,
    "formatCodeForDisplay",
    ()=>formatCodeForDisplay,
    "hashAccessCode",
    ()=>hashAccessCode,
    "newAccessCode",
    ()=>newAccessCode,
    "normalizeCodeInput",
    ()=>normalizeCodeInput
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;
const hashAccessCode = (salt, code)=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])('sha256').update(`${salt}:${code}`, 'utf8').digest('hex');
function newAccessCode() {
    const code = String((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomInt"])(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
    const salt = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(16).toString('hex');
    return {
        code,
        salt,
        hash: hashAccessCode(salt, code)
    };
}
function normalizeCodeInput(raw) {
    if (typeof raw !== 'string') return null;
    const digits = raw.replace(/[\s-]/g, '');
    return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(digits) ? digits : null;
}
const formatCodeForDisplay = (code)=>`${code.slice(0, 3)} ${code.slice(3)}`;
}),
"[project]/lib/signing/consent-hash.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CONSENT_TEXT_SHA256",
    ()=>CONSENT_TEXT_SHA256
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
;
;
const CONSENT_TEXT_SHA256 = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])('sha256').update(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONSENT_VERSION"] + '\n' + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONSENT_TEXT"].join('\n')).digest('hex');
}),
"[project]/lib/signing/format.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "describeUserAgent",
    ()=>describeUserAgent,
    "formatSigningDate",
    ()=>formatSigningDate,
    "formatUtc",
    ()=>formatUtc,
    "safeTimeZone",
    ()=>safeTimeZone
]);
function safeTimeZone(tz) {
    if (typeof tz !== 'string' || !tz || tz.length > 64) return 'UTC';
    try {
        new Intl.DateTimeFormat('en-US', {
            timeZone: tz
        });
        return tz;
    } catch  {
        return 'UTC';
    }
}
function formatSigningDate(date, format, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: safeTimeZone(timeZone),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date).reduce((acc, p)=>{
        acc[p.type] = p.value;
        return acc;
    }, {});
    const { year, month, day } = parts;
    switch(format){
        case 'MM/dd/yyyy':
            return `${month}/${day}/${year}`;
        case 'dd/MM/yyyy':
            return `${day}/${month}/${year}`;
        case 'yyyy-MM-dd':
            return `${year}-${month}-${day}`;
        default:
            {
                const names = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec'
                ];
                return `${names[Number(month) - 1]} ${Number(day)}, ${year}`;
            }
    }
}
function formatUtc(value) {
    if (!value) return '—';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '—';
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}
function describeUserAgent(ua) {
    if (!ua) return 'Unknown device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
    return `${browser} on ${os}`;
}
}),
"[project]/lib/signing/certificate.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

/**
 * Certificate of completion / audit record, as a separate PDF.
 * States plainly what was and was not verified; it does NOT claim a certificate-based digital signature.
 */ __turbopack_context__.s([
    "buildCertificate",
    ()=>buildCertificate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/StandardFonts.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@cantoo/pdf-lib/es/api/colors.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/format.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/stamp.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
const MARGIN = 48;
const INK = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.09, 0.09, 0.11);
const MUTED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.4, 0.4, 0.45);
const RULE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.85, 0.85, 0.88);
async function buildCertificate(input) {
    const doc = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PDFDocument"].create();
    doc.setTitle(`Certificate of completion – ${input.documentTitle}`.slice(0, 200));
    doc.setProducer('HomeQuote Network');
    const fonts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prepareFonts"])(doc);
    const body = await fonts.unicode();
    const bold = await doc.embedFont(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$StandardFonts$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StandardFonts"].HelveticaBold);
    const W = 612, H = 792;
    let page = doc.addPage([
        W,
        H
    ]);
    let y = H - MARGIN;
    const width = W - MARGIN * 2;
    const header = (p)=>{
        p.drawRectangle({
            x: 0,
            y: H - 6,
            width: W,
            height: 6,
            color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$cantoo$2f$pdf$2d$lib$2f$es$2f$api$2f$colors$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rgb"])(0.06, 0.09, 0.16)
        });
        p.drawText('HomeQuote Network', {
            x: MARGIN,
            y: H - 30,
            size: 11,
            font: bold,
            color: INK
        });
        p.drawText('Certificate of completion', {
            x: W - MARGIN - bold.widthOfTextAtSize('Certificate of completion', 9),
            y: H - 29,
            size: 9,
            font: bold,
            color: MUTED
        });
    };
    header(page);
    y = H - 62;
    const ensure = (need)=>{
        if (y - need < MARGIN + 18) {
            page = doc.addPage([
                W,
                H
            ]);
            header(page);
            y = H - 62;
        }
    };
    const wrap = (text, font, size, maxW)=>{
        const out = [];
        for (const para of String(text).split('\n')){
            let line = '';
            for (const word of para.split(/\s+/)){
                let w = word;
                while(font.widthOfTextAtSize(w, size) > maxW){
                    let cut = w.length;
                    while(cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW)cut--;
                    if (line) {
                        out.push(line);
                        line = '';
                    }
                    out.push(w.slice(0, cut));
                    w = w.slice(cut);
                }
                const next = line ? `${line} ${w}` : w;
                if (font.widthOfTextAtSize(next, size) <= maxW) line = next;
                else {
                    out.push(line);
                    line = w;
                }
            }
            out.push(line);
        }
        return out;
    };
    const para = (text, o = {})=>{
        const size = o.size ?? 9;
        const font = o.font ?? body;
        const x = o.x ?? MARGIN;
        const w = o.w ?? width;
        for (const line of wrap(text, font, size, w)){
            ensure(size + 3);
            page.drawText(line, {
                x,
                y: y - size,
                size,
                font,
                color: o.color ?? INK
            });
            y -= size + 3;
        }
        y -= o.gap ?? 0;
    };
    const h2 = (text)=>{
        ensure(34);
        y -= 8;
        page.drawText(text, {
            x: MARGIN,
            y: y - 12,
            size: 12,
            font: bold,
            color: INK
        });
        y -= 16;
        page.drawLine({
            start: {
                x: MARGIN,
                y
            },
            end: {
                x: W - MARGIN,
                y
            },
            thickness: 0.6,
            color: RULE
        });
        y -= 8;
    };
    const kv = (k, v)=>{
        const lines = wrap(v || '—', body, 9, width - 150);
        ensure(lines.length * 12 + 2);
        page.drawText(k, {
            x: MARGIN,
            y: y - 9,
            size: 8.5,
            font: bold,
            color: MUTED
        });
        lines.forEach((l, i)=>page.drawText(l, {
                x: MARGIN + 150,
                y: y - 9 - i * 12,
                size: 9,
                font: body,
                color: INK
            }));
        y -= lines.length * 12 + 2;
    };
    page.drawText('Certificate of completion', {
        x: MARGIN,
        y: y - 18,
        size: 20,
        font: bold,
        color: INK
    });
    y -= 28;
    para('Audit record for an electronically signed document, issued by HomeQuote Network.', {
        color: MUTED,
        gap: 4
    });
    h2('Document');
    kv('Title', input.documentTitle);
    kv('Document ID', `${input.documentId}`);
    kv('Version', `${input.versionNo} (request ${input.versionId})`);
    kv('Pages', String(input.pageCount));
    kv('Original file SHA-256', input.originalSha256);
    kv('Signed file SHA-256', input.finalSha256);
    kv('Sent by', [
        input.sender.name,
        input.sender.email
    ].filter(Boolean).join(' • ') + (input.sender.business ? ` • ${input.sender.business}` : ''));
    kv('Signing order', input.signingOrder === 'sequential' ? 'In sequence' : 'Any order');
    kv('Sent', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(input.sentAt));
    kv('Completed', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(input.completedAt));
    kv('Link expiry', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(input.expiresAt));
    kv('Record retention', input.retentionUntil ? `Kept until at least ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(input.retentionUntil).slice(0, 10)} (${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].retentionYears}-year default policy)` : `${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].retentionYears}-year default policy`);
    h2('Signers');
    for (const r of input.recipients){
        ensure(120);
        para(`${r.order}. ${r.name}  <${r.email}>`, {
            font: bold,
            size: 10,
            gap: 1
        });
        kv('Status', r.status);
        kv('Invited', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(r.invitedAt));
        kv('First opened', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(r.firstViewedAt));
        kv('Agreed to e-sign', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(r.consentAt));
        kv(r.declinedAt ? 'Declined' : 'Signed', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(r.declinedAt ?? r.signedAt));
        kv('Signature method', r.signatureMethods.length ? r.signatureMethods.join(', ') : '—');
        kv('Identification', r.authMethod === 'email_link' ? 'Unique emailed link only (no independent identity verification)' : r.authMethod === 'email_link_code' ? 'Unique emailed link + access code (no independent identity verification)' : r.authMethod);
        kv('IP address', r.ip ?? '—');
        kv('Device', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["describeUserAgent"])(r.userAgent));
        kv('Time zone reported', r.timezone ?? '—');
        y -= 4;
    }
    h2('Electronic signing consent');
    kv('Consent text version', input.consent.version);
    kv('Consent text SHA-256', input.consent.sha256);
    for (const t of input.consent.text)para(`• ${t}`, {
        size: 8.5,
        color: MUTED,
        x: MARGIN + 6,
        w: width - 6
    });
    h2('Event history (UTC)');
    for (const e of input.events){
        const line = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatUtc"])(e.at)}   ${e.type}   ${e.who}${e.ip ? `   ${e.ip}` : ''}`;
        para(line, {
            size: 8,
            gap: 0
        });
    }
    y -= 4;
    kv('Audit chain', input.chainValid ? 'Verified: every event’s hash links to the one before it.' : 'NOT VERIFIED: the stored event hashes do not match. Treat this record with caution.');
    kv('Chain head SHA-256', input.chainHead ?? '—');
    h2('What this record does and does not show');
    para(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IDENTITY_STATEMENT"], {
        size: 8.5,
        gap: 3
    });
    if (input.recipients.some((r)=>r.authMethod === 'email_link_code')) para(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IDENTITY_STATEMENT_CODE"], {
        size: 8.5,
        gap: 3
    });
    para(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNATURE_STATEMENT"], {
        size: 8.5,
        gap: 3
    });
    para('The hash above identifies the signed PDF delivered with this certificate. Any later change to that PDF changes its hash.', {
        size: 8.5,
        gap: 3
    });
    para(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LEGAL_REVIEW_NOTE"], {
        size: 8.5,
        color: MUTED
    });
    const pages = doc.getPages();
    pages.forEach((p, i)=>{
        const label = `Page ${i + 1} of ${pages.length}  •  ${input.documentId.slice(0, 8)}`;
        p.drawText(label, {
            x: W - MARGIN - body.widthOfTextAtSize(label, 7.5),
            y: 24,
            size: 7.5,
            font: body,
            color: MUTED
        });
    });
    return doc.save();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/signing/storage.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "copyObject",
    ()=>copyObject,
    "downloadObject",
    ()=>downloadObject,
    "downloadVerified",
    ()=>downloadVerified,
    "removeObject",
    ()=>removeObject,
    "signedUrl",
    ()=>signedUrl,
    "uploadObject",
    ()=>uploadObject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/errors.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdf-validate.ts [app-rsc] (ecmascript)");
;
;
;
;
;
async function downloadObject(path) {
    const { data, error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).download(path);
    if (error || !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('storage', 'The stored file could not be read.');
    return new Uint8Array(await data.arrayBuffer());
}
async function downloadVerified(path, expectedSha256) {
    const bytes = await downloadObject(path);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sha256Hex"])(bytes) !== expectedSha256) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('integrity', 'The stored file does not match its recorded fingerprint, so it was not released.');
    }
    return bytes;
}
async function uploadObject(path, bytes, upsert = false) {
    const { error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).upload(path, bytes, {
        contentType: 'application/pdf',
        upsert,
        cacheControl: '0'
    });
    if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('storage', 'The file could not be stored.');
}
async function signedUrl(path, seconds = 120, downloadName) {
    const { data, error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).createSignedUrl(path, seconds, downloadName ? {
        download: downloadName
    } : undefined);
    if (error || !data?.signedUrl) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('storage', 'Could not create a download link.');
    return data.signedUrl;
}
async function removeObject(path) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).remove([
        path
    ]).catch(()=>undefined);
}
async function copyObject(from, to) {
    const { error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).copy(from, to);
    if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('storage', 'The file could not be copied.');
}
}),
"[project]/lib/signing/tokens.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateToken",
    ()=>generateToken,
    "hashToken",
    ()=>hashToken,
    "looksLikeToken",
    ()=>looksLikeToken,
    "safeEqualHex",
    ()=>safeEqualHex
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
const generateToken = ()=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('base64url');
const hashToken = (token)=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token, 'utf8').digest('hex');
const looksLikeToken = (t)=>typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
function safeEqualHex(a, b) {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["timingSafeEqual"])(x, y);
}
}),
"[project]/lib/signing/finalize.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "finalizeVersion",
    ()=>finalizeVersion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/gmail.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$consent$2d$hash$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/consent-hash.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$certificate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/certificate.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/email.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdf-validate.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/stamp.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/storage.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/tokens.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$certificate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$certificate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
const errText = (e)=>String(e?.message ?? e).slice(0, 300);
async function logEvent(versionId, recipientId, type, meta = {}) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_log_event', {
        p_version: versionId,
        p_recipient: recipientId,
        p_type: type,
        p_actor: null,
        p_ip: null,
        p_ua: null,
        p_meta: meta
    });
}
async function finalizeVersion(versionId) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: v0 } = await admin.from('signing_versions').select('*').eq('id', versionId).maybeSingle();
    if (!v0 || v0.status !== 'completed') return {
        status: 'failed',
        error: 'not completed'
    };
    if (v0.final_sha256) return {
        status: 'already'
    };
    const claim = await admin.rpc('signing_claim_finalize', {
        p_version: versionId
    });
    if (!claim.data) return {
        status: 'busy'
    };
    try {
        const version = v0;
        const [{ data: doc }, { data: recs }, { data: fields }, { data: values }, { data: events }] = await Promise.all([
            admin.from('signing_documents').select('*').eq('id', version.document_id).single(),
            admin.from('signing_recipients').select('*').eq('version_id', versionId).order('order_index'),
            admin.from('signing_fields').select('*').eq('version_id', versionId),
            admin.from('signing_field_values').select('*').eq('version_id', versionId),
            admin.from('signing_events').select('*').eq('version_id', versionId).order('id')
        ]);
        const original = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["downloadVerified"])(version.original_path, version.original_sha256);
        const final = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$stamp$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stampPdf"])(original, fields ?? [], values ?? []);
        const finalSha = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sha256Hex"])(final);
        const base = version.original_path.replace(/\/[^/]+$/, '');
        const finalPath = `${base}/${versionId}-signed.pdf`;
        const certPath = `${base}/${versionId}-certificate.pdf`;
        const chain = await admin.rpc('signing_verify_chain', {
            p_version: versionId
        });
        const evs = events ?? [];
        const nameById = new Map((recs ?? []).map((r)=>[
                r.id,
                r.name
            ]));
        const fieldType = new Map((fields ?? []).map((f)=>[
                f.id,
                f.type
            ]));
        const cert = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$certificate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildCertificate"])({
            documentTitle: doc.title,
            documentId: doc.id,
            versionId,
            versionNo: version.version_no,
            pageCount: version.page_count,
            originalSha256: version.original_sha256,
            finalSha256: finalSha,
            sender: {
                name: version.sender_name,
                email: version.sender_email,
                business: version.sender_business_name
            },
            sentAt: version.sent_at,
            completedAt: version.completed_at,
            expiresAt: version.expires_at,
            signingOrder: version.signing_order,
            retentionUntil: version.retention_until,
            recipients: (recs ?? []).map((r)=>({
                    name: r.name,
                    email: r.email,
                    order: r.order_index,
                    status: r.status,
                    invitedAt: r.invited_at,
                    firstViewedAt: r.first_viewed_at,
                    consentAt: r.consent_at,
                    signedAt: r.signed_at,
                    declinedAt: r.declined_at,
                    ip: r.sign_ip,
                    userAgent: r.sign_user_agent,
                    timezone: r.sign_timezone,
                    authMethod: r.auth_method,
                    signatureMethods: (values ?? []).filter((x)=>x.recipient_id === r.id && x.sig_method).map((x)=>`${fieldType.get(x.field_id)}: ${x.sig_method}`)
                })),
            consent: {
                version: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONSENT_VERSION"],
                sha256: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$consent$2d$hash$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONSENT_TEXT_SHA256"],
                text: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CONSENT_TEXT"]
            },
            events: evs.map((e)=>({
                    at: e.created_at,
                    type: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_EVENT_LABELS"][e.event_type] ?? e.event_type,
                    who: e.recipient_id ? nameById.get(e.recipient_id) ?? 'Signer' : e.actor_user_id ? 'Sender' : 'System',
                    ip: e.ip
                })),
            chainHead: evs.length ? evs[evs.length - 1].event_hash : null,
            chainValid: chain.data === true
        });
        const certSha = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sha256Hex"])(cert);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadObject"])(finalPath, final, true);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadObject"])(certPath, cert, true);
        const rec = await admin.rpc('signing_record_final', {
            p_version: versionId,
            p_final_path: finalPath,
            p_final_sha: finalSha,
            p_cert_path: certPath,
            p_cert_sha: certSha
        });
        if (rec.error) throw new Error(rec.error.message);
        if (!rec.data?.already) await sendCompletionEmails(version, doc.title, recs ?? []);
        return {
            status: 'finalized'
        };
    } catch (e) {
        const message = errText(e);
        await admin.from('signing_versions').update({
            finalize_error: message,
            finalize_claimed_until: null
        }).eq('id', versionId);
        await logEvent(versionId, null, 'finalize_failed', {
            error: message
        }).catch(()=>undefined);
        return {
            status: 'failed',
            error: message
        };
    }
}
async function sendCompletionEmails(version, title, recipients) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    for (const r of recipients){
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateToken"])();
        const issued = await admin.rpc('signing_issue_download_token', {
            p_recipient: r.id,
            p_token_hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hashToken"])(token),
            p_days: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].downloadLinkDays
        });
        if (issued.error || !issued.data?.ok) continue;
        try {
            const m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["completedEmail"])({
                recipientName: r.name,
                documentTitle: title,
                business: version.sender_business_name,
                token
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendGmailMessage"])({
                toEmail: r.email,
                subject: m.subject,
                message: m.message,
                html: m.html,
                text: m.text,
                replyTo: version.sender_email ?? undefined
            });
            await logEvent(version.id, r.id, 'completion_emailed');
        } catch (e) {
            await logEvent(version.id, r.id, 'completion_email_failed', {
                error: errText(e)
            }).catch(()=>undefined);
        }
    }
    if (version.sender_email) {
        try {
            const m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["completedEmail"])({
                recipientName: version.sender_name || 'there',
                documentTitle: title,
                business: version.sender_business_name,
                token: null,
                viewUrl: `${("TURBOPACK compile-time value", "http://localhost:3371") ?? ''}/app/documents/${version.id}`
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendGmailMessage"])({
                toEmail: version.sender_email,
                subject: m.subject,
                message: m.message,
                html: m.html,
                text: m.text
            });
        } catch  {}
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/signing/schemas.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "draftSchema",
    ()=>draftSchema,
    "fieldSchema",
    ()=>fieldSchema,
    "fromTemplateSchema",
    ()=>fromTemplateSchema,
    "inspectPngBase64",
    ()=>inspectPngBase64,
    "recipientSchema",
    ()=>recipientSchema,
    "reminderSchema",
    ()=>reminderSchema,
    "submitSchema",
    ()=>submitSchema,
    "submitValueSchema",
    ()=>submitValueSchema,
    "templateInputSchema",
    ()=>templateInputSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
;
;
const frac = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(1);
const fieldSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    recipient_index: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxRecipients).nullable(),
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["FIELD_TYPES"]),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxPages),
    x: frac,
    y: frac,
    w: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0.003).max(1),
    h: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0.003).max(1),
    required: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    label: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(120).nullable().optional(),
    group_key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(60).nullable().optional(),
    prefill_value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxTextLength).nullable().optional(),
    date_format: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DATE_FORMATS"]).nullable().optional(),
    source: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'acroform',
        'text',
        'ocr',
        'manual'
    ]).default('manual'),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(1).nullable().optional(),
    needs_review: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    reviewed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    role_hint: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(40).nullable().optional(),
    detection_note: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(300).nullable().optional(),
    source_ref: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).nullable().optional()
}).refine((f)=>f.x + f.w <= 1.0001 && f.y + f.h <= 1.0001, 'Field must stay on the page').refine((f)=>!f.prefill_value || f.type === 'text', 'Only text fields can be pre-filled');
const recipientSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1).max(200),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().toLowerCase().email().max(254)
});
const draftSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    subject: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(200).default(''),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(4000).default(''),
    signing_order: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'sequential',
        'parallel'
    ]),
    expiry_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90),
    auto_remind_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(30).nullable().default(null),
    auto_remind_max: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(10).default(3),
    require_access_code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    recipients: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(recipientSchema).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxRecipients),
    fields: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(fieldSchema).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxFields)
});
const submitValueSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    field_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxTextLength).nullish(),
    sig_method: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'drawn',
        'typed'
    ]).nullish(),
    typed_text: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).nullish(),
    image_png: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(Math.ceil(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxSignatureImageBytes * 1.4)).nullish()
});
const submitSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    values: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(submitValueSchema).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxFields),
    timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(64).optional()
});
function inspectPngBase64(b64) {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 33 || buf.length > __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxSignatureImageBytes) return null;
    if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
    if (!width || !height || width > 2400 || height > 1200) return null;
    return {
        width,
        height,
        bytes: buf.length
    };
}
const reminderSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(30).nullable(),
    max: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(10)
});
const templateInputSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Give the template a name').max(120),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(500).default(''),
    roleLabels: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Name every signer role').max(60)).min(1).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxRecipients),
    keepPrefill: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false)
});
const fromTemplateSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, 'Give the document a title').max(200),
    leadId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable().default(null),
    recipients: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(recipientSchema).min(1).max(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LIMITS"].maxRecipients)
});
}),
"[project]/lib/signing/service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "createNewVersion",
    ()=>createNewVersion,
    "deleteDraft",
    ()=>deleteDraft,
    "getEditorBundle",
    ()=>getEditorBundle,
    "markReviewed",
    ()=>markReviewed,
    "prepareUpload",
    ()=>prepareUpload,
    "previewUrl",
    ()=>previewUrl,
    "regenerateAccessCode",
    ()=>regenerateAccessCode,
    "registerUpload",
    ()=>registerUpload,
    "remindRecipient",
    ()=>remindRecipient,
    "resendInvitation",
    ()=>resendInvitation,
    "retryFinalize",
    ()=>retryFinalize,
    "runAutoReminders",
    ()=>runAutoReminders,
    "saveDraft",
    ()=>saveDraft,
    "searchLeads",
    ()=>searchLeads,
    "sendForSignature",
    ()=>sendForSignature,
    "senderFileUrl",
    ()=>senderFileUrl,
    "setReminders",
    ()=>setReminders,
    "signingMaintenance",
    ()=>signingMaintenance,
    "voidRequest",
    ()=>voidRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/gmail.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/access.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$detect$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/detect.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/email.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/errors.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2d$code$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/access-code.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/rpc.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$finalize$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/finalize.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdf-validate.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/schemas.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/storage.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/tokens.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$finalize$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$finalize$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
const errText = (e)=>String(e?.message ?? e).slice(0, 300);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requireManager(actor) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageSigning"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('forbidden', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('forbidden'));
}
async function prepareUpload(actor, requestedContractorId) {
    requireManager(actor);
    const contractorId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor) ? requestedContractorId : actor.contractor_id;
    if (contractorId && !UUID.test(contractorId)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Invalid company.');
    const docId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomUUID"])(), versionId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomUUID"])();
    const path = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ownerKey"])(contractorId)}/${docId}/${versionId}.pdf`;
    const { data, error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().storage.from(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SIGNING_BUCKET"]).createSignedUploadUrl(path);
    if (error || !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('storage', 'Could not start the upload.');
    return {
        docId,
        versionId,
        path,
        token: data.token,
        contractorId
    };
}
async function registerUpload(actor, input) {
    requireManager(actor);
    const contractorId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor) ? input.contractorId : actor.contractor_id;
    if (!UUID.test(input.docId) || !UUID.test(input.versionId)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Invalid upload.');
    const path = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ownerKey"])(contractorId)}/${input.docId}/${input.versionId}.pdf`;
    const title = input.title.trim().slice(0, 200);
    if (!title) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Give the document a title.');
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    if (input.leadId) {
        // RLS-scoped lookup: a contractor can only attach leads they can already see.
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: lead } = await supabase.from('leads').select('id').eq('id', input.leadId).maybeSingle();
        if (!lead) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('forbidden', 'That lead is not available to you.');
        // A company's document may only be attached to a lead assigned to that company: the editor shows the
        // lead's name, so attaching someone else's lead would disclose it to this company.
        if (contractorId) {
            const { data: asg } = await admin.from('lead_assignments').select('id').eq('lead_id', input.leadId).eq('contractor_id', contractorId).maybeSingle();
            if (!asg) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('lead_mismatch', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('lead_mismatch'));
        }
    }
    if (contractorId) {
        const { data: c } = await admin.from('contractors').select('id').eq('id', contractorId).maybeSingle();
        if (!c) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Unknown company.');
    }
    let bytes;
    try {
        bytes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["downloadObject"])(path);
    } catch  {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'The upload did not arrive. Please try again.');
    }
    let inspected;
    try {
        inspected = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inspectPdf"])(bytes);
    } catch (e) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeObject"])(path);
        if (e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PdfRejected"]) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"](e.code, e.message);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('unreadable', 'This PDF could not be read.');
    }
    const detection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$detect$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["detectFields"])(bytes, inspected.geoms).catch(()=>null);
    const ins = await admin.from('signing_documents').insert({
        id: input.docId,
        contractor_id: contractorId,
        lead_id: input.leadId,
        title,
        created_by: actor.id
    });
    if (ins.error) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeObject"])(path);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('server', 'The document could not be created.');
    }
    const vIns = await admin.from('signing_versions').insert({
        id: input.versionId,
        document_id: input.docId,
        version_no: 1,
        original_path: path,
        original_sha256: inspected.sha256,
        original_size: inspected.size,
        page_count: inspected.pageCount,
        pages: inspected.pages,
        detection: detection?.info ?? {
            methods: [],
            notes: [
                'Automatic detection was unavailable; place fields manually.'
            ],
            processing: 'local'
        },
        created_by: actor.id
    });
    if (vIns.error) {
        await admin.from('signing_documents').delete().eq('id', input.docId);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeObject"])(path);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('server', 'The document could not be created.');
    }
    if (detection?.fields.length) {
        const rows = detection.fields.map((f, i)=>({
                version_id: input.versionId,
                recipient_id: null,
                type: f.type,
                page: f.page,
                x: f.x,
                y: f.y,
                w: f.w,
                h: f.h,
                required: f.required,
                label: f.label,
                group_key: f.group_key,
                source: f.source,
                confidence: f.confidence,
                needs_review: f.needs_review,
                role_hint: f.role_hint,
                detection_note: f.detection_note,
                source_ref: f.source_ref,
                sort_order: i
            }));
        await admin.from('signing_fields').insert(rows);
    }
    await admin.from('signing_documents').update({
        current_version_id: input.versionId
    }).eq('id', input.docId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["log"])(input.versionId, 'version_created', actor, {
        version_no: 1,
        original_sha256: inspected.sha256,
        pages: inspected.pageCount
    });
    return {
        documentId: input.docId,
        versionId: input.versionId,
        suggested: detection?.fields.length ?? 0
    };
}
async function getEditorBundle(actor, versionId) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const [recs, fields, events, vals] = await Promise.all([
        admin.from('signing_recipients').select('id,name,email,order_index,status,invited_at,last_sent_at,send_count,last_email_status,last_email_error,last_reminded_at,first_viewed_at,consent_at,signed_at,declined_at,decline_reason,auto_reminders_sent,access_code_issued_at,access_code_locked_at,access_verified_at').eq('version_id', versionId).order('order_index'),
        admin.from('signing_fields').select('*').eq('version_id', versionId).order('sort_order'),
        admin.from('signing_events').select('id,recipient_id,event_type,ip,metadata,created_at,actor_user_id').eq('version_id', versionId).order('id'),
        admin.from('signing_field_values').select('field_id,recipient_id,value,sig_method,typed_text').eq('version_id', versionId)
    ]);
    const { data: siblings } = await admin.from('signing_versions').select('id,version_no,status,created_at').eq('document_id', doc.id).order('version_no', {
        ascending: false
    });
    let lead = null;
    if (doc.lead_id) {
        const { data: l } = await admin.from('leads').select('id,first_name,last_name').eq('id', doc.lead_id).maybeSingle();
        if (l) lead = {
            id: l.id,
            name: [
                l.first_name,
                l.last_name
            ].filter(Boolean).join(' ') || 'Lead'
        };
    }
    let contractorName = null;
    if (doc.contractor_id) contractorName = (await admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle()).data?.name ?? null;
    const expiredNow = [
        'awaiting_signature',
        'partially_signed'
    ].includes(version.status) && version.expires_at && new Date(version.expires_at) <= new Date();
    return {
        document: doc,
        version: {
            ...version,
            status: expiredNow ? 'expired' : version.status
        },
        recipients: recs.data ?? [],
        fields: fields.data ?? [],
        events: events.data ?? [],
        values: vals.data ?? [],
        versions: siblings ?? [],
        lead,
        contractorName
    };
}
async function saveDraft(actor, versionId, raw) {
    const { version } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    if (version.status !== 'draft') throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('locked', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('locked'));
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["draftSchema"].safeParse(raw);
    if (!parsed.success) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Some values are invalid: ' + parsed.error.issues.slice(0, 2).map((i)=>i.path.join('.') + ' ' + i.message).join('; '));
    const d = parsed.data;
    for (const f of d.fields)if (f.page > version.page_count) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'A field is on a page that does not exist.');
    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_save_draft', {
        p_version: versionId,
        p_subject: d.subject,
        p_message: d.message,
        p_order: d.signing_order,
        p_expiry_days: d.expiry_days,
        p_recipients: d.recipients,
        p_fields: d.fields
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(res);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_set_draft_options', {
        p_version: versionId,
        p_auto_remind_days: d.auto_remind_days,
        p_auto_remind_max: d.auto_remind_max,
        p_require_code: d.require_access_code
    }));
}
async function markReviewed(actor, versionId) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_mark_reviewed', {
        p_version: versionId,
        p_actor: actor.id
    }));
}
async function deleteDraft(actor, versionId) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    if (version.status !== 'draft') throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('locked', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('locked'));
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { count } = await admin.from('signing_versions').select('id', {
        count: 'exact',
        head: true
    }).eq('document_id', doc.id);
    await admin.from('signing_documents').update({
        current_version_id: null
    }).eq('id', doc.id);
    const del = await admin.from('signing_versions').delete().eq('id', versionId);
    if (del.error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('server', 'Could not delete the draft.');
    if ((count ?? 0) <= 1) await admin.from('signing_documents').delete().eq('id', doc.id);
    else {
        const { data: prev } = await admin.from('signing_versions').select('id').eq('document_id', doc.id).order('version_no', {
            ascending: false
        }).limit(1).maybeSingle();
        await admin.from('signing_documents').update({
            current_version_id: prev?.id ?? null
        }).eq('id', doc.id);
    }
    // keep the stored file only if another version still references it
    const { count: refs } = await admin.from('signing_versions').select('id', {
        count: 'exact',
        head: true
    }).eq('original_path', version.original_path);
    if (!refs) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeObject"])(version.original_path);
}
async function inviteRecipient(version, title, recipient, kind, actor) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateToken"])();
    const issued = await admin.rpc('signing_issue_token', {
        p_recipient: recipient.id,
        p_token_hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$tokens$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hashToken"])(token)
    });
    if (issued.error || !issued.data?.ok) return {
        recipientId: recipient.id,
        name: recipient.name,
        email: recipient.email,
        sent: false,
        error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])(issued.data?.error ?? 'server')
    };
    try {
        const m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inviteEmail"])({
            recipientName: recipient.name,
            senderName: version.sender_name,
            business: version.sender_business_name,
            documentTitle: title,
            message: version.message,
            expiresAt: new Date(issued.data.expires_at),
            token,
            reminder: kind !== 'invited',
            subject: version.subject,
            senderEmail: version.sender_email,
            requiresCode: version.require_access_code
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendGmailMessage"])({
            toEmail: recipient.email,
            subject: m.subject,
            message: m.message,
            html: m.html,
            text: m.text,
            replyTo: version.sender_email ?? undefined
        });
        const { data: cur } = await admin.from('signing_recipients').select('send_count').eq('id', recipient.id).single();
        await admin.from('signing_recipients').update({
            last_sent_at: new Date().toISOString(),
            send_count: (cur?.send_count ?? 0) + 1,
            last_email_status: 'sent',
            last_email_error: null,
            ...kind !== 'invited' ? {
                last_reminded_at: new Date().toISOString()
            } : {}
        }).eq('id', recipient.id);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["log"])(version.id, kind === 'invited' ? 'invited' : kind === 'auto_reminded' ? 'auto_reminded' : 'reminded', actor, {}, recipient.id);
        return {
            recipientId: recipient.id,
            name: recipient.name,
            email: recipient.email,
            sent: true
        };
    } catch (e) {
        const error = errText(e);
        await admin.from('signing_recipients').update({
            last_email_status: 'failed',
            last_email_error: error
        }).eq('id', recipient.id);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["log"])(version.id, 'invite_failed', actor, {
            error
        }, recipient.id).catch(()=>undefined);
        return {
            recipientId: recipient.id,
            name: recipient.name,
            email: recipient.email,
            sent: false,
            error
        };
    }
}
async function sendForSignature(actor, versionId) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    let business = 'HomeQuote Network';
    if (doc.contractor_id) business = (await admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle()).data?.name ?? null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await admin.rpc('signing_send', {
        p_version: versionId,
        p_actor: actor.id,
        p_sender_name: actor.full_name ?? actor.email,
        p_sender_email: actor.email,
        p_business: business
    }));
    const { data: fresh } = await admin.from('signing_versions').select('*').eq('id', versionId).single();
    const { data: recs } = await admin.from('signing_recipients').select('id,name,email,order_index').eq('version_id', versionId).order('order_index');
    const codes = [];
    const codeFailed = new Set();
    if (fresh.require_access_code) {
        for (const r of recs ?? []){
            const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2d$code$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["newAccessCode"])();
            const res = await admin.rpc('signing_set_access_code', {
                p_recipient: r.id,
                p_salt: c.salt,
                p_hash: c.hash,
                p_actor: actor.id
            });
            if (res.error || !res.data?.ok) codeFailed.add(r.id);
            else codes.push({
                recipientId: r.id,
                name: r.name,
                email: r.email,
                code: c.code
            });
        }
    }
    const targets = version.signing_order === 'sequential' ? (recs ?? []).slice(0, 1) : recs ?? [];
    const results = [];
    for (const r of targets){
        if (codeFailed.has(r.id)) {
            results.push({
                recipientId: r.id,
                name: r.name,
                email: r.email,
                sent: false,
                error: 'An access code could not be created. Use “New code”, then resend.'
            });
            continue;
        }
        results.push(await inviteRecipient(fresh, doc.title, r, 'invited', actor));
    }
    return {
        results,
        codes
    };
}
async function regenerateAccessCode(actor, versionId, recipientId) {
    const { version, r } = await activeRecipient(actor, versionId, recipientId);
    if (!version.require_access_code) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_required', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('not_required'));
    const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2d$code$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["newAccessCode"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_set_access_code', {
        p_recipient: recipientId,
        p_salt: c.salt,
        p_hash: c.hash,
        p_actor: actor.id
    }));
    return {
        recipientId,
        name: r.name,
        email: r.email,
        code: c.code
    };
}
async function setReminders(actor, versionId, raw) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["reminderSchema"].safeParse(raw);
    if (!parsed.success) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Choose valid reminder settings.');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_set_reminders', {
        p_version: versionId,
        p_auto_remind_days: parsed.data.days,
        p_auto_remind_max: parsed.data.max,
        p_actor: actor.id
    }));
}
async function activeRecipient(actor, versionId, recipientId) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    if (![
        'awaiting_signature',
        'partially_signed'
    ].includes(version.status)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_open', (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["messageFor"])('not_open'));
    if (version.expires_at && new Date(version.expires_at) <= new Date()) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('expired', 'This request has expired. Create a new version to send it again.');
    const { data: r } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().from('signing_recipients').select('id,name,email,status').eq('id', recipientId).eq('version_id', versionId).maybeSingle();
    if (!r) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_found', 'not found');
    if (r.status === 'signed') throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_open', 'This signer has already signed.');
    return {
        version,
        doc,
        r
    };
}
async function resendInvitation(actor, versionId, recipientId) {
    const { version, doc, r } = await activeRecipient(actor, versionId, recipientId);
    return inviteRecipient(version, doc.title, r, 'invited', actor);
}
async function remindRecipient(actor, versionId, recipientId) {
    const { version, doc, r } = await activeRecipient(actor, versionId, recipientId);
    return inviteRecipient(version, doc.title, r, 'reminded', actor);
}
async function voidRequest(actor, versionId, reason) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: before } = await admin.from('signing_recipients').select('id,name,email,status,invited_at').eq('version_id', versionId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await admin.rpc('signing_void', {
        p_version: versionId,
        p_actor: actor.id,
        p_reason: reason.slice(0, 500)
    }));
    for (const r of before ?? []){
        if (r.status === 'signed' || !r.invited_at) continue;
        try {
            const m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$email$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["voidedEmail"])({
                recipientName: r.name,
                documentTitle: doc.title,
                business: version.sender_business_name
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$gmail$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendGmailMessage"])({
                toEmail: r.email,
                subject: m.subject,
                message: m.message,
                html: m.html,
                text: m.text,
                replyTo: version.sender_email ?? undefined
            });
        } catch  {}
    }
}
async function createNewVersion(actor, versionId) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const r = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unwrap"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().rpc('signing_new_version', {
        p_version: versionId,
        p_actor: actor.id
    }));
    return {
        versionId: r.version_id,
        versionNo: r.version_no
    };
}
async function senderFileUrl(actor, versionId, kind) {
    const { version, doc } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    const safeTitle = doc.title.replace(/[^\w .()-]+/g, '_').slice(0, 80) || 'document';
    if (kind === 'original') {
        // Original is returned unmodified, integrity-checked.
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["downloadVerified"])(version.original_path, version.original_sha256);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signedUrl"])(version.original_path, 60, `${safeTitle}.pdf`);
    }
    const path = kind === 'final' ? version.final_path : version.certificate_path;
    const sha = kind === 'final' ? version.final_sha256 : version.certificate_sha256;
    if (!path || !sha) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('not_ready', 'The completed file is not ready yet.');
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["downloadVerified"])(path, sha);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["log"])(versionId, 'downloaded', actor, {
        kind
    });
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signedUrl"])(path, 60, kind === 'final' ? `${safeTitle} - signed.pdf` : `${safeTitle} - certificate.pdf`);
}
async function previewUrl(actor, versionId) {
    const { version } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signedUrl"])(version.original_path, 600);
}
async function retryFinalize(actor, versionId) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadVersionForActor"])(actor, versionId);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$finalize$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["finalizeVersion"])(versionId);
}
async function runAutoReminders(limit = 20) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: claimed, error } = await admin.rpc('signing_claim_auto_reminders', {
        p_limit: limit
    });
    if (error || !Array.isArray(claimed)) return {
        claimed: 0,
        sent: 0
    };
    let sent = 0;
    for (const c of claimed){
        try {
            const { data: version } = await admin.from('signing_versions').select('*').eq('id', c.version_id).single();
            const { data: doc } = await admin.from('signing_documents').select('title').eq('id', version.document_id).single();
            const { data: r } = await admin.from('signing_recipients').select('id,name,email').eq('id', c.recipient_id).single();
            if (version && doc && r && (await inviteRecipient(version, doc.title, r, 'auto_reminded', null)).sent) sent++;
        } catch  {}
    }
    return {
        claimed: claimed.length,
        sent
    };
}
async function signingMaintenance() {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const out = {
        expired: 0,
        finalized: 0,
        reminders: 0
    };
    try {
        const r = await admin.rpc('signing_expire_due');
        out.expired = typeof r.data === 'number' ? r.data : 0;
        const { data: stuck } = await admin.from('signing_versions').select('id').eq('status', 'completed').is('final_sha256', null).limit(5);
        for (const s of stuck ?? [])if ((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$finalize$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["finalizeVersion"])(s.id)).status === 'finalized') out.finalized++;
    } catch  {}
    try {
        out.reminders = (await runAutoReminders()).sent;
    } catch  {}
    return out;
}
async function searchLeads(actor, query, contractorId) {
    requireManager(actor);
    const company = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor) ? contractorId : actor.contractor_id;
    if (company && !UUID.test(company)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SigningError"]('bad_request', 'Invalid company.');
    const terms = query.trim().toLowerCase().replace(/[^\p{L}\p{N} '.-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 4);
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let leads = [];
    if (company) {
        const { data } = await supabase.from('lead_assignments').select('lead:leads(id,first_name,last_name,zip,phone_e164)').eq('contractor_id', company).order('created_at', {
            ascending: false
        }).limit(300);
        leads = (data ?? []).map((r)=>r.lead).filter(Boolean);
    } else {
        const cols = 'id,first_name,last_name,zip,phone_e164';
        const first = terms[0];
        if (first) {
            const [a, b] = await Promise.all([
                supabase.from('leads').select(cols).ilike('first_name', `%${first}%`).limit(40),
                supabase.from('leads').select(cols).ilike('last_name', `%${first}%`).limit(40)
            ]);
            leads = [
                ...a.data ?? [],
                ...b.data ?? []
            ];
        } else {
            leads = (await supabase.from('leads').select(cols).order('created_at', {
                ascending: false
            }).limit(15)).data ?? [];
        }
    }
    const seen = new Set();
    const hits = [];
    for (const l of leads){
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        const name = [
            l.first_name,
            l.last_name
        ].filter(Boolean).join(' ') || 'Unnamed lead';
        if (!terms.every((t)=>name.toLowerCase().includes(t))) continue;
        hits.push({
            id: l.id,
            name,
            detail: [
                l.zip,
                l.phone_e164 ? `••${l.phone_e164.slice(-4)}` : null
            ].filter(Boolean).join(' · ')
        });
        if (hits.length >= 15) break;
    }
    return hits;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/documents/preview.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure helpers for customer documents (work orders / proposals / contracts): which fields a person may edit, what is
 * missing, and a plain-text preview of the exact wording. No I/O, safe to import from client components.
 *
 * The WORDING of a document is the snapshot of an admin-approved template and is never editable here. Only merge-field
 * values (names, prices, dates, scope) can be changed, and those are validated by the same resolver the PDF uses.
 */ __turbopack_context__.s([
    "DOC_TYPE_LABELS",
    ()=>DOC_TYPE_LABELS,
    "editableKeys",
    ()=>editableKeys,
    "prefillFromLead",
    ()=>prefillFromLead,
    "previewDocument",
    ()=>previewDocument,
    "sanitizeValues",
    ()=>sanitizeValues,
    "templateAllowedForState",
    ()=>templateAllowedForState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$render$2d$model$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/render-model.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/variables.ts [app-rsc] (ecmascript)");
;
;
const DOC_TYPE_LABELS = {
    work_order: 'Work order',
    proposal: 'Proposal',
    contract: 'Contract'
};
const EMPTY_CLIENT = {
    company: '',
    name: '',
    email: '',
    phone: '',
    address: ''
};
function editableKeys(sections) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["usedVariables"])(sections).known.filter((k)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VARIABLE_BY_KEY"].get(k)?.source === 'input');
}
function sanitizeValues(sections, input) {
    const allowed = new Set(editableKeys(sections));
    const out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    for (const [k, v] of Object.entries(input)){
        if (allowed.has(k) && typeof v === 'string') out[k] = v.trim().slice(0, 6000);
    }
    return out;
}
function blockText(b) {
    switch(b.t){
        case 'heading':
        case 'para':
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$render$2d$model$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runsText"])(b.runs);
        case 'list':
            return b.items.map((item, i)=>`${b.ordered ? `${b.start + i}.` : '•'} ${item.map(blockText).join(' ')}`).join('\n');
        case 'table':
            return b.rows.map((r)=>r.cells.map((c)=>c.blocks.map(blockText).join(' ')).join(' | ')).join('\n');
        case 'signatures':
            return '[Signature, printed name and date for each signer]';
        default:
            return '';
    }
}
function previewDocument(input) {
    const today = input.today ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["todayIso"])();
    const resolved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolveVariables"])(input.sections, input.values, EMPTY_CLIENT, {
        today
    });
    const model = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$render$2d$model$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildRenderModel"])(input.sections, resolved.values);
    const leadFilled = new Set(input.leadFilled ?? []);
    const fields = editableKeys(input.sections).map((key)=>{
        const def = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VARIABLE_BY_KEY"].get(key);
        return {
            key,
            label: def.label,
            kind: def.kind,
            value: input.values[key] ?? '',
            required: !def.optional,
            fromLead: leadFilled.has(key) && !!input.values[key],
            hint: def.hint
        };
    });
    return {
        docType: input.docType,
        templateName: input.templateName,
        templateVersionNo: input.templateVersionNo,
        jurisdiction: input.jurisdiction,
        title: input.title,
        fields,
        sections: model.sections.map((s)=>({
                title: s.title,
                text: s.blocks.map(blockText).filter(Boolean).join('\n')
            })),
        missing: resolved.missing.map((key)=>{
            const d = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VARIABLE_BY_KEY"].get(key);
            return {
                key,
                label: d.label,
                kind: d.kind,
                hint: d.hint
            };
        }),
        invalid: Object.entries(resolved.invalid).map(([key, message])=>({
                key,
                label: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VARIABLE_BY_KEY"].get(key)?.label ?? key,
                message
            })),
        reviewPassages: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["placeholderCount"])(input.sections)
    };
}
function prefillFromLead(lead, contractorName) {
    const str = (v)=>typeof v === 'string' ? v.trim() : '';
    const name = [
        str(lead.first_name),
        str(lead.last_name)
    ].filter(Boolean).join(' ');
    const cityLine = [
        str(lead.city),
        [
            str(lead.state),
            str(lead.zip)
        ].filter(Boolean).join(' ')
    ].filter(Boolean).join(', ');
    const address = [
        str(lead.address),
        cityLine
    ].filter(Boolean).join(', ');
    const candidates = {
        customer_name: name,
        customer_email: str(lead.email),
        customer_phone: str(lead.phone),
        customer_address: address,
        project_address: address,
        project_description: str(lead.project_description),
        contractor_company: contractorName?.trim() ?? ''
    };
    const values = {};
    const filled = [];
    for (const k of __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LEAD_PREFILL_KEYS"])if (candidates[k]) {
        values[k] = candidates[k];
        filled.push(k);
    }
    return {
        values,
        filled
    };
}
function templateAllowedForState(t, state) {
    const s = (state ?? '').trim().toUpperCase();
    if (t.docType === 'contract') return t.jurisdictions.length > 0 && !!s && t.jurisdictions.includes(s);
    return t.jurisdictions.length === 0 || !!s && t.jurisdictions.includes(s);
}
}),
"[project]/lib/documents/service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

/* eslint-disable @typescript-eslint/no-explicit-any */ __turbopack_context__.s([
    "canIssueDocuments",
    ()=>canIssueDocuments,
    "contentHashOf",
    ()=>contentHashOf,
    "createDocument",
    ()=>createDocument,
    "editDocument",
    ()=>editDocument,
    "listApprovedTemplates",
    ()=>listApprovedTemplates,
    "listDocumentsForActor",
    ()=>listDocumentsForActor,
    "loadApprovedTemplate",
    ()=>loadApprovedTemplate,
    "loadDocumentForActor",
    ()=>loadDocumentForActor,
    "prepareDocument",
    ()=>prepareDocument,
    "previewOfDocument",
    ()=>previewOfDocument,
    "requestSignature",
    ()=>requestSignature,
    "resolveIssuer",
    ()=>resolveIssuer,
    "signatureBlockers",
    ()=>signatureBlockers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/assistant/access.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/storage.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/contracts/pdf.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$render$2d$model$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/render-model.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/contracts/validate.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contracts/variables.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/pdf-validate.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/rpc.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/access.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/signing/storage.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/documents/preview.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
const canIssueDocuments = (p)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageSigning"])(p) && (p.role === 'admin' || p.role === 'contractor' && !!p.contractor_id);
const EMPTY_CLIENT = {
    company: '',
    name: '',
    email: '',
    phone: '',
    address: ''
};
async function listApprovedTemplates(admin, filter = {}) {
    let q = admin.from('contract_templates').select('id, name, doc_type, jurisdictions, latest_version_no, assistant_approved_version, status').eq('status', 'published').neq('doc_type', 'agreement').not('assistant_approved_version', 'is', null).is('archived_at', null).limit(100);
    if (filter.docType) q = q.eq('doc_type', filter.docType);
    const { data } = await q;
    const rows = (data ?? []).filter((t)=>t.assistant_approved_version === t.latest_version_no);
    if (!rows.length) return [];
    const { data: versions } = await admin.from('contract_template_versions').select('id, template_id, version_no, snapshot, content_sha256').in('template_id', rows.map((r)=>r.id));
    const out = [];
    for (const t of rows){
        const v = (versions ?? []).find((x)=>x.template_id === t.id && x.version_no === t.assistant_approved_version);
        if (!v) continue;
        const sections = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].safeParse(v.snapshot?.sections);
        if (!sections.success) continue;
        const item = {
            id: t.id,
            name: t.name,
            docType: t.doc_type,
            jurisdictions: t.jurisdictions ?? [],
            versionId: v.id,
            versionNo: v.version_no,
            sha256: v.content_sha256,
            sections: sections.data
        };
        if (filter.state !== undefined && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["templateAllowedForState"])(item, filter.state)) continue;
        out.push(item);
    }
    return out;
}
async function loadApprovedTemplate(admin, templateId, state) {
    const all = await listApprovedTemplates(admin, {
        state
    });
    return all.find((t)=>t.id === templateId) ?? null;
}
async function resolveIssuer(actor, leadId, requested) {
    const tenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantOf"])(actor.profile);
    const { data: rows } = await actor.admin.from('lead_assignments').select('contractor_id').eq('lead_id', leadId);
    const ids = (rows ?? []).map((r)=>r.contractor_id);
    const { data: names } = ids.length ? await actor.admin.from('contractors').select('id, name').in('id', ids) : {
        data: []
    };
    const nameOf = new Map((names ?? []).map((c)=>[
            c.id,
            c.name ?? 'Contractor'
        ]));
    const assignments = ids.map((id)=>({
            id,
            name: nameOf.get(id) ?? 'Contractor'
        }));
    if (tenant) {
        const mine = assignments.find((a)=>a.id === tenant);
        return mine ? {
            ok: true,
            contractorId: mine.id,
            name: mine.name
        } : {
            ok: false,
            error: 'not_found'
        };
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor.profile)) return {
        ok: false,
        error: 'forbidden'
    };
    if (requested) {
        const pick = assignments.find((a)=>a.id === requested);
        return pick ? {
            ok: true,
            contractorId: pick.id,
            name: pick.name
        } : {
            ok: false,
            error: 'contractor_not_assigned_to_lead'
        };
    }
    if (assignments.length === 1) return {
        ok: true,
        contractorId: assignments[0].id,
        name: assignments[0].name
    };
    if (assignments.length === 0) return {
        ok: false,
        error: 'lead_not_assigned_to_a_contractor'
    };
    return {
        ok: false,
        error: 'choose_contractor',
        options: assignments
    };
}
async function prepareDocument(actor, input) {
    if (!canIssueDocuments(actor.profile)) return {
        status: 'error',
        error: 'not_allowed_for_your_role'
    };
    const lead = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadAccessibleLead"])(actor.db, actor.profile, input.leadId);
    if (!lead) return {
        status: 'error',
        error: 'not_found'
    };
    const state = typeof lead.state === 'string' ? lead.state : null;
    const tpl = await loadApprovedTemplate(actor.admin, input.templateId, state);
    if (!tpl) return {
        status: 'error',
        error: 'template_not_available_for_this_customer'
    };
    const issuer = await resolveIssuer(actor, input.leadId, input.contractorId);
    if (!issuer.ok) return {
        status: 'error',
        error: issuer.error,
        options: issuer.options
    };
    const prefill = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prefillFromLead"])(lead, issuer.name);
    const typed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeValues"])(tpl.sections, input.values);
    const values = {
        ...prefill.values,
        ...typed
    };
    const title = (input.title?.trim() || `${tpl.name} – ${values.customer_name ?? 'Customer'}`).slice(0, 200);
    const preview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["previewDocument"])({
        docType: tpl.docType,
        templateName: tpl.name,
        templateVersionNo: tpl.versionNo,
        jurisdiction: tpl.docType === 'contract' ? state?.toUpperCase() ?? null : null,
        title,
        sections: tpl.sections,
        values,
        leadFilled: prefill.filled.filter((k)=>!(k in typed))
    });
    if (preview.missing.length || preview.invalid.length) return {
        status: 'needs_info',
        preview
    };
    return {
        status: 'ready',
        preview,
        payload: {
            template_id: tpl.id,
            lead_id: input.leadId,
            contractor_id: issuer.contractorId,
            title,
            values,
            lead_filled: prefill.filled
        }
    };
}
const contentHashOf = (title, templateSha256, sections, values)=>{
    const resolved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolveVariables"])(sections, values, EMPTY_CLIENT, {
        today: '1970-01-01'
    });
    const sorted = Object.fromEntries(Object.entries(resolved.values).sort(([a], [b])=>a < b ? -1 : 1));
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])('sha256').update(JSON.stringify({
        t: title,
        tpl: templateSha256,
        v: sorted
    })).digest('hex');
};
async function addEvent(admin, documentId, type, actorId, metadata) {
    await admin.from('customer_document_events').insert({
        document_id: documentId,
        event_type: type,
        actor_user_id: actorId,
        via: 'assistant',
        metadata
    });
}
async function createDocument(actor, payload, actionId) {
    const re = await prepareDocument(actor, {
        leadId: payload.lead_id,
        templateId: payload.template_id,
        values: payload.values,
        title: payload.title,
        contractorId: payload.contractor_id
    });
    if (re.status !== 'ready') return {
        ok: false,
        error: re.status === 'needs_info' ? 'Some required information is still missing.' : 'This document can no longer be created from that template.'
    };
    // Jurisdiction was enforced by prepareDocument above; here we only need the approved snapshot itself.
    const tpl = (await listApprovedTemplates(actor.admin)).find((t)=>t.id === payload.template_id) ?? null;
    if (!tpl) return {
        ok: false,
        error: 'The template is no longer approved.'
    };
    const lead = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadAccessibleLead"])(actor.db, actor.profile, payload.lead_id);
    if (!lead) return {
        ok: false,
        error: 'You no longer have access to this lead.'
    };
    const customer = {
        name: re.payload.values.customer_name ?? '',
        email: re.payload.values.customer_email ?? '',
        phone: re.payload.values.customer_phone ?? ''
    };
    const sha = contentHashOf(re.payload.title, tpl.sha256, tpl.sections, re.payload.values);
    const { data: doc, error } = await actor.admin.from('customer_documents').insert({
        doc_type: tpl.docType,
        title: re.payload.title,
        lead_id: payload.lead_id,
        contractor_id: re.payload.contractor_id,
        template_id: tpl.id,
        template_version_id: tpl.versionId,
        template_name: tpl.name,
        template_version_no: tpl.versionNo,
        template_sha256: tpl.sha256,
        jurisdiction: re.preview.jurisdiction,
        sections: tpl.sections,
        variables: re.payload.values,
        customer,
        created_by: actor.profile.id,
        created_via: 'assistant'
    }).select('id').single();
    if (error || !doc) return {
        ok: false,
        error: 'The document could not be saved.'
    };
    const ver = await actor.admin.from('customer_document_versions').insert({
        document_id: doc.id,
        version_no: 1,
        title: re.payload.title,
        variables: re.payload.values,
        content_sha256: sha,
        reason: 'created',
        created_by: actor.profile.id,
        created_via: 'assistant'
    });
    if (ver.error) {
        await actor.admin.from('customer_documents').delete().eq('id', doc.id);
        return {
            ok: false,
            error: 'The document could not be saved.'
        };
    }
    await addEvent(actor.admin, doc.id, 'created', actor.profile.id, {
        version_no: 1,
        content_sha256: sha,
        template_version_no: tpl.versionNo,
        template_sha256: tpl.sha256,
        assistant_action_id: actionId,
        approved_by: actor.profile.id
    });
    return {
        ok: true,
        documentId: doc.id,
        title: re.payload.title,
        versionNo: 1
    };
}
async function loadDocumentForActor(actor, documentId) {
    if (!canIssueDocuments(actor.profile)) return null;
    const { data } = await actor.admin.from('customer_documents').select('*').eq('id', documentId).maybeSingle();
    if (!data) return null;
    const doc = data;
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor.profile) && doc.contractor_id !== actor.profile.contractor_id) return null;
    if (!await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadAccessibleLead"])(actor.db, actor.profile, doc.lead_id)) return null;
    return doc;
}
async function listDocumentsForActor(actor, leadId, limit = 10) {
    if (!canIssueDocuments(actor.profile)) return [];
    let q = actor.admin.from('customer_documents').select('id, doc_type, title, status, current_version_no, lead_id, created_at, sent_at').order('created_at', {
        ascending: false
    }).limit(limit);
    const tenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantOf"])(actor.profile);
    if (tenant) q = q.eq('contractor_id', tenant);
    if (leadId) {
        if (!await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadAccessibleLead"])(actor.db, actor.profile, leadId)) return [];
        q = q.eq('lead_id', leadId);
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isStaff"])(actor.profile) && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(actor.profile)) return [];
    const { data } = await q;
    return data ?? [];
}
function previewOfDocument(doc, valuesOverride) {
    const values = valuesOverride ?? doc.variables;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["previewDocument"])({
        docType: doc.doc_type,
        templateName: doc.template_name,
        templateVersionNo: doc.template_version_no,
        jurisdiction: doc.jurisdiction,
        title: doc.title,
        sections: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].parse(doc.sections),
        values
    });
}
async function editDocument(actor, documentId, rawValues, expectedVersionNo, actionId) {
    const doc = await loadDocumentForActor(actor, documentId);
    if (!doc) return {
        ok: false,
        error: 'Document not found or access denied.'
    };
    if (doc.status !== 'draft') return {
        ok: false,
        error: 'This document was already sent and can no longer be edited.'
    };
    if (doc.current_version_no !== expectedVersionNo) return {
        ok: false,
        error: 'This document changed since the edit was proposed. Ask again.'
    };
    const sections = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].parse(doc.sections);
    const values = {
        ...doc.variables,
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$preview$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeValues"])(sections, rawValues)
    };
    const preview = previewOfDocument(doc, values);
    if (preview.missing.length || preview.invalid.length) return {
        ok: false,
        error: 'Some required information is missing or invalid.'
    };
    const next = doc.current_version_no + 1;
    const sha = contentHashOf(doc.title, doc.template_sha256, sections, values);
    const customer = {
        name: values.customer_name ?? doc.customer.name,
        email: values.customer_email ?? doc.customer.email,
        phone: values.customer_phone ?? doc.customer.phone
    };
    const ver = await actor.admin.from('customer_document_versions').insert({
        document_id: doc.id,
        version_no: next,
        title: doc.title,
        variables: values,
        content_sha256: sha,
        reason: 'edited',
        created_by: actor.profile.id,
        created_via: 'assistant'
    });
    if (ver.error) return {
        ok: false,
        error: 'The change could not be saved.'
    };
    // Optimistic concurrency: only the request that still sees the old version number wins.
    const { data: upd } = await actor.admin.from('customer_documents').update({
        variables: values,
        customer,
        current_version_no: next
    }).eq('id', doc.id).eq('current_version_no', expectedVersionNo).eq('status', 'draft').select('id').maybeSingle();
    if (!upd) return {
        ok: false,
        error: 'This document changed while saving. Ask again.'
    };
    await addEvent(actor.admin, doc.id, 'edited', actor.profile.id, {
        version_no: next,
        content_sha256: sha,
        assistant_action_id: actionId,
        approved_by: actor.profile.id
    });
    return {
        ok: true,
        versionNo: next,
        title: doc.title
    };
}
function signatureBlockers(doc, actor) {
    const out = [];
    const sections = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].parse(doc.sections);
    if (doc.status !== 'draft') out.push({
        code: 'not_draft',
        message: 'This document was already sent.'
    });
    const customer = {
        role: 'client',
        label: 'Customer',
        name: doc.customer.name,
        email: doc.customer.email
    };
    const issuer = {
        role: 'homequote',
        label: 'Contractor',
        name: actor.full_name ?? actor.email ?? '',
        email: actor.email ?? ''
    };
    const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["validateContract"])({
        sections,
        variables: doc.variables,
        client: EMPTY_CLIENT,
        signers: [
            customer,
            issuer
        ],
        placeholdersAcknowledged: false,
        today: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["todayIso"])()
    });
    for (const e of report.errors){
        if (e.code === 'placeholders_unacknowledged') out.push({
            code: 'review_passages',
            message: 'The approved template still contains [REVIEW: …] passages. An admin must replace them with approved wording and re-approve the template.'
        });
        else out.push({
            code: e.code,
            message: e.message
        });
    }
    return out;
}
/** Renders the exact PDF the customer would sign (also used to check it can be produced). */ async function renderDocPdf(actorAdmin, doc, actor, contractorName) {
    const sections = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].parse(doc.sections);
    const today = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$variables$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["todayIso"])();
    const values = {
        ...doc.variables,
        contract_date: today
    };
    const customerSigner = {
        role: 'client',
        label: 'Customer',
        name: doc.customer.name,
        email: doc.customer.email
    };
    const issuerSigner = {
        role: 'homequote',
        label: 'Contractor',
        name: actor.full_name ?? actor.email ?? '',
        email: actor.email ?? ''
    };
    const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["validateContract"])({
        sections,
        variables: values,
        client: EMPTY_CLIENT,
        signers: [
            customerSigner,
            issuerSigner
        ],
        placeholdersAcknowledged: false,
        today
    });
    if (report.errors.length) throw new Error(report.errors[0].message);
    const model = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$render$2d$model$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildRenderModel"])(sections, report.resolved.values);
    const { data: c } = await actorAdmin.from('contractors').select('logo_path').eq('id', doc.contractor_id).maybeSingle();
    const logo = c?.logo_path ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAsset"])(c.logo_path) : null;
    const out = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["renderContractPdf"])({
        title: doc.title,
        contractNo: null,
        model,
        branding: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["brandingSchema"].parse({
            mode: logo ? 'client_only' : 'none',
            useCrmLogo: false
        }),
        clientName: doc.customer.name,
        hqName: contractorName,
        hqLogo: null,
        clientLogo: logo,
        signers: [
            customerSigner,
            issuerSigner
        ],
        exhibits: []
    });
    return {
        out,
        signers: [
            customerSigner,
            issuerSigner
        ]
    };
}
async function requestSignature(actor, documentId, approved, actionId) {
    const doc = await loadDocumentForActor(actor, documentId);
    if (!doc) return {
        ok: false,
        error: 'Document not found or access denied.'
    };
    if (doc.status !== 'draft' || doc.signing_version_id) return {
        ok: false,
        error: 'This document was already sent.'
    };
    if (doc.current_version_no !== approved.versionNo) return {
        ok: false,
        error: 'The document changed after you reviewed it. Ask the assistant to prepare the signature request again.'
    };
    const sections = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contracts$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sectionsSchema"].parse(doc.sections);
    if (contentHashOf(doc.title, doc.template_sha256, sections, doc.variables) !== approved.contentSha256) {
        return {
            ok: false,
            error: 'The document content no longer matches what you approved. Ask again.'
        };
    }
    const blockers = signatureBlockers(doc, actor.profile);
    if (blockers.length) return {
        ok: false,
        error: blockers[0].message
    };
    await addEvent(actor.admin, doc.id, 'signature_approved', actor.profile.id, {
        version_no: approved.versionNo,
        content_sha256: approved.contentSha256,
        assistant_action_id: actionId,
        approved_by: actor.profile.id
    });
    const { data: contractor } = await actor.admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle();
    const contractorName = contractor?.name ?? 'Contractor';
    const sigDocId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomUUID"])(), versionId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomUUID"])();
    const path = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ownerKey"])(doc.contractor_id)}/${sigDocId}/${versionId}.pdf`;
    const cleanup = async ()=>{
        try {
            await actor.admin.from('signing_versions').delete().eq('id', versionId);
        } catch  {}
        try {
            await actor.admin.from('signing_documents').update({
                current_version_id: null
            }).eq('id', sigDocId);
            await actor.admin.from('signing_documents').delete().eq('id', sigDocId);
        } catch  {}
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeObject"])(path).catch(()=>undefined);
    };
    let sentOut = false;
    try {
        const { out, signers } = await renderDocPdf(actor.admin, doc, actor.profile, contractorName);
        const inspected = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$pdf$2d$validate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inspectPdf"])(out.bytes);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadObject"])(path, out.bytes);
        const ins = await actor.admin.from('signing_documents').insert({
            id: sigDocId,
            contractor_id: doc.contractor_id,
            lead_id: doc.lead_id,
            title: doc.title,
            created_by: actor.profile.id
        });
        if (ins.error) throw new Error('signing document');
        const vIns = await actor.admin.from('signing_versions').insert({
            id: versionId,
            document_id: sigDocId,
            version_no: 1,
            original_path: path,
            original_sha256: inspected.sha256,
            original_size: inspected.size,
            page_count: inspected.pageCount,
            pages: inspected.pages,
            detection: {
                methods: [
                    'customer_document'
                ],
                notes: [
                    `Generated from customer document ${doc.id} v${approved.versionNo}.`
                ],
                processing: 'local'
            },
            created_by: actor.profile.id
        });
        if (vIns.error) throw new Error('signing version');
        await actor.admin.from('signing_documents').update({
            current_version_id: versionId
        }).eq('id', sigDocId);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$rpc$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["log"])(versionId, 'version_created', actor.profile, {
            version_no: 1,
            original_sha256: inspected.sha256,
            pages: inspected.pageCount,
            customer_document_id: doc.id
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveDraft"](actor.profile, versionId, {
            subject: `Please review and sign: ${doc.title}`,
            message: '',
            signing_order: 'parallel',
            expiry_days: 14,
            auto_remind_days: 3,
            auto_remind_max: 3,
            require_access_code: false,
            recipients: signers.map((x)=>({
                    name: x.name,
                    email: x.email
                })),
            fields: out.fields.map((f)=>({
                    recipient_index: f.signerIndex + 1,
                    type: f.type,
                    page: f.page,
                    x: f.x,
                    y: f.y,
                    w: f.w,
                    h: f.h,
                    required: true,
                    label: f.label,
                    group_key: null,
                    prefill_value: null,
                    date_format: f.type === 'date' ? 'MMM d, yyyy' : null,
                    source: 'manual',
                    confidence: null,
                    needs_review: false,
                    reviewed: true,
                    role_hint: null,
                    detection_note: null,
                    source_ref: null
                }))
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["markReviewed"](actor.profile, versionId);
        // Single winner: only one request can attach a signing version to this document.
        const { data: claimed } = await actor.admin.from('customer_documents').update({
            signing_document_id: sigDocId,
            signing_version_id: versionId
        }).eq('id', doc.id).eq('status', 'draft').is('signing_version_id', null).select('id').maybeSingle();
        if (!claimed) throw new Error('already sent');
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$signing$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendForSignature"](actor.profile, versionId);
        // From here the request may be out: never roll back signing rows, only record what happened.
        sentOut = true;
        await actor.admin.from('customer_documents').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_by: actor.profile.id
        }).eq('id', doc.id);
        await addEvent(actor.admin, doc.id, 'signature_requested', actor.profile.id, {
            version_no: approved.versionNo,
            content_sha256: approved.contentSha256,
            signing_version_id: versionId,
            document_sha256: inspected.sha256,
            recipients: signers.map((s)=>s.email),
            assistant_action_id: actionId,
            approved_by: actor.profile.id
        }).catch(()=>undefined);
        return {
            ok: true,
            recipients: signers.map((s)=>s.email)
        };
    } catch (e) {
        if (sentOut) return {
            ok: true,
            recipients: [
                doc.customer.email
            ]
        };
        await cleanup();
        await actor.admin.from('customer_documents').update({
            signing_document_id: null,
            signing_version_id: null
        }).eq('id', doc.id).eq('status', 'draft');
        await addEvent(actor.admin, doc.id, 'signature_failed', actor.profile.id, {
            assistant_action_id: actionId,
            version_no: approved.versionNo
        });
        return {
            ok: false,
            error: e instanceof Error && /already sent/.test(e.message) ? 'This document was already sent.' : 'The signature request could not be sent. Nothing was sent to the customer.'
        };
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/meta/setup/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SCOPES_MANAGE",
    ()=>SCOPES_MANAGE,
    "SCOPES_READ",
    ()=>SCOPES_READ,
    "metaAppConfig",
    ()=>metaAppConfig,
    "metaConnectReady",
    ()=>metaConnectReady,
    "missingSetup",
    ()=>missingSetup,
    "openToken",
    ()=>openToken,
    "sealToken",
    ()=>sealToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/site-url.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/emails/token-crypto.ts [app-rsc] (ecmascript)");
;
;
;
const env = (n)=>process.env[n]?.trim() || undefined;
const SCOPES_READ = [
    'ads_read'
];
const SCOPES_MANAGE = [
    'ads_read',
    'ads_management'
];
function metaAppConfig() {
    const appId = env('META_APP_ID');
    const appSecret = env('META_APP_SECRET');
    if (!appId || !appSecret) return null;
    return {
        appId,
        appSecret,
        redirectUri: env('META_OAUTH_REDIRECT_URI') ?? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$site$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publicSiteUrl"])()}/api/integrations/meta/connect/callback`
    };
}
function encryptionKey() {
    const raw = env('META_TOKEN_ENCRYPTION_KEY') ?? env('GMAIL_TOKEN_ENCRYPTION_KEY');
    if (!raw) return null;
    const key = Buffer.from(raw, 'base64');
    return key.length === 32 ? key : null;
}
const metaConnectReady = ()=>metaAppConfig() !== null && encryptionKey() !== null;
function sealToken(token) {
    const key = encryptionKey();
    if (!key) throw new Error('Meta token encryption key is not configured');
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["encryptToken"])(token, key);
}
function openToken(value) {
    const key = encryptionKey();
    if (!key) throw new Error('Meta token encryption key is not configured');
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$emails$2f$token$2d$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decryptToken"])(value, key);
}
function missingSetup() {
    const out = [];
    if (!env('META_APP_ID')) out.push('META_APP_ID');
    if (!env('META_APP_SECRET')) out.push('META_APP_SECRET');
    if (!encryptionKey()) out.push('META_TOKEN_ENCRYPTION_KEY (base64, 32 bytes)');
    return out;
}
}),
"[project]/lib/meta/setup/connections.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "canSetUpMeta",
    ()=>canSetUpMeta,
    "connectionOwner",
    ()=>connectionOwner,
    "disconnect",
    ()=>disconnect,
    "getConnection",
    ()=>getConnection,
    "logSetup",
    ()=>logSetup,
    "markNeedsReconnect",
    ()=>markNeedsReconnect,
    "saveConnection",
    ()=>saveConnection,
    "tokenFor",
    ()=>tokenFor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/permissions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$setup$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/meta/setup/config.ts [app-rsc] (ecmascript)");
;
;
;
function canSetUpMeta(p) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isHqnAdministrator"])(p) || p.is_active && p.role === 'contractor' && !!p.contractor_id && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isContractorOwner"])(p);
}
const connectionOwner = (p)=>p.role === 'contractor' ? p.contractor_id : null;
async function getConnection(admin, profile) {
    if (!canSetUpMeta(profile)) return null;
    const owner = connectionOwner(profile);
    let q = admin.from('meta_connections').select('id, contractor_id, meta_user_name, scopes, status, token_expires_at, connected_at').order('connected_at', {
        ascending: false
    }).limit(1);
    q = owner ? q.eq('contractor_id', owner) : q.is('contractor_id', null);
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const d = data;
    const expired = d.token_expires_at ? new Date(d.token_expires_at).getTime() <= Date.now() : false;
    return {
        id: d.id,
        contractorId: d.contractor_id,
        metaUserName: d.meta_user_name,
        scopes: d.scopes ?? [],
        status: expired && d.status === 'active' ? 'needs_reconnect' : d.status,
        expiresAt: d.token_expires_at,
        connectedAt: d.connected_at,
        canCreateDataset: (d.scopes ?? []).includes('ads_management')
    };
}
async function tokenFor(admin, profile, connectionId) {
    const conn = await getConnection(admin, profile);
    if (!conn || conn.id !== connectionId || conn.status !== 'active') return null;
    const { data } = await admin.from('meta_connection_secrets').select('token_enc').eq('connection_id', connectionId).maybeSingle();
    if (!data) return null;
    try {
        await admin.from('meta_connections').update({
            last_used_at: new Date().toISOString()
        }).eq('id', connectionId);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$setup$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["openToken"])(data.token_enc);
    } catch  {
        return null;
    }
}
async function saveConnection(admin, input) {
    const base = {
        contractor_id: input.contractorId,
        connected_by: input.connectedBy,
        meta_user_id: input.metaUserId,
        meta_user_name: input.metaUserName,
        scopes: input.scopes,
        token_expires_at: input.expiresAt?.toISOString() ?? null,
        status: 'active',
        last_error: null,
        connected_at: new Date().toISOString()
    };
    let q = admin.from('meta_connections').select('id').eq('meta_user_id', input.metaUserId);
    q = input.contractorId ? q.eq('contractor_id', input.contractorId) : q.is('contractor_id', null);
    const { data: existing } = await q.maybeSingle();
    let id = existing?.id;
    if (id) await admin.from('meta_connections').update(base).eq('id', id);
    else {
        const { data, error } = await admin.from('meta_connections').insert(base).select('id').single();
        if (error || !data) throw new Error('Could not save the Meta connection');
        id = data.id;
    }
    const stored = await admin.from('meta_connection_secrets').upsert({
        connection_id: id,
        token_enc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$setup$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sealToken"])(input.token),
        updated_at: new Date().toISOString()
    }, {
        onConflict: 'connection_id'
    });
    // Never report "connected" when the token was not actually saved.
    if (stored.error) throw new Error('Could not save the Meta connection');
    return id;
}
async function markNeedsReconnect(admin, connectionId, reason) {
    await admin.from('meta_connections').update({
        status: 'needs_reconnect',
        last_error: reason.slice(0, 300)
    }).eq('id', connectionId);
}
async function disconnect(admin, profile) {
    const conn = await getConnection(admin, profile);
    if (!conn) return false;
    await admin.from('meta_connection_secrets').delete().eq('connection_id', conn.id);
    await admin.from('meta_connections').update({
        status: 'revoked'
    }).eq('id', conn.id);
    return true;
}
async function logSetup(admin, e) {
    await admin.from('meta_setup_log').insert({
        actor_user_id: e.actor,
        contractor_id: e.contractorId,
        funnel_id: e.funnelId ?? null,
        connection_id: e.connectionId ?? null,
        action: e.action,
        via: 'assistant',
        metadata: e.metadata ?? {}
    });
}
}),
"[project]/app/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>AppLayout,
    "metadata",
    ()=>metadata,
    "viewport",
    ()=>viewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nav.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/app-sidebar.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/actions/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$mobile$2f$mobile$2d$shell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/mobile/mobile-shell.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$notification$2d$bell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/notification-bell.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$portal$2d$push$2d$boot$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/portal-push-boot.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/sign-out-form.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toaster.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$brand$2d$logo$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/brand-logo.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$install$2d$helper$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/install-helper.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$assistant$2d$root$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/assistant/assistant-root.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/assistant/access.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/documents/service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$setup$2f$connections$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/meta/setup/connections.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
const viewport = {
    maximumScale: 1,
    viewportFit: 'cover',
    themeColor: [
        {
            media: '(prefers-color-scheme: light)',
            color: '#ffffff'
        },
        {
            media: '(prefers-color-scheme: dark)',
            color: '#0A1B3D'
        }
    ]
};
const metadata = {
    appleWebApp: {
        capable: true,
        title: 'HomeQuote',
        statusBarStyle: 'default'
    },
    other: {
        'mobile-web-app-capable': 'yes'
    }
};
async function AppLayout({ children }) {
    const profile = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireProfile"])();
    const items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["navItemsForRole"])(profile.role);
    const { primary, secondary } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mobileNavForRole"])(profile.role);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-[100dvh] bg-[var(--app-bg)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$portal$2d$push$2d$boot$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PortalPushBoot"], {
                userId: profile.id
            }, void 0, false, {
                fileName: "[project]/app/app/layout.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Toaster"], {}, void 0, false, {
                fileName: "[project]/app/app/layout.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$access$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseAssistant"])(profile) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$assistant$2d$root$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AssistantRoot"], {
                userId: profile.id,
                capabilities: {
                    documents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$documents$2f$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canIssueDocuments"])(profile),
                    meta: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$meta$2f$setup$2f$connections$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canSetUpMeta"])(profile)
                }
            }, void 0, false, {
                fileName: "[project]/app/app/layout.tsx",
                lineNumber: 50,
                columnNumber: 36
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col border-r bg-card lg:flex",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex h-14 shrink-0 items-center border-b px-5",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                            href: "/app",
                            "aria-label": "HomeQuote Network home",
                            className: "block",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$brand$2d$logo$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BrandLogo"], {
                                priority: true,
                                className: "w-[184px]"
                            }, void 0, false, {
                                fileName: "[project]/app/app/layout.tsx",
                                lineNumber: 55,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/app/layout.tsx",
                            lineNumber: 54,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/app/layout.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AppSidebar"], {
                        items: items
                    }, void 0, false, {
                        fileName: "[project]/app/app/layout.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/app/layout.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-w-0 flex-1 flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "hidden h-14 items-center justify-between gap-3 border-b bg-card px-8 lg:flex",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLE_LABELS"][profile.role]
                            }, void 0, false, {
                                fileName: "[project]/app/app/layout.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$notification$2d$bell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NotificationBell"], {}, void 0, false, {
                                        fileName: "[project]/app/app/layout.tsx",
                                        lineNumber: 68,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-medium",
                                        children: profile.full_name || profile.email
                                    }, void 0, false, {
                                        fileName: "[project]/app/app/layout.tsx",
                                        lineNumber: 69,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SignOutForm"], {
                                        action: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signOutAction"],
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "submit",
                                            variant: "outline",
                                            size: "sm",
                                            children: "Sign out"
                                        }, void 0, false, {
                                            fileName: "[project]/app/app/layout.tsx",
                                            lineNumber: 73,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/app/layout.tsx",
                                        lineNumber: 72,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/app/layout.tsx",
                                lineNumber: 67,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/app/layout.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$mobile$2f$mobile$2d$shell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MobileChrome"], {
                        primary: primary,
                        secondary: secondary,
                        role: profile.role,
                        roleLabel: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLE_LABELS"][profile.role],
                        displayName: profile.full_name || profile.email || 'Account',
                        signOutAction: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signOutAction"],
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$install$2d$helper$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InstallHelper"], {}, void 0, false, {
                                fileName: "[project]/app/app/layout.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            children
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/app/layout.tsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/app/layout.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/app/layout.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6aa8a297._.js.map