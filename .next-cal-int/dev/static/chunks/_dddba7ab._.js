(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/nav-link.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NavLink",
    ()=>NavLink
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
;
function NavLink({ item, ...props }) {
    if (item.newTab) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: item.href,
        target: "_blank",
        rel: "noopener",
        ...props
    }, void 0, false, {
        fileName: "[project]/components/nav-link.tsx",
        lineNumber: 7,
        columnNumber: 27
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: item.href,
        ...props
    }, void 0, false, {
        fileName: "[project]/components/nav-link.tsx",
        lineNumber: 8,
        columnNumber: 10
    }, this);
}
_c = NavLink;
var _c;
__turbopack_context__.k.register(_c, "NavLink");
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
"[project]/lib/nav.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
const NAV_ITEMS = BASE_NAV_ITEMS.map(_c = (i)=>({
        ...i,
        group: GROUP_BY_LABEL[i.label]
    }));
_c1 = NAV_ITEMS;
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
].map(_c2 = (i)=>({
        ...i,
        group: GROUP_BY_LABEL[i.label]
    }));
_c3 = CALL_WORKSPACE_EXTRAS;
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
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "NAV_ITEMS$BASE_NAV_ITEMS.map");
__turbopack_context__.k.register(_c1, "NAV_ITEMS");
__turbopack_context__.k.register(_c2, "CALL_WORKSPACE_EXTRAS$([\n  {\n    label: 'Call Logs',\n    href: '/app/calls/logs',\n    icon: 'ClipboardList',\n    roles: ['admin', 'caller', 'setter'],\n  },\n  {\n    label: 'Call Appointments',\n    href: '/app/calls/appointments',\n    icon: 'CalendarCheck',\n    roles: ['admin', 'caller', 'setter'],\n  },\n  {\n    label: 'Call Emails',\n    href: '/app/calls/emails',\n    icon: 'Mail',\n    roles: ['admin', 'caller', 'setter'],\n  },\n] as NavItem[]).map");
__turbopack_context__.k.register(_c3, "CALL_WORKSPACE_EXTRAS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/nav-icons.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NAV_ICONS",
    ()=>NAV_ICONS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/inbox.js [app-client] (ecmascript) <export default as Inbox>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-days.js [app-client] (ecmascript) <export default as CalendarDays>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-check.js [app-client] (ecmascript) <export default as CalendarCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-clock.js [app-client] (ecmascript) <export default as CalendarClock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-list.js [app-client] (ecmascript) <export default as ClipboardList>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/receipt.js [app-client] (ecmascript) <export default as Receipt>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scroll$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ScrollText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/scroll-text.js [app-client] (ecmascript) <export default as ScrollText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$megaphone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Megaphone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/megaphone.js [app-client] (ecmascript) <export default as Megaphone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plug$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plug$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plug.js [app-client] (ecmascript) <export default as Plug>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$to$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownToLine$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down-to-line.js [app-client] (ecmascript) <export default as ArrowDownToLine>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sprout$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sprout$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sprout.js [app-client] (ecmascript) <export default as Sprout>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$handshake$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Handshake$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/handshake.js [app-client] (ecmascript) <export default as Handshake>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$workflow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Workflow$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/workflow.js [app-client] (ecmascript) <export default as Workflow>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bot$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bot$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bot.js [app-client] (ecmascript) <export default as Bot>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSignature$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-pen-line.js [app-client] (ecmascript) <export default as FileSignature>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileStack$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-stack.js [app-client] (ecmascript) <export default as FileStack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clapperboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clapperboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clapperboard.js [app-client] (ecmascript) <export default as Clapperboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.js [app-client] (ecmascript) <export default as KeyRound>");
;
const NAV_ICONS = {
    Bot: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bot$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bot$3e$__["Bot"],
    Sparkles: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"],
    Clapperboard: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clapperboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clapperboard$3e$__["Clapperboard"],
    KeyRound: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"],
    MessageSquare: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"],
    FileSignature: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSignature$3e$__["FileSignature"],
    FileStack: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileStack$3e$__["FileStack"],
    LayoutDashboard: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"],
    Users: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
    Inbox: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__["Inbox"],
    Building2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
    CalendarDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__["CalendarDays"],
    CalendarCheck: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__["CalendarCheck"],
    CalendarClock: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__["CalendarClock"],
    ClipboardList: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__["ClipboardList"],
    Receipt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__["Receipt"],
    DollarSign: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"],
    BarChart3: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
    ShieldCheck: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
    ScrollText: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scroll$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ScrollText$3e$__["ScrollText"],
    Megaphone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$megaphone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Megaphone$3e$__["Megaphone"],
    Plug: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plug$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plug$3e$__["Plug"],
    ArrowDownToLine: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$to$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownToLine$3e$__["ArrowDownToLine"],
    Phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"],
    Send: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"],
    Sprout: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sprout$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sprout$3e$__["Sprout"],
    Handshake: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$handshake$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Handshake$3e$__["Handshake"],
    Workflow: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$workflow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Workflow$3e$__["Workflow"],
    Mail: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/app-sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppSidebar",
    ()=>AppSidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/nav-link.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nav.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$icons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/nav-icons.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function isActive(pathname, href) {
    return href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(href + '/');
}
function AppSidebar({ items }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const sections = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupNavItems"])(items);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        "aria-label": "Main",
        className: "flex-1 space-y-5 overflow-y-auto px-3 py-4",
        children: sections.map(({ group, items: groupItems })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    group && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                        children: group
                    }, void 0, false, {
                        fileName: "[project]/components/app-sidebar.tsx",
                        lineNumber: 23,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "space-y-0.5",
                        children: groupItems.map((item)=>{
                            const Icon = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$icons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NAV_ICONS"][item.icon] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"];
                            const active = isActive(pathname, item.href);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NavLink"], {
                                    item: item,
                                    "aria-current": active ? 'page' : undefined,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('relative flex min-h-9 items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors', active ? 'bg-accent font-semibold text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary' : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                            className: "size-4 shrink-0",
                                            "aria-hidden": "true"
                                        }, void 0, false, {
                                            fileName: "[project]/components/app-sidebar.tsx",
                                            lineNumber: 43,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "min-w-0",
                                            children: item.label
                                        }, void 0, false, {
                                            fileName: "[project]/components/app-sidebar.tsx",
                                            lineNumber: 44,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/app-sidebar.tsx",
                                    lineNumber: 33,
                                    columnNumber: 19
                                }, this)
                            }, `${item.label}-${item.href}`, false, {
                                fileName: "[project]/components/app-sidebar.tsx",
                                lineNumber: 32,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/app-sidebar.tsx",
                        lineNumber: 27,
                        columnNumber: 11
                    }, this)
                ]
            }, group ?? 'top', true, {
                fileName: "[project]/components/app-sidebar.tsx",
                lineNumber: 21,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/app-sidebar.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_s(AppSidebar, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = AppSidebar;
var _c;
__turbopack_context__.k.register(_c, "AppSidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/brand-logo.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BrandLogo",
    ()=>BrandLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
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
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: art[tone],
        width: art.width,
        height: art.height,
        alt: "HomeQuote",
        loading: priority ? 'eager' : 'lazy',
        decoding: "async",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-auto', className)
    }, void 0, false, {
        fileName: "[project]/components/brand-logo.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this));
}
_c = BrandLogo;
var _c;
__turbopack_context__.k.register(_c, "BrandLogo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/bottom-sheet.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BottomSheet",
    ()=>BottomSheet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-dialog/dist/index.mjs [app-client] (ecmascript) <export * as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
function BottomSheet({ open, onOpenChange, trigger, title, description, children, footer, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Root, {
        open: open,
        onOpenChange: onOpenChange,
        children: [
            trigger ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Trigger, {
                asChild: true,
                children: trigger
            }, void 0, false, {
                fileName: "[project]/components/ui/bottom-sheet.tsx",
                lineNumber: 40,
                columnNumber: 18
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Portal, {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Overlay, {
                        className: "fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none"
                    }, void 0, false, {
                        fileName: "[project]/components/ui/bottom-sheet.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Content, {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('fixed inset-x-0 bottom-0 z-[60] flex max-h-[88dvh] flex-col rounded-t-2xl border-t bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none', className),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between gap-3 px-4 pb-2 pt-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Title, {
                                                className: "text-base font-semibold tracking-tight",
                                                children: title
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                                lineNumber: 52,
                                                columnNumber: 15
                                            }, this),
                                            description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Description, {
                                                className: "mt-0.5 text-sm text-muted-foreground",
                                                children: description
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                                lineNumber: 56,
                                                columnNumber: 17
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Description, {
                                                className: "sr-only",
                                                children: title
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                                lineNumber: 60,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ui/bottom-sheet.tsx",
                                        lineNumber: 51,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Close, {
                                        className: "-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                        "aria-label": "Close",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                            className: "size-5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/bottom-sheet.tsx",
                                            lineNumber: 67,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/bottom-sheet.tsx",
                                        lineNumber: 63,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                lineNumber: 50,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4",
                                children: children
                            }, void 0, false, {
                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this),
                            footer ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "shrink-0 border-t bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3",
                                children: footer
                            }, void 0, false, {
                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                lineNumber: 72,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pb-safe shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/bottom-sheet.tsx",
                                lineNumber: 76,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui/bottom-sheet.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui/bottom-sheet.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/bottom-sheet.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_c = BottomSheet;
var _c;
__turbopack_context__.k.register(_c, "BottomSheet");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/badge.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** App-icon badge (Badging API). Never throws; silently no-ops where unsupported. */ __turbopack_context__.s([
    "setAppBadge",
    ()=>setAppBadge
]);
function setAppBadge(count) {
    try {
        const nav = navigator;
        if (count > 0 && nav.setAppBadge) void nav.setAppBadge(count).catch(()=>{});
        else if (nav.clearAppBadge) void nav.clearAppBadge().catch(()=>{});
    } catch  {
    /* unsupported */ }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications/use-notifications.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "markAllRead",
    ()=>markAllRead,
    "markRead",
    ()=>markRead,
    "refreshNotifications",
    ()=>refreshNotifications,
    "useNotifications",
    ()=>useNotifications
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$badge$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/badge.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
let state = {
    items: [],
    unread: 0,
    loaded: false
};
const listeners = new Set();
let timer = null;
let inflight = false;
function emit(next) {
    state = next;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$badge$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setAppBadge"])(next.unread);
    listeners.forEach((l)=>l());
}
async function refreshNotifications() {
    if (inflight || typeof document === 'undefined') return;
    inflight = true;
    try {
        const res = await fetch('/api/notifications?limit=20', {
            cache: 'no-store'
        });
        if (!res.ok) return;
        const json = await res.json();
        emit({
            items: json.items,
            unread: json.unread,
            loaded: true
        });
    } catch  {
    /* offline: keep what we have */ } finally{
        inflight = false;
    }
}
async function markRead(id) {
    const target = state.items.find((n)=>n.id === id);
    if (!target || target.read_at) return;
    emit({
        ...state,
        items: state.items.map((n)=>n.id === id ? {
                ...n,
                read_at: new Date().toISOString()
            } : n),
        unread: Math.max(0, state.unread - 1)
    });
    fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id
        })
    }).catch(()=>{});
}
async function markAllRead() {
    const now = new Date().toISOString();
    emit({
        ...state,
        items: state.items.map((n)=>({
                ...n,
                read_at: n.read_at ?? now
            })),
        unread: 0
    });
    fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            all: true
        })
    }).catch(()=>{});
}
const onVisible = ()=>{
    if (document.visibilityState === 'visible') void refreshNotifications();
};
const onMessage = (e)=>{
    if (e.data?.type === 'hq-push') void refreshNotifications();
};
function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
        void refreshNotifications();
        timer = setInterval(()=>{
            if (document.visibilityState === 'visible') void refreshNotifications();
        }, 60_000);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        navigator.serviceWorker?.addEventListener('message', onMessage);
    }
    return ()=>{
        listeners.delete(listener);
        if (listeners.size === 0) {
            if (timer) clearInterval(timer);
            timer = null;
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
            navigator.serviceWorker?.removeEventListener('message', onMessage);
        }
    };
}
const EMPTY = {
    items: [],
    unread: 0,
    loaded: false
};
function useNotifications() {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, {
        "useNotifications.useSyncExternalStore": ()=>state
    }["useNotifications.useSyncExternalStore"], {
        "useNotifications.useSyncExternalStore": ()=>EMPTY
    }["useNotifications.useSyncExternalStore"]);
}
_s(useNotifications, "FpwL93IKMLJZuQQXefVtWynbBPQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SW_URL",
    ()=>SW_URL,
    "detachThisDevice",
    ()=>detachThisDevice,
    "detectEnv",
    ()=>detectEnv,
    "disablePush",
    ()=>disablePush,
    "enablePush",
    ()=>enablePush,
    "readPushState",
    ()=>readPushState,
    "registerServiceWorker",
    ()=>registerServiceWorker,
    "resyncPush",
    ()=>resyncPush,
    "vapidPublicKey",
    ()=>vapidPublicKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
const SW_URL = '/sw.js';
const USER_FLAG = 'hq_push_user';
function detectEnv() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
    const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    return {
        isIOS,
        standalone,
        canPush
    };
}
function vapidPublicKey() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}
function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for(let i = 0; i < raw.length; i++)out[i] = raw.charCodeAt(i);
    return out;
}
async function registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
        return await navigator.serviceWorker.register(SW_URL, {
            scope: '/'
        });
    } catch (e) {
        console.warn('[push] service worker registration failed', e);
        return null;
    }
}
async function currentSubscription() {
    try {
        const reg = await navigator.serviceWorker.getRegistration(SW_URL) ?? await navigator.serviceWorker.ready;
        return await reg.pushManager.getSubscription();
    } catch  {
        return null;
    }
}
async function readPushState() {
    const env = detectEnv();
    if (!env.canPush) return env.isIOS && !env.standalone ? 'ios-needs-install' : 'unsupported';
    if (!vapidPublicKey()) return 'not-configured';
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission === 'default') return 'prompt';
    return await currentSubscription() ? 'active' : 'missing';
}
function deviceName() {
    const ua = navigator.userAgent;
    const env = detectEnv();
    const platform = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) || /CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return `${platform} · ${env.standalone ? 'Home Screen app' : browser}`;
}
async function postSubscription(sub) {
    const json = sub.toJSON();
    const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            deviceName: deviceName()
        })
    });
    return res.ok;
}
async function enablePush(userId) {
    const env = detectEnv();
    if (!env.canPush) return {
        ok: false,
        reason: 'unsupported',
        message: 'This browser does not support push notifications.'
    };
    try {
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission !== 'granted') {
            return {
                ok: false,
                reason: 'denied',
                message: 'Notifications are blocked. Allow them for HomeQuote in your device settings.'
            };
        }
        const reg = await registerServiceWorker() ?? await navigator.serviceWorker.ready;
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey())
            });
        }
        if (!await postSubscription(sub)) {
            return {
                ok: false,
                reason: 'error',
                message: 'Could not save this device. Please try again.'
            };
        }
        try {
            localStorage.setItem(USER_FLAG, userId);
        } catch  {
        /* private mode */ }
        return {
            ok: true
        };
    } catch (e) {
        return {
            ok: false,
            reason: 'error',
            message: e instanceof Error ? e.message : 'Could not turn on notifications.'
        };
    }
}
async function disablePush() {
    const sub = await currentSubscription();
    if (sub) {
        await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: sub.endpoint
            })
        }).catch(()=>{});
        await sub.unsubscribe().catch(()=>{});
    }
    try {
        localStorage.removeItem(USER_FLAG);
    } catch  {
    /* ignore */ }
}
async function detachThisDevice() {
    try {
        if (!detectEnv().canPush) return;
        const sub = await currentSubscription();
        if (!sub) return;
        await Promise.race([
            fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: sub.endpoint
                })
            }),
            new Promise((resolve)=>setTimeout(resolve, 2500))
        ]);
    } catch  {
    /* never block sign-out */ }
}
async function resyncPush(userId) {
    try {
        const env = detectEnv();
        if (!env.canPush || !vapidPublicKey() || Notification.permission !== 'granted') return;
        let flagged = false;
        try {
            flagged = localStorage.getItem(USER_FLAG) === userId;
        } catch  {
        /* ignore */ }
        if (!flagged) return;
        const sub = await currentSubscription();
        if (sub) await postSubscription(sub);
    } catch  {
    /* best effort */ }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications/sign-out-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SignOutForm",
    ()=>SignOutForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/client.ts [app-client] (ecmascript)");
'use client';
;
;
function SignOutForm({ action, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: action,
        className: className,
        onSubmit: async (e)=>{
            const form = e.currentTarget;
            if (form.dataset.detached) return;
            e.preventDefault();
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["detachThisDevice"])();
            form.dataset.detached = '1';
            form.requestSubmit();
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/components/notifications/sign-out-form.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = SignOutForm;
var _c;
__turbopack_context__.k.register(_c, "SignOutForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/mobile/mobile-shell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MobileChrome",
    ()=>MobileChrome,
    "isFocusedRoute",
    ()=>isFocusedRoute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-client] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/ellipsis.js [app-client] (ecmascript) <export default as MoreHorizontal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nav.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$brand$2d$logo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/brand-logo.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$icons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/nav-icons.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/nav-link.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$bottom$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/bottom-sheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/use-notifications.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/sign-out-form.tsx [app-client] (ecmascript)");
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
/*
 * Phone chrome for the CRM: a compact top bar, a fixed bottom nav, the "More"
 * sheet and the <main> that reserves room for them. Everything here is
 * lg:hidden except <main> itself, so the desktop sidebar layout is untouched.
 * The nav lists come from lib/nav.ts (mobileNavForRole), so they inherit the
 * same per-role visibility as the sidebar.
 */ const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
function isFocusedRoute(pathname) {
    return new RegExp(`^/app/calls/${UUID}$`, 'i').test(pathname) || /^\/app\/leads\/(?!new$)[^/]+$/.test(pathname);
}
const TITLE_RULES = [
    [
        new RegExp(`^/app/calls/${UUID}$`, 'i'),
        'Prospect'
    ],
    [
        /^\/app\/calls\/new$/,
        'Add prospect'
    ],
    [
        /^\/app\/calls\/logs/,
        'Call logs'
    ],
    [
        /^\/app\/calls\/appointments/,
        'Call appointments'
    ],
    [
        /^\/app\/calls\/emails/,
        'Call emails'
    ],
    [
        /^\/app\/leads\/new$/,
        'New lead'
    ],
    [
        /^\/app\/leads\/[^/]+\/edit$/,
        'Edit lead'
    ],
    [
        /^\/app\/leads\/[^/]+$/,
        'Lead'
    ],
    [
        /^\/app\/contractors\/new$/,
        'New contractor'
    ],
    [
        /^\/app\/contractors\/[^/]+$/,
        'Contractor'
    ],
    [
        /^\/app\/team\/new$/,
        'New team member'
    ],
    [
        /^\/app\/team\/[^/]+$/,
        'Team member'
    ],
    [
        /^\/app\/funnels\/new$/,
        'New funnel'
    ],
    [
        /^\/app\/funnels\/[^/]+\/builder$/,
        'Funnel builder'
    ],
    [
        /^\/app\/funnels\/[^/]+\/analytics$/,
        'Funnel analytics'
    ],
    [
        /^\/app\/funnels\/[^/]+$/,
        'Funnel'
    ],
    [
        /^\/app\/workflows\/new$/,
        'New automation'
    ],
    [
        /^\/app\/workflows\/runs\/[^/]+$/,
        'Run'
    ],
    [
        /^\/app\/workflows\/runs$/,
        'Run history'
    ],
    [
        /^\/app\/workflows\/[^/]+\/runs$/,
        'Runs'
    ],
    [
        /^\/app\/workflows\/[^/]+$/,
        'Automation'
    ],
    [
        /^\/app\/email-templates\/new$/,
        'New template'
    ],
    [
        /^\/app\/email-templates\/[^/]+$/,
        'Template'
    ],
    [
        /^\/app\/growth\/[^/]+$/,
        'Growth tool'
    ],
    [
        /^\/app\/pay\/[^/]+$/,
        'Payment'
    ],
    [
        /^\/app\/integrations\/meta$/,
        'Meta lead ads'
    ],
    [
        /^\/app\/settings\/notifications$/,
        'Notifications'
    ],
    [
        /^\/app\/notifications$/,
        'Notifications'
    ],
    [
        /^\/app\/settings\/notification-routing$/,
        'Notification routing'
    ]
];
/** Where the back arrow goes: one level up, with /app/calls as the calls root. */ function parentOf(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 2) return '/app';
    return '/' + parts.slice(0, parts.length - 1).join('/');
}
function bestMatch(pathname, items) {
    let best;
    for (const item of items){
        const hit = item.href === '/app' ? pathname === '/app' : pathname === item.href || pathname.startsWith(item.href + '/');
        if (hit && (!best || item.href.length > best.href.length)) best = item;
    }
    return best;
}
function titleFor(pathname, all) {
    for (const [re, title] of TITLE_RULES)if (re.test(pathname)) return title;
    const match = bestMatch(pathname, all);
    return match?.title ?? match?.label ?? 'HomeQuote';
}
/** The one contextual "+" per list page, gated to the roles that can use it. */ function contextualAction(pathname, role) {
    if (pathname === '/app/leads' && (role === 'admin' || role === 'setter')) return {
        href: '/app/leads/new',
        label: 'New lead'
    };
    if (pathname === '/app/calls' && role === 'admin') return {
        href: '/app/calls/new',
        label: 'Add prospect'
    };
    if (pathname === '/app/contractors' && role === 'admin') return {
        href: '/app/contractors/new',
        label: 'New contractor'
    };
    return null;
}
function initials(name) {
    const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}
function MobileChrome({ primary, secondary, role, roleLabel, displayName, signOutAction, children }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [moreOpen, setMoreOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const all = [
        ...primary,
        ...secondary
    ];
    const focused = isFocusedRoute(pathname);
    const active = bestMatch(pathname, all);
    const moreActive = !!active && secondary.some((s)=>s.href === active.href && s.label === active.label);
    const { unread } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"])();
    const alertsActive = pathname === '/app/notifications';
    const isDestination = alertsActive || all.some((i)=>i.href === pathname);
    const showBack = !isDestination && pathname !== '/app';
    const action = contextualAction(pathname, role);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "pt-safe px-safe sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-14 items-center gap-2",
                    children: [
                        showBack ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: parentOf(pathname),
                            "aria-label": "Back",
                            className: "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground active:bg-accent",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                                className: "size-6"
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 154,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 149,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/app",
                            "aria-label": "HomeQuote home",
                            className: "flex h-11 min-w-11 shrink-0 items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$brand$2d$logo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BrandLogo"], {
                                variant: "mark",
                                priority: true,
                                className: "w-[40px]"
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 162,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 157,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight",
                            children: titleFor(pathname, all)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 165,
                            columnNumber: 11
                        }, this),
                        action ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: action.href,
                            "aria-label": action.label,
                            className: "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground active:opacity-80",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                className: "size-5"
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 174,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 169,
                            columnNumber: 13
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            "aria-label": "Account and menu",
                            onClick: ()=>setMoreOpen(true),
                            className: "flex size-11 shrink-0 items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold",
                                children: initials(displayName)
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 183,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 177,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/mobile/mobile-shell.tsx",
                    lineNumber: 147,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/mobile/mobile-shell.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(// overflow-y-auto only from lg: a scroll container here would stop sticky
                // children (tabs, filter bars, save bars) sticking to the viewport.
                'min-w-0 flex-1 p-3 sm:px-6 sm:py-5 lg:overflow-y-auto lg:px-8 lg:py-6', focused ? 'pb-mbar' : 'pb-mnav', 'lg:pb-8'),
                children: children
            }, void 0, false, {
                fileName: "[project]/components/mobile/mobile-shell.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            focused ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                "aria-label": "Primary",
                className: "px-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                    className: "mx-auto flex h-[var(--mnav-h)] max-w-xl items-stretch",
                    children: [
                        primary.map((item)=>{
                            const Icon = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$icons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NAV_ICONS"][item.icon] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"];
                            const isActive = active?.href === item.href && active?.label === item.label;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex-1",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NavLink"], {
                                    item: item,
                                    "aria-current": isActive ? 'page' : undefined,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent/60', isActive ? 'text-primary' : 'text-muted-foreground'),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('size-6', isActive && 'stroke-[2.4]'),
                                            "aria-hidden": "true"
                                        }, void 0, false, {
                                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                                            lineNumber: 221,
                                            columnNumber: 21
                                        }, this),
                                        item.label
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/mobile/mobile-shell.tsx",
                                    lineNumber: 213,
                                    columnNumber: 19
                                }, this)
                            }, item.href, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 212,
                                columnNumber: 17
                            }, this);
                        }),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/app/notifications",
                                "aria-current": alertsActive ? 'page' : undefined,
                                "aria-label": unread > 0 ? `Alerts, ${unread} unread` : 'Alerts',
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent/60', alertsActive ? 'text-foreground' : 'text-muted-foreground'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "relative",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('size-6', alertsActive && 'stroke-[2.4]'),
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                                lineNumber: 238,
                                                columnNumber: 19
                                            }, this),
                                            unread > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "absolute -right-2 -top-1 min-w-[16px] rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-4 text-white",
                                                children: unread > 99 ? '99+' : unread
                                            }, void 0, false, {
                                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                                lineNumber: 240,
                                                columnNumber: 21
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 237,
                                        columnNumber: 17
                                    }, this),
                                    "Alerts"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 228,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 227,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setMoreOpen(true),
                                "aria-haspopup": "dialog",
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent/60', moreActive ? 'text-foreground' : 'text-muted-foreground'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__["MoreHorizontal"], {
                                        className: "size-6",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 258,
                                        columnNumber: 17
                                    }, this),
                                    "More"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 249,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/mobile/mobile-shell.tsx",
                            lineNumber: 248,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/mobile/mobile-shell.tsx",
                    lineNumber: 207,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/mobile/mobile-shell.tsx",
                lineNumber: 203,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$bottom$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BottomSheet"], {
                open: moreOpen,
                onOpenChange: setMoreOpen,
                title: "Menu",
                footer: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$sign$2d$out$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SignOutForm"], {
                    action: signOutAction,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        className: "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium text-destructive active:bg-accent",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 276,
                                columnNumber: 15
                            }, void 0),
                            "Sign out"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                        lineNumber: 272,
                        columnNumber: 13
                    }, void 0)
                }, void 0, false, {
                    fileName: "[project]/components/mobile/mobile-shell.tsx",
                    lineNumber: 271,
                    columnNumber: 11
                }, void 0),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex items-center gap-3 rounded-xl bg-muted/50 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold",
                                children: initials(displayName)
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 283,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-sm font-semibold",
                                        children: displayName
                                    }, void 0, false, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 287,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: roleLabel
                                    }, void 0, false, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 288,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 286,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                        lineNumber: 282,
                        columnNumber: 9
                    }, this),
                    secondary.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        "aria-label": "More",
                        className: "space-y-4",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupNavItems"])(secondary).map(({ group, items })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    group ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                                        children: group
                                    }, void 0, false, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 296,
                                        columnNumber: 19
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-2",
                                        children: items.map((item)=>{
                                            const Icon = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$icons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NAV_ICONS"][item.icon] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"];
                                            const isActive = active?.href === item.href && active?.label === item.label;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$nav$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NavLink"], {
                                                item: item,
                                                onClick: ()=>setMoreOpen(false),
                                                "aria-current": isActive ? 'page' : undefined,
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm active:bg-accent', isActive ? 'border-primary bg-accent font-semibold text-primary' : 'bg-background font-medium'),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                        className: "size-5 shrink-0 text-muted-foreground",
                                                        "aria-hidden": "true"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                                        lineNumber: 315,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "min-w-0 leading-tight",
                                                        children: item.label
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                                        lineNumber: 316,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, `${item.href}-${item.label}`, true, {
                                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                                lineNumber: 305,
                                                columnNumber: 23
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                                        lineNumber: 300,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, group ?? 'top', true, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 294,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                        lineNumber: 292,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/app/settings/notifications",
                        onClick: ()=>setMoreOpen(false),
                        className: "mt-4 flex min-h-12 items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm font-medium active:bg-accent",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                className: "size-5 shrink-0 text-muted-foreground",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/mobile/mobile-shell.tsx",
                                lineNumber: 330,
                                columnNumber: 11
                            }, this),
                            "Notification settings"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/mobile/mobile-shell.tsx",
                        lineNumber: 325,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/mobile/mobile-shell.tsx",
                lineNumber: 266,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(MobileChrome, "xd8flRRy/m8ChDLDidCySy8ZvM4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"]
    ];
});
_c = MobileChrome;
var _c;
__turbopack_context__.k.register(_c, "MobileChrome");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/haptics.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Very light haptic feedback for meaningful successes only (booked, assigned,
 * completed) — never on plain taps. Feature-detected: iOS Safari and desktops
 * simply ignore it, and reduced-motion users never get it.
 */ __turbopack_context__.s([
    "haptic",
    ()=>haptic
]);
function haptic(kind = 'success') {
    try {
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        // Browsers refuse vibration before the first tap; don't ask (avoids a console error).
        const ua = navigator.userActivation;
        if (ua && !ua.hasBeenActive) return;
        navigator.vibrate(kind === 'success' ? 12 : [
            18,
            40,
            18
        ]);
    } catch  {
    /* unsupported */ }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toaster.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster,
    "toast",
    ()=>toast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$haptics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/haptics.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
let items = [];
let nextId = 1;
const listeners = new Set();
const emit = ()=>listeners.forEach((l)=>l());
function toast(message, tone = 'success') {
    const id = nextId++;
    items = [
        ...items.slice(-2),
        {
            id,
            message,
            tone
        }
    ];
    emit();
    if (tone === 'success') (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$haptics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["haptic"])('success');
    setTimeout(()=>{
        items = items.filter((t)=>t.id !== id);
        emit();
    }, tone === 'error' ? 5000 : 2600);
}
const EMPTY = [];
const subscribe = (l)=>(listeners.add(l), ()=>void listeners.delete(l));
function Toaster() {
    _s();
    const list = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, {
        "Toaster.useSyncExternalStore[list]": ()=>items
    }["Toaster.useSyncExternalStore[list]"], {
        "Toaster.useSyncExternalStore[list]": ()=>EMPTY
    }["Toaster.useSyncExternalStore[list]"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "status",
        "aria-live": "polite",
        className: "pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--mnav-h,4rem)+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6",
        children: list.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none', t.tone === 'error' && 'border-destructive/40'),
                children: [
                    t.tone === 'error' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "size-4 shrink-0 text-destructive",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/ui/toaster.tsx",
                        lineNumber: 56,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "size-4 shrink-0 text-emerald-600",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/ui/toaster.tsx",
                        lineNumber: 58,
                        columnNumber: 13
                    }, this),
                    t.message
                ]
            }, t.id, true, {
                fileName: "[project]/components/ui/toaster.tsx",
                lineNumber: 48,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/ui/toaster.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(Toaster, "CZ9uWQaR6bshHCbgXz7Hn1eEkkk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
_c = Toaster;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications/notification-bell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationBell",
    ()=>NotificationBell,
    "NotificationPanel",
    ()=>NotificationPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check-check.js [app-client] (ecmascript) <export default as CheckCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toaster.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/notifications/use-notifications.ts [app-client] (ecmascript)");
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
function ago(iso) {
    const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}
function BellButton({ unread, className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        "aria-label": unread > 0 ? `Notifications, ${unread} unread` : 'Notifications',
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('relative flex items-center justify-center rounded-lg text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className),
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                className: "size-5",
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            unread > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white",
                children: unread > 99 ? '99+' : unread
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 31,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications/notification-bell.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_c = BellButton;
function NotificationPanel({ onNavigate, big }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { items, unread, loaded } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"])();
    const open = (n)=>{
        void (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markRead"])(n.id);
        onNavigate();
        router.push(n.url || '/app');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-2 pb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: unread > 0 ? `${unread} unread` : 'All caught up'
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/notification-bell.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            void (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markAllRead"])();
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])('All notifications marked read');
                        },
                        disabled: unread === 0,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary disabled:opacity-40', big ? 'min-h-11' : 'min-h-8'),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCheck$3e$__["CheckCheck"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/notifications/notification-bell.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            "Mark all read"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/notifications/notification-bell.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            !loaded ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "py-8 text-center text-sm text-muted-foreground",
                children: "Loading…"
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this) : items.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "py-8 text-center text-sm text-muted-foreground",
                children: "No notifications yet."
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 73,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "divide-y rounded-xl border bg-background",
                children: items.map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>open(n),
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex w-full items-start gap-3 px-3 text-left active:bg-accent hover:bg-accent/60', big ? 'min-h-16 py-3' : 'py-2.5'),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-1.5 size-2.5 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-primary'),
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/components/notifications/notification-bell.tsx",
                                    lineNumber: 86,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "min-w-0 flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('block truncate text-sm', n.read_at ? 'font-normal' : 'font-semibold'),
                                            children: n.title
                                        }, void 0, false, {
                                            fileName: "[project]/components/notifications/notification-bell.tsx",
                                            lineNumber: 91,
                                            columnNumber: 19
                                        }, this),
                                        n.body ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block truncate text-sm text-muted-foreground",
                                            children: n.body
                                        }, void 0, false, {
                                            fileName: "[project]/components/notifications/notification-bell.tsx",
                                            lineNumber: 92,
                                            columnNumber: 29
                                        }, this) : null
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/notifications/notification-bell.tsx",
                                    lineNumber: 90,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "shrink-0 pt-0.5 text-xs text-muted-foreground",
                                    children: ago(n.created_at)
                                }, void 0, false, {
                                    fileName: "[project]/components/notifications/notification-bell.tsx",
                                    lineNumber: 94,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/notifications/notification-bell.tsx",
                            lineNumber: 78,
                            columnNumber: 15
                        }, this)
                    }, n.id, false, {
                        fileName: "[project]/components/notifications/notification-bell.tsx",
                        lineNumber: 77,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 75,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: "/app/settings/notifications",
                onClick: onNavigate,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mt-3 flex items-center justify-center gap-2 rounded-lg border text-sm font-medium active:bg-accent hover:bg-accent/60', big ? 'min-h-12' : 'min-h-9'),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                        className: "size-4",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/notification-bell.tsx",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    "Notification settings"
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications/notification-bell.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_s(NotificationPanel, "z4/WOeEgrVEUZ2WbAfAxNg90hqY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"]
    ];
});
_c1 = NotificationPanel;
function NotificationBell() {
    _s1();
    const { unread } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const wrapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationBell.useEffect": ()=>{
            if (!open) return;
            const onDown = {
                "NotificationBell.useEffect.onDown": (e)=>{
                    if (!wrapRef.current?.contains(e.target)) setOpen(false);
                }
            }["NotificationBell.useEffect.onDown"];
            const onKey = {
                "NotificationBell.useEffect.onKey": (e)=>e.key === 'Escape' && setOpen(false)
            }["NotificationBell.useEffect.onKey"];
            document.addEventListener('mousedown', onDown);
            document.addEventListener('keydown', onKey);
            return ({
                "NotificationBell.useEffect": ()=>{
                    document.removeEventListener('mousedown', onDown);
                    document.removeEventListener('keydown', onKey);
                }
            })["NotificationBell.useEffect"];
        }
    }["NotificationBell.useEffect"], [
        open
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: wrapRef,
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BellButton, {
                unread: unread,
                onClick: ()=>setOpen((v)=>!v),
                "aria-expanded": open,
                className: "size-9 hover:bg-accent"
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 141,
                columnNumber: 7
            }, this),
            open ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute right-0 top-11 z-50 max-h-[70vh] w-96 overflow-y-auto rounded-xl border bg-card p-3 shadow-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NotificationPanel, {
                    big: false,
                    onNavigate: ()=>setOpen(false)
                }, void 0, false, {
                    fileName: "[project]/components/notifications/notification-bell.tsx",
                    lineNumber: 144,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/notifications/notification-bell.tsx",
                lineNumber: 143,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications/notification-bell.tsx",
        lineNumber: 140,
        columnNumber: 5
    }, this);
}
_s1(NotificationBell, "+ytl1Lnj9dV5Z43ZZs3IDokOoog=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$notifications$2f$use$2d$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotifications"]
    ];
});
_c2 = NotificationBell;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "BellButton");
__turbopack_context__.k.register(_c1, "NotificationPanel");
__turbopack_context__.k.register(_c2, "NotificationBell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/notifications/url.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Notification links are internal-only. Anything that is not a same-origin
 * /app path (absolute URLs, protocol-relative //host, backslash tricks,
 * javascript:, control characters) collapses to the portal home, so neither a
 * bug nor a crafted payload can turn a push into an open redirect.
 * public/sw.js applies the same rule again before opening a window.
 */ __turbopack_context__.s([
    "FALLBACK_URL",
    ()=>FALLBACK_URL,
    "safeInternalUrl",
    ()=>safeInternalUrl
]);
const FALLBACK_URL = '/app';
function safeInternalUrl(input) {
    if (typeof input !== 'string') return FALLBACK_URL;
    const url = input.trim();
    if (url.length === 0 || url.length > 500) return FALLBACK_URL;
    if (/[\u0000-\u001f\u007f\\]/.test(url)) return FALLBACK_URL;
    if (url !== '/app' && !url.startsWith('/app/') && !url.startsWith('/app?') && !url.startsWith('/app#')) {
        return FALLBACK_URL;
    }
    return url;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications/portal-push-boot.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PortalPushBoot",
    ()=>PortalPushBoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$url$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/url.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function PortalPushBoot({ userId }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PortalPushBoot.useEffect": ()=>{
            void (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerServiceWorker"])().then({
                "PortalPushBoot.useEffect": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resyncPush"])(userId)
            }["PortalPushBoot.useEffect"]);
        }
    }["PortalPushBoot.useEffect"], [
        userId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PortalPushBoot.useEffect": ()=>{
            if (!('serviceWorker' in navigator)) return;
            const onMessage = {
                "PortalPushBoot.useEffect.onMessage": (e)=>{
                    if (e.data?.type === 'hq-navigate') router.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$url$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["safeInternalUrl"])(e.data.url));
                }
            }["PortalPushBoot.useEffect.onMessage"];
            navigator.serviceWorker.addEventListener('message', onMessage);
            return ({
                "PortalPushBoot.useEffect": ()=>navigator.serviceWorker.removeEventListener('message', onMessage)
            })["PortalPushBoot.useEffect"];
        }
    }["PortalPushBoot.useEffect"], [
        router
    ]);
    return null;
}
_s(PortalPushBoot, "TvQOAa6MuxS5wkANqefpxaThEc4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = PortalPushBoot;
var _c;
__turbopack_context__.k.register(_c, "PortalPushBoot");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/notifications/install-helper.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InstallHelper",
    ()=>InstallHelper,
    "InstallSteps",
    ()=>InstallSteps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/share.js [app-client] (ecmascript) <export default as Share>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SquarePlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square-plus.js [app-client] (ecmascript) <export default as SquarePlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications/client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const KEY = 'hq_install_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
function InstallSteps() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
        className: "list-decimal space-y-1.5 pl-5 text-sm",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: [
                    "Open HomeQuote in ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Safari"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 14,
                        columnNumber: 27
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: [
                    "Tap the ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share$3e$__["Share"], {
                        className: "mx-0.5 inline size-4 align-text-bottom",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 17,
                        columnNumber: 17
                    }, this),
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Share"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 17,
                        columnNumber: 97
                    }, this),
                    " button."
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: [
                    "Tap ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SquarePlus$3e$__["SquarePlus"], {
                        className: "mx-0.5 inline size-4 align-text-bottom",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 20,
                        columnNumber: 13
                    }, this),
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Add to Home Screen"
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 20,
                        columnNumber: 98
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: "Open HomeQuote from the new Home Screen icon."
            }, void 0, false, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: "Then turn on notifications in Notification settings."
            }, void 0, false, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications/install-helper.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = InstallSteps;
