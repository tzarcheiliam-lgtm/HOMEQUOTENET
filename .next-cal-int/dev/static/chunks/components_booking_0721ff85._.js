(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
]);

//# sourceMappingURL=components_booking_0721ff85._.js.map