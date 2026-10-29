(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/components/ui/select.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Select",
    ()=>Select
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
// A lightweight styled native <select>. Keeps forms simple and dependency-free;
// good enough for the CRM's dropdowns.
//
// The closed control names its own background and text rather than inheriting
// them: a <select> that is transparent with an inherited colour is readable
// only for as long as whatever sits behind it stays the colour we assumed. The
// popup half of this — the <option> rows — is handled once in globals.css,
// since the browser draws that list outside the page.
function Select({ className, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
        "data-slot": "select",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('border-input bg-background text-foreground flex h-11 w-full rounded-md border px-3 py-1 text-base shadow-xs lg:h-9 transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', 'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]', 'aria-invalid:ring-destructive/20 aria-invalid:border-destructive', className),
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui/select.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = Select;
;
var _c;
__turbopack_context__.k.register(_c, "Select");
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
"[project]/lib/actions/data:45455b [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"609f12959a25e9332b2a1b1eb8e589b9516f56eaa8":"saveAvailabilitySettings"},"lib/actions/availability.ts",""] */ __turbopack_context__.s([
    "saveAvailabilitySettings",
    ()=>saveAvailabilitySettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var saveAvailabilitySettings = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("609f12959a25e9332b2a1b1eb8e589b9516f56eaa8", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "saveAvailabilitySettings"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXZhaWxhYmlsaXR5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyByZXZhbGlkYXRlUGF0aCB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyByZXF1aXJlUHJvZmlsZSB9IGZyb20gJ0AvbGliL2F1dGgnO1xuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC9saWIvc3VwYWJhc2Uvc2VydmVyJztcbmltcG9ydCB7IGNyZWF0ZUFkbWluQ2xpZW50IH0gZnJvbSAnQC9saWIvc3VwYWJhc2UvYWRtaW4nO1xuaW1wb3J0IHsgY2hlY2tDb250cmFjdG9yU2xvdCB9IGZyb20gJ0AvbGliL2F2YWlsYWJpbGl0eS9lbmZvcmNlLnNlcnZlcic7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBkZWNyeXB0Q2FsZW5kYXJTZWNyZXQsIHNpdGVVcmwgfSBmcm9tICdAL2xpYi9jYWxlbmRhci9jb25maWcnO1xuaW1wb3J0IHsgcmV2b2tlVG9rZW4gfSBmcm9tICdAL2xpYi9jYWxlbmRhci9nb29nbGUnO1xuaW1wb3J0IHR5cGUgeyBQcm9maWxlIH0gZnJvbSAnQC9saWIvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBBdmFpbGFiaWxpdHlTdGF0ZSA9IHsgZXJyb3I/OiBzdHJpbmc7IHN1Y2Nlc3M/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcblxuLyoqIFdoaWNoIGNvbXBhbnkncyBhdmFpbGFiaWxpdHkgdGhpcyB1c2VyIG1heSBlZGl0OiBvd25lcnMgdGhlaXIgb3duLCBhZG1pbnMgYW55IChwYXNzZWQgZXhwbGljaXRseSkuICovXG5hc3luYyBmdW5jdGlvbiBlZGl0YWJsZUNvbnRyYWN0b3IocmVxdWVzdGVkOiBzdHJpbmcgfCBudWxsKTogUHJvbWlzZTx7IHByb2ZpbGU6IFByb2ZpbGU7IGNvbnRyYWN0b3JJZDogc3RyaW5nIH0+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGlmIChwcm9maWxlLnJvbGUgPT09ICdhZG1pbicpIHtcbiAgICBpZiAoIXJlcXVlc3RlZCkgdGhyb3cgbmV3IEVycm9yKCdQaWNrIGEgY29udHJhY3RvcicpO1xuICAgIHJldHVybiB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZDogcmVxdWVzdGVkIH07XG4gIH1cbiAgaWYgKHByb2ZpbGUucm9sZSA9PT0gJ2NvbnRyYWN0b3InICYmIHByb2ZpbGUuY29udHJhY3Rvcl9yb2xlID09PSAnb3duZXInICYmIHByb2ZpbGUuY29udHJhY3Rvcl9pZCkge1xuICAgIHJldHVybiB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZDogcHJvZmlsZS5jb250cmFjdG9yX2lkIH07XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IHRoZSBjb250cmFjdG9yIG93bmVyIG9yIGEgSG9tZVF1b3RlIGFkbWluIGNhbiBjaGFuZ2UgYXZhaWxhYmlsaXR5Jyk7XG59XG5cbmZ1bmN0aW9uIGZhaWwoZTogdW5rbm93bik6IHsgZXJyb3I6IHN0cmluZyB9IHtcbiAgcmV0dXJuIHsgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6ICdTb21ldGhpbmcgd2VudCB3cm9uZycgfTtcbn1cblxuZnVuY3Rpb24gcmVmcmVzaCgpIHtcbiAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvYXZhaWxhYmlsaXR5Jyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NvbnRyYWN0b3JzL1tpZF0nLCAncGFnZScpO1xufVxuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgdGltZXpvbmU6IHouc3RyaW5nKCkucmVmaW5lKGlzVmFsaWRUaW1lWm9uZSwgJ1BpY2sgYSB2YWxpZCB0aW1lIHpvbmUnKSxcbiAgd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQ6IHouYm9vbGVhbigpLFxuICBtaW5fbm90aWNlX2hvdXJzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDcyMCksXG4gIGJ1ZmZlcl9taW51dGVzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDQ4MCksXG4gIG1heF9hcHBvaW50bWVudHNfcGVyX2RheTogei5jb2VyY2UubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCg1MCkubnVsbGFibGUoKSxcbiAgZGVmYXVsdF9kdXJhdGlvbl9taW51dGVzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMTUpLm1heCg0ODApLFxufSk7XG5cbmNvbnN0IGZpZWxkID0gKGY6IEZvcm1EYXRhLCBrOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgdiA9IGYuZ2V0KGspO1xuICByZXR1cm4gdiA9PT0gbnVsbCA/IG51bGwgOiBTdHJpbmcodikudHJpbSgpO1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVBdmFpbGFiaWxpdHlTZXR0aW5ncyhfcHJldjogQXZhaWxhYmlsaXR5U3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8QXZhaWxhYmlsaXR5U3RhdGU+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZCB9ID0gYXdhaXQgZWRpdGFibGVDb250cmFjdG9yKGZpZWxkKGZvcm1EYXRhLCAnY29udHJhY3Rvcl9pZCcpIHx8IG51bGwpO1xuICAgIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgICB0aW1lem9uZTogZmllbGQoZm9ybURhdGEsICd0aW1lem9uZScpLFxuICAgICAgd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQ6IGZvcm1EYXRhLmdldCgnd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQnKSA9PT0gJ29uJyxcbiAgICAgIG1pbl9ub3RpY2VfaG91cnM6IGZpZWxkKGZvcm1EYXRhLCAnbWluX25vdGljZV9ob3VycycpIHx8IDAsXG4gICAgICBidWZmZXJfbWludXRlczogZmllbGQoZm9ybURhdGEsICdidWZmZXJfbWludXRlcycpIHx8IDAsXG4gICAgICBtYXhfYXBwb2ludG1lbnRzX3Blcl9kYXk6IGZpZWxkKGZvcm1EYXRhLCAnbWF4X2FwcG9pbnRtZW50c19wZXJfZGF5JykgPyBmaWVsZChmb3JtRGF0YSwgJ21heF9hcHBvaW50bWVudHNfcGVyX2RheScpIDogbnVsbCxcbiAgICAgIGRlZmF1bHRfZHVyYXRpb25fbWludXRlczogZmllbGQoZm9ybURhdGEsICdkZWZhdWx0X2R1cmF0aW9uX21pbnV0ZXMnKSB8fCA2MCxcbiAgICB9KTtcbiAgICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBlcnJvcjogcGFyc2VkLmVycm9yLmlzc3Vlc1swXT8ubWVzc2FnZSA/PyAnQ2hlY2sgdGhlIHNldHRpbmdzJyB9O1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdjb250cmFjdG9yX2F2YWlsYWJpbGl0eV9zZXR0aW5ncycpXG4gICAgICAudXBzZXJ0KHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkLCAuLi5wYXJzZWQuZGF0YSwgdXBkYXRlZF9ieTogcHJvZmlsZS5pZCB9LCB7IG9uQ29uZmxpY3Q6ICdjb250cmFjdG9yX2lkJyB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgcmVmcmVzaCgpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6ICdTZXR0aW5ncyBzYXZlZCcgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWlsKGUpO1xuICB9XG59XG5cbmNvbnN0IHJ1bGVTY2hlbWEgPSB6XG4gIC5vYmplY3QoeyB3ZWVrZGF5OiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoNiksIHN0YXJ0TWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoMTQzOSksIGVuZE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMSkubWF4KDE0NDApIH0pXG4gIC5yZWZpbmUoKHIpID0+IHIuZW5kTWludXRlID4gci5zdGFydE1pbnV0ZSwgJ0VuZCB0aW1lIG11c3QgYmUgYWZ0ZXIgc3RhcnQgdGltZScpO1xuXG4vKiogUmVwbGFjZSB0aGUgd2hvbGUgd2Vla2x5IHNjaGVkdWxlLiBJbnNlcnRzIGZpcnN0LCB0aGVuIHJlbW92ZXMgdGhlIG9sZCByb3dzLCBzbyBhIGZhaWx1cmUgbmV2ZXIgbGVhdmVzIGFuIGVtcHR5IHNjaGVkdWxlLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVXZWVrbHlTY2hlZHVsZShfcHJldjogQXZhaWxhYmlsaXR5U3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8QXZhaWxhYmlsaXR5U3RhdGU+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGNvbnRyYWN0b3JJZCB9ID0gYXdhaXQgZWRpdGFibGVDb250cmFjdG9yKGZpZWxkKGZvcm1EYXRhLCAnY29udHJhY3Rvcl9pZCcpIHx8IG51bGwpO1xuICAgIGxldCByYXc6IHVua25vd247XG4gICAgdHJ5IHtcbiAgICAgIHJhdyA9IEpTT04ucGFyc2UoZmllbGQoZm9ybURhdGEsICdydWxlcycpIHx8ICdbXScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHsgZXJyb3I6ICdDb3VsZCBub3QgcmVhZCB0aGUgc2NoZWR1bGUnIH07XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZCA9IHouYXJyYXkocnVsZVNjaGVtYSkubWF4KDcwKS5zYWZlUGFyc2UocmF3KTtcbiAgICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBlcnJvcjogcGFyc2VkLmVycm9yLmlzc3Vlc1swXT8ubWVzc2FnZSA/PyAnQ2hlY2sgdGhlIHNjaGVkdWxlJyB9O1xuICAgIC8vIFJlamVjdCBvdmVybGFwcGluZyB3aW5kb3dzIG9uIHRoZSBzYW1lIGRheS5cbiAgICBjb25zdCBieURheSA9IG5ldyBNYXA8bnVtYmVyLCB7IHN0YXJ0TWludXRlOiBudW1iZXI7IGVuZE1pbnV0ZTogbnVtYmVyIH1bXT4oKTtcbiAgICBmb3IgKGNvbnN0IHIgb2YgcGFyc2VkLmRhdGEpIGJ5RGF5LnNldChyLndlZWtkYXksIFsuLi4oYnlEYXkuZ2V0KHIud2Vla2RheSkgPz8gW10pLCByXSk7XG4gICAgZm9yIChjb25zdCBsaXN0IG9mIGJ5RGF5LnZhbHVlcygpKSB7XG4gICAgICBsaXN0LnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykgaWYgKGxpc3RbaV0uc3RhcnRNaW51dGUgPCBsaXN0W2kgLSAxXS5lbmRNaW51dGUpIHJldHVybiB7IGVycm9yOiAnVGltZSB3aW5kb3dzIG9uIHRoZSBzYW1lIGRheSBjYW5ub3Qgb3ZlcmxhcCcgfTtcbiAgICB9XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCB7IGRhdGE6IG9sZCB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnY29udHJhY3Rvcl9hdmFpbGFiaWxpdHlfcnVsZXMnKS5zZWxlY3QoJ2lkJykuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjb250cmFjdG9ySWQpO1xuICAgIGlmIChwYXJzZWQuZGF0YS5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X3J1bGVzJykuaW5zZXJ0KFxuICAgICAgICBwYXJzZWQuZGF0YS5tYXAoKHIpID0+ICh7IGNvbnRyYWN0b3JfaWQ6IGNvbnRyYWN0b3JJZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICAgKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICB9XG4gICAgY29uc3Qgb2xkSWRzID0gKG9sZCA/PyBbXSkubWFwKChyOiB7IGlkOiBzdHJpbmcgfSkgPT4gci5pZCk7XG4gICAgaWYgKG9sZElkcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X3J1bGVzJykuZGVsZXRlKCkuaW4oJ2lkJywgb2xkSWRzKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICB9XG4gICAgcmVmcmVzaCgpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6ICdXZWVrbHkgc2NoZWR1bGUgc2F2ZWQnIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG4vKiogQWRtaW46IHRoZSBob3VycyBnaXZlbiB0byBhbnkgY29udHJhY3RvciB3aG8gaGFzIG5vdCBzZXQgdGhlaXIgb3duLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVEZWZhdWx0SG91cnMoX3ByZXY6IEF2YWlsYWJpbGl0eVN0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPEF2YWlsYWJpbGl0eVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gICAgaWYgKHByb2ZpbGUucm9sZSAhPT0gJ2FkbWluJykgcmV0dXJuIHsgZXJyb3I6ICdPbmx5IGEgSG9tZVF1b3RlIGFkbWluIGNhbiBjaGFuZ2UgdGhlIGRlZmF1bHQgaG91cnMnIH07XG4gICAgbGV0IHJhdzogdW5rbm93bjtcbiAgICB0cnkge1xuICAgICAgcmF3ID0gSlNPTi5wYXJzZShmaWVsZChmb3JtRGF0YSwgJ3J1bGVzJykgfHwgJ1tdJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBzY2hlZHVsZScgfTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VkID0gei5hcnJheShydWxlU2NoZW1hKS5tYXgoNzApLnNhZmVQYXJzZShyYXcpO1xuICAgIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgc2NoZWR1bGUnIH07XG4gICAgY29uc3QgYnlEYXkgPSBuZXcgTWFwPG51bWJlciwgeyBzdGFydE1pbnV0ZTogbnVtYmVyOyBlbmRNaW51dGU6IG51bWJlciB9W10+KCk7XG4gICAgZm9yIChjb25zdCByIG9mIHBhcnNlZC5kYXRhKSBieURheS5zZXQoci53ZWVrZGF5LCBbLi4uKGJ5RGF5LmdldChyLndlZWtkYXkpID8/IFtdKSwgcl0pO1xuICAgIGZvciAoY29uc3QgbGlzdCBvZiBieURheS52YWx1ZXMoKSkge1xuICAgICAgbGlzdC5zb3J0KChhLCBiKSA9PiBhLnN0YXJ0TWludXRlIC0gYi5zdGFydE1pbnV0ZSk7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIGlmIChsaXN0W2ldLnN0YXJ0TWludXRlIDwgbGlzdFtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ1RpbWUgd2luZG93cyBvbiB0aGUgc2FtZSBkYXkgY2Fubm90IG92ZXJsYXAnIH07XG4gICAgfVxuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGNyZWF0ZUFkbWluQ2xpZW50KClcbiAgICAgIC5mcm9tKCdhdmFpbGFiaWxpdHlfZGVmYXVsdHMnKVxuICAgICAgLnVwc2VydCh7IGlkOiB0cnVlLCBydWxlczogcGFyc2VkLmRhdGEsIHVwZGF0ZWRfYnk6IHByb2ZpbGUuaWQsIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9LCB7IG9uQ29uZmxpY3Q6ICdpZCcgfSk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCBzYXZlLiBIYXMgdGhlIGxhdGVzdCBkYXRhYmFzZSB1cGRhdGUgYmVlbiBhcHBsaWVkPycgfTtcbiAgICByZWZyZXNoKCk7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogJ0RlZmF1bHQgaG91cnMgc2F2ZWQnIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG5jb25zdCBkYXRlUmUgPSAvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC87XG5jb25zdCBleGNlcHRpb25TY2hlbWEgPSB6XG4gIC5vYmplY3Qoe1xuICAgIGtpbmQ6IHouZW51bShbJ2Jsb2NrZWQnLCAnYXZhaWxhYmxlJ10pLFxuICAgIGRhdGVfc3RhcnQ6IHouc3RyaW5nKCkucmVnZXgoZGF0ZVJlLCAnUGljayBhIHN0YXJ0IGRhdGUnKSxcbiAgICBkYXRlX2VuZDogei5zdHJpbmcoKS5yZWdleChkYXRlUmUsICdQaWNrIGFuIGVuZCBkYXRlJyksXG4gICAgc3RhcnRfbWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoMTQzOSkubnVsbGFibGUoKSxcbiAgICBlbmRfbWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigxKS5tYXgoMTQ0MCkubnVsbGFibGUoKSxcbiAgICBub3RlOiB6LnN0cmluZygpLm1heCgzMDApLm51bGxhYmxlKCksXG4gICAgcmVwZWF0X3dlZWtseTogei5ib29sZWFuKCksXG4gICAgcmVwZWF0X3VudGlsOiB6LnN0cmluZygpLnJlZ2V4KGRhdGVSZSkubnVsbGFibGUoKSxcbiAgfSlcbiAgLnN1cGVyUmVmaW5lKCh2LCBjdHgpID0+IHtcbiAgICBpZiAodi5kYXRlX2VuZCA8IHYuZGF0ZV9zdGFydCkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdFbmQgZGF0ZSBpcyBiZWZvcmUgdGhlIHN0YXJ0IGRhdGUnIH0pO1xuICAgIGlmICgodi5zdGFydF9taW51dGUgPT09IG51bGwpICE9PSAodi5lbmRfbWludXRlID09PSBudWxsKSkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdTZXQgYm90aCBhIHN0YXJ0IGFuZCBlbmQgdGltZSwgb3IgbmVpdGhlciBmb3IgdGhlIHdob2xlIGRheScgfSk7XG4gICAgaWYgKHYuc3RhcnRfbWludXRlICE9PSBudWxsICYmIHYuZW5kX21pbnV0ZSAhPT0gbnVsbCAmJiB2LmVuZF9taW51dGUgPD0gdi5zdGFydF9taW51dGUpIGN0eC5hZGRJc3N1ZSh7IGNvZGU6ICdjdXN0b20nLCBtZXNzYWdlOiAnRW5kIHRpbWUgbXVzdCBiZSBhZnRlciBzdGFydCB0aW1lJyB9KTtcbiAgICBpZiAodi5yZXBlYXRfd2Vla2x5ICYmIHYuZGF0ZV9lbmQgIT09IHYuZGF0ZV9zdGFydCkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdXZWVrbHkgcmVwZWF0cyBhcHBseSB0byBhIHNpbmdsZSBzdGFydGluZyBkYXknIH0pO1xuICAgIGlmICh2LnJlcGVhdF91bnRpbCAmJiAoIXYucmVwZWF0X3dlZWtseSB8fCB2LnJlcGVhdF91bnRpbCA8IHYuZGF0ZV9zdGFydCkpIGN0eC5hZGRJc3N1ZSh7IGNvZGU6ICdjdXN0b20nLCBtZXNzYWdlOiAnUmVwZWF0LXVudGlsIG11c3QgYmUgYWZ0ZXIgdGhlIHN0YXJ0IGRhdGUnIH0pO1xuICB9KTtcblxuZnVuY3Rpb24gbWludXRlRnJvbSh0aW1lOiBzdHJpbmcgfCBudWxsKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICghdGltZSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IG0gPSAvXihcXGR7Mn0pOihcXGR7Mn0pJC8uZXhlYyh0aW1lKTtcbiAgcmV0dXJuIG0gPyBOdW1iZXIobVsxXSkgKiA2MCArIE51bWJlcihtWzJdKSA6IG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRBdmFpbGFiaWxpdHlFeGNlcHRpb24oX3ByZXY6IEF2YWlsYWJpbGl0eVN0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPEF2YWlsYWJpbGl0eVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBwcm9maWxlLCBjb250cmFjdG9ySWQgfSA9IGF3YWl0IGVkaXRhYmxlQ29udHJhY3RvcihmaWVsZChmb3JtRGF0YSwgJ2NvbnRyYWN0b3JfaWQnKSB8fCBudWxsKTtcbiAgICBjb25zdCBhbGxEYXkgPSBmb3JtRGF0YS5nZXQoJ2FsbF9kYXknKSA9PT0gJ29uJztcbiAgICBjb25zdCBzdGFydCA9IGFsbERheSA/IG51bGwgOiBtaW51dGVGcm9tKGZpZWxkKGZvcm1EYXRhLCAnc3RhcnRfdGltZScpKTtcbiAgICAvLyBcIjI0OjAwXCIgaXMgbm90IGEgdmFsaWQgPGlucHV0IHR5cGU9dGltZT4gdmFsdWU7IGFuIGVuZCBvZiAwMDowMCBtZWFucyBtaWRuaWdodC5cbiAgICBsZXQgZW5kID0gYWxsRGF5ID8gbnVsbCA6IG1pbnV0ZUZyb20oZmllbGQoZm9ybURhdGEsICdlbmRfdGltZScpKTtcbiAgICBpZiAoIWFsbERheSAmJiBlbmQgPT09IDApIGVuZCA9IDE0NDA7XG4gICAgY29uc3QgZGF0ZVN0YXJ0ID0gZmllbGQoZm9ybURhdGEsICdkYXRlX3N0YXJ0JykgPz8gJyc7XG4gICAgY29uc3QgcmVwZWF0ID0gZm9ybURhdGEuZ2V0KCdyZXBlYXRfd2Vla2x5JykgPT09ICdvbic7XG4gICAgY29uc3QgcGFyc2VkID0gZXhjZXB0aW9uU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgICBraW5kOiBmaWVsZChmb3JtRGF0YSwgJ2tpbmQnKSA9PT0gJ2F2YWlsYWJsZScgPyAnYXZhaWxhYmxlJyA6ICdibG9ja2VkJyxcbiAgICAgIGRhdGVfc3RhcnQ6IGRhdGVTdGFydCxcbiAgICAgIGRhdGVfZW5kOiByZXBlYXQgPyBkYXRlU3RhcnQgOiBmaWVsZChmb3JtRGF0YSwgJ2RhdGVfZW5kJykgfHwgZGF0ZVN0YXJ0LFxuICAgICAgc3RhcnRfbWludXRlOiBzdGFydCxcbiAgICAgIGVuZF9taW51dGU6IGVuZCxcbiAgICAgIG5vdGU6IGZpZWxkKGZvcm1EYXRhLCAnbm90ZScpIHx8IG51bGwsXG4gICAgICByZXBlYXRfd2Vla2x5OiByZXBlYXQsXG4gICAgICByZXBlYXRfdW50aWw6IHJlcGVhdCA/IGZpZWxkKGZvcm1EYXRhLCAncmVwZWF0X3VudGlsJykgfHwgbnVsbCA6IG51bGwsXG4gICAgfSk7XG4gICAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBkYXRlcycgfTtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X2V4Y2VwdGlvbnMnKS5pbnNlcnQoeyBjb250cmFjdG9yX2lkOiBjb250cmFjdG9ySWQsIGNyZWF0ZWRfYnk6IHByb2ZpbGUuaWQsIC4uLnBhcnNlZC5kYXRhIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICByZWZyZXNoKCk7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogcGFyc2VkLmRhdGEua2luZCA9PT0gJ2Jsb2NrZWQnID8gJ1RpbWUgYmxvY2tlZCBvZmYnIDogJ0V4dHJhIGF2YWlsYWJpbGl0eSBhZGRlZCcgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWlsKGUpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVBdmFpbGFiaWxpdHlFeGNlcHRpb24oZm9ybURhdGE6IEZvcm1EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBjb250cmFjdG9ySWQgfSA9IGF3YWl0IGVkaXRhYmxlQ29udHJhY3RvcihmaWVsZChmb3JtRGF0YSwgJ2NvbnRyYWN0b3JfaWQnKSB8fCBudWxsKTtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnaWQnKTtcbiAgICBpZiAoIWlkKSByZXR1cm47XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBhd2FpdCBzdXBhYmFzZS5mcm9tKCdjb250cmFjdG9yX2F2YWlsYWJpbGl0eV9leGNlcHRpb25zJykuZGVsZXRlKCkuZXEoJ2lkJywgaWQpLmVxKCdjb250cmFjdG9yX2lkJywgY29udHJhY3RvcklkKTtcbiAgICByZWZyZXNoKCk7XG4gIH0gY2F0Y2gge1xuICAgIC8qIG5vdCBwZXJtaXR0ZWQ6IG5vdGhpbmcgY2hhbmdlcyAqL1xuICB9XG59XG5cbi8qKiBTdGFmZiBzY2hlZHVsaW5nIFVJOiBkb2VzIHRoaXMgdGltZSB3b3JrIGZvciB0aGUgY29udHJhY3RvciBiZWhpbmQgYW4gYXNzaWdubWVudD8gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0FwcG9pbnRtZW50U2xvdChhc3NpZ25tZW50SWQ6IHN0cmluZywgZGF0ZVRpbWU6IHN0cmluZyk6IFByb21pc2U8eyBvazogYm9vbGVhbjsgbWVzc2FnZT86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgcmVxdWlyZVByb2ZpbGUoKTtcbiAgICBpZiAoIWFzc2lnbm1lbnRJZCB8fCAhZGF0ZVRpbWUpIHJldHVybiB7IG9rOiB0cnVlIH07XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICAvLyBSTFM6IHRoaXMgb25seSByZXNvbHZlcyBmb3IgYW4gYXNzaWdubWVudCB0aGUgY2FsbGVyIGNhbiBzZWUuXG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdsZWFkX2Fzc2lnbm1lbnRzJykuc2VsZWN0KCdjb250cmFjdG9yX2lkJykuZXEoJ2lkJywgYXNzaWdubWVudElkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YT8uY29udHJhY3Rvcl9pZCkgcmV0dXJuIHsgb2s6IHRydWUgfTtcbiAgICBjb25zdCBjaGVjayA9IGF3YWl0IGNoZWNrQ29udHJhY3RvclNsb3QoZGF0YS5jb250cmFjdG9yX2lkLCBkYXRlVGltZSk7XG4gICAgcmV0dXJuIHsgb2s6IGNoZWNrLm9rLCBtZXNzYWdlOiBjaGVjay5tZXNzYWdlIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XG4gIH1cbn1cblxuLy8gLS0tIGNhbGVuZGFyIGNvbm5lY3Rpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmFzeW5jIGZ1bmN0aW9uIG93bkNvbm5lY3Rpb24oY29ubmVjdGlvbklkOiBzdHJpbmcpIHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IGRiID0gY3JlYXRlQWRtaW5DbGllbnQoKTtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9jb25uZWN0aW9ucycpLnNlbGVjdCgnaWQsIHVzZXJfaWQsIGVuY3J5cHRlZF9jcmVkZW50aWFscywgcHJvdmlkZXInKS5lcSgnaWQnLCBjb25uZWN0aW9uSWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSB8fCBkYXRhLnVzZXJfaWQgIT09IHByb2ZpbGUuaWQpIHRocm93IG5ldyBFcnJvcignQ29ubmVjdGlvbiBub3QgZm91bmQnKTtcbiAgcmV0dXJuIHsgZGIsIGNvbm5lY3Rpb246IGRhdGEgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2Nvbm5lY3RDYWxlbmRhcihmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnY29ubmVjdGlvbl9pZCcpO1xuICAgIGlmICghaWQpIHJldHVybjtcbiAgICBjb25zdCB7IGRiLCBjb25uZWN0aW9uIH0gPSBhd2FpdCBvd25Db25uZWN0aW9uKGlkKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgcmV2b2tlVG9rZW4oZGVjcnlwdENhbGVuZGFyU2VjcmV0KGNvbm5lY3Rpb24uZW5jcnlwdGVkX2NyZWRlbnRpYWxzKSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBrZXkgbWlzc2luZyBvciB0b2tlbiB1bnJlYWRhYmxlOiBzdGlsbCBkZWxldGUgb3VyIGNvcHkgKi9cbiAgICB9XG4gICAgYXdhaXQgZGIuZnJvbSgnY2FsZW5kYXJfY29ubmVjdGlvbnMnKS5kZWxldGUoKS5lcSgnaWQnLCBpZCk7XG4gICAgcmVmcmVzaCgpO1xuICB9IGNhdGNoIHtcbiAgICAvKiBpZ25vcmUgKi9cbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FsZW5kYXJQcmVmZXJlbmNlcyhmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnY29ubmVjdGlvbl9pZCcpO1xuICAgIGlmICghaWQpIHJldHVybjtcbiAgICBjb25zdCB7IGRiIH0gPSBhd2FpdCBvd25Db25uZWN0aW9uKGlkKTtcbiAgICBhd2FpdCBkYlxuICAgICAgLmZyb20oJ2NhbGVuZGFyX2Nvbm5lY3Rpb25zJylcbiAgICAgIC51cGRhdGUoeyBwdXNoX2FwcG9pbnRtZW50czogZm9ybURhdGEuZ2V0KCdwdXNoX2FwcG9pbnRtZW50cycpID09PSAnb24nLCBpbXBvcnRfYnVzeTogZm9ybURhdGEuZ2V0KCdpbXBvcnRfYnVzeScpID09PSAnb24nIH0pXG4gICAgICAuZXEoJ2lkJywgaWQpO1xuICAgIHJlZnJlc2goKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cblxuLyoqIENyZWF0ZSB0aGUgdXNlcidzIHByaXZhdGUgZmVlZCBsaW5rLCBvciByZXR1cm4gdGhlIGV4aXN0aW5nIG9uZSAobmV2ZXIgc2lsZW50bHkgcm90YXRlcyBhIGxpdmUgc3Vic2NyaXB0aW9uKS4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPckNyZWF0ZUZlZWRVcmwocm90YXRlID0gZmFsc2UpOiBQcm9taXNlPHsgdXJsPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gICAgaWYgKHByb2ZpbGUucm9sZSAhPT0gJ2NvbnRyYWN0b3InIHx8ICFwcm9maWxlLmNvbnRyYWN0b3JfaWQpIHJldHVybiB7IGVycm9yOiAnT25seSBjb250cmFjdG9yIHVzZXJzIGhhdmUgYSBjYWxlbmRhciBmZWVkJyB9O1xuICAgIGNvbnN0IGRiID0gY3JlYXRlQWRtaW5DbGllbnQoKTtcbiAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nIH0gPSBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9mZWVkX3Rva2VucycpLnNlbGVjdCgnaWQsIHRva2VuJykuZXEoJ3VzZXJfaWQnLCBwcm9maWxlLmlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmIChleGlzdGluZyAmJiAhcm90YXRlKSByZXR1cm4geyB1cmw6IGAke3NpdGVVcmwoKX0vYXBpL2NhbGVuZGFyL2ZlZWQvJHtleGlzdGluZy50b2tlbn0uaWNzYCB9O1xuICAgIGNvbnN0IHRva2VuID0gcmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdiYXNlNjR1cmwnKTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBleGlzdGluZ1xuICAgICAgPyBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9mZWVkX3Rva2VucycpLnVwZGF0ZSh7IHRva2VuLCBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksIGxhc3RfdXNlZF9hdDogbnVsbCB9KS5lcSgnaWQnLCBleGlzdGluZy5pZClcbiAgICAgIDogYXdhaXQgZGIuZnJvbSgnY2FsZW5kYXJfZmVlZF90b2tlbnMnKS5pbnNlcnQoeyB1c2VyX2lkOiBwcm9maWxlLmlkLCBjb250cmFjdG9yX2lkOiBwcm9maWxlLmNvbnRyYWN0b3JfaWQsIHRva2VuIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6ICdDb3VsZCBub3QgY3JlYXRlIHRoZSBsaW5rJyB9O1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2F2YWlsYWJpbGl0eScpO1xuICAgIHJldHVybiB7IHVybDogYCR7c2l0ZVVybCgpfS9hcGkvY2FsZW5kYXIvZmVlZC8ke3Rva2VufS5pY3NgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV2b2tlRmVlZFVybCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9maWxlID0gYXdhaXQgcmVxdWlyZVByb2ZpbGUoKTtcbiAgICBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ2NhbGVuZGFyX2ZlZWRfdG9rZW5zJykuZGVsZXRlKCkuZXEoJ3VzZXJfaWQnLCBwcm9maWxlLmlkKTtcbiAgICByZXZhbGlkYXRlUGF0aCgnL2FwcC9hdmFpbGFiaWxpdHknKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiNlNBb0RzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/availability/settings-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Feedback",
    ()=>Feedback,
    "SettingsForm",
    ()=>SettingsForm,
    "TIME_ZONES",
    ()=>TIME_ZONES
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/select.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$45455b__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:45455b [app-client] (ecmascript) <text/javascript>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
const TIME_ZONES = [
    [
        'America/Los_Angeles',
        'Pacific'
    ],
    [
        'America/Denver',
        'Mountain'
    ],
    [
        'America/Phoenix',
        'Arizona (no DST)'
    ],
    [
        'America/Chicago',
        'Central'
    ],
    [
        'America/New_York',
        'Eastern'
    ],
    [
        'America/Anchorage',
        'Alaska'
    ],
    [
        'Pacific/Honolulu',
        'Hawaii'
    ]
];
function Feedback({ state }) {
    if (state?.error) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-destructive",
        role: "alert",
        children: state.error
    }, void 0, false, {
        fileName: "[project]/components/availability/settings-form.tsx",
        lineNumber: 21,
        columnNumber: 28
    }, this);
    if (state?.success) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-emerald-700",
        role: "status",
        children: state.success
    }, void 0, false, {
        fileName: "[project]/components/availability/settings-form.tsx",
        lineNumber: 22,
        columnNumber: 30
    }, this);
    return null;
}
_c = Feedback;
function SettingsForm({ contractorId, settings, readOnly }) {
    _s();
    const [state, action, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$45455b__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["saveAvailabilitySettings"], undefined);
    const zones = TIME_ZONES.some(([z])=>z === settings.timezone) ? TIME_ZONES : [
        ...TIME_ZONES,
        [
            settings.timezone,
            settings.timezone
        ]
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: action,
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "contractor_id",
                value: contractorId
            }, void 0, false, {
                fileName: "[project]/components/availability/settings-form.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex items-start gap-3 rounded-lg border p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        name: "weekly_schedule_enabled",
                        defaultChecked: settings.weeklyScheduleEnabled,
                        disabled: readOnly,
                        className: "mt-1 size-4"
                    }, void 0, false, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Only take appointments during my weekly hours"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-muted-foreground",
                                children: "Turn this on after setting your weekly hours below. Off means any time not blocked is open."
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 46,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/availability/settings-form.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Time zone"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                name: "timezone",
                                defaultValue: settings.timezone,
                                disabled: readOnly,
                                children: zones.map(([value, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: value,
                                        children: label
                                    }, value, false, {
                                        fileName: "[project]/components/availability/settings-form.tsx",
                                        lineNumber: 56,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Default appointment length (min)"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "default_duration_minutes",
                                type: "number",
                                min: 15,
                                max: 480,
                                step: 15,
                                defaultValue: settings.defaultDurationMinutes,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Buffer between appointments (min)"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "buffer_minutes",
                                type: "number",
                                min: 0,
                                max: 480,
                                step: 5,
                                defaultValue: settings.bufferMinutes,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Minimum notice (hours)"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 69,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "min_notice_hours",
                                type: "number",
                                min: 0,
                                max: 720,
                                defaultValue: settings.minNoticeHours,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Max appointments per day"
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "max_appointments_per_day",
                                type: "number",
                                min: 1,
                                max: 50,
                                placeholder: "No limit",
                                defaultValue: settings.maxAppointmentsPerDay ?? '',
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/availability/settings-form.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/availability/settings-form.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        type: "submit",
                        disabled: pending,
                        children: pending ? 'Saving…' : 'Save settings'
                    }, void 0, false, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 79,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Feedback, {
                        state: state
                    }, void 0, false, {
                        fileName: "[project]/components/availability/settings-form.tsx",
                        lineNumber: 80,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/availability/settings-form.tsx",
                lineNumber: 78,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/availability/settings-form.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_s(SettingsForm, "O/pOYHN0P00Z1LAvfkkxrc/Vw1Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c1 = SettingsForm;
var _c, _c1;
__turbopack_context__.k.register(_c, "Feedback");
__turbopack_context__.k.register(_c1, "SettingsForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:19043a [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"400be84e055655e6dcb6837fece8840f1b8bbb99b2":"updateBookingCalendarMember"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "updateBookingCalendarMember",
    ()=>updateBookingCalendarMember
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var updateBookingCalendarMember = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("400be84e055655e6dcb6837fece8840f1b8bbb99b2", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "updateBookingCalendarMember"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiMlNBeWdCc0IifQ==
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/calendar-members.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarMembers",
    ()=>CalendarMembers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell-off.js [app-client] (ecmascript) <export default as BellOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/select.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/availability/settings-form.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$19043a__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:19043a [app-client] (ecmascript) <text/javascript>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function CalendarMembers({ calendarId, members, candidates, readOnly, addAction }) {
    _s();
    const [state, add, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(addAction, undefined);
    const taken = new Set(members.map((m)=>m.userId));
    const open = candidates.filter((c)=>!taken.has(c.id));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3",
        children: [
            members.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
                role: "alert",
                children: "No hosts yet: nobody is notified when a call is booked here."
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-members.tsx",
                lineNumber: 41,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "divide-y rounded-lg border",
                children: members.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex flex-wrap items-center gap-3 px-3 py-2.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0 flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-sm font-medium",
                                        children: m.name
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 49,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-xs text-muted-foreground",
                                        children: [
                                            m.email ?? '',
                                            m.email ? ' · ' : '',
                                            m.notify ? 'Notified of bookings' : 'Not notified'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 50,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/calendar-members.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this),
                            !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                action: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$19043a__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["updateBookingCalendarMember"],
                                className: "flex items-center gap-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "hidden",
                                        name: "calendar_id",
                                        value: calendarId
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 56,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "hidden",
                                        name: "user_id",
                                        value: m.userId
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 57,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "submit",
                                        name: "op",
                                        value: m.notify ? 'notify_off' : 'notify_on',
                                        variant: "ghost",
                                        size: "icon",
                                        "aria-label": m.notify ? `Stop notifying ${m.name}` : `Notify ${m.name}`,
                                        children: m.notify ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/calendar-members.tsx",
                                            lineNumber: 59,
                                            columnNumber: 33
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BellOff$3e$__["BellOff"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/calendar-members.tsx",
                                            lineNumber: 59,
                                            columnNumber: 63
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 58,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "submit",
                                        name: "op",
                                        value: "remove",
                                        variant: "ghost",
                                        size: "icon",
                                        "aria-label": `Remove ${m.name}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/calendar-members.tsx",
                                            lineNumber: 62,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-members.tsx",
                                        lineNumber: 61,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/calendar-members.tsx",
                                lineNumber: 55,
                                columnNumber: 17
                            }, this)
                        ]
                    }, m.userId, true, {
                        fileName: "[project]/components/calendar/calendar-members.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-members.tsx",
                lineNumber: 45,
                columnNumber: 9
            }, this),
            !readOnly && open.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                action: add,
                className: "flex flex-col gap-2 sm:flex-row sm:items-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                        name: "user_id",
                        "aria-label": "Add a host",
                        defaultValue: "",
                        className: "sm:w-72",
                        required: true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                disabled: true,
                                children: "Add a host…"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-members.tsx",
                                lineNumber: 73,
                                columnNumber: 13
                            }, this),
                            open.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: c.id,
                                    children: c.name
                                }, c.id, false, {
                                    fileName: "[project]/components/calendar/calendar-members.tsx",
                                    lineNumber: 74,
                                    columnNumber: 30
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-members.tsx",
                        lineNumber: 72,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        type: "submit",
                        variant: "outline",
                        disabled: pending,
                        children: pending ? 'Adding…' : 'Add host'
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-members.tsx",
                        lineNumber: 76,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Feedback"], {
                        state: state
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-members.tsx",
                        lineNumber: 77,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-members.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/calendar-members.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_s(CalendarMembers, "8jUC09pr8LfzXNk9E8Bziyv8f7g=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c = CalendarMembers;
var _c;
__turbopack_context__.k.register(_c, "CalendarMembers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/calendar-settings-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarSettingsForm",
    ()=>CalendarSettingsForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/select.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/availability/settings-form.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function CalendarSettingsForm({ calendar, readOnly, saveAction }) {
    _s();
    const [state, action, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(saveAction, undefined);
    const [meeting, setMeeting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(calendar.meetingType);
    const zones = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIME_ZONES"].some(([z])=>z === calendar.timezone) ? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIME_ZONES"] : [
        ...__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIME_ZONES"],
        [
            calendar.timezone,
            calendar.timezone
        ]
    ];
    const notice = calendar.minNoticeMinutes / 60;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: action,
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex items-start gap-3 rounded-lg border p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        name: "active",
                        defaultChecked: calendar.active,
                        disabled: readOnly,
                        className: "mt-1 size-4"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Taking bookings"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 37,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-muted-foreground",
                                children: "Off: funnels pointing here show their fallback instead of the time picker."
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 38,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm sm:col-span-2 lg:col-span-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Name"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "name",
                                defaultValue: calendar.name,
                                maxLength: 120,
                                required: true,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 44,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Time zone"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 47,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                name: "timezone",
                                defaultValue: calendar.timezone,
                                disabled: readOnly,
                                children: zones.map(([value, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: value,
                                        children: label
                                    }, value, false, {
                                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                        lineNumber: 49,
                                        columnNumber: 44
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 48,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Call length (min)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "duration_minutes",
                                type: "number",
                                min: 10,
                                max: 240,
                                step: 5,
                                defaultValue: calendar.durationMinutes,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Start times every (min)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 57,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "slot_step_minutes",
                                type: "number",
                                min: 5,
                                max: 240,
                                step: 5,
                                defaultValue: calendar.slotStepMinutes,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 56,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Buffer between calls (min)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "buffer_minutes",
                                type: "number",
                                min: 0,
                                max: 240,
                                step: 5,
                                defaultValue: calendar.bufferMinutes,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Minimum notice (hours)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "min_notice_hours",
                                type: "number",
                                min: 0,
                                max: 720,
                                step: 0.5,
                                defaultValue: notice,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Book up to (days ahead)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 69,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "horizon_days",
                                type: "number",
                                min: 1,
                                max: 120,
                                defaultValue: calendar.horizonDays,
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Max calls per day"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "max_per_day",
                                type: "number",
                                min: 1,
                                max: 100,
                                placeholder: "No limit",
                                defaultValue: calendar.maxPerDay ?? '',
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Meeting type"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 77,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                name: "meeting_type",
                                value: meeting,
                                onChange: (e)=>setMeeting(e.target.value === 'video' ? 'video' : 'phone'),
                                disabled: readOnly,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "phone",
                                        children: "Phone call (we call them)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                        lineNumber: 79,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "video",
                                        children: "Video call"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                        lineNumber: 80,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 76,
                        columnNumber: 9
                    }, this),
                    meeting === 'video' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1 text-sm sm:col-span-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "Video link"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 85,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "video_link",
                                type: "url",
                                inputMode: "url",
                                placeholder: "https://meet.google.com/…",
                                defaultValue: calendar.videoLink ?? '',
                                disabled: readOnly
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                                lineNumber: 86,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 84,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "hidden",
                        name: "video_link",
                        value: calendar.videoLink ?? ''
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 89,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        type: "submit",
                        disabled: pending,
                        children: pending ? 'Saving…' : 'Save settings'
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 94,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Feedback"], {
                        state: state
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                        lineNumber: 95,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-settings-form.tsx",
                lineNumber: 93,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/calendar-settings-form.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_s(CalendarSettingsForm, "+u1oN8GQei/biXU/Dd5Gd0upWe0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c = CalendarSettingsForm;
var _c;
__turbopack_context__.k.register(_c, "CalendarSettingsForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:539b4f [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"60328d80a380e75b007e2e031e14fefb80d25c0ff5":"saveWeeklySchedule"},"lib/actions/availability.ts",""] */ __turbopack_context__.s([
    "saveWeeklySchedule",
    ()=>saveWeeklySchedule
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var saveWeeklySchedule = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("60328d80a380e75b007e2e031e14fefb80d25c0ff5", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "saveWeeklySchedule"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXZhaWxhYmlsaXR5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyByZXZhbGlkYXRlUGF0aCB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyByZXF1aXJlUHJvZmlsZSB9IGZyb20gJ0AvbGliL2F1dGgnO1xuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC9saWIvc3VwYWJhc2Uvc2VydmVyJztcbmltcG9ydCB7IGNyZWF0ZUFkbWluQ2xpZW50IH0gZnJvbSAnQC9saWIvc3VwYWJhc2UvYWRtaW4nO1xuaW1wb3J0IHsgY2hlY2tDb250cmFjdG9yU2xvdCB9IGZyb20gJ0AvbGliL2F2YWlsYWJpbGl0eS9lbmZvcmNlLnNlcnZlcic7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBkZWNyeXB0Q2FsZW5kYXJTZWNyZXQsIHNpdGVVcmwgfSBmcm9tICdAL2xpYi9jYWxlbmRhci9jb25maWcnO1xuaW1wb3J0IHsgcmV2b2tlVG9rZW4gfSBmcm9tICdAL2xpYi9jYWxlbmRhci9nb29nbGUnO1xuaW1wb3J0IHR5cGUgeyBQcm9maWxlIH0gZnJvbSAnQC9saWIvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBBdmFpbGFiaWxpdHlTdGF0ZSA9IHsgZXJyb3I/OiBzdHJpbmc7IHN1Y2Nlc3M/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcblxuLyoqIFdoaWNoIGNvbXBhbnkncyBhdmFpbGFiaWxpdHkgdGhpcyB1c2VyIG1heSBlZGl0OiBvd25lcnMgdGhlaXIgb3duLCBhZG1pbnMgYW55IChwYXNzZWQgZXhwbGljaXRseSkuICovXG5hc3luYyBmdW5jdGlvbiBlZGl0YWJsZUNvbnRyYWN0b3IocmVxdWVzdGVkOiBzdHJpbmcgfCBudWxsKTogUHJvbWlzZTx7IHByb2ZpbGU6IFByb2ZpbGU7IGNvbnRyYWN0b3JJZDogc3RyaW5nIH0+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGlmIChwcm9maWxlLnJvbGUgPT09ICdhZG1pbicpIHtcbiAgICBpZiAoIXJlcXVlc3RlZCkgdGhyb3cgbmV3IEVycm9yKCdQaWNrIGEgY29udHJhY3RvcicpO1xuICAgIHJldHVybiB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZDogcmVxdWVzdGVkIH07XG4gIH1cbiAgaWYgKHByb2ZpbGUucm9sZSA9PT0gJ2NvbnRyYWN0b3InICYmIHByb2ZpbGUuY29udHJhY3Rvcl9yb2xlID09PSAnb3duZXInICYmIHByb2ZpbGUuY29udHJhY3Rvcl9pZCkge1xuICAgIHJldHVybiB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZDogcHJvZmlsZS5jb250cmFjdG9yX2lkIH07XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IHRoZSBjb250cmFjdG9yIG93bmVyIG9yIGEgSG9tZVF1b3RlIGFkbWluIGNhbiBjaGFuZ2UgYXZhaWxhYmlsaXR5Jyk7XG59XG5cbmZ1bmN0aW9uIGZhaWwoZTogdW5rbm93bik6IHsgZXJyb3I6IHN0cmluZyB9IHtcbiAgcmV0dXJuIHsgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6ICdTb21ldGhpbmcgd2VudCB3cm9uZycgfTtcbn1cblxuZnVuY3Rpb24gcmVmcmVzaCgpIHtcbiAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvYXZhaWxhYmlsaXR5Jyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NvbnRyYWN0b3JzL1tpZF0nLCAncGFnZScpO1xufVxuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgdGltZXpvbmU6IHouc3RyaW5nKCkucmVmaW5lKGlzVmFsaWRUaW1lWm9uZSwgJ1BpY2sgYSB2YWxpZCB0aW1lIHpvbmUnKSxcbiAgd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQ6IHouYm9vbGVhbigpLFxuICBtaW5fbm90aWNlX2hvdXJzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDcyMCksXG4gIGJ1ZmZlcl9taW51dGVzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDQ4MCksXG4gIG1heF9hcHBvaW50bWVudHNfcGVyX2RheTogei5jb2VyY2UubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCg1MCkubnVsbGFibGUoKSxcbiAgZGVmYXVsdF9kdXJhdGlvbl9taW51dGVzOiB6LmNvZXJjZS5udW1iZXIoKS5pbnQoKS5taW4oMTUpLm1heCg0ODApLFxufSk7XG5cbmNvbnN0IGZpZWxkID0gKGY6IEZvcm1EYXRhLCBrOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgdiA9IGYuZ2V0KGspO1xuICByZXR1cm4gdiA9PT0gbnVsbCA/IG51bGwgOiBTdHJpbmcodikudHJpbSgpO1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVBdmFpbGFiaWxpdHlTZXR0aW5ncyhfcHJldjogQXZhaWxhYmlsaXR5U3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8QXZhaWxhYmlsaXR5U3RhdGU+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHByb2ZpbGUsIGNvbnRyYWN0b3JJZCB9ID0gYXdhaXQgZWRpdGFibGVDb250cmFjdG9yKGZpZWxkKGZvcm1EYXRhLCAnY29udHJhY3Rvcl9pZCcpIHx8IG51bGwpO1xuICAgIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgICB0aW1lem9uZTogZmllbGQoZm9ybURhdGEsICd0aW1lem9uZScpLFxuICAgICAgd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQ6IGZvcm1EYXRhLmdldCgnd2Vla2x5X3NjaGVkdWxlX2VuYWJsZWQnKSA9PT0gJ29uJyxcbiAgICAgIG1pbl9ub3RpY2VfaG91cnM6IGZpZWxkKGZvcm1EYXRhLCAnbWluX25vdGljZV9ob3VycycpIHx8IDAsXG4gICAgICBidWZmZXJfbWludXRlczogZmllbGQoZm9ybURhdGEsICdidWZmZXJfbWludXRlcycpIHx8IDAsXG4gICAgICBtYXhfYXBwb2ludG1lbnRzX3Blcl9kYXk6IGZpZWxkKGZvcm1EYXRhLCAnbWF4X2FwcG9pbnRtZW50c19wZXJfZGF5JykgPyBmaWVsZChmb3JtRGF0YSwgJ21heF9hcHBvaW50bWVudHNfcGVyX2RheScpIDogbnVsbCxcbiAgICAgIGRlZmF1bHRfZHVyYXRpb25fbWludXRlczogZmllbGQoZm9ybURhdGEsICdkZWZhdWx0X2R1cmF0aW9uX21pbnV0ZXMnKSB8fCA2MCxcbiAgICB9KTtcbiAgICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBlcnJvcjogcGFyc2VkLmVycm9yLmlzc3Vlc1swXT8ubWVzc2FnZSA/PyAnQ2hlY2sgdGhlIHNldHRpbmdzJyB9O1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdjb250cmFjdG9yX2F2YWlsYWJpbGl0eV9zZXR0aW5ncycpXG4gICAgICAudXBzZXJ0KHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkLCAuLi5wYXJzZWQuZGF0YSwgdXBkYXRlZF9ieTogcHJvZmlsZS5pZCB9LCB7IG9uQ29uZmxpY3Q6ICdjb250cmFjdG9yX2lkJyB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgcmVmcmVzaCgpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6ICdTZXR0aW5ncyBzYXZlZCcgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWlsKGUpO1xuICB9XG59XG5cbmNvbnN0IHJ1bGVTY2hlbWEgPSB6XG4gIC5vYmplY3QoeyB3ZWVrZGF5OiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoNiksIHN0YXJ0TWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoMTQzOSksIGVuZE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMSkubWF4KDE0NDApIH0pXG4gIC5yZWZpbmUoKHIpID0+IHIuZW5kTWludXRlID4gci5zdGFydE1pbnV0ZSwgJ0VuZCB0aW1lIG11c3QgYmUgYWZ0ZXIgc3RhcnQgdGltZScpO1xuXG4vKiogUmVwbGFjZSB0aGUgd2hvbGUgd2Vla2x5IHNjaGVkdWxlLiBJbnNlcnRzIGZpcnN0LCB0aGVuIHJlbW92ZXMgdGhlIG9sZCByb3dzLCBzbyBhIGZhaWx1cmUgbmV2ZXIgbGVhdmVzIGFuIGVtcHR5IHNjaGVkdWxlLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVXZWVrbHlTY2hlZHVsZShfcHJldjogQXZhaWxhYmlsaXR5U3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8QXZhaWxhYmlsaXR5U3RhdGU+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGNvbnRyYWN0b3JJZCB9ID0gYXdhaXQgZWRpdGFibGVDb250cmFjdG9yKGZpZWxkKGZvcm1EYXRhLCAnY29udHJhY3Rvcl9pZCcpIHx8IG51bGwpO1xuICAgIGxldCByYXc6IHVua25vd247XG4gICAgdHJ5IHtcbiAgICAgIHJhdyA9IEpTT04ucGFyc2UoZmllbGQoZm9ybURhdGEsICdydWxlcycpIHx8ICdbXScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHsgZXJyb3I6ICdDb3VsZCBub3QgcmVhZCB0aGUgc2NoZWR1bGUnIH07XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZCA9IHouYXJyYXkocnVsZVNjaGVtYSkubWF4KDcwKS5zYWZlUGFyc2UocmF3KTtcbiAgICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBlcnJvcjogcGFyc2VkLmVycm9yLmlzc3Vlc1swXT8ubWVzc2FnZSA/PyAnQ2hlY2sgdGhlIHNjaGVkdWxlJyB9O1xuICAgIC8vIFJlamVjdCBvdmVybGFwcGluZyB3aW5kb3dzIG9uIHRoZSBzYW1lIGRheS5cbiAgICBjb25zdCBieURheSA9IG5ldyBNYXA8bnVtYmVyLCB7IHN0YXJ0TWludXRlOiBudW1iZXI7IGVuZE1pbnV0ZTogbnVtYmVyIH1bXT4oKTtcbiAgICBmb3IgKGNvbnN0IHIgb2YgcGFyc2VkLmRhdGEpIGJ5RGF5LnNldChyLndlZWtkYXksIFsuLi4oYnlEYXkuZ2V0KHIud2Vla2RheSkgPz8gW10pLCByXSk7XG4gICAgZm9yIChjb25zdCBsaXN0IG9mIGJ5RGF5LnZhbHVlcygpKSB7XG4gICAgICBsaXN0LnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykgaWYgKGxpc3RbaV0uc3RhcnRNaW51dGUgPCBsaXN0W2kgLSAxXS5lbmRNaW51dGUpIHJldHVybiB7IGVycm9yOiAnVGltZSB3aW5kb3dzIG9uIHRoZSBzYW1lIGRheSBjYW5ub3Qgb3ZlcmxhcCcgfTtcbiAgICB9XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCB7IGRhdGE6IG9sZCB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnY29udHJhY3Rvcl9hdmFpbGFiaWxpdHlfcnVsZXMnKS5zZWxlY3QoJ2lkJykuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjb250cmFjdG9ySWQpO1xuICAgIGlmIChwYXJzZWQuZGF0YS5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X3J1bGVzJykuaW5zZXJ0KFxuICAgICAgICBwYXJzZWQuZGF0YS5tYXAoKHIpID0+ICh7IGNvbnRyYWN0b3JfaWQ6IGNvbnRyYWN0b3JJZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICAgKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICB9XG4gICAgY29uc3Qgb2xkSWRzID0gKG9sZCA/PyBbXSkubWFwKChyOiB7IGlkOiBzdHJpbmcgfSkgPT4gci5pZCk7XG4gICAgaWYgKG9sZElkcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X3J1bGVzJykuZGVsZXRlKCkuaW4oJ2lkJywgb2xkSWRzKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICB9XG4gICAgcmVmcmVzaCgpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6ICdXZWVrbHkgc2NoZWR1bGUgc2F2ZWQnIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG4vKiogQWRtaW46IHRoZSBob3VycyBnaXZlbiB0byBhbnkgY29udHJhY3RvciB3aG8gaGFzIG5vdCBzZXQgdGhlaXIgb3duLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVEZWZhdWx0SG91cnMoX3ByZXY6IEF2YWlsYWJpbGl0eVN0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPEF2YWlsYWJpbGl0eVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gICAgaWYgKHByb2ZpbGUucm9sZSAhPT0gJ2FkbWluJykgcmV0dXJuIHsgZXJyb3I6ICdPbmx5IGEgSG9tZVF1b3RlIGFkbWluIGNhbiBjaGFuZ2UgdGhlIGRlZmF1bHQgaG91cnMnIH07XG4gICAgbGV0IHJhdzogdW5rbm93bjtcbiAgICB0cnkge1xuICAgICAgcmF3ID0gSlNPTi5wYXJzZShmaWVsZChmb3JtRGF0YSwgJ3J1bGVzJykgfHwgJ1tdJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBzY2hlZHVsZScgfTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VkID0gei5hcnJheShydWxlU2NoZW1hKS5tYXgoNzApLnNhZmVQYXJzZShyYXcpO1xuICAgIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgc2NoZWR1bGUnIH07XG4gICAgY29uc3QgYnlEYXkgPSBuZXcgTWFwPG51bWJlciwgeyBzdGFydE1pbnV0ZTogbnVtYmVyOyBlbmRNaW51dGU6IG51bWJlciB9W10+KCk7XG4gICAgZm9yIChjb25zdCByIG9mIHBhcnNlZC5kYXRhKSBieURheS5zZXQoci53ZWVrZGF5LCBbLi4uKGJ5RGF5LmdldChyLndlZWtkYXkpID8/IFtdKSwgcl0pO1xuICAgIGZvciAoY29uc3QgbGlzdCBvZiBieURheS52YWx1ZXMoKSkge1xuICAgICAgbGlzdC5zb3J0KChhLCBiKSA9PiBhLnN0YXJ0TWludXRlIC0gYi5zdGFydE1pbnV0ZSk7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIGlmIChsaXN0W2ldLnN0YXJ0TWludXRlIDwgbGlzdFtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ1RpbWUgd2luZG93cyBvbiB0aGUgc2FtZSBkYXkgY2Fubm90IG92ZXJsYXAnIH07XG4gICAgfVxuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGNyZWF0ZUFkbWluQ2xpZW50KClcbiAgICAgIC5mcm9tKCdhdmFpbGFiaWxpdHlfZGVmYXVsdHMnKVxuICAgICAgLnVwc2VydCh7IGlkOiB0cnVlLCBydWxlczogcGFyc2VkLmRhdGEsIHVwZGF0ZWRfYnk6IHByb2ZpbGUuaWQsIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9LCB7IG9uQ29uZmxpY3Q6ICdpZCcgfSk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCBzYXZlLiBIYXMgdGhlIGxhdGVzdCBkYXRhYmFzZSB1cGRhdGUgYmVlbiBhcHBsaWVkPycgfTtcbiAgICByZWZyZXNoKCk7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogJ0RlZmF1bHQgaG91cnMgc2F2ZWQnIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG5jb25zdCBkYXRlUmUgPSAvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC87XG5jb25zdCBleGNlcHRpb25TY2hlbWEgPSB6XG4gIC5vYmplY3Qoe1xuICAgIGtpbmQ6IHouZW51bShbJ2Jsb2NrZWQnLCAnYXZhaWxhYmxlJ10pLFxuICAgIGRhdGVfc3RhcnQ6IHouc3RyaW5nKCkucmVnZXgoZGF0ZVJlLCAnUGljayBhIHN0YXJ0IGRhdGUnKSxcbiAgICBkYXRlX2VuZDogei5zdHJpbmcoKS5yZWdleChkYXRlUmUsICdQaWNrIGFuIGVuZCBkYXRlJyksXG4gICAgc3RhcnRfbWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigwKS5tYXgoMTQzOSkubnVsbGFibGUoKSxcbiAgICBlbmRfbWludXRlOiB6Lm51bWJlcigpLmludCgpLm1pbigxKS5tYXgoMTQ0MCkubnVsbGFibGUoKSxcbiAgICBub3RlOiB6LnN0cmluZygpLm1heCgzMDApLm51bGxhYmxlKCksXG4gICAgcmVwZWF0X3dlZWtseTogei5ib29sZWFuKCksXG4gICAgcmVwZWF0X3VudGlsOiB6LnN0cmluZygpLnJlZ2V4KGRhdGVSZSkubnVsbGFibGUoKSxcbiAgfSlcbiAgLnN1cGVyUmVmaW5lKCh2LCBjdHgpID0+IHtcbiAgICBpZiAodi5kYXRlX2VuZCA8IHYuZGF0ZV9zdGFydCkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdFbmQgZGF0ZSBpcyBiZWZvcmUgdGhlIHN0YXJ0IGRhdGUnIH0pO1xuICAgIGlmICgodi5zdGFydF9taW51dGUgPT09IG51bGwpICE9PSAodi5lbmRfbWludXRlID09PSBudWxsKSkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdTZXQgYm90aCBhIHN0YXJ0IGFuZCBlbmQgdGltZSwgb3IgbmVpdGhlciBmb3IgdGhlIHdob2xlIGRheScgfSk7XG4gICAgaWYgKHYuc3RhcnRfbWludXRlICE9PSBudWxsICYmIHYuZW5kX21pbnV0ZSAhPT0gbnVsbCAmJiB2LmVuZF9taW51dGUgPD0gdi5zdGFydF9taW51dGUpIGN0eC5hZGRJc3N1ZSh7IGNvZGU6ICdjdXN0b20nLCBtZXNzYWdlOiAnRW5kIHRpbWUgbXVzdCBiZSBhZnRlciBzdGFydCB0aW1lJyB9KTtcbiAgICBpZiAodi5yZXBlYXRfd2Vla2x5ICYmIHYuZGF0ZV9lbmQgIT09IHYuZGF0ZV9zdGFydCkgY3R4LmFkZElzc3VlKHsgY29kZTogJ2N1c3RvbScsIG1lc3NhZ2U6ICdXZWVrbHkgcmVwZWF0cyBhcHBseSB0byBhIHNpbmdsZSBzdGFydGluZyBkYXknIH0pO1xuICAgIGlmICh2LnJlcGVhdF91bnRpbCAmJiAoIXYucmVwZWF0X3dlZWtseSB8fCB2LnJlcGVhdF91bnRpbCA8IHYuZGF0ZV9zdGFydCkpIGN0eC5hZGRJc3N1ZSh7IGNvZGU6ICdjdXN0b20nLCBtZXNzYWdlOiAnUmVwZWF0LXVudGlsIG11c3QgYmUgYWZ0ZXIgdGhlIHN0YXJ0IGRhdGUnIH0pO1xuICB9KTtcblxuZnVuY3Rpb24gbWludXRlRnJvbSh0aW1lOiBzdHJpbmcgfCBudWxsKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICghdGltZSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IG0gPSAvXihcXGR7Mn0pOihcXGR7Mn0pJC8uZXhlYyh0aW1lKTtcbiAgcmV0dXJuIG0gPyBOdW1iZXIobVsxXSkgKiA2MCArIE51bWJlcihtWzJdKSA6IG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRBdmFpbGFiaWxpdHlFeGNlcHRpb24oX3ByZXY6IEF2YWlsYWJpbGl0eVN0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPEF2YWlsYWJpbGl0eVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBwcm9maWxlLCBjb250cmFjdG9ySWQgfSA9IGF3YWl0IGVkaXRhYmxlQ29udHJhY3RvcihmaWVsZChmb3JtRGF0YSwgJ2NvbnRyYWN0b3JfaWQnKSB8fCBudWxsKTtcbiAgICBjb25zdCBhbGxEYXkgPSBmb3JtRGF0YS5nZXQoJ2FsbF9kYXknKSA9PT0gJ29uJztcbiAgICBjb25zdCBzdGFydCA9IGFsbERheSA/IG51bGwgOiBtaW51dGVGcm9tKGZpZWxkKGZvcm1EYXRhLCAnc3RhcnRfdGltZScpKTtcbiAgICAvLyBcIjI0OjAwXCIgaXMgbm90IGEgdmFsaWQgPGlucHV0IHR5cGU9dGltZT4gdmFsdWU7IGFuIGVuZCBvZiAwMDowMCBtZWFucyBtaWRuaWdodC5cbiAgICBsZXQgZW5kID0gYWxsRGF5ID8gbnVsbCA6IG1pbnV0ZUZyb20oZmllbGQoZm9ybURhdGEsICdlbmRfdGltZScpKTtcbiAgICBpZiAoIWFsbERheSAmJiBlbmQgPT09IDApIGVuZCA9IDE0NDA7XG4gICAgY29uc3QgZGF0ZVN0YXJ0ID0gZmllbGQoZm9ybURhdGEsICdkYXRlX3N0YXJ0JykgPz8gJyc7XG4gICAgY29uc3QgcmVwZWF0ID0gZm9ybURhdGEuZ2V0KCdyZXBlYXRfd2Vla2x5JykgPT09ICdvbic7XG4gICAgY29uc3QgcGFyc2VkID0gZXhjZXB0aW9uU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgICBraW5kOiBmaWVsZChmb3JtRGF0YSwgJ2tpbmQnKSA9PT0gJ2F2YWlsYWJsZScgPyAnYXZhaWxhYmxlJyA6ICdibG9ja2VkJyxcbiAgICAgIGRhdGVfc3RhcnQ6IGRhdGVTdGFydCxcbiAgICAgIGRhdGVfZW5kOiByZXBlYXQgPyBkYXRlU3RhcnQgOiBmaWVsZChmb3JtRGF0YSwgJ2RhdGVfZW5kJykgfHwgZGF0ZVN0YXJ0LFxuICAgICAgc3RhcnRfbWludXRlOiBzdGFydCxcbiAgICAgIGVuZF9taW51dGU6IGVuZCxcbiAgICAgIG5vdGU6IGZpZWxkKGZvcm1EYXRhLCAnbm90ZScpIHx8IG51bGwsXG4gICAgICByZXBlYXRfd2Vla2x5OiByZXBlYXQsXG4gICAgICByZXBlYXRfdW50aWw6IHJlcGVhdCA/IGZpZWxkKGZvcm1EYXRhLCAncmVwZWF0X3VudGlsJykgfHwgbnVsbCA6IG51bGwsXG4gICAgfSk7XG4gICAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBkYXRlcycgfTtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2NvbnRyYWN0b3JfYXZhaWxhYmlsaXR5X2V4Y2VwdGlvbnMnKS5pbnNlcnQoeyBjb250cmFjdG9yX2lkOiBjb250cmFjdG9ySWQsIGNyZWF0ZWRfYnk6IHByb2ZpbGUuaWQsIC4uLnBhcnNlZC5kYXRhIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICByZWZyZXNoKCk7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogcGFyc2VkLmRhdGEua2luZCA9PT0gJ2Jsb2NrZWQnID8gJ1RpbWUgYmxvY2tlZCBvZmYnIDogJ0V4dHJhIGF2YWlsYWJpbGl0eSBhZGRlZCcgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWlsKGUpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVBdmFpbGFiaWxpdHlFeGNlcHRpb24oZm9ybURhdGE6IEZvcm1EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBjb250cmFjdG9ySWQgfSA9IGF3YWl0IGVkaXRhYmxlQ29udHJhY3RvcihmaWVsZChmb3JtRGF0YSwgJ2NvbnRyYWN0b3JfaWQnKSB8fCBudWxsKTtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnaWQnKTtcbiAgICBpZiAoIWlkKSByZXR1cm47XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBhd2FpdCBzdXBhYmFzZS5mcm9tKCdjb250cmFjdG9yX2F2YWlsYWJpbGl0eV9leGNlcHRpb25zJykuZGVsZXRlKCkuZXEoJ2lkJywgaWQpLmVxKCdjb250cmFjdG9yX2lkJywgY29udHJhY3RvcklkKTtcbiAgICByZWZyZXNoKCk7XG4gIH0gY2F0Y2gge1xuICAgIC8qIG5vdCBwZXJtaXR0ZWQ6IG5vdGhpbmcgY2hhbmdlcyAqL1xuICB9XG59XG5cbi8qKiBTdGFmZiBzY2hlZHVsaW5nIFVJOiBkb2VzIHRoaXMgdGltZSB3b3JrIGZvciB0aGUgY29udHJhY3RvciBiZWhpbmQgYW4gYXNzaWdubWVudD8gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0FwcG9pbnRtZW50U2xvdChhc3NpZ25tZW50SWQ6IHN0cmluZywgZGF0ZVRpbWU6IHN0cmluZyk6IFByb21pc2U8eyBvazogYm9vbGVhbjsgbWVzc2FnZT86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgcmVxdWlyZVByb2ZpbGUoKTtcbiAgICBpZiAoIWFzc2lnbm1lbnRJZCB8fCAhZGF0ZVRpbWUpIHJldHVybiB7IG9rOiB0cnVlIH07XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICAvLyBSTFM6IHRoaXMgb25seSByZXNvbHZlcyBmb3IgYW4gYXNzaWdubWVudCB0aGUgY2FsbGVyIGNhbiBzZWUuXG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdsZWFkX2Fzc2lnbm1lbnRzJykuc2VsZWN0KCdjb250cmFjdG9yX2lkJykuZXEoJ2lkJywgYXNzaWdubWVudElkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YT8uY29udHJhY3Rvcl9pZCkgcmV0dXJuIHsgb2s6IHRydWUgfTtcbiAgICBjb25zdCBjaGVjayA9IGF3YWl0IGNoZWNrQ29udHJhY3RvclNsb3QoZGF0YS5jb250cmFjdG9yX2lkLCBkYXRlVGltZSk7XG4gICAgcmV0dXJuIHsgb2s6IGNoZWNrLm9rLCBtZXNzYWdlOiBjaGVjay5tZXNzYWdlIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7IG9rOiB0cnVlIH07XG4gIH1cbn1cblxuLy8gLS0tIGNhbGVuZGFyIGNvbm5lY3Rpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmFzeW5jIGZ1bmN0aW9uIG93bkNvbm5lY3Rpb24oY29ubmVjdGlvbklkOiBzdHJpbmcpIHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IGRiID0gY3JlYXRlQWRtaW5DbGllbnQoKTtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9jb25uZWN0aW9ucycpLnNlbGVjdCgnaWQsIHVzZXJfaWQsIGVuY3J5cHRlZF9jcmVkZW50aWFscywgcHJvdmlkZXInKS5lcSgnaWQnLCBjb25uZWN0aW9uSWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSB8fCBkYXRhLnVzZXJfaWQgIT09IHByb2ZpbGUuaWQpIHRocm93IG5ldyBFcnJvcignQ29ubmVjdGlvbiBub3QgZm91bmQnKTtcbiAgcmV0dXJuIHsgZGIsIGNvbm5lY3Rpb246IGRhdGEgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2Nvbm5lY3RDYWxlbmRhcihmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnY29ubmVjdGlvbl9pZCcpO1xuICAgIGlmICghaWQpIHJldHVybjtcbiAgICBjb25zdCB7IGRiLCBjb25uZWN0aW9uIH0gPSBhd2FpdCBvd25Db25uZWN0aW9uKGlkKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgcmV2b2tlVG9rZW4oZGVjcnlwdENhbGVuZGFyU2VjcmV0KGNvbm5lY3Rpb24uZW5jcnlwdGVkX2NyZWRlbnRpYWxzKSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBrZXkgbWlzc2luZyBvciB0b2tlbiB1bnJlYWRhYmxlOiBzdGlsbCBkZWxldGUgb3VyIGNvcHkgKi9cbiAgICB9XG4gICAgYXdhaXQgZGIuZnJvbSgnY2FsZW5kYXJfY29ubmVjdGlvbnMnKS5kZWxldGUoKS5lcSgnaWQnLCBpZCk7XG4gICAgcmVmcmVzaCgpO1xuICB9IGNhdGNoIHtcbiAgICAvKiBpZ25vcmUgKi9cbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FsZW5kYXJQcmVmZXJlbmNlcyhmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpZCA9IGZpZWxkKGZvcm1EYXRhLCAnY29ubmVjdGlvbl9pZCcpO1xuICAgIGlmICghaWQpIHJldHVybjtcbiAgICBjb25zdCB7IGRiIH0gPSBhd2FpdCBvd25Db25uZWN0aW9uKGlkKTtcbiAgICBhd2FpdCBkYlxuICAgICAgLmZyb20oJ2NhbGVuZGFyX2Nvbm5lY3Rpb25zJylcbiAgICAgIC51cGRhdGUoeyBwdXNoX2FwcG9pbnRtZW50czogZm9ybURhdGEuZ2V0KCdwdXNoX2FwcG9pbnRtZW50cycpID09PSAnb24nLCBpbXBvcnRfYnVzeTogZm9ybURhdGEuZ2V0KCdpbXBvcnRfYnVzeScpID09PSAnb24nIH0pXG4gICAgICAuZXEoJ2lkJywgaWQpO1xuICAgIHJlZnJlc2goKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cblxuLyoqIENyZWF0ZSB0aGUgdXNlcidzIHByaXZhdGUgZmVlZCBsaW5rLCBvciByZXR1cm4gdGhlIGV4aXN0aW5nIG9uZSAobmV2ZXIgc2lsZW50bHkgcm90YXRlcyBhIGxpdmUgc3Vic2NyaXB0aW9uKS4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPckNyZWF0ZUZlZWRVcmwocm90YXRlID0gZmFsc2UpOiBQcm9taXNlPHsgdXJsPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gICAgaWYgKHByb2ZpbGUucm9sZSAhPT0gJ2NvbnRyYWN0b3InIHx8ICFwcm9maWxlLmNvbnRyYWN0b3JfaWQpIHJldHVybiB7IGVycm9yOiAnT25seSBjb250cmFjdG9yIHVzZXJzIGhhdmUgYSBjYWxlbmRhciBmZWVkJyB9O1xuICAgIGNvbnN0IGRiID0gY3JlYXRlQWRtaW5DbGllbnQoKTtcbiAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nIH0gPSBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9mZWVkX3Rva2VucycpLnNlbGVjdCgnaWQsIHRva2VuJykuZXEoJ3VzZXJfaWQnLCBwcm9maWxlLmlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmIChleGlzdGluZyAmJiAhcm90YXRlKSByZXR1cm4geyB1cmw6IGAke3NpdGVVcmwoKX0vYXBpL2NhbGVuZGFyL2ZlZWQvJHtleGlzdGluZy50b2tlbn0uaWNzYCB9O1xuICAgIGNvbnN0IHRva2VuID0gcmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdiYXNlNjR1cmwnKTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBleGlzdGluZ1xuICAgICAgPyBhd2FpdCBkYi5mcm9tKCdjYWxlbmRhcl9mZWVkX3Rva2VucycpLnVwZGF0ZSh7IHRva2VuLCBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksIGxhc3RfdXNlZF9hdDogbnVsbCB9KS5lcSgnaWQnLCBleGlzdGluZy5pZClcbiAgICAgIDogYXdhaXQgZGIuZnJvbSgnY2FsZW5kYXJfZmVlZF90b2tlbnMnKS5pbnNlcnQoeyB1c2VyX2lkOiBwcm9maWxlLmlkLCBjb250cmFjdG9yX2lkOiBwcm9maWxlLmNvbnRyYWN0b3JfaWQsIHRva2VuIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6ICdDb3VsZCBub3QgY3JlYXRlIHRoZSBsaW5rJyB9O1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2F2YWlsYWJpbGl0eScpO1xuICAgIHJldHVybiB7IHVybDogYCR7c2l0ZVVybCgpfS9hcGkvY2FsZW5kYXIvZmVlZC8ke3Rva2VufS5pY3NgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFpbChlKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV2b2tlRmVlZFVybCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9maWxlID0gYXdhaXQgcmVxdWlyZVByb2ZpbGUoKTtcbiAgICBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ2NhbGVuZGFyX2ZlZWRfdG9rZW5zJykuZGVsZXRlKCkuZXEoJ3VzZXJfaWQnLCBwcm9maWxlLmlkKTtcbiAgICByZXZhbGlkYXRlUGF0aCgnL2FwcC9hdmFpbGFiaWxpdHknKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoidVNBaUZzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/availability/weekly-editor.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WeeklyEditor",
    ()=>WeeklyEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$539b4f__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:539b4f [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/availability/settings-form.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];
// Display Monday first.
const ORDER = [
    1,
    2,
    3,
    4,
    5,
    6,
    0
];
const toTime = (m)=>`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMinute = (t, isEnd)=>{
    const [h, m] = t.split(':').map(Number);
    const v = h * 60 + m;
    return isEnd && v === 0 ? 1440 : v;
};
function WeeklyEditor({ contractorId, rules, readOnly, saveAction = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$539b4f__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["saveWeeklySchedule"], submitLabel = 'Save weekly hours' }) {
    _s();
    const [state, action, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(saveAction, undefined);
    const [days, setDays] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "WeeklyEditor.useState": ()=>{
            const init = {};
            for (const d of ORDER)init[d] = [];
            for (const r of rules)init[r.weekday].push({
                start: toTime(r.startMinute),
                end: r.endMinute >= 1440 ? '00:00' : toTime(r.endMinute)
            });
            return init;
        }
    }["WeeklyEditor.useState"]);
    const setWindow = (day, index, patch)=>setDays((d)=>({
                ...d,
                [day]: d[day].map((w, i)=>i === index ? {
                        ...w,
                        ...patch
                    } : w)
            }));
    const serialized = JSON.stringify(ORDER.flatMap((weekday)=>days[weekday].filter((w)=>w.start && w.end).map((w)=>({
                weekday,
                startMinute: toMinute(w.start, false),
                endMinute: toMinute(w.end, true)
            }))));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: action,
        className: "space-y-3",
        children: [
            contractorId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "contractor_id",
                value: contractorId
            }, void 0, false, {
                fileName: "[project]/components/availability/weekly-editor.tsx",
                lineNumber: 57,
                columnNumber: 24
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "rules",
                value: serialized
            }, void 0, false, {
                fileName: "[project]/components/availability/weekly-editor.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "divide-y rounded-lg border",
                children: ORDER.map((day)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-28 shrink-0 pt-2 text-sm font-medium",
                                children: DAYS[day]
                            }, void 0, false, {
                                fileName: "[project]/components/availability/weekly-editor.tsx",
                                lineNumber: 62,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 space-y-2",
                                children: [
                                    days[day].length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "pt-2 text-sm text-muted-foreground",
                                        children: "Unavailable"
                                    }, void 0, false, {
                                        fileName: "[project]/components/availability/weekly-editor.tsx",
                                        lineNumber: 64,
                                        columnNumber: 42
                                    }, this),
                                    days[day].map((w, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    type: "time",
                                                    "aria-label": `${DAYS[day]} start`,
                                                    value: w.start,
                                                    onChange: (e)=>setWindow(day, i, {
                                                            start: e.target.value
                                                        }),
                                                    className: "w-32",
                                                    disabled: readOnly
                                                }, void 0, false, {
                                                    fileName: "[project]/components/availability/weekly-editor.tsx",
                                                    lineNumber: 67,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-sm text-muted-foreground",
                                                    children: "to"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/availability/weekly-editor.tsx",
                                                    lineNumber: 68,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    type: "time",
                                                    "aria-label": `${DAYS[day]} end`,
                                                    value: w.end,
                                                    onChange: (e)=>setWindow(day, i, {
                                                            end: e.target.value
                                                        }),
                                                    className: "w-32",
                                                    disabled: readOnly
                                                }, void 0, false, {
                                                    fileName: "[project]/components/availability/weekly-editor.tsx",
                                                    lineNumber: 69,
                                                    columnNumber: 19
                                                }, this),
                                                !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    type: "button",
                                                    variant: "ghost",
                                                    size: "icon",
                                                    "aria-label": "Remove window",
                                                    onClick: ()=>setDays((d)=>({
                                                                ...d,
                                                                [day]: d[day].filter((_, j)=>j !== i)
                                                            })),
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/availability/weekly-editor.tsx",
                                                        lineNumber: 72,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/availability/weekly-editor.tsx",
                                                    lineNumber: 71,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/components/availability/weekly-editor.tsx",
                                            lineNumber: 66,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/availability/weekly-editor.tsx",
                                lineNumber: 63,
                                columnNumber: 13
                            }, this),
                            !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                type: "button",
                                variant: "outline",
                                size: "sm",
                                onClick: ()=>setDays((d)=>({
                                            ...d,
                                            [day]: [
                                                ...d[day],
                                                d[day].length ? {
                                                    start: '13:00',
                                                    end: '17:00'
                                                } : {
                                                    start: '08:00',
                                                    end: '17:00'
                                                }
                                            ]
                                        })),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                        className: "size-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/availability/weekly-editor.tsx",
                                        lineNumber: 80,
                                        columnNumber: 17
                                    }, this),
                                    " Add hours"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/availability/weekly-editor.tsx",
                                lineNumber: 79,
                                columnNumber: 15
                            }, this)
                        ]
                    }, day, true, {
                        fileName: "[project]/components/availability/weekly-editor.tsx",
                        lineNumber: 61,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/availability/weekly-editor.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            !readOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        type: "submit",
                        disabled: pending,
                        children: pending ? 'Saving…' : submitLabel
                    }, void 0, false, {
                        fileName: "[project]/components/availability/weekly-editor.tsx",
                        lineNumber: 88,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$availability$2f$settings$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Feedback"], {
                        state: state
                    }, void 0, false, {
                        fileName: "[project]/components/availability/weekly-editor.tsx",
                        lineNumber: 89,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/availability/weekly-editor.tsx",
                lineNumber: 87,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/availability/weekly-editor.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_s(WeeklyEditor, "918N+iiLlUXKUsnZ+qHCG0sYNmo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c = WeeklyEditor;
var _c;
__turbopack_context__.k.register(_c, "WeeklyEditor");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_b44a4539._.js.map