function InstallHelper() {
    _s();
    const [show, setShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InstallHelper.useEffect": ()=>{
            const env = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["detectEnv"])();
            if (!env.isIOS || env.standalone) return;
            try {
                const at = Number(localStorage.getItem(KEY) ?? 0);
                if (at && Date.now() - at < SNOOZE_MS) return;
            } catch  {
            /* storage blocked: show it */ }
            setShow(true);
        }
    }["InstallHelper.useEffect"], []);
    if (!show) return null;
    const dismiss = ()=>{
        try {
            localStorage.setItem(KEY, String(Date.now()));
        } catch  {
        /* ignore */ }
        setShow(false);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-3 rounded-xl border bg-card p-3 lg:hidden",
        role: "region",
        "aria-label": "Install HomeQuote",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold",
                                children: "Install HomeQuote"
                            }, void 0, false, {
                                fileName: "[project]/components/notifications/install-helper.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-sm text-muted-foreground",
                                children: "Add HomeQuote to your Home Screen to use it like an app and enable push notifications."
                            }, void 0, false, {
                                fileName: "[project]/components/notifications/install-helper.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: dismiss,
                        "aria-label": "Dismiss",
                        className: "-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-accent",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "size-5"
                        }, void 0, false, {
                            fileName: "[project]/components/notifications/install-helper.tsx",
                            lineNumber: 75,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/notifications/install-helper.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            expanded ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InstallSteps, {}, void 0, false, {
                    fileName: "[project]/components/notifications/install-helper.tsx",
                    lineNumber: 80,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 79,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>setExpanded(true),
                className: "mt-2 min-h-11 w-full rounded-lg border text-sm font-medium active:bg-accent",
                children: "Show me how"
            }, void 0, false, {
                fileName: "[project]/components/notifications/install-helper.tsx",
                lineNumber: 83,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/notifications/install-helper.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_s(InstallHelper, "NKu0o38qXfYy/GSpMp6In2xMwwA=");
_c1 = InstallHelper;
var _c, _c1;
__turbopack_context__.k.register(_c, "InstallSteps");
__turbopack_context__.k.register(_c1, "InstallHelper");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/assistant/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
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
    const raw = Number(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env[name]);
    return Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback;
};
function assistantModel() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}
function assistantEffort() {
    const v = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.ASSISTANT_EFFORT?.trim();
    return v === 'medium' || v === 'high' ? v : 'low';
}
function isAssistantEnabled() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.ASSISTANT_ENABLED?.trim().toLowerCase() !== 'false';
}
function isAnthropicConfigured() {
    return !!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.ANTHROPIC_API_KEY?.trim();
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/assistant/action-card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ActionCard",
    ()=>ActionCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-client] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function ActionCard({ initial }) {
    _s();
    const [action, setAction] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initial);
    const [phase, setPhase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const doc = action.preview.document;
    const [values, setValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ActionCard.useState": ()=>Object.fromEntries((doc?.fields ?? []).map({
                "ActionCard.useState": (f)=>[
                        f.key,
                        f.value
                    ]
            }["ActionCard.useState"]))
    }["ActionCard.useState"]);
    const [showText, setShowText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const pending = action.status === 'proposed';
    const decide = async (decision)=>{
        setPhase('working');
        setMessage(null);
        try {
            const res = await fetch(`/api/assistant/actions/${action.id}`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(decision === 'confirm' && doc ? {
                    decision,
                    edits: {
                        values
                    }
                } : {
                    decision
                })
            });
            const json = await res.json().catch(()=>null);
            if (!res.ok || !json?.action) {
                setMessage(json?.error ?? 'That did not go through. Nothing was changed.');
                return;
            }
            setAction((a)=>({
                    ...a,
                    ...json.action
                }));
        } catch  {
            setMessage('Could not reach the server. Nothing was changed; try again.');
        } finally{
            setPhase('idle');
        }
    };
    const tone = action.status === 'executed' ? 'border-emerald-400/50' : action.status === 'failed' ? 'border-rose-400/50' : 'border-sky-300/40';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-label": action.preview.title,
        className: `my-2 rounded-lg border ${tone} bg-white/5 p-3`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex items-start justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                        className: "text-sm font-semibold text-white",
                        children: action.preview.title
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80",
                        role: "status",
                        children: action.status === 'proposed' ? 'Not saved yet' : action.status === 'executing' ? 'Working…' : action.status === 'executed' ? 'Done' : action.status === 'failed' ? 'Failed' : 'Cancelled'
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-xs text-white/60",
                children: [
                    "For ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: action.preview.target.href,
                        className: "text-sky-300 underline underline-offset-2",
                        children: action.preview.target.label
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 46,
                        columnNumber: 53
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "mt-2 space-y-0.5 text-sm text-white/90",
                children: action.preview.lines.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "whitespace-pre-wrap break-words",
                        children: l
                    }, i, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 47,
                        columnNumber: 98
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            doc && pending && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-white/60",
                        children: "Check and correct the details below. The document wording comes from the approved template and can’t be changed here."
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this),
                    doc.fields.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs text-white/70",
                            children: [
                                f.label,
                                f.required ? ' *' : '',
                                f.fromLead ? ' (from the lead — please check)' : '',
                                f.kind === 'longtext' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    value: values[f.key] ?? '',
                                    onChange: (e)=>setValues((v)=>({
                                                ...v,
                                                [f.key]: e.target.value
                                            })),
                                    rows: 3,
                                    className: "mt-0.5 w-full rounded-md border border-white/15 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300"
                                }, void 0, false, {
                                    fileName: "[project]/components/assistant/action-card.tsx",
                                    lineNumber: 56,
                                    columnNumber: 19
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: values[f.key] ?? '',
                                    onChange: (e)=>setValues((v)=>({
                                                ...v,
                                                [f.key]: e.target.value
                                            })),
                                    inputMode: f.kind === 'money' ? 'decimal' : undefined,
                                    type: f.kind === 'date' ? 'date' : 'text',
                                    className: "mt-0.5 w-full rounded-md border border-white/15 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300"
                                }, void 0, false, {
                                    fileName: "[project]/components/assistant/action-card.tsx",
                                    lineNumber: 57,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, f.key, true, {
                            fileName: "[project]/components/assistant/action-card.tsx",
                            lineNumber: 53,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setShowText((s)=>!s),
                        "aria-expanded": showText,
                        className: "flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                className: `size-3.5 transition-transform ${showText ? 'rotate-180' : ''}`,
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/action-card.tsx",
                                lineNumber: 62,
                                columnNumber: 13
                            }, this),
                            " Document wording (read-only)"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 61,
                        columnNumber: 11
                    }, this),
                    showText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "max-h-60 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2 text-xs text-white/80",
                        children: doc.sections.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    s.title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-semibold text-white",
                                        children: s.title
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/action-card.tsx",
                                        lineNumber: 66,
                                        columnNumber: 68
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "whitespace-pre-wrap",
                                        children: s.text
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/action-card.tsx",
                                        lineNumber: 66,
                                        columnNumber: 122
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/components/assistant/action-card.tsx",
                                lineNumber: 66,
                                columnNumber: 43
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 65,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 50,
                columnNumber: 9
            }, this),
            action.preview.warning && pending && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 flex gap-1.5 rounded-md bg-amber-400/10 p-2 text-xs text-amber-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                        className: "mt-0.5 size-3.5 shrink-0",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 73,
                        columnNumber: 96
                    }, this),
                    action.preview.warning
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 73,
                columnNumber: 9
            }, this),
            pending && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 flex flex-wrap gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        disabled: phase === 'working',
                        onClick: ()=>decide('confirm'),
                        className: "inline-flex items-center gap-1.5 rounded-md bg-sky-400 px-3 py-1.5 text-sm font-semibold text-[#0A1B3D] hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60",
                        children: [
                            phase === 'working' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "size-3.5 animate-spin",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/action-card.tsx",
                                lineNumber: 80,
                                columnNumber: 37
                            }, this),
                            action.preview.confirmLabel ?? 'Confirm'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 78,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        disabled: phase === 'working',
                        onClick: ()=>decide('cancel'),
                        className: "rounded-md border border-white/25 px-3 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-60",
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 82,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 77,
                columnNumber: 9
            }, this),
            message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "mt-2 text-xs text-rose-300",
                children: message
            }, void 0, false, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 85,
                columnNumber: 19
            }, this),
            action.status === 'executed' && action.result && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 flex gap-1.5 text-sm text-emerald-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "mt-0.5 size-4 shrink-0",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 87,
                        columnNumber: 67
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            action.result.message,
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: action.result.href,
                                className: "underline underline-offset-2",
                                children: [
                                    "View ",
                                    action.result.label
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/action-card.tsx",
                                lineNumber: 87,
                                columnNumber: 160
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 87,
                        columnNumber: 130
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 87,
                columnNumber: 9
            }, this),
            action.status === 'failed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 flex gap-1.5 text-sm text-rose-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                        className: "mt-0.5 size-4 shrink-0",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/action-card.tsx",
                        lineNumber: 89,
                        columnNumber: 93
                    }, this),
                    action.error ?? 'This could not be completed. Nothing was changed.'
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 89,
                columnNumber: 38
            }, this),
            action.status === 'cancelled' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-xs text-white/60",
                children: "Cancelled. Nothing was changed."
            }, void 0, false, {
                fileName: "[project]/components/assistant/action-card.tsx",
                lineNumber: 90,
                columnNumber: 41
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/assistant/action-card.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_s(ActionCard, "JcsiVJGdEC1kAfj59f2jBluyTdo=");
_c = ActionCard;
var _c;
__turbopack_context__.k.register(_c, "ActionCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/assistant/blocks.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BlockView",
    ()=>BlockView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$help$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleHelp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-help.js [app-client] (ecmascript) <export default as CircleHelp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
'use client';
;
;
const STATE_ICON = {
    ok: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
        className: "size-4 shrink-0 text-emerald-400",
        "aria-label": "OK"
    }, void 0, false, {
        fileName: "[project]/components/assistant/blocks.tsx",
        lineNumber: 7,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0)),
    warn: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
        className: "size-4 shrink-0 text-amber-300",
        "aria-label": "Needs attention"
    }, void 0, false, {
        fileName: "[project]/components/assistant/blocks.tsx",
        lineNumber: 8,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0)),
    bad: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
        className: "size-4 shrink-0 text-rose-400",
        "aria-label": "Problem"
    }, void 0, false, {
        fileName: "[project]/components/assistant/blocks.tsx",
        lineNumber: 9,
        columnNumber: 8
    }, ("TURBOPACK compile-time value", void 0)),
    unknown: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$help$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleHelp$3e$__["CircleHelp"], {
        className: "size-4 shrink-0 text-white/50",
        "aria-label": "Not verified"
    }, void 0, false, {
        fileName: "[project]/components/assistant/blocks.tsx",
        lineNumber: 10,
        columnNumber: 12
    }, ("TURBOPACK compile-time value", void 0))
};
function BlockView({ block, onPick, disabled }) {
    if (block.type === 'cards') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            "aria-label": block.title,
            className: "my-2 rounded-lg border border-white/15 bg-white/5 p-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    className: "px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-white/70",
                    children: block.title
                }, void 0, false, {
                    fileName: "[project]/components/assistant/blocks.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this),
                block.items.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "px-1 py-2 text-sm text-white/70",
                    children: "Nothing to choose from."
                }, void 0, false, {
                    fileName: "[project]/components/assistant/blocks.tsx",
                    lineNumber: 19,
                    columnNumber: 38
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                    className: "space-y-1.5",
                    children: block.items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                disabled: disabled || item.disabled,
                                title: item.disabled ? item.reason : undefined,
                                onClick: ()=>onPick(block.kind, item.id, item.label),
                                className: "flex w-full items-start justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-sky-300/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block truncate text-sm font-medium text-white",
                                                children: item.label
                                            }, void 0, false, {
                                                fileName: "[project]/components/assistant/blocks.tsx",
                                                lineNumber: 25,
                                                columnNumber: 43
                                            }, this),
                                            item.detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block truncate text-xs text-white/60",
                                                children: item.detail
                                            }, void 0, false, {
                                                fileName: "[project]/components/assistant/blocks.tsx",
                                                lineNumber: 25,
                                                columnNumber: 142
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/assistant/blocks.tsx",
                                        lineNumber: 25,
                                        columnNumber: 17
                                    }, this),
                                    item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80",
                                        children: item.badge
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/blocks.tsx",
                                        lineNumber: 26,
                                        columnNumber: 32
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/blocks.tsx",
                                lineNumber: 23,
                                columnNumber: 15
                            }, this)
                        }, item.id, false, {
                            fileName: "[project]/components/assistant/blocks.tsx",
                            lineNumber: 22,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/assistant/blocks.tsx",
                    lineNumber: 20,
                    columnNumber: 9
                }, this),
                block.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "px-1 pt-1.5 text-xs text-white/60",
                    children: block.note
                }, void 0, false, {
                    fileName: "[project]/components/assistant/blocks.tsx",
                    lineNumber: 31,
                    columnNumber: 24
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/assistant/blocks.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        "aria-label": block.title,
        className: "my-2 rounded-lg border border-white/15 bg-white/5 p-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                className: "pb-1.5 text-xs font-semibold uppercase tracking-wider text-white/70",
                children: block.title
            }, void 0, false, {
                fileName: "[project]/components/assistant/blocks.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                className: "space-y-1.5",
                children: block.rows.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "sr-only",
                                children: r.label
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/blocks.tsx",
                                lineNumber: 41,
                                columnNumber: 13
                            }, this),
                            STATE_ICON[r.state],
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/60",
                                        children: [
                                            r.label,
                                            ": "
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/assistant/blocks.tsx",
                                        lineNumber: 43,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "break-words text-white",
                                        children: r.value
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/blocks.tsx",
                                        lineNumber: 43,
                                        columnNumber: 87
                                    }, this),
                                    r.detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block text-xs text-white/50",
                                        children: r.detail
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/blocks.tsx",
                                        lineNumber: 43,
                                        columnNumber: 157
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/blocks.tsx",
                                lineNumber: 43,
                                columnNumber: 13
                            }, this)
                        ]
                    }, `${r.label}-${i}`, true, {
                        fileName: "[project]/components/assistant/blocks.tsx",
                        lineNumber: 40,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/assistant/blocks.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            block.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "pt-2 text-xs text-white/60",
                children: block.note
            }, void 0, false, {
                fileName: "[project]/components/assistant/blocks.tsx",
                lineNumber: 47,
                columnNumber: 22
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/assistant/blocks.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c = BlockView;
var _c;
__turbopack_context__.k.register(_c, "BlockView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/assistant/rich-text.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DraftCard",
    ()=>DraftCard,
    "RichText",
    ()=>RichText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as Copy>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
/**
 * A deliberately tiny, safe renderer for the assistant’s replies: paragraphs, lists, bold, code and links. No raw HTML is
 * ever inserted. Links are limited to in-app /app pages, the Meta connect start URL, and https:// addresses.
 */ const INTERNAL = /^\/app(\/[A-Za-z0-9._~\-/#?=&%]*)?$/;
const CONNECT = /^\/api\/integrations\/meta\/connect\/start(\?[A-Za-z0-9._~\-=&%]*)?$/;
const EXTERNAL = /^https:\/\/[^\s"'<>]+$/;
function renderLink(label, href, key) {
    const cls = 'underline underline-offset-2 text-sky-300 hover:text-sky-200';
    if (INTERNAL.test(href)) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        className: cls,
        children: label
    }, key, false, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 17,
        columnNumber: 35
    }, this);
    if (CONNECT.test(href)) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: href,
        className: cls,
        children: label
    }, key, false, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 18,
        columnNumber: 34
    }, this);
    if (EXTERNAL.test(href)) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: href,
        target: "_blank",
        rel: "noopener noreferrer",
        className: cls,
        children: label
    }, key, false, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 19,
        columnNumber: 35
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: label
    }, key, false, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 20,
        columnNumber: 10
    }, this);
}
function inline(text, keyBase) {
    const out = [];
    const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let i = 0;
    for (const m of text.matchAll(re)){
        if ((m.index ?? 0) > last) out.push(text.slice(last, m.index));
        const key = `${keyBase}-${i++}`;
        if (m[1]) out.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
            children: m[1]
        }, key, false, {
            fileName: "[project]/components/assistant/rich-text.tsx",
            lineNumber: 30,
            columnNumber: 24
        }, this));
        else if (m[2]) out.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
            className: "rounded bg-white/10 px-1 py-0.5 text-[0.85em]",
            children: m[2]
        }, key, false, {
            fileName: "[project]/components/assistant/rich-text.tsx",
            lineNumber: 31,
            columnNumber: 29
        }, this));
        else out.push(renderLink(m[3], m[4], key));
        last = (m.index ?? 0) + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}
