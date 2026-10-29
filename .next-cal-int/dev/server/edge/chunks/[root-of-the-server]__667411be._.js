(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__667411be._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/supabase/cookie-options.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/calls/redirect.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/supabase/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "updateSession",
    ()=>updateSession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$cookie$2d$options$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/cookie-options.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calls$2f$redirect$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/calls/redirect.ts [middleware-edge] (ecmascript)");
;
;
;
;
/**
 * A redirect built from scratch has none of the Set-Cookie headers that
 * getUser() just wrote when it refreshed the session. Dropping them strands the
 * browser with a rotated-away refresh token — the classic "random logout". Every
 * redirect therefore carries the refreshed cookies across.
 */ function redirectWithCookies(url, from) {
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    from.cookies.getAll().forEach((c)=>res.cookies.set(c));
    return res;
}
/** Network/5xx trouble reaching Supabase: says nothing about whether the session is valid. */ function isTransientAuthError(error) {
    if (!error) return false;
    return error.name === 'AuthRetryableFetchError' || typeof error.status === 'number' && error.status >= 500;
}
function retryPage() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"]('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=3><title>Reconnecting…</title><body style="font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><p>Reconnecting to HomeQuote…</p>', {
        status: 503,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'retry-after': '3'
        }
    });
}
async function updateSession(request) {
    let supabaseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request
    });
    // Public estimate routes and the Stripe webhook use their own scoped session cookie / webhook secret.
    // Avoid an unrelated Supabase Auth round trip on every quiz step and asset load.
    const publicPath = request.nextUrl.pathname;
    if (publicPath.startsWith('/estimate/') || publicPath.startsWith('/api/funnels/') || publicPath.startsWith('/api/stripe/')) return supabaseResponse;
    // Instant estimator pages, the iframe embed and its lead route are anonymous and need no Auth refresh.
    if (publicPath.startsWith('/estimator/') || publicPath.startsWith('/embed/estimator/') || publicPath.startsWith('/api/estimator/')) return supabaseResponse;
    // Public e-signing: signers have no HQN session; the token (never a cookie) is the credential.
    // Calendar subscribe feeds are fetched by Apple/Google Calendar with no session; the unguessable token is the credential.
    if (publicPath.startsWith('/api/calendar/feed/')) return supabaseResponse;
    // Homeowner booking: the slot picker API, the token-linked manage page and its .ics need no session.
    if (publicPath.startsWith('/api/booking/') || publicPath.startsWith('/booking/') || publicPath.startsWith('/book/manage/')) return supabaseResponse;
    if (publicPath === '/sign' || publicPath.startsWith('/api/signing/')) return supabaseResponse;
    // Seret API (MCP): authenticated by its own API key, never a session.
    if (publicPath === '/api/seret/mcp') return supabaseResponse;
    // HomeQuote MCP for Claude: authenticated by its own hq_ key, never a session.
    if (publicPath === '/api/mcp') return supabaseResponse;
    // The service worker and manifest are fetched by the browser itself (often in the
    // background): they need no session and must not trigger a token refresh.
    if (publicPath === '/sw.js' || publicPath === '/manifest.webmanifest' || publicPath === '/offline.html') return supabaseResponse;
    // Guard: if the Supabase env vars aren't present in this build, don't throw
    // (which would 500 the entire site via MIDDLEWARE_INVOCATION_FAILED). Skip the
    // auth refresh and let the request through; pages handle auth themselves.
    const supabaseUrl = ("TURBOPACK compile-time value", "http://127.0.0.1:54399");
    const supabaseAnonKey = ("TURBOPACK compile-time value", "preview-anon");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseAnonKey, {
        cookieOptions: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$cookie$2d$options$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["supabaseCookieOptions"],
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value })=>request.cookies.set(name, value));
                supabaseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request
                });
                cookiesToSet.forEach(({ name, value, options })=>supabaseResponse.cookies.set(name, value, options));
            }
        }
    });
    // IMPORTANT: do not run any logic between createServerClient and getUser().
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const { pathname, search } = request.nextUrl;
    // Match the /app segment exactly — a bare `startsWith('/app')` also catches
    // public marketing routes like /apply.
    const isProtected = pathname === '/app' || pathname.startsWith('/app/');
    // Seret studio (static files in public/studio/) has no page of its own to run requireRole, so it is gated here: admins only.
    const isStudio = pathname === '/studio' || pathname.startsWith('/studio/');
    const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';
    // Supabase unreachable (offline, wake from sleep, brief outage): that is NOT
    // "signed out". The cookie is left untouched; show a self-retrying page rather
    // than bouncing the user to sign-in.
    if (!user && isTransientAuthError(authError)) {
        return isProtected || isStudio ? retryPage() : supabaseResponse;
    }
    // Not signed in and trying to reach the app → send to sign-in, remembering
    // where they were going (returnTo) so signing in lands them back there — e.g.
    // a tapped push notification. Only the path is carried, never a host, and the
    // sign-in action re-validates it (safeNextPath).
    if (!user && (isProtected || isStudio)) {
        const url = request.nextUrl.clone();
        url.pathname = '/sign-in';
        url.search = '';
        url.searchParams.set('returnTo', `${pathname}${search}`);
        return redirectWithCookies(url, supabaseResponse);
    }
    // Signed in but not an active admin → back to their own home. Fails closed: no profile row means no studio.
    if (user && isStudio) {
        const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin' || !profile.is_active) {
            const url = request.nextUrl.clone();
            url.pathname = '/app';
            url.search = '';
            return redirectWithCookies(url, supabaseResponse);
        }
    }
    // Already signed in and visiting an auth page → into the app. /app itself
    // knows each role's home (a caller is sent on to /app/calls), so a plain
    // /app is enough here; a returnTo the visitor arrived with is kept.
    if (user && isAuthPage) {
        const url = request.nextUrl.clone();
        const next = url.searchParams.get('returnTo') ?? url.searchParams.get('next');
        url.search = '';
        const dest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calls$2f$redirect$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["safeNextPath"])(next, '/app');
        url.pathname = dest.split('?')[0];
        const qs = dest.split('?')[1];
        if (qs) url.search = `?${qs}`;
        return redirectWithCookies(url, supabaseResponse);
    }
    return supabaseResponse;
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/middleware.ts [middleware-edge] (ecmascript)");
;
async function middleware(request) {
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["updateSession"])(request);
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public image assets
     */ '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__667411be._.js.map