function DraftCard({ kind, initial }) {
    _s();
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initial);
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const copy = async ()=>{
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(()=>setCopied(false), 1800);
        } catch  {}
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "my-2 rounded-lg border border-white/15 bg-white/5 p-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            kind === 'email' ? 'Email draft' : 'Text draft',
                            " · edit before sending"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/rich-text.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: copy,
                        className: "inline-flex items-center gap-1 rounded px-2 py-1 text-xs normal-case tracking-normal text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                        children: [
                            copied ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                className: "size-3.5",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/rich-text.tsx",
                                lineNumber: 50,
                                columnNumber: 21
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                className: "size-3.5",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/rich-text.tsx",
                                lineNumber: 50,
                                columnNumber: 66
                            }, this),
                            copied ? 'Copied' : 'Copy'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/rich-text.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/rich-text.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                "aria-label": `${kind === 'email' ? 'Email' : 'Text'} draft`,
                value: value,
                onChange: (e)=>setValue(e.target.value),
                rows: Math.min(14, Math.max(4, value.split('\n').length + 1)),
                className: "w-full resize-y rounded-md border border-white/10 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300"
            }, void 0, false, {
                fileName: "[project]/components/assistant/rich-text.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-[11px] text-white/50",
                children: "The assistant can’t send this. Copy it into your phone or email."
            }, void 0, false, {
                fileName: "[project]/components/assistant/rich-text.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
_s(DraftCard, "SqPm00SefGtAt4oUymPWDM9dNd0=");
_c = DraftCard;
function RichText({ text }) {
    const parts = [];
    const fence = /```([a-z]+(?::[a-z]+)?)?\n([\s\S]*?)```/g;
    let last = 0;
    let idx = 0;
    const pushBlocks = (chunk)=>{
        const lines = chunk.split('\n');
        let para = [];
        let list = null;
        const flushPara = ()=>{
            if (para.length) {
                parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "my-1.5 whitespace-pre-wrap",
                    children: inline(para.join('\n'), `p${idx}`)
                }, `p${idx++}`, false, {
                    fileName: "[project]/components/assistant/rich-text.tsx",
                    lineNumber: 67,
                    columnNumber: 61
                }, this));
                para = [];
            }
        };
        const flushList = ()=>{
            if (!list) return;
            const Tag = list.ordered ? 'ol' : 'ul';
            parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Tag, {
                className: `my-1.5 ml-5 space-y-0.5 ${list.ordered ? 'list-decimal' : 'list-disc'}`,
                children: list.items.map((it, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: inline(it, `li${idx}-${n}`)
                    }, n, false, {
                        fileName: "[project]/components/assistant/rich-text.tsx",
                        lineNumber: 71,
                        columnNumber: 153
                    }, this))
            }, `l${idx++}`, false, {
                fileName: "[project]/components/assistant/rich-text.tsx",
                lineNumber: 71,
                columnNumber: 18
            }, this));
            list = null;
        };
        for (const line of lines){
            const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
            const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
            const head = /^#{1,3}\s+(.*)$/.exec(line);
            if (bullet || num) {
                flushPara();
                const ordered = !!num;
                if (list && list.ordered !== ordered) flushList();
                list ??= {
                    ordered,
                    items: []
                };
                list.items.push((bullet ?? num)[1]);
                continue;
            }
            flushList();
            if (head) {
                flushPara();
                parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-2 font-semibold",
                    children: inline(head[1], `h${idx}`)
                }, `h${idx++}`, false, {
                    fileName: "[project]/components/assistant/rich-text.tsx",
                    lineNumber: 78,
                    columnNumber: 43
                }, this));
                continue;
            }
            if (!line.trim()) {
                flushPara();
                continue;
            }
            para.push(line);
        }
        flushPara();
        flushList();
    };
    for (const m of text.matchAll(fence)){
        if ((m.index ?? 0) > last) pushBlocks(text.slice(last, m.index));
        const lang = m[1] ?? '';
        if (lang === 'draft:text' || lang === 'draft:email') parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DraftCard, {
            kind: lang === 'draft:email' ? 'email' : 'text',
            initial: m[2].trim()
        }, `d${idx++}`, false, {
            fileName: "[project]/components/assistant/rich-text.tsx",
            lineNumber: 87,
            columnNumber: 69
        }, this));
        else parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
            className: "my-2 overflow-x-auto rounded-md bg-black/30 p-2 text-xs",
            children: m[2]
        }, `c${idx++}`, false, {
            fileName: "[project]/components/assistant/rich-text.tsx",
            lineNumber: 88,
            columnNumber: 21
        }, this));
        last = (m.index ?? 0) + m[0].length;
    }
    if (last < text.length) pushBlocks(text.slice(last));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-sm leading-relaxed",
        children: parts
    }, void 0, false, {
        fileName: "[project]/components/assistant/rich-text.tsx",
        lineNumber: 92,
        columnNumber: 10
    }, this);
}
_c1 = RichText;
var _c, _c1;
__turbopack_context__.k.register(_c, "DraftCard");
__turbopack_context__.k.register(_c1, "RichText");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/assistant/use-assistant.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssistant",
    ()=>useAssistant
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const uid = ()=>typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const storageKey = (userId)=>`hqn-assistant-conversation:${userId}`;
const read = (k)=>{
    try {
        return localStorage.getItem(k);
    } catch  {
        return null;
    }
};
const write = (k, v)=>{
    try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
    } catch  {}
};
function useAssistant(userId) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [conversationId, setConversationId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [context, setContext] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const abortRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const convRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    convRef.current = conversationId;
    const patchLast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[patchLast]": (fn)=>setMessages({
                "useAssistant.useCallback[patchLast]": (ms)=>ms.length ? [
                        ...ms.slice(0, -1),
                        fn(ms[ms.length - 1])
                    ] : ms
            }["useAssistant.useCallback[patchLast]"])
    }["useAssistant.useCallback[patchLast]"], []);
    const loadStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[loadStatus]": async ()=>{
            try {
                const res = await fetch('/api/assistant/status');
                const json = await res.json().catch({
                    "useAssistant.useCallback[loadStatus]": ()=>null
                }["useAssistant.useCallback[loadStatus]"]);
                setStatus({
                    available: !!json?.available,
                    enabled: json?.enabled !== false,
                    configured: !!json?.configured
                });
            } catch  {
                setStatus({
                    available: false,
                    enabled: true,
                    configured: false
                });
            }
        }
    }["useAssistant.useCallback[loadStatus]"], []);
    const refreshContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[refreshContext]": async ()=>{
            try {
                const res = await fetch(`/api/assistant/context?path=${encodeURIComponent(pathname)}`);
                const json = await res.json().catch({
                    "useAssistant.useCallback[refreshContext]": ()=>null
                }["useAssistant.useCallback[refreshContext]"]);
                setContext(json?.context ?? null);
            } catch  {
                setContext(null);
            }
        }
    }["useAssistant.useCallback[refreshContext]"], [
        pathname
    ]);
    const loadConversation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[loadConversation]": async (id)=>{
            try {
                const res = await fetch(`/api/assistant/conversations/${id}`);
                if (!res.ok) {
                    write(storageKey(userId), null);
                    return false;
                }
                const json = await res.json();
                setMessages(json.messages.map({
                    "useAssistant.useCallback[loadConversation]": (m)=>({
                            id: m.id,
                            role: m.role,
                            text: m.content,
                            status: m.status === 'cancelled' ? 'cancelled' : 'complete',
                            blocks: m.role === 'assistant' ? m.context?.blocks ?? [] : [],
                            actions: m.role === 'assistant' ? json.actions.filter({
                                "useAssistant.useCallback[loadConversation]": (a)=>a.message_id === m.id
                            }["useAssistant.useCallback[loadConversation]"]) : []
                        })
                }["useAssistant.useCallback[loadConversation]"]));
                setConversationId(id);
                write(storageKey(userId), id);
                return true;
            } catch  {
                return false;
            }
        }
    }["useAssistant.useCallback[loadConversation]"], [
        userId
    ]);
    const loadConversations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[loadConversations]": async ()=>{
            try {
                const res = await fetch('/api/assistant/conversations');
                const json = await res.json();
                setConversations(json.conversations ?? []);
            } catch  {
                setConversations([]);
            }
        }
    }["useAssistant.useCallback[loadConversations]"], []);
    // Restore the last conversation once.
    const restored = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAssistant.useEffect": ()=>{
            if (restored.current) return;
            restored.current = true;
            const saved = read(storageKey(userId));
            if (saved) void loadConversation(saved);
        }
    }["useAssistant.useEffect"], [
        userId,
        loadConversation
    ]);
    const send = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[send]": async (text, retry)=>{
            const message = text.trim();
            if (!message || busy) return;
            const clientId = retry?.clientId ?? uid();
            const assistantId = uid();
            setMessages({
                "useAssistant.useCallback[send]": (ms)=>{
                    const base = retry ? ms.filter({
                        "useAssistant.useCallback[send]": (m)=>!(m.role === 'assistant' && m.status === 'error' && m.error?.retryClientId === clientId)
                    }["useAssistant.useCallback[send]"]) : [
                        ...ms,
                        {
                            id: uid(),
                            role: 'user',
                            text: message,
                            status: 'complete',
                            blocks: [],
                            actions: [],
                            clientId
                        }
                    ];
                    return [
                        ...base,
                        {
                            id: assistantId,
                            role: 'assistant',
                            text: '',
                            status: 'streaming',
                            blocks: [],
                            actions: [],
                            working: 'Thinking'
                        }
                    ];
                }
            }["useAssistant.useCallback[send]"]);
            setBusy(true);
            const ac = new AbortController();
            abortRef.current = ac;
            try {
                const res = await fetch('/api/assistant/chat', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json'
                    },
                    signal: ac.signal,
                    body: JSON.stringify({
                        conversationId: convRef.current ?? undefined,
                        message,
                        clientId,
                        path: pathname
                    })
                });
                if (!res.ok || !res.body) {
                    const json = await res.json().catch({
                        "useAssistant.useCallback[send]": ()=>null
                    }["useAssistant.useCallback[send]"]);
                    patchLast({
                        "useAssistant.useCallback[send]": (m)=>({
                                ...m,
                                status: 'error',
                                working: undefined,
                                error: {
                                    code: json?.code ?? 'http',
                                    message: json?.message ?? 'The assistant could not answer right now.',
                                    retryText: message,
                                    retryClientId: clientId
                                }
                            })
                    }["useAssistant.useCallback[send]"]);
                    return;
                }
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buf = '';
                for(;;){
                    const { value, done } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, {
                        stream: true
                    });
                    let nl;
                    while((nl = buf.indexOf('\n')) >= 0){
                        const line = buf.slice(0, nl).trim();
                        buf = buf.slice(nl + 1);
                        if (!line) continue;
                        let ev;
                        try {
                            ev = JSON.parse(line);
                        } catch  {
                            continue;
                        }
                        if (ev.type === 'meta') {
                            setConversationId(ev.conversationId);
                            write(storageKey(userId), ev.conversationId);
                            setContext(ev.context);
                        } else if (ev.type === 'text') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    text: m.text + ev.delta,
                                    working: undefined
                                })
                        }["useAssistant.useCallback[send]"]);
                        else if (ev.type === 'tool') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    working: ev.status === 'running' ? ev.name : undefined
                                })
                        }["useAssistant.useCallback[send]"]);
                        else if (ev.type === 'block') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    blocks: [
                                        ...m.blocks,
                                        ev.block
                                    ]
                                })
                        }["useAssistant.useCallback[send]"]);
                        else if (ev.type === 'action') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    actions: [
                                        ...m.actions.filter({
                                            "useAssistant.useCallback[send]": (a)=>a.id !== ev.action.id
                                        }["useAssistant.useCallback[send]"]),
                                        {
                                            id: ev.action.id,
                                            kind: ev.action.kind,
                                            status: ev.action.status,
                                            preview: ev.action.preview
                                        }
                                    ]
                                })
                        }["useAssistant.useCallback[send]"]);
                        else if (ev.type === 'done') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    status: ev.cancelled ? 'cancelled' : 'complete',
                                    working: undefined
                                })
                        }["useAssistant.useCallback[send]"]);
                        else if (ev.type === 'error') patchLast({
                            "useAssistant.useCallback[send]": (m)=>({
                                    ...m,
                                    status: 'error',
                                    working: undefined,
                                    error: {
                                        code: ev.code,
                                        message: ev.message,
                                        retryText: message,
                                        retryClientId: clientId
                                    }
                                })
                        }["useAssistant.useCallback[send]"]);
                    }
                }
                patchLast({
                    "useAssistant.useCallback[send]": (m)=>m.status === 'streaming' ? {
                            ...m,
                            status: 'complete',
                            working: undefined
                        } : m
                }["useAssistant.useCallback[send]"]);
            } catch (e) {
                const aborted = e instanceof DOMException && e.name === 'AbortError';
                patchLast({
                    "useAssistant.useCallback[send]": (m)=>aborted ? {
                            ...m,
                            status: 'cancelled',
                            working: undefined
                        } : {
                            ...m,
                            status: 'error',
                            working: undefined,
                            error: {
                                code: 'network',
                                message: 'Connection lost. Your message was kept; try again.',
                                retryText: message,
                                retryClientId: clientId
                            }
                        }
                }["useAssistant.useCallback[send]"]);
            } finally{
                setBusy(false);
                abortRef.current = null;
            }
        }
    }["useAssistant.useCallback[send]"], [
        busy,
        pathname,
        patchLast,
        userId
    ]);
    const stop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[stop]": ()=>abortRef.current?.abort()
    }["useAssistant.useCallback[stop]"], []);
    const newConversation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[newConversation]": ()=>{
            abortRef.current?.abort();
            setMessages([]);
            setConversationId(null);
            write(storageKey(userId), null);
        }
    }["useAssistant.useCallback[newConversation]"], [
        userId
    ]);
    const note = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAssistant.useCallback[note]": (text)=>setMessages({
                "useAssistant.useCallback[note]": (ms)=>[
                        ...ms,
                        {
                            id: uid(),
                            role: 'assistant',
                            text,
                            status: 'complete',
                            blocks: [],
                            actions: []
                        }
                    ]
            }["useAssistant.useCallback[note]"])
    }["useAssistant.useCallback[note]"], []);
    return {
        messages,
        conversationId,
        busy,
        status,
        context,
        conversations,
        send,
        stop,
        newConversation,
        loadStatus,
        refreshContext,
        loadConversation,
        loadConversations,
        note
    };
}
_s(useAssistant, "iqtLXbeO9t5+CCJ/lsIZSOXsUYA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/assistant/assistant-root.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantRoot",
    ()=>AssistantRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up.js [app-client] (ecmascript) <export default as ArrowUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/history.js [app-client] (ecmascript) <export default as History>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquarePlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square-plus.js [app-client] (ecmascript) <export default as MessageSquarePlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square.js [app-client] (ecmascript) <export default as Square>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/assistant/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$action$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/assistant/action-card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$blocks$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/assistant/blocks.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$rich$2d$text$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/assistant/rich-text.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$use$2d$assistant$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/assistant/use-assistant.ts [app-client] (ecmascript)");
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
const TOOL_LABEL = {
    attention_summary: 'Checking what needs attention',
    search_leads: 'Searching leads',
    get_lead: 'Reading the lead',
    list_appointments: 'Checking appointments',
    prepare_document: 'Preparing the document',
    list_document_templates: 'Looking up approved templates',
    meta_list_assets: 'Reading your Meta assets',
    meta_check_tracking: 'Checking what Meta received',
    meta_setup_status: 'Checking tracking status',
    meta_list_funnels: 'Listing funnels'
};
const META_RETURN = {
    denied: 'Meta authorization was cancelled, so nothing was connected.',
    invalid_state: 'That Meta login link expired or did not match your session, so nothing was connected. Please start again.',
    insufficient_permission: 'Meta did not grant the permission needed to read your ad accounts, so nothing was connected.',
    not_configured: 'Meta login is not set up on the server yet. An admin must add the Meta app settings first.',
    forbidden: 'Your account can’t connect Meta. Only HomeQuote admins and company owners can.',
    failed: 'Connecting Meta did not work. Nothing was saved; please try again.'
};
function useVisualViewportHeight(active) {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"])({
        "useVisualViewportHeight.useLayoutEffect": ()=>{
            if (!active || ("TURBOPACK compile-time value", "object") === 'undefined' || !window.visualViewport) return;
            const vv = window.visualViewport;
            const set = {
                "useVisualViewportHeight.useLayoutEffect.set": ()=>document.documentElement.style.setProperty('--hqn-vvh', `${vv.height}px`)
            }["useVisualViewportHeight.useLayoutEffect.set"];
            set();
            vv.addEventListener('resize', set);
            vv.addEventListener('scroll', set);
            return ({
                "useVisualViewportHeight.useLayoutEffect": ()=>{
                    vv.removeEventListener('resize', set);
                    vv.removeEventListener('scroll', set);
                    document.documentElement.style.removeProperty('--hqn-vvh');
                }
            })["useVisualViewportHeight.useLayoutEffect"];
        }
    }["useVisualViewportHeight.useLayoutEffect"], [
        active
    ]);
}
_s(useVisualViewportHeight, "n7/vCynhJvM+pLkyL2DMQUF0odM=");
function Inner({ userId, capabilities }) {
    _s1();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$use$2d$assistant$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssistant"])(userId);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('chat');
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const listRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fabRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const handledMeta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    useVisualViewportHeight(open);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Inner.useEffect": ()=>{
            document.documentElement.classList.toggle('hqn-assistant-open', open);
            return ({
                "Inner.useEffect": ()=>document.documentElement.classList.remove('hqn-assistant-open')
            })["Inner.useEffect"];
        }
    }["Inner.useEffect"], [
        open
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Inner.useEffect": ()=>{
            if (open) {
                void a.loadStatus();
                void a.refreshContext();
                setTimeout({
                    "Inner.useEffect": ()=>inputRef.current?.focus()
                }["Inner.useEffect"], 50);
            }
        }
    }["Inner.useEffect"], [
        open,
        pathname
    ]); // eslint-disable-line react-hooks/exhaustive-deps
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Inner.useEffect": ()=>{
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        }
    }["Inner.useEffect"], [
        a.messages,
        open,
        view
    ]);
    // Coming back from Meta's login page: open the panel, say what happened, and continue the setup once.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Inner.useEffect": ()=>{
            const meta = params.get('meta');
            if (!meta || handledMeta.current) return;
            handledMeta.current = true;
            setOpen(true);
            const next = new URLSearchParams(params.toString());
            next.delete('meta');
            router.replace(next.toString() ? `${pathname}?${next}` : pathname);
            if (meta === 'connected') void a.send('I just connected Meta. Continue setting up tracking.');
            else a.note(META_RETURN[meta] ?? META_RETURN.failed);
        }
    }["Inner.useEffect"], [
        params
    ]); // eslint-disable-line react-hooks/exhaustive-deps
    const close = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Inner.useCallback[close]": ()=>{
            setOpen(false);
            setTimeout({
                "Inner.useCallback[close]": ()=>fabRef.current?.focus()
            }["Inner.useCallback[close]"], 0);
        }
    }["Inner.useCallback[close]"], []);
    const submit = ()=>{
        const t = draft.trim();
        if (!t || a.busy) return;
        setDraft('');
        setView('chat');
        void a.send(t);
    };
    const pick = (kind, id, label)=>void a.send(`Use ${label} [${kind} ${id}]`);
    const setupBlocked = a.status && (!a.status.available || !a.status.enabled || !a.status.configured);
    const suggestions = [
        'What needs my attention today?',
        'Which leads haven’t been followed up with?',
        'What appointments do I have tomorrow?',
        ...a.context ? [
            `Brief me on ${a.context.label}`,
            `Draft a follow-up text for ${a.context.label}`
        ] : [],
        ...capabilities.documents ? [
            'Create a proposal'
        ] : [],
        ...capabilities.meta ? [
            'Set up tracking for a funnel'
        ] : []
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            !open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                ref: fabRef,
                type: "button",
                onClick: ()=>setOpen(true),
                "aria-label": `Open ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ASSISTANT_TITLE"]}`,
                "aria-expanded": false,
                "aria-controls": "hqn-assistant-panel",
                className: "fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#0A1B3D] text-white shadow-lg ring-1 ring-white/20 transition hover:scale-105 hover:bg-[#10285a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 bottom-[calc(var(--mnav-h,3.75rem)+env(safe-area-inset-bottom)+1rem)] lg:bottom-6 lg:right-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                    className: "size-6",
                    "aria-hidden": true
                }, void 0, false, {
                    fileName: "[project]/components/assistant/assistant-root.tsx",
                    lineNumber: 87,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 85,
                columnNumber: 9
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                id: "hqn-assistant-panel",
                role: "complementary",
                "aria-label": __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ASSISTANT_TITLE"],
                onKeyDown: (e)=>{
                    if (e.key === 'Escape') close();
                },
                style: {
                    height: 'var(--hqn-vvh, 100dvh)'
                },
                className: "fixed inset-x-0 top-0 z-50 flex flex-col bg-[#0A1B3D] text-white shadow-2xl lg:inset-x-auto lg:right-0 lg:w-[26rem] lg:border-l lg:border-white/10 pt-[env(safe-area-inset-top)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "flex items-center gap-1 border-b border-white/10 px-3 py-2.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                className: "size-4 text-sky-300",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 96,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "flex-1 text-sm font-semibold",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ASSISTANT_TITLE"]
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 97,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    a.newConversation();
                                    setView('chat');
                                },
                                "aria-label": "New conversation",
                                title: "New conversation",
                                className: "rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquarePlus$3e$__["MessageSquarePlus"], {
                                    className: "size-4",
                                    "aria-hidden": true
                                }, void 0, false, {
                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                    lineNumber: 98,
                                    columnNumber: 269
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 98,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    setView((v)=>v === 'history' ? 'chat' : 'history');
                                    void a.loadConversations();
                                },
                                "aria-label": "Recent conversations",
                                "aria-pressed": view === 'history',
                                title: "Recent conversations",
                                className: "rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__["History"], {
                                    className: "size-4",
                                    "aria-hidden": true
                                }, void 0, false, {
                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                    lineNumber: 99,
                                    columnNumber: 353
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 99,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: close,
                                "aria-label": "Close assistant",
                                className: "rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "size-4",
                                    "aria-hidden": true
                                }, void 0, false, {
                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                    lineNumber: 100,
                                    columnNumber: 201
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 100,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 95,
                        columnNumber: 11
                    }, this),
                    a.context && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "border-b border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80",
                        "data-testid": "assistant-context",
                        children: [
                            "Using: ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium text-white",
                                children: [
                                    "Lead · ",
                                    a.context.label
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 103,
                                columnNumber: 149
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 103,
                        columnNumber: 25
                    }, this),
                    view === 'history' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-white/60",
                                children: "Recent conversations"
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 107,
                                columnNumber: 15
                            }, this),
                            a.conversations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "px-1 text-sm text-white/70",
                                children: "No earlier conversations yet."
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 108,
                                columnNumber: 47
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "space-y-1.5",
                                children: a.conversations.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: async ()=>{
                                                if (await a.loadConversation(c.id)) setView('chat');
                                            },
                                            className: "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block truncate text-sm",
                                                    children: c.title
                                                }, void 0, false, {
                                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                                    lineNumber: 111,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block text-xs text-white/50",
                                                    children: new Date(c.updated_at).toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                                    lineNumber: 111,
                                                    columnNumber: 78
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/assistant/assistant-root.tsx",
                                            lineNumber: 110,
                                            columnNumber: 34
                                        }, this)
                                    }, c.id, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 110,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 109,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 106,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: listRef,
                        className: "flex-1 space-y-3 overflow-y-auto p-3",
                        role: "log",
                        "aria-live": "polite",
                        "aria-label": "Conversation",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "max-w-[92%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-semibold",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ASSISTANT_GREETING"]
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 118,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 text-sm text-white/80",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$assistant$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ASSISTANT_INTRO"]
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 119,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 117,
                                columnNumber: 15
                            }, this),
                            setupBlocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                role: "alert",
                                className: "rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100",
                                children: !a.status?.available ? 'The assistant isn’t available for your account.' : !a.status.enabled ? 'The assistant is turned off.' : 'The assistant isn’t set up yet. An admin needs to add the Anthropic API key (ANTHROPIC_API_KEY) on the server. You can still look around; nothing is lost.'
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 122,
                                columnNumber: 17
                            }, this),
                            a.messages.length === 0 && !setupBlocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-1.5",
                                children: suggestions.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>void a.send(s),
                                        className: "rounded-full border border-white/20 px-3 py-1.5 text-left text-xs text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                        children: s
                                    }, s, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 129,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 128,
                                columnNumber: 17
                            }, this),
                            a.messages.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Bubble, {
                                    m: m,
                                    busy: a.busy,
                                    onPick: pick,
                                    onRetry: ()=>m.error?.retryText && void a.send(m.error.retryText, {
                                            clientId: m.error.retryClientId
                                        })
                                }, m.id, false, {
                                    fileName: "[project]/components/assistant/assistant-root.tsx",
                                    lineNumber: 132,
                                    columnNumber: 36
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 116,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                        className: "border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                onSubmit: (e)=>{
                                    e.preventDefault();
                                    submit();
                                },
                                className: "flex items-end gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        htmlFor: "hqn-assistant-input",
                                        className: "sr-only",
                                        children: "Message the assistant"
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 138,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                        id: "hqn-assistant-input",
                                        ref: inputRef,
                                        value: draft,
                                        onChange: (e)=>setDraft(e.target.value),
                                        rows: 1,
                                        maxLength: 2000,
                                        disabled: !!setupBlocked,
                                        onKeyDown: (e)=>{
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                submit();
                                            }
                                        },
                                        placeholder: setupBlocked ? 'Assistant unavailable' : 'Ask about your leads, documents or tracking…',
                                        className: "max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 outline-none focus:border-sky-300 disabled:opacity-50 sm:text-sm"
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 139,
                                        columnNumber: 15
                                    }, this),
                                    a.busy ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: a.stop,
                                        "aria-label": "Stop",
                                        className: "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__["Square"], {
                                            className: "size-4 fill-current",
                                            "aria-hidden": true
                                        }, void 0, false, {
                                            fileName: "[project]/components/assistant/assistant-root.tsx",
                                            lineNumber: 144,
                                            columnNumber: 255
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 144,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "submit",
                                        disabled: !draft.trim() || !!setupBlocked,
                                        "aria-label": "Send",
                                        className: "flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-400 text-[#0A1B3D] hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUp$3e$__["ArrowUp"], {
                                            className: "size-5",
                                            "aria-hidden": true
                                        }, void 0, false, {
                                            fileName: "[project]/components/assistant/assistant-root.tsx",
                                            lineNumber: 146,
                                            columnNumber: 312
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/assistant/assistant-root.tsx",
                                        lineNumber: 146,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 137,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1.5 text-[11px] text-white/45",
                                children: "AI can make mistakes. It only sees records you’re allowed to see, and changes need your Confirm."
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 149,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 136,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 91,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s1(Inner, "Rn3ftFBFftDSJAFNqE8Ve+M2ZLc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$use$2d$assistant$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssistant"],
        useVisualViewportHeight
    ];
});
_c = Inner;
function Bubble({ m, busy, onPick, onRetry }) {
    if (m.role === 'user') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-sky-400 px-3 py-2 text-sm text-[#0A1B3D]",
        children: m.text
    }, void 0, false, {
        fileName: "[project]/components/assistant/assistant-root.tsx",
        lineNumber: 158,
        columnNumber: 33
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-[96%]",
        children: [
            m.text && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$rich$2d$text$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RichText"], {
                    text: m.text
                }, void 0, false, {
                    fileName: "[project]/components/assistant/assistant-root.tsx",
                    lineNumber: 161,
                    columnNumber: 83
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 161,
                columnNumber: 18
            }, this),
            m.blocks.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$blocks$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BlockView"], {
                    block: b,
                    onPick: onPick,
                    disabled: busy
                }, i, false, {
                    fileName: "[project]/components/assistant/assistant-root.tsx",
                    lineNumber: 162,
                    columnNumber: 31
                }, this)),
            m.actions.map((act)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$assistant$2f$action$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ActionCard"], {
                    initial: act
                }, act.id, false, {
                    fileName: "[project]/components/assistant/assistant-root.tsx",
                    lineNumber: 163,
                    columnNumber: 29
                }, this)),
            m.status === 'streaming' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "flex items-center gap-1.5 px-1 py-1 text-xs text-white/60",
                role: "status",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "size-3.5 animate-spin",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 164,
                        columnNumber: 123
                    }, this),
                    m.working ? TOOL_LABEL[m.working] ?? 'Working' : 'Thinking',
                    "…"
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 164,
                columnNumber: 36
            }, this),
            m.status === 'cancelled' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "px-1 py-1 text-xs text-white/50",
                children: "Stopped."
            }, void 0, false, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 165,
                columnNumber: 36
            }, this),
            m.status === 'error' && m.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                className: "mt-1 rounded-lg border border-rose-300/40 bg-rose-300/10 p-2.5 text-sm text-rose-100",
                children: [
                    m.error.message,
                    m.error.retryText && ![
                        'provider_auth',
                        'provider_billing',
                        'provider_limit',
                        'limit',
                        'not_configured'
                    ].includes(m.error.code) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onRetry,
                        className: "mt-1.5 flex items-center gap-1 text-xs font-medium text-white underline underline-offset-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                className: "size-3",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/assistant/assistant-root.tsx",
                                lineNumber: 170,
                                columnNumber: 156
                            }, this),
                            "Try again"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/assistant/assistant-root.tsx",
                        lineNumber: 170,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/assistant/assistant-root.tsx",
                lineNumber: 167,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/assistant/assistant-root.tsx",
        lineNumber: 160,
        columnNumber: 5
    }, this);
}
_c1 = Bubble;
function AssistantRoot(props) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: null,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Inner, {
            ...props
        }, void 0, false, {
            fileName: "[project]/components/assistant/assistant-root.tsx",
            lineNumber: 180,
            columnNumber: 36
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/assistant/assistant-root.tsx",
        lineNumber: 180,
        columnNumber: 10
    }, this);
}
_c2 = AssistantRoot;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Inner");
__turbopack_context__.k.register(_c1, "Bubble");
__turbopack_context__.k.register(_c2, "AssistantRoot");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_dddba7ab._.js.map